import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type {
  EstimatedEffort,
  ProjectState,
  Recommendation,
  ResponsibleParty,
} from '@/types/projectState'
import { CircledNumeral } from './CircledNumeral'

interface Props {
  state: Partial<ProjectState>
}

const EFFORT_LABELS_DE: Record<EstimatedEffort, string> = {
  '1d': '1 Werktag',
  '1-3d': '1–3 Werktage',
  '1w': 'ca. 1 Woche',
  '2-4w': '2–4 Wochen',
  months: 'mehrere Monate',
}
const EFFORT_LABELS_EN: Record<EstimatedEffort, string> = {
  '1d': '1 working day',
  '1-3d': '1–3 working days',
  '1w': 'approx. 1 week',
  '2-4w': '2–4 weeks',
  months: 'several months',
}

const PARTY_LABELS_DE: Record<ResponsibleParty, string> = {
  bauherr: 'Bauherr',
  architekt: 'Architekt:in',
  fachplaner: 'Fachplaner:in',
  bauamt: 'Bauamt',
}
const PARTY_LABELS_EN: Record<ResponsibleParty, string> = {
  bauherr: 'Owner',
  architekt: 'Architect',
  fachplaner: 'Specialist',
  bauamt: 'Building authority',
}

/**
 * Phase 3.5 #61 — Section III: Top 3 next steps in hero treatment.
 *
 * Each recommendation gets a custom hand-drawn circled numeral, an
 * Instrument Serif title at 36px, an Inter detail block at 16/1.6,
 * and two meta lines (effort + responsible party) at the bottom.
 * Effort + party come straight from the model's emitted fields when
 * present; otherwise render `—` (graceful for legacy rows).
 *
 * Recommendations beyond rank 3 collapse into a `<details>` accordion
 * below.
 */
export function TopThreeHero({ state }: Props) {
  const { t, i18n } = useTranslation()
  const lang = (i18n.resolvedLanguage ?? 'de') as 'de' | 'en'
  const recs = (state.recommendations ?? [])
    .slice()
    .sort((a, b) => a.rank - b.rank)
  const top = recs.slice(0, 3)
  const more = recs.slice(3)

  if (top.length === 0) return null

  return (
    <section
      id="sec-top3"
      className="px-6 sm:px-12 lg:px-20 py-20 sm:py-24 max-w-3xl mx-auto w-full scroll-mt-16 flex flex-col gap-8"
    >
      <header className="flex items-baseline gap-4">
        <span className="font-serif italic text-[20px] text-clay-deep tabular-figures leading-none w-10 shrink-0">
          III
        </span>
        <span className="text-[11px] uppercase tracking-[0.22em] font-medium text-foreground/65">
          {t('result.topThree.eyebrow', {
            defaultValue: 'Die nächsten drei Schritte',
          })}
        </span>
      </header>

      <span aria-hidden="true" className="block h-px w-12 bg-ink/20" />

      <ol className="flex flex-col gap-12 sm:gap-16">
        {top.map((rec, idx) => (
          <RecommendationRow
            key={rec.id}
            rec={rec}
            position={idx + 1}
            lang={lang}
            t={t}
          />
        ))}
      </ol>

      {more.length > 0 && (
        <details className="mt-4 group">
          <summary className="cursor-pointer font-serif italic text-[14px] text-clay/85 hover:text-ink list-none inline-flex items-center gap-2">
            <span aria-hidden="true" className="font-serif italic text-clay-deep">
              ⌃
            </span>
            {t('result.topThree.moreToggle', {
              defaultValue: 'Weitere Empfehlungen ({{n}})',
              n: more.length,
            })}
          </summary>
          <ol className="flex flex-col gap-6 mt-6 pl-4 border-l border-ink/12">
            {more.map((rec, idx) => (
              <li key={rec.id} className="flex flex-col gap-1">
                <p className="font-serif text-[16px] text-ink leading-snug">
                  <span className="text-clay/72 font-medium tabular-figures mr-2">
                    {idx + 4}.
                  </span>
                  {lang === 'en' ? rec.title_en : rec.title_de}
                </p>
                <p className="text-[12px] text-ink/65 leading-relaxed">
                  {lang === 'en' ? rec.detail_en : rec.detail_de}
                </p>
              </li>
            ))}
          </ol>
        </details>
      )}
    </section>
  )
}

interface RecommendationRowProps {
  rec: Recommendation
  position: number
  lang: 'de' | 'en'
  t: (key: string, opts?: Record<string, unknown>) => string
}

/**
 * Phase 3.6 #72 — `Begonnen` checkbox per recommendation, persisted in
 * localStorage scoped to the project id. Survives reloads and stays
 * client-only — chat-turn isn't called.
 */
function useStartedFlag(recId: string): [boolean, () => void] {
  const { id: projectId } = useParams<{ id: string }>()
  const storageKey = `pm:started:${projectId}:${recId}`
  // Lazy init reads from storage on mount synchronously. recId is stable
  // for the row's lifetime, so we don't need to re-read on key change.
  const [started, setStarted] = useState(() => {
    if (typeof window === 'undefined') return false
    try {
      return window.localStorage.getItem(storageKey) === '1'
    } catch {
      return false
    }
  })

  const toggle = () => {
    setStarted((prev) => {
      const next = !prev
      try {
        if (next) window.localStorage.setItem(storageKey, '1')
        else window.localStorage.removeItem(storageKey)
      } catch {
        /* same — ignore */
      }
      return next
    })
  }

  return [started, toggle]
}

function RecommendationRow({ rec, position, lang, t }: RecommendationRowProps) {
  const title = lang === 'en' ? rec.title_en : rec.title_de
  const detail = lang === 'en' ? rec.detail_en : rec.detail_de
  const effortLabel = rec.estimated_effort
    ? lang === 'en'
      ? EFFORT_LABELS_EN[rec.estimated_effort]
      : EFFORT_LABELS_DE[rec.estimated_effort]
    : '—'
  const partyLabel = rec.responsible_party
    ? lang === 'en'
      ? PARTY_LABELS_EN[rec.responsible_party]
      : PARTY_LABELS_DE[rec.responsible_party]
    : '—'

  const [started, toggleStarted] = useStartedFlag(rec.id)

  return (
    <li className="grid grid-cols-[64px_1fr] gap-x-5 sm:gap-x-7">
      <CircledNumeral n={position} size={56} />
      <div className={cn('flex flex-col gap-3 pt-1 transition-opacity duration-soft', started && 'opacity-60')}>
        <h3
          className={cn(
            'font-display text-[clamp(24px,3.4vw,36px)] text-ink leading-[1.1] -tracking-[0.012em]',
            started && 'line-through decoration-clay/40 decoration-1',
          )}
        >
          {title}
        </h3>
        <span aria-hidden="true" className="block h-px w-12 bg-ink/20" />
        <p className="text-[16px] text-ink/85 leading-[1.65] max-w-2xl">
          {detail}
        </p>
        <div className="flex flex-wrap items-center gap-x-10 gap-y-2 mt-3">
          <MetaPair
            label={t('result.topThree.effortLabel', {
              defaultValue: 'Geschätzter Aufwand',
            })}
            value={effortLabel}
          />
          <MetaPair
            label={t('result.topThree.partyLabel', {
              defaultValue: 'Verantwortlich',
            })}
            value={partyLabel}
          />
          <button
            type="button"
            onClick={toggleStarted}
            aria-pressed={started}
            className={cn(
              'inline-flex items-center gap-1.5 h-11 sm:h-8 px-4 sm:px-3 ml-auto text-[12px] font-medium border transition-colors duration-soft',
              'rounded-[var(--pm-radius-pill)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              started
                ? 'bg-clay/15 border-clay/35 text-clay'
                : 'bg-paper border-ink/15 text-ink/65 hover:border-ink/30 hover:text-ink',
            )}
          >
            <Check
              aria-hidden="true"
              className={cn(
                'size-3.5 transition-transform duration-soft',
                started ? 'opacity-100 scale-100' : 'opacity-0 scale-50',
              )}
            />
            {started
              ? t('result.topThree.started', { defaultValue: 'Begonnen' })
              : t('result.topThree.markStarted', { defaultValue: 'Als begonnen markieren' })}
          </button>
        </div>
      </div>
    </li>
  )
}

function MetaPair({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1.5 leading-none">
      <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-clay">
        {label}
      </span>
      <span className="font-serif italic text-[14px] text-ink/85 tabular-figures leading-snug">
        {value}
      </span>
    </div>
  )
}
