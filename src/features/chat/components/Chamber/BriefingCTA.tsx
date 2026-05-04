// Phase 7 Chamber — BriefingCTA.
//
// The single result-related CTA on the chat page. Always rendered at
// the end of the thread (no layout shift) but its visual prominence
// scales with completion progress:
//
//   whisper  — italic-serif 12px clay text link with dotted underline.
//   badge    — same link with a small clay ring badge.
//   outlined — outlined button, 14px, chevron.
//   hero     — filled clay hero, italic-serif 18px, halo glow.
//   ready    — hero + one-shot 800ms pulse on first arrival.

import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { m, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type {
  BriefingProminence,
  CompletionGate,
} from '../../hooks/useCompletionGate'

interface Props {
  projectId: string
  gate: CompletionGate
  signal:
    | 'continue'
    | 'needs_designer'
    | 'ready_for_review'
    | 'blocked'
    | null
}

export function BriefingCTA({ projectId, gate, signal }: Props) {
  const { t } = useTranslation()
  const reduced = useReducedMotion()

  // Acknowledge the one-shot pulse after the animation has rendered.
  useEffect(() => {
    if (gate.shouldPulse) {
      const id = window.setTimeout(() => gate.acknowledgePulse(), 900)
      return () => window.clearTimeout(id)
    }
  }, [gate])

  if (!gate.visible) return null

  const labelKey =
    signal === 'ready_for_review' || gate.prominence === 'ready'
      ? 'chat.chamber.briefingCtaReadyForReview'
      : gate.prominence === 'hero'
        ? 'chat.chamber.briefingCtaFull'
        : gate.prominence === 'outlined'
          ? 'chat.chamber.briefingCtaFull'
          : 'chat.chamber.briefingCtaEarly'
  const label = t(labelKey)

  const linkProps = {
    to: `/projects/${projectId}/result`,
    'aria-label': label,
  }

  const content = (
    <span className="inline-flex items-center gap-2">
      <span>{label}</span>
      <ArrowUpRight aria-hidden="true" className="size-[14px]" />
    </span>
  )

  const containerCls = 'mt-12 mx-auto flex justify-center'

  // Render per prominence.
  if (gate.prominence === 'whisper' || gate.prominence === 'badge') {
    return (
      <div className={containerCls}>
        <Link
          {...linkProps}
          className={cn(
            'inline-flex items-center gap-2',
            'font-serif italic text-[12.5px] text-clay/82 hover:text-clay-deep',
            'border-b border-dotted border-[hsl(var(--clay)/0.55)] pb-0.5',
            'transition-colors duration-150',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay/55 focus-visible:ring-offset-2 focus-visible:ring-offset-paper rounded-sm',
          )}
        >
          {gate.prominence === 'badge' && (
            <span
              aria-hidden="true"
              className="size-2 rounded-full ring-2 ring-[hsl(var(--clay)/0.55)] bg-paper"
            />
          )}
          {content}
        </Link>
      </div>
    )
  }

  if (gate.prominence === 'outlined') {
    return (
      <div className={containerCls}>
        <Link
          {...linkProps}
          className={cn(
            'inline-flex items-center gap-2 px-5 py-3',
            'rounded-full border border-clay text-clay hover:text-paper hover:bg-clay',
            'text-[14px] font-medium transition-colors duration-200',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay focus-visible:ring-offset-2 focus-visible:ring-offset-paper',
          )}
        >
          {content}
        </Link>
      </div>
    )
  }

  // hero / ready
  return (
    <div className={containerCls}>
      <m.div
        initial={false}
        animate={
          gate.shouldPulse && !reduced
            ? { scale: [1, 1.04, 1] }
            : { scale: 1 }
        }
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      >
        <Link
          {...linkProps}
          className={cn(
            'group inline-flex items-center gap-2.5 px-7 py-4 rounded-2xl',
            'bg-clay text-paper text-[18px] font-serif italic',
            'transition-transform duration-200 hover:bg-clay-deep motion-safe:hover:-translate-y-px',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay focus-visible:ring-offset-4 focus-visible:ring-offset-paper',
            'chamber-cta-halo',
          )}
        >
          <span>{label}</span>
          <ArrowUpRight aria-hidden="true" className="size-[18px] motion-safe:group-hover:translate-x-0.5 transition-transform duration-200" />
        </Link>
      </m.div>
    </div>
  )
}

// Re-export for callers that just want the prominence union.
export type { BriefingProminence }
