import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { isPlotAddressValid } from '@/features/wizard/lib/plotValidation'

interface Props {
  disabled?: boolean
  onSubmit: (text: string) => void
}

/**
 * Address text input with D8 validation: trim, ≥ 6 chars, has digit,
 * AND (comma OR \b\d{5}\b postcode). Helper / error swap on blur.
 */
export function InputAddress({ disabled, onSubmit }: Props) {
  const { t } = useTranslation()
  const [value, setValue] = useState('')
  const [touched, setTouched] = useState(false)

  const valid = isPlotAddressValid(value)
  const showError = touched && !valid

  const handleSubmit = () => {
    if (!valid) {
      setTouched(true)
      return
    }
    onSubmit(value.trim())
    setValue('')
    setTouched(false)
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-end gap-3">
        <input
          type="text"
          inputMode="text"
          autoComplete="street-address"
          value={value}
          placeholder={t('chat.input.address.placeholder')}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => setTouched(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              handleSubmit()
            }
          }}
          disabled={disabled}
          aria-invalid={showError || undefined}
          className={cn(
            'flex-1 bg-transparent border-0 border-b py-2.5 text-[16px] sm:text-[15px] text-ink placeholder:text-ink/35 focus:outline-none transition-colors duration-soft',
            showError
              ? 'border-destructive/70 focus:border-destructive'
              : 'border-border-strong/45 focus:border-ink',
            disabled && 'opacity-60 pointer-events-none',
          )}
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={disabled || !valid}
          className={cn(
            'h-10 px-4 rounded-sm text-[13px] font-medium transition-[background-color,opacity] duration-soft ease-soft self-end',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            disabled || !valid
              ? 'bg-ink/15 text-ink/40 cursor-not-allowed'
              : 'bg-ink text-paper hover:bg-ink/92',
          )}
        >
          {t('chat.input.send')}
        </button>
      </div>
      <p
        className={cn(
          'text-[11px] leading-relaxed',
          showError ? 'text-destructive' : 'text-clay/85 italic',
        )}
      >
        {showError ? t('chat.input.address.invalid') : t('chat.input.address.helper')}
      </p>
    </div>
  )
}
