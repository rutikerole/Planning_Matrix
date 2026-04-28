import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useChatStore } from '@/stores/chatStore'
import { formatRelativeShort } from '../lib/formatRelativeShort'

/**
 * Phase 3.4 #59 — calm "Automatisch gespeichert · vor X Sek." indicator
 * in the LeftRail header. Reads chatStore.lastSavedAt; re-renders the
 * relative-time string every 5 s while a session is active.
 *
 * Calms the long-form-anxiety: users learn early that their work is
 * persisted without having to refresh and check.
 */
export function AutoSavedIndicator() {
  const { t, i18n } = useTranslation()
  const lang = (i18n.resolvedLanguage ?? 'de') as 'de' | 'en'
  const lastSavedAt = useChatStore((s) => s.lastSavedAt)
  const [, setTick] = useState(0)

  // Re-render every 5s so the relative time stays fresh.
  useEffect(() => {
    if (!lastSavedAt) return
    const id = setInterval(() => setTick((n) => n + 1), 5000)
    return () => clearInterval(id)
  }, [lastSavedAt])

  if (!lastSavedAt) return null

  return (
    <p className="font-serif italic text-[11px] text-clay/65 leading-none">
      {t('chat.autoSaved.label', { defaultValue: 'Automatisch gespeichert' })}
      <span aria-hidden="true" className="mx-1.5">·</span>
      <span className="tabular-figures">{formatRelativeShort(lastSavedAt, lang)}</span>
    </p>
  )
}
