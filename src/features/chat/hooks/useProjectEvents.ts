import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface ProjectEventRow {
  id: string
  project_id: string
  event_type: string
  before_state: unknown
  after_state: unknown
  reason: string | null
  triggered_by: 'user' | 'assistant' | 'system'
  created_at: string
}

/**
 * Fetch the last N project_events for the audit log on the overview
 * page. RLS scopes to project owner. Latest first.
 */
export function useProjectEvents(projectId: string, limit = 30) {
  return useQuery<ProjectEventRow[]>({
    queryKey: ['project-events', projectId, limit],
    queryFn: async () => {
      if (!projectId) return []
      const { data, error } = await supabase
        .from('project_events')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(limit)
      if (error) throw error
      return (data as ProjectEventRow[]) ?? []
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    enabled: !!projectId,
  })
}
