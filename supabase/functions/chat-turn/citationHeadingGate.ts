// ───────────────────────────────────────────────────────────────────────
// ITEM C (T-04 Saarland walk) — runtime citation HEADING gate.
//
// The allow-list enforcer (enforceCitationAllowList) checks only (law, number)
// membership — it cannot tell that an existing/allowlisted § was cited for the
// WRONG topic (e.g. § 49 BauO NRW = "Barrierefreies Bauen" cited as the
// architect's Bauvorlage §). On a stub state the persona guesses §§ from MBO
// numbering, which is NOT uniform across states (NRW §33 = escape route,
// Hessen §36 = escape route, Hessen §33 = Brandwände) — so a number that is
// right in one state is wrong in another.
//
// This gate is STATE-SPECIFIC and DATA-DRIVEN: for each high-traffic concept it
// reads the build-verified CANONICAL § for the ACTIVE state from the corpus
// pack (corpusCitations.generated.ts — the §-whose-corpus-heading IS the
// concept, guaranteed by verify-concept-citations). When a structured field
// anchored to a concept cites an OWN-STATE § that is NOT the canonical one for
// that concept in that state, the persona used a wrong-topic §.
//
// Posture: DOWNGRADE-AND-FLAG, never block (mirrors the qualifier gate's
// downgrade-and-continue). A mismatch drops the entry's quality to ASSUMED and
// emits a heading_mismatch event for architect verification. False positive =
// an over-cautious downgrade (the safe direction: honest deferral > false
// certainty). Correct §§ are untouched. Chat prose is out of v1 scope —
// structured toolInput fields only.
// ───────────────────────────────────────────────────────────────────────

import { normalizeBundeslandCode } from '../../../src/legal/legalRegistry.ts'
import {
  STATE_CORPUS_CITATIONS,
  STATE_CORPUS_PROCEDURE,
} from '../../../src/legal/corpusCitations.generated.ts'
import type { BundeslandCode } from '../../../src/legal/states/_types.ts'
import type { RespondToolInput } from '../../../src/types/respondTool.ts'

export type HeadingConcept =
  | 'procedure'
  | 'bauvorlage'
  | 'structural'
  | 'permitForm'
  | 'sonderbau'

export interface HeadingMismatchEvent {
  field: 'procedure' | 'role' | 'document'
  concept: HeadingConcept
  item_id: string
  cited: string[] // own-state §-numbers found in the field
  expected: string[] // canonical §-number(s) for the concept in this state
  reason: string
}

const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Parse a canonical citation string → { lawToken, number }. Handles both
 *  marker-first ("§ 66 LBO Saarland") and law-first ("BayBO Art. 64"). */
function parseCanonical(s: string): { lawToken: string; marker: '§' | 'Art.'; number: string } | null {
  const mFirst = s.match(/^§\s*(\d+[a-z]?)\s+(.*\S)\s*$/i)
  if (mFirst) return { lawToken: mFirst[2], marker: '§', number: mFirst[1].toLowerCase() }
  const lFirst = s.match(/^(.*\S)\s+Art\.?\s*(\d+[a-z]?)\s*$/i)
  if (lFirst) return { lawToken: lFirst[1], marker: 'Art.', number: lFirst[2].toLowerCase() }
  return null
}

const numOf = (s: string | undefined): string | undefined =>
  s ? (parseCanonical(s)?.number) : undefined

/** Architect / structural role → its concept; null for other roles. Inlined
 *  (not imported from the frontend resolveRoles) to keep the edge bundle lean. */
function roleConcept(r: { id?: string; title_de?: string; title_en?: string }): 'bauvorlage' | 'structural' | null {
  const t = `${r.id ?? ''} ${r.title_de ?? ''} ${r.title_en ?? ''}`.toLowerCase()
  if (/tragwerk|structural|statik/.test(t)) return 'structural'
  if (/architek|architect|bauvorlage/.test(t)) return 'bauvorlage'
  return null
}

/**
 * Downgrade-and-flag any structured citation whose own-state § does not match
 * the corpus-canonical § for its asserted concept. Mutates toolInput in-place
 * (quality → ASSUMED) and returns the mismatch events for event_log.
 */
export function enforceCitationHeadingMatch(
  toolInput: RespondToolInput,
  activeBundesland: string | null | undefined,
): HeadingMismatchEvent[] {
  const code = activeBundesland
    ? (normalizeBundeslandCode(activeBundesland) as BundeslandCode)
    : null
  if (!code) return []
  const cit = STATE_CORPUS_CITATIONS[code]
  const proc = STATE_CORPUS_PROCEDURE[code]
  if (!cit && !proc) return [] // no canonical data for this state → can't judge

  // Derive the own-state §-extraction pattern from any canonical string.
  const sample =
    cit?.permitSubmissionCitation ?? cit?.permitFormCitation ?? cit?.sonderbauCitation ?? proc?.simplified
  const parsed = sample ? parseCanonical(sample) : null
  if (!parsed) return []
  const { lawToken, marker } = parsed
  const ownSectionRe =
    marker === 'Art.'
      ? new RegExp(`${escapeRe(lawToken)}\\s*Art\\.?\\s*(\\d+[a-z]?)`, 'gi')
      : new RegExp(`§\\s*(\\d+[a-z]?)\\s*${escapeRe(lawToken)}`, 'gi')

  const canonical: Record<HeadingConcept, string[]> = {
    procedure: [numOf(proc?.free), numOf(proc?.freistellung), numOf(proc?.simplified), numOf(proc?.regular)].filter(Boolean) as string[],
    bauvorlage: [numOf(cit?.permitSubmissionCitation)].filter(Boolean) as string[],
    structural: [numOf(cit?.structuralCertCitation)].filter(Boolean) as string[],
    permitForm: [numOf(cit?.permitFormCitation)].filter(Boolean) as string[],
    sonderbau: [numOf(cit?.sonderbauCitation)].filter(Boolean) as string[],
  }

  const extractOwn = (text: string): string[] => {
    const out: string[] = []
    ownSectionRe.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = ownSectionRe.exec(text)) !== null) out.push(m[1].toLowerCase())
    return out
  }

  const events: HeadingMismatchEvent[] = []
  const check = (
    concept: HeadingConcept,
    cited: string[],
    field: HeadingMismatchEvent['field'],
    itemId: string,
    downgrade: () => void,
  ): void => {
    const expected = canonical[concept]
    if (!expected.length) return // no canonical for this state → skip
    if (!cited.length) return // no own-state § cited → can't judge
    if (cited.some((c) => expected.includes(c))) return // the right § is present → OK
    events.push({
      field,
      concept,
      item_id: itemId,
      cited,
      expected,
      reason: `citation heading mismatch: "${concept}" cited § ${cited.join('/')} ${lawToken}, but the corpus ${concept} § for ${code} is § ${expected.join('/')}`,
    })
    downgrade()
  }

  type AnyUpsert = { op?: string; id?: string; quality?: string; title_de?: string; title_en?: string; rationale_de?: string; rationale_en?: string }

  // procedure — the procedure verdict §, anchored on the procedure TITLE.
  for (const p of (toolInput.procedures_delta ?? []) as AnyUpsert[]) {
    if (p.op !== 'upsert') continue
    check('procedure', extractOwn(`${p.title_de ?? ''} ${p.title_en ?? ''}`), 'procedure', p.id ?? '', () => { p.quality = 'ASSUMED' })
    // Sonderbau — only when a § sits within ~40 chars of "Sonderbau" (tight
    // proximity avoids flagging "kein Sonderbau … § 64 vereinfachtes").
    const r = `${p.rationale_de ?? ''} ${p.rationale_en ?? ''}`
    const near = sonderbauAdjacent(r, ownSectionRe)
    if (near.length) check('sonderbau', near, 'procedure', p.id ?? '', () => { p.quality = 'ASSUMED' })
  }

  // roles — architect → bauvorlage §; structural engineer → structural §.
  for (const r of (toolInput.roles_delta ?? []) as AnyUpsert[]) {
    if (r.op !== 'upsert') continue
    const concept = roleConcept(r)
    if (!concept) continue
    check(concept, extractOwn(`${r.rationale_de ?? ''} ${r.title_de ?? ''} ${r.title_en ?? ''}`), 'role', r.id ?? '', () => { r.quality = 'ASSUMED' })
  }

  // permitForm — only the building-permit application form document.
  for (const d of (toolInput.documents_delta ?? []) as AnyUpsert[]) {
    if (d.op !== 'upsert') continue
    const text = `${d.title_de ?? ''} ${d.title_en ?? ''}`
    if (!/bauantrag|antragsformular|building permit application|permit application form/i.test(text)) continue
    check('permitForm', extractOwn(text), 'document', d.id ?? '', () => { d.quality = 'ASSUMED' })
  }

  return events
}

/** Own-state §-numbers that sit within ~40 chars of the word "Sonderbau". */
function sonderbauAdjacent(text: string, ownSectionRe: RegExp): string[] {
  const out: string[] = []
  const re = new RegExp(`(?:Sonderbau\\w*[\\s\\S]{0,40}?(?:§|Art\\.)\\s*(\\d+[a-z]?))|(?:(?:§|Art\\.)\\s*(\\d+[a-z]?)[\\s\\S]{0,40}?Sonderbau)`, 'gi')
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    const n = (m[1] ?? m[2])?.toLowerCase()
    // only count it if it's an own-state § (the surrounding text names the law)
    if (n && ownSectionRe.test(text)) out.push(n)
  }
  return out
}
