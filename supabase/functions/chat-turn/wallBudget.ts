// ───────────────────────────────────────────────────────────────────────
// Meta-sweep item 4b — wall-clock budget for the Anthropic retry loop.
//
// The platform kills the edge-function isolate at ~150 s. When ABORT_
// TIMEOUT_MS went 50 s → 90 s (fix/output-budget) the retry arithmetic
// silently broke: 90+2+90+6+90 ≈ 278 s worst case vs the old 50+2+50+6+50
// = 158 s. A platform kill mid-retry aborts the isolate, the `finally`
// tracer.finalize never runs, and the failure class ERASES ITS OWN TRACE
// (no row at all) while the client sees a dropped connection.
//
// This module is the single source for the budget math: every attempt's
// abort timer is capped to the remaining wall budget, and a retry is only
// scheduled when a minimum useful attempt still fits. We therefore always
// fail TYPED and BEFORE the wall — the tracer finalizes, the client gets
// the upstream_timeout envelope.
//
// Pure + dependency-free so the prebuild smoke (smoke-t05-composer F12)
// can import it directly under tsx.
// ───────────────────────────────────────────────────────────────────────

/** Total wall budget from request start. Platform kill is ~150 s; keep
 *  5 s under it so persistence + response + trace finalize always run. */
export const WALL_CLOCK_BUDGET_MS = 145_000

/** Reserved tail per attempt for persist/respond/finalize work. */
export const RESPONSE_SAFETY_MS = 5_000

/** An attempt shorter than this cannot produce a useful turn — fail
 *  typed instead of starting it. */
export const MIN_ATTEMPT_MS = 10_000

/**
 * fix/synthesis-truncation — output-budget companion to the wall-clock
 * budget. True when the model's output was cut at MAX_TOKENS
 * (stop_reason='max_tokens'): the tool call was truncated mid-emission, so
 * the structured tail (extracted_facts / procedures_delta /
 * recommendations_delta — emitted last) is unreliable. The caller FAILS
 * CLOSED on this, never persisting a partial capture as if whole.
 *
 * Keyed on stop_reason — the API's structural "I cut your output" signal —
 * NOT on output_tokens===MAX_TOKENS. A turn that legitimately emits zero
 * structured data stops cleanly ('end_turn' / 'tool_use') and is NOT
 * truncated; this predicate distinguishes "no facts to emit" (clean stop,
 * persists) from "facts cut by the cap" (max_tokens, fails). Pure +
 * dependency-free so the prebuild smoke (smoke-t05-composer F11) imports it.
 */
export function isTruncatedStop(
  stopReason: string | null | undefined,
): boolean {
  return stopReason === 'max_tokens'
}

/**
 * Abort-timer budget for ONE attempt starting at `nowMs`, given the
 * request-level `deadlineAtMs` (requestStart + WALL_CLOCK_BUDGET_MS) and
 * the per-attempt cap (ABORT_TIMEOUT_MS). Returns null when no useful
 * attempt fits — the caller must fail typed (upstream_timeout) so the
 * trace and the client envelope survive.
 */
export function attemptAbortMs(
  deadlineAtMs: number,
  nowMs: number,
  perAttemptCapMs: number,
): number | null {
  const remaining = deadlineAtMs - nowMs - RESPONSE_SAFETY_MS
  if (remaining < MIN_ATTEMPT_MS) return null
  return Math.min(perAttemptCapMs, remaining)
}

/**
 * Whether scheduling a retry (after `backoffMs`) still leaves room for a
 * minimum useful attempt plus the response-safety tail.
 */
export function shouldRetryWithinBudget(
  deadlineAtMs: number,
  nowMs: number,
  backoffMs: number,
): boolean {
  return nowMs + backoffMs + MIN_ATTEMPT_MS + RESPONSE_SAFETY_MS <= deadlineAtMs
}
