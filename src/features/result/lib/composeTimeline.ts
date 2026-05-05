/**
 * Phase 8.1 — single source of truth for procedure-phase data.
 *
 * Phase 8 shipped two duplicates of this constant: one inside
 * CostTimelineTab.tsx (4 phases) and one inside ProcedureDocumentsTab.tsx
 * (5 phases — included Approval as a milestone). The split risked
 * drift; this module unifies them and lets both tabs consume the same
 * shape.
 *
 * Phase weights drive the proportional bar widths (relative to total).
 * Range copy is rendered as-is per locale; the durations are
 * institutional Bayern norms ± typical practitioner experience, NOT
 * verified for any specific Bauamt — surfaced with the existing
 * "subject to authority workload" caveat in copy.
 */

export interface ProcedurePhase {
  /** Stable id; usable as a React key. */
  key: string
  labelDe: string
  labelEn: string
  /** Bar weight relative to the others (sum determines per-phase width%). */
  weight: number
  rangeDe: string
  rangeEn: string
  /** When true, the phase is a single moment rather than a duration —
   *  cost-tab renderers may collapse the bar to a marker. */
  milestone?: boolean
}

export const PROCEDURE_PHASES: ProcedurePhase[] = [
  {
    key: 'preparation',
    labelDe: 'Vorbereitung',
    labelEn: 'Preparation',
    weight: 11,
    rangeDe: 'ca. 8–14 Wochen',
    rangeEn: 'approx. 8–14 weeks',
  },
  {
    key: 'submission',
    labelDe: 'Einreichung',
    labelEn: 'Submission',
    weight: 1,
    rangeDe: 'ca. 1 Woche',
    rangeEn: 'approx. 1 week',
  },
  {
    key: 'review',
    labelDe: 'Prüfung',
    labelEn: 'Review',
    weight: 8,
    rangeDe: 'ca. 6–10 Wochen',
    rangeEn: 'approx. 6–10 weeks',
  },
  {
    key: 'corrections',
    labelDe: 'Korrekturen',
    labelEn: 'Corrections',
    weight: 4,
    rangeDe: 'ca. 2 Wochen',
    rangeEn: 'approx. 2 weeks',
  },
  {
    key: 'approval',
    labelDe: 'Genehmigung',
    labelEn: 'Approval',
    weight: 1,
    rangeDe: 'Stichtag',
    rangeEn: 'milestone',
    milestone: true,
  },
]

export function totalPhaseWeight(): number {
  return PROCEDURE_PHASES.reduce((sum, p) => sum + p.weight, 0)
}

/**
 * Returns approximate total weeks across all duration-bearing phases
 * (excluding milestones). Used by the calendar-math row in C.3.
 */
export function approximateTotalWeeks(): { min: number; max: number } {
  // Min = lower bounds of each range; max = upper bounds. Pulled from
  // the labelled ranges for transparency.
  const ranges: Array<{ min: number; max: number }> = [
    { min: 8, max: 14 }, // preparation
    { min: 1, max: 1 }, // submission
    { min: 6, max: 10 }, // review
    { min: 2, max: 2 }, // corrections
  ]
  return ranges.reduce(
    (acc, r) => ({ min: acc.min + r.min, max: acc.max + r.max }),
    { min: 0, max: 0 },
  )
}
