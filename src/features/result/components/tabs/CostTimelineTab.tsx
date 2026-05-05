import { useTranslation } from 'react-i18next'
import type { ProjectState } from '@/types/projectState'
import {
  buildCostBreakdown,
  detectKlasse,
  detectProcedure,
  formatEurRange,
  type CostBreakdown,
} from '../../lib/costNormsMuenchen'

interface Props {
  state: Partial<ProjectState>
}

interface PhaseSpec {
  key: string
  labelDe: string
  labelEn: string
  weight: number
  rangeDe: string
  rangeEn: string
}

const PHASES: PhaseSpec[] = [
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
]

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
export function CostTimelineTab({ state }: Props) {
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
  const cost = buildCostBreakdown(procedure, klasse)

  const totalWeight = PHASES.reduce((sum, p) => sum + p.weight, 0)
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
            return (
              <div
                key={line.key}
                className="grid grid-cols-1 sm:grid-cols-[170px_1fr_auto] sm:items-center gap-1.5 sm:gap-3 text-[12.5px]"
              >
                <span className="text-ink/85 leading-snug">
                  {lang === 'en' ? line.labelEn : line.labelDe}
                </span>
                <div
                  aria-hidden="true"
                  className="relative h-2 bg-ink/8 rounded-[1px] overflow-hidden"
                >
                  <span
                    className="absolute top-0 h-2 bg-clay/55 rounded-[1px]"
                    style={{
                      left: `${startPct}%`,
                      width: `${Math.max(widthPct, 1)}%`,
                    }}
                  />
                </div>
                <span className="font-serif italic text-clay-deep tabular-nums whitespace-nowrap text-right">
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
          {PHASES.map((phase, idx) => {
            const widthPct = Math.round((phase.weight / totalWeight) * 100)
            return (
              <div
                key={phase.key}
                className="flex flex-col gap-1.5 sm:grid sm:grid-cols-[140px_1fr_auto] sm:items-center sm:gap-3 text-[12.5px]"
              >
                <div className="flex items-baseline justify-between gap-3 sm:contents">
                  <span className="text-ink/85">
                    <span className="font-serif italic text-clay-deep mr-2 tabular-nums">
                      {idx + 1}
                    </span>
                    {lang === 'en' ? phase.labelEn : phase.labelDe}
                  </span>
                  <span className="sm:order-3 font-serif italic text-clay-deep tabular-nums whitespace-nowrap text-right">
                    {lang === 'en' ? phase.rangeEn : phase.rangeDe}
                  </span>
                </div>
                <span
                  aria-hidden="true"
                  className="block h-2 bg-clay/45 rounded-[1px] sm:order-2"
                  style={{ width: `${widthPct}%`, minWidth: '8px' }}
                />
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
      </section>
    </div>
  )
}
