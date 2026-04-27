import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

export interface SelectOption {
  value: string
  label_de: string
  label_en: string
}

interface Props {
  options: SelectOption[]
  disabled?: boolean
  onSubmit: (option: SelectOption) => void
}

/**
 * Single-select chip row. Click an option → immediate submit. Arrow
 * keys cycle focus across options; Enter / Space activates.
 */
export function InputSelect({ options, disabled, onSubmit }: Props) {
  const { i18n } = useTranslation()
  const lang = (i18n.resolvedLanguage ?? 'de') as 'de' | 'en'
  const refs = useRef<Array<HTMLButtonElement | null>>([])

  const onKey = (e: React.KeyboardEvent, idx: number) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault()
      refs.current[(idx + 1) % options.length]?.focus()
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      refs.current[(idx - 1 + options.length) % options.length]?.focus()
    } else if (e.key === 'Home') {
      e.preventDefault()
      refs.current[0]?.focus()
    } else if (e.key === 'End') {
      e.preventDefault()
      refs.current[options.length - 1]?.focus()
    }
  }

  return (
    <div role="group" className="flex flex-wrap gap-2">
      {options.map((opt, idx) => {
        const label = lang === 'en' ? opt.label_en : opt.label_de
        return (
          <button
            key={opt.value}
            ref={(el) => {
              refs.current[idx] = el
            }}
            type="button"
            onClick={() => onSubmit(opt)}
            onKeyDown={(e) => onKey(e, idx)}
            disabled={disabled}
            className={cn(
              'h-10 px-4 rounded-sm border text-[13.5px] font-medium tracking-tight transition-colors duration-soft ease-soft',
              'border-border-strong/55 bg-paper text-ink/85 hover:border-ink/40 hover:bg-muted/40 hover:text-ink',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              disabled && 'opacity-60 pointer-events-none',
            )}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
