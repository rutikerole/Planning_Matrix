#!/usr/bin/env node
// ───────────────────────────────────────────────────────────────────────
// gen-plz-bundesland.mjs — fix/plz-detect (2026-06-12).
//
// Generates src/features/wizard/lib/plzBundesland.generated.ts: a
// minimal-depth longest-prefix table PLZ-prefix → BundeslandCode, derived
// from the GeoNames postal dataset (https://download.geonames.org/export/
// zip/DE.zip, CC-BY 4.0). Replaces the hand-typed 2-digit sector table
// that mis-assigned every state-boundary prefix it glossed over (live
// walk evidence: 07743 Jena (Thüringen) → "Saxony"; also 14467 Potsdam
// (Brandenburg) → "Berlin", 06108 Halle (Sachsen-Anhalt) → "Sachsen",
// 03046 Cottbus (Brandenburg) → "Sachsen", …).
//
// Derivation:
//   1. Per-PLZ majority state (outvotes mis-geocoded Großempfänger noise;
//      ties resolve to the majority of the surrounding 3-digit prefix).
//   2. Trie compression: emit the SHORTEST prefix (1..5 digits) under
//      which every dataset PLZ agrees on one state.
//   3. Hard-fail VALIDATION against a curated checklist of known
//      city → state pairs (16 capitals + every boundary city the old
//      table got wrong or could get wrong).
//
// Genuinely state-crossing PLZ exist (e.g. 19273 Amt Neuhaus); they get
// their majority side — the wizard's "Change if wrong" dropdown is the
// documented escape hatch for sub-PLZ edge cases.
//
// Usage:  node scripts/gen-plz-bundesland.mjs [path/to/DE.txt]
//         (no arg → fetches the GeoNames zip into a temp dir)
// ───────────────────────────────────────────────────────────────────────

import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const STATE_TO_CODE = new Map(Object.entries({
  'Baden-Württemberg': 'bw',
  'Bavaria': 'bayern', 'Bayern': 'bayern',
  'Berlin': 'berlin', 'Land Berlin': 'berlin',
  'Brandenburg': 'brandenburg',
  'Bremen': 'bremen',
  'Hamburg': 'hamburg',
  'Hessen': 'hessen', 'Hesse': 'hessen',
  'Mecklenburg-Vorpommern': 'mv', 'Mecklenburg-Western Pomerania': 'mv',
  'Lower Saxony': 'niedersachsen', 'Niedersachsen': 'niedersachsen',
  'Nordrhein-Westfalen': 'nrw', 'North Rhine-Westphalia': 'nrw',
  'Rheinland-Pfalz': 'rlp', 'Rhineland-Palatinate': 'rlp',
  'Saarland': 'saarland',
  'Sachsen': 'sachsen', 'Saxony': 'sachsen',
  'Sachsen-Anhalt': 'sachsen-anhalt', 'Saxony-Anhalt': 'sachsen-anhalt',
  'Schleswig-Holstein': 'sh',
  'Thüringen': 'thueringen', 'Thuringia': 'thueringen',
}))

// Curated ground truth — generation HARD-FAILS on any mismatch.
const CHECKLIST = {
  // 16 state capitals (+ München pilot city)
  '70173': 'bw', '80331': 'bayern', '10115': 'berlin', '14467': 'brandenburg',
  '28195': 'bremen', '20095': 'hamburg', '65185': 'hessen', '19053': 'mv',
  '30159': 'niedersachsen', '40213': 'nrw', '55116': 'rlp', '66111': 'saarland',
  '01067': 'sachsen', '39104': 'sachsen-anhalt', '24103': 'sh', '99084': 'thueringen',
  // The walk bug + the 0-block splits the old table glossed over
  '07743': 'thueringen', '07545': 'thueringen', '04109': 'sachsen',
  '06108': 'sachsen-anhalt', '03046': 'brandenburg', '08056': 'sachsen',
  '09111': 'sachsen', '98527': 'thueringen', '99734': 'thueringen',
  // Other known boundary cities
  '17291': 'brandenburg', '17489': 'mv', '18055': 'mv',
  '21335': 'niedersachsen', '22846': 'sh', '23552': 'sh',
  '27568': 'bremen', '26122': 'niedersachsen',
  '34117': 'hessen', '34414': 'nrw', '34346': 'niedersachsen',
  '37073': 'niedersachsen', '37213': 'hessen', '37308': 'thueringen',
  '49074': 'niedersachsen', '49477': 'nrw',
  '57072': 'nrw', '57610': 'rlp',
  '60311': 'hessen', '63065': 'hessen', '63739': 'bayern',
  '66849': 'rlp', '67059': 'rlp', '68159': 'bw', '69115': 'bw',
  '88131': 'bayern', '88045': 'bw', '89073': 'bw', '89231': 'bayern',
  '97070': 'bayern', '97877': 'bw',
  '50667': 'nrw', '54290': 'rlp', '79098': 'bw', '86150': 'bayern', '90402': 'bayern',
  // Curated tie resolutions (see CURATED_TIE_OVERRIDES)
  '69434': 'hessen', '12529': 'brandenburg', '59969': 'nrw', '65391': 'hessen', '07919': 'sachsen',
}

// The dataset contains exactly 5 PLZ where two states tie on row count —
// all genuinely cross-border. Resolve each to its DOMINANT settlement
// (the town the PLZ is canonically known by), audited 2026-06-12:
//   07919 Mühltroff/Pausa-Mühltroff (SN, ~5k) vs Kirschkau (TH, village)
//   12529 Schönefeld (BB, the airport town) vs Berlin border sliver
//   59969 Hallenberg (NW, town) vs Bromskirchen (HE, village)
//   65391 Lorch im Rheingau (HE, town) vs Sauerthal (RP, village)
//   69434 Hirschhorn am Neckar (HE, town) vs Heddesbach (BW, village)
// A future regeneration that surfaces NEW ties fails the checklist or
// the tie-guard below and forces a fresh curation decision.
const CURATED_TIE_OVERRIDES = {
  '07919': 'sachsen',
  '12529': 'brandenburg',
  '59969': 'nrw',
  '65391': 'hessen',
  '69434': 'hessen',
}

// ── load dataset ───────────────────────────────────────────────────────
let dePath = process.argv[2]
if (!dePath) {
  const dir = mkdtempSync(join(tmpdir(), 'geonames-de-'))
  execSync(`curl -sSL -o ${dir}/DE.zip https://download.geonames.org/export/zip/DE.zip && unzip -o -q ${dir}/DE.zip -d ${dir}`)
  dePath = `${dir}/DE.txt`
}
const rows = readFileSync(dePath, 'utf8').split('\n').filter(Boolean).map((l) => l.split('\t'))

// ── 1. per-PLZ majority state ──────────────────────────────────────────
const byPlz = new Map() // plz → Map(code → rowCount)
for (const r of rows) {
  const plz = r[1]
  const code = STATE_TO_CODE.get(r[3])
  if (!code || !/^\d{5}$/.test(plz)) continue
  if (!byPlz.has(plz)) byPlz.set(plz, new Map())
  const c = byPlz.get(plz)
  c.set(code, (c.get(code) ?? 0) + 1)
}
const plzState = new Map() // plz → code
const unresolvedTies = []
for (const [plz, counts] of byPlz) {
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1])
  if (sorted.length > 1 && sorted[0][1] === sorted[1][1]) {
    const curated = CURATED_TIE_OVERRIDES[plz]
    if (curated) plzState.set(plz, curated)
    else unresolvedTies.push(`${plz}: ${[...counts.keys()].join(' vs ')}`)
  } else {
    plzState.set(plz, sorted[0][0])
  }
}
if (unresolvedTies.length) {
  console.error('[gen-plz-bundesland] NEW uncurated tie PLZ — audit the dominant settlement and extend CURATED_TIE_OVERRIDES:')
  for (const t of unresolvedTies) console.error('  ' + t)
  process.exit(1)
}

// ── 2. minimal-depth prefix trie ───────────────────────────────────────
const entries = [] // [prefix, code]
function emit(prefix) {
  const codes = new Set()
  const members = []
  for (const [p, code] of plzState) if (p.startsWith(prefix)) { codes.add(code); members.push(p) }
  if (members.length === 0) return
  if (codes.size === 1) { entries.push([prefix, [...codes][0]]); return }
  if (prefix.length === 5) { entries.push([prefix, plzState.get(prefix)]); return }
  for (let d = 0; d <= 9; d++) emit(prefix + String(d))
}
for (let d = 0; d <= 9; d++) emit(String(d))

// ── 3. checklist validation (hard fail) ────────────────────────────────
function lookup(plz) {
  for (let len = 5; len >= 1; len--) {
    const hit = entries.find(([p]) => p === plz.slice(0, len))
    if (hit) return hit[1]
  }
  return null
}
const failures = []
for (const [plz, want] of Object.entries(CHECKLIST)) {
  const got = lookup(plz)
  if (got !== want) failures.push(`${plz}: want ${want}, derived ${got}`)
}
if (failures.length) {
  console.error('[gen-plz-bundesland] CHECKLIST FAIL:')
  for (const f of failures) console.error('  ' + f)
  process.exit(1)
}

// ── stats + write ──────────────────────────────────────────────────────
const depth = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
for (const [p] of entries) depth[p.length]++
const multiState = [...byPlz.entries()].filter(([, c]) => c.size > 1).length
entries.sort((a, b) => a[0].localeCompare(b[0]))

const body = entries.map(([p, c]) => `  '${p}': '${c}',`).join('\n')
const out = `// AUTO-GENERATED by scripts/gen-plz-bundesland.mjs — DO NOT EDIT BY HAND.
// fix/plz-detect (generated 2026-06-12).
//
// Longest-prefix PLZ → Bundesland table, derived from the GeoNames
// postal dataset (https://download.geonames.org/export/zip/DE.zip,
// CC-BY 4.0, fetched 2026-06-12; ${plzState.size} distinct PLZ).
// Minimal-depth: the shortest prefix under which every dataset PLZ
// agrees on one state — ${depth[1]}×1-digit, ${depth[2]}×2-digit, ${depth[3]}×3-digit,
// ${depth[4]}×4-digit, ${depth[5]}×5-digit entries (${entries.length} total).
// ${multiState} PLZ genuinely span a state border (e.g. 19273 Amt
// Neuhaus); they resolve to their majority side — the wizard's
// "Change if wrong" dropdown is the escape hatch for those.
// Validated at generation time against a ${Object.keys(CHECKLIST).length}-city ground-truth
// checklist (16 capitals + boundary cities); generation hard-fails on
// any mismatch. Regenerate: node scripts/gen-plz-bundesland.mjs
import type { BundeslandCode } from '@/legal/states/_types'

export const PLZ_PREFIX_TO_BUNDESLAND: Readonly<Record<string, BundeslandCode>> = {
${body}
}
`
writeFileSync('src/features/wizard/lib/plzBundesland.generated.ts', out)
console.log(`[gen-plz-bundesland] OK — ${entries.length} entries (1d:${depth[1]} 2d:${depth[2]} 3d:${depth[3]} 4d:${depth[4]} 5d:${depth[5]}), ${plzState.size} PLZ, ${multiState} cross-border PLZ, checklist ${Object.keys(CHECKLIST).length}/${Object.keys(CHECKLIST).length} ✓`)
