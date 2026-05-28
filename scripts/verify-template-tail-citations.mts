// ───────────────────────────────────────────────────────────────────────
// verify:template-tail-citations — Bucket B safety net.
//
// For every non-null entry in TEMPLATE_STATE_OVERRIDES, extract every
// `§ X <Law>` / `Art. X <Law>` / `<Law> § X` token and verify each
// citation resolves in:
//   (a) the federal corpus (BauGB / BauNVO / GEG), or
//   (b) THIS cell's state BauO (per corpus _meta.law_short), or
//   (c) an explicitly-allowed not-in-corpus law list per state
//       (state DSchG, BauVorlVO — captured in stateCitations.ts but
//        not in the §-level corpus).
//
// FAILS on:
//   - § number not tagged in the expected source (typo or fabricated)
//   - Law name from a DIFFERENT state's BauO (cross-state leak —
//     e.g. "§ 64 BauO NRW" appearing in a Hessen override)
//   - Law name unknown entirely (likely typo)
//
// PASSES (no warning) on:
//   - Citation resolves cleanly in the expected corpus
//   - Citation references a known-not-in-corpus law (state DSchG etc.) —
//     the author is acknowledging the law exists but its §-level
//     content isn't captured. Allowed to keep working.
//
// At B0 the registry is all-null, so this gate is a noop (0 citations
// scanned). It activates the moment any Bucket B author fills a cell.
// Defense in depth alongside verify:template-tail-noop, which catches
// any unacknowledged override; this gate catches fabricated §§ even
// when the override IS acknowledged.
// ───────────────────────────────────────────────────────────────────────

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

import { TEMPLATE_STATE_OVERRIDES } from '../src/legal/templates/stateOverrides.ts'
import { listRegisteredStates } from '../src/legal/legalRegistry.ts'
import type { TemplateId } from '../src/types/projectState.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

// ── Federal corpus -----------------------------------------------------
const federal = JSON.parse(
  readFileSync(join(ROOT, 'scripts/legal-corpus/federal.json'), 'utf8'),
) as { laws: Record<string, { paragraphs: Record<string, unknown> }> }

const FEDERAL_LAW_NAMES = new Set(Object.keys(federal.laws))

function isFederalParagraphPresent(law: string, num: string): boolean {
  return federal.laws[law]?.paragraphs?.[num] != null
}

// ── Per-state corpus + allowed-laws map --------------------------------
interface StateCorpus {
  law_short: string
  paragraphs: Record<string, unknown>
}
const stateCorpus: Record<string, StateCorpus> = {}
for (const code of listRegisteredStates()) {
  const path = join(ROOT, `scripts/legal-corpus/states/${code}.json`)
  const data = JSON.parse(readFileSync(path, 'utf8')) as {
    _meta: { law_short: string }
    paragraphs: Record<string, unknown>
  }
  stateCorpus[code] = {
    law_short: data._meta.law_short,
    paragraphs: data.paragraphs,
  }
}

// All BauO short-names across the 16 states, for cross-state-leak detection.
const ALL_STATE_BAUO_SHORTS: Map<string, string> = new Map()
for (const [code, c] of Object.entries(stateCorpus)) {
  ALL_STATE_BAUO_SHORTS.set(c.law_short, code)
}

// Not-in-corpus but legitimate. Authors may cite DSchG / BauVorlVO names
// without §-level verification; mention is allowed without resolution.
// Sourced from src/legal/stateCitations.ts denkmalSchutzAct / bauVorlagenAct
// fields per state; transcribed here to avoid an additional import dance.
const ALLOWED_NOT_IN_CORPUS_LAWS_PER_STATE: Record<string, ReadonlySet<string>> = {
  bayern: new Set(['BayDSchG', 'BauVorlV']),
  bw: new Set(['DSchG BW', 'LBOVVO BW', 'LBO BW']),
  hessen: new Set(['HDSchG', 'BauVorlV Hessen']),
  nrw: new Set(['DSchG NRW', 'BauVorlVO NRW']),
  niedersachsen: new Set(['NDSchG', 'BauVorlVO Nds']),
  berlin: new Set(['DSchG Bln', 'BauVorlVO Bln']),
  hamburg: new Set(['DSchG HH', 'BauVorlVO HH']),
  bremen: new Set(['DSchG HB', 'BauVorlVO HB']),
  brandenburg: new Set(['BbgDSchG', 'BauVorlVO Bbg']),
  mv: new Set(['DSchG M-V', 'BauVorlVO M-V']),
  rlp: new Set(['DSchG RLP', 'BauuntPrüfVO']),
  saarland: new Set(['SDschG', 'BauVorlVO Saar']),
  sachsen: new Set(['SächsDSchG', 'BauVorlVO SN']),
  'sachsen-anhalt': new Set(['DSchG LSA', 'BauVorlVO LSA']),
  sh: new Set(['DSchG SH', 'BauVorlVO SH']),
  thueringen: new Set(['ThürDSchG', 'BauVorlVO TH']),
}

// ── Citation extraction ------------------------------------------------
// Two patterns: §/Art. NUM LAW   or   LAW §/Art. NUM
// NUM = digits + optional lowercase letter (e.g. 57a, 63b)
// LAW = capitalised token chain, possibly with hyphens / Roman state suffix
//
// We do NOT try to parse Abs. / Nr. sub-clauses — corpus only needs the
// top-level § number to verify existence.

// State-suffix tokens — order matters: longer patterns FIRST so the regex
// matches "Saarland" before "Saar" (otherwise greedy-leftmost alternation
// truncates "LBO Saarland" → "LBO Saar" and the parsed law name no longer
// matches the corpus law_short).
const CITATION_REGEX_FORWARD =
  /(?:§|Art\.)\s*(\d+[a-z]?)\b(?:\s+Abs\.\s+\d+(?:\s+Nr\.\s+\d+\s*[a-z]?)?)?\s+([A-ZÄÖÜ][A-Za-zäöüß-]*(?:\s+(?:Saarland|NRW|NW|BW|RP|M-V|HH|HB|Bln|Nds|SN|LSA|SH|TH|Hessen|Saar|Bbg)|\s+[A-ZÄÖÜ][A-Za-zäöüß-]*)*)/g

const CITATION_REGEX_REVERSE =
  /\b([A-ZÄÖÜ][A-Za-zäöüß-]*(?:\s+(?:Saarland|NRW|NW|BW|RP|M-V|HH|HB|Bln|Nds|SN|LSA|SH|TH|Hessen|Saar|Bbg)|\s+[A-ZÄÖÜ][A-Za-zäöüß-]*)*)\s+(?:§|Art\.)\s*(\d+[a-z]?)\b/g

interface Citation {
  num: string
  law: string
  raw: string
}

// Normalize whitespace inside the matched law name: collapse newlines and
// multi-spaces (from prose word-wrap) to a single space so "LBO\nSaarland"
// matches the corpus law_short "LBO Saarland".
function normalizeLaw(s: string): string {
  return s.trim().replace(/\s+/g, ' ')
}

function extractCitations(text: string): Citation[] {
  const out: Citation[] = []
  for (const m of text.matchAll(CITATION_REGEX_FORWARD)) {
    out.push({ num: m[1], law: normalizeLaw(m[2]), raw: m[0] })
  }
  for (const m of text.matchAll(CITATION_REGEX_REVERSE)) {
    out.push({ num: m[2], law: normalizeLaw(m[1]), raw: m[0] })
  }
  return out
}

// ── Per-citation verification -----------------------------------------
type Verdict =
  | { kind: 'ok-federal'; law: string; num: string }
  | { kind: 'ok-state'; law: string; num: string }
  | { kind: 'ok-allowed-not-in-corpus'; law: string; num: string }
  | { kind: 'fail-num-missing'; law: string; num: string; corpus: 'federal' | 'state' }
  | { kind: 'fail-cross-state'; law: string; expectedState: string; foundState: string; num: string }
  | { kind: 'fail-unknown-law'; law: string; num: string }

function verifyCitation(c: Citation, cellState: string): Verdict {
  if (FEDERAL_LAW_NAMES.has(c.law)) {
    return isFederalParagraphPresent(c.law, c.num)
      ? { kind: 'ok-federal', law: c.law, num: c.num }
      : { kind: 'fail-num-missing', law: c.law, num: c.num, corpus: 'federal' }
  }

  const stateBauo = stateCorpus[cellState]?.law_short
  if (stateBauo && c.law === stateBauo) {
    return stateCorpus[cellState].paragraphs[c.num] != null
      ? { kind: 'ok-state', law: c.law, num: c.num }
      : { kind: 'fail-num-missing', law: c.law, num: c.num, corpus: 'state' }
  }

  const allowed = ALLOWED_NOT_IN_CORPUS_LAWS_PER_STATE[cellState]
  if (allowed?.has(c.law)) {
    return { kind: 'ok-allowed-not-in-corpus', law: c.law, num: c.num }
  }

  // Cross-state-leak detection
  const foundOtherState = ALL_STATE_BAUO_SHORTS.get(c.law)
  if (foundOtherState && foundOtherState !== cellState) {
    return {
      kind: 'fail-cross-state',
      law: c.law,
      num: c.num,
      expectedState: cellState,
      foundState: foundOtherState,
    }
  }

  return { kind: 'fail-unknown-law', law: c.law, num: c.num }
}

// ── Scan -------------------------------------------------------------
interface Violation {
  templateId: TemplateId
  bundesland: string
  citation: string
  detail: string
}

const violations: Violation[] = []
let citationsScanned = 0
let cellsScanned = 0

for (const [templateId, perState] of Object.entries(TEMPLATE_STATE_OVERRIDES)) {
  if (!perState) continue
  for (const [bundesland, override] of Object.entries(perState)) {
    if (!override) continue // null / undefined → no citations to check
    cellsScanned++
    const cites = extractCitations(override)
    citationsScanned += cites.length
    for (const c of cites) {
      const v = verifyCitation(c, bundesland)
      if (v.kind.startsWith('ok')) continue
      let detail = ''
      switch (v.kind) {
        case 'fail-num-missing':
          detail = `§ ${v.num} not tagged in ${v.corpus} corpus for law '${v.law}'`
          break
        case 'fail-cross-state':
          detail = `cross-state leak — '${v.law}' belongs to state '${v.foundState}', cell is in '${v.expectedState}'`
          break
        case 'fail-unknown-law':
          detail = `unknown law '${v.law}' — not in federal corpus, not this state's BauO, not in allowed-not-in-corpus list`
          break
      }
      violations.push({
        templateId: templateId as TemplateId,
        bundesland,
        citation: c.raw,
        detail,
      })
    }
  }
}

// ── Report ------------------------------------------------------------
if (violations.length > 0) {
  console.error('[verify:template-tail-citations] FAIL — unverified citation(s):')
  console.error('')
  for (const v of violations) {
    console.error(`  ${v.templateId} × ${v.bundesland}`)
    console.error(`    citation: '${v.citation}'`)
    console.error(`    reason:   ${v.detail}`)
    console.error('')
  }
  console.error('Fix:')
  console.error('  • If the citation is correct: ensure the corresponding § is tagged in')
  console.error('    scripts/legal-corpus/states/<state>.json or scripts/legal-corpus/federal.json,')
  console.error('    OR add the law to ALLOWED_NOT_IN_CORPUS_LAWS_PER_STATE in this gate.')
  console.error('  • If the citation is wrong (typo, fabricated, wrong state):')
  console.error('    correct the override string in src/legal/templates/stateOverrides.ts.')
  process.exit(1)
}

console.log(
  `[verify:template-tail-citations] OK — ${cellsScanned} authored cell(s) scanned, ` +
    `${citationsScanned} citation(s) verified.`,
)
if (cellsScanned === 0) {
  console.log(`  Registry is currently all-null (B0). Gate is armed; activates on first authored override.`)
}
