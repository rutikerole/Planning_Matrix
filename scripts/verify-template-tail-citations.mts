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
  // M2 + M3 (audit-remediation): paragraph-scoped law inference for
  // bare § references. The base patterns require LAW immediately after
  // the §-number, so:
  //   • chained shorthand `§ 14, § 15 BauO Bln` would lose § 14
  //   • bare `§ 12c einschlägig (...); § 12a primär` would lose § 12a
  // We rescue them by finding all explicit `§ N LAW` cites in each
  // paragraph, then attributing the most-recent (or nearest) LAW to
  // every bare § N in that paragraph.
  for (const para of splitIntoParagraphs(text)) {
    out.push(...extractParagraphInferredCitations(para))
  }
  return out
}

// Paragraph = chunk separated by `\n\s*\n`. Within a paragraph the LAW
// context carries over from explicit cites to subsequent bare §§. This
// is intentionally narrow: cross-paragraph inheritance is exactly the
// failure mode that lets fabricated §§ hide.
function splitIntoParagraphs(text: string): Array<{ body: string; offset: number }> {
  const out: Array<{ body: string; offset: number }> = []
  const re = /\n\s*\n/g
  let prev = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    out.push({ body: text.slice(prev, m.index), offset: prev })
    prev = m.index + m[0].length
  }
  out.push({ body: text.slice(prev), offset: prev })
  return out
}

// A § N without an immediately-trailing LAW. We will attribute LAW
// from the nearest explicit cite in the same paragraph.
const BARE_NUM_REGEX = /(?:§|Art\.)\s*(\d+[a-z]?)\b(?:\s+Abs\.\s+\d+(?:\s+Nr\.\s+\d+\s*[a-z]?)?)?/g

function extractParagraphInferredCitations(para: { body: string; offset: number }): Citation[] {
  // Collect anchors — positions where we are confident about LAW.
  //   1. Forward-form `§ N LAW` cites (immediate LAW after).
  //   2. Reverse-form `LAW § N` cites (LAW directly before).
  //   3. As a fallback when the paragraph leads with "in der LBO Saarland:"
  //      style prose, any standalone mention of a law_short (the LAW token
  //      bareword) anywhere in the paragraph. This catches the Saarland-PV
  //      pattern where "PV-§§ direkt in der LBO Saarland: § 12a … § 12b …"
  //      sets the LAW context without any §-adjacent anchor.
  interface Anchor { pos: number; num: string | null; law: string }
  const anchors: Anchor[] = []
  for (const m of para.body.matchAll(CITATION_REGEX_FORWARD)) {
    anchors.push({ pos: m.index ?? 0, num: m[1], law: normalizeLaw(m[2]) })
  }
  for (const m of para.body.matchAll(CITATION_REGEX_REVERSE)) {
    anchors.push({ pos: m.index ?? 0, num: m[2], law: normalizeLaw(m[1]) })
  }
  // Standalone law mentions — only law_shorts >= 4 chars to avoid noise.
  const STANDALONE_LAWS_RE = new RegExp(
    '\\b(' +
      [...new Set([...stateBauoShortList(), ...FEDERAL_LAW_NAMES])]
        .filter((s) => s.length >= 4)
        .sort((a, b) => b.length - a.length)
        .map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('|') +
      ')\\b',
    'g',
  )
  for (const m of para.body.matchAll(STANDALONE_LAWS_RE)) {
    anchors.push({ pos: m.index ?? 0, num: null, law: m[1] })
  }
  if (anchors.length === 0) return []

  // Identify bare numerals. The first stage anchors (forward-form) record
  // the position of `§` as the start of the match — so we must skip those
  // when re-walking with the bare regex, otherwise they double-count.
  const forwardNumSpans = new Set<string>()
  for (const m of para.body.matchAll(CITATION_REGEX_FORWARD)) {
    forwardNumSpans.add(`${m.index ?? 0}|${m[1]}`)
  }

  const out: Citation[] = []
  for (const m of para.body.matchAll(BARE_NUM_REGEX)) {
    const pos = m.index ?? 0
    const num = m[1]
    if (forwardNumSpans.has(`${pos}|${num}`)) continue
    // Pick nearest anchor by absolute distance.
    let nearest: Anchor | null = null
    let bestDist = Infinity
    for (const a of anchors) {
      const d = Math.abs(a.pos - pos)
      if (d < bestDist) {
        bestDist = d
        nearest = a
      }
    }
    if (!nearest) continue
    out.push({ num, law: nearest.law, raw: m[0] })
  }
  return out
}

// Helper: list of all state law_shorts. Lazy-built so we don't run the
// dependency before the corpus loads. Pulled from stateCorpus map above.
function stateBauoShortList(): string[] {
  return Object.values(stateCorpus).map((c) => c.law_short)
}

// ── Tier-2 (M1 audit-remediation): concept → archetype check ──────────
// For every `<concept> — § N LAW` bulleted cite, verify the §'s corpus
// archetype matches the concept the prose claims. This is what would
// have caught the Brandenburg § 70/72 bug (right number, wrong heading).
//
// Strictness: FAIL only when ALL THREE hold:
//   1. concept maps to a known archetype slug
//   2. the cited § does NOT carry that archetype tag
//   3. the prose↔heading word overlap is zero (no rescue from a partial
//      verbal match)
// This is the same STRONG_FLAG criterion used in
// scripts/audit-heading-match.mts. The Phase-2 sweep across all 116
// cells produced zero STRONG_FLAGs after Brandenburg + the Bundes-Maß
// prose tightening; this tier locks that state in.

const ARCHETYPE_OVERLAP_THRESHOLD = 0.34

// Order matters: more specific concepts first. "Standsicherheit/Statik"
// must beat "abbruch" so "Statik der Restanlage bei Teilabbruch — § 12"
// resolves to bautechnische_nachweise (the corpus archetype § 12 carries),
// not abbruch_beseitigung.
const CONCEPT_TO_ARCHETYPE: ReadonlyArray<{ rx: RegExp; slug: string }> = [
  { rx: /\bstatik\b|standsicherheit/i,                            slug: 'bautechnische_nachweise' },
  { rx: /bautechnische\s+nachweise|nachweis(?!\s+der\s+verwendbarkeit)/i, slug: 'bautechnische_nachweise' },
  { rx: /verfahrensfrei|genehmigungsfreie\s+vorhaben/i,           slug: 'verfahrensfrei' },
  { rx: /freistellung/i,                                          slug: 'verfahren_freistellung' },
  { rx: /vereinfacht/i,                                           slug: 'verfahren_vereinfacht' },
  { rx: /baugenehmigungsverfahren(?!sfreistellung)|baugenehmigung\b|genehmigungspflichtige|genehmigungsbedürftige/i, slug: 'verfahren_regulaer' },
  { rx: /bauantrag/i,                                             slug: 'bauantrag_bauvorlagen' },
  { rx: /bauvorlageberechtig/i,                                   slug: 'bauvorlageberechtigung' },
  { rx: /brandschutz|brandverhalten|brandwand|rettungsweg/i,      slug: 'brandschutz' },
  { rx: /abstandsfläche|abstandsflach|abstand\b/i,                slug: 'abstandsflaechen' },
  { rx: /gebäudeklasse/i,                                         slug: 'gebaeudeklasse' },
  { rx: /sonderbau/i,                                             slug: 'sonderbauten' },
  // PV before nutzungsänderung so "Bei Umnutzung zu öffentlicher Nutzung —
  // § 12b LBO Saarland" gets PV not nutzungsaenderung.
  { rx: /photovoltaik|pv[-\s]*pflicht|pv[-\s]*vorbereit|(?:^|\s)(?:gewerblicher|öffentlicher)\s+nutzung/i, slug: 'pv_pflicht' },
  { rx: /stellplä|stellplatz|stellplatzbedarf/i,                  slug: 'stellplaetze' },
  { rx: /abbruch|beseitigung\s+von\s+anlagen|beseitigung\b/i,     slug: 'abbruch_beseitigung' },
  { rx: /nutzungsänderung|umnutzung/i,                            slug: 'nutzungsaenderung' },
  { rx: /energie|wärmenachweis|wärmeschutz|niedrigstenergie|bestandsänderung|geg-?nachweis/i, slug: 'energie' },
  { rx: /denkmal|erhaltungssatzung|erhalt\s/i,                    slug: 'denkmalschutz' },
  { rx: /zulässigkeit|baugebiet|bebauungsplan|maß\s|baunutzungs/i, slug: 'bauplanungsrecht' },
]

// Meta-labels — "Bundesanker", "Federal-Anker", etc. — only point at a
// § as "this is the federal anchor", they don't claim heading semantics.
const META_LABEL_RX = /^(?:bundes[a-zäöüß-]*anker|federal[-\s]anker|land|bund|quelle|behörde|stand|hinweis)\b/i

const STOP_WORDS = new Set([
  'allgemein','allgemeine','allgemeinen','inkl','sowie','oder','und','der','die','das','des',
  'auf','beim','bei','vom','für','mit','als','eine','einer','eines',
  'pflichten','verfasser','genehmigung','verfahren',
])

function tokenize(s: string): Set<string> {
  return new Set(
    s.toLowerCase()
      .normalize('NFD').replace(/\p{Diacritic}+/gu, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 4)
      .filter((w) => !STOP_WORDS.has(w)),
  )
}

function overlapScore(concept: string, heading: string): number {
  const a = tokenize(concept)
  const b = tokenize(heading)
  if (a.size === 0 || b.size === 0) return 0
  let hits = 0
  for (const w of a) {
    if (b.has(w)) { hits++; continue }
    for (const h of b) {
      if (h.length >= 5 && (h.startsWith(w) || w.startsWith(h))) { hits += 0.7; break }
    }
  }
  return hits / a.size
}

function conceptToSlug(concept: string): string | null {
  for (const { rx, slug } of CONCEPT_TO_ARCHETYPE) {
    if (rx.test(concept)) return slug
  }
  return null
}

function cleanConcept(raw: string): string {
  return raw
    .replace(/^[\s•\-\d\.\)]+/, '')
    .replace(/[\s,.;:]+$/, '')
    .replace(/\n+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

// `<concept up to 90 chars> — § N LAW` — bulleted definitional cite.
const PAT_CONCEPT_DASH = new RegExp(
  '([^\\n•]{1,90}?)' +
    '\\s*[—–-]\\s*' +
    '(?:§|Art\\.)\\s*(\\d+[a-z]?)' +
    '(?:\\s+Abs\\.\\s+\\d+(?:\\s+Nr\\.\\s+\\d+\\s*[a-z]?)?)?' +
    '\\s+([A-ZÄÖÜ][A-Za-zäöüß-]*(?:\\s+(?:Saarland|NRW|NW|BW|RP|M-V|HH|HB|Bln|Nds|SN|LSA|SH|TH|Hessen|Saar|Bbg)|\\s+[A-ZÄÖÜ][A-Za-zäöüß-]*)*)',
  'g',
)

function getCorpusHeadingAndArchetypes(
  law: string,
  num: string,
  cellState: string,
): { heading: string; archetypes: string[] } | null {
  // Federal first
  const fedLaw = federal.laws[law]
  if (fedLaw) {
    const p = fedLaw.paragraphs[num] as { heading_de_official?: string; archetypes?: string[] } | undefined
    if (!p) return null
    return { heading: p.heading_de_official ?? '', archetypes: p.archetypes ?? [] }
  }
  // Cell-state corpus
  const own = stateCorpus[cellState]
  if (own && law === own.law_short) {
    const p = own.paragraphs[num] as { heading_de_official?: string; archetypes?: string[] } | undefined
    if (!p) return null
    return { heading: p.heading_de_official ?? '', archetypes: p.archetypes ?? [] }
  }
  // Cross-state heading lookup (existing gate already FAILs on the
  // cross-state-leak axis; here we only need the corpus row to check
  // the SLUG, which works regardless of which state the law belongs to).
  for (const otherState of Object.values(stateCorpus)) {
    if (otherState.law_short === law) {
      const p = otherState.paragraphs[num] as { heading_de_official?: string; archetypes?: string[] } | undefined
      if (!p) return null
      return { heading: p.heading_de_official ?? '', archetypes: p.archetypes ?? [] }
    }
  }
  return null
}

// Federal corpus needs the archetypes array — the existing presence-check
// only inspected `paragraphs[num] != null`. We re-load federal.json here
// indirectly via the existing `federal` import (already includes
// paragraphs/archetypes).

interface ArchetypeViolation {
  templateId: string
  bundesland: string
  concept: string
  num: string
  law: string
  corpusHeading: string
  archetypes: string[]
  conceptSlug: string
}

function checkArchetypeMatch(
  text: string,
  templateId: string,
  cellState: string,
): ArchetypeViolation[] {
  const out: ArchetypeViolation[] = []
  const seen = new Set<string>()
  for (const m of text.matchAll(PAT_CONCEPT_DASH)) {
    const concept = cleanConcept(m[1])
    const num = m[2]
    const law = normalizeLaw(m[3])
    const sig = `${num}|${law}|${concept}`
    if (seen.has(sig)) continue
    seen.add(sig)
    if (META_LABEL_RX.test(concept)) continue
    const slug = conceptToSlug(concept)
    if (!slug) continue
    const corp = getCorpusHeadingAndArchetypes(law, num, cellState)
    if (!corp) continue
    if (corp.archetypes.includes(slug)) continue
    const overlap = overlapScore(concept, corp.heading)
    if (overlap >= ARCHETYPE_OVERLAP_THRESHOLD) continue
    out.push({
      templateId, bundesland: cellState, concept, num, law,
      corpusHeading: corp.heading, archetypes: corp.archetypes,
      conceptSlug: slug,
    })
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
const archetypeViolations: ArchetypeViolation[] = []
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
    // Tier-2 (M1): archetype-match against `<concept> — § N LAW` bullets.
    archetypeViolations.push(...checkArchetypeMatch(override, templateId, bundesland))
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

if (archetypeViolations.length > 0) {
  console.error('[verify:template-tail-citations] FAIL — Tier-2 archetype mismatch:')
  console.error('')
  console.error('  The prose labels a concept that maps to a known corpus archetype,')
  console.error('  but the cited § does NOT carry that archetype tag AND the prose-vs-')
  console.error('  heading word overlap is zero. This is the class of bug (right §-number,')
  console.error('  wrong heading meaning) that the presence-only check cannot detect.')
  console.error('')
  for (const v of archetypeViolations) {
    console.error(`  ${v.templateId} × ${v.bundesland}`)
    console.error(`    concept:  '${v.concept}'`)
    console.error(`    citation: '§ ${v.num} ${v.law}'`)
    console.error(`    corpus:   '${v.corpusHeading}'  archetypes: [${v.archetypes.join(', ')}]`)
    console.error(`    expected: '${v.conceptSlug}'`)
    console.error('')
  }
  console.error('Fix:')
  console.error('  • Pick the §-number whose corpus heading_de_official actually matches')
  console.error('    the concept the prose claims (use scripts/audit-heading-match.mts).')
  console.error('  • If the concept text is loose/misleading and the §-number is correct,')
  console.error('    tighten the prose so the concept token matches the corpus heading.')
  console.error('  • If the concept legitimately spans a topic the corpus has not archetype-')
  console.error('    tagged, add the (concept rx, slug) row to CONCEPT_TO_ARCHETYPE or extend')
  console.error('    the corpus archetypes array. Do NOT silence the gate without doing so.')
  process.exit(1)
}

console.log(
  `[verify:template-tail-citations] OK — ${cellsScanned} authored cell(s) scanned, ` +
    `${citationsScanned} citation(s) verified · 0 archetype mismatches.`,
)
if (cellsScanned === 0) {
  console.log(`  Registry is currently all-null (B0). Gate is armed; activates on first authored override.`)
}
