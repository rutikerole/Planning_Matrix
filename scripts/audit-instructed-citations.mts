#!/usr/bin/env -S npx tsx
// ───────────────────────────────────────────────────────────────────────
// T-05 sprint Phase 2 — INSTRUCTED-§§ vs ALLOWLIST gate.
//
// The § 51 NBauO class: the NI×T-04 stateOverride INSTRUCTED the persona to
// cite § 51 ("Sonderbau-Tatbestand der neuen Nutzung, § 51 NBauO"), but the §
// was never added to NI's ALLOWED_CITATIONS — so the runtime citation
// firewall (citationLint) flagged "citation not in allow-list" on EVERY
// compliant walk. Same family: § 85a NBauO (instructed for Umbau routing).
//
// This gate closes the class: every OWN-STATE § that our own prompt content
// (state systemBlock/cityBlock + every TEMPLATE_STATE_OVERRIDES cell + the
// Bayern-grounded template BLOCKS against Bayern's allowlist) instructs the
// persona to cite MUST be in that state's ALLOWED_CITATIONS.
//
// Scope notes (v1):
//   • OWN-STATE §§ only — federal (BauGB/GEG/…) instructions are a future
//     extension; cross-state mentions are the bleed-guard's domain.
//   • ✗-prefixed lines (FALSCHE/VERBOTENE ZITATE entries) are NEGATIVE
//     instructions ("never cite this") and are skipped.
//   • Match granularity is the BASE § number (an instructed "§ 2 Abs. 5"
//     is satisfied by an allowlisted "§ 2 Abs. 5 …" OR a bare "§ 2 …") —
//     lenient by design; the failure class is a base number missing entirely.
//
// Run: npx tsx scripts/audit-instructed-citations.mts
// Gate: exits 1 on any instructed-but-not-allowlisted §.
// ───────────────────────────────────────────────────────────────────────

import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { listRegisteredStates, resolveStateDelta } from '../src/legal/legalRegistry.ts'
import { TEMPLATE_STATE_OVERRIDES } from '../src/legal/templates/stateOverrides.ts'
import { BLOCKS } from '../src/legal/templates/index.ts'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CORPUS = join(ROOT, 'scripts/legal-corpus')

// bundesland code -> law_short (from the corpus _meta, the single source).
const stateLawShort = new Map<string, string>()
for (const f of readdirSync(join(CORPUS, 'states')).filter((x) => x.endsWith('.json'))) {
  const st = JSON.parse(readFileSync(join(CORPUS, 'states', f), 'utf8')) as {
    _meta: { law_short: string; bundesland?: string }
  }
  stateLawShort.set(st._meta.bundesland ?? f.replace(/\.json$/, ''), st._meta.law_short)
}

const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Strip ✗-prefixed lines — negative instructions ("never cite this"). */
function positiveLines(text: string): string {
  return text
    .split('\n')
    .filter((l) => !l.trimStart().startsWith('✗'))
    .join('\n')
}

/** Extract own-state base §-numbers from instructed text. Handles
 *  marker-first ("§ 51 NBauO", "§ 67 Abs. 3 HBO"), law-first strukturmarker
 *  ("NBauO § 5") and Bayern Art. ("BayBO Art. 57", "Art. 57 BayBO"). */
function extractInstructed(text: string, lawShort: string): Set<string> {
  const out = new Set<string>()
  const law = escapeRe(lawShort)
  if (/BayBO/i.test(lawShort)) {
    for (const m of text.matchAll(new RegExp(`${law}\\s+Art\\.?\\s*(\\d+[a-z]?)`, 'gi'))) out.add(m[1].toLowerCase())
    for (const m of text.matchAll(new RegExp(`Art\\.?\\s*(\\d+[a-z]?)\\s+${law}`, 'gi'))) out.add(m[1].toLowerCase())
    return out
  }
  for (const m of text.matchAll(new RegExp(`§\\s*(\\d+[a-z]?)(?:\\s+Abs\\.\\s*\\d+)?\\s+${law}(?![\\wÄÖÜäöü-])`, 'g'))) out.add(m[1].toLowerCase())
  for (const m of text.matchAll(new RegExp(`${law}\\s+§\\s*(\\d+[a-z]?)`, 'g'))) out.add(m[1].toLowerCase())
  return out
}

/** Allowlisted base §-numbers for a state's own law. */
function allowedNums(allow: ReadonlyArray<string>, lawShort: string): Set<string> {
  const out = new Set<string>()
  const law = escapeRe(lawShort)
  for (const entry of allow) {
    // marker-first with arbitrary Abs./Nr. interleave: "§ 67 Abs. 3 HBO",
    // "Art. 57 Abs. 1 Nr. 1 a BayBO" — base number is what we key on.
    let m = entry.match(new RegExp(`^§\\s*(\\d+[a-z]?)(?:\\s+Abs\\..*)?\\s+${law}$`))
    if (!m && /BayBO/i.test(lawShort)) m = entry.match(/^Art\.?\s*(\d+[a-z]?)(?:\s+Abs\..*)?\s+BayBO$/)
    if (m) out.add(m[1].toLowerCase())
  }
  return out
}

interface Violation { state: string; src: string; section: string }
const violations: Violation[] = []
let checkedStates = 0
let checkedNums = 0

for (const code of listRegisteredStates()) {
  const delta = resolveStateDelta(code)
  const lawShort = stateLawShort.get(code)
  if (!delta || !lawShort) continue
  checkedStates++
  const allow = allowedNums(delta.allowedCitations, lawShort)

  const sources: Array<[string, string]> = [
    ['systemBlock', delta.systemBlock ?? ''],
    ['cityBlock', (delta as { cityBlock?: string }).cityBlock ?? ''],
  ]
  for (const [tpl, cells] of Object.entries(TEMPLATE_STATE_OVERRIDES)) {
    const cell = (cells as Record<string, string | null>)[code]
    if (cell) sources.push([`stateOverrides ${tpl}`, cell])
  }
  // The Bayern-grounded template BLOCKS are part of BAYERN's prompt only
  // (other states' anti-leak overrides redirect away from BayBO citations).
  if (code === 'bayern') {
    for (const [tpl, block] of Object.entries(BLOCKS)) sources.push([`template BLOCK ${tpl}`, block as string])
  }

  for (const [src, text] of sources) {
    if (!text) continue
    const instructed = extractInstructed(positiveLines(text), lawShort)
    for (const num of instructed) {
      checkedNums++
      if (!allow.has(num)) {
        violations.push({ state: code, src, section: `§/Art. ${num} ${lawShort}` })
      }
    }
  }
}

console.log(`[audit:instructed-citations] ${checkedStates} states · ${checkedNums} instructed own-state §§ checked against allowlists.`)
if (violations.length) {
  console.error(`\n✗ ${violations.length} INSTRUCTED-BUT-NOT-ALLOWLISTED §§ — our own prompt content instructs a citation the runtime firewall will flag on every compliant walk:`)
  for (const v of violations) console.error(`  ${v.state} · ${v.section} · instructed in ${v.src}`)
  console.error('\nFix: corpus-verify the § heading (the § 51 protocol), then add it to the state ALLOWED_CITATIONS — or correct the instruction if the § is wrong.')
  process.exit(1)
}
console.log('[audit:instructed-citations] OK — every instructed own-state § is allowlisted.')
