// ───────────────────────────────────────────────────────────────────────
// Phase 13 Week 3 — share-project Edge Function (v1.0.1 hardened).
//
// Two modes, discriminated by request body shape:
//
//   • CREATE  { action: 'create', projectId: '<uuid>' }
//     v1.0.1 hot-fix (POST_V1_AUDIT CRIT-1). Owner generates an
//     invite for an architect. Explicit ownership check before the
//     INSERT — RLS at 0026 enforces the same predicate, but a code-
//     level check returns the locked 403 copy instead of a generic
//     RLS error. Returns the new invite_token + expires_at + the
//     /architect/accept URL the owner copy-paste-shares.
//
//   • ACCEPT  { inviteToken: '<uuid>' }
//     The architect lands on /architect/accept?token=…, the SPA
//     POSTs here. We:
//       1. Auth-check the caller (Bearer + supabase.auth.getUser).
//       2. Verify profiles.role === 'designer' (POST_V1_AUDIT CRIT-2 —
//          existing check pinned + smokeWalk fixture added).
//       3. Look up the unclaimed project_members row by invite_token.
//       4. Reject if expires_at is in the past (POST_V1_AUDIT CRIT-3
//          — 7-day TTL added in migration 0030).
//       5. Atomically UPDATE (user_id = caller, accepted_at = now())
//          using a service-role client. RLS on project_members
//          ("member accepts invite") only permits UPDATEs where
//          user_id = auth.uid(); the row's user_id is still NULL
//          here, so a user-scoped UPDATE would no-op. Service role
//          is used deliberately AFTER the role check above runs
//          against the caller's RLS-scoped session.
//       6. Log to event_log with name='project_member.accepted'.
//
// Idempotent: re-claim by the same user returns alreadyAccepted=true.
//
// Response 200 (create):
//   { ok: true, inviteToken, expiresAt, acceptUrl, requestId }
// Response 200 (accept):
//   { ok: true, projectId, alreadyAccepted, requestId }
// Response 4xx/5xx (both):
//   { ok: false, error: { code, message }, requestId }
// ───────────────────────────────────────────────────────────────────────

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'

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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type RequestBody =
  | { action: 'create'; projectId: string }
  | { inviteToken: string }

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

  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return jsonError(
      { code: 'validation', message: 'Invalid JSON' },
      400,
      corsHeaders,
      requestId,
    )
  }

  const body = parseBody(raw)
  if (!body) {
    return jsonError(
      {
        code: 'validation',
        message:
          'Body must be either {action:"create", projectId:"<uuid>"} or {inviteToken:"<uuid>"}.',
      },
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

  if ('action' in body) {
    return await handleCreate({
      body,
      userClient,
      userId: userData.user.id,
      corsHeaders,
      requestId,
    })
  }
  return await handleAccept({
    body,
    userClient,
    serviceClient: createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
    userId: userData.user.id,
    corsHeaders,
    requestId,
  })
})

function parseBody(raw: unknown): RequestBody | null {
  if (raw === null || typeof raw !== 'object') return null
  const obj = raw as Record<string, unknown>
  if (
    obj.action === 'create' &&
    typeof obj.projectId === 'string' &&
    UUID_RE.test(obj.projectId)
  ) {
    return { action: 'create', projectId: obj.projectId }
  }
  if (typeof obj.inviteToken === 'string' && UUID_RE.test(obj.inviteToken)) {
    return { inviteToken: obj.inviteToken }
  }
  return null
}

// ── CREATE — owner generates an invite ───────────────────────────────────
async function handleCreate(args: {
  body: { action: 'create'; projectId: string }
  userClient: SupabaseClient
  userId: string
  corsHeaders: Record<string, string>
  requestId: string
}): Promise<Response> {
  const { body, userClient, userId, corsHeaders, requestId } = args

  // POST_V1_AUDIT CRIT-1 — explicit project-ownership check before
  // the INSERT. RLS at 0026:67-78 enforces the same predicate; the
  // code-level check is defense-in-depth + cleaner UX (a structured
  // 403 instead of a generic RLS-deny). The user-scoped client's
  // SELECT also relies on the projects RLS at 0003 (owner-only +
  // 0028 architect-member); only the owner can read their own
  // project here.
  const { data: project, error: pErr } = await userClient
    .from('projects')
    .select('id, owner_id')
    .eq('id', body.projectId)
    .maybeSingle()
  if (pErr) {
    return jsonError(
      { code: 'persistence_failed', message: pErr.message },
      500,
      corsHeaders,
      requestId,
    )
  }
  if (!project) {
    return jsonError(
      { code: 'not_found', message: 'Project not found.' },
      404,
      corsHeaders,
      requestId,
    )
  }
  if (project.owner_id !== userId) {
    return jsonError(
      {
        code: 'forbidden',
        message: 'Only the project owner can create architect invites.',
      },
      403,
      corsHeaders,
      requestId,
    )
  }

  const { data: row, error: insertErr } = await userClient
    .from('project_members')
    .insert({
      project_id: body.projectId,
      role_in_project: 'designer',
    })
    .select('id, invite_token, expires_at')
    .maybeSingle()

  if (insertErr || !row) {
    return jsonError(
      {
        code: 'persistence_failed',
        message: insertErr?.message ?? 'Insert returned no row.',
      },
      500,
      corsHeaders,
      requestId,
    )
  }

  return new Response(
    JSON.stringify({
      ok: true,
      inviteToken: row.invite_token,
      expiresAt: row.expires_at,
      acceptUrl: `${PUBLIC_SITE_URL}/architect/accept?token=${row.invite_token}`,
      requestId,
    }),
    {
      status: 201,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    },
  )
}

// ── ACCEPT — architect claims an invite ──────────────────────────────────
async function handleAccept(args: {
  body: { inviteToken: string }
  userClient: SupabaseClient
  serviceClient: SupabaseClient
  userId: string
  corsHeaders: Record<string, string>
  requestId: string
}): Promise<Response> {
  const { body, userClient, serviceClient, userId, corsHeaders, requestId } = args

  // POST_V1_AUDIT CRIT-2 — designer-role check (existing in v1.0;
  // pinned by smokeWalk drift fixture in v1.0.1).
  const { data: profile } = await userClient
    .from('profiles')
    .select('role')
    .eq('id', userId)
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

  // Look up the row by invite_token via service-role (the unclaimed
  // row has user_id=NULL, which the user-scoped SELECT policy
  // would not return).
  const { data: row, error: lookupErr } = await serviceClient
    .from('project_members')
    .select('id, project_id, user_id, accepted_at, role_in_project, expires_at')
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

  // POST_V1_AUDIT CRIT-3 — TTL enforcement. Migration 0030 default is
  // 7 days from row creation. An expired invite is rejected before
  // any state mutation; the owner can re-issue via the create mode.
  if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) {
    return jsonError(
      {
        code: 'forbidden',
        message: 'Diese Einladung ist abgelaufen. Bitte den Bauherrn um eine neue.',
      },
      403,
      corsHeaders,
      requestId,
    )
  }

  if (row.user_id && row.accepted_at) {
    if (row.user_id === userId) {
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

  const now = new Date().toISOString()
  const { data: updated, error: updErr } = await serviceClient
    .from('project_members')
    .update({ user_id: userId, accepted_at: now })
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
    const { data: fresh } = await serviceClient
      .from('project_members')
      .select('user_id')
      .eq('id', row.id)
      .maybeSingle()
    if (fresh?.user_id === userId) {
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

  void serviceClient
    .from('event_log')
    .insert({
      session_id: requestId,
      user_id: userId,
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
}

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
