import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

/**
 * Phase 13 Week 2 — designer detection hook.
 *
 * Reads `public.profiles.role` for the signed-in user. Returns true
 * when the role is exactly `'designer'`; false for clients, engineers,
 * authorities, and anonymous callers. Mirrors the useIsAdmin pattern
 * from Phase 9.1: 5-min stale time, no refetch on focus/reconnect,
 * disabled when there is no auth user.
 *
 * The /architect route + the architect dashboard nav use this gate.
 * The Edge Function (chat-turn/index.ts) does its own server-side
 * check (qualifier-write-gate), so this hook is purely cosmetic; it
 * just hides UI surfaces from non-designers. RLS on profiles allows
 * the user to read their own row, so no SECURITY DEFINER wrapper is
 * required (unlike useIsAdmin).
 *
 * Components consuming this hook should render nothing during the
 * initial loading window.
 */
export function useIsDesigner() {
  const user = useAuthStore((s) => s.user)
  const isAuthLoading = useAuthStore((s) => s.isLoading)

  const { data, isLoading: queryLoading } = useQuery<boolean>({
    enabled: !!user && !isAuthLoading,
    queryKey: ['is-designer', user?.id ?? 'anon'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user!.id)
        .maybeSingle()
      if (error) {
        if (import.meta.env.DEV) {
          console.warn('[useIsDesigner] profiles read failed', error)
        }
        return false
      }
      return data?.role === 'designer'
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })

  return {
    isDesigner: data ?? false,
    isLoading: !!user && (isAuthLoading || queryLoading),
  }
}
