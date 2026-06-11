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

export function totalPhaseWeight(phases?: ReadonlyArray<ProcedurePhase>): number {
  return (phases ?? PROCEDURE_PHASES).reduce((sum, p) => sum + p.weight, 0)
}

// ───────────────────────────────────────────────────────────────────────
// Stale-deploy sprint (closes the 224e80c deferral) — procedure-aware
// timeline, ONE selector for BOTH surfaces.
//
// The canonical week-resolution phase data (previously defined inside
// pdfSections/timeline.ts) lives HERE because this module is the declared
// single source of truth for procedure-phase data and is render-free:
// pdfSections/timeline.ts imports pdfPrimitives → pdf-lib, so hosting the
// constants there would have dragged pdf-lib into the eager index chunk
// the moment the web tab consumed them. pdfSections/timeline.ts
// re-exports everything below, so exportPdf + existing imports are
// untouched.
//
// selectTimelineVariant is the ONLY gating function — exportPdf and
// CostTimelineTab both call it, so a web/PDF timeline split is
// structurally impossible (same pattern as the procedure card).
// Smoke-pinned in scripts/smoke-t05-composer.mts (F10).
// ───────────────────────────────────────────────────────────────────────

export interface TimelinePhase {
  /** pdfStrings key (e.g. 'timeline.phase.prep'). */
  labelKey: string
  /** pdfStrings key for the duration (e.g. 'timeline.phase.prep.duration'). */
  durationKey: string
  startWeek: number
  endWeek: number
  kind: 'work' | 'wait'
}

// v1.0.28 Bug 58 — verfahrensfrei Abbruch (demolition) phase set. NO Bauamt
// submission/review/corrections cycle — the work is survey → procurement →
// demolition.
export const VERFAHRENSFREI_DEMOLITION_PHASES: ReadonlyArray<TimelinePhase> = [
  {
    labelKey: 'timeline.demo.survey',
    durationKey: 'timeline.demo.survey.duration',
    startWeek: 0,
    endWeek: 4,
    kind: 'work',
  },
  {
    labelKey: 'timeline.demo.procure',
    durationKey: 'timeline.demo.procure.duration',
    startWeek: 2,
    endWeek: 6,
    kind: 'work',
  },
  {
    labelKey: 'timeline.demo.demolish',
    durationKey: 'timeline.demo.demolish.duration',
    startWeek: 6,
    endWeek: 9,
    kind: 'work',
  },
]
export const DEMOLITION_TOTAL_WEEKS = 10
export const DEMOLITION_MILESTONE_WEEK = 9

// T-05 sprint — ANZEIGE demolition phase set: survey → notification submission
// → STATUTORY WAIT (landesrechtlich, often 1 month — rendered as a wait lane,
// the critical-path element the v1.0.28 set had no model for) → procurement
// (parallel to the wait) → demolition. NO Bauamt review cycle and NO
// "Baugenehmigung issued" milestone — the milestone is the end of the
// notification period (work may begin).
export const ANZEIGE_DEMOLITION_PHASES: ReadonlyArray<TimelinePhase> = [
  {
    labelKey: 'timeline.demo.survey',
    durationKey: 'timeline.demo.survey.duration',
    startWeek: 0,
    endWeek: 4,
    kind: 'work',
  },
  {
    labelKey: 'timeline.demo.anzeige',
    durationKey: 'timeline.demo.anzeige.duration',
    startWeek: 4,
    endWeek: 5,
    kind: 'work',
  },
  {
    labelKey: 'timeline.demo.wait',
    durationKey: 'timeline.demo.wait.duration',
    startWeek: 5,
    endWeek: 9,
    kind: 'wait',
  },
  {
    labelKey: 'timeline.demo.procure',
    durationKey: 'timeline.demo.procure.duration',
    startWeek: 5,
    endWeek: 9,
    kind: 'work',
  },
  {
    labelKey: 'timeline.demo.demolish',
    durationKey: 'timeline.demo.demolish.duration',
    startWeek: 9,
    endWeek: 12,
    kind: 'work',
  },
]
export const ANZEIGE_DEMOLITION_TOTAL_WEEKS = 12
export const ANZEIGE_DEMOLITION_MILESTONE_WEEK = 9

export type TimelineVariant =
  | 'bauantrag'
  | 'verfahrensfrei_demolition'
  | 'anzeige_demolition'

/**
 * THE single gating function for the procedure-duration surface. Mirrors
 * resolveRoles' precedent: the decision kind is consulted for abbruch only —
 * every other intent's timeline is byte-identical to before. A genuinely
 * permit-required demolition (standard / vereinfachtes / bauvoranfrage kinds)
 * keeps the Bauamt cycle.
 */
export function selectTimelineVariant(
  intent: string | null | undefined,
  kind: string | undefined,
): TimelineVariant {
  if (intent !== 'abbruch') return 'bauantrag'
  if (kind === 'verfahrensfrei') return 'verfahrensfrei_demolition'
  if (kind === 'anzeige') return 'anzeige_demolition'
  return 'bauantrag'
}

/**
 * Web lane strings for the demolition variants, keyed by the canonical
 * labelKey/durationKey. Values MUST mirror PDF_STRINGS en/de byte-for-byte —
 * smoke-t05-composer F10 pins the equality, so drift cannot merge. (The
 * strings are duplicated rather than imported because pdfStrings.ts ships in
 * the lazy exportPdf chunk; importing it here would add it to the eager
 * index chunk for label text alone.)
 */
export const WEB_TIMELINE_STRINGS: Record<string, { de: string; en: string }> = {
  'timeline.demo.survey': { de: 'Schadstoffgutachten', en: 'Hazardous-materials survey' },
  'timeline.demo.survey.duration': { de: '2–4 Wochen', en: '2–4 weeks' },
  'timeline.demo.procure': { de: 'Beauftragung Abbruchunternehmen', en: 'Contractor procurement' },
  'timeline.demo.procure.duration': { de: '2–4 Wochen', en: '2–4 weeks' },
  'timeline.demo.demolish': { de: 'Abbruch + Entsorgung', en: 'Demolition + disposal' },
  'timeline.demo.demolish.duration': { de: '1–2 Wochen', en: '1–2 weeks' },
  'timeline.demo.milestone': { de: 'Abschluss-Meilenstein', en: 'Completion milestone' },
  'timeline.demo.anzeige': { de: 'Abbruchanzeige einreichen', en: 'Submit demolition notification' },
  'timeline.demo.anzeige.duration': { de: '1 Woche', en: '1 week' },
  'timeline.demo.wait': { de: 'Gesetzliche Anzeigefrist', en: 'Statutory notification period' },
  'timeline.demo.wait.duration': { de: '~4 Wochen · landesrechtlich', en: '~4 weeks · state law' },
  'timeline.demo.anzeige.milestone': { de: 'Anzeigefrist läuft ab', en: 'Notification period ends' },
}

export interface TimelineVariantView {
  variant: TimelineVariant
  phases: ProcedurePhase[]
  /** null → the default locale strings render (bauantrag path unchanged). */
  totalDe: string | null
  totalEn: string | null
  caveatDe: string | null
  caveatEn: string | null
  /** The submit-by → expected-approval calendar narrator only makes sense
   *  where a Bauamt approval exists. */
  showCalendar: boolean
}

function webPhasesFrom(
  canonical: ReadonlyArray<TimelinePhase>,
  milestoneLabelKey: string,
): ProcedurePhase[] {
  const s = (key: string): { de: string; en: string } =>
    WEB_TIMELINE_STRINGS[key] ?? { de: key, en: key }
  const lanes: ProcedurePhase[] = canonical.map((p) => ({
    key: p.labelKey,
    labelDe: s(p.labelKey).de,
    labelEn: s(p.labelKey).en,
    weight: Math.max(1, p.endWeek - p.startWeek),
    rangeDe: s(p.durationKey).de,
    rangeEn: s(p.durationKey).en,
  }))
  lanes.push({
    key: milestoneLabelKey,
    labelDe: s(milestoneLabelKey).de,
    labelEn: s(milestoneLabelKey).en,
    weight: 1,
    rangeDe: 'Stichtag',
    rangeEn: 'milestone',
    milestone: true,
  })
  return lanes
}

export function timelineVariantView(variant: TimelineVariant): TimelineVariantView {
  if (variant === 'verfahrensfrei_demolition') {
    return {
      variant,
      phases: webPhasesFrom(VERFAHRENSFREI_DEMOLITION_PHASES, 'timeline.demo.milestone'),
      totalDe: '~ 5–10 Wochen',
      totalEn: '~ 5–10 weeks',
      caveatDe:
        'verfahrensfrei — keine Bauamt-Prüfung; Dauer abhängig von Schadstoffgutachten und Verfügbarkeit des Abbruchunternehmens',
      caveatEn:
        'permit-free — no Bauamt review cycle; schedule depends on the hazardous-materials survey and contractor availability',
      showCalendar: false,
    }
  }
  if (variant === 'anzeige_demolition') {
    return {
      variant,
      phases: webPhasesFrom(ANZEIGE_DEMOLITION_PHASES, 'timeline.demo.anzeige.milestone'),
      totalDe: '~ 9–12 Wochen',
      totalEn: '~ 9–12 weeks',
      caveatDe:
        'Anzeigeverfahren — gesetzliche Anzeigefrist (landesrechtlich, oft 1 Monat) vor Beginn der Arbeiten; keine Bauamt-Prüfung',
      caveatEn:
        'notification procedure — statutory notification period (state law, often 1 month) before work may begin; no Bauamt review cycle',
      showCalendar: false,
    }
  }
  return {
    variant: 'bauantrag',
    phases: [...PROCEDURE_PHASES],
    totalDe: null,
    totalEn: null,
    caveatDe: null,
    caveatEn: null,
    showCalendar: true,
  }
}

/**
 * Returns approximate total weeks across all duration-bearing phases
 * (excluding milestones). Used by the calendar-math row in C.3.
 */
/**
 * Campaign Phase 5b — THE single procedure-aware timeline figure (months), the
 * one source every surface renders. Before this, the timeline diverged three
 * ways for the SAME ~17–27-week phase model: At-a-Glance showed procedure-aware
 * ranges, Executive Read rounded to a flat midpoint ("~6 months"), and the PDF
 * carried a static "~4–6 months" string. This unifies on At-a-Glance's
 * (correct) procedure-aware shape: a Freistellung/Anzeige is faster (no full
 * review); a full permit is slower; everything else follows the Gantt phase-sum
 * (approximateTotalWeeks ≈ 17–27 weeks ≈ 4–6 months). Keeps the procedure
 * differentiation a naive unify-to-Gantt would have wrongly flattened.
 */
export function approximateTimelineMonths(
  procedureType: import('./costNormsMuenchen').ProcedureType,
): { min: number; max: number } {
  if (procedureType === 'art57_freistellung') return { min: 2, max: 3 }
  if (procedureType === 'art60_baugenehmigung') return { min: 6, max: 9 }
  const w = approximateTotalWeeks()
  return { min: Math.round(w.min / 4.345), max: Math.round(w.max / 4.345) } // 17→4, 27→6
}

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
