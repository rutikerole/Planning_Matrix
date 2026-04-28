import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { m, useReducedMotion } from 'framer-motion'
import { SpecialistTag } from './SpecialistTag'
import { Typewriter } from './Typewriter'
import { MessageContextSheet } from './MessageContextSheet'
import type { MessageRow } from '@/types/db'
import { useViewport } from '@/lib/useViewport'
import { useLongPress } from '@/lib/useLongPress'

interface Props {
  message: MessageRow
  /** True for messages that existed before this session — render instantly. */
  isHistory: boolean
  /** The specialist who spoke in the previous assistant message. */
  previousSpecialist?: string | null
  /** Set on the very first assistant message — applies viewTransitionName so
   *  the wizard's hairline morphs into this rule (Polish Move 5). */
  isHandoffTarget?: boolean
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
export function MessageAssistant({
  message,
  isHistory,
  previousSpecialist,
  isHandoffTarget,
}: Props) {
  const { t, i18n } = useTranslation()
  const reduced = useReducedMotion()
  const lang = (i18n.resolvedLanguage ?? 'de') as 'de' | 'en'
  const text =
    lang === 'en' && message.content_en ? message.content_en : message.content_de
  const { isMobile } = useViewport()
  const [sheetOpen, setSheetOpen] = useState(false)

  // Phase 3.9 #97 — long-press on mobile opens the context sheet.
  // Bound on the article wrapper so the entire bubble surface is the
  // hit target.
  const longPress = useLongPress({
    onLongPress: () => {
      if (isMobile) setSheetOpen(true)
    },
  })

  const specialistLabel = message.specialist
    ? t(`chat.specialists.${message.specialist}`, {
        defaultValue: message.specialist,
      })
    : t('chat.contextSheet.fromAssistant', { defaultValue: 'Assistent' })

  const isHandoff =
    !isHistory &&
    !!message.specialist &&
    message.specialist !== (previousSpecialist ?? null)

  return (
    <article
      className="relative flex flex-col gap-5"
      aria-label={`Specialist: ${message.specialist ?? 'unknown'}`}
      data-message-id={message.id}
      {...(isMobile ? longPress : {})}
    >
      {/* Phase 3.2 #38 — marginalia rule. 1px clay vertical bracket left of
       * the body, 24px to the left, marking "this is one specialist's
       * contribution." Draws bottom-to-top in 320ms; reduced-motion: instant. */}
      {!isHistory && (
        <m.span
          aria-hidden="true"
          className="absolute -left-6 top-12 w-px h-16 bg-clay/35"
          initial={reduced ? false : { scaleY: 0, transformOrigin: 'bottom center' }}
          animate={{ scaleY: 1 }}
          transition={{ duration: reduced ? 0 : 0.32, ease: [0.16, 1, 0.3, 1] }}
        />
      )}
      {message.specialist && (
        <div className="flex flex-col gap-3">
          {isHandoff && (
            <m.span
              aria-hidden="true"
              className="block h-px bg-gradient-to-r from-transparent via-border-strong/60 to-transparent"
              style={
                isHandoffTarget
                  ? { viewTransitionName: 'pm-handoff-hairline' }
                  : undefined
              }
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
      {/* Phase 3.2 #38 — body bumped Inter 15 → 16, leading 1.65. The
       * citation auto-bold from highlightCitations stays; we don't
       * compete with it here. */}
      <div className="text-[16px] text-ink leading-[1.65]">
        <Typewriter text={text} instant={isHistory} />
      </div>

      {isMobile && (
        <MessageContextSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          fromLabel={specialistLabel}
          text={text}
        />
      )}
    </article>
  )
}
