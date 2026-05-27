#!/usr/bin/env node
// ───────────────────────────────────────────────────────────────────────
// Phase B — codegen the compact corpus citation pack consumed by the app.
//
// Reads the hand-curated corpus (scripts/legal-corpus/states/*.json) and
// emits src/legal/corpusCitations.generated.ts — a TINY map (4 citation
// fields × 16 states, a few KB) the renderer reads SYNCHRONOUSLY. The full
// 1,544-§ corpus stays in scripts/ (verifier source of truth) and is NEVER
// bundled — only the canonical per-field picks ship.
//
// SELECTION = heading-semantic (pick the § whose official heading IS the
// field), NOT archetype-tag (which is overloaded: `bautechnische_nachweise`
// sits on both § Standsicherheit and § Bautechnische-Nachweise). Only a
// clean, unambiguous heading match is emitted; everything else is omitted so
// stateCitations.ts falls back to its hand-verified value (no regression, no
// fabrication). BW / Niedersachsen / RLP use heterogeneous terminology where
// the heading does not map — those fields are intentionally absent here and
// stay hand-coded (hybrid, per the Phase B decision).
//
// Citation-string format mirrors stateCitations.ts: Bayern is law-first
// ("BayBO Art. 64"); § states are marker-first ("§ 70 BauO NRW").
//
// Run: node scripts/gen-corpus-pack.mjs   (npm run gen:corpus-pack)
// Gate: npm run verify:corpus-pack regenerates and diffs (drift guard).
// ───────────────────────────────────────────────────────────────────────

import { readFile, readdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(__dirname, '..')
const STATES_DIR = join(REPO_ROOT, 'scripts', 'legal-corpus', 'states')
const OUT = join(REPO_ROOT, 'src', 'legal', 'corpusCitations.generated.ts')

// field → regex on the official heading. Each must select ONE § unambiguously.
const FIELDS = {
  abstandsFlaechenCitation: /Abstandsfl[äa]chen|Grenzabst/i,
  permitSubmissionCitation: /Bauvorlageberechtigung/i,
  structuralCertCitation: /^Bautechnische Nachweise/i,
  permitFormCitation: /^Bauantrag\b|^Bauantrag,/i,
}

function pick(paragraphs, re) {
  const hits = Object.entries(paragraphs).filter(
    ([, p]) => p.heading_de_official && re.test(p.heading_de_official),
  )
  if (!hits.length) return null
  hits.sort((a, b) => parseInt(a[0]) - parseInt(b[0]) || a[0].localeCompare(b[0]))
  return hits[0][0] // base number key (e.g. "62", "62a")
}

function citationString(lawShort, marker, num) {
  // Bayern: "BayBO Art. 64"; § states: "§ 70 BauO NRW".
  return marker === 'Art.' ? `${lawShort} ${marker} ${num}` : `${marker} ${num} ${lawShort}`
}

// Hybrid (Phase B decision): BW + Niedersachsen use heterogeneous BauO
// terminology where the heading does not map cleanly to the renderer fields
// (BW: "Entwurfsverfasser"/no "Bautechnische Nachweise"; NI: no
// "Bauvorlageberechtigung" heading, permit-form §64 vs §67 ambiguity). Their
// hand-verified citations in stateCitations.ts stay authoritative — excluded
// here so no corpus value overrides them. Documented for a Phase-C primary
// upgrade in scripts/legal-corpus/_meta/unverified.json.
const OVERRIDE_HANDCODED = new Set(['bw', 'niedersachsen'])

const pack = {}
for (const f of (await readdir(STATES_DIR)).filter((x) => x.endsWith('.json')).sort()) {
  const j = JSON.parse(await readFile(join(STATES_DIR, f), 'utf-8'))
  const { bundesland, law_short, marker } = j._meta
  if (OVERRIDE_HANDCODED.has(bundesland)) continue
  const entry = {}
  for (const [field, re] of Object.entries(FIELDS)) {
    const num = pick(j.paragraphs, re)
    if (num) entry[field] = citationString(law_short, marker, num)
  }
  if (Object.keys(entry).length) pack[bundesland] = entry
}

// ── Regression self-check: the two primary-source states MUST match the
// values stateCitations.ts has shipped. If the corpus drifts, fail loudly. ──
const MUST = {
  bayern: {
    abstandsFlaechenCitation: 'BayBO Art. 6',
    permitSubmissionCitation: 'BayBO Art. 61',
    structuralCertCitation: 'BayBO Art. 62',
    permitFormCitation: 'BayBO Art. 64',
  },
  nrw: {
    abstandsFlaechenCitation: '§ 6 BauO NRW',
    permitSubmissionCitation: '§ 67 BauO NRW',
    structuralCertCitation: '§ 68 BauO NRW',
    permitFormCitation: '§ 70 BauO NRW',
  },
}
for (const [code, fields] of Object.entries(MUST))
  for (const [k, v] of Object.entries(fields))
    if (pack[code]?.[k] !== v)
      throw new Error(`[gen-corpus-pack] regression: ${code}.${k} = ${pack[code]?.[k]} (expected ${v})`)

const body = `// ───────────────────────────────────────────────────────────────────────
// GENERATED FILE — do not edit by hand.
//   source: scripts/legal-corpus/states/*.json
//   regen:  npm run gen:corpus-pack   ·   gate: npm run verify:corpus-pack
//
// Canonical per-state citation picks, heading-semantic-selected from the
// primary/secondary-verified corpus. Consumed by src/legal/stateCitations.ts
// (per-field fallback: corpus value wins where present, hand-coded otherwise).
// Absent fields (BW/Niedersachsen/RLP terminology outliers) stay hand-coded.
// ───────────────────────────────────────────────────────────────────────

import type { BundeslandCode } from './states/_types'

export interface CorpusCitationFields {
  abstandsFlaechenCitation?: string
  permitSubmissionCitation?: string
  structuralCertCitation?: string
  permitFormCitation?: string
}

export const STATE_CORPUS_CITATIONS: Partial<Record<BundeslandCode, CorpusCitationFields>> = ${JSON.stringify(
  pack,
  null,
  2,
)} as const
`

const n = Object.keys(pack).length
const fields = Object.values(pack).reduce((s, e) => s + Object.keys(e).length, 0)
const rel = OUT.replace(REPO_ROOT + '/', '')

if (process.argv.includes('--check')) {
  // Drift gate: the committed generated file must equal a fresh generation.
  let current = ''
  try {
    current = await readFile(OUT, 'utf-8')
  } catch {
    console.error(`[verify:corpus-pack] FAIL — ${rel} missing. Run: npm run gen:corpus-pack`)
    process.exit(1)
  }
  if (current !== body) {
    console.error(`[verify:corpus-pack] FAIL — ${rel} is stale vs scripts/legal-corpus/. Run: npm run gen:corpus-pack`)
    process.exit(1)
  }
  console.log(`[verify:corpus-pack] OK — ${rel} in sync (${n} states · ${fields} fields).`)
  process.exit(0)
}

await writeFile(OUT, body, 'utf-8')
console.log(`[gen-corpus-pack] wrote ${rel}`)
console.log(`[gen-corpus-pack] ${n} states · ${fields} citation fields · regression self-check OK`)
