import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

interface Props {
  current: 1 | 2
  total: 2
  className?: string
}

/**
 * Top hairline progress for the wizard. Replaces the old Roman-numeral
 * dots in the footer. Two segments at 60% page width; the active one
 * fills clay solid, the inactive sits at ink/10. A small mono numeral
 * sits above each segment.
 */
export function ProgressHairline({ current, total, className }: Props) {
  const { t } = useTranslation()

  return (
    <div
      role="progressbar"
      aria-valuenow={current}
      aria-valuemin={1}
      aria-valuemax={total}
      aria-label={t('wizard.progress.of', { current, total })}
      className={cn('mx-auto flex w-[60%] max-w-[420px] flex-col gap-1.5', className)}
    >
      <div className="flex items-baseline gap-3">
        {Array.from({ length: total }).map((_, idx) => {
          const stepNum = idx + 1
          const isActive = stepNum === current
          return (
            <span
              key={stepNum}
              className={cn(
                'flex-1 font-mono text-[10px] tabular-nums leading-none transition-colors',
                isActive ? 'text-pm-clay' : 'text-pm-ink-mute2',
              )}
            >
              {String(stepNum)}
            </span>
          )
        })}
      </div>
      <div className="flex gap-3">
        {Array.from({ length: total }).map((_, idx) => {
          const stepNum = idx + 1
          const isActive = stepNum === current
          return (
            <span
              key={stepNum}
              aria-hidden="true"
              className={cn(
                'h-px flex-1 transition-colors duration-soft',
                isActive ? 'bg-pm-clay' : 'bg-pm-ink/10',
              )}
            />
          )
        })}
      </div>
    </div>
  )
}
