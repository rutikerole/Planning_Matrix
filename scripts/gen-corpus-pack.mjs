#!/usr/bin/env node
// ───────────────────────────────────────────────────────────────────────
// Phase B — codegen the compact corpus pack consumed by the app.
//
// Reads the hand-curated corpus (scripts/legal-corpus/states/*.json) and
// emits src/legal/corpusCitations.generated.ts — a TINY map (citation fields
// + procedure §§ per state, a few KB) the renderer reads SYNCHRONOUSLY. The
// full 1,544-§ corpus stays in scripts/ (verifier source of truth) and is
// NEVER bundled — only the canonical per-field picks ship.
//
// SELECTION = heading-semantic (pick the § whose official heading IS the
// field), NOT archetype-tag (which is overloaded). Procedure picks use
// ANCHORED regexes so "Baugenehmigungsverfahren" (regular) is NOT matched by
// "Vereinfachtes Baugenehmigungsverfahren" (simplified) — the substring trap.
// Only a clean, unambiguous match is emitted; everything else is omitted so
// the consumer falls back to its hand-verified value (no regression, no
// fabrication). BW + Niedersachsen use heterogeneous terminology → excluded
// entirely; they stay hand-coded (hybrid, per the Phase B decision).
//
// Citation-string format mirrors stateCitations.ts / stateLocalization.ts:
// Bayern is law-first ("BayBO Art. 60"); § states are marker-first
// ("§ 65 BauO NRW").
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

// stateCitations.ts §-citation fields → regex on the official heading.
const FIELDS = {
  abstandsFlaechenCitation: /Abstandsfl[äa]chen|Grenzabst/i,
  permitSubmissionCitation: /Bauvorlageberechtigung/i,
  structuralCertCitation: /^Bautechnische Nachweise/i,
  permitFormCitation: /^Bauantrag\b|^Bauantrag,/i,
  // Brandschutz § (MBO-aligned § 14 in most states; § 15 in RLP/Saarland/BW).
  // Anchored at start so "Brandschutztechnische…"/"Brandschutznachweis" (no
  // word boundary) cannot match; only "Brandschutz" / "Brandschutz, …" hits.
  brandschutzCitation: /^Brandschutz\b/i,
  // Sonderbau § (MBO § 50/51/53/54 by state; Bayern defines it in Art. 2 → no
  // dedicated heading → omitted; RLP absent). Used by the runtime citation
  // heading-gate (ITEM C) to catch a § cited for "Sonderbau" whose corpus
  // heading is NOT Sonderbauten.
  sonderbauCitation: /^Sonderbau/i,
}

// stateLocalization.ts procedure §§ → ANCHORED regex on the official heading.
// `regular` is end-anchored so it cannot match the simplified variant.
const PROC = {
  free: /^(Verfahrensfreie|Baugenehmigungsfreie|Genehmigungsfreie)\s+(Bauvorhaben|Baumaßnahmen|Vorhaben)/,
  freistellung: /^(Bau)?[Gg]enehmigungsfreistellung\b/,
  simplified: /^(Vereinfachtes|Einfaches)\s+(Bau)?[Gg]enehmigungsverfahren/,
  regular: /^Baugenehmigungsverfahren$/,
}

function pick(paragraphs, re) {
  const hits = Object.entries(paragraphs).filter(
    ([, p]) => p.heading_de_official && re.test(p.heading_de_official),
  )
  if (!hits.length) return null
  // base-number sort: e.g. "63" before "63a" → general § wins over a variant.
  hits.sort((a, b) => parseInt(a[0]) - parseInt(b[0]) || a[0].localeCompare(b[0]))
  return hits[0][0]
}

function citationString(lawShort, marker, num) {
  return marker === 'Art.' ? `${lawShort} ${marker} ${num}` : `${marker} ${num} ${lawShort}`
}

// Hybrid (Phase B): BW + Niedersachsen heterogeneous terminology → hand-coded.
const OVERRIDE_HANDCODED = new Set(['bw', 'niedersachsen'])

const cit = {}
const proc = {}
for (const f of (await readdir(STATES_DIR)).filter((x) => x.endsWith('.json')).sort()) {
  const j = JSON.parse(await readFile(join(STATES_DIR, f), 'utf-8'))
  const { bundesland, law_short, marker } = j._meta
  if (OVERRIDE_HANDCODED.has(bundesland)) continue
  const cEntry = {}
  for (const [field, re] of Object.entries(FIELDS)) {
    const num = pick(j.paragraphs, re)
    if (num) cEntry[field] = citationString(law_short, marker, num)
  }
  if (Object.keys(cEntry).length) cit[bundesland] = cEntry
  const pEntry = {}
  for (const [field, re] of Object.entries(PROC)) {
    const num = pick(j.paragraphs, re)
    if (num) pEntry[field] = citationString(law_short, marker, num)
  }
  if (Object.keys(pEntry).length) proc[bundesland] = pEntry
}

// ── Regression self-check: the two primary-source states MUST match the
// values stateCitations.ts / stateLocalization.ts have shipped. ──
const MUST_CIT = {
  bayern: { abstandsFlaechenCitation: 'BayBO Art. 6', permitSubmissionCitation: 'BayBO Art. 61', structuralCertCitation: 'BayBO Art. 62', permitFormCitation: 'BayBO Art. 64', brandschutzCitation: 'BayBO Art. 12' },
  nrw: { abstandsFlaechenCitation: '§ 6 BauO NRW', permitSubmissionCitation: '§ 67 BauO NRW', structuralCertCitation: '§ 68 BauO NRW', permitFormCitation: '§ 70 BauO NRW', brandschutzCitation: '§ 14 BauO NRW' },
}
const MUST_PROC = {
  bayern: { free: 'BayBO Art. 57', simplified: 'BayBO Art. 59', regular: 'BayBO Art. 60' },
  nrw: { free: '§ 62 BauO NRW', simplified: '§ 64 BauO NRW', regular: '§ 65 BauO NRW' },
}
for (const [code, fields] of Object.entries(MUST_CIT))
  for (const [k, v] of Object.entries(fields))
    if (cit[code]?.[k] !== v) throw new Error(`[gen-corpus-pack] cit regression: ${code}.${k} = ${cit[code]?.[k]} (expected ${v})`)
for (const [code, fields] of Object.entries(MUST_PROC))
  for (const [k, v] of Object.entries(fields))
    if (proc[code]?.[k] !== v) throw new Error(`[gen-corpus-pack] proc regression: ${code}.${k} = ${proc[code]?.[k]} (expected ${v})`)

const body = `// ───────────────────────────────────────────────────────────────────────
// GENERATED FILE — do not edit by hand.
//   source: scripts/legal-corpus/states/*.json
//   regen:  npm run gen:corpus-pack   ·   gate: npm run verify:corpus-pack
//
// Heading-semantic canonical picks from the primary/secondary-verified corpus.
//   STATE_CORPUS_CITATIONS → src/legal/stateCitations.ts (per-field overlay)
//   STATE_CORPUS_PROCEDURE → src/legal/stateLocalization.ts (stub overlay)
// Per-field fallback: corpus value wins where present, hand-coded otherwise.
// Absent fields/states (BW/Niedersachsen; RLP regular+structural) stay
// hand-coded — never a fabricated §.
// ───────────────────────────────────────────────────────────────────────

import type { BundeslandCode } from './states/_types'

export interface CorpusCitationFields {
  abstandsFlaechenCitation?: string
  permitSubmissionCitation?: string
  structuralCertCitation?: string
  permitFormCitation?: string
  brandschutzCitation?: string
  sonderbauCitation?: string
}

export interface CorpusProcedureFields {
  free?: string
  freistellung?: string
  simplified?: string
  regular?: string
}

export const STATE_CORPUS_CITATIONS: Partial<Record<BundeslandCode, CorpusCitationFields>> = ${JSON.stringify(cit, null, 2)} as const

export const STATE_CORPUS_PROCEDURE: Partial<Record<BundeslandCode, CorpusProcedureFields>> = ${JSON.stringify(proc, null, 2)} as const
`

const nCit = Object.keys(cit).length
const nProc = Object.keys(proc).length
const rel = OUT.replace(REPO_ROOT + '/', '')

if (process.argv.includes('--check')) {
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
  console.log(`[verify:corpus-pack] OK — ${rel} in sync (cit ${nCit} states · proc ${nProc} states).`)
  process.exit(0)
}

await writeFile(OUT, body, 'utf-8')
console.log(`[gen-corpus-pack] wrote ${rel}`)
console.log(`[gen-corpus-pack] citations ${nCit} states · procedure ${nProc} states · self-checks OK`)
