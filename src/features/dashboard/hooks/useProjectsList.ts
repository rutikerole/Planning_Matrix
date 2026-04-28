import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { ProjectRow } from '@/types/db'

export interface ProjectListEntry extends ProjectRow {
  /** Count of assistant turns associated with this project (Wendungen). */
  turnCount: number
}

const PROJECT_LIMIT = 50

/**
 * Phase 3.3 #47 — fetch all projects owned by the active user, sorted
 * by `updated_at DESC`. RLS gates the query so passing the user id is
 * not strictly required — the policy enforces ownership server-side.
 *
 * Joined with a per-project count of `assistant`-role messages so the
 * dashboard can print the "X Wendungen" annotation alongside the last
 * activity timestamp without a second round trip from each row.
 *
 * Cap at 50 visible projects; pagination is a Phase 4 concern.
 */
export function useProjectsList() {
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

      // Tally assistant turns per project. RLS lets a user only see
      // messages on projects they own, so a single IN-clause works.
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

      return projects.map((p) => ({ ...p, turnCount: counts.get(p.id) ?? 0 }))
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })
}
