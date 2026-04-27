import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

interface SignUpArgs {
  email: string
  password: string
  fullName: string
}

interface SignInArgs {
  email: string
  password: string
}

/**
 * Auth action hook — thin wrapper around supabase.auth methods.
 * Each method returns the raw Supabase response so pages can read
 * `error.code` / `error.status` directly. Pages own loading state.
 *
 * The signOut method also clears TanStack Query cache and resets the
 * zustand auth store, then navigates home — so the user never sees
 * stale protected-page data on log out.
 */
export function useAuth() {
  const { i18n } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { reset } = useAuthStore()

  // Drives the email-template Go-template locale switch
  // (`{{ if eq .Data.locale "de" }}…{{ else }}…{{ end }}`).
  // If this is ever missing, the {{ else }} branch (English) wins
  // silently — see SUPABASE_SETUP.md Step 5. Always set it explicitly.
  const locale: 'de' | 'en' =
    i18n.resolvedLanguage === 'en' ? 'en' : 'de'

  return {
    async signUp({ email, password, fullName }: SignUpArgs) {
      return supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/verify-email`,
          data: {
            full_name: fullName,
            locale,
          },
        },
      })
    },

    async signIn({ email, password }: SignInArgs) {
      return supabase.auth.signInWithPassword({ email, password })
    },

    async signOut() {
      // Default scope is 'global' (logs out every device the user is
      // signed into). For a UI-button log-out we want 'local' only —
      // research note: Supabase's default surprises everyone once.
      await supabase.auth.signOut({ scope: 'local' })
      queryClient.clear()
      reset()
      navigate('/', { replace: true })
    },

    async resetPasswordForEmail(email: string) {
      return supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
    },

    async updatePassword(password: string) {
      return supabase.auth.updateUser({ password })
    },

    async resendConfirmation(email: string) {
      return supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/verify-email`,
        },
      })
    },
  }
}
