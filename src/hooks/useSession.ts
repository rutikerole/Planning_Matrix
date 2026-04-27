import { useEffect } from 'react'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { useAuthStore, type Profile } from '@/stores/authStore'

/**
 * Single source of truth for auth session.
 * Mount once at the app root (inside <Providers>). On mount it:
 *   • subscribes to supabase.auth.onAuthStateChange
 *   • hydrates the auth store with INITIAL_SESSION result
 *   • re-fetches profile when the user changes
 *   • cleans the listener up on unmount
 *
 * If env vars aren't wired (Rutik hasn't finished SUPABASE_SETUP.md
 * yet), this no-ops cleanly: store stays user=null, isLoading=false,
 * the landing page renders normally, and any auth call throws a clear
 * "env not configured" error.
 */
export function useSession(): void {
  const { setUser, setProfile, setLoading, reset } = useAuthStore()

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      // Treat as logged-out; resolve loading so ProtectedRoute can decide.
      setLoading(false)
      return
    }

    let mounted = true

    const fetchProfile = async (userId: string) => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()
      if (!mounted) return
      if (error) {
        // Don't crash the app if the profile row is missing or RLS
        // misbehaves. Auth still works on `user` alone.
        console.warn('[auth] failed to load profile:', error.message)
        setProfile(null)
        return
      }
      setProfile((data as Profile | null) ?? null)
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return

      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
        if (session?.user) {
          setUser(session.user)
          void fetchProfile(session.user.id)
        } else {
          setUser(null)
          setProfile(null)
        }
        setLoading(false)
        return
      }

      if (event === 'SIGNED_OUT') {
        reset()
        return
      }

      if (event === 'USER_UPDATED' && session?.user) {
        setUser(session.user)
        void fetchProfile(session.user.id)
        return
      }

      if (event === 'PASSWORD_RECOVERY') {
        // The reset-password page is the consumer; don't redirect here.
        if (session?.user) setUser(session.user)
        setLoading(false)
        return
      }

      // TOKEN_REFRESHED + everything else → ignored. Supabase already
      // updates session storage; we have what we need.
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [reset, setLoading, setProfile, setUser])
}
