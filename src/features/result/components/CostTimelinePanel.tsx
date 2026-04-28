import { useTranslation } from 'react-i18next'
import type { ProjectState } from '@/types/projectState'
import {
  buildCostBreakdown,
  detectKlasse,
  detectProcedure,
  formatEurRange,
  type CostBreakdown,
} from '../lib/costNormsBayern'

interface Props {
  state: Partial<ProjectState>
}

interface PhaseBar {
  key: string
  labelDe: string
  labelEn: string
  /** Relative weight in the bar — total normalized to 24 cells across phases. */
  weight: number
  /** Range copy printed at the bar's right end, e.g. "ca. 8–14 Wochen". */
  rangeDe: string
  rangeEn: string
}

const PHASES: PhaseBar[] = [
  {
    key: 'vorbereitung',
    labelDe: 'Vorbereitung',
    labelEn: 'Preparation',
    weight: 11,
    rangeDe: 'ca. 8–14 Wochen',
    rangeEn: 'approx. 8–14 weeks',
  },
  {
    key: 'einreichung',
    labelDe: 'Einreichung',
    labelEn: 'Submission',
    weight: 1,
    rangeDe: 'ca. 1 Woche',
    rangeEn: 'approx. 1 week',
  },
  {
    key: 'pruefung',
    labelDe: 'Prüfung',
    labelEn: 'Review',
    weight: 8,
    rangeDe: 'ca. 6–10 Wochen',
    rangeEn: 'approx. 6–10 weeks',
  },
  {
    key: 'korrekturen',
    labelDe: 'Korrekturen',
    labelEn: 'Corrections',
    weight: 4,
    rangeDe: 'ca. 2 Wochen',
    rangeEn: 'approx. 2 weeks',
  },
]

const COST_LINES: Array<{ key: keyof CostBreakdown; labelDe: string; labelEn: string }> = [
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
 * Phase 3.5 #63 — Section VII: Kosten- und Zeitrahmen.
 *
 * Renders TWO paper schedules: a horizontal hatched timeline of permit
 * phases, and a cost breakdown by HOAI role (architect, structural,
 * surveyor, energy, fees) with a summed total. Both are framed as
 * orientation values with a ±25 % confidence interval — never as
 * binding quotes.
 *
 * Cost ranges come from costNormsBayern.ts, scaled by detected
 * procedure type + Gebäudeklasse from project state. Timeline phase
 * weights and ranges are static (procedural latency in Bayern is more
 * institutional than project-dependent at this scale).
 */
export function CostTimelinePanel({ state }: Props) {
  const { t, i18n } = useTranslation()
  const lang = (i18n.resolvedLanguage ?? 'de') as 'de' | 'en'

  const procedures = state.procedures ?? []
  const primaryRationale = procedures[0]?.rationale_de
  const procedure = detectProcedure(primaryRationale ?? '')
  const corpus = (state.facts ?? [])
    .map((f) => `${f.key} ${typeof f.value === 'string' ? f.value : ''}`)
    .join(' ')
    .toLowerCase()
  const klasse = detectKlasse(corpus)
  const cost = buildCostBreakdown(procedure, klasse)

  const totalWeight = PHASES.reduce((sum, p) => sum + p.weight, 0)

  return (
    <section
      id="sec-cost-timeline"
      className="px-6 sm:px-12 lg:px-20 py-20 sm:py-24 max-w-3xl mx-auto w-full scroll-mt-16 flex flex-col gap-8"
    >
      <header className="flex items-baseline gap-4">
        <span className="font-serif italic text-[20px] text-clay-deep tabular-figures leading-none w-10 shrink-0">
          VII
        </span>
        <span className="text-[10px] uppercase tracking-[0.22em] font-medium text-foreground/65">
          {t('result.costTimeline.eyebrow', {
            defaultValue: 'Kosten- und Zeitrahmen',
          })}
        </span>
      </header>

      <span aria-hidden="true" className="block h-px w-12 bg-ink/20" />

      <p className="font-serif italic text-[14px] text-ink/65 leading-relaxed max-w-xl">
        {t('result.costTimeline.intro', {
          defaultValue:
            'Erste Einschätzung — bitte mit Architekt:in präzisieren.',
        })}
      </p>

      {/* Timeline */}
      <div className="flex flex-col gap-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.20em] text-clay">
          {t('result.costTimeline.timelineEyebrow', {
            defaultValue: 'Verfahrensdauer',
          })}
        </p>
        <div className="border border-ink/12 rounded-[2px] bg-paper p-5 flex flex-col gap-3">
          {PHASES.map((p) => {
            const widthPct = Math.round((p.weight / totalWeight) * 100)
            return (
              <div
                key={p.key}
                className="grid grid-cols-[140px_1fr_auto] items-center gap-3 text-[13px]"
              >
                <span className="text-ink/85">{lang === 'en' ? p.labelEn : p.labelDe}</span>
                <span
                  aria-hidden="true"
                  className="block h-2 bg-clay/45 rounded-[1px]"
                  style={{ width: `${widthPct}%` }}
                />
                <span className="font-serif italic text-clay-deep tabular-figures whitespace-nowrap">
                  {lang === 'en' ? p.rangeEn : p.rangeDe}
                </span>
              </div>
            )
          })}
          <span aria-hidden="true" className="block h-px w-full bg-ink/15 mt-2" />
          <div className="grid grid-cols-[140px_1fr_auto] items-center gap-3 text-[14px]">
            <span className="font-medium text-ink">
              {t('result.costTimeline.totalLabel', {
                defaultValue: 'Gesamt',
              })}
            </span>
            <span aria-hidden="true" />
            <span className="font-serif italic text-clay-deep tabular-figures">
              {t('result.costTimeline.totalDuration', {
                defaultValue: 'ca. 4–6 Monate',
              })}
            </span>
          </div>
        </div>
      </div>

      {/* Cost breakdown */}
      <div className="flex flex-col gap-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.20em] text-clay">
          {t('result.costTimeline.costEyebrow', {
            defaultValue: 'Kostenrahmen',
          })}
          <span className="ml-2 font-serif italic text-clay/65 text-[11px] tracking-normal normal-case">
            {t('result.costTimeline.costSub', {
              defaultValue: '(Honorare nach HOAI · ohne Bauleistung)',
            })}
          </span>
        </p>
        <div className="border border-ink/12 rounded-[2px] bg-paper p-5 flex flex-col gap-2.5">
          {COST_LINES.map((line) => (
            <div
              key={line.key}
              className="flex items-baseline justify-between gap-3 text-[13.5px]"
            >
              <span className="text-ink/85">
                {lang === 'en' ? line.labelEn : line.labelDe}
              </span>
              <span className="font-serif italic text-clay-deep tabular-figures">
                {formatEurRange(cost[line.key], lang)}
              </span>
            </div>
          ))}
          <span aria-hidden="true" className="block h-px w-full bg-ink/15 mt-1" />
          <div className="flex items-baseline justify-between gap-3 text-[14.5px] mt-1">
            <span className="font-medium text-ink">
              {t('result.costTimeline.sumLabel', {
                defaultValue: 'Summe (geschätzt)',
              })}
            </span>
            <span className="font-serif italic text-clay-deep tabular-figures">
              {formatEurRange(cost.total, lang)}
            </span>
          </div>
          <p className="text-[11px] italic text-clay/85 leading-relaxed mt-3">
            {t('result.costTimeline.confidenceLine', {
              defaultValue: 'Sicherheit der Schätzung: ±25 %',
            })}
          </p>
        </div>
      </div>

      <p className="font-serif italic text-[12px] text-clay-deep leading-relaxed border-l border-clay/35 pl-4 max-w-xl">
        {t('result.costTimeline.caveat', {
          defaultValue:
            'Diese Werte sind Orientierungswerte basierend auf typischen Bayern-Honoraren für Vorhaben dieser Klasse.',
        })}
      </p>
    </section>
  )
}
