#!/usr/bin/env node
// ───────────────────────────────────────────────────────────────────────
// v1.0.8 W1 — Architect verification flow end-to-end smoke harness.
//
// Phase 13 shipped the DESIGNER role + verify-fact / share-project
// Edge Functions + VerificationPanel UI + qualifier-write gate, but
// none of it has ever been exercised end-to-end against the live
// deployment (per DELIVERABLE_GAP_AUDIT.md). This harness closes
// that gap: a single command runs the seven phases of the architect
// flow against live production and asserts each one's invariants.
//
// What the harness does NOT do:
//   - Run automatically as part of `npm run build` or `smoke:citations`.
//     Both daily gates are static and free; this harness mutates live
//     DB rows and (transitively, via the chat-turn pipeline if you
//     extend it) costs Anthropic tokens. It is operator-triggered.
//   - Mint user JWTs for you. You provide both BAUHERR_TEST_JWT and
//     DESIGNER_TEST_JWT as env vars (most operators copy them out of
//     DevTools → Network → Authorization header after signing into
//     planning-matrix.vercel.app under each account).
//   - Create a Hessen project from scratch. You must have at least
//     one project in public.projects with bundesland='hessen' (the
//     harness picks the most recent matching row owned by the
//     Bauherr account). The wizard's Bundesland dropdown (v1.0.6
//     Bug 0) is the supported way to create one.
//
// Phases:
//   1. SETUP                   — env validate + service-role probe
//   2. PICK PROJECT            — find Bauherr's most-recent Hessen project
//   3. PROMOTE DESIGNER        — UPDATE profiles.role='designer'
//   4. GENERATE INVITE         — POST share-project {action:'create'} as Bauherr
//   5. ACCEPT INVITE           — POST share-project {inviteToken} as Designer
//   6. VERIFY A FACT           — POST verify-fact as Designer; assert state mutation
//   7. ASSERT FOOTER-HIDE      — re-fetch project; render-test isPending() logic
//   8. TEARDOWN (configurable) — reset role + delete member + reset fact qualifier
//
// Required env (all in .env.local or shell):
//   VITE_SUPABASE_URL              — already present
//   SUPABASE_SERVICE_ROLE_KEY      — Supabase Dashboard → Settings → API
//   BAUHERR_TEST_EMAIL             — owner of the test Hessen project
//   BAUHERR_TEST_JWT               — fresh access_token for the owner
//   DESIGNER_TEST_EMAIL            — the architect account (must already exist as a profile)
//   DESIGNER_TEST_JWT              — fresh access_token for the architect
//
// Optional flags:
//   --keep-side-effects            — skip Phase 8 teardown
//   --project-id=<uuid>            — pin a specific project instead of "most recent Hessen"
//
// Exit codes:
//   0  — all 7 active phases passed
//   1  — any phase failed
//   2  — missing required env (harness did not start)
// ───────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, '..')
const REPORT_PATH = '/tmp/architect-e2e-report.json'
const ENV_FILE = resolve(REPO_ROOT, '.env.local')

// ── Argv ───────────────────────────────────────────────────────────────
const KEEP_SIDE_EFFECTS = process.argv.includes('--keep-side-effects')
const PROJECT_ID_OVERRIDE =
  process.argv.find((a) => a.startsWith('--project-id='))?.split('=')[1] ?? null

// ── Env loader (defensive — reads .env.local if process.env is empty) ──
function loadEnv() {
  const env = { ...process.env }
  try {
    const text = readFileSync(ENV_FILE, 'utf-8')
    for (const line of text.split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/)
      if (!m) continue
      const [, key, rawValue] = m
      if (!(key in env)) {
        // Strip surrounding quotes if present.
        const value = rawValue.replace(/^["']|["']$/g, '')
        env[key] = value
      }
    }
  } catch {
    // .env.local missing is fine; process.env may be sufficient.
  }
  return env
}

const env = loadEnv()

const REQUIRED_ENV = [
  'VITE_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'BAUHERR_TEST_EMAIL',
  'BAUHERR_TEST_JWT',
  'DESIGNER_TEST_EMAIL',
  'DESIGNER_TEST_JWT',
]
const missing = REQUIRED_ENV.filter((k) => !env[k] || env[k].length < 4)
if (missing.length > 0) {
  console.error('[architect-e2e] missing required env:')
  for (const k of missing) console.error('   - ' + k)
  console.error('')
  console.error('Add to .env.local (or export in shell):')
  console.error('   SUPABASE_SERVICE_ROLE_KEY=<from Supabase Dashboard → Settings → API>')
  console.error('   BAUHERR_TEST_EMAIL=<owner account>')
  console.error('   BAUHERR_TEST_JWT=<copy from DevTools after signing into planning-matrix.vercel.app>')
  console.error('   DESIGNER_TEST_EMAIL=<architect account email; must already exist as a profile>')
  console.error('   DESIGNER_TEST_JWT=<copy from DevTools after signing in as the architect>')
  console.error('')
  console.error('Then re-run: npm run smoke:architect-e2e')
  process.exit(2)
}

const SUPABASE_URL = env.VITE_SUPABASE_URL.replace(/\/$/, '')
const SERVICE_ROLE = env.SUPABASE_SERVICE_ROLE_KEY
const BAUHERR_JWT = env.BAUHERR_TEST_JWT
const DESIGNER_JWT = env.DESIGNER_TEST_JWT
const BAUHERR_EMAIL = env.BAUHERR_TEST_EMAIL
const DESIGNER_EMAIL = env.DESIGNER_TEST_EMAIL

// ── HTTP helpers ──────────────────────────────────────────────────────
async function adminGet(path) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SERVICE_ROLE,
      Authorization: `Bearer ${SERVICE_ROLE}`,
      Prefer: 'count=exact',
    },
  })
  return r
}
async function adminPatch(path, body) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: 'PATCH',
    headers: {
      apikey: SERVICE_ROLE,
      Authorization: `Bearer ${SERVICE_ROLE}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(body),
  })
  return r
}
async function adminDelete(path) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: 'DELETE',
    headers: {
      apikey: SERVICE_ROLE,
      Authorization: `Bearer ${SERVICE_ROLE}`,
    },
  })
  return r
}
async function userPost(path, jwt, body) {
  const r = await fetch(`${SUPABASE_URL}/${path}`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_ROLE, // anon also works; service is fine for harness
      Authorization: `Bearer ${jwt}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  return r
}

// ── Result tracking ───────────────────────────────────────────────────
const report = {
  startedAt: new Date().toISOString(),
  phases: /** @type {Array<{name:string, ok:boolean, evidence?:any, error?:string}>} */ ([]),
  finishedAt: null,
  passed: 0,
  failed: 0,
}
function logPhase(name, ok, evidence, error) {
  const tick = ok ? '✓' : '✗'
  console.log(`  ${tick} ${name}`)
  if (!ok && error) console.log(`      → ${error}`)
  report.phases.push({ name, ok, evidence, error: error ?? null })
  if (ok) report.passed += 1
  else report.failed += 1
}

console.log('[architect-e2e] starting against ' + SUPABASE_URL)
console.log(`[architect-e2e] Bauherr=${BAUHERR_EMAIL} · Designer=${DESIGNER_EMAIL}`)
console.log(`[architect-e2e] teardown: ${KEEP_SIDE_EFFECTS ? 'SKIPPED (--keep-side-effects)' : 'enabled'}`)
console.log('')

// ── Phase 1 — SETUP (service-role probe) ──────────────────────────────
let stop = false
{
  try {
    const r = await adminGet('profiles?select=id&limit=1')
    const ok = r.status === 200
    logPhase('Phase 1 SETUP — service-role REST reachable', ok, { status: r.status })
    if (!ok) stop = true
  } catch (e) {
    logPhase('Phase 1 SETUP — service-role REST reachable', false, null, String(e))
    stop = true
  }
}

// ── Phase 2 — PICK PROJECT ────────────────────────────────────────────
let projectId = null
let projectOwnerId = null
if (!stop) {
  try {
    let query
    if (PROJECT_ID_OVERRIDE) {
      query = `projects?id=eq.${PROJECT_ID_OVERRIDE}&select=id,owner_id,bundesland,name,state`
    } else {
      // Find Bauherr's profile id by email first.
      const pr = await adminGet(
        `profiles?email=eq.${encodeURIComponent(BAUHERR_EMAIL)}&select=id&limit=1`,
      )
      const pBody = await pr.json()
      if (!Array.isArray(pBody) || pBody.length === 0)
        throw new Error('Bauherr profile not found by email')
      const ownerId = pBody[0].id
      query = `projects?owner_id=eq.${ownerId}&bundesland=eq.hessen&select=id,owner_id,bundesland,name,state&order=created_at.desc&limit=1`
    }
    const r = await adminGet(query)
    const body = await r.json()
    if (!Array.isArray(body) || body.length === 0)
      throw new Error('No matching project found (need at least one Hessen project owned by Bauherr)')
    projectId = body[0].id
    projectOwnerId = body[0].owner_id
    logPhase('Phase 2 PICK PROJECT', true, {
      projectId,
      name: body[0].name,
      bundesland: body[0].bundesland,
    })
  } catch (e) {
    logPhase('Phase 2 PICK PROJECT', false, null, String(e))
    stop = true
  }
}

// ── Phase 3 — PROMOTE DESIGNER ────────────────────────────────────────
let designerUserId = null
let priorDesignerRole = null
if (!stop) {
  try {
    // Look up designer user_id by email.
    const pr = await adminGet(
      `profiles?email=eq.${encodeURIComponent(DESIGNER_EMAIL)}&select=id,role&limit=1`,
    )
    const body = await pr.json()
    if (!Array.isArray(body) || body.length === 0)
      throw new Error('Designer profile not found by email — sign up via SPA first')
    designerUserId = body[0].id
    priorDesignerRole = body[0].role
    if (priorDesignerRole !== 'designer') {
      const upd = await adminPatch(
        `profiles?id=eq.${designerUserId}`,
        { role: 'designer' },
      )
      if (upd.status !== 200) throw new Error(`UPDATE profiles failed: ${upd.status}`)
    }
    logPhase('Phase 3 PROMOTE DESIGNER', true, { designerUserId, priorRole: priorDesignerRole })
  } catch (e) {
    logPhase('Phase 3 PROMOTE DESIGNER', false, null, String(e))
    stop = true
  }
}

// ── Phase 4 — GENERATE INVITE (as Bauherr) ────────────────────────────
let inviteToken = null
let inviteExpiresAt = null
if (!stop) {
  try {
    const r = await userPost('functions/v1/share-project', BAUHERR_JWT, {
      action: 'create',
      projectId,
    })
    const body = await r.json()
    if (r.status !== 200 || !body.inviteToken)
      throw new Error(`share-project create failed: ${r.status} ${JSON.stringify(body)}`)
    inviteToken = body.inviteToken
    inviteExpiresAt = body.expiresAt
    const expiresInDays = (new Date(inviteExpiresAt) - new Date()) / (1000 * 60 * 60 * 24)
    const ttlOk = expiresInDays > 6.5 && expiresInDays < 7.5
    if (!ttlOk) throw new Error(`expires_at TTL ${expiresInDays.toFixed(2)} days; expected ~7`)
    logPhase('Phase 4 GENERATE INVITE', true, { inviteToken, expiresAt: inviteExpiresAt })
  } catch (e) {
    logPhase('Phase 4 GENERATE INVITE', false, null, String(e))
    stop = true
  }
}

// ── Phase 5 — ACCEPT INVITE (as Designer) ─────────────────────────────
let memberRowId = null
if (!stop) {
  try {
    const r = await userPost('functions/v1/share-project', DESIGNER_JWT, {
      inviteToken,
    })
    const body = await r.json()
    if (r.status !== 200 || !body.ok)
      throw new Error(`share-project accept failed: ${r.status} ${JSON.stringify(body)}`)
    // Probe project_members for the accepted row.
    const pr = await adminGet(
      `project_members?invite_token=eq.${inviteToken}&select=id,user_id,accepted_at,role_in_project`,
    )
    const members = await pr.json()
    if (!Array.isArray(members) || members.length === 0)
      throw new Error('project_members row not visible after accept')
    const row = members[0]
    if (!row.accepted_at) throw new Error('accepted_at still null')
    if (row.user_id !== designerUserId)
      throw new Error(`user_id ${row.user_id} != designerUserId ${designerUserId}`)
    memberRowId = row.id
    logPhase('Phase 5 ACCEPT INVITE', true, { memberRowId, acceptedAt: row.accepted_at })
  } catch (e) {
    logPhase('Phase 5 ACCEPT INVITE', false, null, String(e))
    stop = true
  }
}

// ── Phase 6 — VERIFY A FACT (as Designer) ─────────────────────────────
let verifiedFactKey = null
let priorFactQualifier = null
if (!stop) {
  try {
    // Re-fetch project to find a not-yet-verified fact.
    const pr = await adminGet(`projects?id=eq.${projectId}&select=state`)
    const body = await pr.json()
    const state = body[0]?.state
    const facts = state?.facts ?? []
    const target = facts.find(
      (f) =>
        f.qualifier &&
        !(f.qualifier.source === 'DESIGNER' && f.qualifier.quality === 'VERIFIED'),
    )
    if (!target) throw new Error('No verifiable fact found in projects.state.facts')
    verifiedFactKey = target.key
    priorFactQualifier = { ...target.qualifier }
    const r = await userPost('functions/v1/verify-fact', DESIGNER_JWT, {
      projectId,
      field: 'extracted_fact',
      itemId: target.key,
    })
    const rBody = await r.json()
    if (r.status !== 200 || !rBody.ok)
      throw new Error(`verify-fact failed: ${r.status} ${JSON.stringify(rBody)}`)
    // Re-fetch to confirm qualifier flipped.
    const post = await adminGet(`projects?id=eq.${projectId}&select=state`)
    const postBody = await post.json()
    const postState = postBody[0]?.state
    const postFact = (postState?.facts ?? []).find((f) => f.key === verifiedFactKey)
    if (
      !postFact ||
      postFact.qualifier?.source !== 'DESIGNER' ||
      postFact.qualifier?.quality !== 'VERIFIED'
    )
      throw new Error(`qualifier did NOT flip: ${JSON.stringify(postFact?.qualifier)}`)
    logPhase('Phase 6 VERIFY FACT', true, {
      factKey: verifiedFactKey,
      priorQualifier: priorFactQualifier,
      newQualifier: postFact.qualifier,
    })
  } catch (e) {
    logPhase('Phase 6 VERIFY FACT', false, null, String(e))
    stop = true
  }
}

// ── Phase 7 — ASSERT FOOTER-HIDE LOGIC ────────────────────────────────
if (!stop) {
  try {
    // The SPA's VorlaeufigFooter renders when isPending() returns true.
    // isPending = !(source === 'DESIGNER' && quality === 'VERIFIED').
    // Re-fetch and reproduce the predicate per-fact.
    const r = await adminGet(`projects?id=eq.${projectId}&select=state`)
    const body = await r.json()
    const facts = body[0]?.state?.facts ?? []
    const verified = facts.find((f) => f.key === verifiedFactKey)
    const otherPending = facts.find(
      (f) =>
        f.key !== verifiedFactKey &&
        !(f.qualifier?.source === 'DESIGNER' && f.qualifier?.quality === 'VERIFIED'),
    )
    const isPending = (q) =>
      !(q?.source === 'DESIGNER' && q?.quality === 'VERIFIED')
    const verifiedHidden = !isPending(verified?.qualifier)
    const otherStillShown = otherPending ? isPending(otherPending.qualifier) : true
    if (!verifiedHidden)
      throw new Error('Verified fact would still render Vorläufig footer (predicate broken)')
    if (!otherStillShown && otherPending)
      throw new Error('Other pending fact predicate incorrectly hidden')
    logPhase('Phase 7 ASSERT FOOTER-HIDE LOGIC', true, {
      verifiedKey: verifiedFactKey,
      verifiedHidden,
      otherPendingFound: !!otherPending,
      otherStillShown,
    })
  } catch (e) {
    logPhase('Phase 7 ASSERT FOOTER-HIDE LOGIC', false, null, String(e))
  }
}

// ── Phase 8 — TEARDOWN ────────────────────────────────────────────────
if (!KEEP_SIDE_EFFECTS) {
  try {
    // Reset profile.role if it changed.
    if (designerUserId && priorDesignerRole && priorDesignerRole !== 'designer') {
      await adminPatch(`profiles?id=eq.${designerUserId}`, { role: priorDesignerRole })
    }
    // Delete the project_members row.
    if (memberRowId) {
      await adminDelete(`project_members?id=eq.${memberRowId}`)
    }
    // Restore the verified fact's prior qualifier via state-merge.
    if (projectId && verifiedFactKey && priorFactQualifier) {
      const r = await adminGet(`projects?id=eq.${projectId}&select=state`)
      const body = await r.json()
      const state = body[0]?.state
      if (state?.facts) {
        const updated = {
          ...state,
          facts: state.facts.map((f) =>
            f.key === verifiedFactKey ? { ...f, qualifier: priorFactQualifier } : f,
          ),
        }
        await adminPatch(`projects?id=eq.${projectId}`, { state: updated })
      }
    }
    logPhase('Phase 8 TEARDOWN', true)
  } catch (e) {
    logPhase('Phase 8 TEARDOWN', false, null, String(e))
  }
} else {
  console.log('  · Phase 8 TEARDOWN skipped (--keep-side-effects)')
}

// ── Report ────────────────────────────────────────────────────────────
report.finishedAt = new Date().toISOString()
writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf-8')
console.log('')
console.log(
  `[architect-e2e] ${report.passed} passed, ${report.failed} failed · report: ${REPORT_PATH}`,
)
process.exit(report.failed === 0 ? 0 : 1)
