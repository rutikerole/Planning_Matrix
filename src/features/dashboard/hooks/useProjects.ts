import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { ProjectRow } from '@/types/db'

export interface ProjectListEntry extends ProjectRow {
  /** Count of assistant turns associated with this project. */
  turnCount: number
}

const PROJECT_LIMIT = 200

/**
 * Fetch all projects owned by the active user, sorted by updated_at
 * descending. RLS gates the query server-side; the SPA does not need
 * to scope by user id.
 *
 * Joined with a per-project count of assistant-role messages so the
 * dashboard rows can render the "X turns" annotation without a
 * second round trip per row.
 */
export function useProjects() {
  return useQuery<ProjectListEntry[]>({
    queryKey: ['projects', 'list'],
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from('projects')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(PROJECT_LIMIT)
      if (error) throw error
      const projects = (rows ?? []) as ProjectRow[]
      if (projects.length === 0) return []

      const ids = projects.map((p) => p.id)
      const { data: messageRows, error: msgError } = await supabase
        .from('messages')
        .select('project_id')
        .eq('role', 'assistant')
        .in('project_id', ids)
      if (msgError) throw msgError

      const counts = new Map<string, number>()
      for (const row of messageRows ?? []) {
        const pid = (row as { project_id: string }).project_id
        counts.set(pid, (counts.get(pid) ?? 0) + 1)
      }

      // Only surface projects whose first chat turn has landed. A row
      // exists in `projects` from the moment the wizard submits, but
      // until the first-turn priming commits the assistant message
      // there is nothing to show — the user hasn't really started
      // yet. Filtering here keeps the dashboard honest and quietly
      // hides orphans left behind when priming fails.
      return projects
        .map((p) => ({ ...p, turnCount: counts.get(p.id) ?? 0 }))
        .filter((p) => p.turnCount > 0)
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })
}
