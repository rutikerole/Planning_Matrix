import { useTranslation } from 'react-i18next'
import type { ProjectRow } from '@/types/db'
import type { ProjectState } from '@/types/projectState'
import {
  buildCostBreakdown,
  describeCostInputs,
  detectAreaSqm,
  detectKlasse,
  detectProcedure,
  formatEurRange,
  resolveInputs,
  type CostBreakdown,
} from '../../lib/costNormsMuenchen'
import { PROCEDURE_PHASES, totalPhaseWeight } from '../../lib/composeTimeline'
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
  const primaryRationale =
    procedures.find((p) => p.status === 'erforderlich')?.rationale_de ??
    procedures[0]?.rationale_de ??
    ''
  const procedure = detectProcedure(primaryRationale)
  const corpus = (state.facts ?? [])
    .map((f) => `${f.key} ${typeof f.value === 'string' ? f.value : ''}`)
    .join(' ')
    .toLowerCase()
  const klasse = detectKlasse(corpus)
  const areaSqm = detectAreaSqm(corpus)
  const opts = { areaSqm, bundesland: project.bundesland }
  const cost = buildCostBreakdown(procedure, klasse, opts)
  const inputs = resolveInputs(procedure, klasse, opts)
  const inputsLabel = describeCostInputs(inputs, lang)

  const totalWeight = totalPhaseWeight()
  const maxBar = Math.max(...COST_LINES.map((l) => cost[l.key].max), 1)

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
        <div className="border border-ink/12 rounded-[10px] bg-paper-card p-4 sm:p-5 flex flex-col gap-3">
          {COST_LINES.map((line) => {
            const bucket = cost[line.key]
            const startPct = (bucket.min / maxBar) * 100
            const widthPct = ((bucket.max - bucket.min) / maxBar) * 100
            const rationale =
              line.key !== 'total'
                ? findCostRationale(line.key, project.bundesland)
                : undefined
            return (
              <div
                key={line.key}
                className="grid grid-cols-1 sm:grid-cols-[170px_1fr_auto] sm:items-start gap-1.5 sm:gap-3 text-[12.5px]"
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
                <div
                  aria-hidden="true"
                  className="relative h-2 bg-ink/8 rounded-[1px] overflow-hidden mt-1.5"
                >
                  <span
                    className="absolute top-0 h-2 bg-clay/55 rounded-[1px]"
                    style={{
                      left: `${startPct}%`,
                      width: `${Math.max(widthPct, 1)}%`,
                    }}
                  />
                </div>
                <span className="font-serif italic text-clay-deep tabular-nums whitespace-nowrap text-right mt-1">
                  {formatEurRange(bucket, lang)}
                </span>
              </div>
            )
          })}
          <span aria-hidden="true" className="block h-px w-full bg-ink/12 mt-1" />
          <div className="grid grid-cols-1 sm:grid-cols-[170px_1fr_auto] sm:items-baseline gap-1.5 sm:gap-3 text-[13.5px]">
            <span className="font-medium text-ink leading-snug">
              {t('result.workspace.cost.totalEstimated')}
            </span>
            <span aria-hidden="true" className="hidden sm:block" />
            <span className="font-serif italic text-clay-deep tabular-nums whitespace-nowrap text-right">
              {formatEurRange(cost.total, lang)}
            </span>
          </div>
        </div>
        <p className="text-[11px] italic text-clay leading-relaxed border-l border-clay/35 pl-3">
          {t('result.workspace.cost.computedFromTooltip', { inputs: inputsLabel })}
          <br />
          {t('result.workspace.cost.caveat')}
        </p>
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
          {PROCEDURE_PHASES.map((phase, idx) => {
            const widthPct = Math.round((phase.weight / totalWeight) * 100)
            const note = findTimelineAnnotation(
              phase.key as
                | 'preparation'
                | 'submission'
                | 'review'
                | 'corrections'
                | 'approval',
            )
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
              {t('result.workspace.cost.totalDurationValue')}
            </span>
          </div>
          <p className="text-[11px] italic text-clay/85 leading-relaxed">
            {t('result.workspace.cost.subjectToWorkload')}
          </p>
        </div>

        {/* C.3 calendar narrator note. */}
        <CalendarNarrator lang={lang} />
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

function CalendarNarrator({ lang }: { lang: 'de' | 'en' }) {
  const { t } = useTranslation()
  const cal = composeCalendar()
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
