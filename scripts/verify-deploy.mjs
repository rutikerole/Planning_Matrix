// ───────────────────────────────────────────────────────────────────────
// Stale-deploy sprint (2026-06-11 incident) — post-deploy verification.
//
// THE class fix for the incident where Vercel's build failed silently
// (verify:bundle ceiling breached prod-side) and production kept serving
// the pre-sprint deployment while every repo-side gate stayed green: the
// gate suite proved the CODE, nothing proved the DEPLOYMENT.
//
// Fetches <url>/version.json (emitted by scripts/emit-version.mjs as the
// last `npm run build` step) and asserts live SHA == expected SHA.
//
//   npm run verify:deploy                  → expects local HEAD on prod
//   npm run verify:deploy -- --expect <sha>
//   npm run verify:deploy -- --url https://preview-url.vercel.app
//
// STANDARD POST-PUSH STEP (both rails, every deploy):
//   1. frontend  — npm run verify:deploy   (this script)
//   2. edge fn   — the chat-turn bundle-grep (byte-identical check against
//                  main) whenever supabase/functions changed
//
// Retries while Vercel builds: --wait <seconds> polls every 15 s until
// the SHA matches or the budget runs out (default: single shot).
// ───────────────────────────────────────────────────────────────────────

import { execSync } from 'node:child_process'

const args = process.argv.slice(2)
function argValue(flag) {
  const i = args.indexOf(flag)
  return i >= 0 ? args[i + 1] : undefined
}

const url = (argValue('--url') ?? 'https://planning-matrix.vercel.app').replace(/\/$/, '')
const waitBudgetS = Number(argValue('--wait') ?? '0')

let expected = argValue('--expect')
if (!expected) {
  try {
    expected = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim()
  } catch {
    console.error('[verify:deploy] FAIL — no --expect and git rev-parse failed')
    process.exit(1)
  }
}

async function probe() {
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
const deadline = Date.now() + waitBudgetS * 1000
let last
for (;;) {
  try {
    last = await probe()
  } catch (err) {
    last = { ok: false, detail: `fetch failed: ${err instanceof Error ? err.message : err}` }
  }
  if (last.ok || Date.now() >= deadline) break
  console.log(`[verify:deploy] not yet — ${last.detail} (retrying, ${Math.round((deadline - Date.now()) / 1000)}s left)`)
  await sleep(15_000)
}

if (!last.ok) {
  console.error(`[verify:deploy] FAIL — ${url}`)
  console.error(`  ${last.detail}`)
  process.exit(1)
}

console.log(
  `[verify:deploy] OK — ${url} serves ${last.live.sha.slice(0, 7)} (built ${last.live.builtAt}); matches expected.`,
)
