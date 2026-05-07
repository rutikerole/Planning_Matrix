// ───────────────────────────────────────────────────────────────────────
// Phase 3.5 #65 — create-share-token Edge Function
//
// Authenticated. Owner of the project generates a 30-day read-only
// share token. Returns the token + the public URL the recipient
// opens. Validates ownership server-side via the same RLS-scoped
// supabase client pattern as chat-turn.
//
// Request:
//   POST /functions/v1/create-share-token
//   Headers: Authorization: Bearer <session.access_token>
//            Content-Type: application/json
//   Body: { "projectId": "<uuid>", "expiryDays"?: 30 }
//
// Response 201:
//   { "ok": true, "token": "<64-char-hex>",
//     "url": "<public-site>/result/share/<token>",
//     "expiresAt": "<ISO-8601>" }
//
// Response 4xx/5xx:
//   { "ok": false, "error": { "code": "...", "message": "..." } }
// ───────────────────────────────────────────────────────────────────────

import { createClient } from 'npm:@supabase/supabase-js@2'

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
    'Access-Control-Allow-Headers': 'authorization, content-type, apikey',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}

const PUBLIC_SITE_URL =
  Deno.env.get('PUBLIC_SITE_URL') ?? 'https://planning-matrix.vercel.app'

Deno.serve(async (req: Request) => {
  const corsHeaders = buildCorsHeaders(req.headers.get('Origin'))

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return jsonError({ code: 'validation', message: 'POST required' }, 405, corsHeaders)
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return jsonError(
      { code: 'unauthenticated', message: 'Missing bearer token' },
      401,
      corsHeaders,
    )
  }

  let body: { projectId?: string; expiryDays?: number }
  try {
    body = await req.json()
  } catch {
    return jsonError({ code: 'validation', message: 'Invalid JSON' }, 400, corsHeaders)
  }
  if (!body.projectId || typeof body.projectId !== 'string') {
    return jsonError(
      { code: 'validation', message: 'projectId required' },
      400,
      corsHeaders,
    )
  }
  const expiryDays =
    typeof body.expiryDays === 'number' &&
    body.expiryDays > 0 &&
    body.expiryDays <= 365
      ? body.expiryDays
      : 30

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  if (!supabaseUrl || !anonKey) {
    return jsonError({ code: 'internal', message: 'Missing env' }, 500, corsHeaders)
  }

  // RLS-scoped client — RLS gates the project ownership check.
  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData?.user) {
    return jsonError(
      { code: 'unauthenticated', message: 'Invalid session' },
      401,
      corsHeaders,
    )
  }

  // Verify the user can see the project (RLS implicit).
  const { data: project, error: pErr } = await supabase
    .from('projects')
    .select('id, owner_id')
    .eq('id', body.projectId)
    .maybeSingle()

  if (pErr) {
    return jsonError(
      { code: 'persistence_failed', message: pErr.message },
      500,
      corsHeaders,
    )
  }
  if (!project || project.owner_id !== userData.user.id) {
    return jsonError(
      { code: 'not_found', message: 'Project not found' },
      404,
      corsHeaders,
    )
  }

  // Generate a 32-byte random token, hex-encoded.
  const tokenBytes = new Uint8Array(32)
  crypto.getRandomValues(tokenBytes)
  const token = Array.from(tokenBytes, (b) => b.toString(16).padStart(2, '0')).join(
    '',
  )

  const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000)

  const { error: insertErr } = await supabase
    .from('project_share_tokens')
    .insert({
      project_id: body.projectId,
      token,
      created_by: userData.user.id,
      expires_at: expiresAt.toISOString(),
    })

  if (insertErr) {
    return jsonError(
      { code: 'persistence_failed', message: insertErr.message },
      500,
      corsHeaders,
    )
  }

  return new Response(
    JSON.stringify({
      ok: true,
      token,
      url: `${PUBLIC_SITE_URL}/result/share/${token}`,
      expiresAt: expiresAt.toISOString(),
    }),
    {
      status: 201,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
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
