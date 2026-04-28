import { useTranslation } from 'react-i18next'
import { useReducedMotion } from 'framer-motion'
import { useChatStore } from '@/stores/chatStore'
import {
  estimateProgress,
  estimateTurnsRemaining,
} from '../lib/progressEstimate'

const CELLS = 16

/**
 * Phase 3.4 #53 — left-rail progress meter.
 *
 *   ─────────────────────────
 *   FORTSCHRITT
 *   ─────────────────────────
 *
 *   ca. 65 % erfasst
 *
 *   ──────●─────────────────
 *   ▰▰▰▰▰▰▰▰▰▰▱▱▱▱▱▱
 *
 *   ca. 4–5 Wendungen verbleibend.
 *   Aktuell: Bauordnungsrecht
 *
 * Reads chatStore for turnCount + currentSpecialist + lastCompletionSignal.
 * The 16-cell SVG bar fills left-to-right; a clay dot above the bar marks
 * "you are here." Reduced-motion: static, no fill animation, no slide.
 */
export function ProgressMeter() {
  const { t } = useTranslation()
  const reduced = useReducedMotion()
  const turnCount = useChatStore((s) => s.turnCount)
  const currentSpecialist = useChatStore((s) => s.currentSpecialist)
  const completionSignal = useChatStore((s) => s.lastCompletionSignal)

  const isReadyForReview = completionSignal === 'ready_for_review'
  const progress = isReadyForReview
    ? 1
    : estimateProgress(turnCount, currentSpecialist)
  const filledCells = Math.round(progress * CELLS)
  const dotIndex = Math.min(CELLS - 1, Math.max(0, filledCells - 1))
  const remaining = isReadyForReview ? '' : estimateTurnsRemaining(progress)
  const overflow = !isReadyForReview && progress >= 0.95

  const percentLabel = isReadyForReview
    ? '100 %'
    : overflow
      ? t('chat.progress.overflow', { defaultValue: 'ca. > 95 %' })
      : t('chat.progress.percent', {
          defaultValue: 'ca. {{n}} % erfasst',
          n: Math.round(progress * 100),
        })

  return (
    <div className="flex flex-col gap-3">
      <p className="eyebrow text-foreground/60 text-[11px]">
        {t('chat.progress.eyebrow', { defaultValue: 'Fortschritt' })}
      </p>

      <p className="font-serif italic text-[13px] text-ink leading-snug">
        {percentLabel}
      </p>

      {/* The bar: 16 cells in a single SVG, with a clay dot above the
       * current position. Stagger fill via per-cell transition delay. */}
      <div className="relative flex flex-col gap-1">
        {/* Dot row — 8px above the bar */}
        <svg
          viewBox={`0 0 ${CELLS * 9 - 1} 6`}
          className="w-full h-1.5 overflow-visible"
          aria-hidden="true"
        >
          <circle
            cx={dotIndex * 9 + 4}
            cy={3}
            r={2}
            className="fill-clay"
            style={{
              transition: reduced ? 'none' : 'cx 320ms cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          />
        </svg>

        {/* Bar row */}
        <svg
          viewBox={`0 0 ${CELLS * 9 - 1} 3`}
          className="w-full h-[3px]"
          aria-label={isReadyForReview ? '100 %' : `${Math.round(progress * 100)} %`}
        >
          {Array.from({ length: CELLS }, (_, i) => {
            const isFilled = i < filledCells
            return (
              <rect
                key={i}
                x={i * 9}
                y={0}
                width={8}
                height={3}
                className={isFilled ? 'fill-ink' : 'fill-ink/15'}
                style={{
                  transition: reduced ? 'none' : `fill 240ms ease ${i * 18}ms`,
                }}
              />
            )
          })}
        </svg>
      </div>

      <div className="flex flex-col gap-0.5">
        {isReadyForReview ? (
          <p className="font-serif italic text-[12px] text-ink/65 leading-relaxed">
            {t('chat.progress.readyForReview', {
              defaultValue: 'Bereit zur Überprüfung.',
            })}
          </p>
        ) : overflow ? (
          <p className="font-serif italic text-[12px] text-ink/65 leading-relaxed">
            {t('chat.progress.nearEnd', {
              defaultValue: 'Wir nähern uns dem Ende.',
            })}
          </p>
        ) : (
          <>
            <p className="font-serif italic text-[12px] text-ink/65 leading-relaxed">
              {t('chat.progress.remaining', {
                defaultValue: 'ca. {{n}} Wendungen verbleibend.',
                n: remaining,
              })}
            </p>
            {currentSpecialist && (
              <p className="text-[11px] text-clay/85 leading-relaxed">
                {t('chat.progress.current', { defaultValue: 'Aktuell:' })}{' '}
                <span className="text-ink">
                  {t(`chat.specialists.${currentSpecialist}`)}
                </span>
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
