import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

/**
 * C8 (Bug 32) — make the owner result page react to architect
 * verification (verify-fact / reject-fact mutate projects.state) without
 * a hard page reload, so the per-item + aggregate "Vorläufig" footers
 * clear/revert live.
 *
 * Deliberately scoped to the result page rather than changing
 * useProject() globally: that hook is shared with the chat surface and
 * intentionally has refetchOnWindowFocus:false (the chat-turn Edge
 * Function is its only writer + updates the cache optimistically). The
 * architect is a SECOND writer the owner page must observe; this hook
 * invalidates ['project', projectId] so useProject refetches.
 *
 * PRIMARY (zero-infra, always on): invalidate on window focus — returning
 * to the tab after the architect verifies re-derives the footers. Fully
 * functional with no migration.
 *
 * SECONDARY (best-effort): a Supabase Realtime channel on projects UPDATE
 * for instant updates while the tab is focused. Degrades SILENTLY if the
 * projects table isn't in the supabase_realtime publication (migration
 * 0035, manual apply) — the focus-poll above still carries reactivity.
 */
export function useVerificationReactivity(projectId: string | undefined): void {
  const queryClient = useQueryClient()

  // PRIMARY — focus-poll.
  useEffect(() => {
    if (!projectId) return
    const invalidate = (): void => {
      void queryClient.invalidateQueries({ queryKey: ['project', projectId] })
    }
    window.addEventListener('focus', invalidate)
    return () => window.removeEventListener('focus', invalidate)
  }, [projectId, queryClient])

  // SECONDARY — best-effort realtime (silent degrade if unpublished).
  useEffect(() => {
    if (!projectId) return
    let channel: ReturnType<typeof supabase.channel> | null = null
    try {
      channel = supabase
        .channel(`result-verify-${projectId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'projects',
            filter: `id=eq.${projectId}`,
          },
          () => {
            void queryClient.invalidateQueries({
              queryKey: ['project', projectId],
            })
          },
        )
        .subscribe()
    } catch {
      // Realtime not configured — focus-poll covers reactivity.
      channel = null
    }
    return () => {
      if (channel) void supabase.removeChannel(channel)
    }
  }, [projectId, queryClient])
}
