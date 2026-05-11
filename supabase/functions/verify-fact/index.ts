// ───────────────────────────────────────────────────────────────────────
// Phase 13 Week 3 — verify-fact Edge Function
// v1.0.6 Phase A — optimistic-lock against POST_V1_AUDIT C1 race.
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
// Optimistic concurrency (v1.0.6 Phase A):
//   The SPA sends `expectedStateVersion` (the version it observed in
//   its last project read). The UPDATE runs WHERE id = $id AND
//   state_version = $expected. If rowcount = 0 (someone else mutated
//   state between the SPA's read and this write — concurrent verify,
//   concurrent SuggestionCard add, or concurrent chat-turn), we return
//   409 conflict with the current state_version and a `state.conflict`
//   event_log row. The SPA refetches and shows a DE+EN toast.
//
//   Backward compat: `expectedStateVersion` is OPTIONAL. When absent,
//   the call falls back to the legacy non-locking UPDATE and emits a
//   `verify-fact.legacy_no_version` warning to event_log so v1.0.7 can
//   gate-flip once telemetry confirms 100% of clients send it. This
//   keeps the rollout safe — old SPA build calling new Edge Function
//   does not break; only race protection degrades.
//
// Request:
//   POST /functions/v1/verify-fact
//   Body: {
//     "projectId": "<uuid>",
//     "field":  "extracted_fact" | "recommendation" | "procedure"
//             | "document" | "role",
//     "itemId": "<fact.key | rec.id | proc.id | doc.id | role.id>",
//     "expectedStateVersion"?: <number — projects.state_version>,
//     "note"?: "Architect's own note (verbatim, optional)."
//   }
//
// Response 200: { ok: true, projectId, field, itemId, stateVersion }
// 409 conflict: { ok: false, error: { code: 'state_conflict', ... },
//                 currentStateVersion, requestId }
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
    expectedStateVersion?: number
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
  // Optional: expectedStateVersion. When present must be a non-negative
  // safe integer; when absent we fall back to legacy non-locking
  // behavior + emit a warning event for v1.0.7 deprecation telemetry.
  let expectedStateVersion: number | null = null
  if (body.expectedStateVersion !== undefined) {
    if (
      typeof body.expectedStateVersion !== 'number' ||
      !Number.isInteger(body.expectedStateVersion) ||
      body.expectedStateVersion < 0 ||
      body.expectedStateVersion > Number.MAX_SAFE_INTEGER
    ) {
      return jsonError(
        {
          code: 'validation',
          message: 'expectedStateVersion must be a non-negative safe integer',
        },
        400,
        corsHeaders,
        requestId,
      )
    }
    expectedStateVersion = body.expectedStateVersion
  }
  const note =
    typeof body.note === 'string' && body.note.length <= 500 ? body.note : undefined

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
    .select('id, state, state_version')
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
  const currentStateVersion = (project as { state_version?: number }).state_version ?? 0

  // Early 409 — pre-UPDATE check. If the SPA's expected version is
  // already stale relative to what we just read, no point firing the
  // UPDATE: emit state.conflict and return immediately.
  if (
    expectedStateVersion !== null &&
    expectedStateVersion !== currentStateVersion
  ) {
    void emitStateConflict(serviceClient, {
      requestId,
      userId: userData.user.id,
      projectId: body.projectId,
      field: body.field,
      itemId: body.itemId,
      expectedStateVersion,
      currentStateVersion,
      reason: 'pre_update_version_mismatch',
    })
    return jsonError(
      {
        code: 'state_conflict',
        message:
          'Project state has been modified by another caller. Please refetch and retry.',
      },
      409,
      corsHeaders,
      requestId,
      { currentStateVersion },
    )
  }

  const now = new Date().toISOString()
  const verifiedQualifier: Qualifier = {
    source: 'DESIGNER',
    quality: 'VERIFIED',
    setAt: now,
    setBy: 'user',
    ...(note ? { reason: note } : {}),
  }

  const next = applyVerification(state, body.field as FieldKind, body.itemId, verifiedQualifier)
  if (!next) {
    return jsonError(
      { code: 'not_found', message: `${body.field}/${body.itemId} not found in project state.` },
      404,
      corsHeaders,
      requestId,
    )
  }

  // Optimistic-lock UPDATE. The .eq('state_version', currentStateVersion)
  // predicate is the race fix: if a concurrent writer (another verify,
  // a SuggestionCard add, or a chat-turn commit) lands between our
  // SELECT and UPDATE, the BEFORE-UPDATE trigger from migration 0033
  // has already incremented state_version and our predicate fails;
  // .select() returns zero rows and we emit state.conflict + 409.
  // The legacy fall-back path (no expectedStateVersion sent) STILL
  // uses currentStateVersion as the predicate so both paths benefit
  // from the in-Edge race window protection — only the SPA-vs-server
  // race window stays open for legacy callers.
  const { data: updatedRows, error: upErr } = await serviceClient
    .from('projects')
    .update({ state: next, updated_at: now })
    .eq('id', body.projectId)
    .eq('state_version', currentStateVersion)
    .select('id, state_version')
  if (upErr) {
    return jsonError(
      { code: 'persistence_failed', message: upErr.message },
      500,
      corsHeaders,
      requestId,
    )
  }
  if (!updatedRows || updatedRows.length === 0) {
    // Race lost — re-read the current version for the conflict response.
    const { data: latest } = await serviceClient
      .from('projects')
      .select('state_version')
      .eq('id', body.projectId)
      .maybeSingle()
    const latestVersion =
      (latest as { state_version?: number } | null)?.state_version ?? currentStateVersion
    void emitStateConflict(serviceClient, {
      requestId,
      userId: userData.user.id,
      projectId: body.projectId,
      field: body.field,
      itemId: body.itemId,
      expectedStateVersion: expectedStateVersion ?? currentStateVersion,
      currentStateVersion: latestVersion,
      reason: 'update_predicate_failed',
    })
    return jsonError(
      {
        code: 'state_conflict',
        message:
          'Project state has been modified by another caller. Please refetch and retry.',
      },
      409,
      corsHeaders,
      requestId,
      { currentStateVersion: latestVersion },
    )
  }
  const newStateVersion =
    (updatedRows[0] as { state_version?: number }).state_version ?? currentStateVersion + 1

  // Legacy-call telemetry: emit a deprecation warning when the SPA
  // didn't send expectedStateVersion. After v1.0.6 deploy we expect
  // this counter to drop to zero; v1.0.7 flips the field to required.
  if (expectedStateVersion === null) {
    void serviceClient
      .from('event_log')
      .insert({
        session_id: requestId,
        user_id: userData.user.id,
        project_id: body.projectId,
        source: 'system',
        name: 'verify-fact.legacy_no_version',
        attributes: {
          field: body.field,
          item_id: body.itemId,
          assumed_version: currentStateVersion,
        },
        client_ts: now,
        trace_id: null,
      })
      .then(({ error }) => {
        if (error) {
          console.warn(
            `[verify-fact] [${requestId}] legacy-call event_log insert failed: ${error.message}`,
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
      name: 'qualifier.verified',
      attributes: {
        field: body.field,
        item_id: body.itemId,
        attempted_source: 'DESIGNER',
        attempted_quality: 'VERIFIED',
        enforced_source: 'DESIGNER',
        enforced_quality: 'VERIFIED',
        caller_role: 'designer',
        ...(note ? { note } : {}),
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
      stateVersion: newStateVersion,
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
  extra?: Record<string, unknown>,
): Response {
  return new Response(
    JSON.stringify({ ok: false, error, requestId, ...(extra ?? {}) }),
    {
      status,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    },
  )
}

/**
 * Best-effort `state.conflict` event_log emit. Voided so the caller
 * can fire-and-forget — the 409 response is the contract; the event is
 * for telemetry only and must never affect user-visible behavior on
 * insert failure (mirrors qualifier.protect's warn-and-continue).
 */
async function emitStateConflict(
  serviceClient: ReturnType<typeof createClient>,
  args: {
    requestId: string
    userId: string
    projectId: string
    field: string
    itemId: string
    expectedStateVersion: number
    currentStateVersion: number
    reason: 'pre_update_version_mismatch' | 'update_predicate_failed'
  },
): Promise<void> {
  const { error } = await serviceClient.from('event_log').insert({
    session_id: args.requestId,
    user_id: args.userId,
    project_id: args.projectId,
    source: 'system',
    name: 'state.conflict',
    attributes: {
      field: args.field,
      item_id: args.itemId,
      expected_state_version: args.expectedStateVersion,
      current_state_version: args.currentStateVersion,
      reason: args.reason,
    },
    client_ts: new Date().toISOString(),
    trace_id: null,
  })
  if (error) {
    console.warn(
      `[verify-fact] [${args.requestId}] state.conflict event_log insert failed: ${error.message}`,
    )
  }
}
