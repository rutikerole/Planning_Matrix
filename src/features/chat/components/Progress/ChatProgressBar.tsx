// ───────────────────────────────────────────────────────────────────────
// Phase 3.6 #69 / Phase 7 Move 1 — Compass-arc progress indicator
//
// Sticky top-of-thread compass arc that reads as architectural drawing
// rather than browser tabs. Replaces the segmented-pill visual of the
// Phase 3.6 implementation; keeps the same export, the same engine
// (`computeSegmentProgress` over `SEGMENT_ORDER`), and the same a11y
// surface so import sites and Phase 2.5 durability behaviour are
// untouched.
//
//   journey ━━━●━━━━━━━━━━━━━━           Turn 18 / ~24   M 1:100 ⊢━━⊣
//
// • A 1 px hairline track spans the row.
// • A 1 px clay overlay grows left → right at `percent`% with a clay
//   halo dot at the leading edge (animates over 600 ms cubic-bezier
//   0.16, 1, 0.3, 1 — the prototype's `--ease`).
// • Seven 1 px-wide station ticks distribute evenly across the arc,
//   one per existing SEGMENT_ORDER specialist. State drives colour
//   and height: passed = clay-soft, current = clay (raised to 22 px
//   and lifted 2 px), upcoming = hairline.
// • Right side: italic-serif turn count `Turn 18 / ~24` with a mono
//   eyebrow, plus a 36 px scale-mark "M 1:100" with bracket ticks.
//
// Compact mode (mobile drawer) drops the journey label, the meta
// column, and the per-station labels, but keeps the arc + ticks at
// the same stroke weight. ChatProgressBarMobile thin-wraps this with
// `compact` for use inside the mobile top-bar drawer.
// ───────────────────────────────────────────────────────────────────────

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
   * Phase 2.5 — durable progress derivation.
   *
   * The chatStore's `turnCount` and `currentSpecialist` are session-
   * scoped: a `useEffect(() => () => reset(), [projectId])` in
   * ChatWorkspacePage clears them on every project (re)mount. Refresh
   * a project that already has 8 messages and the bar reads 5 %
   * (specialist anchor for `null` specialist + 0/18 turn ratio).
   *
   * When `messages` is provided, the bar derives both signals from
   * the message list directly (count of assistant messages,
   * specialist of the most recent assistant message). This makes
   * the bar honest across reloads + tab switches + cold mounts.
   *
   * Falls back to chatStore values when the prop is absent so
   * legacy callers (and the in-stream "live" path) still work.
   */
  messages?: MessageRow[]
}

const TYPICAL_TURN_COUNT = 18

export function ChatProgressBar({ compact = false, messages }: Props) {
  const { t } = useTranslation()
  const reduced = useReducedMotion()

  const turnCountFromStore = useChatStore((s) => s.turnCount)
  const currentSpecialistFromStore = useChatStore((s) => s.currentSpecialist)
  const completionSignal = useChatStore((s) => s.lastCompletionSignal)

  // Phase 2.5 — durable derivation from the persisted messages list.
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

  // Estimated total clamps to never display "Turn 22 / ~18". When the
  // conversation runs longer than the typical ceiling we widen the
  // denominator to match so the ratio stays honest.
  const estimatedTotal = Math.max(turnCount, TYPICAL_TURN_COUNT)

  const ariaLabel = t('chat.progress.eyebrow', { defaultValue: 'Fortschritt' })

  // ── Compact (mobile drawer) — bare arc, no labels, no meta. ─────
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

  // ── Desktop sticky compass — label · arc · meta. ────────────────
  // Background is a paper-to-transparent gradient (paper opaque to 70 %,
  // fades to 0 by 100 %). Implemented as inline style because Tailwind
  // 3.4's gradient utilities don't compose stop-positions with the
  // hsl(var(--paper)) indirection cleanly. Backdrop blur preserves
  // legibility when the thread scrolls through.
  return (
    <div
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={ariaLabel}
      data-pm-progress-bar="true"
      className="sticky top-0 z-30 px-14 pt-4 pb-[14px] backdrop-blur-[2px]"
      style={{
        backgroundImage:
          'linear-gradient(180deg, hsl(var(--paper)) 0%, hsl(var(--paper)) 70%, hsl(var(--paper) / 0) 100%)',
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
//
// The arc is a 18 px-tall flex container with three absolutely-positioned
// layers + one in-flow stations row:
//   1. track     — 1 px hairline horizontal rule at vertical centre
//   2. progress  — 1 px clay overlay, width animates over 600 ms,
//                  with a clay halo dot at its leading edge
//   3. stations  — 7 evenly-spaced 1 px-wide vertical ticks
//
// Pinned widths come from the segment array's length (always 7); the
// flex justify-between then gives even spacing without per-tick offset
// math. Reduced-motion zeroes the width transition.

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
    <div className="relative flex-1 h-[18px] flex items-center">
      {/* Track */}
      <span
        aria-hidden="true"
        className="absolute left-0 right-0 top-1/2 h-px bg-hairline -translate-y-1/2"
      />

      {/* Progress overlay — 1 px clay, width animates 600 ms ease */}
      <span
        aria-hidden="true"
        className="absolute left-0 top-1/2 -translate-y-1/2 h-px bg-clay"
        style={{
          width: `${clampedPercent}%`,
          transition: reduced
            ? 'none'
            : 'width 600ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Halo dot at the leading edge — 8×8 clay with 2 px paper
         * ring and 1 px clay outer ring, matching the prototype. */}
        <span
          aria-hidden="true"
          className="absolute -right-1 -top-[3.5px] block w-2 h-2 rounded-full bg-clay border-2 border-paper"
          style={{ boxShadow: '0 0 0 1px var(--clay, hsl(var(--clay)))' }}
        />
      </span>

      {/* Stations — 7 ticks, evenly distributed via flex justify-between */}
      <ol
        aria-hidden="true"
        className="relative w-full h-[18px] flex justify-between items-center"
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

// ── Station tick ────────────────────────────────────────────────────
//
// Tailwind can't use `attr()` in pseudo-elements reliably, so the
// per-station label below the tick is a real <span> positioned with
// `top-[22px] left-1/2 -translate-x-1/2`. Compact mode skips the label.

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
      className={cn(
        'relative w-px shrink-0',
        isCurrent
          ? 'h-[22px] -mt-[2px] bg-clay'
          : isPassed
            ? 'h-[18px] bg-clay-soft'
            : 'h-[18px] bg-hairline',
      )}
    >
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
//
// 36 px hairline with 5 px-tall bracket ticks at each end + "M 1:100"
// mono label. Architectural-drawing finishing flourish.

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
