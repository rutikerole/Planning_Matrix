import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

interface Props {
  count: number
  /** 1-based index of the active step. */
  active: number
  className?: string
}

/**
 * Two-dot progress meter at the bottom of the wizard. Filled = answered,
 * the current dot pulses gently (animate-breath-dot, defined in
 * tailwind.config.js). Reduced-motion freezes the pulse via the global
 * prefers-reduced-motion rule in globals.css.
 */
export function ProgressDots({ count, active, className }: Props) {
  const { t } = useTranslation()
  return (
    <div
      role="progressbar"
      aria-valuenow={active}
      aria-valuemin={1}
      aria-valuemax={count}
      aria-label={t('wizard.progress.label', { current: active, total: count })}
      className={cn('inline-flex items-center gap-3', className)}
    >
      {Array.from({ length: count }, (_, i) => {
        const idx = i + 1
        const isFilled = idx <= active
        const isCurrent = idx === active
        return (
          <span
            key={idx}
            aria-hidden="true"
            className={cn(
              'block size-1.5 rounded-full transition-colors duration-soft ease-soft',
              isFilled ? 'bg-clay' : 'bg-border-strong/50',
              isCurrent && 'motion-safe:animate-breath-dot',
            )}
          />
        )
      })}
    </div>
  )
}
