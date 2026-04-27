import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { ProjectRow } from '@/types/db'

/**
 * Fetch a single project row. RLS gates the query — if the caller
 * doesn't own the project the result is `null`, identical to "not
 * found". ProjectGuard collapses both into a calm 404.
 *
 * staleTime is 60s; we don't refetch on window focus because the
 * Edge Function is the only meaningful writer in v1 and it returns
 * the new state inline (cache is updated optimistically by useChatTurn).
 */
export function useProject(projectId: string) {
  return useQuery<ProjectRow | null>({
    queryKey: ['project', projectId],
    queryFn: async () => {
      if (!projectId) return null
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .maybeSingle()
      if (error) throw error
      return (data as ProjectRow | null) ?? null
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    enabled: !!projectId,
  })
}
