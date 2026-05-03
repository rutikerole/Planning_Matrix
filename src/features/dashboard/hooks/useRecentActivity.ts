import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface RecentActivityRow {
  id: string
  project_id: string
  event_type: string
  created_at: string
  project_name: string | null
  project_address: string | null
}

interface ProjectEventJoin {
  id: string
  event_type: string
  created_at: string
  project_id: string
  projects: { name: string | null; plot_address: string | null } | null
}

/**
 * Pulls the 8 most recent `project_events` across the user's
 * projects (RLS scopes by owner). Used by the ActivityTicker and
 * the Cmd+K palette's "Aktivität" group.
 */
export function useRecentActivity() {
  return useQuery<RecentActivityRow[]>({
    queryKey: ['project-events', 'recent'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_events')
        .select('id, event_type, created_at, project_id, projects!inner(name, plot_address)')
        .order('created_at', { ascending: false })
        .limit(8)
      if (error) throw error
      const rows = (data ?? []) as unknown as ProjectEventJoin[]
      return rows.map((r) => ({
        id: r.id,
        project_id: r.project_id,
        event_type: r.event_type,
        created_at: r.created_at,
        project_name: r.projects?.name ?? null,
        project_address: r.projects?.plot_address ?? null,
      }))
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })
}
