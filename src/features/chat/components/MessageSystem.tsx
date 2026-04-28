import { useTranslation } from 'react-i18next'
import type { MessageRow } from '@/types/db'

interface Props {
  message: MessageRow
}

/**
 * System row (D12) — a calm in-thread notice with a distinct visual
 * register: hairline-bordered top + bottom (no fill), uppercase SYSTEM
 * tag (no leading dot to differentiate from specialist tags), Inter 13
 * clay body. Used for the "Sonstiges" template fallback notice and
 * other meta-conversational signals where attribution to a specialist
 * would be misleading.
 */
export function MessageSystem({ message }: Props) {
  const { t, i18n } = useTranslation()
  const lang = (i18n.resolvedLanguage ?? 'de') as 'de' | 'en'
  const text =
    lang === 'en' && message.content_en ? message.content_en : message.content_de

  return (
    <aside
      className="flex flex-col gap-2 border-y border-border-strong/40 py-3"
      aria-label={t('chat.system.label')}
    >
      <p className="text-[11px] font-medium uppercase tracking-[0.20em] text-clay leading-none">
        {t('chat.system.tag')}
      </p>
      <p className="text-[13px] text-ink/80 leading-relaxed">{text}</p>
    </aside>
  )
}
