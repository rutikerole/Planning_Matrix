/**
 * Phase 3.5 #62 — heuristic mapping from a document title to its
 * HOAI Leistungsphase (LP 1 … LP 9).
 *
 * Pattern-matches German title keywords. Used to group the document
 * checklist by the standard architect's project phases. When a
 * document doesn't match any pattern, falls back to LP 4
 * (Genehmigungsplanung) — the phase most permit-bound documents
 * belong to.
 */

export type HoaiPhase = 'LP 1' | 'LP 2' | 'LP 3' | 'LP 4' | 'LP 5' | 'LP 6' | 'LP 7' | 'LP 8' | 'LP 9'

export const HOAI_LABELS_DE: Record<HoaiPhase, string> = {
  'LP 1': 'Grundlagenermittlung',
  'LP 2': 'Vorplanung',
  'LP 3': 'Entwurfsplanung',
  'LP 4': 'Genehmigungsplanung',
  'LP 5': 'Ausführungsplanung',
  'LP 6': 'Vorbereitung der Vergabe',
  'LP 7': 'Mitwirkung bei der Vergabe',
  'LP 8': 'Objektüberwachung',
  'LP 9': 'Objektbetreuung',
}

export const HOAI_LABELS_EN: Record<HoaiPhase, string> = {
  'LP 1': 'Basic evaluation',
  'LP 2': 'Preliminary planning',
  'LP 3': 'Design planning',
  'LP 4': 'Permit planning',
  'LP 5': 'Implementation planning',
  'LP 6': 'Tender preparation',
  'LP 7': 'Tender support',
  'LP 8': 'Site supervision',
  'LP 9': 'Project after-care',
}

/** Pattern-keyword → LP. Earlier patterns win. */
const RULES: Array<{ pattern: RegExp; phase: HoaiPhase }> = [
  { pattern: /bestandsaufnahme|grundlagenermittlung|voruntersuchung/i, phase: 'LP 1' },
  { pattern: /lageplan|vorplanung|gestaltungs|funktions/i, phase: 'LP 2' },
  { pattern: /entwurf|baubeschreibung/i, phase: 'LP 3' },
  { pattern: /standsicherheit|tragwerk(s|)nachweis|w(ä|ae)rmeschutz|geg|brandschutznachweis|stellplatz|bauzeichnung|bauantrag|baugenehmigung|grundst(ü|u)ck|entw(ä|a)sserung|baulast/i, phase: 'LP 4' },
  { pattern: /ausf(ü|u)hrungs|werkplanung|detailplanung/i, phase: 'LP 5' },
  { pattern: /leistungsverzeichnis|ausschreibung|vergabe/i, phase: 'LP 7' },
  { pattern: /bauleitung|objekt(ü|u)berwachung|abnahme/i, phase: 'LP 8' },
  { pattern: /m(ä|a)ngel|gew(ä|a)hrleistung|nachbetreuung/i, phase: 'LP 9' },
]

export function classifyDocument(title: string): HoaiPhase {
  for (const { pattern, phase } of RULES) {
    if (pattern.test(title)) return phase
  }
  // Default: most checklist items in our domain are permit documents.
  return 'LP 4'
}

/** Returns a map of phase → documents in the order they were given. */
export function groupByPhase<T extends { title_de: string; title_en: string }>(
  items: T[],
): Map<HoaiPhase, T[]> {
  const buckets = new Map<HoaiPhase, T[]>()
  items.forEach((item) => {
    const phase = classifyDocument(item.title_de)
    const list = buckets.get(phase) ?? []
    list.push(item)
    buckets.set(phase, list)
  })
  // Return in canonical LP order
  const ordered = new Map<HoaiPhase, T[]>()
  ;(['LP 1', 'LP 2', 'LP 3', 'LP 4', 'LP 5', 'LP 6', 'LP 7', 'LP 8', 'LP 9'] as HoaiPhase[]).forEach(
    (k) => {
      const v = buckets.get(k)
      if (v && v.length > 0) ordered.set(k, v)
    },
  )
  return ordered
}
