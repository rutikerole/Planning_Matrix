// Phase 7 Chamber — user message pill.
//
// Right-aligned. Soft paper-warm bg, rounded-2xl, italic-serif
// timestamp footer. Long-press on mobile opens MessageContextSheet.

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import type { MessageRow } from '@/types/db'
import { useViewport } from '@/lib/useViewport'
import { useLongPress } from '@/lib/useLongPress'
import { MessageContextSheet } from '../MessageContextSheet'
import { MessageAttachment } from '../MessageAttachment'
import { formatRelativeShort } from '../../lib/formatRelativeShort'

interface Props {
  message: MessageRow
}

export function MessageUser({ message }: Props) {
  const { t, i18n } = useTranslation()
  const lang = (i18n.resolvedLanguage ?? 'de') as 'de' | 'en'
  const { isMobile } = useViewport()
  const [sheetOpen, setSheetOpen] = useState(false)

  const text =
    lang === 'en' && message.content_en ? message.content_en : message.content_de
  const time = formatTime(message.created_at, lang)
  const tooltip = formatRelativeShort(new Date(message.created_at), lang)

  const longPress = useLongPress({
    onLongPress: () => {
      if (isMobile) setSheetOpen(true)
    },
  })

  return (
    <div className="flex justify-end">
      <article
        className={cn(
          'relative flex flex-col gap-2 max-w-[min(72%,540px)] px-5 py-4',
          'bg-[hsl(38_28%_94%)] border border-[var(--hairline,rgba(26,22,18,0.10))] rounded-2xl',
          isMobile && 'select-none',
        )}
        style={{ boxShadow: '0 1px 2px rgba(26, 22, 18, 0.04)' }}
        {...(isMobile ? longPress : {})}
      >
        <p className="text-[15.5px] text-ink leading-[1.55] whitespace-pre-wrap break-words">
          {text}
        </p>
        {!message.id.startsWith('pending-') && (
          <MessageAttachment messageId={message.id} />
        )}
        <p
          className="font-serif italic text-[12px] text-clay/82 tabular-figures self-end leading-none mt-0.5"
          title={tooltip}
        >
          {t('chat.contextSheet.fromYou', { defaultValue: 'Sie' })} · {time}
        </p>
      </article>

      {isMobile && (
        <MessageContextSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          fromLabel={t('chat.contextSheet.fromYou', { defaultValue: 'Sie' })}
          text={text}
        />
      )}
    </div>
  )
}

function formatTime(iso: string, lang: 'de' | 'en'): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString(lang === 'en' ? 'en-GB' : 'de-DE', {
    hour: '2-digit',
    minute: '2-digit',
  })
}
