// Phase 7 Chamber — system row.
// Quiet hairline-bordered card. Used for the recovery row + sonstige
// template notice generated client-side in ChatWorkspacePage.

import { useTranslation } from 'react-i18next'
import type { MessageRow } from '@/types/db'

interface Props {
  message: MessageRow
}

export function MessageSystem({ message }: Props) {
  const { t, i18n } = useTranslation()
  const lang = (i18n.resolvedLanguage ?? 'de') as 'de' | 'en'
  const text =
    lang === 'en' && message.content_en ? message.content_en : message.content_de

  return (
    <aside
      aria-label={t('chat.system.label', { defaultValue: 'Systemhinweis' })}
      className="flex flex-col gap-1.5 border-y border-[var(--hairline-strong,rgba(26,22,18,0.18))] py-4"
    >
      <p className="font-mono text-[10.5px] uppercase tracking-[0.20em] text-clay leading-none">
        {t('chat.system.tag', { defaultValue: 'SYSTEM' })}
      </p>
      <p className="text-[14px] text-ink/80 leading-relaxed">{text}</p>
    </aside>
  )
}
