// Phase 7 Chamber — MatchCut.
//
// Cinematic transition fired ABOVE the new MessageAssistant nameplate
// when the speaking specialist materially changes between consecutive
// assistant turns. The MessageAssistant component decides when to mount
// this (by passing previousSpecialist).
//
// Sequence (720ms total):
//   0   ms — old name fades out + lifts -6px (220ms)
//   180 ms — hairline sweep crosses message column (280ms)
//   320 ms — new MessageAssistant nameplate slides up from y:8 (parent
//            is responsible for the slide; MatchCut owns 0..480ms of
//            the choreography only)
//
// AmbientTint cross-fade (1200ms) is driven separately by ChamberLayout
// — they layer, no overlap fights.
//
// Reduced-motion: render nothing. The MessageAssistant nameplate
// arrives in place statically.

import { m, useReducedMotion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import type { Specialist } from '@/types/projectState'

interface Props {
  from: Specialist
  to: Specialist
}

export function MatchCut({ from, to }: Props) {
  const reduced = useReducedMotion()
  const { t } = useTranslation()
  if (reduced) return null
  const prevLabel = t(`chat.specialists.${from}`, { defaultValue: from })
  const nextLabel = t(`chat.specialists.${to}`, { defaultValue: to })

  return (
    <div
      role="presentation"
      aria-label={t('chat.chamber.matchCutHandoff', { from: prevLabel, to: nextLabel })}
      className="relative flex flex-col gap-2 mb-1"
    >
      {/* Old name fade-out */}
      <m.p
        initial={{ opacity: 0.7, y: 0 }}
        animate={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="font-mono text-[10px] uppercase tracking-[0.20em] text-ink/40 leading-none"
      >
        {prevLabel}
      </m.p>
      {/* Hairline sweep */}
      <m.span
        aria-hidden="true"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 0.18, duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        className="block h-px origin-center bg-[hsl(var(--clay)/0.55)]"
      />
    </div>
  )
}
