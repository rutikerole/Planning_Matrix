import { useTranslation } from 'react-i18next'
import { SpecialistTag } from './SpecialistTag'
import { Typewriter } from './Typewriter'
import type { MessageRow } from '@/types/db'

interface Props {
  message: MessageRow
  /** True for messages that existed before this session — render instantly. */
  isHistory: boolean
}

/**
 * Assistant message — left-aligned, no card. Specialist tag above the
 * body; Typewriter renders the body with citation highlighting on
 * completion. Falls back to instant render for reduced-motion users
 * and for any row that was already in the database when the workspace
 * mounted (history shouldn't replay).
 */
export function MessageAssistant({ message, isHistory }: Props) {
  const { i18n } = useTranslation()
  const lang = (i18n.resolvedLanguage ?? 'de') as 'de' | 'en'
  const text =
    lang === 'en' && message.content_en
      ? message.content_en
      : message.content_de

  return (
    <article className="flex flex-col gap-3" aria-label={`Specialist: ${message.specialist ?? 'unknown'}`}>
      {message.specialist && <SpecialistTag specialist={message.specialist} />}
      <div className="text-[15px] text-ink leading-relaxed">
        <Typewriter text={text} instant={isHistory} />
      </div>
    </article>
  )
}
