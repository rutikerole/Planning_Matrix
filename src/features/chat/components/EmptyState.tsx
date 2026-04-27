import { useTranslation } from 'react-i18next'
import { m, useReducedMotion } from 'framer-motion'

/**
 * Center-column placeholder shown while the first assistant turn is
 * being primed (or, after the wizard, in the rare case where priming
 * failed and the chat workspace is being asked to recover). Eyebrow +
 * Instrument Serif headline + Inter body, hairline sweep loop
 * underneath. Reduced-motion freezes the sweep.
 *
 * For commit #13 this is the only thing the center column renders.
 * Thread + retry / 10s honest copy land in commit #15.
 */
export function EmptyState() {
  const { t } = useTranslation()
  const reduced = useReducedMotion()

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="w-full flex flex-col items-center text-center gap-5 py-20"
    >
      <p className="eyebrow inline-flex items-center text-foreground/65">
        <span className="accent-dot" aria-hidden="true" />
        {t('chat.empty.eyebrow')}
      </p>

      {/* Polish Move 6 — chapter-heading weight, not a loading subtitle. */}
      <h1 className="font-display text-display-3 md:text-display-2 text-ink leading-[1.05] -tracking-[0.022em]">
        {t('chat.empty.headline').replace(/\.$/, '')}
        <span className="text-clay">.</span>
      </h1>

      <p className="text-body-lg text-ink/65 leading-relaxed">
        {t('chat.empty.body')}
      </p>

      {/* Hairline opacity-loop, w-32. */}
      <div className="relative h-px w-32 bg-border-strong/30 overflow-hidden mt-6">
        {!reduced && (
          <m.div
            aria-hidden="true"
            className="absolute inset-0 bg-clay"
            initial={{ opacity: 0.2 }}
            animate={{ opacity: [0.2, 0.6, 0.2] }}
            transition={{
              duration: 2.4,
              ease: [0.4, 0, 0.6, 1],
              repeat: Infinity,
            }}
          />
        )}
      </div>
    </div>
  )
}
