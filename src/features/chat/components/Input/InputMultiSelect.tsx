import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import type { SelectOption } from './InputSelect'

interface Props {
  options: SelectOption[]
  disabled?: boolean
  onSubmit: (selected: SelectOption[]) => void
}

/**
 * Multi-select chips toggle. At least one selection required. Primary
 * Weiter button submits. Selected: ink fill paper text. Unselected:
 * paper fill ink text.
 */
export function InputMultiSelect({ options, disabled, onSubmit }: Props) {
  const { t, i18n } = useTranslation()
  const lang = (i18n.resolvedLanguage ?? 'de') as 'de' | 'en'
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const toggle = (value: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(value)) next.delete(value)
      else next.add(value)
      return next
    })
  }

  const handleSubmit = () => {
    if (selected.size === 0) return
    const picked = options.filter((o) => selected.has(o.value))
    onSubmit(picked)
    setSelected(new Set())
  }

  return (
    <div className="flex flex-col gap-3">
      <div role="group" className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const label = lang === 'en' ? opt.label_en : opt.label_de
          const isOn = selected.has(opt.value)
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggle(opt.value)}
              aria-pressed={isOn}
              disabled={disabled}
              className={cn(
                'h-10 px-4 rounded-sm border text-[13.5px] font-medium tracking-tight transition-colors duration-soft ease-soft',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                isOn
                  ? 'bg-ink text-paper border-ink'
                  : 'border-border-strong/55 bg-paper text-ink/85 hover:border-ink/40 hover:bg-muted/40 hover:text-ink',
                disabled && 'opacity-60 pointer-events-none',
              )}
            >
              {label}
            </button>
          )
        })}
      </div>

      <div className="flex items-center justify-between gap-3 pt-1">
        <p className="text-[11px] text-clay/70 italic">
          {selected.size === 0 ? t('chat.input.multi.minHint') : `${selected.size} ausgewählt`}
        </p>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={disabled || selected.size === 0}
          className={cn(
            'h-10 px-5 rounded-[5px] text-[13.5px] font-medium transition-[background-color,opacity] duration-soft ease-soft',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            disabled || selected.size === 0
              ? 'bg-ink/20 text-ink/40 cursor-not-allowed'
              : 'bg-ink text-paper hover:bg-ink/92',
          )}
        >
          {t('chat.input.multi.submit')}
        </button>
      </div>
    </div>
  )
}
