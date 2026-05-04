// Phase 7 Chamber — IdkAffordance.
// Single dotted-border pill "Ich bin mir nicht sicher …".
// Clicking it opens the LongPressMenu; the parent receives the
// chosen mode through onChoose.

import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

interface Props {
  onOpen: () => void
  disabled?: boolean
  className?: string
}

export function IdkAffordance({ onOpen, disabled, className }: Props) {
  const { t } = useTranslation()
  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={disabled}
      className={cn(
        'inline-flex items-center gap-1.5 px-3.5 py-2.5 sm:py-2 min-h-[44px] sm:min-h-0',
        'font-serif italic text-[13.5px] text-clay leading-snug',
        'border border-dashed border-[hsl(var(--clay)/0.55)] bg-transparent rounded-full',
        'transition-[background-color,border-color,color] duration-150',
        'hover:border-[hsl(var(--clay))] hover:bg-[hsl(var(--clay)/0.08)] hover:text-clay-deep',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay/55 focus-visible:ring-offset-2 focus-visible:ring-offset-paper',
        disabled && 'opacity-50 cursor-not-allowed',
        className,
      )}
    >
      <span aria-hidden="true">…</span>
      {t('chat.chamber.smartChipsIdk')}
    </button>
  )
}
