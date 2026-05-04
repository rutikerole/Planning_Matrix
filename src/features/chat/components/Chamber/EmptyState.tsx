// Phase 7 Chamber — EmptyState.
//
// Shown while the very first turn is priming. Calm display headline,
// soft italic body, hairline pulse below — same shape as the legacy
// EmptyState but rebuilt against Chamber tokens.

import { m, useReducedMotion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { ChamberSigil } from '../../lib/specialistSigils'

export function EmptyState() {
  const { t } = useTranslation()
  const reduced = useReducedMotion()
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="w-full flex flex-col items-center text-center gap-8 py-20"
    >
      {/* Decorative sigil ring — moderator + a quiet glow */}
      <div className="relative grid place-items-center size-24">
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-full"
          style={{ background: 'rgba(123, 92, 63, 0.08)' }}
        />
        <span style={{ color: 'hsl(var(--clay))' }}>
          <ChamberSigil specialist="moderator" size={48} />
        </span>
      </div>

      <div className="flex flex-col items-center gap-4 max-w-md">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.20em] text-clay/82">
          {t('chat.chamber.atTopReady')}
        </p>
        <h1 className="font-serif italic text-chamber-display-lg leading-[1.0] tracking-[-0.025em] text-ink m-0">
          {t('chat.chamber.emptyHeadline')}
        </h1>
        <p className="font-serif italic text-[16px] text-ink/65 leading-relaxed">
          {t('chat.chamber.emptyBody')}
        </p>
      </div>

      <div className="relative h-px w-32 bg-[var(--hairline-strong,rgba(26,22,18,0.18))] overflow-hidden mt-2">
        {!reduced && (
          <m.div
            aria-hidden="true"
            className="absolute inset-0 bg-clay"
            initial={{ opacity: 0.2 }}
            animate={{ opacity: [0.2, 0.6, 0.2] }}
            transition={{ duration: 2.4, ease: [0.4, 0, 0.6, 1], repeat: Infinity }}
          />
        )}
      </div>
    </div>
  )
}
