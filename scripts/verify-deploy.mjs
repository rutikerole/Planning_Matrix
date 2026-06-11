// ───────────────────────────────────────────────────────────────────────
// Stale-deploy sprint (2026-06-11 incident) + meta-sweep item 4 —
// post-deploy verification, BOTH RAILS, ONE COMMAND.
//
// THE class fix for the incident where Vercel's build failed silently
// (verify:bundle ceiling breached prod-side) and production kept serving
// the pre-sprint deployment while every repo-side gate stayed green: the
// gate suite proved the CODE, nothing proved the DEPLOYMENT.
//
// RAIL 1 — web: fetches <url>/version.json (emitted by emit-version.mjs
//   as the last `npm run build` step) and asserts live SHA == expected.
// RAIL 2 — edge fn (meta-sweep item 4; previously a PROSE-ONLY manual
//   "bundle-grep"): GETs the chat-turn deploy-identity probe and asserts
//   the live bundle fingerprint == the fingerprint recomputed from the
//   LOCAL import graph (scripts/lib/edgeFingerprint.mjs). A live mismatch
//   means an operator deploy is owed: supabase functions deploy chat-turn
//
//   npm run verify:deploy                    → BOTH rails (the standing
//                                              post-push step, every deploy)
//   npm run verify:deploy -- --web-only      → web rail only
//   npm run verify:deploy -- --edge-only     → edge rail only (alias: --edge)
//   npm run verify:deploy -- --expect <sha>  → web rail SHA override
//   npm run verify:deploy -- --url <url>     → web rail URL override
//   npm run verify:deploy -- --wait <s>      → web rail: poll every 15 s
//
// Edge rail env: SUPABASE_URL + SUPABASE_ANON_KEY (or the VITE_-prefixed
// pair; .env.local is read as a fallback). Missing env FAILS the edge
// rail — a silent skip would recreate the class this gate closes.
// ───────────────────────────────────────────────────────────────────────

import { execSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { computeEdgeFingerprint } from './lib/edgeFingerprint.mjs'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
function argValue(flag) {
  const i = args.indexOf(flag)
  return i >= 0 ? args[i + 1] : undefined
}
const webOnly = args.includes('--web-only')
const edgeOnly = args.includes('--edge-only') || args.includes('--edge')

const url = (argValue('--url') ?? 'https://planning-matrix.vercel.app').replace(/\/$/, '')
const waitBudgetS = Number(argValue('--wait') ?? '0')

// ── Rail 1: web (version.json SHA) ─────────────────────────────────────

let expected = argValue('--expect')
if (!expected && !edgeOnly) {
  try {
    expected = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim()
  } catch {
    console.error('[verify:deploy] FAIL — no --expect and git rev-parse failed')
    process.exit(1)
  }
}

async function probeWeb() {
  const res = await fetch(`${url}/version.json?t=${Date.now()}`, {
    headers: { 'cache-control': 'no-cache' },
  })
  if (res.status === 404) {
    return {
      ok: false,
      detail:
        'version.json NOT FOUND — prod is serving a deployment built before ' +
        'this gate existed (a stale deployment, or the new build failed). ' +
        'Check the Vercel dashboard build log.',
    }
  }
  if (!res.ok) {
    return { ok: false, detail: `HTTP ${res.status} fetching version.json` }
  }
  let body
  try {
    body = await res.json()
  } catch {
    return {
      ok: false,
      detail:
        'version.json did not parse as JSON — likely the SPA rewrite served ' +
        'index.html; check vercel.json rewrite exclusions.',
    }
  }
  if (typeof body.sha !== 'string') {
    return { ok: false, detail: `version.json has no sha field: ${JSON.stringify(body)}` }
  }
  if (body.sha !== expected) {
    return {
      ok: false,
      live: body,
      detail:
        `STALE DEPLOYMENT — live sha ${body.sha.slice(0, 7)} ` +
        `(built ${body.builtAt ?? '?'}) != expected ${expected.slice(0, 7)}. ` +
        'Vercel has not shipped this commit; check the dashboard build log.',
    }
  }
  return { ok: true, live: body }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function runWebRail() {
  const deadline = Date.now() + waitBudgetS * 1000
  let last
  for (;;) {
    try {
      last = await probeWeb()
    } catch (err) {
      last = { ok: false, detail: `fetch failed: ${err instanceof Error ? err.message : err}` }
    }
    if (last.ok || Date.now() >= deadline) break
    console.log(
      `[verify:deploy] web not yet — ${last.detail} (retrying, ${Math.round((deadline - Date.now()) / 1000)}s left)`,
    )
    await sleep(15_000)
  }
  if (!last.ok) {
    console.error(`[verify:deploy] WEB RAIL FAIL — ${url}`)
    console.error(`  ${last.detail}`)
    return false
  }
  console.log(
    `[verify:deploy] web OK — ${url} serves ${last.live.sha.slice(0, 7)} (built ${last.live.builtAt}); matches expected.`,
  )
  return true
}

// ── Rail 2: edge fn (chat-turn fingerprint) ────────────────────────────

function resolveSupabaseEnv() {
  const fromEnv = (k) => process.env[k]?.trim()
  let supaUrl = fromEnv('SUPABASE_URL') ?? fromEnv('VITE_SUPABASE_URL')
  let anonKey = fromEnv('SUPABASE_ANON_KEY') ?? fromEnv('VITE_SUPABASE_ANON_KEY')
  if (!supaUrl || !anonKey) {
    const envLocal = join(repoRoot, '.env.local')
    if (existsSync(envLocal)) {
      for (const line of readFileSync(envLocal, 'utf-8').split('\n')) {
        const m = line.match(/^\s*(?:export\s+)?(VITE_SUPABASE_URL|VITE_SUPABASE_ANON_KEY|SUPABASE_URL|SUPABASE_ANON_KEY)\s*=\s*"?([^"\n]+)"?\s*$/)
        if (!m) continue
        if (/URL/.test(m[1]) && !supaUrl) supaUrl = m[2].trim()
        if (/ANON_KEY/.test(m[1]) && !anonKey) anonKey = m[2].trim()
      }
    }
  }
  return { supaUrl: supaUrl?.replace(/\/$/, ''), anonKey }
}

async function runEdgeRail() {
  const { fingerprint: expectedFp, files } = computeEdgeFingerprint(repoRoot)
  const { supaUrl, anonKey } = resolveSupabaseEnv()
  if (!supaUrl || !anonKey) {
    console.error('[verify:deploy] EDGE RAIL FAIL — SUPABASE_URL / SUPABASE_ANON_KEY not resolvable')
    console.error('  (env vars, VITE_-prefixed pair, or .env.local). A silent skip would')
    console.error('  recreate the stale-edge-deploy class — set the env and re-run.')
    return false
  }
  let res
  try {
    res = await fetch(`${supaUrl}/functions/v1/chat-turn`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${anonKey}`, apikey: anonKey },
    })
  } catch (err) {
    console.error(`[verify:deploy] EDGE RAIL FAIL — fetch failed: ${err instanceof Error ? err.message : err}`)
    return false
  }
  if (!res.ok) {
    console.error(`[verify:deploy] EDGE RAIL FAIL — HTTP ${res.status} from the chat-turn GET probe.`)
    console.error('  A 405 means the LIVE function predates the deploy-identity probe —')
    console.error('  i.e. a STALE EDGE DEPLOY. Operator step:')
    console.error('    supabase functions deploy chat-turn')
    return false
  }
  let body
  try {
    body = await res.json()
  } catch {
    console.error('[verify:deploy] EDGE RAIL FAIL — probe response is not JSON')
    return false
  }
  if (body.fingerprint !== expectedFp) {
    console.error(
      `[verify:deploy] EDGE RAIL FAIL — STALE EDGE DEPLOY: live fingerprint ${body.fingerprint ?? '?'} ` +
        `(v=${body.function_version ?? '?'}) != local ${expectedFp} (${files.length} graph files).`,
    )
    console.error('  The deployed chat-turn bundle does not match this tree. Operator step:')
    console.error('    supabase functions deploy chat-turn')
    return false
  }
  console.log(
    `[verify:deploy] edge OK — chat-turn serves fingerprint ${body.fingerprint} ` +
      `(v=${body.function_version ?? '?'}, ${files.length} graph files); matches local tree.`,
  )
  return true
}

// ── Run ────────────────────────────────────────────────────────────────

let ok = true
if (!edgeOnly) ok = (await runWebRail()) && ok
if (!webOnly) ok = (await runEdgeRail()) && ok
if (!ok) {
  console.error('[verify:deploy] FAIL — see rail output above')
  process.exit(1)
}
console.log('[verify:deploy] OK — both rails verified' + (webOnly ? ' (web only)' : edgeOnly ? ' (edge only)' : ''))
