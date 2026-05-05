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

// ── Configuration ──────────────────────────────────────────────────────
// Phase 3.1 #33: dropped from 2048 → 1280 based on batch-4 telemetry
// (median ~1500 output tokens, max 1715). 1280 caps the worst-case
// latency at ~43s vs 46s observed; the model truncates cleanly mid-
// thought when a real response would have run longer.
//
// TODO(phase-4): evaluate streaming or Sonnet 4.6 upgrade if
// truncation rate climbs above 5% in production telemetry.
const MAX_TOKENS = 1280
const ABORT_TIMEOUT_MS = 50_000

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
      | 'timeout',
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
 */
export async function callAnthropic(
  args: CallAnthropicArgs,
): Promise<CallAnthropicResult> {
  const { apiKey, systemBlocks, messages, signal: externalSignal } = args

  const controller = new AbortController()
  const timeoutId = setTimeout(
    () => controller.abort(new Error('upstream_timeout')),
    ABORT_TIMEOUT_MS,
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
      throw new UpstreamError(
        'timeout',
        null,
        'Anthropic request timed out (50s)',
      )
    }
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
    throw new UpstreamError(
      'invalid_response',
      null,
      'Forced tool_choice produced no tool_use block',
    )
  }
  if (toolUse.name !== 'respond') {
    throw new UpstreamError(
      'invalid_response',
      null,
      `Unexpected tool name: ${toolUse.name}`,
    )
  }

  const parsed = respondToolInputSchema.safeParse(toolUse.input)
  if (!parsed.success) {
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
    return await callAnthropic(args)
  } catch (err) {
    if (err instanceof UpstreamError && err.code === 'invalid_response') {
      return await callAnthropic({
        ...args,
        systemBlocks: [...args.systemBlocks, SCHEMA_REMINDER],
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
 * The outer retry is bound by the function's wall clock (150s); each
 * attempt has its own 50s ABORT_TIMEOUT. Worst case: 50s + 2s + 50s +
 * 6s + 50s = 158s. Slightly over the wall clock; the platform abort
 * is the floor and we'd rather try than abort early.
 */
export async function callAnthropicWithRetry(
  args: CallAnthropicArgs,
): Promise<CallAnthropicResult> {
  let lastErr: unknown
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await callAnthropicWithSchemaReminder(args)
    } catch (err) {
      lastErr = err
      if (!isRetryable(err)) throw err
      if (attempt >= MAX_ATTEMPTS) break
      const wait = backoffMsFor(attempt + 1, err)
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
