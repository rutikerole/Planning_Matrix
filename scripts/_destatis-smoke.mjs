#!/usr/bin/env node
// ───────────────────────────────────────────────────────────────────────
// scripts/_destatis-smoke.mjs — DIAGNOSTIC ONLY (phase-c/item-4 prep).
//
// NOT production code. NOT the WS1 fetch integration. A single smoke call to
// confirm — tomorrow morning, BEFORE we start WS1/2/4 — that (a) the migrated
// Destatis GENESIS API is back online and (b) DESTATIS_API_TOKEN authenticates.
// Prints the RAW server response and never fabricates data.
//
//   Run:  node scripts/_destatis-smoke.mjs
//
// Token: read from process.env.DESTATIS_API_TOKEN, else parsed from .env.local.
//        FAILS LOUDLY (exit 1) if absent — no mock data.
//
// Endpoint: GENESIS-Online migrates to genesis.destatis.de on 2026-05-28 (the
//   Part-A recon used www-genesis.destatis.de). Default base = the NEW host +
//   the known REST-2020 path; if the migration changed the path/host, override
//   with DESTATIS_API_BASE (the script prints the URL it hit). Auth: the GENESIS
//   token is sent as the `username` form field (empty password) — the documented
//   token convention. Reading the RAW response is the point: Code 16 =
//   maintenance (still down), Code 15 = auth not recognised (try a different
//   token/method), otherwise the data rows confirm the API + token work.
// ───────────────────────────────────────────────────────────────────────

import { readFileSync } from 'node:fs'

function resolveToken() {
  const fromEnv = process.env.DESTATIS_API_TOKEN?.trim()
  if (fromEnv) return fromEnv
  try {
    const m = readFileSync(new URL('../.env.local', import.meta.url), 'utf-8')
      .match(/^\s*DESTATIS_API_TOKEN\s*=\s*(.+?)\s*$/m)
    const v = m?.[1]?.replace(/^["']|["']$/g, '').trim()
    if (v && v !== 'YOUR_ACTUAL_TOKEN_HERE') return v
  } catch { /* .env.local absent — fall through */ }
  return null
}

const token = resolveToken()
if (!token) {
  console.error('✗ DESTATIS_API_TOKEN not set (checked process.env and .env.local).')
  console.error('  Add the REAL token to .env.local:  DESTATIS_API_TOKEN=<token>   then re-run.')
  console.error('  (No mock data — this diagnostic does nothing without a real token.)')
  process.exit(1)
}

const BASE = (process.env.DESTATIS_API_BASE
  // NEW post-migration host (DB moved to genesis.destatis.de on 2026-05-28). The
  // exact migrated REST path is unverified until the API is back — if this 404s /
  // ENOTFOUNDs tomorrow, override DESTATIS_API_BASE (pre-migration host was
  // www-genesis.destatis.de/genesisWS/rest/2020).
  ?? 'https://genesis.destatis.de/genesisWS/rest/2020'
).replace(/\/$/, '')

console.log(`[destatis-smoke] base  = ${BASE}   (override with DESTATIS_API_BASE)`)
console.log(`[destatis-smoke] token present (length ${token.length}) — value not printed`)

const url = `${BASE}/data/table`
const body = new URLSearchParams({
  username: token, password: '', language: 'en',
  name: '61261-0002', area: 'all', format: 'ffcsv', startyear: '2025', compress: 'false',
})

let res, text
try {
  res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body })
  text = await res.text()
} catch (e) {
  console.error(`\n✗ NETWORK ERROR hitting ${url}\n  ${String(e?.message ?? e)}`)
  console.error('  If this is "ENOTFOUND"/404, the migrated API path differs — set DESTATIS_API_BASE and re-run.')
  process.exit(4)
}

console.log(`\n── data/table 61261-0002 (Baupreisindex Wohngebäude, from 2025) ──`)
console.log(`  URL:    ${url}`)
console.log(`  status: ${res.status}   content-type: ${res.headers.get('content-type') ?? ''}`)
console.log('  body (raw, truncated to 2500 chars):')
console.log((text ?? '').slice(0, 2500).split('\n').map((l) => '    ' + l).join('\n'))
if ((text ?? '').length > 2500) console.log(`    … [truncated; ${text.length} chars total]`)

// Verdict — driven entirely by the raw response; no fabrication.
const blob = text ?? ''
if (/"Code"\s*:\s*16|Wartungsarbeiten|maintenance/i.test(blob)) {
  console.error('\n✗ MAINTENANCE (GENESIS Code 16) — still down. Re-run after the migration window.'); process.exit(2)
}
if (res.status === 401 || res.status === 403) {
  console.error(`\n✗ HTTP ${res.status} (server-level, NOT GENESIS Code 15) — the migrated API likely lives at a`)
  console.error('  different host/path, gates the endpoint during migration, or wants a different auth transport.')
  console.error('  Tomorrow: try  DESTATIS_API_BASE=https://www-genesis.destatis.de/genesisWS/rest/2020  (or the new path).'); process.exit(5)
}
if (res.status === 404) { console.error('\n✗ HTTP 404 — path not found. Set DESTATIS_API_BASE to the migrated REST path.'); process.exit(4) }
if (res.status >= 500) { console.error(`\n✗ HTTP ${res.status} — server error (likely still migrating). Re-run after the window.`); process.exit(2) }
if (/"Code"\s*:\s*15|not allowed to call this service|access data cannot be recognised/i.test(blob)) {
  console.error('\n✗ AUTH not recognised (GENESIS Code 15) — endpoint reachable but token rejected. Confirm the token / try username+password.'); process.exit(3)
}
if (res.status === 200 && blob.length > 0 && !/"Type"\s*:\s*"ERROR"/i.test(blob)) {
  console.log('\n✓ HEALTHY — data/table returned content. Eyeball the latest quarter above, then start WS1.'); process.exit(0)
}
console.error('\n✗ UNEXPECTED response — inspect the raw output above before starting WS1.'); process.exit(1)
