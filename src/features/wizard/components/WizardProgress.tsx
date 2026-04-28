import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

interface Props {
  count: number
  /** 1-based index of the active step. */
  active: number
  className?: string
}

const NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII']

/**
 * Phase 3.3 #48 — wizard progress as Roman numerals.
 *
 *   I  ·  II      ← active step in Instrument Serif italic ink,
 *                   idle step in ink/30
 *   ──────────    ← 64px hairline rule below
 *
 * Replaces the old breath-dot pattern (`ProgressDots.tsx`) with the
 * spec-index aesthetic established by the chat workspace's left rail.
 * Reduced-motion: no animation present anyway — purely typographic.
 */
export function WizardProgress({ count, active, className }: Props) {
  const { t } = useTranslation()
  const numerals = Array.from({ length: count }, (_, i) => NUMERALS[i] ?? String(i + 1))

  return (
    <div
      role="progressbar"
      aria-valuenow={active}
      aria-valuemin={1}
      aria-valuemax={count}
      aria-label={t('wizard.progress.label', { current: active, total: count })}
      className={cn('flex flex-col items-center gap-2', className)}
    >
      <div className="flex items-baseline gap-3 leading-none">
        {numerals.map((n, idx) => {
          const stepNum = idx + 1
          const isActive = stepNum === active
          return (
            <span key={n} className="flex items-baseline gap-3">
              <span
                aria-hidden="true"
                className={cn(
                  'font-serif italic text-[14px] tabular-figures transition-colors duration-soft',
                  isActive ? 'text-ink' : 'text-ink/30',
                )}
              >
                {n}
              </span>
              {idx < numerals.length - 1 && (
                <span aria-hidden="true" className="text-ink/25 font-serif italic text-[14px]">
                  ·
                </span>
              )}
            </span>
          )
        })}
      </div>
      <span aria-hidden="true" className="block h-px w-16 bg-ink/15" />
    </div>
  )
}
