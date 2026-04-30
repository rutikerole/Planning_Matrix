// Phase 7 — create + delete projects via the user-scoped REST endpoint.
// Calls run with the test user's JWT (not service-role), so RLS gates
// every operation. The Auth user owns the row; deleting it cascades to
// messages and project_events via the FK on delete cascade defined in
// migration 0003.

function restHeaders(config, accessToken) {
  return {
    apikey: config.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  }
}

// ─── Insert a project, return the new row ────────────────────────────────
//
// `ownerId` is REQUIRED — projects.owner_id is `not null` with no default,
// and the RLS insert policy is `with check (auth.uid() = owner_id)`
// (migration 0003). The wizard's useCreateProject.ts sets owner_id
// from the authenticated user's id; the harness mirrors that. Omitting
// owner_id (or passing one that doesn't match auth.uid()) yields HTTP
// 403 with PG error 42501.

export async function createProject(config, accessToken, ownerId, payload) {
  if (!ownerId) throw new Error('createProject: ownerId is required')
  const url = `${config.SUPABASE_URL}/rest/v1/projects`
  const res = await fetch(url, {
    method: 'POST',
    headers: restHeaders(config, accessToken),
    body: JSON.stringify({ owner_id: ownerId, ...payload }),
  })
  if (!res.ok) {
    throw new Error(`createProject failed: HTTP ${res.status} ${await res.text()}`)
  }
  const rows = await res.json()
  const row = Array.isArray(rows) ? rows[0] : rows
  if (!row?.id) throw new Error('createProject returned no id')
  return row
}

// ─── Delete a project; cascades to messages + project_events ────────────

export async function deleteProject(config, accessToken, projectId) {
  const url = `${config.SUPABASE_URL}/rest/v1/projects?id=eq.${projectId}`
  const res = await fetch(url, {
    method: 'DELETE',
    headers: restHeaders(config, accessToken),
  })
  if (!res.ok && res.status !== 404) {
    // 404 is acceptable — already gone. Anything else is a leak.
    throw new Error(`deleteProject failed: HTTP ${res.status} ${await res.text()}`)
  }
}

// ─── Sweep — delete every project owned by the test user ────────────────
//
// Belt + suspenders for runs that crashed mid-flight before per-test
// cleanup ran. Idempotent: a clean state is a no-op.

export async function deleteAllOwnedProjects(config, accessToken, ownerId) {
  const url = `${config.SUPABASE_URL}/rest/v1/projects?owner_id=eq.${ownerId}&select=id`
  const list = await fetch(url, { headers: restHeaders(config, accessToken) })
  if (!list.ok) {
    throw new Error(`list-owned-projects failed: HTTP ${list.status} ${await list.text()}`)
  }
  const rows = await list.json()
  for (const row of rows) {
    await deleteProject(config, accessToken, row.id)
  }
  return rows.length
}
