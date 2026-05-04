// Phase 7 Chamber — MessageAssistant.
//
//   ─ optional MatchCut sweep (commit 11) ─
//   <ChamberSigil> · italic Serif Specialist Name (38px)
//   running-head (italic serif clay/72)
//
//   body — Inter 18px, line-height 1.7, with citation auto-bold.
//
// Long-press on mobile opens the existing MessageContextSheet.

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import type { MessageRow } from '@/types/db'
import type { Specialist } from '@/types/projectState'
import { useViewport } from '@/lib/useViewport'
import { useLongPress } from '@/lib/useLongPress'
import { ChamberSigil } from '../../lib/specialistSigils'
import { MessageContextSheet } from '../MessageContextSheet'
import { MessageAttachment } from '../MessageAttachment'
import { Typewriter } from './Typewriter'
import { MatchCut } from './MatchCut'

interface Props {
  message: MessageRow
  /** True when the row was already in the cache at mount — render instant. */
  isHistory: boolean
  /** Used by MatchCut to detect a specialist change. */
  previousSpecialist?: string | null
}

const SPECIALIST_RUNNING_HEAD: Record<Specialist, string> = {
  moderator: 'Moderation',
  planungsrecht: 'Planungsrecht',
  bauordnungsrecht: 'Bauordnung',
  sonstige_vorgaben: 'Weitere Vorgaben',
  verfahren: 'Verfahrenssynthese',
  beteiligte: 'Beteiligten-Bedarf',
  synthesizer: 'Querschnitt',
}

export function MessageAssistant({
  message,
  isHistory,
  previousSpecialist,
}: Props) {
  const { t, i18n } = useTranslation()
  const lang = (i18n.resolvedLanguage ?? 'de') as 'de' | 'en'
  const { isMobile } = useViewport()
  const [sheetOpen, setSheetOpen] = useState(false)

  const text =
    lang === 'en' && message.content_en ? message.content_en : message.content_de

  const specialist = (message.specialist ?? 'moderator') as Specialist
  const specialistLabel = t(`chat.specialists.${specialist}`)
  const runningHead = SPECIALIST_RUNNING_HEAD[specialist] ?? specialistLabel

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
        <div className="flex items-center gap-3">
          <span style={{ color: 'hsl(var(--clay))' }}>
            <ChamberSigil specialist={specialist} size={20} />
          </span>
          <h2 className="font-serif italic text-[28px] md:text-[38px] leading-[1.05] tracking-[-0.02em] text-ink m-0">
            {specialistLabel}
          </h2>
        </div>
        <p className="role-running-head pl-9">{runningHead}</p>
      </header>

      {/* Body */}
      <div className="text-[16px] md:text-[18px] text-ink leading-[1.7]">
        <Typewriter text={text} instant={isHistory} messageId={message.id} />
      </div>

      {/* Attachments — when the row already has a persisted id */}
      {!message.id.startsWith('pending-') && !message.id.startsWith('system:') && (
        <MessageAttachment messageId={message.id} />
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
