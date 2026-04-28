// ───────────────────────────────────────────────────────────────────────
// Phase 3.7 #76 — User message card (operating mode redesign)
//
// Drops the atelier paper-card register (folded-corner mark + BAUHERR
// eyebrow tag; Q11 locked) on the working chat surface. The card is
// now a calm paper-darker tinted bubble, soft rounded-xl corners, soft
// inner border. Right-alignment + paper-darker bg + max-width 70%
// already communicate "user-side"; the BAUHERR tag was decorative.
//
// Timestamp is always visible (Q3 locked) as Inter 12 italic clay/72
// in the bottom-right of the card. Hover surfaces the relative time
// (gerade eben / vor 2 Min. / vor 3 Std. / 28. Apr 2026) via title.
//
// Phase 3.9 #97 — long-press on mobile opens MessageContextSheet.
// ───────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import type { MessageRow } from '@/types/db'
import { useViewport } from '@/lib/useViewport'
import { useLongPress } from '@/lib/useLongPress'
import { MessageAttachment } from './MessageAttachment'
import { MessageContextSheet } from './MessageContextSheet'
import { formatRelativeShort } from '../lib/formatRelativeShort'

interface Props {
  message: MessageRow
}

export function MessageUser({ message }: Props) {
  const { t, i18n } = useTranslation()
  const lang = (i18n.resolvedLanguage ?? 'de') as 'de' | 'en'
  const time = formatTime(message.created_at, lang)
  const tooltip = formatRelativeShort(new Date(message.created_at), lang)
  const { isMobile } = useViewport()
  const [sheetOpen, setSheetOpen] = useState(false)

  const longPress = useLongPress({
    onLongPress: () => {
      if (isMobile) setSheetOpen(true)
    },
  })

  return (
    <div className="flex justify-end">
      <article
        className={cn(
          'relative flex flex-col gap-1.5 max-w-[min(70%,520px)] px-4 py-3',
          'bg-[hsl(38_30%_94%)] border border-ink/8 rounded-xl',
          isMobile && 'select-none',
        )}
        style={{ boxShadow: '0 1px 2px hsl(220 15% 11% / 0.03)' }}
        {...(isMobile ? longPress : {})}
      >
        <p className="text-[15px] text-ink leading-[1.55] whitespace-pre-wrap break-words">
          {message.content_de}
        </p>

        {/* Phase 3.6 #68 — attachments inline below the body. Skip
          * for optimistic placeholder messages (id starts with
          * "pending-") since the row hasn't been persisted yet. */}
        {!message.id.startsWith('pending-') && (
          <MessageAttachment messageId={message.id} />
        )}

        {/* Phase 3.7 #76 — absolute timestamp always visible
          * (Q3 locked); relative on hover via title. */}
        <p
          className="text-[12px] italic text-clay/72 tabular-figures self-end leading-none mt-0.5"
          title={tooltip}
        >
          {time}
        </p>
      </article>

      {isMobile && (
        <MessageContextSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          fromLabel={t('chat.contextSheet.fromYou', { defaultValue: 'Sie' })}
          text={message.content_de}
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
