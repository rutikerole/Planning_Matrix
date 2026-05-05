import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { TraceRow } from '@/types/observability'

export interface DailyBucket {
  date: string                       // YYYY-MM-DD
  cost_cents: number
  tokens: number
  trace_count: number
  error_count: number
  kind_json_cents: number
  kind_streaming_cents: number
  cache_read: number
  uncached_input: number
}

export interface LeaderboardEntry {
  key: string                        // project_id or user_id
  label: string                      // truncated id
  cost_cents: number
  trace_count: number
  retry_count: number
}

export interface CostMetrics {
  windowDays: number
  totals: {
    cost_cents: number
    tokens: number
    trace_count: number
    error_count: number
    cache_hit_ratio: number          // 0..1
  }
  daily: DailyBucket[]
  topProjects: LeaderboardEntry[]
  topUsers: LeaderboardEntry[]
  topRetries: LeaderboardEntry[]
}

/**
 * Phase 9 — fetch + aggregate traces for the cost dashboard.
 *
 * Pulls every trace in the last `days` window, aggregates client-side
 * into daily buckets and three leaderboards. Capped at 50_000 rows
 * (≈ 1 month of heavy production usage); past that, this would want
 * a server-side rollup in a materialised view.
 */
export function useCostMetrics(days: 1 | 7 | 30 = 30) {
  return useQuery<CostMetrics>({
    queryKey: ['admin', 'cost-metrics', days],
    queryFn: async () => {
      const since = new Date(Date.now() - days * 86_400_000).toISOString()
      const { data, error } = await supabase
        .schema('logs')
        .from('traces')
        .select(
          'project_id, user_id, status, kind, started_at, total_input_tokens, total_output_tokens, total_cache_read_tokens, total_cache_creation_tokens, total_cost_cents',
        )
        .gte('started_at', since)
        .limit(50_000)
      if (error) throw error
      return aggregate((data ?? []) as TraceRow[], days)
    },
    staleTime: 60_000,
  })
}

function aggregate(traces: TraceRow[], days: number): CostMetrics {
  // Initialize daily buckets so sparse days still appear on charts
  const dailyMap = new Map<string, DailyBucket>()
  const today = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86_400_000)
    const key = d.toISOString().slice(0, 10)
    dailyMap.set(key, {
      date: key,
      cost_cents: 0,
      tokens: 0,
      trace_count: 0,
      error_count: 0,
      kind_json_cents: 0,
      kind_streaming_cents: 0,
      cache_read: 0,
      uncached_input: 0,
    })
  }

  const projectAgg = new Map<string, LeaderboardEntry>()
  const userAgg = new Map<string, LeaderboardEntry>()

  let totalCost = 0
  let totalTokens = 0
  let totalCacheRead = 0
  let totalUncachedInput = 0
  let errorCount = 0

  for (const t of traces) {
    const dayKey = t.started_at.slice(0, 10)
    const bucket = dailyMap.get(dayKey)
    const cost = t.total_cost_cents ?? 0
    const tokens =
      (t.total_input_tokens ?? 0) +
      (t.total_output_tokens ?? 0) +
      (t.total_cache_read_tokens ?? 0) +
      (t.total_cache_creation_tokens ?? 0)
    const cacheRead = t.total_cache_read_tokens ?? 0
    const uncachedInput = (t.total_input_tokens ?? 0) + (t.total_cache_creation_tokens ?? 0)

    if (bucket) {
      bucket.cost_cents += cost
      bucket.tokens += tokens
      bucket.trace_count++
      if (t.status === 'error' || t.status === 'partial') bucket.error_count++
      if (t.kind === 'chat_turn_streaming') bucket.kind_streaming_cents += cost
      else bucket.kind_json_cents += cost
      bucket.cache_read += cacheRead
      bucket.uncached_input += uncachedInput
    }

    totalCost += cost
    totalTokens += tokens
    totalCacheRead += cacheRead
    totalUncachedInput += uncachedInput
    if (t.status === 'error' || t.status === 'partial') errorCount++

    if (t.project_id) accumulateLeaderboard(projectAgg, t.project_id, cost, t.status)
    if (t.user_id) accumulateLeaderboard(userAgg, t.user_id, cost, t.status)
  }

  const cacheTotal = totalCacheRead + totalUncachedInput
  return {
    windowDays: days,
    totals: {
      cost_cents: totalCost,
      tokens: totalTokens,
      trace_count: traces.length,
      error_count: errorCount,
      cache_hit_ratio: cacheTotal > 0 ? totalCacheRead / cacheTotal : 0,
    },
    daily: Array.from(dailyMap.values()),
    topProjects: topN(projectAgg, 10),
    topUsers: topN(userAgg, 10),
    topRetries: topN(projectAgg, 10, 'retry_count'),
  }
}

function accumulateLeaderboard(
  map: Map<string, LeaderboardEntry>,
  key: string,
  cost: number,
  status: TraceRow['status'],
) {
  const existing = map.get(key) ?? {
    key,
    label: key.slice(0, 8),
    cost_cents: 0,
    trace_count: 0,
    retry_count: 0,
  }
  existing.cost_cents += cost
  existing.trace_count++
  if (status === 'error' || status === 'partial') existing.retry_count++
  map.set(key, existing)
}

function topN(
  map: Map<string, LeaderboardEntry>,
  n: number,
  sortBy: 'cost_cents' | 'retry_count' = 'cost_cents',
): LeaderboardEntry[] {
  return Array.from(map.values())
    .sort((a, b) => b[sortBy] - a[sortBy])
    .slice(0, n)
}
