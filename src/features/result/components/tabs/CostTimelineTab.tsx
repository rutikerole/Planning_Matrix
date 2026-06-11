import { useTranslation } from 'react-i18next'
import type { ProjectRow } from '@/types/db'
import type { ProjectState } from '@/types/projectState'
import {
  buildCostBreakdown,
  costBandFor,
  describeCostInputs,
  resolveCostKlasse,
  formatEurRange,
  resolveCostAreaSqm,
  resolveCostDisplayMode,
  resolveInputs,
  type CostBreakdown,
} from '../../lib/costNormsMuenchen'
import { resolveCostProcedureType } from '../../lib/resolveProcedures'
// Stale-deploy sprint (closes the 224e80c deferral) — the phase set comes
// from the SAME selector exportPdf calls, fed by the SAME ProcedureDecision:
// verfahrensfrei → demolition lanes, anzeige → statutory-wait lane, permit
// kinds → Bauamt cycle. The static Bauantrag-only phase mapping is gone
// (smoke-t05-composer F10 source-pins this file against re-introducing it).
import {
  selectTimelineVariant,
  timelineVariantView,
  totalPhaseWeight,
} from '../../lib/composeTimeline'
import { buildProcedureCase, resolveProcedure } from '@/legal/resolveProcedure'
import { findCostRationale } from '@/data/costRationales'
import { findTimelineAnnotation } from '@/data/timelineAnnotations'
import { composeCalendar, formatCalendarDate } from '../../lib/composeCalendar'
import {
  VorlaeufigFooter,
  isPending,
} from '@/features/architect/components/VorlaeufigFooter'

interface Props {
  project: ProjectRow
  state: Partial<ProjectState>
}

const COST_LINES: Array<{
  key: keyof CostBreakdown
  labelDe: string
  labelEn: string
}> = [
  {
    key: 'architekt',
    labelDe: 'Architekt:in (LP 1–4)',
    labelEn: 'Architect (LP 1–4)',
  },
  {
    key: 'tragwerksplanung',
    labelDe: 'Tragwerksplanung',
    labelEn: 'Structural engineering',
  },
  { key: 'vermessung', labelDe: 'Vermessung', labelEn: 'Surveying' },
  {
    key: 'energieberatung',
    labelDe: 'Energieberatung',
    labelEn: 'Energy consultation',
  },
  {
    key: 'behoerdengebuehren',
    labelDe: 'Behördengebühren',
    labelEn: 'Authority fees',
  },
]

/**
 * Phase 8 — Tab 5 Cost & timeline. Wraps the costNormsMuenchen heuristic
 * engine into the workspace tab. Two sub-sections: stacked cost bars
 * (each role's range as a horizontal bar, total at bottom with ±25%
 * confidence note) and a phase Gantt (5 phases with weight + range).
 *
 * Editable assumptions are deferred to a follow-up. The brief allows
 * client-side sliders; for v1 we surface the heuristic as-is and
 * expose the underlying engine via the JSON export.
 */
export function CostTimelineTab({ project, state }: Props) {
  const { t, i18n } = useTranslation()
  const lang = (i18n.resolvedLanguage ?? 'de') as 'de' | 'en'

  const procedures = state.procedures ?? []
  // Sprint 0 addendum — shared cost procedure-type resolver (canonical
  // resolveProcedures → primary → detectProcedure) used by every cost surface
  // so the procedure multiplier can never diverge from the PDF / At-a-Glance /
  // Executive Read (mirrors resolveCostAreaSqm for the area axis).
  const procedure = resolveCostProcedureType(project, state)
  const corpus = (state.facts ?? [])
    .map((f) => `${f.key} ${typeof f.value === 'string' ? f.value : ''}`)
    .join(' ')
    .toLowerCase()
  const klasse = resolveCostKlasse(state.facts, corpus)
  // Sprint 0 (P1-A) — single shared cost-area resolver (template-aware
  // first, corpus-regex backstop) used by every cost surface so the
  // Cost tab can never diverge from the PDF / At-a-Glance / Executive Read.
  const areaSqm = resolveCostAreaSqm(state.facts, state.templateId)
  const opts = { areaSqm, bundesland: project.bundesland }
  const cost = buildCostBreakdown(procedure, klasse, opts)
  const inputs = resolveInputs(procedure, klasse, opts)
  // Sprint 0 addendum — when no area resolved from facts, the engine uses the
  // BASE_AREA_SQM default; label it "(Annahme)" so the caption is as honest as
  // the PDF's no-area phrasing (numbers already agree).
  const inputsLabel = describeCostInputs(inputs, lang, areaSqm == null)
  // T-03 sprint (P1) — derive the cost-display mode from the SINGLE shared
  // resolver (costNormsMuenchen) so the Cost tab, PDF, At-a-Glance and
  // Executive Read can never disagree on which surface shows a € figure vs an
  // honest stub. (Was four parallel ad-hoc booleans; the same predicate now
  // lives in one place.) Demolition: no sourced BKI demolition factors exist
  // (C11_DATA_GAPS GAP-4) → honest stub. T-03/T-04 (renovation/use-conversion)
  // likewise carry no HOAI new-build schedule. T-02/T-06/T-07/T-08 → sourced
  // headline band. T-01 → engine bars.
  const costMode = resolveCostDisplayMode(state.templateId, project.intent)
  const isDemolition = costMode === 'demolition'
  const isUseConversion = costMode === 'useConversion'
  const isRenovation = costMode === 'renovation'
  const isHeadlineBand = costMode === 'headlineBand'
  const band = costBandFor(state.templateId)

  // Decision kind consulted for abbruch only (resolveRoles precedent) —
  // every other intent's timeline render is byte-identical to before.
  const decisionKind =
    project.intent === 'abbruch'
      ? resolveProcedure(buildProcedureCase(project, state as ProjectState)).kind
      : undefined
  const timeline = timelineVariantView(
    selectTimelineVariant(project.intent, decisionKind),
  )
  const isBauantragTimeline = timeline.variant === 'bauantrag'
  const totalWeight = totalPhaseWeight(timeline.phases)

  return (
    <div className="flex flex-col gap-10 max-w-[1100px]">
      {/* Cost breakdown */}
      <section aria-labelledby="cost-eyebrow" className="flex flex-col gap-3">
        <header className="flex items-baseline justify-between gap-3">
          <p
            id="cost-eyebrow"
            className="text-[10px] font-medium uppercase tracking-[0.22em] text-clay leading-none"
          >
            {t('result.workspace.cost.costEyebrow')}
          </p>
          <span className="text-[11px] italic text-clay/85">
            {t('result.workspace.cost.confidence')}
          </span>
        </header>
        {isDemolition ? (
          <div className="border border-clay/30 rounded-[10px] bg-paper-card p-4 sm:p-5">
            <p className="text-[13px] leading-relaxed text-ink/80">
              {t('result.workspace.cost.demolitionStub')}
            </p>
          </div>
        ) : isUseConversion ? (
          <div className="border border-clay/30 rounded-[10px] bg-paper-card p-4 sm:p-5">
            <p className="text-[13px] leading-relaxed text-ink/80">
              {t('result.workspace.cost.useConversionStub')}
            </p>
          </div>
        ) : isRenovation ? (
          <div className="border border-clay/30 rounded-[10px] bg-paper-card p-4 sm:p-5">
            <p className="text-[13px] leading-relaxed text-ink/80">
              {t('result.workspace.cost.renovationStub')}
            </p>
          </div>
        ) : isHeadlineBand ? (
          <div className="border border-clay/30 rounded-[10px] bg-paper-card p-4 sm:p-5 flex flex-col gap-2">
            <span className="font-serif italic text-clay-deep tabular-nums text-[15px]">
              {formatEurRange({ min: band.lower, max: band.upper }, lang)}
            </span>
            <p className="font-serif italic text-[11px] text-clay/85 leading-snug">
              {lang === 'en' ? band.basisEn : band.basisDe}
            </p>
            <p className="text-[11px] italic text-clay/85 leading-relaxed border-l border-clay/35 pl-3">
              {t('result.workspace.cost.headlineBandNote')}
            </p>
          </div>
        ) : (
          <>
        <div className="border border-ink/12 rounded-[10px] bg-paper-card p-4 sm:p-5 flex flex-col gap-3">
          {COST_LINES.map((line) => {
            const bucket = cost[line.key]
            const rationale =
              line.key !== 'total'
                ? findCostRationale(line.key, project.bundesland)
                : undefined
            return (
              <div
                key={line.key}
                className="grid grid-cols-1 sm:grid-cols-[1fr_auto] sm:items-baseline gap-0.5 sm:gap-6 text-[12.5px]"
                title={t('result.workspace.cost.computedFromTooltip', {
                  inputs: inputsLabel,
                })}
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-ink/85 leading-snug">
                    {lang === 'en' ? line.labelEn : line.labelDe}
                  </span>
                  {rationale && (
                    <span className="font-serif italic text-[10.5px] text-clay/85 leading-snug">
                      {lang === 'en'
                        ? rationale.rationaleEn
                        : rationale.rationaleDe}
                    </span>
                  )}
                </div>
                <span className="font-serif italic text-clay-deep tabular-nums whitespace-nowrap sm:text-right">
                  {formatEurRange(bucket, lang)}
                </span>
              </div>
            )
          })}
          <span aria-hidden="true" className="block h-px w-full bg-ink/12 mt-1" />
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] sm:items-baseline gap-0.5 sm:gap-6 text-[13.5px]">
            <span className="font-medium text-ink leading-snug">
              {t('result.workspace.cost.totalEstimated')}
            </span>
            <span className="font-serif italic text-clay-deep tabular-nums whitespace-nowrap sm:text-right">
              {formatEurRange(cost.total, lang)}
            </span>
          </div>
        </div>
        <p className="text-[11px] italic text-clay leading-relaxed border-l border-clay/35 pl-3">
          {t('result.workspace.cost.computedFromTooltip', { inputs: inputsLabel })}
          <br />
          {t('result.workspace.cost.caveat')}
        </p>
          </>
        )}
      </section>

      {/* Timeline */}
      <section aria-labelledby="time-eyebrow" className="flex flex-col gap-3">
        <p
          id="time-eyebrow"
          className="text-[10px] font-medium uppercase tracking-[0.22em] text-clay leading-none"
        >
          {t('result.workspace.cost.timelineEyebrow')}
        </p>
        <div className="border border-ink/12 rounded-[10px] bg-paper-card p-4 sm:p-5 flex flex-col gap-3">
          {timeline.phases.map((phase, idx) => {
            const widthPct = Math.round((phase.weight / totalWeight) * 100)
            // Annotations exist for the Bauantrag phase keys only; the
            // demolition lanes carry their meaning in the label + range.
            const note = isBauantragTimeline
              ? findTimelineAnnotation(
                  phase.key as
                    | 'preparation'
                    | 'submission'
                    | 'review'
                    | 'corrections'
                    | 'approval',
                )
              : undefined
            return (
              <div
                key={phase.key}
                className="flex flex-col gap-1.5 sm:grid sm:grid-cols-[160px_1fr_auto] sm:items-start sm:gap-3 text-[12.5px]"
              >
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-ink/85">
                      <span className="font-serif italic text-clay-deep mr-2 tabular-nums">
                        {idx + 1}
                      </span>
                      {lang === 'en' ? phase.labelEn : phase.labelDe}
                    </span>
                  </div>
                  {note && (
                    <span className="font-serif italic text-[10.5px] text-clay/85 leading-snug max-w-[260px]">
                      {lang === 'en' ? note.annotationEn : note.annotationDe}
                    </span>
                  )}
                </div>
                <span
                  aria-hidden="true"
                  className="block h-2 bg-clay/45 rounded-[1px] mt-1.5"
                  style={{ width: `${widthPct}%`, minWidth: '8px' }}
                />
                <span className="font-serif italic text-clay-deep tabular-nums whitespace-nowrap text-right mt-1">
                  {lang === 'en' ? phase.rangeEn : phase.rangeDe}
                </span>
              </div>
            )
          })}
          <span aria-hidden="true" className="block h-px w-full bg-ink/12 mt-1" />
          <div className="flex items-baseline justify-between gap-3 text-[13px]">
            <span className="font-medium text-ink">
              {t('result.workspace.cost.totalDuration')}
            </span>
            <span className="font-serif italic text-clay-deep tabular-nums">
              {(lang === 'en' ? timeline.totalEn : timeline.totalDe) ??
                t('result.workspace.cost.totalDurationValue')}
            </span>
          </div>
          <p className="text-[11px] italic text-clay/85 leading-relaxed">
            {(lang === 'en' ? timeline.caveatEn : timeline.caveatDe) ??
              t('result.workspace.cost.subjectToWorkload')}
          </p>
        </div>

        {/* C.3 calendar narrator note — the submit-by → expected-approval
          * framing only exists where a Bauamt approval exists; suppressed on
          * the demolition variants (verfahrensfrei has no submission at all,
          * anzeige has no approval). */}
        {timeline.showCalendar && (
          <CalendarNarrator lang={lang} bundesland={project.bundesland} />
        )}
      </section>

      {/* v1.0.3 — tab-level aggregate. Cost lines themselves have no
        * qualifier (they are heuristic-derived); the underlying
        * procedures + documents do. Render the footer if any of them
        * is not yet DESIGNER+VERIFIED. */}
      {(procedures.some((p) =>
        isPending(p.qualifier?.source, p.qualifier?.quality),
      ) ||
        (state.documents ?? []).some((d) =>
          isPending(d.qualifier?.source, d.qualifier?.quality),
        )) && (
        <VorlaeufigFooter source={null} quality={null} />
      )}
    </div>
  )
}

function CalendarNarrator({
  lang,
  bundesland,
}: {
  lang: 'de' | 'en'
  bundesland: string | null
}) {
  const { t } = useTranslation()
  const cal = composeCalendar({ bundesland })
  const targetLong = formatCalendarDate(cal.targetDate, lang)
  const expectedLong = formatCalendarDate(cal.expectedDate, lang)
  const fallbackLong = cal.fallbackDate
    ? formatCalendarDate(cal.fallbackDate, lang)
    : null
  const reason = cal.closureHit
    ? lang === 'en'
      ? cal.closureHit.reasonEn
      : cal.closureHit.reasonDe
    : null

  return (
    <p className="font-serif italic text-[13px] text-ink leading-relaxed border-l border-clay/35 pl-4 max-w-[640px]">
      {t('result.workspace.calendar.ifSubmitBy', {
        targetDate: targetLong,
        expectedDate: expectedLong,
      })}
      {fallbackLong && reason && (
        <>
          {' '}
          {t('result.workspace.calendar.deadline', {
            deadlineDate: targetLong,
            fallbackDate: fallbackLong,
            reason,
          })}
        </>
      )}
    </p>
  )
}
