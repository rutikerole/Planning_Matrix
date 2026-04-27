import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

interface Props {
  placeholder?: string
  disabled?: boolean
  onSubmit: (text: string) => void
  /** Auto-focus on mount (e.g. after a fresh assistant turn lands). */
  autoFocus?: boolean
}

const MAX_ROWS = 5
const MAX_LENGTH = 4000

/**
 * Single-line growing textarea. Enter submits, Shift+Enter newline.
 * Auto-grows up to 5 rows then scrolls. Trim + length-cap on submit.
 * Reduced-motion: no transitions on the focus border.
 */
export function InputText({ placeholder, disabled, onSubmit, autoFocus }: Props) {
  const { t } = useTranslation()
  const ref = useRef<HTMLTextAreaElement>(null)
  const [value, setValue] = useState('')

  useEffect(() => {
    if (autoFocus && ref.current && !disabled) {
      ref.current.focus()
    }
  }, [autoFocus, disabled])

  // Manual auto-grow up to MAX_ROWS — field-sizing-content has uneven
  // browser support, so we recompute height from scrollHeight.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = '0px'
    const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || 22
    const padding =
      parseFloat(getComputedStyle(el).paddingTop) +
      parseFloat(getComputedStyle(el).paddingBottom)
    const max = lineHeight * MAX_ROWS + padding
    el.style.height = `${Math.min(el.scrollHeight, max)}px`
    el.style.overflowY = el.scrollHeight > max ? 'auto' : 'hidden'
  }, [value])

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleSubmit = () => {
    const trimmed = value.trim().slice(0, MAX_LENGTH)
    if (!trimmed) return
    onSubmit(trimmed)
    setValue('')
  }

  return (
    <div className="flex items-end gap-3 w-full">
      <textarea
        ref={ref}
        rows={1}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder ?? t('chat.input.text.placeholder')}
        disabled={disabled}
        maxLength={MAX_LENGTH + 200}
        className={cn(
          'flex-1 bg-transparent border-0 border-b border-border-strong/45 focus:border-ink py-2.5 text-[15px] text-ink placeholder:text-ink/35 resize-none transition-colors duration-soft focus:outline-none',
          disabled && 'opacity-60 pointer-events-none',
        )}
        aria-label={t('chat.input.text.label')}
      />
      <button
        type="button"
        onClick={handleSubmit}
        disabled={disabled || !value.trim()}
        aria-label={t('chat.input.send')}
        className={cn(
          'h-10 px-4 rounded-sm text-[13px] font-medium tracking-tight transition-[background-color,opacity] duration-soft ease-soft self-end',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          disabled || !value.trim()
            ? 'bg-ink/15 text-ink/40 cursor-not-allowed'
            : 'bg-ink text-paper hover:bg-ink/92',
        )}
      >
        {t('chat.input.send')}
      </button>
    </div>
  )
}
