import { useTranslation } from 'react-i18next'
import { m, useReducedMotion } from 'framer-motion'
import { AtelierIllustration } from './AtelierIllustration'

/**
 * Phase 3.2 #42 — empty / priming state, redesigned as an architectural
 * scene rather than a loading subtitle.
 *
 * Center column shows the atelier-empty axonometric drawing (drafting
 * table, tracing paper, fountain pen drawing a 1cm scale line, rolled
 * plans, ledger, coffee cup), with the headline and body underneath
 * in atelier register: "Das Atelier öffnet." The hairline opacity
 * pulse remains as a calm focal point below the body.
 *
 * Reduced-motion: pen + line at rest, hairline static, no fades.
 */
export function EmptyState() {
  const { t } = useTranslation()
  const reduced = useReducedMotion()

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="w-full flex flex-col items-center text-center gap-7 py-16"
    >
      <AtelierIllustration />

      <div className="flex flex-col items-center gap-4 max-w-md">
        <p className="eyebrow inline-flex items-center text-foreground/65">
          <span className="accent-dot" aria-hidden="true" />
          {t('chat.empty.eyebrow')}
        </p>

        <h1 className="font-display text-[clamp(28px,4.5vw,40px)] text-ink leading-[1.05] -tracking-[0.022em]">
          {t('chat.empty.headline').replace(/\.$/, '')}
          <span className="text-clay">.</span>
        </h1>

        <p className="font-serif italic text-[16px] text-ink/65 leading-relaxed">
          {t('chat.empty.body')}
        </p>
      </div>

      <div className="relative h-px w-32 bg-border-strong/30 overflow-hidden mt-2">
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
