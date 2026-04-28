// ───────────────────────────────────────────────────────────────────────
// Planning Matrix — chat-turn API contract
//
// Request and response shapes for POST /functions/v1/chat-turn. Shared
// between the SPA (src/lib/chatApi.ts) and the Edge Function
// (supabase/functions/chat-turn/index.ts) — Deno picks this up via
// relative import; Vite via the @ alias. One source of truth.
//
// UserAnswer is a discriminated union mirroring the input bar's adaptive
// controls (text / yesno / select / multi / address / idk). It travels
// alongside `userMessage` because the model benefits from the structured
// payload (e.g. for `multi_select`, the labels matter for grounding).
// ───────────────────────────────────────────────────────────────────────

import { z } from 'zod'
import type { ProjectState } from './projectState.ts'

// ── UserAnswer ─────────────────────────────────────────────────────────
export const userAnswerSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('text'), text: z.string().min(1).max(4000) }),
  z.object({ kind: z.literal('yesno'), value: z.enum(['ja', 'nein']) }),
  z.object({
    kind: z.literal('single_select'),
    value: z.string().min(1),
    label_de: z.string().min(1),
    label_en: z.string().min(1),
  }),
  z.object({
    kind: z.literal('multi_select'),
    values: z
      .array(
        z.object({
          value: z.string().min(1),
          label_de: z.string().min(1),
          label_en: z.string().min(1),
        }),
      )
      .min(1),
  }),
  z.object({ kind: z.literal('address'), text: z.string().min(6).max(500) }),
  z.object({
    kind: z.literal('idk'),
    mode: z.enum(['research', 'assume', 'skip']),
  }),
])

export type UserAnswer = z.infer<typeof userAnswerSchema>

// ── Request body ───────────────────────────────────────────────────────
export const chatTurnRequestSchema = z.object({
  projectId: z.string().uuid(),
  /** Free-text rendering of what the user said this turn. Null = priming the first turn. */
  userMessage: z.string().max(4000).nullable(),
  userAnswer: userAnswerSchema.nullable(),
  /** Idempotency key — same retry, same id. */
  clientRequestId: z.string().uuid(),
  /**
   * Phase 3.7 #79 — UI locale at the moment the user sent the turn.
   * Optional + defaults to 'de' on the server so old SPA versions still
   * work. The Edge Function appends a small locale-aware text block
   * AFTER the cached PERSONA_BLOCK so the model knows whether to make
   * `message_en` first-class native English or just a backup mirror.
   * Cache stays warm because the locale block lives outside the
   * cached portion.
   */
  locale: z.enum(['de', 'en']).optional(),
})

export type ChatTurnRequest = z.infer<typeof chatTurnRequestSchema>

// ── Error envelope ─────────────────────────────────────────────────────
export type ChatTurnErrorCode =
  | 'unauthenticated'
  | 'forbidden'
  | 'not_found'
  | 'validation'
  | 'idempotency_replay'
  | 'upstream_overloaded'
  | 'upstream_timeout'
  | 'model_response_invalid'
  | 'persistence_failed'
  | 'rate_limit_exceeded'
  | 'internal'

export interface ChatTurnError {
  code: ChatTurnErrorCode
  message: string
  retryAfterMs?: number
  requestId?: string
  /** Phase 4.1 #125 — populated when code === 'rate_limit_exceeded'. */
  rateLimit?: {
    currentCount: number
    maxCount: number
    /** ISO timestamp when the bucket resets. */
    resetAt: string
  }
}

// ── Response ───────────────────────────────────────────────────────────
export interface CostInfo {
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
  latencyMs: number
  /** Estimated USD cost of this turn. Computed in anthropic.ts. */
  usdEstimate: number
}

/** Subset of the messages row shape relevant to the SPA. Snake_case kept
 * to match the DB column names — saves a translation layer at the
 * client. The full row shape lives in src/types/db.ts (future). */
export interface AssistantMessageRow {
  id: string
  project_id: string
  role: 'assistant'
  specialist: string
  content_de: string
  content_en: string | null
  input_type: string | null
  input_options: unknown
  allow_idk: boolean | null
  model: string
  input_tokens: number | null
  output_tokens: number | null
  cache_read_tokens: number | null
  cache_write_tokens: number | null
  latency_ms: number | null
  created_at: string
}

export type CompletionSignal =
  | 'continue'
  | 'needs_designer'
  | 'ready_for_review'
  | 'blocked'

export type ChatTurnResponse =
  | {
      ok: true
      assistantMessage: AssistantMessageRow
      projectState: ProjectState
      costInfo: CostInfo
      /** Echoed from tool_input.completion_signal — drives the in-thread interstitial. */
      completionSignal: CompletionSignal
    }
  | {
      ok: false
      error: ChatTurnError
    }
