import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { TraceRow } from '@/types/observability'

export interface ProjectMetrics {
  project_id: string
  project_name: string
  owner_id: string
  template_id: string
  bundesland: string
  created_at: string
  updated_at: string
  status: string
  trace_count: number
  total_input_tokens: number
  total_output_tokens: number
  total_cache_read_tokens: number
  total_cache_creation_tokens: number
  total_cost_cents: number
  error_count: number
  last_trace_at: string | null
}

const PROJECT_LIMIT = 500

/**
 * Phase 9 — Atelier Console list view query.
 *
 * Two fetches, joined client-side:
 *   1. All projects (admin RLS — sees everyone's via the admin RLS
 *      policy on projects, OR via the service-role escalation in a
 *      future migration). For v1 the project itself is owner-RLS so
 *      admin sees only their own projects unless we add a separate
 *      admin policy. (Note in PHASE_9_FINDINGS §3.10 — for v1 admin
 *      = viewer of their own projects' traces.)
 *   2. All traces (admin RLS via logs.is_admin()).
 *
 * Aggregates compute in JS — fine for ≤ 500 projects × ≤ 100 traces
 * each. Beyond that, a server-side materialized view is the move.
 */
export function useProjectsWithMetrics() {
  return useQuery<ProjectMetrics[]>({
    queryKey: ['admin', 'projects-with-metrics'],
    queryFn: async () => {
      const { data: projectRows, error: projErr } = await supabase
        .from('projects')
        .select('id, name, owner_id, template_id, bundesland, created_at, updated_at, status')
        .order('updated_at', { ascending: false })
        .limit(PROJECT_LIMIT)
      if (projErr) throw projErr
      const projects = projectRows ?? []
      if (projects.length === 0) return []

      const ids = projects.map((p) => p.id as string)
      const { data: traceRows, error: traceErr } = await supabase
        .schema('logs')
        .from('traces')
        .select(
          'trace_id, project_id, status, started_at, total_input_tokens, total_output_tokens, total_cache_read_tokens, total_cache_creation_tokens, total_cost_cents',
        )
        .in('project_id', ids)
        .order('started_at', { ascending: false })
        .limit(20_000)
      if (traceErr) throw traceErr
      const traces = (traceRows ?? []) as Pick<
        TraceRow,
        | 'trace_id'
        | 'project_id'
        | 'status'
        | 'started_at'
        | 'total_input_tokens'
        | 'total_output_tokens'
        | 'total_cache_read_tokens'
        | 'total_cache_creation_tokens'
        | 'total_cost_cents'
      >[]

      const buckets = new Map<string, ProjectMetrics>()
      for (const p of projects) {
        buckets.set(p.id as string, {
          project_id: p.id as string,
          project_name: p.name as string,
          owner_id: p.owner_id as string,
          template_id: p.template_id as string,
          bundesland: p.bundesland as string,
          created_at: p.created_at as string,
          updated_at: p.updated_at as string,
          status: (p.status as string) ?? 'active',
          trace_count: 0,
          total_input_tokens: 0,
          total_output_tokens: 0,
          total_cache_read_tokens: 0,
          total_cache_creation_tokens: 0,
          total_cost_cents: 0,
          error_count: 0,
          last_trace_at: null,
        })
      }

      for (const t of traces) {
        if (!t.project_id) continue
        const b = buckets.get(t.project_id)
        if (!b) continue
        b.trace_count++
        b.total_input_tokens += t.total_input_tokens ?? 0
        b.total_output_tokens += t.total_output_tokens ?? 0
        b.total_cache_read_tokens += t.total_cache_read_tokens ?? 0
        b.total_cache_creation_tokens += t.total_cache_creation_tokens ?? 0
        b.total_cost_cents += t.total_cost_cents ?? 0
        if (t.status === 'error' || t.status === 'partial') b.error_count++
        if (!b.last_trace_at || (t.started_at && t.started_at > b.last_trace_at)) {
          b.last_trace_at = t.started_at
        }
      }

      return Array.from(buckets.values())
    },
    staleTime: 30_000,
  })
}
