import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

/**
 * Phase 9.1 — admin detection hook.
 *
 * Calls `public.is_admin_check()` (a thin SECURITY DEFINER wrapper
 * around `logs.is_admin()` added in migration 0019). Returns true
 * when the signed-in user's email is on the admin allowlist
 * (public.admin_users) or in the app.admin_emails GUC; false
 * otherwise (including for anonymous callers).
 *
 * Cached for 5 minutes — admin status doesn't change between login
 * and logout, so re-running the RPC on every page mount is wasteful.
 * Disabled when there's no auth user (anonymous → trivially false,
 * no need to round-trip).
 *
 * Components consuming this hook should render nothing during the
 * initial loading window — buttons that appear-then-disappear are
 * worse UX than a brief render-nothing pause.
 */
export function useIsAdmin() {
  const user = useAuthStore((s) => s.user)
  const isAuthLoading = useAuthStore((s) => s.isLoading)

  const { data, isLoading: queryLoading } = useQuery<boolean>({
    enabled: !!user && !isAuthLoading,
    queryKey: ['is-admin', user?.id ?? 'anon'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('is_admin_check')
      if (error) {
        // Don't crash the page on RPC failure — degrade to "not admin".
        // The error is logged in dev console for the developer to spot.
        if (import.meta.env.DEV) {
          console.warn('[useIsAdmin] is_admin_check failed', error)
        }
        return false
      }
      return Boolean(data)
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })

  return {
    isAdmin: data ?? false,
    // True only while we're actively waiting on a verdict for an
    // authenticated user. Anonymous callers get { isAdmin: false,
    // isLoading: false } immediately so guards can fall through.
    isLoading: !!user && (isAuthLoading || queryLoading),
  }
}
