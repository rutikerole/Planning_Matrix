import { useTranslation } from 'react-i18next'
import { AnimatePresence, m, useReducedMotion } from 'framer-motion'
import type { Recommendation } from '@/types/projectState'

interface Props {
  recommendations: Recommendation[]
}

const STAGGER_MS = 80

/**
 * Top 3 next steps. Polish Move 3: serif italic number prefix, larger
 * title, smaller detail, footer line OUTSIDE the card with hairline
 * above (printed-dossier register, not Stripe-card register). Polish
 * Move 8: render only as many cards as exist (no placeholder slots),
 * stagger entries 80ms apart when multiple arrive in the same delta,
 * animate rank changes via Framer Motion `layout`.
 *
 * Reads sorted-by-rank-ascending top-3 from projectState. Empty state
 * is calm copy, not a placeholder grid.
 */
export function Top3({ recommendations }: Props) {
  const { t, i18n } = useTranslation()
  const reduced = useReducedMotion()
  const lang = (i18n.resolvedLanguage ?? 'de') as 'de' | 'en'

  const top = recommendations.slice().sort((a, b) => a.rank - b.rank).slice(0, 3)

  return (
    <div className="flex flex-col gap-3">
      <p className="eyebrow text-foreground/60 text-[10px] tracking-[0.18em]">
        {t('chat.rail.top3')}
      </p>

      {top.length === 0 ? (
        <p className="text-[12px] text-clay/70 italic leading-relaxed">
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
                <article className="flex flex-col gap-2 border border-border-strong/30 rounded-sm bg-paper px-5 py-6">
                  <p className="font-display leading-snug text-ink">
                    <span className="font-serif italic text-[16px] text-clay tabular-nums mr-2.5">
                      {rec.rank}.
                    </span>
                    <span className="text-title-lg">
                      {lang === 'en' ? rec.title_en : rec.title_de}
                    </span>
                  </p>
                  <p className="text-xs text-ink/85 leading-relaxed">
                    {lang === 'en' ? rec.detail_en : rec.detail_de}
                  </p>
                </article>
                {/* Footer line — OUTSIDE the card border. Hairline above,
                 * then italic clay margin annotation. Reads as a printed
                 * dossier note rather than a baked-in disclaimer. */}
                <div className="flex flex-col gap-1.5 px-5">
                  <span aria-hidden="true" className="block h-px w-12 bg-border-strong/40" />
                  <p className="text-[10px] text-clay/70 italic leading-relaxed">
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
