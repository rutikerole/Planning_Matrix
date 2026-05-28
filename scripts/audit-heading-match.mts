// ───────────────────────────────────────────────────────────────────────
// audit-heading-match — Phase-2 / audit-remediation one-off.
//
// For every authored cell in TEMPLATE_STATE_OVERRIDES, extract every
//   "<concept> — § N LAW"     and    "<concept> (§ N LAW)"
// pattern, look up the corpus heading_de_official for (state, num),
// and report whenever the concept text and the corpus heading disagree.
//
// This is what caught the Brandenburg § 70/72 bug after it slipped past
// the presence-only verify:template-tail-citations gate. The gate proves
// the § exists; this script proves the §'s heading matches what the
// prose claims it is.
//
// METHODOLOGY
//   1. Parse two prose patterns:
//      A) bulleted/definitional `<concept text> — § N LAW`
//      B) parenthetical `<concept word> (§ N LAW)`
//   2. For each (cell, concept, law, num):
//      - resolve corpus heading by (state_law_short_match, num)
//      - compute word-overlap fraction between concept and heading
//        (lowercase, strip diacritics, drop short stopwords)
//      - also check archetype: if concept word maps to a known
//        archetype slug AND that slug is in the corpus § archetypes,
//        record "OK by archetype" even when prose-word overlap is low
//   3. Flag any cite whose prose↔heading overlap is below a threshold
//      AND whose archetype lookup did not save it.
//
// OUTPUT: a structured table to stdout. Exit 0 always — this is an
// audit, not a CI gate. The Phase-3 archetype-aware gate (M1) is the
// production gate; this script seeds it.
// ───────────────────────────────────────────────────────────────────────

import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

import { TEMPLATE_STATE_OVERRIDES } from '../src/legal/templates/stateOverrides.ts'
import { listRegisteredStates } from '../src/legal/legalRegistry.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

// ── Corpus load ───────────────────────────────────────────────────────
interface ParaRecord {
  heading_de_official?: string
  archetypes?: string[]
}
interface StateCorpus {
  law_short: string
  paragraphs: Record<string, ParaRecord>
}

const stateCorpus: Record<string, StateCorpus> = {}
for (const code of listRegisteredStates()) {
  const path = join(ROOT, `scripts/legal-corpus/states/${code}.json`)
  const data = JSON.parse(readFileSync(path, 'utf8')) as {
    _meta: { law_short: string }
    paragraphs: Record<string, ParaRecord>
  }
  stateCorpus[code] = {
    law_short: data._meta.law_short,
    paragraphs: data.paragraphs,
  }
}

// Federal corpus (heading-match for BauGB/BauNVO/GEG citations).
interface FederalLaw {
  paragraphs: Record<string, { heading_de_official?: string; archetypes?: string[] }>
}
const federal = JSON.parse(
  readFileSync(join(ROOT, 'scripts/legal-corpus/federal.json'), 'utf8'),
) as { laws: Record<string, FederalLaw> }
const FEDERAL_LAW_NAMES = new Set(Object.keys(federal.laws))

// Map from law_short to state code (so we can resolve cross-state when
// a cell mis-cites another state's BauO short — for completeness; the
// existing cross-state gate already catches that, but we include it).
const LAW_SHORT_TO_STATE = new Map<string, string>()
for (const [code, c] of Object.entries(stateCorpus)) {
  LAW_SHORT_TO_STATE.set(c.law_short, code)
}

// ── Concept → archetype slug (best-effort lexicon) ────────────────────
// Lowercase substring → canonical archetype slug from corpus. Used as a
// fallback when prose↔heading word overlap is low; if the concept's
// keyword maps to an archetype slug AND the cited § carries that
// archetype tag, we treat the cite as semantically correct.
//
// Slugs sourced from corpus archetypes (see `jq archetypes` listing in
// the audit script's discovery pass). Both BauO archetypes and federal
// archetypes (energie, denkmalschutz, bauplanungsrecht) included.
// Order matters: more specific concepts go first. "Standsicherheit" must
// match before "abbruch" so "Statik der Restanlage bei Teilabbruch" picks
// up the standsicherheit→bautechnische_nachweise mapping (the corpus
// archetype § 12 carries) rather than abbruch_beseitigung.
const CONCEPT_TO_ARCHETYPE: Array<{ rx: RegExp; slug: string }> = [
  // Structural / standsicherheit (no own archetype — corpus tags § 12 as
  // bautechnische_nachweise; map both labels to that slug so the audit
  // recognises "Statik bei …" as semantically correct for § 12).
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
  // PV must match before nutzungsänderung so "Bei Umnutzung zu …" cells
  // that point at LBO Saarland § 12a/b/c (pv) get the right slug.
  // NB: JS `\b` only fires on [A-Za-z0-9_] boundaries, so the umlaut
  // ö in "öffentlicher" forces an explicit ^|\s anchor.
  { rx: /photovoltaik|pv[-\s]*pflicht|pv[-\s]*vorbereit|(?:^|\s)(?:gewerblicher|öffentlicher)\s+nutzung/i, slug: 'pv_pflicht' },
  // Stellplätze before nutzungsänderung — "Stellplatzbedarf nach neuer
  // Nutzung" cells must map to stellplaetze, not nutzungsaenderung.
  { rx: /stellplä|stellplatz|stellplatzbedarf/i,                  slug: 'stellplaetze' },
  { rx: /abbruch|beseitigung\s+von\s+anlagen|beseitigung\b/i,     slug: 'abbruch_beseitigung' },
  { rx: /nutzungsänderung|umnutzung/i,                            slug: 'nutzungsaenderung' },
  // Federal-only archetypes (BauGB / BauNVO / GEG):
  { rx: /energie|wärmenachweis|wärmeschutz|niedrigstenergie|bestandsänderung|geg-?nachweis/i, slug: 'energie' },
  { rx: /denkmal|erhaltungssatzung|erhalt\s/i,                    slug: 'denkmalschutz' },
  { rx: /zulässigkeit|baugebiet|bebauungsplan|maß\s|baunutzungs/i, slug: 'bauplanungsrecht' },
]

function conceptToArchetypeSlug(concept: string): string | null {
  for (const { rx, slug } of CONCEPT_TO_ARCHETYPE) {
    if (rx.test(concept)) return slug
  }
  return null
}

// Meta-labels that aren't a semantic claim about what the cited § says.
// "Bundesanker — § 172 BauGB" only labels § 172 as the federal anchor;
// the actual semantic concept (Erhaltungssatzung) appears elsewhere.
// Skip these so they don't drown out real bugs.
const META_LABEL = /^(?:bundes[a-zäöüß-]*anker|federal[-\s]anker|land|bund|quelle|behörde|stand|hinweis|verfahren|verfahren\s+—\s*lbo)\b/i

// ── Word-overlap helper ────────────────────────────────────────────────
function tokenize(s: string): Set<string> {
  return new Set(
    s.toLowerCase()
      .normalize('NFD').replace(/\p{Diacritic}+/gu, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 4)
      .filter((w) => !STOP.has(w)),
  )
}
const STOP = new Set([
  'allgemein', 'allgemeine', 'allgemeinen', 'inkl', 'sowie', 'oder', 'und', 'der', 'die', 'das', 'des',
  'auf', 'beim', 'bei', 'vom', 'für', 'mit', 'als', 'eine', 'einer', 'eines',
  'pflichten', 'verfasser', 'genehmigung', 'verfahren',  // common but generic
])

function overlapScore(concept: string, heading: string): number {
  const a = tokenize(concept)
  const b = tokenize(heading)
  if (a.size === 0 || b.size === 0) return 0
  let hits = 0
  for (const w of a) {
    if (b.has(w)) {
      hits++
      continue
    }
    // partial-stem: a token appears as a prefix of a heading token
    // (handles "abstand" vs "abstandsflaechen", "brandschutz" vs
    // "brandschutzes")
    for (const h of b) {
      if (h.length >= 5 && (h.startsWith(w) || w.startsWith(h))) {
        hits += 0.7
        break
      }
    }
  }
  return hits / a.size
}

// ── Cite extraction patterns ───────────────────────────────────────────
// Build a law-alternation that captures longest-first so "LBO Saarland"
// wins over "LBO" and "LBauO M-V" wins over "LBauO".
const ALL_LAW_SHORTS = [
  ...new Set([...LAW_SHORT_TO_STATE.keys(), ...FEDERAL_LAW_NAMES]),
].sort((a, b) => b.length - a.length)
const LAW_ALT = ALL_LAW_SHORTS.map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')

// Pattern A: `<concept text up to ~80 chars> — § N LAW` (allow newline in concept)
const PAT_A = new RegExp(
  // concept: any chars except newline-blank or bullet, lazy
  '([^\\n•]{1,90}?)' +
    // separator: em-dash (—), en-dash (–), or hyphen with whitespace
    '\\s*[—–-]\\s*' +
    // optional § or Art.
    '(?:§|Art\\.)\\s*(\\d+[a-z]?)' +
    // optional Abs./Nr. tail
    '(?:\\s+Abs\\.\\s+\\d+(?:\\s+Nr\\.\\s+\\d+\\s*[a-z]?)?)?' +
    // whitespace, then the law
    '\\s+(' + LAW_ALT + ')',
  'g',
)

// Pattern B: `<concept word(s)> (§ N LAW)` (parenthetical)
const PAT_B = new RegExp(
  // concept: 1-4 capitalized German words right before the open paren
  '([A-ZÄÖÜ][\\wäöüß-]{2,}(?:\\s+[A-Za-zäöüß-]{2,}){0,3})' +
    '\\s+\\(\\s*(?:§|Art\\.)\\s*(\\d+[a-z]?)' +
    '(?:\\s+Abs\\.\\s+\\d+(?:\\s+Nr\\.\\s+\\d+\\s*[a-z]?)?)?' +
    '\\s+(' + LAW_ALT + ')',
  'g',
)

// Heuristic to strip a leading bullet marker / numeric label off the
// concept text captured by PAT_A.
function cleanConcept(raw: string): string {
  return raw
    .replace(/^[\s•\-\d\.\)]+/, '')
    .replace(/[\s,.;:]+$/, '')
    .replace(/\n+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

interface Mismatch {
  templateId: string
  bundesland: string
  pattern: 'A' | 'B'
  concept: string
  num: string
  law: string
  corpusHeading: string | '(missing)'
  archetypes: string[]
  overlap: number
  archetypeHit: string | null
  /** Slug the concept mapped to (null if no archetype slug matched). */
  conceptSlug: string | null
  verdict:
    | 'STRONG_FLAG'        // concept maps to a slug, § does NOT carry it, and word-overlap is 0
    | 'SOFT_FLAG'          // no archetype claim + low word-overlap (likely vague prose, not a bug)
    | 'OK_BY_OVERLAP'
    | 'OK_BY_ARCHETYPE'
    | 'OK_NOT_OUR_LAW'
    | 'SKIP_META_LABEL'    // concept is a meta-label, not a semantic claim
}

function lookupHeading(law: string, num: string, cellState: string): { heading: string; archetypes: string[] } | null {
  // Federal corpus first
  const fed = federal.laws[law]
  if (fed) {
    const p = fed.paragraphs[num]
    if (!p) return null
    return { heading: p.heading_de_official ?? '', archetypes: p.archetypes ?? [] }
  }
  // Cell-state corpus
  const own = stateCorpus[cellState]
  if (own && law === own.law_short) {
    const p = own.paragraphs[num]
    if (!p) return null
    return { heading: p.heading_de_official ?? '', archetypes: p.archetypes ?? [] }
  }
  // Allow another state's BauO short — the cross-state gate already
  // flags this case; for heading-match purposes we still check the
  // other state's heading so the report is informative.
  const otherCode = LAW_SHORT_TO_STATE.get(law)
  if (otherCode && otherCode !== cellState) {
    const p = stateCorpus[otherCode].paragraphs[num]
    if (!p) return null
    return { heading: p.heading_de_official ?? '', archetypes: p.archetypes ?? [] }
  }
  return null
}

const OVERLAP_THRESHOLD = 0.34  // ~one in three concept tokens hits

const results: Mismatch[] = []
let scannedCites = 0
const cellsAuthored = new Set<string>()

for (const [templateId, perState] of Object.entries(TEMPLATE_STATE_OVERRIDES)) {
  if (!perState) continue
  for (const [bundesland, override] of Object.entries(perState)) {
    if (!override) continue
    cellsAuthored.add(`${templateId}:${bundesland}`)
    const text = override

    const seenSites = new Set<string>()

    for (const m of text.matchAll(PAT_A)) {
      const concept = cleanConcept(m[1])
      const num = m[2]
      const law = m[3]
      const sig = `A|${num}|${law}|${concept}`
      if (seenSites.has(sig)) continue
      seenSites.add(sig)
      scannedCites++
      const corp = lookupHeading(law, num, bundesland)
      if (!corp) {
        results.push({
          templateId, bundesland, pattern: 'A', concept, num, law,
          corpusHeading: '(missing)', archetypes: [],
          overlap: 0, archetypeHit: null, conceptSlug: null, verdict: 'OK_NOT_OUR_LAW',
        })
        continue
      }
      const overlap = overlapScore(concept, corp.heading)
      const conceptSlug = conceptToArchetypeSlug(concept)
      const archHit = conceptSlug && corp.archetypes.includes(conceptSlug) ? conceptSlug : null

      let verdict: Mismatch['verdict']
      if (META_LABEL.test(concept)) verdict = 'SKIP_META_LABEL'
      else if (archHit) verdict = 'OK_BY_ARCHETYPE'
      else if (overlap >= OVERLAP_THRESHOLD) verdict = 'OK_BY_OVERLAP'
      else if (conceptSlug && !archHit && overlap === 0) verdict = 'STRONG_FLAG'
      else verdict = 'SOFT_FLAG'

      results.push({
        templateId, bundesland, pattern: 'A', concept, num, law,
        corpusHeading: corp.heading, archetypes: corp.archetypes,
        overlap, archetypeHit: archHit, conceptSlug, verdict,
      })
    }

    for (const m of text.matchAll(PAT_B)) {
      const concept = cleanConcept(m[1])
      const num = m[2]
      const law = m[3]
      const sig = `B|${num}|${law}|${concept}`
      if (seenSites.has(sig)) continue
      seenSites.add(sig)
      scannedCites++
      const corp = lookupHeading(law, num, bundesland)
      if (!corp) {
        results.push({
          templateId, bundesland, pattern: 'B', concept, num, law,
          corpusHeading: '(missing)', archetypes: [],
          overlap: 0, archetypeHit: null, conceptSlug: null, verdict: 'OK_NOT_OUR_LAW',
        })
        continue
      }
      const overlap = overlapScore(concept, corp.heading)
      const conceptSlug = conceptToArchetypeSlug(concept)
      const archHit = conceptSlug && corp.archetypes.includes(conceptSlug) ? conceptSlug : null

      let verdict: Mismatch['verdict']
      if (META_LABEL.test(concept)) verdict = 'SKIP_META_LABEL'
      else if (archHit) verdict = 'OK_BY_ARCHETYPE'
      else if (overlap >= OVERLAP_THRESHOLD) verdict = 'OK_BY_OVERLAP'
      else if (conceptSlug && !archHit && overlap === 0) verdict = 'STRONG_FLAG'
      else verdict = 'SOFT_FLAG'

      results.push({
        templateId, bundesland, pattern: 'B', concept, num, law,
        corpusHeading: corp.heading, archetypes: corp.archetypes,
        overlap, archetypeHit: archHit, conceptSlug, verdict,
      })
    }
  }
}

// ── Report ──────────────────────────────────────────────────────────────
const strongFlags = results.filter((r) => r.verdict === 'STRONG_FLAG')
const softFlags = results.filter((r) => r.verdict === 'SOFT_FLAG')
const okOverlap = results.filter((r) => r.verdict === 'OK_BY_OVERLAP').length
const okArchetype = results.filter((r) => r.verdict === 'OK_BY_ARCHETYPE').length
const skipped = results.filter((r) => r.verdict === 'OK_NOT_OUR_LAW').length
const metaSkipped = results.filter((r) => r.verdict === 'SKIP_META_LABEL').length

console.log(
  `[audit-heading-match] cells authored: ${cellsAuthored.size} · cite-sites scanned: ${scannedCites}`,
)
console.log(
  `  OK by archetype: ${okArchetype} · OK by overlap: ${okOverlap} · ` +
    `skipped (meta-label / non-corpus law): ${metaSkipped + skipped}`,
)
console.log(
  `  STRONG_FLAG (concept maps to a known archetype, § does NOT carry it, ` +
    `zero word overlap): ${strongFlags.length}`,
)
console.log(
  `  SOFT_FLAG (vague-concept low-overlap — likely not a bug, manually skim): ` +
    `${softFlags.length}`,
)
console.log('')
const flagged = strongFlags
console.log('')

// CLI flag: `--all` dumps SOFT_FLAGs too so I can sanity-check them.
const SHOW_SOFT = process.argv.includes('--all')
const reportRows = SHOW_SOFT ? [...strongFlags, ...softFlags] : strongFlags

if (reportRows.length === 0) {
  console.log('No semantic mismatches detected.')
  process.exit(0)
}

// Sort by state then template then num for readability.
reportRows.sort((a, b) =>
  a.bundesland.localeCompare(b.bundesland) ||
  a.templateId.localeCompare(b.templateId) ||
  Number(a.num) - Number(b.num),
)

for (const f of reportRows) {
  console.log(`  [${f.verdict}] ${f.templateId} × ${f.bundesland}  pattern ${f.pattern}`)
  console.log(`    concept:  ${f.concept}`)
  console.log(`    cite:     § ${f.num} ${f.law}`)
  console.log(`    corpus:   ${f.corpusHeading}`)
  if (f.archetypes.length) console.log(`    arch:     [${f.archetypes.join(', ')}]`)
  if (f.conceptSlug) console.log(`    slug:     ${f.conceptSlug}`)
  console.log(`    overlap:  ${f.overlap.toFixed(2)}`)
  console.log('')
}
