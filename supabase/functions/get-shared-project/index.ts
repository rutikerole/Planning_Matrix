// ───────────────────────────────────────────────────────────────────────
// Phase 3.5 #65 — get-shared-project Edge Function
//
// Anon-allowed. Recipient of a share link opens /result/share/:token
// in the browser; the React app calls this function with the token.
// We validate token validity server-side using the SERVICE ROLE
// (bypassing RLS), then return project + messages + events for the
// result page to render.
//
// Read-only. Never returns owner email or any out-of-band PII —
// only the project shape the user already filled in themselves.
//
// Request:
//   POST /functions/v1/get-shared-project
//   Body: { "token": "<64-char-hex>" }
//
// Response 200:
//   { "ok": true, "project": {...}, "messages": [...],
//     "events": [...], "expiresAt": "<ISO>" }
//
// Response 404 on invalid / expired / revoked token.
// ───────────────────────────────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js'

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://planning-matrix.vercel.app',
  'https://planning-matrix.app',
]

function buildCorsHeaders(origin: string | null): Record<string, string> {
  const allow =
    origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Headers': 'content-type, apikey',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}

Deno.serve(async (req: Request) => {
  const corsHeaders = buildCorsHeaders(req.headers.get('Origin'))

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return jsonError({ code: 'validation', message: 'POST required' }, 405, corsHeaders)
  }

  let body: { token?: string }
  try {
    body = await req.json()
  } catch {
    return jsonError({ code: 'validation', message: 'Invalid JSON' }, 400, corsHeaders)
  }
  const token = body.token
  if (!token || typeof token !== 'string' || token.length < 32) {
    return jsonError(
      { code: 'validation', message: 'token required' },
      400,
      corsHeaders,
    )
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceKey) {
    return jsonError({ code: 'internal', message: 'Missing env' }, 500, corsHeaders)
  }

  // Service-role client — bypasses RLS so we can serve anon recipients.
  // Never expose this client beyond the validated-token path below.
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // Validate token: must exist, not be revoked, not be expired.
  const { data: tokenRow, error: tokenErr } = await supabase
    .from('project_share_tokens')
    .select('project_id, expires_at, revoked_at')
    .eq('token', token)
    .maybeSingle()

  if (tokenErr) {
    return jsonError(
      { code: 'persistence_failed', message: tokenErr.message },
      500,
      corsHeaders,
    )
  }
  if (!tokenRow || tokenRow.revoked_at !== null) {
    return jsonError(
      { code: 'not_found', message: 'Share link invalid or revoked' },
      404,
      corsHeaders,
    )
  }
  if (new Date(tokenRow.expires_at).getTime() <= Date.now()) {
    return jsonError(
      { code: 'not_found', message: 'Share link expired' },
      404,
      corsHeaders,
    )
  }

  // Fetch project + messages + events with the service role. No PII
  // beyond what's in the project shape itself.
  const projectId: string = tokenRow.project_id
  const [{ data: project, error: pErr }, { data: messages, error: mErr }, { data: events, error: evErr }] =
    await Promise.all([
      supabase.from('projects').select('*').eq('id', projectId).maybeSingle(),
      supabase
        .from('messages')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true })
        .limit(60),
      supabase
        .from('project_events')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(30),
    ])

  if (pErr || mErr || evErr) {
    return jsonError(
      {
        code: 'persistence_failed',
        message: pErr?.message ?? mErr?.message ?? evErr?.message ?? 'unknown',
      },
      500,
      corsHeaders,
    )
  }
  if (!project) {
    return jsonError(
      { code: 'not_found', message: 'Project no longer available' },
      404,
      corsHeaders,
    )
  }

  return new Response(
    JSON.stringify({
      ok: true,
      project,
      messages: messages ?? [],
      events: events ?? [],
      expiresAt: tokenRow.expires_at,
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, max-age=60',
        ...corsHeaders,
      },
    },
  )
})

function jsonError(
  error: { code: string; message: string },
  status: number,
  corsHeaders: Record<string, string>,
): Response {
  return new Response(JSON.stringify({ ok: false, error }), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}
