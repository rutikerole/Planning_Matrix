import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, m, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { Recommendation } from '@/types/projectState'
import { useFreshSet } from '../lib/useFreshSet'

interface Props {
  recommendations: Recommendation[]
}

const STAGGER_MS = 80

/**
 * Phase 3.2 #40 — TOP-3 cards in dossier register.
 *
 *   • Card body: paper, 1px hairline border at ink/12, drafting-blue
 *     hairline running down the left edge full height (signals where
 *     to read first).
 *   • Title: serif italic drop-cap (28px clay-deep, baseline-aligned)
 *     followed by an Inter title of equivalent visual weight. The
 *     drop-cap doubles as the visible position indicator (1, 2, 3) —
 *     not the model rank, which can drift (Phase 3.1 #29).
 *   • Detail: Inter 12 ink/85 leading 1.55.
 *   • Footer: hairline rule + Instrument Serif italic margin
 *     annotation OUTSIDE the card border. Footnote register.
 */
export function Top3({ recommendations }: Props) {
  const { t, i18n } = useTranslation()
  const reduced = useReducedMotion()
  const lang = (i18n.resolvedLanguage ?? 'de') as 'de' | 'en'

  const top = recommendations.slice().sort((a, b) => a.rank - b.rank).slice(0, 3)

  // Phase 7 Move 10a — flag newly-arriving recommendations for the
  // 2.4 s clay edge-bar fade. First-mount items are seeded as seen,
  // so existing top-3 entries don't pulse on initial render.
  const getRecId = useCallback((r: Recommendation) => r.id, [])
  const freshIds = useFreshSet(top, getRecId)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <p className="eyebrow text-foreground/60 text-[11px] tracking-[0.18em]">
          {t('chat.rail.top3')}
        </p>
        <span className="font-serif italic text-[9px] text-clay/60 tabular-figures">
          {String(top.length).padStart(2, '0')} / 03
        </span>
      </div>

      {top.length === 0 ? (
        <p className="font-serif italic text-[12px] text-clay/70 leading-relaxed">
          {t('chat.rail.empty')}
        </p>
      ) : (
        <ol className="flex flex-col gap-6">
          <AnimatePresence initial={false}>
            {top.map((rec, idx) => (
              <m.li
                key={rec.id}
                layout="position"
                initial={reduced ? false : { opacity: 0, y: 16 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  transition: {
                    delay: reduced ? 0 : (idx * STAGGER_MS) / 1000,
                    duration: reduced ? 0 : 0.3,
                    ease: [0.16, 1, 0.3, 1],
                  },
                }}
                exit={reduced ? { opacity: 0 } : { opacity: 0, transition: { duration: 0.2 } }}
                transition={{ layout: { duration: reduced ? 0 : 0.32, ease: [0.16, 1, 0.3, 1] } }}
                className="flex flex-col gap-2"
              >
                <article
                  className={cn(
                    'relative flex flex-col gap-2 border rounded-sm bg-paper px-5 py-6',
                    freshIds.has(rec.id)
                      ? 'border-clay-soft'
                      : 'border-border-strong/30',
                  )}
                >
                  {/* Drafting-blue hairline running full-height down the
                   * left edge of the card. */}
                  <span
                    aria-hidden="true"
                    className="absolute left-0 top-0 bottom-0 w-px bg-drafting-blue/35"
                  />
                  {/* Phase 7 Move 10a — clay 2 px edge bar that fades
                   * over 2.4 s when this rec was just added. Sits over
                   * the drafting-blue hairline so the freshness reads
                   * regardless of card content. */}
                  {freshIds.has(rec.id) && (
                    <span
                      aria-hidden="true"
                      className="absolute -left-px top-0 bottom-0 w-[2px] bg-clay rounded-l-[2px] pm-fresh-edge"
                    />
                  )}
                  <p className="font-display leading-snug text-ink display-tight">
                    <span className="font-serif italic text-[28px] text-clay-deep tabular-figures mr-2.5 align-baseline">
                      {idx + 1}.
                    </span>
                    <span className="text-title-lg">
                      {lang === 'en' ? rec.title_en : rec.title_de}
                    </span>
                  </p>
                  <p className="text-[12px] text-ink/85 leading-[1.55]">
                    {lang === 'en' ? rec.detail_en : rec.detail_de}
                  </p>
                </article>
                {/* Footer — Instrument Serif italic, hairline above, OUTSIDE
                 * the card border. Margin annotation, not a chip. */}
                <div className="flex flex-col gap-1.5 px-5">
                  <span aria-hidden="true" className="block h-px w-12 bg-border-strong/40" />
                  <p className="font-serif italic text-[11px] text-ink/55 leading-relaxed">
                    {t('chat.preliminaryFooter')}
                  </p>
                </div>
              </m.li>
            ))}
          </AnimatePresence>
        </ol>
      )}
    </div>
  )
}
