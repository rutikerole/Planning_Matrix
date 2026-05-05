/**
 * Phase 8.2 (B.4) — short annotations for each procedure-phase row
 * in the Cost & Timeline tab. Italic-serif Georgia 11.5px below the
 * phase label so the bauherr knows what happens during each window.
 */

export interface TimelineAnnotation {
  /** Matches ProcedurePhase.key in composeTimeline.ts. */
  key: 'preparation' | 'submission' | 'review' | 'corrections' | 'approval'
  annotationDe: string
  annotationEn: string
}

export const TIMELINE_ANNOTATIONS: TimelineAnnotation[] = [
  {
    key: 'preparation',
    annotationDe:
      'Architekt LP 1–3 + Bauamt-Vorbereitung + Antwort auf Bebauungsplan-Anfrage.',
    annotationEn:
      'Architect LP 1–3 + Bauamt prep + reply to the Bebauungsplan inquiry.',
  },
  {
    key: 'submission',
    annotationDe:
      'Einmalige Einreichung mit allen vorgeschriebenen Unterlagen.',
    annotationEn: 'Single submission window with all required documents.',
  },
  {
    key: 'review',
    annotationDe:
      'Interne Bauamts-Prüfung inkl. Anhörungen der Fachbehörden (Brandschutz, Denkmal, Stadtgrün).',
    annotationEn:
      'Bauamt internal review including specialist authority consultations (fire protection, heritage, urban green).',
  },
  {
    key: 'corrections',
    annotationDe:
      'Rückfragen der Prüfer:innen werden beantwortet; bei Bedarf Nachreichung.',
    annotationEn:
      "Reviewer questions are answered; resubmission if needed.",
  },
  {
    key: 'approval',
    annotationDe:
      'Genehmigungsbescheid wird zugestellt; einmonatige Widerspruchsfrist beginnt.',
    annotationEn:
      'Genehmigungsbescheid is issued; the 1-month appeal window begins.',
  },
]

const BY_KEY = new Map(TIMELINE_ANNOTATIONS.map((a) => [a.key, a]))

export function findTimelineAnnotation(
  key: TimelineAnnotation['key'],
): TimelineAnnotation | undefined {
  return BY_KEY.get(key)
}
