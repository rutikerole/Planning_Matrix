// ───────────────────────────────────────────────────────────────────────
// fix/t06-walk2 — THE shared recommendations selector.
//
// Walk-2 evidence (Jena, storey-addition-wagnergasse-2026-06-12): FOUR
// duplicate structural-engineer recommendations shipped as PDF Section
// VIII items 01/02/04/06 (two with byte-identical titles), and the .md
// Top-3 carried the rank-1/rank-2 pair — because the PDF Section VIII +
// Executive Top-3 (exportPdf) and the .md Top-3 (exportMarkdown) each
// raw-rank-sorted `state.recommendations`, while only the web "Do next"
// card deduped (composeDoNext). Same CLASS-1 two-sources-of-truth split
// the roles/documents surfaces already solved with resolveRoles /
// resolveDocuments — this module is that pattern for recommendations.
// EVERY surface must consume it; raw `state.recommendations` sorts in
// render code are the bug class (pinned in smoke-t06-composer).
//
// Dedup axis: ACTOR + TOPIC — deliberately NOT action verbs. Walk 1's
// verb lexicon (beauftragen/commission/engage/…) was an open set the
// persona out-styled within one walk ("Appoint…", "…bestellen"). The
// stable axes in this domain are WHO acts (the specialist/authority) and
// WHAT it concerns (Statik, Rettungsweg, Stellplatz, B-Plan, …): the
// persona varies verbs freely but cannot re-recommend the same actor on
// the same topic without it being the same step. Two recs collide only
// when BOTH actor AND topic resolve and match; anything unresolved is
// never deduped — genuine non-duplicates are never dropped. The
// richer-rationale member survives, in the duplicate group's best slot.
// ───────────────────────────────────────────────────────────────────────

import type { ProjectState, Recommendation } from '@/types/projectState'

const ACTORS: ReadonlyArray<readonly [RegExp, string]> = [
  [/tragwerksplan|statiker|statikbüro|statikbuero|structural engineer/i, 'tragwerksplaner'],
  [/architekt|architect/i, 'architekt'],
  [/energieberat|energy consultant/i, 'energieberater'],
  [/vermesser|surveyor/i, 'vermesser'],
  [/brandschutz(?:planer|gutachter|sachverständig|sachverstaendig)|fire.protection (?:planner|expert)/i, 'brandschutzplaner'],
  [/bauamt|baurechtsamt|bauaufsicht|bauordnungsamt|stadtplanungsamt|feuerwehr|building authority|planning (?:office|department)|fire brigade/i, 'behoerde'],
]

// Topic = the subject matter of the step. Domain-bounded (building-permit
// consultations), so unlike verbs this set is small and stable; extend it
// when walks surface a new subject, not a new phrasing.
const TOPICS: ReadonlyArray<readonly [RegExp, string]> = [
  [/statik|tragwerk|tragstruktur|tragf|load.?bear|bestandsaufnahme|existing.?(?:building|structure|floors)|bestandsdecken|structural/i, 'statik'],
  [/rettungsweg|fluchtweg|escape|anleiter/i, 'rettungsweg'],
  [/stellplatz|stellplätze|parking|ablös|abloes/i, 'stellplatz'],
  [/bebauungsplan|b-?plan|planungsrecht|§\s*34/i, 'bplan'],
  [/brandschutz|feuerwiderstand|fire.?protection/i, 'brandschutz'],
  [/geg\b|energie|energy|wärmeschutz|waermeschutz/i, 'energie'],
  [/abstandsfl|grenzabstand|setback/i, 'abstandsflaechen'],
  [/denkmal|ensemble|heritage/i, 'denkmalschutz'],
  [/schadstoff|asbest|asbestos|pcb/i, 'schadstoffe'],
  [/vermessung|lageplan|site plan/i, 'lageplan'],
]

function firstMatch(
  lexicon: ReadonlyArray<readonly [RegExp, string]>,
  text: string,
): string | null {
  return lexicon.find(([rx]) => rx.test(text))?.[1] ?? null
}

/** Actor+topic signature, or null when either axis is unresolved
 *  (null = never deduped). Matches across BOTH language titles. */
export function recSignature(rec: Recommendation): string | null {
  const text = `${rec.title_de} ${rec.title_en}`
  const actor = firstMatch(ACTORS, text)
  const topic = firstMatch(TOPICS, text)
  return actor && topic ? `${actor}|${topic}` : null
}

/**
 * Rank-sorted, semantically deduped recommendations — the single source
 * for the web "Do next" card, PDF Section VIII, PDF Executive Top-3 and
 * the .md Top-3. Order: ascending rank; a duplicate group occupies its
 * earliest member's slot, with the richer-rationale member as survivor.
 */
export function resolveRecommendations(
  state: Partial<ProjectState> | null | undefined,
): Recommendation[] {
  const sorted = (state?.recommendations ?? []).slice().sort((a, b) => a.rank - b.rank)
  const out: Recommendation[] = []
  const slotBySig = new Map<string, number>()
  for (const rec of sorted) {
    const sig = recSignature(rec)
    if (sig === null) {
      out.push(rec)
      continue
    }
    const slot = slotBySig.get(sig)
    if (slot === undefined) {
      slotBySig.set(sig, out.length)
      out.push(rec)
      continue
    }
    const incumbent = out[slot]
    const richer =
      (rec.detail_de + rec.detail_en).length >
      (incumbent.detail_de + incumbent.detail_en).length
    if (richer) out[slot] = rec
  }
  return out
}
