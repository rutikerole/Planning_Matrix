#!/usr/bin/env -S npx tsx
// ───────────────────────────────────────────────────────────────────────
// T-03 sprint (P2) — Concept→§ canonical pinning gate.
//
// The T-03 walk shipped Bauvorlageberechtigung as BOTH § 63 LBO BW (systemBlock
// prose) and § 43 LBO BW (the structured permitSubmissionCitation that feeds the
// Team tab / PDF / DoNext) — same concept, two §§, no contradiction flag. Root
// cause: § 43 LBO BW is "Entwurfsverfasser" (design author), not the
// Bauvorlageberechtigung (who may sign/submit). The two are distinct §§ in BW.
//
// This gate pins each high-frequency concept field in the StateCitationPack to
// the corpus heading of the RIGHT concept, so the field can never silently drift
// to a neighbouring §. It is the "concept→§ canonical map" enforced as a check.
//
// THE anti-drift rule for permitSubmissionCitation: if a state's corpus contains
// a § whose heading IS "Bauvorlageberechtigung", the field MUST point at it —
// pointing at the Entwurfsverfasser § (BW § 43, the bug) FAILS. States whose
// BauO has no separate Bauvorlageberechtigung § and frame the entitlement under
// "Entwurfsverfasser" (Niedersachsen NBauO § 53) are accepted via that fallback.
//
// Run: npx tsx scripts/verify-concept-citations.mts   (npm run verify:concept-citations)
// ───────────────────────────────────────────────────────────────────────

import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { listRegisteredStates } from '../src/legal/legalRegistry.ts'
import { getStateCitations } from '../src/legal/stateCitations.ts'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CORPUS = join(ROOT, 'scripts/legal-corpus')

// ── Corpus: law_short -> Map<num, heading> ────────────────────────────────
const corpus = new Map<string, Map<string, string>>()
function addLaw(short: string, paragraphs: Record<string, { heading_de_official?: string }>): void {
  const m = corpus.get(short) ?? new Map<string, string>()
  for (const [num, p] of Object.entries(paragraphs ?? {})) m.set(num.toLowerCase(), p?.heading_de_official ?? '')
  corpus.set(short, m)
}
const fed = JSON.parse(readFileSync(join(CORPUS, 'federal.json'), 'utf8')) as {
  laws: Record<string, { paragraphs: Record<string, { heading_de_official?: string }> }>
}
for (const [short, law] of Object.entries(fed.laws)) addLaw(short, law.paragraphs)
for (const f of readdirSync(join(CORPUS, 'states')).filter((x) => x.endsWith('.json'))) {
  const st = JSON.parse(readFileSync(join(CORPUS, 'states', f), 'utf8')) as {
    _meta: { law_short: string }
    paragraphs: Record<string, { heading_de_official?: string }>
  }
  addLaw(st._meta.law_short, st.paragraphs)
}
const RECOGNISABLE = [...corpus.keys()].sort((a, b) => b.length - a.length)
const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Resolve a citation string ("§ 63 LBO BW", "BayBO Art. 61") to its corpus
// heading, or null if the law isn't in the corpus / the § doesn't exist.
function headingFor(citation: string): { law: string; num: string; heading: string } | null {
  const law = RECOGNISABLE.find((l) =>
    new RegExp(`(?:^|[^A-Za-zÄÖÜäöüß0-9])${escapeRe(l)}(?:$|[^A-Za-zÄÖÜäöüß0-9])`).test(citation),
  )
  if (!law) return null
  const num = citation.match(/(?:§§?|Art\.?)\s*(\d+[a-z]?)/i)?.[1]?.toLowerCase()
  if (!num) return null
  const heading = corpus.get(law)!.get(num)
  if (heading == null) return null
  return { law, num, heading }
}
function corpusHasHeading(law: string, rx: RegExp): boolean {
  const m = corpus.get(law)
  if (!m) return false
  for (const h of m.values()) if (rx.test(h)) return true
  return false
}

// ── Concept rules ─────────────────────────────────────────────────────────
const BAUVORLAGEBERECHTIGUNG = /Bauvorlageberechtigung/i
const ENTWURFSVERFASSER = /Entwurfsverfasser/i
const PERMIT_FORM = /Bauantrag|Bauvorlagen/i
const STRUCTURAL = /Standsicherheit|Bautechnische Nachweise|bautechnische/i

interface Finding { code: string; field: string; citation: string; detail: string }
const findings: Finding[] = []
const uncheckable: Finding[] = []
let okCount = 0

function checkConcept(
  code: string,
  field: string,
  citation: string,
  expected: RegExp,
  label: string,
  // For permitSubmission: if the law HAS a Bauvorlageberechtigung §, the
  // Entwurfsverfasser fallback is NOT allowed (catches the BW § 43 bug).
  opts?: { strictPreferredRx?: RegExp },
): void {
  const r = headingFor(citation)
  if (!r) { uncheckable.push({ code, field, citation, detail: 'law/§ not in corpus — heading unverifiable' }); return }
  if (opts?.strictPreferredRx && corpusHasHeading(r.law, opts.strictPreferredRx) && !opts.strictPreferredRx.test(r.heading)) {
    findings.push({
      code, field, citation,
      detail: `${r.law} § ${r.num} is "${r.heading}" — but ${r.law} HAS a Bauvorlageberechtigung §; ${field} must point at it, not at this`,
    })
    return
  }
  if (!expected.test(r.heading)) {
    findings.push({ code, field, citation, detail: `${r.law} § ${r.num} is "${r.heading}" — not a ${label} §` })
    return
  }
  okCount++
}

for (const code of listRegisteredStates()) {
  const pack = getStateCitations(code)
  if (!pack.isSubstantive) continue
  checkConcept(code, 'permitFormCitation', pack.permitFormCitation, PERMIT_FORM, 'permit-application-form')
  // Bauvorlageberechtigung primary; Entwurfsverfasser accepted ONLY where the
  // BauO has no separate Bauvorlageberechtigung § (strictPreferredRx enforces).
  checkConcept(
    code, 'permitSubmissionCitation', pack.permitSubmissionCitation,
    new RegExp(`${BAUVORLAGEBERECHTIGUNG.source}|${ENTWURFSVERFASSER.source}`, 'i'),
    'Bauvorlageberechtigung/Entwurfsverfasser',
    { strictPreferredRx: BAUVORLAGEBERECHTIGUNG },
  )
  checkConcept(code, 'structuralCertCitation', pack.structuralCertCitation, STRUCTURAL, 'Standsicherheit/bautechnische-Nachweise')
}

// ── BW canonical structural pair (T-03 sprint, user choice) — § 13 + § 27f ──
const lboNums = corpus.get('LBO')
const pairOk =
  !!lboNums &&
  /Standsicherheit/i.test(lboNums.get('13') ?? '') &&
  /Bestand|tragende/i.test(lboNums.get('27f') ?? '')

// ── Report ────────────────────────────────────────────────────────────────
console.log('[verify:concept-citations] pinning concept→§ fields to corpus headings (substantive states)\n')
console.log(`Verified ${okCount} concept-citation field(s) against corpus headings.`)
console.log(
  `BW structural canonical pair § 13 (${lboNums?.get('13') ?? '—'}) + § 27f present: ${pairOk ? '✓' : '✗'}`,
)
if (uncheckable.length) {
  console.log(`\nℹ ${uncheckable.length} uncheckable (law not in corpus — e.g. BauuntPrüfVO):`)
  for (const f of uncheckable) console.log(`  • [${f.code}] ${f.field} = ${f.citation} — ${f.detail}`)
}
if (findings.length || !pairOk) {
  if (findings.length) {
    console.log(`\n⚠ ${findings.length} CONCEPT-DRIFT finding(s) — a concept field points at the wrong § (same-concept/two-§ class):`)
    for (const f of findings) console.log(`  ✗ [${f.code}] ${f.field} = ${f.citation} — ${f.detail}`)
  }
  if (!pairOk) console.log('\n  ✗ BW structural canonical pair (§ 13 Standsicherheit + § 27f Bestand) not both present in corpus')
  console.log('\n[verify:concept-citations] FAIL')
  process.exit(1)
}
console.log('\n[verify:concept-citations] OK — every substantive concept field resolves to the correct corpus concept; BW § 13 + § 27f pair pinned.')
process.exit(0)
