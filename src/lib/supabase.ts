import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const ENV_ERROR = [
  'Supabase environment variables are not configured.',
  'Required: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
  '',
  'Local dev: copy .env.example → .env.local and fill real values.',
  'Production: set the same two vars on Vercel (Production + Preview).',
  '',
  'Full instructions: SUPABASE_SETUP.md',
].join('\n')

let _client: SupabaseClient | null = null

function buildClient(): SupabaseClient {
  if (!url || !anonKey) throw new Error(ENV_ERROR)
  return createClient(url, anonKey, {
    auth: {
      flowType: 'pkce',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  })
}

/**
 * Module-scope Supabase client — instantiated lazily on first property
 * access. This lets the rest of the app boot even if env vars aren't
 * wired yet (e.g. before Rutik finishes SUPABASE_SETUP.md), but any
 * auth call still fails loudly with an actionable message.
 *
 * Configuration:
 *   • flowType: 'pkce'         — Supabase recommendation for SPAs in
 *                                2026; auth code in ?code= rather than
 *                                #access_token= hash.
 *   • detectSessionInUrl: true — auto-handles ?code= exchange when
 *                                user lands on /verify-email or
 *                                /reset-password from email link.
 */
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    if (!_client) _client = buildClient()
    return Reflect.get(_client, prop, receiver)
  },
})

/** Cheap runtime check for "is the env configured?" — used by useSession
 *  to avoid throwing during initial mount when env hasn't shipped yet. */
export const isSupabaseConfigured = (): boolean => Boolean(url && anonKey)
