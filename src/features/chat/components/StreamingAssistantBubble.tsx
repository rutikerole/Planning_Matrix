import { useChatStore } from '@/stores/chatStore'
import { SpecialistTag } from './SpecialistTag'
import { StreamingCursor } from './StreamingCursor'

/**
 * Phase 3.4 #52 — assistant bubble rendered while a streaming response
 * is in flight. Mirrors the layout of `MessageAssistant` so the swap
 * to the persisted message at `onComplete` is visually seamless: same
 * marginalia rule, same SpecialistTag, same body typography. The text
 * is `chatStore.streamingMessage.contentSoFar` which appends as JSON
 * deltas extract via the streamingExtractor.
 */
export function StreamingAssistantBubble() {
  const stream = useChatStore((s) => s.streamingMessage)
  if (!stream) return null

  const specialist = stream.specialist ?? 'moderator'

  return (
    <article
      className="relative flex flex-col gap-5"
      aria-label={`Specialist: ${specialist}`}
      aria-live="polite"
    >
      {/* Marginalia rule — matches MessageAssistant #38. Static here:
       * stream is already showing motion via the cursor. */}
      <span
        aria-hidden="true"
        className="absolute -left-6 top-12 w-px h-16 bg-clay/35"
      />
      <SpecialistTag specialist={specialist} />
      <div className="text-[16px] text-ink leading-[1.65]">
        {stream.contentSoFar}
        <StreamingCursor />
      </div>
    </article>
  )
}
