import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface PersonaVersion {
  hash: string
  hash_short: string
  first_seen: string
  last_seen: string
  trace_count: number
  ok_count: number
  error_count: number
  cache_hit_ratio: number
  avg_input_tokens: number
  avg_latency_ms: number
  total_cost_cents: number
  /** True if at least one trace for this hash has a stored snapshot
   *  with system_prompt_full populated — i.e. the diff viewer can
   *  show this version. */
  has_full_prompt: boolean
}

export interface PersonaEvolutionResult {
  versions: PersonaVersion[]
}

/**
 * Phase 9.2 — aggregate logs.traces + logs.persona_snapshots by
 * system_prompt_hash for one project. Used by the drawer's Persona
 * evolution tab.
 *
 * Two queries:
 *   1. snapshots — gives us hash + has_full_prompt + trace_id link.
 *   2. traces    — gives us per-turn metrics (tokens, status,
 *                  latency, cost, cache_read).
 *
 * Joined client-side. With ≤ 500 traces and ≤ 100 snapshots per
 * project this is well under the threshold where a server-side
 * materialised view would pay off.
 */
export function usePersonaEvolution(projectId: string | undefined) {
  return useQuery<PersonaEvolutionResult>({
    enabled: !!projectId,
    queryKey: ['admin', 'persona-evolution', projectId],
    queryFn: async () => {
      const [snapshotsRes, tracesRes] = await Promise.all([
        supabase
          .schema('logs')
          .from('persona_snapshots')
          .select('trace_id, system_prompt_hash, system_prompt_full, created_at')
          .order('created_at', { ascending: true })
          .limit(500),
        supabase
          .schema('logs')
          .from('traces')
          .select('trace_id, status, started_at, total_input_tokens, total_cache_read_tokens, total_cache_creation_tokens, duration_ms, total_cost_cents')
          .eq('project_id', projectId!)
          .order('started_at', { ascending: true })
          .limit(500),
      ])
      if (snapshotsRes.error) throw snapshotsRes.error
      if (tracesRes.error) throw tracesRes.error

      const snapshots = snapshotsRes.data ?? []
      const traces = tracesRes.data ?? []
      const traceIds = new Set(traces.map((t) => t.trace_id))

      // Map trace_id → hash via snapshots scoped to this project's traces.
      const hashByTrace = new Map<string, { hash: string; hasFull: boolean }>()
      for (const s of snapshots) {
        if (!traceIds.has(s.trace_id)) continue
        hashByTrace.set(s.trace_id, {
          hash: s.system_prompt_hash,
          hasFull: !!s.system_prompt_full,
        })
      }

      // Aggregate per hash. Use a separate accumulator type so the
      // running sums don't pollute the public PersonaVersion shape.
      interface Accumulator {
        hash: string
        first_seen: string
        last_seen: string
        trace_count: number
        ok_count: number
        error_count: number
        sum_input: number
        sum_cache_read: number
        sum_cache_create: number
        sum_latency: number
        total_cost_cents: number
        has_full_prompt: boolean
      }
      const buckets = new Map<string, Accumulator>()
      for (const t of traces) {
        const meta = hashByTrace.get(t.trace_id)
        if (!meta) continue
        const hash = meta.hash
        const cur =
          buckets.get(hash) ??
          ({
            hash,
            first_seen: t.started_at,
            last_seen: t.started_at,
            trace_count: 0,
            ok_count: 0,
            error_count: 0,
            sum_input: 0,
            sum_cache_read: 0,
            sum_cache_create: 0,
            sum_latency: 0,
            total_cost_cents: 0,
            has_full_prompt: false,
          } satisfies Accumulator)
        cur.trace_count++
        if (t.status === 'ok' || t.status === 'idempotent_replay') cur.ok_count++
        else cur.error_count++
        cur.sum_input += t.total_input_tokens ?? 0
        cur.sum_cache_read += t.total_cache_read_tokens ?? 0
        cur.sum_cache_create += t.total_cache_creation_tokens ?? 0
        cur.sum_latency += t.duration_ms ?? 0
        cur.total_cost_cents += t.total_cost_cents ?? 0
        if (t.started_at < cur.first_seen) cur.first_seen = t.started_at
        if (t.started_at > cur.last_seen) cur.last_seen = t.started_at
        if (meta.hasFull) cur.has_full_prompt = true
        buckets.set(hash, cur)
      }

      const versions: PersonaVersion[] = Array.from(buckets.values())
        .sort((a, b) => a.first_seen.localeCompare(b.first_seen))
        .map((acc) => {
          const inputPlusCache = acc.sum_input + acc.sum_cache_read + acc.sum_cache_create
          return {
            hash: acc.hash,
            hash_short: acc.hash.slice(0, 8),
            first_seen: acc.first_seen,
            last_seen: acc.last_seen,
            trace_count: acc.trace_count,
            ok_count: acc.ok_count,
            error_count: acc.error_count,
            cache_hit_ratio:
              inputPlusCache > 0 ? acc.sum_cache_read / inputPlusCache : 0,
            avg_input_tokens:
              acc.trace_count > 0 ? acc.sum_input / acc.trace_count : 0,
            avg_latency_ms:
              acc.trace_count > 0 ? acc.sum_latency / acc.trace_count : 0,
            total_cost_cents: acc.total_cost_cents,
            has_full_prompt: acc.has_full_prompt,
          }
        })

      return { versions }
    },
    staleTime: 60_000,
  })
}

/**
 * Phase 9.2 — fetch the system_prompt_full for a specific hash so the
 * diff viewer can show side-by-side text. Returns the most recent
 * stored copy for the hash (full prompts are nulled by retention
 * after 30 days, so fresher is more likely to be intact).
 */
export function usePersonaPrompt(hash: string | null) {
  return useQuery<string | null>({
    enabled: !!hash,
    queryKey: ['admin', 'persona-prompt', hash],
    queryFn: async () => {
      const { data, error } = await supabase
        .schema('logs')
        .from('persona_snapshots')
        .select('system_prompt_full')
        .eq('system_prompt_hash', hash!)
        .not('system_prompt_full', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return (data?.system_prompt_full ?? null) as string | null
    },
    staleTime: 5 * 60 * 1000,
  })
}
