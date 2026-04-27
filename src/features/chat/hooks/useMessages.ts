import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { MessageRow } from '@/types/db'

/**
 * Fetch messages for a project in chronological order. RLS scopes to
 * the owner; if the user doesn't own the project the result is empty.
 *
 * The wizard pre-seeds this cache with the first assistant message
 * before navigation (see useCreateProject), so on a fresh project the
 * first useMessages render hits the cache and the moderator turn
 * appears without a network round-trip.
 */
export function useMessages(projectId: string) {
  return useQuery<MessageRow[]>({
    queryKey: ['messages', projectId],
    queryFn: async () => {
      if (!projectId) return []
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true })
      if (error) throw error
      return (data as MessageRow[]) ?? []
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    enabled: !!projectId,
  })
}
