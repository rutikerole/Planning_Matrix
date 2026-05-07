// ───────────────────────────────────────────────────────────────────────
// Phase 9 — cost calculation for traces
//
// Single source of truth for converting (usage × pricing) into cents.
// Reads pricing from public.model_pricing so a price change is a
// one-row INSERT, not a code deploy. The result is stored on the
// trace row at finalize-time and never recomputed — so a price change
// does not retroactively alter historical cost.
//
// Total input tokens per Anthropic's pricing docs:
//   total_input = input_tokens + cache_read_input_tokens + cache_creation_input_tokens
// where input_tokens is post-last-cache-breakpoint (i.e. uncached) and
// the other two are billed at 0.1× and 1.25× the input rate (5-min
// cache). All four go on the trace row separately so the UI can show
// the breakdown; the cost is the weighted sum.
// ───────────────────────────────────────────────────────────────────────

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
import type {
  AnthropicUsage,
  ModelPricing,
} from '../../../src/types/observability.ts'

// In-memory cache for pricing lookups. The Edge Function is short-lived
// (single invocation per warm container) so this is just a per-request
// memo; cold starts re-fetch. Pricing rows are tiny (~50 bytes) so the
// memory cost is negligible.
const pricingCache = new Map<string, ModelPricing>()

export async function getPricing(
  client: SupabaseClient,
  model: string,
): Promise<ModelPricing | null> {
  const cached = pricingCache.get(model)
  if (cached) return cached

  const { data, error } = await client
    .from('model_pricing')
    .select('*')
    .eq('model', model)
    .maybeSingle()

  if (error || !data) return null

  pricingCache.set(model, data as ModelPricing)
  return data as ModelPricing
}

export interface CostBreakdown {
  total_cost_cents: number
  input_cents: number
  output_cents: number
  cache_read_cents: number
  cache_creation_cents: number
}

// Computes cost in cents from a usage object and a pricing row.
// `usage.input_tokens` is the uncached input count (post-breakpoint).
// All multiplications happen in float; we round the per-line result to
// 4 decimal cents and sum, then floor on the trace total. This avoids
// the integer-only-arithmetic pitfall where 1 token at $3/MTok rounds
// to 0¢ and a thousand turns lose ~30¢.
export function computeCostCents(
  usage: AnthropicUsage,
  pricing: ModelPricing,
): CostBreakdown {
  const input = usage.input_tokens ?? 0
  const output = usage.output_tokens ?? 0
  const cacheRead = usage.cache_read_input_tokens ?? 0
  const cacheCreate = usage.cache_creation_input_tokens ?? 0

  const inputCents = (input * pricing.input_per_1m_cents) / 1_000_000
  const outputCents = (output * pricing.output_per_1m_cents) / 1_000_000
  const cacheReadCents = (cacheRead * pricing.cache_read_per_1m_cents) / 1_000_000
  const cacheCreateCents = (cacheCreate * pricing.cache_creation_per_1m_cents) / 1_000_000

  // Floor the sum to whole cents for storage (DB column is int).
  // Sub-cent precision is preserved in the breakdown for the UI tooltip.
  const total = Math.floor(inputCents + outputCents + cacheReadCents + cacheCreateCents)

  return {
    total_cost_cents: total,
    input_cents: inputCents,
    output_cents: outputCents,
    cache_read_cents: cacheReadCents,
    cache_creation_cents: cacheCreateCents,
  }
}

// Sum two AnthropicUsage objects. Used by the tracer to accumulate
// across multiple Anthropic calls inside a single turn (e.g. the
// schema-reminder retry path issues two calls, both on the same trace).
export function sumUsage(a: AnthropicUsage, b: AnthropicUsage): AnthropicUsage {
  return {
    input_tokens: (a.input_tokens ?? 0) + (b.input_tokens ?? 0),
    output_tokens: (a.output_tokens ?? 0) + (b.output_tokens ?? 0),
    cache_creation_input_tokens:
      (a.cache_creation_input_tokens ?? 0) + (b.cache_creation_input_tokens ?? 0),
    cache_read_input_tokens:
      (a.cache_read_input_tokens ?? 0) + (b.cache_read_input_tokens ?? 0),
  }
}
