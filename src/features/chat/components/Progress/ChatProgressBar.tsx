// ───────────────────────────────────────────────────────────────────────
// Phase 7 Pass 2 — Compass arc with real visual weight
//
// Pass 1 shipped a calm but feather-thin compass that read as text
// labels with a hairline. Pass 2 makes it unmistakably a progress
// meter without abandoning the architectural register:
//
//   • Track 2 px hairline (was 1 px).
//   • Progress 2 px clay-deep (was 1 px clay).
//   • Halo dot 12 px clay-deep with 3 px paper ring + 2 px clay
//     shadow ring — visible from 3 feet.
//   • Stations: passed = 6 px filled clay-soft circles; current =
//     10 px filled clay with clay-tint halo glow; upcoming = 1 px
//     hairline ticks (the only state that stays as a line).
//   • Always-on hairline border-bottom under the compass row.
//   • Sticky-scrolled state: clay border-bottom + slightly darker
//     gradient for read-as-toolbar, applied via a scrollY > 8 px
//     check.
//
// Same export, same engine (computeSegmentProgress over SEGMENT_ORDER),
// same a11y surface — only the visual geometry shifts.
// ───────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useReducedMotion } from 'framer-motion'
import { useChatStore } from '@/stores/chatStore'
import { cn } from '@/lib/utils'
import {
  computeSegmentProgress,
  type ProgressSegment,
} from '../../lib/progressEstimate'
import type { Specialist } from '@/types/projectState'
import type { MessageRow } from '@/types/db'

interface Props {
  /** When true (mobile drawer), drops the labels and shrinks the bar. */
  compact?: boolean
  /**
   * Phase 2.5 — durable progress derivation from persisted messages
   * (chatStore values reset on project remount).
   */
  messages?: MessageRow[]
}

const TYPICAL_TURN_COUNT = 18
const SCROLL_TRIGGER_PX = 8

export function ChatProgressBar({ compact = false, messages }: Props) {
  const { t } = useTranslation()
  const reduced = useReducedMotion()

  const turnCountFromStore = useChatStore((s) => s.turnCount)
  const currentSpecialistFromStore = useChatStore((s) => s.currentSpecialist)
  const completionSignal = useChatStore((s) => s.lastCompletionSignal)

  let turnCount = turnCountFromStore
  let currentSpecialist = currentSpecialistFromStore
  if (messages && messages.length > 0) {
    const assistants = messages.filter((m) => m.role === 'assistant')
    turnCount = Math.max(turnCountFromStore, assistants.length)
    if (currentSpecialist === null && assistants.length > 0) {
      const latest = assistants[assistants.length - 1]
      currentSpecialist = (latest.specialist ?? null) as Specialist | null
    }
  }

  const isReadyForReview = completionSignal === 'ready_for_review'
  const { segments, percent, currentIdx } = computeSegmentProgress(
    turnCount,
    currentSpecialist,
    isReadyForReview,
  )
  const estimatedTotal = Math.max(turnCount, TYPICAL_TURN_COUNT)
  const ariaLabel = t('chat.progress.eyebrow', { defaultValue: 'Fortschritt' })

  // Track scrollY so the sticky compass can shift to a "toolbar" look
  // (clay border-bottom + darker gradient) once the user has scrolled
  // past the natural top.
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    if (compact) return
    const onScroll = () => setScrolled(window.scrollY > SCROLL_TRIGGER_PX)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [compact])

  // Compact (mobile drawer) — bare arc, no chrome.
  if (compact) {
    return (
      <div
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={ariaLabel}
        data-pm-progress-bar="true"
        className="w-full py-2"
      >
        <CompassArc
          segments={segments}
          percent={percent}
          currentIdx={currentIdx}
          isReadyForReview={isReadyForReview}
          reduced={!!reduced}
          showLabels={false}
        />
      </div>
    )
  }

  return (
    <div
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={ariaLabel}
      data-pm-progress-bar="true"
      className={cn(
        'sticky top-0 z-30 px-14 pt-4 pb-[14px] backdrop-blur-[2px]',
        'transition-[border-color,background-color] duration-[220ms] ease-ease',
        scrolled
          ? 'border-b border-clay/40'
          : 'border-b border-hairline-faint',
      )}
      style={{
        backgroundImage: scrolled
          ? 'linear-gradient(180deg, hsl(var(--paper)) 0%, hsl(var(--paper-tinted)) 90%, hsl(var(--paper) / 0.85) 100%)'
          : 'linear-gradient(180deg, hsl(var(--paper)) 0%, hsl(var(--paper)) 70%, hsl(var(--paper) / 0) 100%)',
      }}
    >
      <div className="flex items-center justify-between gap-6">
        <span className="font-mono text-[9.5px] tracking-[0.18em] uppercase text-ink-mute whitespace-nowrap">
          {t('chat.compass.journey', { defaultValue: 'Journey' })}
        </span>

        <CompassArc
          segments={segments}
          percent={percent}
          currentIdx={currentIdx}
          isReadyForReview={isReadyForReview}
          reduced={!!reduced}
          showLabels={true}
          stationLabels={segments.map((s) =>
            t(`chat.compass.station.${s.specialist}`, {
              defaultValue: s.specialist,
            }),
          )}
        />

        <div className="flex items-center gap-3.5 whitespace-nowrap">
          <p className="font-serif italic text-[16px] text-ink leading-none m-0">
            <span className="font-mono not-italic text-[9.5px] tracking-[0.14em] uppercase text-ink-mute mr-1.5">
              {t('chat.compass.turn', { defaultValue: 'Turn' })}
            </span>
            <span className="tabular-figures">{turnCount}</span>
            <span className="mx-1">/</span>
            <span className="text-ink-mute tabular-figures">~{estimatedTotal}</span>
          </p>
          <ScaleMark />
        </div>
      </div>
    </div>
  )
}

// ── Compass arc core ────────────────────────────────────────────────

interface ArcProps {
  segments: ProgressSegment[]
  percent: number
  currentIdx: number
  isReadyForReview: boolean
  reduced: boolean
  showLabels: boolean
  stationLabels?: string[]
}

function CompassArc({
  segments,
  percent,
  currentIdx,
  isReadyForReview,
  reduced,
  showLabels,
  stationLabels,
}: ArcProps) {
  const clampedPercent = Math.max(0, Math.min(100, percent))

  return (
    <div className="relative flex-1 h-[22px] flex items-center">
      {/* Track — 2 px hairline */}
      <span
        aria-hidden="true"
        className="absolute left-0 right-0 top-1/2 h-[2px] bg-hairline -translate-y-1/2"
      />

      {/* Progress overlay — 2 px clay-deep, width animates 600 ms ease */}
      <span
        aria-hidden="true"
        className="absolute left-0 top-1/2 -translate-y-1/2 h-[2px] bg-clay-deep"
        style={{
          width: `${clampedPercent}%`,
          transition: reduced
            ? 'none'
            : 'width 600ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Halo dot — 12 px clay-deep with 3 px paper ring + 2 px clay
         * shadow ring. The translate(50%) keeps the dot's center
         * exactly on the leading edge of the progress bar. */}
        <span
          aria-hidden="true"
          className="absolute right-0 top-1/2 block w-3 h-3 rounded-full bg-clay-deep border-[3px] border-paper -translate-y-1/2 translate-x-1/2"
          style={{ boxShadow: '0 0 0 2px var(--clay, hsl(var(--clay)))' }}
        />
      </span>

      {/* Stations — 7 marks, evenly distributed via flex justify-between.
       * Each station's parent li is zero-width with overflow centered, so
       * the visible mark (circle or tick) sits exactly on the spacing
       * grid regardless of its diameter. */}
      <ol
        aria-hidden="true"
        className="relative w-full h-[22px] flex justify-between items-center"
      >
        {segments.map((seg, idx) => (
          <Station
            key={seg.specialist}
            segment={seg}
            isCurrent={idx === currentIdx && !isReadyForReview}
            label={showLabels ? stationLabels?.[idx] ?? '' : ''}
            showLabel={showLabels}
          />
        ))}
      </ol>
    </div>
  )
}

// ── Station mark ────────────────────────────────────────────────────

interface StationProps {
  segment: ProgressSegment
  isCurrent: boolean
  label: string
  showLabel: boolean
}

function Station({ segment, isCurrent, label, showLabel }: StationProps) {
  const isPassed = segment.state === 'done'

  return (
    <li
      className="relative flex items-center justify-center shrink-0"
      style={{ width: 0 }}
    >
      {isCurrent ? (
        <span
          className="block w-[10px] h-[10px] rounded-full bg-clay"
          style={{ boxShadow: '0 0 0 4px var(--clay-tint)' }}
        />
      ) : isPassed ? (
        <span className="block w-[6px] h-[6px] rounded-full bg-clay-soft" />
      ) : (
        <span className="block w-px h-[16px] bg-hairline" />
      )}

      {showLabel && label && (
        <span
          className={cn(
            'absolute top-[22px] left-1/2 -translate-x-1/2 font-mono text-[8.5px] tracking-[0.12em] uppercase whitespace-nowrap',
            isCurrent
              ? 'text-clay font-medium'
              : isPassed
                ? 'text-ink-mute'
                : 'text-ink-faint',
          )}
        >
          {label}
        </span>
      )}
    </li>
  )
}

// ── Scale mark ──────────────────────────────────────────────────────

function ScaleMark() {
  return (
    <span
      aria-hidden="true"
      className="inline-flex items-center gap-1.5 text-ink-mute font-mono text-[9.5px] tracking-[0.08em]"
    >
      <svg
        width="36"
        height="6"
        viewBox="0 0 36 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
      >
        <line x1="0" y1="3" x2="36" y2="3" />
        <line x1="0.5" y1="0.5" x2="0.5" y2="5.5" />
        <line x1="35.5" y1="0.5" x2="35.5" y2="5.5" />
      </svg>
      <span>M 1:100</span>
    </span>
  )
}
