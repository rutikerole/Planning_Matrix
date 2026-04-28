import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { m, useReducedMotion } from 'framer-motion'
import { AtelierIllustration } from '@/features/chat/components/AtelierIllustration'

/**
 * Phase 3.2 #42 — transition screen as an architectural drawing.
 *
 * Same atelier-empty illustration the chat workspace uses for its
 * priming state, so the wizard → chat handoff feels continuous —
 * the table is being set, then the team takes their seats. The
 * hairline below the body keeps its viewTransitionName so Polish
 * Move 5 (browser-level rule morph) still works on Chromium.
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
      <div className="w-full max-w-[34rem] flex flex-col items-center text-center gap-7">
        <AtelierIllustration />

        <div className="flex flex-col items-center gap-4">
          <p className="eyebrow inline-flex items-center text-foreground/65">
            <span className="accent-dot" aria-hidden="true" />
            {t('wizard.transition.eyebrow')}
          </p>

          <h1 className="font-display text-display-3 md:text-display-2 text-ink leading-[1.05] -tracking-[0.02em]">
            {t('wizard.transition.headline').replace(/\.$/, '')}
            <span className="text-clay">.</span>
          </h1>

          <p className="font-serif italic text-[16px] text-ink/70 leading-relaxed">
            {t('wizard.transition.body')}
          </p>
        </div>

        {/* Hairline sweep loop — viewTransitionName carries Polish Move 5
         * across the route boundary. */}
        <div
          className="relative h-px w-32 bg-border-strong/30 overflow-hidden mt-2"
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
