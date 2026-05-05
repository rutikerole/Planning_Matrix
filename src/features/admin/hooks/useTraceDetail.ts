import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type {
  PersonaSnapshotRow,
  ProjectEventRow,
  SpanRow,
  TraceRow,
} from '@/types/observability'

export interface TraceDetail {
  trace: TraceRow
  spans: SpanRow[]
  snapshot: PersonaSnapshotRow | null
  events: ProjectEventRow[]
}

/**
 * Phase 9 — fetch everything needed to render the deep-dive view.
 *
 * Three queries (trace, spans+snapshot in one round, events). Spans
 * are sorted by started_at so the Gantt can lay them out in arrival
 * order. Snapshot fetched separately because it's optional (might
 * not be sampled on a successful turn).
 */
export function useTraceDetail(traceId: string | undefined) {
  return useQuery<TraceDetail>({
    enabled: !!traceId,
    queryKey: ['admin', 'trace-detail', traceId],
    queryFn: async () => {
      const [{ data: trace, error: te }, { data: spans, error: se }, { data: snapshot }, { data: events, error: ee }] =
        await Promise.all([
          supabase.schema('logs').from('traces').select('*').eq('trace_id', traceId!).single(),
          supabase
            .schema('logs')
            .from('spans')
            .select('*')
            .eq('trace_id', traceId!)
            .order('started_at', { ascending: true })
            .limit(500),
          supabase
            .schema('logs')
            .from('persona_snapshots')
            .select('*')
            .eq('trace_id', traceId!)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from('project_events')
            .select('*')
            .eq('trace_id', traceId!)
            .order('created_at', { ascending: true })
            .limit(200),
        ])

      if (te) throw te
      if (se) throw se
      if (ee) throw ee

      return {
        trace: trace as TraceRow,
        spans: (spans ?? []) as SpanRow[],
        snapshot: (snapshot as PersonaSnapshotRow | null) ?? null,
        events: (events ?? []) as ProjectEventRow[],
      }
    },
    staleTime: 60_000,
  })
}
