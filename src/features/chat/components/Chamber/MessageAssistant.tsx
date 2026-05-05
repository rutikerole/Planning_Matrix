// Phase 7 Chamber — MessageAssistant.
//
// Phase 7.8 §2.2 — Manuscript direction. Two render modes.
// Phase 7.9 §2.2 — past-turn label simplified.
//
//   ACTIVE TURN  (isActive === true)
//     ─ optional MatchCut sweep ─
//     italic-serif Georgia 28 px chapter heading (no inline sigil,
//       no caps eyebrow, no running-head)
//     56 px left-indent on the body (ml-14)
//
//   PAST TURN    (isActive === false)
//     italic-serif Georgia 16 px specialist label only — no sigil,
//       no running-head, no caps eyebrow. The chapter heading
//       shrinks; everything else stays the same.
//     56 px left-indent body, body fades to ~0.5 opacity (handled
//       by --chamber-distance in globals.css).
//
// Long-press on mobile opens the existing MessageContextSheet.

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { m, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { MessageRow } from '@/types/db'
import type { Specialist } from '@/types/projectState'
import { useViewport } from '@/lib/useViewport'
import { useLongPress } from '@/lib/useLongPress'
import { MessageContextSheet } from '../MessageContextSheet'
import { MessageAttachment } from '../MessageAttachment'
import { Typewriter } from './Typewriter'
import { MatchCut } from './MatchCut'
import { renderMarkdown } from '../../lib/renderMarkdown'

interface Props {
  message: MessageRow
  /** True when the row was already in the cache at mount — render instant. */
  isHistory: boolean
  /** Used by MatchCut to detect a specialist change. */
  previousSpecialist?: string | null
  /** Phase 7.8 — true when this row is the latest assistant message in
   *  the thread. Drives the chapter-heading vs. small-label render. */
  isActive?: boolean
}

export function MessageAssistant({
  message,
  isHistory,
  previousSpecialist,
  isActive = false,
}: Props) {
  const { t, i18n } = useTranslation()
  const lang = (i18n.resolvedLanguage ?? 'de') as 'de' | 'en'
  const { isMobile } = useViewport()
  const [sheetOpen, setSheetOpen] = useState(false)

  const text =
    lang === 'en' && message.content_en ? message.content_en : message.content_de

  const specialist = (message.specialist ?? 'moderator') as Specialist
  const specialistLabel = t(`chat.specialists.${specialist}`)

  const reduced = useReducedMotion()
  const longPress = useLongPress({
    onLongPress: () => {
      if (isMobile) setSheetOpen(true)
    },
  })

  const isHandoff =
    !isHistory && previousSpecialist != null && previousSpecialist !== specialist

  return (
    <article
      id={`spec-tag-${message.id}`}
      data-message-id={message.id}
      aria-label={`Specialist: ${specialist}`}
      className="flex flex-col gap-4"
      {...(isMobile ? longPress : {})}
    >
      {/* Specialist nameplate */}
      <header className={cn('flex flex-col gap-1.5')}>
        {isHandoff && (
          <MatchCut from={previousSpecialist as Specialist} to={specialist} />
        )}
        {isActive ? (
          // Active turn — chapter heading. No inline sigil, no
          // running-head; the ConversationStrip carries identity at
          // the top of the column.
          <m.h2
            initial={
              reduced || isHistory || !isHandoff
                ? false
                : { opacity: 0, y: 8 }
            }
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: reduced || isHistory || !isHandoff ? 0 : 0.32,
              delay: reduced || isHistory || !isHandoff ? 0 : 0.32,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="leading-[1.1] tracking-[-0.01em] text-ink m-0"
            style={{
              fontFamily: "Georgia, 'Instrument Serif', serif",
              fontStyle: 'italic',
              fontSize: 28,
            }}
          >
            {specialistLabel}
          </m.h2>
        ) : (
          // Past turn — specialist label only, in italic Georgia 16 px.
          // No sigil, no caps eyebrow, no running-head sub-line.
          <m.h2
            initial={
              reduced || isHistory || !isHandoff
                ? false
                : { opacity: 0, y: 8 }
            }
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: reduced || isHistory || !isHandoff ? 0 : 0.32,
              delay: reduced || isHistory || !isHandoff ? 0 : 0.32,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="leading-[1.2] tracking-normal text-ink m-0"
            style={{
              fontFamily: "Georgia, 'Instrument Serif', serif",
              fontStyle: 'italic',
              fontSize: 16,
            }}
          >
            {specialistLabel}
          </m.h2>
        )}
      </header>

      {/* Body — 56 px left-indent (ml-14) per Manuscript direction.
        * Phase 8.5 (C.3): past-turn (history) bodies render through the
        * markdown whitelist so **bold** + lists + line breaks display
        * correctly. Active turns keep the typewriter typing the raw
        * text — markdown takes effect once the row settles into history
        * (the next render after typewriter completion treats it as
        * isHistory). */}
      <div className="text-[16px] md:text-[18px] text-ink leading-[1.7] ml-14">
        {isHistory ? (
          <div className="markdown-body">{renderMarkdown(text)}</div>
        ) : (
          <Typewriter text={text} instant={isHistory} messageId={message.id} />
        )}
      </div>

      {/* Attachments — when the row already has a persisted id */}
      {!message.id.startsWith('pending-') && !message.id.startsWith('system:') && (
        <div className="ml-14">
          <MessageAttachment messageId={message.id} />
        </div>
      )}

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
