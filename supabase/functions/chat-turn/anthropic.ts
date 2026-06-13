// ───────────────────────────────────────────────────────────────────────
// Phase 3 — Anthropic Messages API wrapper for chat-turn
//
// Single responsibility: take system blocks + conversation history,
// call the Messages API forcing a tool_use of `respond`, validate the
// model's tool input against Zod, and return the parsed input plus
// cost-relevant usage. No DB access, no persistence, no SPA-shaped
// envelopes. Index.ts (commits 6–7) wraps this with project loading,
// persistence, idempotency, and error envelope translation.
//
// Notable choices:
//
//   • Multi-block system with cache_control on the persona block only
//     (built in systemPrompt.ts). The Messages API caches everything
//     through the cache_control marker; the live-state block after it
//     stays fresh per turn. Net effect: ~70% per-turn cost reduction
//     once the cache is warm.
//
//   • tool_choice forces `respond` every turn. The SDK's automatic
//     retries are disabled (maxRetries: 0) — the SPA is the authority
//     on retry policy. We surface 429/529/5xx as typed UpstreamError
//     instances so index.ts can translate to the client error envelope.
//
//   • AbortController at 50s. Edge Function wall clock is 150s; we
//     want to fail fast under network duress and leave headroom for
//     persistence + retry on a follow-up call.
// ───────────────────────────────────────────────────────────────────────

import Anthropic from '@anthropic-ai/sdk'
import { buildSystemBlocks } from './systemPrompt.ts'
import { MODEL, respondToolDefinition, respondToolChoice } from './toolSchema.ts'
import {
  respondToolInputSchema,
  type RespondToolInput,
} from '../../../src/types/respondTool.ts'
import type { Span, Tracer } from './tracer.ts'
import { attemptAbortMs, isTruncatedStop, shouldRetryWithinBudget } from './wallBudget.ts'

// ── Configuration ──────────────────────────────────────────────────────
// Phase 3.1 #33: dropped from 2048 → 1280 based on batch-4 telemetry
// (median ~1500 output tokens, max 1715). 1280 caps the worst-case
// latency at ~43s vs 46s observed; the model truncates cleanly mid-
// thought when a real response would have run longer.
//
// MAX_TOKENS LEDGER (intentional re-baselines only):
//   2026-06-11  1280 → 2560  (fix/output-budget)
//     Cause: the post-T-05-sprint emission contract (bilingual prose +
//     typed facts + verfahren_indikation verdict + labels/deltas) is
//     STARVED at 1280 — production telemetry showed stop_reason=
//     max_tokens on 100% of successful calls across two full walks
//     (Sachsen d255b219, Thüringen b1416734). extracted_facts rides the
//     tail of the tool call, so truncation silently eats the capture
//     contract (Thüringen dense turns emitted ZERO facts while the prose
//     acknowledged them) and, when the cut lands before message_de,
//     hard-fails Zod (4 traces, user-visible retry stalls). The Phase 3.1
//     revisit threshold was 5% truncation; we are at 100%.
//     ABORT_TIMEOUT_MS raised 50s → 90s in the same change.
//   2026-06-13  2560 → 4096  (fix/synthesis-truncation)
//     Cause: the T-07 Hessen synthesis hit stop_reason=max_tokens at 2560
//     on a SIMPLE case (output_tokens=2560 exactly; trace flagged
//     truncated_max_tokens). The real post-T-05 synthesis distribution is
//     2000–2560+ (NOT the obsolete "median ~1500" 1280-era batch-4
//     figure) — 2560 had ~zero headroom, so a denser turn truncates and
//     silently drops the structured tail. 4096 clears the observed
//     distribution with headroom.
//     SAME change replaces the silent `truncated_max_tokens` WARNING with
//     a FAIL-CLOSED gate (isTruncatedStop → UpstreamError('truncated')):
//     a truncated turn can no longer persist a half-cut structured tail as
//     if whole. The standing gauge is now the 'truncated' error-rate.
//     BUDGET BOUNDS — do NOT raise ABORT_TIMEOUT_MS or the 145s wall here:
//     4096 @ ~60 tok/s ≈ 68s < 90s abort < 145s wall. ~5120 is the
//     practical ceiling before the abort would need raising too.
//     Durable third leg (SHA bundle, NOT in this change): facts-before-
//     prose emission-order, so structured data is first-emitted and can
//     never be the part a cut clips.
//
// Exported as the single source of truth for BOTH call sites (this
// json path + streaming.ts) — smoke-t05-composer F11 source-pins that
// streaming.ts imports it and never redefines a local cap.
export const MAX_TOKENS = 4096
export const ABORT_TIMEOUT_MS = 90_000

// Sonnet 4.6 pricing in USD per million tokens (March 2026 — identical
// to the prior 4.5 schedule per Anthropic's announcement). If pricing
// drifts in a future Sonnet release, update both here and the cost
// ticker breakdown in CostTicker.tsx.
const COST_INPUT_PER_MTOK = 3.0
const COST_OUTPUT_PER_MTOK = 15.0
const COST_CACHE_WRITE_PER_MTOK = 3.75
const COST_CACHE_READ_PER_MTOK = 0.3

// ── Public types ───────────────────────────────────────────────────────
export interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface CallAnthropicArgs {
  apiKey: string
  systemBlocks: ReturnType<typeof buildSystemBlocks>
  messages: ConversationMessage[]
  /** Optional caller signal — chained into the internal timeout. */
  signal?: AbortSignal
  /** Phase 9 — observability handles. When provided, each attempt
   *  emits a child span with token usage attributes. */
  tracer?: Tracer
  parentSpan?: Span
  /** Internal — set by callAnthropicWithRetry / WithSchemaReminder
   *  so the leaf span name reflects the attempt position. */
  attemptLabel?: string
  /** Meta-sweep item 4b — absolute wall deadline (requestStart +
   *  WALL_CLOCK_BUDGET_MS). Each attempt's abort timer is capped to the
   *  remaining budget and retries are only scheduled while a minimum
   *  useful attempt still fits, so the loop always fails TYPED before
   *  the ~150 s platform kill (which would erase the trace itself). */
  deadlineAtMs?: number
}

export interface AnthropicUsage {
  /** Regular (uncached) input tokens billed at input price. */
  inputTokens: number
  outputTokens: number
  /** Tokens read from the prompt cache (billed at 0.1× input). */
  cacheReadTokens: number
  /** Tokens written to the prompt cache (billed at 1.25× input for 5m TTL). */
  cacheWriteTokens: number
}

export interface CallAnthropicResult {
  toolInput: RespondToolInput
  usage: AnthropicUsage
  latencyMs: number
}

/**
 * Typed upstream errors. Index.ts maps each `code` to a client error
 * envelope (`upstream_overloaded` for rate_limit/overloaded/server,
 * `upstream_timeout` for timeout, `model_response_invalid` for
 * invalid_response). retryAfterMs is set on rate_limit / overloaded /
 * server so the SPA can surface a countdown.
 */
export class UpstreamError extends Error {
  constructor(
    public readonly code:
      | 'rate_limit'
      | 'overloaded'
      | 'invalid_response'
      | 'server'
      | 'timeout'
      // fix/synthesis-truncation — stop_reason=max_tokens cut the tool call;
      // the structured tail is unreliable. Fail closed, never persist partial.
      | 'truncated',
    public readonly retryAfterMs: number | null,
    message: string,
  ) {
    super(message)
    this.name = 'UpstreamError'
  }
}

// ── Implementation ─────────────────────────────────────────────────────

/**
 * Call Anthropic with a forced `respond` tool call. Validates the model's
 * output against the Zod schema before returning; throws UpstreamError
 * for known upstream failure modes and lets unexpected errors bubble.
 *
 * Phase 9: when `tracer` + `parentSpan` are passed, this emits an
 *   `anthropic.attempt_<label>` span with input/output/cache token
 *   attributes and the Anthropic request id. Tokens accumulate on the
 *   parent trace via tracer.setTokens.
 */
export async function callAnthropic(
  args: CallAnthropicArgs,
): Promise<CallAnthropicResult> {
  const {
    apiKey,
    systemBlocks,
    messages,
    signal: externalSignal,
    tracer,
    parentSpan,
    attemptLabel,
    deadlineAtMs,
  } = args

  // Meta-sweep item 4b — cap this attempt's abort timer to the remaining
  // wall budget; refuse to start an attempt that cannot finish before the
  // platform kill. Failing TYPED here keeps the trace + client envelope.
  const abortBudgetMs =
    deadlineAtMs != null
      ? attemptAbortMs(deadlineAtMs, Date.now(), ABORT_TIMEOUT_MS)
      : ABORT_TIMEOUT_MS
  if (abortBudgetMs == null) {
    throw new UpstreamError(
      'timeout',
      null,
      `wall budget exhausted before attempt ${attemptLabel ?? '1'} — ` +
        'failing typed instead of risking the platform kill',
    )
  }

  const span = tracer?.startSpan(
    `anthropic.attempt_${attemptLabel ?? '1'}`,
    parentSpan?.span_id ?? null,
  )
  span?.setAttributes({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    messages_count: messages.length,
    system_blocks_count: systemBlocks.length,
    tool_choice: 'respond',
    abort_budget_ms: abortBudgetMs,
  })

  const controller = new AbortController()
  const timeoutId = setTimeout(
    () => controller.abort(new Error('upstream_timeout')),
    abortBudgetMs,
  )
  if (externalSignal) {
    if (externalSignal.aborted) controller.abort(externalSignal.reason)
    else externalSignal.addEventListener(
      'abort',
      () => controller.abort(externalSignal.reason),
      { once: true },
    )
  }

  // maxRetries: 0 — the SPA owns retry policy. We do not want the SDK
  // to silently swallow a 429/529 by retrying on its own.
  const client = new Anthropic({ apiKey, maxRetries: 0 })

  const start = Date.now()
  let response
  try {
    response = await client.messages.create(
      {
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: systemBlocks,
        messages,
        tools: [respondToolDefinition],
        tool_choice: respondToolChoice,
      },
      { signal: controller.signal },
    )
  } catch (err) {
    clearTimeout(timeoutId)
    if (controller.signal.aborted) {
      span?.setError('upstream_timeout')
      span?.end('error')
      throw new UpstreamError(
        'timeout',
        null,
        'Anthropic request timed out (50s)',
      )
    }
    span?.setError(err instanceof Error ? err.message : String(err))
    span?.end('error')
    throw mapSdkError(err)
  }
  clearTimeout(timeoutId)
  const latencyMs = Date.now() - start

  // Find the tool_use block. With tool_choice forced, this MUST exist —
  // its absence is a bug (or a model regression) we want to surface.
  const toolUse = response.content.find(
    (b): b is { type: 'tool_use'; id: string; name: string; input: unknown } =>
      b.type === 'tool_use',
  )
  if (!toolUse) {
    span?.setError('no_tool_use_block')
    span?.end('error')
    throw new UpstreamError(
      'invalid_response',
      null,
      'Forced tool_choice produced no tool_use block',
    )
  }
  if (toolUse.name !== 'respond') {
    span?.setError(`unexpected_tool_name:${toolUse.name}`)
    span?.end('error')
    throw new UpstreamError(
      'invalid_response',
      null,
      `Unexpected tool name: ${toolUse.name}`,
    )
  }

  const parsed = respondToolInputSchema.safeParse(toolUse.input)
  if (!parsed.success) {
    span?.setAttributes({
      validation_result: 'zod_failure',
      validation_error: parsed.error.message,
    })
    span?.setError('zod_validation_failed')
    span?.end('error')
    // Index.ts is expected to retry once with a stricter system reminder
    // before surfacing this to the SPA — see commit 7.
    throw new UpstreamError(
      'invalid_response',
      null,
      `Tool input failed Zod validation: ${parsed.error.message}`,
    )
  }

  const usage: AnthropicUsage = {
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    cacheReadTokens:
      (response.usage as { cache_read_input_tokens?: number })
        .cache_read_input_tokens ?? 0,
    cacheWriteTokens:
      (response.usage as { cache_creation_input_tokens?: number })
        .cache_creation_input_tokens ?? 0,
  }

  // Final attributes — token counts + Anthropic request id. The
  // request id is the field to grep for when escalating to support.
  span?.setAttributes({
    anthropic_request_id: (response as { id?: string }).id ?? null,
    stop_reason: response.stop_reason,
    input_tokens: usage.inputTokens,
    output_tokens: usage.outputTokens,
    cache_read_tokens: usage.cacheReadTokens,
    cache_creation_tokens: usage.cacheWriteTokens,
    latency_ms: latencyMs,
    validation_result: 'ok',
  })
  span?.end('ok')

  // Accumulate on the trace so the trace row's totals reflect every
  // attempt (schema-reminder retry + outer backoff retry both feed in) —
  // recorded BEFORE the truncation gate so a truncated attempt's tokens
  // still show on the trace.
  tracer?.setTokens({
    input_tokens: usage.inputTokens,
    output_tokens: usage.outputTokens,
    cache_read_input_tokens: usage.cacheReadTokens,
    cache_creation_input_tokens: usage.cacheWriteTokens,
  })

  // fix/synthesis-truncation — FAIL CLOSED on a truncated structured
  // emission. stop_reason=max_tokens means the output cap cut the tool call
  // mid-emission; the structured tail (extracted_facts/procedures, emitted
  // last) is unreliable and the lenient Zod parse passes with it silently
  // missing (the 2026-06-11 Thüringen capture-loss class). Refuse to return
  // a partial capture — throw the typed error a Zod hard-fail takes so
  // index.ts surfaces it loudly and NEVER persists a half-cut turn as whole.
  // Keyed on stop_reason (the API's structural cut signal), NOT on
  // output_tokens===MAX_TOKENS; a clean-stop zero-facts turn is not truncated.
  if (isTruncatedStop(response.stop_reason)) {
    throw new UpstreamError(
      'truncated',
      null,
      `truncated_max_tokens: stop_reason=max_tokens at cap ${MAX_TOKENS} cut the tool call — the structured tail (extracted_facts/procedures) is unreliable; refusing to persist a partial capture. Raise MAX_TOKENS or land facts-before-prose emission-order.`,
    )
  }

  return { toolInput: parsed.data, usage, latencyMs }
}

/**
 * Translate an SDK error into our typed UpstreamError when we recognise
 * it; rethrow otherwise.
 */
function mapSdkError(err: unknown): never {
  const status = (err as { status?: number }).status
  const message = err instanceof Error ? err.message : String(err)

  if (status === 429) {
    // Honour Retry-After exactly per Anthropic docs.
    const headers = (err as { headers?: Record<string, string> }).headers ?? {}
    const ra = Number(headers['retry-after'] ?? headers['Retry-After'] ?? '0')
    const retryAfterMs = Number.isFinite(ra) && ra > 0 ? ra * 1000 : 4_000
    throw new UpstreamError('rate_limit', retryAfterMs, message)
  }
  if (status === 529) {
    throw new UpstreamError('overloaded', 4_000, message)
  }
  if (typeof status === 'number' && status >= 500) {
    throw new UpstreamError('server', 4_000, message)
  }
  // 4xx other than 429 — likely a request bug on our side. Surface raw.
  throw err
}

import {
  MAX_ATTEMPTS,
  backoffMsFor,
  isRetryable,
  sleep,
} from './retryPolicy.ts'

const SCHEMA_REMINDER = {
  type: 'text' as const,
  text:
    'KORREKTUR: Ihre vorherige Antwort hat das Werkzeug `respond` nicht im erwarteten Format aufgerufen. ' +
    'Pflichtfelder sind: `specialist`, `message_de`, `message_en`, `input_type`. ' +
    'Bei `recommendations_delta`, `procedures_delta`, `documents_delta` und `roles_delta` muss jedes Element zusätzlich `op` (`upsert` oder `remove`) und `id` enthalten. ' +
    'Bitte rufen Sie das Werkzeug erneut auf, ausschließlich mit zulässigen Feldern.',
}

/**
 * Inner wrapper: retry ONCE on UpstreamError('invalid_response') with
 * a stricter system reminder. This is the schema-recovery layer that
 * has shipped since Phase 3 (extracted into a named function in
 * Phase 8.6 so the outer backoff layer can compose around it cleanly).
 */
async function callAnthropicWithSchemaReminder(
  args: CallAnthropicArgs,
): Promise<CallAnthropicResult> {
  try {
    return await callAnthropic({ ...args, attemptLabel: args.attemptLabel ?? '1' })
  } catch (err) {
    if (err instanceof UpstreamError && err.code === 'invalid_response') {
      // Phase 9 — second attempt gets its own span via attemptLabel.
      // Parent span tag flips so the timeline distinguishes the
      // schema-reminder retry from a fresh first attempt.
      args.parentSpan?.addEvent('schema_reminder_retry', {
        previous_error: err.message,
      })
      return await callAnthropic({
        ...args,
        systemBlocks: [...args.systemBlocks, SCHEMA_REMINDER],
        attemptLabel: `${args.attemptLabel ?? '1'}_reminder`,
      })
    }
    throw err
  }
}

/**
 * Public entry: schema-reminder retry (inner) wrapped in transient-
 * upstream backoff retry (outer). Phase 8.6 (B.1) added the outer
 * layer; the inner schema-reminder layer has shipped since Phase 3.
 *
 * Retry policy:
 *   • invalid_response → 1 retry with reminder (inner). If the second
 *     attempt also fails, bubbles up to index.ts which surfaces
 *     model_response_invalid + an auto_retry_in_ms hint for the SPA.
 *   • rate_limit / overloaded / server / timeout → up to 3 attempts
 *     total with 0s / 2s / 6s backoff. Honours retryAfterMs (Anthropic
 *     Retry-After header) when set.
 *   • Other 4xx (non-429) → no retry, bubbles up.
 *
 * Meta-sweep item 4b — the outer retry is bound by an EXPLICIT wall
 * budget (WALL_CLOCK_BUDGET_MS = 145 s, see wallBudget.ts), not by the
 * platform kill. The previous comment ("50+2+50+6+50 = 158s, the
 * platform abort is the floor") went stale when ABORT_TIMEOUT_MS rose
 * 50 s → 90 s: the uncapped worst case became 90+2+90+6+90 ≈ 278 s, and
 * a platform kill mid-retry skips the `finally` tracer.finalize — the
 * failure erases its own trace. Now: each attempt's abort timer is
 * capped to the remaining budget (attemptAbortMs) and a retry is only
 * scheduled while a minimum useful attempt still fits
 * (shouldRetryWithinBudget), so the loop always fails typed BEFORE the
 * wall.
 */
export async function callAnthropicWithRetry(
  args: CallAnthropicArgs,
): Promise<CallAnthropicResult> {
  let lastErr: unknown
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await callAnthropicWithSchemaReminder({
        ...args,
        attemptLabel: String(attempt),
      })
    } catch (err) {
      lastErr = err
      if (!isRetryable(err)) throw err
      if (attempt >= MAX_ATTEMPTS) break
      const wait = backoffMsFor(attempt + 1, err)
      // Meta-sweep item 4b — no retry unless a minimum useful attempt
      // still fits inside the wall budget (see wallBudget.ts).
      if (
        args.deadlineAtMs != null &&
        !shouldRetryWithinBudget(args.deadlineAtMs, Date.now(), wait)
      ) {
        args.parentSpan?.addEvent('anthropic.retry_skipped_wall_budget', {
          trigger: (err as { code?: string }).code ?? 'unknown',
          previous_attempt: attempt,
          backoff_ms: wait,
        })
        console.log(
          `[chat-turn] upstream ${err.code} on attempt ${attempt}/${MAX_ATTEMPTS}; ` +
            'wall budget exhausted — failing typed instead of retrying past the platform kill',
        )
        break
      }
      // Phase 9 — record the retry decision as an event on the
      // outer parent span, so the Gantt visualization shows the gap.
      args.parentSpan?.addEvent('anthropic.retry', {
        trigger: (err as { code?: string }).code ?? 'unknown',
        previous_attempt: attempt,
        backoff_ms: wait,
        previous_status_code: (err as { status?: number }).status ?? null,
      })
      console.log(
        `[chat-turn] upstream ${err.code} on attempt ${attempt}/${MAX_ATTEMPTS}; backing off ${wait}ms`,
      )
      await sleep(wait)
    }
  }
  throw lastErr
}

/**
 * Estimate USD cost from a usage record. The SDK reports input_tokens
 * exclusive of cached portions (cache reads/writes are separate
 * counters), so we sum four buckets at four prices.
 */
export function estimateCostUsd(usage: AnthropicUsage): number {
  return (
    (usage.inputTokens / 1e6) * COST_INPUT_PER_MTOK +
    (usage.cacheWriteTokens / 1e6) * COST_CACHE_WRITE_PER_MTOK +
    (usage.cacheReadTokens / 1e6) * COST_CACHE_READ_PER_MTOK +
    (usage.outputTokens / 1e6) * COST_OUTPUT_PER_MTOK
  )
}
