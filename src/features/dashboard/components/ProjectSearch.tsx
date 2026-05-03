import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

interface Props {
  value: string
  onChange: (next: string) => void
}

/**
 * Hairline-bottom-border search input, 280px wide. Cmd/Ctrl+K from
 * anywhere in the dashboard focuses this field.
 */
export function ProjectSearch({ value, onChange }: Props) {
  const { t } = useTranslation()
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        ref.current?.focus()
        ref.current?.select()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <input
      ref={ref}
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={t('dashboard.search')}
      aria-label={t('dashboard.search')}
      className="w-full max-w-[280px] border-0 border-b border-pm-hair-strong bg-transparent py-2 font-sans text-[14px] text-pm-ink placeholder:text-pm-ink-mute2 focus:border-pm-clay focus:outline-none focus:ring-0"
    />
  )
}
