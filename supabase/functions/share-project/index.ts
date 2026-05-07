// ───────────────────────────────────────────────────────────────────────
// Phase 13 Week 3 — share-project Edge Function
//
// "B1 ship-without-email" invite-claim endpoint. The project owner
// generated a project_members row in advance (via Wizard or Result-
// page action) carrying an invite_token + role_in_project='designer'
// and user_id=NULL. The owner then copy-paste-shares the URL
//
//   /architect/accept?token=<invite_token>
//
// with the architect, who signs into their own account, lands on the
// SPA /architect/accept route, and the SPA POSTs here with the token.
// We:
//
//   1. Auth-check the caller (Bearer + supabase.auth.getUser).
//   2. Verify the caller's profiles.role === 'designer' — clients
//      cannot claim architect mandates.
//   3. Look up the unclaimed project_members row by invite_token.
//   4. Atomically UPDATE it (user_id = caller, accepted_at = now())
//      using a service-role client. RLS on project_members
//      ("member accepts invite") only permits UPDATEs where
//      user_id = auth.uid(); the row's user_id is still NULL at this
//      moment, so a user-scoped UPDATE would no-op. Service role is
//      used deliberately here for the claim, after the role check
//      above runs against the caller's RLS-scoped session.
//   5. Log to event_log with name='project_member.accepted'.
//
// Idempotent: if the row's user_id is already the caller and
// accepted_at is set, return ok with the existing project_id
// (re-clicks during a refresh storm don't double-fail).
//
// Request:
//   POST /functions/v1/share-project
//   Headers: Authorization: Bearer <session.access_token>
//   Body:    { "inviteToken": "<uuid>" }
//
// Response 200:
//   { "ok": true, "projectId": "<uuid>", "alreadyAccepted": <bool> }
//
// Response 4xx/5xx:
//   { "ok": false, "error": { "code": "...", "message": "..." } }
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
    'Access-Control-Allow-Headers': 'authorization, content-type, apikey',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

Deno.serve(async (req: Request) => {
  const corsHeaders = buildCorsHeaders(req.headers.get('Origin'))
  const requestId = crypto.randomUUID()

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return jsonError(
      { code: 'validation', message: 'POST required' },
      405,
      corsHeaders,
      requestId,
    )
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return jsonError(
      { code: 'unauthenticated', message: 'Missing bearer token' },
      401,
      corsHeaders,
      requestId,
    )
  }

  let body: { inviteToken?: string }
  try {
    body = await req.json()
  } catch {
    return jsonError(
      { code: 'validation', message: 'Invalid JSON' },
      400,
      corsHeaders,
      requestId,
    )
  }
  if (typeof body.inviteToken !== 'string' || !UUID_RE.test(body.inviteToken)) {
    return jsonError(
      { code: 'validation', message: 'inviteToken must be a UUID' },
      400,
      corsHeaders,
      requestId,
    )
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return jsonError(
      { code: 'internal', message: 'Missing env' },
      500,
      corsHeaders,
      requestId,
    )
  }

  // Caller-scoped client — RLS reads profiles.role for the actual
  // signed-in user only.
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: userData, error: userErr } = await userClient.auth.getUser()
  if (userErr || !userData?.user) {
    return jsonError(
      { code: 'unauthenticated', message: 'Invalid session' },
      401,
      corsHeaders,
      requestId,
    )
  }

  const { data: profile } = await userClient
    .from('profiles')
    .select('role')
    .eq('id', userData.user.id)
    .maybeSingle()
  if (profile?.role !== 'designer') {
    return jsonError(
      {
        code: 'forbidden',
        message: 'Only profiles with role=designer can claim architect invites.',
      },
      403,
      corsHeaders,
      requestId,
    )
  }

  // Service-role client — bypasses the project_members "member accepts
  // invite" RLS so the claim can flip user_id=NULL → auth.uid().
  const serviceClient = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // Look up the row by invite_token.
  const { data: row, error: lookupErr } = await serviceClient
    .from('project_members')
    .select('id, project_id, user_id, accepted_at, role_in_project')
    .eq('invite_token', body.inviteToken)
    .maybeSingle()

  if (lookupErr) {
    return jsonError(
      { code: 'persistence_failed', message: lookupErr.message },
      500,
      corsHeaders,
      requestId,
    )
  }
  if (!row) {
    return jsonError(
      { code: 'not_found', message: 'Invite token not recognised.' },
      404,
      corsHeaders,
      requestId,
    )
  }
  if (row.role_in_project !== 'designer') {
    return jsonError(
      { code: 'forbidden', message: 'Invite is not for an architect role.' },
      403,
      corsHeaders,
      requestId,
    )
  }

  // Idempotency: if already accepted by this same user, succeed.
  if (row.user_id && row.accepted_at) {
    if (row.user_id === userData.user.id) {
      return jsonOk(
        { projectId: row.project_id, alreadyAccepted: true },
        corsHeaders,
        requestId,
      )
    }
    return jsonError(
      { code: 'forbidden', message: 'Invite already claimed by another account.' },
      403,
      corsHeaders,
      requestId,
    )
  }

  // Atomic claim. Guard with WHERE user_id IS NULL so two concurrent
  // claims race-safe — only one wins.
  const now = new Date().toISOString()
  const { data: updated, error: updErr } = await serviceClient
    .from('project_members')
    .update({ user_id: userData.user.id, accepted_at: now })
    .eq('id', row.id)
    .is('user_id', null)
    .select('id, project_id')
    .maybeSingle()

  if (updErr) {
    return jsonError(
      { code: 'persistence_failed', message: updErr.message },
      500,
      corsHeaders,
      requestId,
    )
  }
  if (!updated) {
    // Lost the race — re-fetch to give a precise error.
    const { data: fresh } = await serviceClient
      .from('project_members')
      .select('user_id')
      .eq('id', row.id)
      .maybeSingle()
    if (fresh?.user_id === userData.user.id) {
      return jsonOk(
        { projectId: row.project_id, alreadyAccepted: true },
        corsHeaders,
        requestId,
      )
    }
    return jsonError(
      { code: 'forbidden', message: 'Invite already claimed by another account.' },
      403,
      corsHeaders,
      requestId,
    )
  }

  // Best-effort observability event. Use service role since event_log
  // RLS scopes inserts to user_id=auth.uid() and we want the row
  // attributed to the architect anyway.
  void serviceClient
    .from('event_log')
    .insert({
      session_id: requestId,
      user_id: userData.user.id,
      project_id: updated.project_id,
      source: 'system',
      name: 'project_member.accepted',
      attributes: {
        membership_id: updated.id,
        role_in_project: 'designer',
      },
      client_ts: now,
      trace_id: null,
    })
    .then(({ error }) => {
      if (error) {
        console.warn(
          `[share-project] [${requestId}] event_log insert failed: ${error.message}`,
        )
      }
    })

  return jsonOk(
    { projectId: updated.project_id, alreadyAccepted: false },
    corsHeaders,
    requestId,
  )
})

function jsonOk(
  payload: { projectId: string; alreadyAccepted: boolean },
  corsHeaders: Record<string, string>,
  requestId: string,
): Response {
  return new Response(
    JSON.stringify({ ok: true, ...payload, requestId }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    },
  )
}

function jsonError(
  error: { code: string; message: string },
  status: number,
  corsHeaders: Record<string, string>,
  requestId: string,
): Response {
  return new Response(
    JSON.stringify({ ok: false, error, requestId }),
    {
      status,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    },
  )
}
