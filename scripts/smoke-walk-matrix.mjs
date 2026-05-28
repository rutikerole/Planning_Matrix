#!/usr/bin/env node
// ───────────────────────────────────────────────────────────────────────
// v1.0.8 W3 — Smoke-walk matrix harness (state × template).
//
// PURPOSE
// Manual hand-walking the 14 priority cells of the v1 smoke-walk
// surface (per docs/V1_SMOKE_WALK_EXECUTION_PLAN.md) takes ~6 hours.
// This harness runs the same 14 cells programmatically in 5-10
// minutes, asserting per-cell that the persona emits state-correct
// citations and zero Bayern leak on non-Bayern projects.
//
// COST + SIDE-EFFECT WARNING
// Each cell makes 5 chat-turn calls (configurable via --turns=N).
// Default 34 cells × 5 turns = 170 Anthropic chat-turn invocations
// (5 substantive × T-01 + Bayern × T-02..T-08 + 11 thin states × T-01
// + 11 thin states × T-05; updated 2026-05-28 audit-remediation P4).
// Sonnet 4.6 with MAX_TOKENS=1280: rough order-of-magnitude
// $25-50 per matrix run. Each cell also creates a row in live
// public.projects (teardown deletes it by default; --keep-projects
// to retain for debugging). Use --cells=1,2,…,N to sample a subset.
//
// DO NOT WIRE THIS INTO `npm run build` OR daily-gate scripts.
// It is operator-triggered via:
//    npm run smoke:matrix
//
// Required env (all in .env.local or shell):
//   VITE_SUPABASE_URL                   — already present
//   SUPABASE_SERVICE_ROLE_KEY           — Supabase Dashboard
//   BAUHERR_TEST_JWT                    — fresh user JWT (NOT
//                                          service-role; chat-turn
//                                          needs a real user_id)
//   BAUHERR_TEST_USER_ID                — auth.users.id matching
//                                          the JWT
//   ANTHROPIC_BUDGET_ACKED              — set to "yes" to confirm
//                                          you've authorised the
//                                          per-run spend
//
// Optional flags:
//   --turns=N                           — chat turns per cell (default 5)
//   --cells=A,B,C                       — pin a subset by index 1-14
//   --keep-projects                     — skip teardown
//
// Exit codes:
//   0  — every cell's assertions passed
//   1  — any cell failed
//   2  — missing required env (harness did not start)
// ───────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, '..')
const REPORT_PATH = '/tmp/smoke-walk-matrix-report.json'
const ENV_FILE = resolve(REPO_ROOT, '.env.local')

// ── Argv ───────────────────────────────────────────────────────────────
const KEEP_PROJECTS = process.argv.includes('--keep-projects')
const TURNS = (() => {
  const a = process.argv.find((x) => x.startsWith('--turns='))
  const n = a ? parseInt(a.split('=')[1], 10) : 5
  return Number.isFinite(n) && n > 0 ? n : 5
})()
const CELL_FILTER = (() => {
  const a = process.argv.find((x) => x.startsWith('--cells='))
  if (!a) return null
  return new Set(a.split('=')[1].split(',').map((s) => parseInt(s.trim(), 10)))
})()

// ── Env loader (mirrors architect-e2e harness — defensive) ────────────
function loadEnv() {
  const env = { ...process.env }
  try {
    const text = readFileSync(ENV_FILE, 'utf-8')
    for (const line of text.split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/)
      if (!m) continue
      const [, key, rawValue] = m
      if (!(key in env)) {
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
  'BAUHERR_TEST_JWT',
  'BAUHERR_TEST_USER_ID',
  'ANTHROPIC_BUDGET_ACKED',
]
const missing = REQUIRED_ENV.filter((k) => !env[k] || env[k].length < 1)
if (missing.length > 0) {
  console.error('[smoke-matrix] missing required env:')
  for (const k of missing) console.error('   - ' + k)
  console.error('')
  console.error('Cost / side-effect summary BEFORE running:')
  console.error(`   - ${14} cells × ${TURNS} turns = ${14 * TURNS} Anthropic chat-turn calls`)
  console.error('   - Sonnet 4.6 with MAX_TOKENS=1280: rough ~$10-20 per run')
  console.error('   - Each cell creates 1 row in live public.projects (default cleanup)')
  console.error('')
  console.error('Add to .env.local (or export in shell):')
  console.error('   SUPABASE_SERVICE_ROLE_KEY=<from Supabase Dashboard → Settings → API>')
  console.error('   BAUHERR_TEST_JWT=<copy from DevTools after signing into the SPA>')
  console.error('   BAUHERR_TEST_USER_ID=<the auth.users.id matching the JWT>')
  console.error('   ANTHROPIC_BUDGET_ACKED=yes')
  console.error('')
  console.error('Then re-run: npm run smoke:matrix')
  process.exit(2)
}

if (env.ANTHROPIC_BUDGET_ACKED.toLowerCase() !== 'yes') {
  console.error('[smoke-matrix] ANTHROPIC_BUDGET_ACKED must be "yes" to run.')
  console.error('Confirm you have authorised ~$10-20 in Anthropic spend per run.')
  process.exit(2)
}

const SUPABASE_URL = env.VITE_SUPABASE_URL.replace(/\/$/, '')
const SERVICE_ROLE = env.SUPABASE_SERVICE_ROLE_KEY
const BAUHERR_JWT = env.BAUHERR_TEST_JWT
const BAUHERR_USER_ID = env.BAUHERR_TEST_USER_ID

// ── Matrix definition ─────────────────────────────────────────────────
// Cell index → { bundesland, template_id, addressHint, expectedAnchor }
// expectedAnchor regex MUST match at least once in the persona's
// transcript for the cell to pass.
//
// `stub: true` historically meant "no substantive state content; accept
// the honest 'in Vorbereitung' framing." Bucket C Pass A+C (commits
// 2793c08..453655c) authored T-01..T-08 cells for every Stadtstaat +
// Flächenland; the systemBlock banner stays ON until Pass B, but the
// per-template addendum carries verified state-§§. So all 11 thin-state
// rows now expect state-specific markers (stub:false) and any Bayern leak
// (BayBO Art.) FAILs them via FORBIDDEN_NON_BAYERN.
const CELLS = [
  // ── 5 substantive states × T-01 ─────────────────────────────────────
  { i: 1,  bundesland: 'bayern',        template_id: 'T-01', address: 'Marienplatz 8, 80331 München',          expectedAnchor: /BayBO|Art\.\s*\d+|München/i,             stub: false },
  { i: 2,  bundesland: 'nrw',           template_id: 'T-01', address: 'Marktplatz 2, 40213 Düsseldorf',        expectedAnchor: /BauO NRW|§\s*\d+\s*BauO NRW/i,           stub: false },
  { i: 3,  bundesland: 'bw',            template_id: 'T-01', address: 'Marktplatz 1, 70173 Stuttgart',          expectedAnchor: /\bLBO\b|§\s*\d+\s*LBO/i,                 stub: false },
  { i: 4,  bundesland: 'hessen',        template_id: 'T-01', address: 'Römerberg 27, 60311 Frankfurt am Main',  expectedAnchor: /HBO|§\s*\d+\s*HBO/i,                     stub: false },
  { i: 5,  bundesland: 'niedersachsen', template_id: 'T-01', address: 'Trammplatz 2, 30159 Hannover',           expectedAnchor: /NBauO|§\s*\d+\s*NBauO/i,                 stub: false },
  // ── Bayern × T-02..T-08 (BLOCKS[T] tail = Bayern default) ──────────
  { i: 6,  bundesland: 'bayern',        template_id: 'T-02', address: 'Marienplatz 8, 80331 München',           expectedAnchor: /BayBO|Mehrfamilien|Wohneinheit/i,         stub: false },
  { i: 7,  bundesland: 'bayern',        template_id: 'T-03', address: 'Marienplatz 8, 80331 München',           expectedAnchor: /Sanierung|Instandsetzung|Bestand/i,       stub: false },
  { i: 8,  bundesland: 'bayern',        template_id: 'T-04', address: 'Marienplatz 8, 80331 München',           expectedAnchor: /Umnutzung|Nutzungsänderung/i,             stub: false },
  { i: 9,  bundesland: 'bayern',        template_id: 'T-05', address: 'Marienplatz 8, 80331 München',           expectedAnchor: /Abbruch|Anzeige/i,                        stub: false },
  { i: 10, bundesland: 'bayern',        template_id: 'T-06', address: 'Marienplatz 8, 80331 München',           expectedAnchor: /Aufstockung|GK|Gebäudeklasse/i,           stub: false },
  { i: 11, bundesland: 'bayern',        template_id: 'T-07', address: 'Marienplatz 8, 80331 München',           expectedAnchor: /Anbau|Abstand/i,                          stub: false },
  { i: 12, bundesland: 'bayern',        template_id: 'T-08', address: 'Marienplatz 8, 80331 München',           expectedAnchor: /Sonstig|klärend/i,                        stub: false },
  // ── 11 thin-state Bucket-C states × T-01 (EFH) — Pass A+C content ──
  // Anchors match each state's BauO law-short. Bayern-leak guard fires
  // on these (FORBIDDEN_NON_BAYERN).
  { i: 13, bundesland: 'sachsen',         template_id: 'T-01', address: 'Theaterplatz 1, 01067 Dresden',         expectedAnchor: /SächsBO|§\s*\d+\s*SächsBO/i,             stub: false },
  { i: 14, bundesland: 'berlin',          template_id: 'T-01', address: 'Schönhauser Allee 36, 10115 Berlin',    expectedAnchor: /BauO Bln|Bezirksamt/i,                    stub: false },
  { i: 15, bundesland: 'hamburg',         template_id: 'T-01', address: 'Rathausmarkt 1, 20095 Hamburg',          expectedAnchor: /HBauO|§\s*\d+\s*HBauO|Bezirksamt/i,       stub: false },
  { i: 16, bundesland: 'bremen',          template_id: 'T-01', address: 'Am Markt 21, 28195 Bremen',              expectedAnchor: /BremLBO|§\s*\d+\s*BremLBO/i,              stub: false },
  { i: 17, bundesland: 'sh',              template_id: 'T-01', address: 'Rathausplatz 1, 24103 Kiel',             expectedAnchor: /LBO SH|§\s*\d+\s*LBO SH/i,                stub: false },
  { i: 18, bundesland: 'rlp',             template_id: 'T-01', address: 'Rathausplatz 1, 55116 Mainz',            expectedAnchor: /LBauO\b|§\s*\d+\s*LBauO\b/i,              stub: false },
  { i: 19, bundesland: 'mv',              template_id: 'T-01', address: 'Am Markt 1, 18055 Rostock',              expectedAnchor: /LBauO M-V|§\s*\d+\s*LBauO M-V/i,          stub: false },
  { i: 20, bundesland: 'sachsen-anhalt',  template_id: 'T-01', address: 'Alter Markt 6, 39104 Magdeburg',         expectedAnchor: /BauO LSA|§\s*\d+\s*BauO LSA/i,            stub: false },
  { i: 21, bundesland: 'thueringen',      template_id: 'T-01', address: 'Fischmarkt 1, 99084 Erfurt',             expectedAnchor: /ThürBO|§\s*\d+\s*ThürBO/i,                stub: false },
  { i: 22, bundesland: 'brandenburg',     template_id: 'T-01', address: 'Friedrich-Ebert-Str. 79, 14467 Potsdam', expectedAnchor: /BbgBO|§\s*\d+\s*BbgBO/i,                  stub: false },
  { i: 23, bundesland: 'saarland',        template_id: 'T-01', address: 'Rathausplatz, 66111 Saarbrücken',        expectedAnchor: /LBO Saarland|§\s*\d+\s*LBO Saarland/i,    stub: false },
  // ── 11 thin-state Bucket-C states × T-05 (Abbruch) ──────────────────
  // Bayern's T-05 cell (#9) is the substantive baseline; these confirm
  // the per-template tail correctly addends the state's abbruch/§-§§ overlay.
  { i: 24, bundesland: 'berlin',          template_id: 'T-05', address: 'Schönhauser Allee 36, 10115 Berlin',    expectedAnchor: /BauO Bln|Abbruch|Beseitigung/i,           stub: false },
  { i: 25, bundesland: 'hamburg',         template_id: 'T-05', address: 'Rathausmarkt 1, 20095 Hamburg',          expectedAnchor: /HBauO|Abbruch|Beseitigung/i,              stub: false },
  { i: 26, bundesland: 'bremen',          template_id: 'T-05', address: 'Am Markt 21, 28195 Bremen',              expectedAnchor: /BremLBO|Abbruch|Beseitigung/i,            stub: false },
  { i: 27, bundesland: 'sachsen',         template_id: 'T-05', address: 'Theaterplatz 1, 01067 Dresden',          expectedAnchor: /SächsBO|Abbruch|Beseitigung/i,            stub: false },
  { i: 28, bundesland: 'sh',              template_id: 'T-05', address: 'Rathausplatz 1, 24103 Kiel',             expectedAnchor: /LBO SH|Abbruch|Beseitigung/i,             stub: false },
  { i: 29, bundesland: 'rlp',             template_id: 'T-05', address: 'Rathausplatz 1, 55116 Mainz',            expectedAnchor: /LBauO\b|Abbruch|Beseitigung/i,            stub: false },
  { i: 30, bundesland: 'mv',              template_id: 'T-05', address: 'Am Markt 1, 18055 Rostock',              expectedAnchor: /LBauO M-V|Abbruch|Beseitigung/i,          stub: false },
  { i: 31, bundesland: 'sachsen-anhalt',  template_id: 'T-05', address: 'Alter Markt 6, 39104 Magdeburg',         expectedAnchor: /BauO LSA|Abbruch|Beseitigung/i,           stub: false },
  { i: 32, bundesland: 'thueringen',      template_id: 'T-05', address: 'Fischmarkt 1, 99084 Erfurt',             expectedAnchor: /ThürBO|Abbruch|Beseitigung/i,             stub: false },
  { i: 33, bundesland: 'brandenburg',     template_id: 'T-05', address: 'Friedrich-Ebert-Str. 79, 14467 Potsdam', expectedAnchor: /BbgBO|Abbruch|Beseitigung/i,              stub: false },
  { i: 34, bundesland: 'saarland',        template_id: 'T-05', address: 'Rathausplatz, 66111 Saarbrücken',        expectedAnchor: /LBO Saarland|Abbruch|Beseitigung/i,       stub: false },
]
const activeCells = CELL_FILTER ? CELLS.filter((c) => CELL_FILTER.has(c.i)) : CELLS

// Forbidden patterns on non-Bayern cells — Bayern leak detector.
const FORBIDDEN_NON_BAYERN = /\bBayBO\s+Art\.|\bAnlage\s+1\s+BayBO\b/i

// ── HTTP helpers ──────────────────────────────────────────────────────
async function adminPost(path, body) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_ROLE,
      Authorization: `Bearer ${SERVICE_ROLE}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(body),
  })
}
async function adminGet(path) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SERVICE_ROLE,
      Authorization: `Bearer ${SERVICE_ROLE}`,
    },
  })
}
async function adminDelete(path) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: 'DELETE',
    headers: {
      apikey: SERVICE_ROLE,
      Authorization: `Bearer ${SERVICE_ROLE}`,
    },
  })
}
async function chatTurn(projectId, userMessage) {
  return fetch(`${SUPABASE_URL}/functions/v1/chat-turn`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_ROLE,
      Authorization: `Bearer ${BAUHERR_JWT}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      projectId,
      userMessage,
      userAnswer: null,
      clientRequestId: randomUUID(),
    }),
  })
}

// ── Cell runner ───────────────────────────────────────────────────────
async function runCell(cell) {
  const result = {
    i: cell.i,
    bundesland: cell.bundesland,
    template_id: cell.template_id,
    projectId: null,
    transcriptLines: 0,
    matchedExpected: false,
    matchedForbidden: null,
    ok: false,
    error: null,
  }
  try {
    // 1. Create project via service-role INSERT.
    const insertBody = {
      owner_id: BAUHERR_USER_ID,
      intent: 'neubau_einfamilienhaus',
      has_plot: true,
      plot_address: cell.address,
      bundesland: cell.bundesland,
      city: cell.bundesland === 'bayern' ? 'muenchen' : null,
      template_id: cell.template_id,
      name: `[W3-smoke ${new Date().toISOString().slice(0, 10)}] cell ${cell.i}: ${cell.bundesland} × ${cell.template_id}`,
      state: {
        schemaVersion: 1,
        templateId: cell.template_id,
        facts: [],
        recommendations: [],
        procedures: [],
        documents: [],
        roles: [],
        areas: { A: { state: 'PENDING' }, B: { state: 'PENDING' }, C: { state: 'PENDING' } },
      },
    }
    const ins = await adminPost('projects?select=id', insertBody)
    if (ins.status >= 300) throw new Error(`projects INSERT ${ins.status}: ${await ins.text()}`)
    const insRows = await ins.json()
    result.projectId = insRows[0].id

    // 2. Run N synthetic turns sequentially.
    const synthetic = ['Weiter', 'Ja', '180 m²', '1970', 'Weiter']
    const transcript = []
    for (let t = 0; t < TURNS; t++) {
      const msg = synthetic[t] ?? 'Weiter'
      const r = await chatTurn(result.projectId, msg)
      if (r.status >= 300) {
        const errBody = await r.text()
        throw new Error(`chat-turn ${r.status} on turn ${t + 1}: ${errBody.slice(0, 200)}`)
      }
      const j = await r.json()
      const assistantText = j?.assistantMessage?.content ?? ''
      transcript.push(assistantText)
    }
    const combined = transcript.join('\n\n')
    result.transcriptLines = transcript.length

    // 3. Assertions.
    result.matchedExpected = cell.expectedAnchor.test(combined)
    if (cell.bundesland !== 'bayern' && !cell.stub) {
      const m = combined.match(FORBIDDEN_NON_BAYERN)
      result.matchedForbidden = m ? m[0] : null
    }
    const passExpected = result.matchedExpected
    const passForbidden = !result.matchedForbidden
    result.ok = passExpected && passForbidden
    if (!passExpected) result.error = 'expected anchor not found in transcript'
    else if (!passForbidden)
      result.error = `forbidden non-Bayern pattern present: ${result.matchedForbidden}`
  } catch (e) {
    result.error = String(e)
  }
  return result
}

// ── Main ──────────────────────────────────────────────────────────────
console.log('[smoke-matrix] starting against ' + SUPABASE_URL)
console.log(`[smoke-matrix] cells: ${activeCells.length} (of 14) · turns/cell: ${TURNS}`)
console.log(`[smoke-matrix] teardown: ${KEEP_PROJECTS ? 'SKIPPED (--keep-projects)' : 'enabled'}`)
console.log('')

const report = {
  startedAt: new Date().toISOString(),
  config: { turns: TURNS, cellsActive: activeCells.length },
  cells: /** @type {any[]} */ ([]),
  finishedAt: null,
  passed: 0,
  failed: 0,
}

for (const cell of activeCells) {
  const r = await runCell(cell)
  const tick = r.ok ? '✓' : '✗'
  console.log(
    `  ${tick} cell ${String(r.i).padStart(2)} · ${r.bundesland.padEnd(15)} × ${r.template_id}` +
      (r.error ? `  → ${r.error}` : `  · ${r.transcriptLines} turns`),
  )
  report.cells.push(r)
  if (r.ok) report.passed += 1
  else report.failed += 1
  // Teardown per-cell (default).
  if (!KEEP_PROJECTS && r.projectId) {
    await adminDelete(`projects?id=eq.${r.projectId}`)
  }
}

report.finishedAt = new Date().toISOString()
writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf-8')

console.log('')
console.log(
  `[smoke-matrix] ${report.passed}/${activeCells.length} cells passed · report: ${REPORT_PATH}`,
)
process.exit(report.failed === 0 ? 0 : 1)
