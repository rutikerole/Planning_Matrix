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
const MAX_TOKENS = 2048
const ABORT_TIMEOUT_MS = 50_000

// Sonnet 4.5 pricing in USD per million tokens (April 2026).
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
