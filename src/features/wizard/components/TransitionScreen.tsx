import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { m, useReducedMotion } from 'framer-motion'

/**
 * Calm full-bleed paper screen shown while we INSERT the project + prime
 * the first Anthropic turn. Eyebrow · serif headline · short body, with
 * a hairline sweep loop underneath. No spinner, no progress bar. Total
 * wallclock typically 2–6 s.
 *
 * Document title swap so the browser tab matches the moment.
 */
export function TransitionScreen() {
  const { t } = useTranslation()
  const reduced = useReducedMotion()

  useEffect(() => {
    const prev = document.title
    document.title = `${t('wizard.transition.headline')} · Planning Matrix`
    return () => {
      document.title = prev
    }
  }, [t])

  return (
    <m.div
      initial={reduced ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reduced ? 0 : 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="min-h-dvh bg-paper relative isolate flex items-center justify-center px-6"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="w-full max-w-[34rem] flex flex-col items-center text-center gap-6">
        <p className="eyebrow inline-flex items-center text-foreground/65">
          <span className="accent-dot" aria-hidden="true" />
          {t('wizard.transition.eyebrow')}
        </p>

        <h1 className="font-display text-display-3 md:text-display-2 text-ink leading-[1.05] -tracking-[0.02em]">
          {t('wizard.transition.headline').replace(/\.$/, '')}
          <span className="text-clay">.</span>
        </h1>

        <p className="text-body-lg text-ink/70 leading-relaxed">
          {t('wizard.transition.body')}
        </p>

        {/* Hairline sweep loop — clay strip travelling left-to-right.
         * Polish Move 5: viewTransitionName matches the rule above the
         * moderator's first nameplate so the browser morphs between
         * routes (Chromium 95%+); the Framer Motion fallback handles
         * the rest cleanly. */}
        <div
          className="relative h-px w-32 bg-border-strong/30 overflow-hidden mt-6"
          style={{ viewTransitionName: 'pm-handoff-hairline' }}
        >
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
    </m.div>
  )
}
