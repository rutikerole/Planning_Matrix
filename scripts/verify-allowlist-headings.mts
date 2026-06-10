#!/usr/bin/env -S npx tsx
// ───────────────────────────────────────────────────────────────────────
// verify:allowlist-headings — AUTHORING-DRIFT guard (build-time, frontend).
//
// Asserts that every §/Art in every state's authored `allowedCitations`
// resolves to a real corpus entry that carries a NON-EMPTY
// `heading_de_official`. Existence (does the § number exist) is already
// covered by audit:allowlist; this adds the HEADING-PRESENCE dimension so a
// corpus entry that exists but was ingested without an official heading can't
// silently back an allowlisted citation (the heading is what every heading-
// match check — verify-concept-citations — relies on).
//
// SCOPE — READ THIS BEFORE ASSUMING IT CLOSES THE RUNTIME HOLE:
//   This guard covers AUTHORED allowlist content ONLY. It does NOT — and
//   cannot, at build time — cover RUNTIME persona-emitted citations. The
//   persona can free-emit a § in chat prose or a structured rationale that
//   never appears in any allowlist; enforceCitationAllowList only checks
//   (law, number) membership and citationLint is observability-only, so a
//   persona-emitted §↔topic mismatch is NOT heading-matched anywhere today.
//   Closing that is the separate "#1 runtime citation heading gate" campaign
//   (edge-fn) — see docs/RUNTIME_CITATION_HEADING_GATE.md. Do not mistake a
//   green run here for runtime heading coverage.
//
// Out-of-corpus (acknowledged), cross-state and non-numeric allowlist entries
// are audit:allowlist's responsibility and are skipped here.
//
// Run: npx tsx scripts/verify-allowlist-headings.mts (npm run verify:allowlist-headings)
// ───────────────────────────────────────────────────────────────────────

import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { listRegisteredStates, resolveStateDelta } from '../src/legal/legalRegistry.ts'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CORPUS = join(ROOT, 'scripts/legal-corpus')

// law_short -> (num -> heading_de_official)
const corpus = new Map<string, Map<string, string>>()
function addLaw(short: string, paragraphs: Record<string, { heading_de_official?: string }> | undefined): void {
  const m = corpus.get(short) ?? new Map<string, string>()
  for (const [num, p] of Object.entries(paragraphs ?? {})) m.set(num.toLowerCase(), p?.heading_de_official ?? '')
  corpus.set(short, m)
}
const fed = JSON.parse(readFileSync(join(CORPUS, 'federal.json'), 'utf8')) as {
  laws: Record<string, { paragraphs: Record<string, { heading_de_official?: string }> }>
}
for (const [short, law] of Object.entries(fed.laws)) addLaw(short, law.paragraphs)
const FEDERAL = new Set(Object.keys(fed.laws))
const stateLawShort = new Map<string, string>()
for (const f of readdirSync(join(CORPUS, 'states')).filter((x) => x.endsWith('.json'))) {
  const st = JSON.parse(readFileSync(join(CORPUS, 'states', f), 'utf8')) as {
    _meta: { law_short: string; bundesland?: string }
    paragraphs: Record<string, { heading_de_official?: string }>
  }
  addLaw(st._meta.law_short, st.paragraphs)
  stateLawShort.set(st._meta.bundesland ?? f.replace(/\.json$/, ''), st._meta.law_short)
}

// Acknowledged out-of-corpus laws — skipped (audit:allowlist tracks them).
const ACK = JSON.parse(
  readFileSync(join(CORPUS, '_meta/acknowledged-out-of-corpus.json'), 'utf8'),
) as { laws: Record<string, { reason: string }> }
const ACK_RX = Object.keys(ACK.laws).map(
  (law) => new RegExp(`\\b${law.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i'),
)

const RECOGNISABLE = [...corpus.keys()].sort((a, b) => b.length - a.length)
const esc = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const lawPresent = (entry: string, law: string): boolean =>
  new RegExp(`(?:^|[^A-Za-zÄÖÜäöüß0-9])${esc(law)}(?:$|[^A-Za-zÄÖÜäöüß0-9])`).test(entry)
const anchorNum = (entry: string): string | null =>
  entry.match(/(?:§§?|Art\.?|Anlage)\s*(\d+[a-z]?)/i)?.[1]?.toLowerCase() ?? null

const failures: string[] = []
let checked = 0
for (const code of listRegisteredStates()) {
  const own = stateLawShort.get(code)
  for (const entry of resolveStateDelta(code).allowedCitations) {
    if (ACK_RX.some((rx) => rx.test(entry))) continue // acknowledged out-of-corpus
    const law = RECOGNISABLE.find((l) => lawPresent(entry, l))
    if (!law) continue // unknown law → audit:allowlist's job
    if (law !== own && !FEDERAL.has(law)) continue // cross-state → audit:allowlist's job
    const num = anchorNum(entry)
    if (!num) continue // non-numeric → audit:allowlist's job
    const heading = corpus.get(law)?.get(num)
    if (heading === undefined) continue // missing § → audit:allowlist's job (existence)
    checked++
    if (heading.trim() === '') {
      failures.push(`${code}: "${entry}" → ${law} § ${num} has an EMPTY heading_de_official in the corpus`)
    }
  }
}

if (failures.length > 0) {
  console.error('[verify:allowlist-headings] FAIL — allowlisted §§ with no corpus heading:')
  for (const f of failures) console.error(`  ✗ ${f}`)
  console.error('\nFix: ingest the official heading into scripts/legal-corpus, or remove the entry from the state allowlist.')
  process.exit(1)
}
console.log(`[verify:allowlist-headings] OK — ${checked} allowlisted §§ across ${listRegisteredStates().length} states each resolve to a corpus heading.`)
console.log('[verify:allowlist-headings] NOTE: authoring-drift guard only — does NOT cover runtime persona emission (#1 campaign, docs/RUNTIME_CITATION_HEADING_GATE.md).')
