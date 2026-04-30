// Phase 7 — test-user lifecycle.
//
// Strategy: ONE persistent test user, REUSED across runs. We do NOT
// delete + recreate the user every run because:
//
//   1. Auth user creation churn pollutes auth.users for no benefit.
//   2. The user owns its own RLS-isolated rows; cleanup happens at
//      the project level (delete project → cascade to messages).
//   3. The rate-limit row in chat_turn_rate_limits ages out via the
//      hourly cleanup helper from migration 0008.
//
// Service-role key is used ONLY for the admin operations (create user,
// look up by email). The actual chat-turn calls use the user's JWT,
// so they go through RLS like any real user — that's the point.

import { EVAL_TEST_USER_EMAIL } from './config.mjs'

// ─── Find-or-create the test user via Auth admin API ────────────────────

async function adminFetch(config, path, init = {}) {
  const url = `${config.SUPABASE_URL}/auth/v1/admin${path}`
  const res = await fetch(url, {
    ...init,
    headers: {
      apikey: config.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${config.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  })
  return res
}

async function findUserByEmail(config, email) {
  const params = new URLSearchParams({ email })
  const res = await adminFetch(config, `/users?${params.toString()}`)
  if (!res.ok) {
    throw new Error(`auth admin list-users failed: HTTP ${res.status} ${await res.text()}`)
  }
  const body = await res.json()
  // The admin API may return either { users: [...] } or a paginated shape;
  // be defensive across versions.
  const users = Array.isArray(body?.users) ? body.users : Array.isArray(body) ? body : []
  return users.find((u) => u.email?.toLowerCase() === email.toLowerCase()) ?? null
}

async function createUser(config, email, password) {
  const res = await adminFetch(config, '/users', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password,
      email_confirm: true, // skip the confirmation email — this is a test account
      user_metadata: { eval_harness: true },
    }),
  })
  if (!res.ok) {
    throw new Error(`auth admin create-user failed: HTTP ${res.status} ${await res.text()}`)
  }
  return await res.json()
}

// ─── Sign in with email + password (returns user JWT) ───────────────────

async function signInPassword(config, email, password) {
  const url = `${config.SUPABASE_URL}/auth/v1/token?grant_type=password`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: config.SUPABASE_SERVICE_ROLE_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) {
    throw new Error(`token grant failed: HTTP ${res.status} ${await res.text()}`)
  }
  const body = await res.json()
  if (!body?.access_token || !body?.user?.id) {
    throw new Error('token grant returned no access_token / user.id')
  }
  return { accessToken: body.access_token, userId: body.user.id }
}

// ─── Public — ensureTestUser ────────────────────────────────────────────

export async function ensureTestUser(config) {
  const existing = await findUserByEmail(config, EVAL_TEST_USER_EMAIL)
  if (!existing) {
    await createUser(config, EVAL_TEST_USER_EMAIL, config.EVAL_HARNESS_TEST_USER_PASSWORD)
  }
  // Always sign in to get a fresh JWT regardless of create-vs-existed path.
  const { accessToken, userId } = await signInPassword(
    config,
    EVAL_TEST_USER_EMAIL,
    config.EVAL_HARNESS_TEST_USER_PASSWORD,
  )
  return { accessToken, userId, email: EVAL_TEST_USER_EMAIL }
}
