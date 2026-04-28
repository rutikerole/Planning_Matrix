import { useTranslation } from 'react-i18next'
import type { ProjectState } from '@/types/projectState'
import { aggregateQualifiers, type SliceKey } from '../lib/qualifierAggregate'
import { ConfidenceRadial } from './ConfidenceRadial'

interface Props {
  state: Partial<ProjectState>
}

/**
 * Phase 3.5 #63 — Section IX: Datengüte.
 *
 * Wraps the new confidence-radial primitive in a paper layout. Centre
 * label of the radial shows total datapoint count + "Datenpunkte"
 * label; below the radial sits a hatched-square legend with each
 * slice's color + count + percentage.
 *
 * Footer line: "{N} davon als Annahme markiert. Annahmen werden in
 * der Beratung mit Architekt:in verifiziert."
 */
export function ConfidenceDashboard({ state }: Props) {
  const { t, i18n } = useTranslation()
  const lang = (i18n.resolvedLanguage ?? 'de') as 'de' | 'en'
  const aggregate = aggregateQualifiers(state)

  if (aggregate.total === 0) return null

  const labelOrder: SliceKey[] = ['DECIDED', 'CALCULATED', 'VERIFIED', 'ASSUMED', 'UNKNOWN']

  return (
    <section
      id="sec-confidence"
      className="px-6 sm:px-12 lg:px-20 py-20 sm:py-24 max-w-3xl mx-auto w-full scroll-mt-16 flex flex-col gap-8"
    >
      <header className="flex items-baseline gap-4">
        <span className="font-serif italic text-[20px] text-clay-deep tabular-figures leading-none w-10 shrink-0">
          IX
        </span>
        <span className="text-[11px] uppercase tracking-[0.22em] font-medium text-foreground/65">
          {t('result.confidence.eyebrow', { defaultValue: 'Datengüte' })}
        </span>
      </header>

      <span aria-hidden="true" className="block h-px w-12 bg-ink/20" />

      <div className="flex flex-col items-center gap-8">
        <div className="relative">
          <ConfidenceRadial aggregate={aggregate} />
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[11px] font-medium uppercase tracking-[0.22em] text-clay leading-none">
              {t('result.confidence.totalEyebrow', {
                defaultValue: 'Insgesamt',
              })}
            </span>
            <span className="font-display text-[40px] text-ink leading-none mt-1 tabular-nums">
              {aggregate.total}
            </span>
            <span className="font-serif italic text-[13px] text-ink/65 leading-none mt-2">
              {t('result.confidence.totalLabel', {
                defaultValue: 'Datenpunkte',
              })}
            </span>
          </div>
        </div>

        <ul className="grid grid-cols-2 gap-x-10 gap-y-2 max-w-md text-[13px] leading-snug">
          {labelOrder
            .filter((k) => aggregate.counts[k] > 0)
            .map((k) => (
              <li key={k} className="flex items-center gap-3">
                <SliceSwatch sliceKey={k} />
                <span className="text-ink/85 flex-1">{labelFor(k, lang)}</span>
                <span className="font-serif italic text-clay-deep tabular-figures">
                  {Math.round((aggregate.counts[k] / aggregate.total) * 100)} %
                </span>
              </li>
            ))}
        </ul>
      </div>

      <p className="font-serif italic text-[13px] text-clay-deep leading-relaxed border-l border-clay/35 pl-4 max-w-xl">
        <span className="font-medium tabular-nums">{aggregate.assumedCount}</span>{' '}
        {t('result.confidence.assumedLine', {
          defaultValue: 'davon als Annahme markiert. Annahmen werden in der Beratung mit Architekt:in verifiziert.',
        })}
      </p>
    </section>
  )
}

function SliceSwatch({ sliceKey }: { sliceKey: SliceKey }) {
  const fill =
    sliceKey === 'DECIDED'
      ? 'bg-ink'
      : sliceKey === 'CALCULATED'
        ? 'bg-drafting-blue/80'
        : sliceKey === 'VERIFIED'
          ? 'bg-drafting-blue/55'
          : sliceKey === 'ASSUMED'
            ? 'bg-clay'
            : 'bg-ink/30'
  return (
    <span
      aria-hidden="true"
      className={`block size-3 rounded-[1px] ${fill}`}
    />
  )
}

function labelFor(key: SliceKey, lang: 'de' | 'en'): string {
  if (lang === 'en') {
    return {
      DECIDED: 'Decided by owner',
      CALCULATED: 'Calculated from law',
      VERIFIED: 'Verified',
      ASSUMED: 'Assumed',
      UNKNOWN: 'Other',
    }[key]
  }
  return {
    DECIDED: 'Vom Bauherrn entschieden',
    CALCULATED: 'Aus Gesetz abgeleitet',
    VERIFIED: 'Verifiziert',
    ASSUMED: 'Annahmen',
    UNKNOWN: 'Sonstiges',
  }[key]
}
