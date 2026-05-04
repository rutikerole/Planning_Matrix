// Phase 7 Chamber — StreamingAssistantBubble.
// Renders the streaming assistant text mid-flight. Replaced once the
// persisted assistant row lands.

import { useTranslation } from 'react-i18next'
import { useChatStore } from '@/stores/chatStore'
import { ChamberSigil } from '../../lib/specialistSigils'
import type { Specialist } from '@/types/projectState'
import { StreamingCursor } from './StreamingCursor'

export function StreamingAssistantBubble() {
  const { t } = useTranslation()
  const stream = useChatStore((s) => s.streamingMessage)
  if (!stream) return null
  const specialist = (stream.specialist ?? 'moderator') as Specialist
  const label = t(`chat.specialists.${specialist}`)
  return (
    <article className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span style={{ color: 'hsl(var(--clay))' }}>
          <ChamberSigil specialist={specialist} size={16} />
        </span>
        <p className="font-mono text-[10px] uppercase tracking-[0.20em] text-clay leading-none">
          {label}
        </p>
      </div>
      <p className="text-[18px] text-ink leading-[1.7] whitespace-pre-wrap">
        {stream.contentSoFar}
        <StreamingCursor />
      </p>
    </article>
  )
}
