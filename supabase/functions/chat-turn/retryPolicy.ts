// ───────────────────────────────────────────────────────────────────────
// Phase 8.6 (B.1) — retry policy for transient upstream errors
//
// Policy: 3 attempts total. Backoff between attempts: 0s before #1,
// 2s before #2, 6s before #3. If the underlying error carries an
// explicit `retryAfterMs` (Anthropic Retry-After header on 429), that
// value wins.
//
// Retryable codes — transient, request likely never processed:
//   rate_limit (429)  — Anthropic rate-limit
//   overloaded (529)  — Anthropic capacity
//   server     (5xx)  — Anthropic infra
//   timeout           — our 50s abort
//
// Non-retryable:
//   invalid_response  — schema-reminder retry already handled
//                       inside callAnthropicWithRetry
//   any 4xx (other than 429) — request bug; second hit won't help
//
// The previous behaviour was: callAnthropicWithRetry retried ONCE on
// invalid_response only and let everything else bubble. Phase 8.5's
// finding 7 documented synthesis-turn 502s reaching the user; the
// missing piece was this retry layer for transient upstream issues.
// ───────────────────────────────────────────────────────────────────────

import { UpstreamError } from './anthropic.ts'

export const RETRYABLE_CODES: ReadonlyArray<UpstreamError['code']> = [
  'rate_limit',
  'overloaded',
  'server',
  'timeout',
]

/** Per-attempt backoff in ms. attemptIndex is 1-based. */
const BACKOFF_MS = [0, 2_000, 6_000] as const
export const MAX_ATTEMPTS = BACKOFF_MS.length

export function isRetryable(err: unknown): err is UpstreamError {
  return (
    err instanceof UpstreamError &&
    RETRYABLE_CODES.includes(err.code)
  )
}

/**
 * Returns the wait time before attempt #n (1-based). Honours the
 * error's own `retryAfterMs` when set (Anthropic Retry-After header
 * on 429).
 */
export function backoffMsFor(attemptIndex: number, err: UpstreamError): number {
  const explicit = err.retryAfterMs
  const base = BACKOFF_MS[Math.min(attemptIndex - 1, BACKOFF_MS.length - 1)]
  if (typeof explicit === 'number' && explicit > 0) {
    return Math.max(base, explicit)
  }
  return base
}

export function sleep(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve()
  return new Promise((resolve) => setTimeout(resolve, ms))
}
