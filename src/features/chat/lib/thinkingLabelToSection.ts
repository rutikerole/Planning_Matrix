// ───────────────────────────────────────────────────────────────────────
// Polish Move 4 — ambient right-rail activity hint
//
// Maps a German thinking-label hint (or any short German text from the
// model's prior turn) to the right-rail section most likely to update
// on the next turn. The hint is set on chatStore.currentActivitySection
// before the chat-turn POST runs; the matching section's eyebrow shows
// a tiny clay dot pulsing while isAssistantThinking is true.
//
// Conservative on misses — if no keyword matches, default to top3.
// ───────────────────────────────────────────────────────────────────────

export type ActivitySection =
  | 'top3'
  | 'areas'
  | 'facts'
  | 'procedures'
  | 'documents'
  | 'roles'

export function thinkingLabelToSection(text: string | null | undefined): ActivitySection {
  if (!text) return 'top3'
  const lower = text.toLowerCase()

  // Order matters — more specific buckets first. Keyword set expanded
  // in Phase 3.1 #32 based on observed batch-4 live transcript phrasing
  // ("Festsetzungen", "Vollgeschosse", "Verfahrensoptionen", "Gebietsart").
  if (
    /\bfachplaner\b|\brolle\b|\btragwerk\b|\bbrandschutz\b|\benergieber|\bvermessung\b|\barchitekt|\bbauvorlage/i.test(
      lower,
    )
  ) {
    return 'roles'
  }
  if (/\bdokument|\bunterlage|\blageplan|\bbauzeichnung|\bnachweis|\bgrundbuch|\bkataster/i.test(lower)) {
    return 'documents'
  }
  if (
    /\bverfahren|\bgenehmigung|\bart\.?\s*5[789]\b|\bvereinfacht|\bregelverfahren|\bfreistellung/i.test(
      lower,
    )
  ) {
    return 'procedures'
  }
  if (
    /\bgeb(ä|ae)udeklasse\b|\beckdat|\bfakt|\bvollgeschoss|\bbgf\b|\bbrutto[- ]?grundfl(ä|ae)che|\bgeschosszahl|\bgr(ö|oe)(ß|ss)enordnung\b/i.test(
      lower,
    )
  ) {
    return 'facts'
  }
  if (
    /\bbereich\b|\bplanungsrecht\b|\bbauordnung\b|\bvorgabe\b|\bden(k|c)mal\b|\bnaturschutz\b|\bfestsetzung|\bgebietsart|\bwohngebiet|\bbaunvo|\bb-plan|\bbebauungsplan/i.test(
      lower,
    )
  ) {
    return 'areas'
  }
  if (/\bempfehlung|\bschritt|\bn(ä|ae)chst/i.test(lower)) {
    return 'top3'
  }
  return 'top3'
}
