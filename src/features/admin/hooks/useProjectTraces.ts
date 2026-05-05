import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { TraceRow } from '@/types/observability'

export interface ProjectDetail {
  project: {
    id: string
    name: string
    owner_id: string
    template_id: string
    bundesland: string
    intent: string
    plot_address: string | null
    created_at: string
    updated_at: string
    status: string
  }
  traces: TraceRow[]
}

/**
 * Fetch one project + its full trace history (latest first), capped
 * at 500 turns. Used by ProjectInspectorDetail.
 */
export function useProjectTraces(projectId: string | undefined) {
  return useQuery<ProjectDetail>({
    enabled: !!projectId,
    queryKey: ['admin', 'project-detail', projectId],
    queryFn: async () => {
      const { data: project, error: projErr } = await supabase
        .from('projects')
        .select('id, name, owner_id, template_id, bundesland, intent, plot_address, created_at, updated_at, status')
        .eq('id', projectId!)
        .single()
      if (projErr) throw projErr

      const { data: traces, error: traceErr } = await supabase
        .schema('logs')
        .from('traces')
        .select('*')
        .eq('project_id', projectId!)
        .order('started_at', { ascending: false })
        .limit(500)
      if (traceErr) throw traceErr

      return {
        project: project as ProjectDetail['project'],
        traces: (traces ?? []) as TraceRow[],
      }
    },
    staleTime: 15_000,
  })
}
