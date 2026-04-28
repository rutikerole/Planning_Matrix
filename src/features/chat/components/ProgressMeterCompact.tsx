import { useReducedMotion } from 'framer-motion'
import { useChatStore } from '@/stores/chatStore'
import { estimateProgress } from '../lib/progressEstimate'

const CELLS = 12

/**
 * Phase 3.4 #53 — compact progress meter for the mobile top bar.
 *
 *   ●━━━━━━━━━━━○ 65 %
 *
 * 12 hairline cells with a filled clay circle at the start (anchor),
 * a hollow clay circle at the current position, and a tiny "ca. NN %"
 * label on the right. Tap (handled by the parent — MobileTopBar
 * already wraps it in a button) opens a small drawer with the full
 * ProgressMeter from the LeftRail.
 */
export function ProgressMeterCompact() {
  const reduced = useReducedMotion()
  const turnCount = useChatStore((s) => s.turnCount)
  const currentSpecialist = useChatStore((s) => s.currentSpecialist)
  const completionSignal = useChatStore((s) => s.lastCompletionSignal)

  const isReadyForReview = completionSignal === 'ready_for_review'
  const progress = isReadyForReview
    ? 1
    : estimateProgress(turnCount, currentSpecialist)
  const dotIndex = Math.min(CELLS - 1, Math.round(progress * (CELLS - 1)))
  const percent = Math.round(progress * 100)

  return (
    <div className="flex items-center gap-3 leading-none">
      <svg
        viewBox={`0 0 ${CELLS * 8 + 12} 10`}
        className="w-[140px] h-2.5 shrink-0"
        aria-hidden="true"
      >
        {/* Anchor — filled clay circle at the start */}
        <circle cx={3} cy={5} r={2.4} className="fill-clay" />
        {/* Hairline cells */}
        {Array.from({ length: CELLS }, (_, i) => (
          <line
            key={i}
            x1={8 + i * 8}
            y1={5}
            x2={14 + i * 8}
            y2={5}
            className={i <= dotIndex ? 'stroke-clay/85' : 'stroke-ink/20'}
            strokeWidth="1"
            style={{
              transition: reduced ? 'none' : `stroke 240ms ease ${i * 20}ms`,
            }}
          />
        ))}
        {/* Current marker — hollow clay circle */}
        <circle
          cx={14 + dotIndex * 8}
          cy={5}
          r={2.4}
          fill="none"
          strokeWidth="1.2"
          className="stroke-clay"
          style={{
            transition: reduced ? 'none' : 'cx 320ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        />
      </svg>
      <span className="text-[11px] tabular-nums text-ink/85 font-medium">
        {percent} %
      </span>
    </div>
  )
}
