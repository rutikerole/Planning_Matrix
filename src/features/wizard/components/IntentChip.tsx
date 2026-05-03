import { forwardRef, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { INTENT_TO_I18N, type Intent } from '../lib/selectTemplate'
import { IntentIcon } from './IntentIcons'

interface Props {
  intent: Intent
  selected: boolean
  onSelect: () => void
  onKeyDown?: (e: KeyboardEvent<HTMLButtonElement>) => void
}

export const IntentChip = forwardRef<HTMLButtonElement, Props>(function IntentChip(
  { intent, selected, onSelect, onKeyDown },
  ref,
) {
  const { t } = useTranslation()
  const slug = INTENT_TO_I18N[intent]
  const label = t(`wizard.q1.options.${slug}.label`)
  const code = t(`wizard.q1.options.${slug}.code`)

  return (
    <button
      ref={ref}
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      onKeyDown={onKeyDown}
      className={cn(
        'group relative flex h-[120px] flex-col justify-between border bg-pm-paper p-4 text-left transition-all duration-soft ease-soft',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pm-clay focus-visible:ring-offset-2 focus-visible:ring-offset-pm-paper',
        selected
          ? 'border-pm-clay-soft -translate-y-0.5 bg-pm-paper-tint shadow-[0_8px_18px_-12px_rgba(22,19,16,0.18)]'
          : 'border-pm-hair hover:bg-pm-paper-tint motion-safe:hover:-translate-y-0.5',
      )}
    >
      {selected ? (
        <span
          aria-hidden="true"
          className="absolute left-3 top-3 block size-1.5 rounded-full bg-pm-clay"
        />
      ) : null}

      <IntentIcon intent={intent} className="size-6 text-pm-clay" />

      <div className="flex items-end justify-between gap-2">
        <span className="font-sans text-[15px] leading-tight text-pm-ink">
          {label}
        </span>
        <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-pm-ink-mute2">
          {code}
        </span>
      </div>
    </button>
  )
})
