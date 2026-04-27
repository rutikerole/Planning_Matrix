import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error(
    [
      'Missing Supabase environment variables.',
      'Required: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
      '',
      'Local dev: copy .env.example → .env.local and fill in real values.',
      'Production: set the same two vars on Vercel (Production + Preview).',
      '',
      'Full instructions: SUPABASE_SETUP.md',
    ].join('\n'),
  )
}

/**
 * Supabase client — module-scope singleton.
 *
 * Instantiated once on first import; never re-created. This avoids the
 * "Multiple GoTrueClient instances" warning and the StrictMode re-mount
 * issues documented in supabase-js#2111.
 *
 * Configuration choices (research-backed, see LANDING_PHASE_2_PLAN
 * comment thread):
 *
 *   • flowType: 'pkce'         — Supabase recommendation for SPAs in
 *                                2026. Auth code lives in ?code= query
 *                                rather than #access_token= hash; safer.
 *   • detectSessionInUrl: true — auto-handles ?code= exchange when the
 *                                user lands on /verify-email or
 *                                /reset-password from an email link.
 *   • persistSession + autoRefreshToken — both default true; explicit
 *                                here for clarity, never for surprise.
 */
export const supabase = createClient(url, anonKey, {
  auth: {
    flowType: 'pkce',
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

export type SupabaseClient = typeof supabase
