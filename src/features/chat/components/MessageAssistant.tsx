import { useTranslation } from 'react-i18next'
import { m, useReducedMotion } from 'framer-motion'
import { SpecialistTag } from './SpecialistTag'
import { Typewriter } from './Typewriter'
import type { MessageRow } from '@/types/db'

interface Props {
  message: MessageRow
  /** True for messages that existed before this session — render instantly. */
  isHistory: boolean
  /** The specialist who spoke in the previous assistant message. */
  previousSpecialist?: string | null
}

/**
 * Assistant message — left-aligned, no card.
 *
 * Polish Move 1: SpecialistTag now carries an italic German role
 * label below the uppercase tag (handled inside SpecialistTag).
 *
 * Polish Move 2 — Match-Cut: when the speaking specialist differs
 * from the previous turn (or this is the very first assistant turn),
 * draw a hairline rule above the nameplate that fades in over 320ms,
 * then scale the nameplate in over 240ms. Same specialist twice in
 * a row → no rule, no scale (continuous voice). Reduced-motion:
 * instant rule, instant scale.
 */
export function MessageAssistant({ message, isHistory, previousSpecialist }: Props) {
  const { i18n } = useTranslation()
  const reduced = useReducedMotion()
  const lang = (i18n.resolvedLanguage ?? 'de') as 'de' | 'en'
  const text =
    lang === 'en' && message.content_en ? message.content_en : message.content_de

  const isHandoff =
    !isHistory &&
    !!message.specialist &&
    message.specialist !== (previousSpecialist ?? null)

  return (
    <article
      className="flex flex-col gap-4"
      aria-label={`Specialist: ${message.specialist ?? 'unknown'}`}
    >
      {message.specialist && (
        <div className="flex flex-col gap-3">
          {isHandoff && (
            <m.span
              aria-hidden="true"
              className="block h-px bg-gradient-to-r from-transparent via-border-strong/60 to-transparent"
              initial={reduced ? false : { scaleX: 0, transformOrigin: 'left center' }}
              animate={{ scaleX: 1 }}
              transition={{ duration: reduced ? 0 : 0.32, ease: [0.16, 1, 0.3, 1] }}
            />
          )}
          <m.div
            initial={
              reduced || !isHandoff
                ? false
                : { scale: 0.98, opacity: 0, transformOrigin: 'left center' }
            }
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              duration: reduced || !isHandoff ? 0 : 0.24,
              delay: reduced || !isHandoff ? 0 : 0.32,
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            <SpecialistTag specialist={message.specialist} />
          </m.div>
        </div>
      )}
      <div className="text-[15px] text-ink leading-relaxed">
        <Typewriter text={text} instant={isHistory} />
      </div>
    </article>
  )
}
