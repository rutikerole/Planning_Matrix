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

      <h1 className="font-display text-title-lg md:text-headline text-ink leading-[1.1] -tracking-[0.018em]">
        {t('chat.empty.headline').replace(/\.$/, '')}
        <span className="text-clay">.</span>
      </h1>

      <p className="text-body-lg text-ink/70 leading-relaxed">
        {t('chat.empty.body')}
      </p>

      <div className="relative h-px w-32 bg-border-strong/30 overflow-hidden mt-4">
        {!reduced && (
          <m.div
            aria-hidden="true"
            className="absolute inset-y-0 w-12 bg-clay"
            initial={{ x: -48 }}
            animate={{ x: 128 }}
            transition={{
              duration: 1.6,
              ease: [0.4, 0, 0.6, 1],
              repeat: Infinity,
            }}
          />
        )}
      </div>
    </div>
  )
}
