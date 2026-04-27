// ───────────────────────────────────────────────────────────────────────
// Phase 3 Edge Function — chat-turn
//
// One round-trip per conversation turn:
//   SPA  →  here  →  Anthropic Messages API  →
//                    persist user + assistant rows + state delta  →
//                    return to SPA.
//
// This file is the request entrypoint and CORS / auth gate. The heavy
// lifting lands incrementally:
//   • commit 4 — systemPrompt.ts + toolSchema.ts (data)
//   • commit 5 — anthropic.ts (the SDK call, cache, AbortController)
//   • commit 6 — persistence.ts (DB transaction, idempotency)
//   • commit 7 — error envelope, retry-once-on-malformed, idempotency
//
// Security model
//   • verify_jwt = true (supabase/config.toml) means the platform has
//     already validated the session before our code runs.
//   • We build a per-request Supabase client with the user's bearer
//     token so every downstream query runs as that user. RLS is the
//     only authorisation boundary. The service-role key is deliberately
//     out of scope.
// ───────────────────────────────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js'
import { buildCorsHeaders } from './cors.ts'

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('Origin')
  const corsHeaders = buildCorsHeaders(origin)

  // CORS preflight — short-circuit with 204 + headers.
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse(
      { ok: false, error: { code: 'validation', message: 'POST required' } },
      405,
      corsHeaders,
    )
  }

  // Bearer-token extraction. Platform has gated; we still need the
  // token to scope the Supabase client to this caller.
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return jsonResponse(
      { ok: false, error: { code: 'unauthenticated', message: 'Missing bearer token' } },
      401,
      corsHeaders,
    )
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  if (!supabaseUrl || !anonKey) {
    // Platform misconfiguration — these are auto-injected on Supabase,
    // so this only fires locally if `supabase functions serve` was
    // launched without `supabase start` first.
    return jsonResponse(
      { ok: false, error: { code: 'internal', message: 'SUPABASE_URL / SUPABASE_ANON_KEY missing in function env' } },
      500,
      corsHeaders,
    )
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // Cheap session sanity check (~5ms). Confirms the JWT identifies a
  // user; also gives us user.id without parsing the token ourselves.
  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData?.user) {
    return jsonResponse(
      { ok: false, error: { code: 'unauthenticated', message: 'Invalid session' } },
      401,
      corsHeaders,
    )
  }

  // Stub — wired in commits 5–7. Suppress unused-var until then.
  void supabase
  return jsonResponse(
    {
      ok: false,
      error: {
        code: 'internal',
        message: 'chat-turn handler is not yet wired (commit 3 scaffold). Anthropic call lands in commit 5; persistence in commit 6.',
      },
    },
    501,
    corsHeaders,
  )
})

function jsonResponse(
  body: unknown,
  status: number,
  corsHeaders: Record<string, string>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}
