// ───────────────────────────────────────────────────────────────────────
// Phase 13 Week 3 — verify-fact Edge Function
//
// Architect-only qualifier flip from DESIGNER+ASSUMED →
// DESIGNER+VERIFIED on a single project_state entry. Counterpart to
// the chat-turn write-gate: clients can never set DESIGNER+VERIFIED
// (the gate downgrades / rejects); architects use this endpoint to
// authoritatively bless a fact / recommendation / procedure /
// document / role they've inspected in the verification panel.
//
// Authorization model:
//   1. Bearer token + supabase.auth.getUser.
//   2. profiles.role === 'designer' (read via user-scoped client; RLS
//      already grants self-read).
//   3. project_members row exists with this user_id, project_id,
//      accepted_at IS NOT NULL.
//   4. Service-role client mutates projects.state — direct UPDATE
//      because there's no commit_chat_turn-style RPC for ad-hoc
//      qualifier flips and we want the operation atomic w.r.t. a
//      single state row.
//   5. event_log row {name: 'qualifier.verified'} so the 13b
//      telemetry view picks it up alongside the rejected/downgraded
//      events.
//
// Request:
//   POST /functions/v1/verify-fact
//   Body: {
//     "projectId": "<uuid>",
//     "field":  "extracted_fact" | "recommendation" | "procedure"
//             | "document" | "role",
//     "itemId": "<fact.key | rec.id | proc.id | doc.id | role.id>",
//     "note"?: "Architect's own note (verbatim, optional)."
//   }
//
// Response 200: { ok: true, projectId, field, itemId }
// 4xx/5xx:      { ok: false, error: { code, message }, requestId }
// ───────────────────────────────────────────────────────────────────────

import { createClient } from 'npm:@supabase/supabase-js@2'
import type { ProjectState, Qualifier } from '../../../src/types/projectState.ts'

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

type FieldKind = 'extracted_fact' | 'recommendation' | 'procedure' | 'document' | 'role'
const FIELD_KINDS: ReadonlySet<FieldKind> = new Set([
  'extracted_fact',
  'recommendation',
  'procedure',
  'document',
  'role',
])

Deno.serve(async (req: Request) => {
  const corsHeaders = buildCorsHeaders(req.headers.get('Origin'))
  const requestId = crypto.randomUUID()

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return jsonError({ code: 'validation', message: 'POST required' }, 405, corsHeaders, requestId)
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

  let body: {
    projectId?: string
    field?: string
    itemId?: string
    note?: string
    action?: string
    reason?: string
    // v1.0.32 Bug 112 — optional self-attested architect identity, captured
    // on the architect's FIRST verify (VerificationPanel one-time prompt).
    identity?: { name?: string; chamberNo?: string; chamberState?: string }
  }
  try {
    body = await req.json()
  } catch {
    return jsonError({ code: 'validation', message: 'Invalid JSON' }, 400, corsHeaders, requestId)
  }
  if (typeof body.projectId !== 'string' || !UUID_RE.test(body.projectId)) {
    return jsonError(
      { code: 'validation', message: 'projectId must be a UUID' },
      400,
      corsHeaders,
      requestId,
    )
  }
  if (typeof body.field !== 'string' || !FIELD_KINDS.has(body.field as FieldKind)) {
    return jsonError(
      { code: 'validation', message: `field must be one of ${[...FIELD_KINDS].join(', ')}` },
      400,
      corsHeaders,
      requestId,
    )
  }
  if (typeof body.itemId !== 'string' || body.itemId.length === 0 || body.itemId.length > 200) {
    return jsonError(
      { code: 'validation', message: 'itemId must be a non-empty string ≤ 200 chars' },
      400,
      corsHeaders,
      requestId,
    )
  }
  const note =
    typeof body.note === 'string' && body.note.length <= 500 ? body.note : undefined

  // v1.0.32 Bug 112 — self-attested architect identity (optional). Trimmed +
  // length-capped; never hard-fails the request. Recorded exactly once, on the
  // first verify, into project_members + projects.state.verification. The name
  // is the verifying architect's attestation, NOT a chamber audit.
  const identityName =
    typeof body.identity?.name === 'string' ? body.identity.name.trim().slice(0, 120) : ''
  const identityChamberNo =
    typeof body.identity?.chamberNo === 'string'
      ? body.identity.chamberNo.trim().slice(0, 60)
      : ''
  const identityChamberState =
    typeof body.identity?.chamberState === 'string'
      ? body.identity.chamberState.trim().slice(0, 80)
      : ''

  // C8 (Bug 34) — verify | reject discriminator. Default 'verify' for
  // backwards compatibility. Reject downgrades DESIGNER+VERIFIED →
  // DESIGNER+ASSUMED with a required reason and emits qualifier.rejected
  // (already a first-class signal in the qualifier_transitions +
  // qualifier_metrics views, 0027 / 0029). An architect uses this to
  // un-confirm a row they verified by mistake or found wrong later.
  const action: 'verify' | 'reject' = body.action === 'reject' ? 'reject' : 'verify'
  const rejectReason = typeof body.reason === 'string' ? body.reason.trim() : ''
  if (action === 'reject' && rejectReason.length < 5) {
    return jsonError(
      { code: 'validation', message: 'reason must be at least 5 characters for a rejection' },
      400,
      corsHeaders,
      requestId,
    )
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return jsonError({ code: 'internal', message: 'Missing env' }, 500, corsHeaders, requestId)
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

  // Designer + member checks via the user-scoped client (RLS-true).
  const { data: profile } = await userClient
    .from('profiles')
    .select('role')
    .eq('id', userData.user.id)
    .maybeSingle()
  if (profile?.role !== 'designer') {
    return jsonError(
      { code: 'forbidden', message: 'Only role=designer profiles may verify qualifiers.' },
      403,
      corsHeaders,
      requestId,
    )
  }
  const { data: membership } = await userClient
    .from('project_members')
    .select('id, accepted_at')
    .eq('project_id', body.projectId)
    .eq('user_id', userData.user.id)
    .maybeSingle()
  if (!membership || !membership.accepted_at) {
    return jsonError(
      {
        code: 'forbidden',
        message: 'Caller is not an accepted architect on this project.',
      },
      403,
      corsHeaders,
      requestId,
    )
  }

  // Service-role client for the state mutation (RLS bypass).
  const serviceClient = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: project, error: pErr } = await serviceClient
    .from('projects')
    .select('id, state')
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

  const state = project.state as ProjectState | null
  if (!state || typeof state !== 'object') {
    return jsonError(
      { code: 'validation', message: 'Project has no state to verify.' },
      400,
      corsHeaders,
      requestId,
    )
  }

  const now = new Date().toISOString()
  // Reject → DESIGNER+ASSUMED (the row reverts to "Vorläufig" on the owner
  // side); reason is recorded verbatim. No architect display name is
  // fabricated — the authoritative identity is event_log.user_id below.
  const nextQualifier: Qualifier =
    action === 'reject'
      ? {
          source: 'DESIGNER',
          quality: 'ASSUMED',
          setAt: now,
          setBy: 'user',
          reason: `rejected at ${now}: ${rejectReason}`,
        }
      : {
          source: 'DESIGNER',
          quality: 'VERIFIED',
          setAt: now,
          setBy: 'user',
          ...(note ? { reason: note } : {}),
        }

  const next = applyVerification(state, body.field as FieldKind, body.itemId, nextQualifier)
  if (!next) {
    return jsonError(
      { code: 'not_found', message: `${body.field}/${body.itemId} not found in project state.` },
      404,
      corsHeaders,
      requestId,
    )
  }

  // v1.0.32 Bug 112 — stamp the self-attested architect identity into
  // state.verification exactly once (first verify with a name wins; reject and
  // later verifies leave it untouched). Denormalized here so the client PDF
  // export can name the architect without an RLS-blocked profile read.
  const stampIdentity = action === 'verify' && identityName.length > 0 && !next.verification
  if (stampIdentity) {
    next.verification = {
      architectName: identityName,
      ...(identityChamberNo ? { architectChamberNo: identityChamberNo } : {}),
      ...(identityChamberState ? { architectChamberState: identityChamberState } : {}),
      firstVerifiedAt: now,
    }
  }

  const { error: upErr } = await serviceClient
    .from('projects')
    .update({ state: next, updated_at: now })
    .eq('id', body.projectId)
  if (upErr) {
    return jsonError(
      { code: 'persistence_failed', message: upErr.message },
      500,
      corsHeaders,
      requestId,
    )
  }

  // v1.0.32 Bug 112 — mirror the identity into project_members (stable
  // source-of-truth, independent of the mutable state JSONB). Set-once via the
  // architect_name IS NULL guard; fire-and-forget (the state stamp above is the
  // load-bearing write for the PDF).
  if (stampIdentity) {
    void serviceClient
      .from('project_members')
      .update({
        architect_name: identityName,
        architect_chamber_no: identityChamberNo || null,
        architect_chamber_state: identityChamberState || null,
      })
      .eq('id', membership.id)
      .is('architect_name', null)
      .then(({ error }: { error: { message: string } | null }) => {
        if (error) {
          console.warn(
            `[verify-fact] [${requestId}] project_members identity write failed: ${error.message}`,
          )
        }
      })
  }

  void serviceClient
    .from('event_log')
    .insert({
      session_id: requestId,
      user_id: userData.user.id,
      project_id: body.projectId,
      source: 'system',
      name: action === 'reject' ? 'qualifier.rejected' : 'qualifier.verified',
      attributes: {
        field: body.field,
        item_id: body.itemId,
        attempted_source: 'DESIGNER',
        attempted_quality: action === 'reject' ? 'ASSUMED' : 'VERIFIED',
        enforced_source: 'DESIGNER',
        enforced_quality: action === 'reject' ? 'ASSUMED' : 'VERIFIED',
        caller_role: 'designer',
        ...(action === 'reject' ? { reason: rejectReason } : note ? { note } : {}),
      },
      client_ts: now,
      trace_id: null,
    })
    .then(({ error }) => {
      if (error) {
        console.warn(
          `[verify-fact] [${requestId}] event_log insert failed: ${error.message}`,
        )
      }
    })

  return new Response(
    JSON.stringify({
      ok: true,
      projectId: body.projectId,
      field: body.field,
      itemId: body.itemId,
      action,
      verification: next.verification ?? null,
      requestId,
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    },
  )
})

/**
 * Mutate a copy of `state` setting the targeted entry's qualifier to
 * the verified shape. Returns null if no entry matches.
 */
function applyVerification(
  state: ProjectState,
  field: FieldKind,
  itemId: string,
  q: Qualifier,
): ProjectState | null {
  if (field === 'extracted_fact') {
    const idx = (state.facts ?? []).findIndex((f) => f.key === itemId)
    if (idx < 0) return null
    const facts = [...state.facts]
    facts[idx] = { ...facts[idx], qualifier: q }
    return { ...state, facts, lastTurnAt: q.setAt }
  }
  if (field === 'recommendation') {
    const idx = (state.recommendations ?? []).findIndex((r) => r.id === itemId)
    if (idx < 0) return null
    const recs = [...state.recommendations]
    recs[idx] = { ...recs[idx], qualifier: { source: q.source, quality: q.quality } }
    return { ...state, recommendations: recs, lastTurnAt: q.setAt }
  }
  if (field === 'procedure') {
    const idx = (state.procedures ?? []).findIndex((p) => p.id === itemId)
    if (idx < 0) return null
    const procedures = [...state.procedures]
    procedures[idx] = { ...procedures[idx], qualifier: q }
    return { ...state, procedures, lastTurnAt: q.setAt }
  }
  if (field === 'document') {
    const idx = (state.documents ?? []).findIndex((d) => d.id === itemId)
    if (idx < 0) return null
    const documents = [...state.documents]
    documents[idx] = { ...documents[idx], qualifier: q }
    return { ...state, documents, lastTurnAt: q.setAt }
  }
  if (field === 'role') {
    const idx = (state.roles ?? []).findIndex((r) => r.id === itemId)
    if (idx < 0) return null
    const roles = [...state.roles]
    roles[idx] = { ...roles[idx], qualifier: q }
    return { ...state, roles, lastTurnAt: q.setAt }
  }
  return null
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
