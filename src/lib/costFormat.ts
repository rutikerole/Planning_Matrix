// ───────────────────────────────────────────────────────────────────────
// Cost calculation + German-locale formatting for the right-rail cost
// ticker (Polish Move 7). Mirrors the per-turn pricing logic in
// supabase/functions/chat-turn/anthropic.ts so the running total in
// the SPA matches what the Edge Function logs server-side.
//
// Sonnet 4.5 pricing per million tokens (April 2026):
//   input:        $3.00
//   output:       $15.00
//   cache write:  $3.75   (5-min ephemeral)
//   cache read:   $0.30
// ───────────────────────────────────────────────────────────────────────

export interface CostBreakdown {
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
}

const COST_INPUT_PER_MTOK = 3.0
const COST_OUTPUT_PER_MTOK = 15.0
const COST_CACHE_WRITE_PER_MTOK = 3.75
const COST_CACHE_READ_PER_MTOK = 0.3

export function estimateUsd(c: CostBreakdown): number {
  return (
    (c.inputTokens / 1e6) * COST_INPUT_PER_MTOK +
    (c.outputTokens / 1e6) * COST_OUTPUT_PER_MTOK +
    (c.cacheWriteTokens / 1e6) * COST_CACHE_WRITE_PER_MTOK +
    (c.cacheReadTokens / 1e6) * COST_CACHE_READ_PER_MTOK
  )
}

export function totalTokens(c: CostBreakdown): number {
  return c.inputTokens + c.outputTokens + c.cacheReadTokens + c.cacheWriteTokens
}

/**
 * "4.218 Tokens" — German locale uses period as thousand separator.
 * Falls back to plain number on unsupported environments.
 */
export function formatTokensDe(tokens: number): string {
  try {
    return new Intl.NumberFormat('de-DE').format(tokens)
  } catch {
    return String(tokens)
  }
}

/**
 * "0,02 USD" — German locale uses comma as decimal. Two fraction digits.
 */
export function formatUsdDe(usd: number): string {
  try {
    return new Intl.NumberFormat('de-DE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(usd) + ' USD'
  } catch {
    return `${usd.toFixed(2)} USD`
  }
}
