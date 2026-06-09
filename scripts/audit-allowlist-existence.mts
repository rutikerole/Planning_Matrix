#!/usr/bin/env -S npx tsx
// ───────────────────────────────────────────────────────────────────────
// T-03 sprint — Allow-list EXISTENCE sweep (Priority 0 gate-hardening).
//
// The Layer-C runtime firewall (chat-turn/citationLint.ts) trusts every §/Art
// in a state's `allowedCitations` as canonical: a citation that matches the
// allow-list is NEVER downgraded. So a FABRICATED § sitting in an allow-list
// for an in-corpus law would be silently waved through at runtime — the exact
// "someone put a fake § in the allow-list" failure mode.
//
// `verify-citations.mjs` already existence-checks every §/Art that APPEARS in
// src/legal source, but its extractor only sees laws that are in the corpus,
// and it scans free prose — it is NOT a dedicated, state-complete audit of the
// allow-list arrays specifically. This script is: for EACH of the 16 states it
// walks `resolveStateDelta(code).allowedCitations` and asserts every entry
// resolves to (a) an existing § in that state's OWN Bauordnung, (b) an existing
// § in a federal law (BauGB/BauNVO/GEG), or (c) an explicitly ACKNOWLEDGED
// out-of-corpus law (monument / Stellplatz / fee ordinances we have not
// ingested — reported, never silently passed).
//
// FAILS (exit 1) on:
//   • MISSING     — in-corpus law, § not in corpus (fabricated / wrong-number).
//   • CROSS_STATE — entry cites another Bundesland's building law.
//   • UNKNOWN_LAW — law neither in corpus nor acknowledged (typo / invented).
// REPORTS (exit 0) on:
//   • UNCHECKABLE — acknowledged out-of-corpus law (corpus gap, prioritise).
//   • NON_NUMERIC — references an in-corpus law with no §/Art number (annex).
//
// Run: npx tsx scripts/audit-allowlist-existence.mts   (npm run audit:allowlist)
// ───────────────────────────────────────────────────────────────────────

import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { listRegisteredStates, resolveStateDelta } from '../src/legal/legalRegistry.ts'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CORPUS = join(ROOT, 'scripts/legal-corpus')

// ── Corpus registry: law_short -> Set<num> ────────────────────────────────
const corpus = new Map<string, Set<string>>()
function addLaw(short: string, paragraphs: Record<string, unknown> | undefined): void {
  const s = corpus.get(short) ?? new Set<string>()
  for (const num of Object.keys(paragraphs ?? {})) s.add(num.toLowerCase())
  corpus.set(short, s)
}
const fed = JSON.parse(readFileSync(join(CORPUS, 'federal.json'), 'utf8')) as {
  laws: Record<string, { paragraphs: Record<string, unknown> }>
}
for (const [short, law] of Object.entries(fed.laws)) addLaw(short, law.paragraphs)
const FEDERAL = new Set(Object.keys(fed.laws))

const stateLawShort = new Map<string, string>() // bundesland code -> law_short
for (const f of readdirSync(join(CORPUS, 'states')).filter((x) => x.endsWith('.json'))) {
  const st = JSON.parse(readFileSync(join(CORPUS, 'states', f), 'utf8')) as {
    _meta: { law_short: string; bundesland?: string }
    paragraphs: Record<string, unknown>
  }
  addLaw(st._meta.law_short, st.paragraphs)
  stateLawShort.set(st._meta.bundesland ?? f.replace(/\.json$/, ''), st._meta.law_short)
}

// Every recognisable building/federal law short, longest-first so "LBO SH"
// wins over "LBO" (catches cross-state bleed instead of mis-resolving to own).
const RECOGNISABLE = [...corpus.keys()].sort((a, b) => b.length - a.length)

// Real laws deliberately NOT ingested into the §-corpus. SINGLE SOURCE OF TRUTH:
// scripts/legal-corpus/_meta/acknowledged-out-of-corpus.json (Phase 4). Citations
// to a REGISTERED law are UNVERIFIABLE-acknowledged (reported, never failed); an
// out-of-corpus citation whose law is NOT registered is an error (UNKNOWN_LAW) —
// it must be added to the registry with justification, or removed.
const ACK_REGISTRY = JSON.parse(
  readFileSync(join(ROOT, 'scripts/legal-corpus/_meta/acknowledged-out-of-corpus.json'), 'utf8'),
) as { laws: Record<string, { reason: string }> }
const ACKNOWLEDGED: Array<{ rx: RegExp; why: string }> = Object.entries(ACK_REGISTRY.laws).map(
  ([law, v]) => ({ rx: new RegExp(`\\b${law.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i'), why: v.reason }),
)

const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const lawPresent = (entry: string, law: string): boolean =>
  new RegExp(`(?:^|[^A-Za-zÄÖÜäöüß0-9])${escapeRe(law)}(?:$|[^A-Za-zÄÖÜäöüß0-9])`).test(entry)
const anchorNum = (entry: string): string | null =>
  entry.match(/(?:§§?|Art\.?|Anlage)\s*(\d+[a-z]?)/i)?.[1]?.toLowerCase() ?? null

type Kind = 'MISSING' | 'CROSS_STATE' | 'UNKNOWN_LAW' | 'UNCHECKABLE' | 'NON_NUMERIC'
interface Finding { code: string; entry: string; kind: Kind; detail: string }
const findings: Finding[] = []
const perState: Record<string, { ok: number; uncheckable: number }> = {}
let okTotal = 0

for (const code of listRegisteredStates()) {
  const own = stateLawShort.get(code)
  perState[code] = { ok: 0, uncheckable: 0 }
  for (const entry of resolveStateDelta(code).allowedCitations) {
    const law = RECOGNISABLE.find((l) => lawPresent(entry, l))
    if (law) {
      if (law !== own && !FEDERAL.has(law)) {
        findings.push({ code, entry, kind: 'CROSS_STATE', detail: `cites ${law} — another Bundesland's building law` })
        continue
      }
      const num = anchorNum(entry)
      if (!num) {
        findings.push({ code, entry, kind: 'NON_NUMERIC', detail: `references ${law} without a §/Art number (annex/structural ref)` })
        continue
      }
      if (corpus.get(law)!.has(num)) { perState[code].ok++; okTotal++; continue }
      findings.push({ code, entry, kind: 'MISSING', detail: `${law} § ${num} NOT in corpus — fabricated or wrong-number in allow-list` })
      continue
    }
    const ack = ACKNOWLEDGED.find((a) => a.rx.test(entry))
    if (ack) { findings.push({ code, entry, kind: 'UNCHECKABLE', detail: ack.why }); perState[code].uncheckable++; continue }
    findings.push({ code, entry, kind: 'UNKNOWN_LAW', detail: 'law not in corpus, not acknowledged, not a known state law' })
  }
}

// ── Report ────────────────────────────────────────────────────────────────
console.log('[audit:allowlist-existence] sweeping allowedCitations for all 16 states against the §-corpus\n')
const blocking = findings.filter((f) => f.kind === 'MISSING' || f.kind === 'CROSS_STATE' || f.kind === 'UNKNOWN_LAW')
const uncheckable = findings.filter((f) => f.kind === 'UNCHECKABLE')
const nonNumeric = findings.filter((f) => f.kind === 'NON_NUMERIC')

console.log(`Verified ${okTotal} allow-list §/Art against the corpus across ${listRegisteredStates().length} states.`)
console.log(
  `Per state (ok · uncheckable): ` +
    listRegisteredStates().map((c) => `${c} ${perState[c].ok}·${perState[c].uncheckable}`).join('  '),
)

if (uncheckable.length) {
  console.log(`\nℹ ${uncheckable.length} UNCHECKABLE entr(y/ies) — acknowledged out-of-corpus law (corpus gap, not a failure):`)
  for (const f of uncheckable) console.log(`  • [${f.code}] ${f.entry} — ${f.detail}`)
}
if (nonNumeric.length) {
  console.log(`\nℹ ${nonNumeric.length} NON-NUMERIC entr(y/ies) — annex/structural reference, no § to existence-check:`)
  for (const f of nonNumeric) console.log(`  • [${f.code}] ${f.entry} — ${f.detail}`)
}
if (blocking.length) {
  console.log(`\n⚠ ${blocking.length} BLOCKING finding(s) — a non-existent / wrong-state § is in an allow-list and would be trusted at runtime:`)
  for (const f of blocking) console.log(`  ✗ [${f.code}] ${f.entry} — ${f.kind}: ${f.detail}`)
  console.log('\n[audit:allowlist-existence] FAIL — remove/correct the entries above (or, for a real new §, add it to the corpus first).')
  process.exit(1)
}

console.log('\n[audit:allowlist-existence] OK — every existence-checkable allow-list §/Art resolves to the corpus; no fabricated or cross-state entries.')
process.exit(0)
