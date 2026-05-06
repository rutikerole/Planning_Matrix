import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

interface Props {
  current: 1 | 2
  total: 2
  className?: string
}

const EASE = [0.16, 1, 0.3, 1] as const

/**
 * Wizard progress — a drafting trace.
 *
 * Two diamond datum stations carry zero-padded mono numerals; a dashed
 * underlay (the path ahead, echoing the proposed-line motif used in the
 * option cards) is overlaid by a solid clay trace that animates toward
 * the user's current step. The active station carries a soft pulsing
 * halo, the active numeral a leading clay dot, and completed steps a
 * hairline tick — all motion easing on the same drafting curve as the
 * rest of the atelier.
 */
export function ProgressHairline({ current, total, className }: Props) {
  const { t } = useTranslation()
  const fillPct = (current / total) * 100

  return (
    <div
      role="progressbar"
      aria-valuenow={current}
      aria-valuemin={1}
      aria-valuemax={total}
      aria-label={t('wizard.progress.of', { current, total })}
      className={cn('mx-auto w-[60%] max-w-[420px]', className)}
    >
      {/* Numerals — anchored above each station */}
      <div className="mb-3 flex justify-between font-mono text-[10px] tabular-nums tracking-[0.18em]">
        {Array.from({ length: total }).map((_, idx) => {
          const n = idx + 1
          const isActive = n === current
          const isDone = n < current
          return (
            <span
              key={n}
              className={cn(
                'flex items-center gap-1.5 transition-colors duration-soft',
                isActive
                  ? 'text-pm-clay'
                  : isDone
                    ? 'text-pm-ink-mid'
                    : 'text-pm-ink-mute2',
              )}
            >
              {isActive && (
                <span
                  aria-hidden="true"
                  className="block h-1 w-1 rounded-full bg-pm-clay animate-pm-pulse-clay"
                />
              )}
              {isDone && (
                <svg
                  width="7"
                  height="7"
                  viewBox="0 0 7 7"
                  aria-hidden="true"
                  className="-mt-px"
                >
                  <path
                    d="M1 3.6 L2.7 5.1 L5.8 1.7"
                    stroke="currentColor"
                    strokeWidth="0.9"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                </svg>
              )}
              {String(n).padStart(2, '0')}
            </span>
          )
        })}
      </div>

      {/* Track */}
      <div className="relative h-3 w-full" aria-hidden="true">
        {/* Dashed underlay — the path ahead */}
        <div
          className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2"
          style={{
            backgroundImage:
              'repeating-linear-gradient(to right, var(--pm-hair-strong) 0 3px, transparent 3px 7px)',
          }}
        />

        {/* Animated clay trace — the path drawn */}
        <motion.div
          className="absolute left-0 top-1/2 h-px -translate-y-1/2 bg-pm-clay"
          initial={false}
          animate={{ width: `${fillPct}%` }}
          transition={{ duration: 0.7, ease: EASE }}
        />

        {/* Diamond datum stations */}
        {Array.from({ length: total }).map((_, idx) => {
          const n = idx + 1
          const reached = n <= current
          const isActive = n === current
          const leftPct = (idx / (total - 1)) * 100
          return (
            <span
              key={n}
              className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${leftPct}%` }}
            >
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute left-1/2 top-1/2 block h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-pm-clay/30 blur-[3px] animate-pm-pulse-clay"
                />
              )}
              <span
                aria-hidden="true"
                className={cn(
                  'relative block h-[7px] w-[7px] rotate-45 border transition-colors duration-soft',
                  reached
                    ? 'border-pm-clay bg-pm-clay'
                    : 'border-pm-ink/25 bg-pm-paper',
                )}
              />
            </span>
          )
        })}
      </div>
    </div>
  )
}
