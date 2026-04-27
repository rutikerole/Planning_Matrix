import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

interface Props {
  disabled?: boolean
  onSubmit: (value: 'ja' | 'nein') => void
}

/**
 * Two-pill Ja / Nein. Click submits. Keyboard 1 / 2 select. ARIA
 * surfaces it as a radio group for screen readers since each option
 * commits action immediately on activation.
 */
export function InputYesNo({ disabled, onSubmit }: Props) {
  const { t } = useTranslation()

  useEffect(() => {
    if (disabled) return
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === '1') {
        e.preventDefault()
        onSubmit('ja')
      } else if (e.key === '2') {
        e.preventDefault()
        onSubmit('nein')
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [disabled, onSubmit])

  return (
    <div role="group" aria-label={t('chat.input.yesno.yes') + ' / ' + t('chat.input.yesno.no')} className="flex gap-2">
      {(['ja', 'nein'] as const).map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onSubmit(v)}
          disabled={disabled}
          className={cn(
            'h-10 px-6 rounded-sm border text-[14px] font-medium tracking-tight transition-colors duration-soft ease-soft',
            'border-border-strong/55 bg-paper text-ink/85 hover:border-ink/40 hover:bg-muted/40 hover:text-ink',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            disabled && 'opacity-60 pointer-events-none',
          )}
        >
          {t(v === 'ja' ? 'chat.input.yesno.yes' : 'chat.input.yesno.no')}
        </button>
      ))}
    </div>
  )
}
