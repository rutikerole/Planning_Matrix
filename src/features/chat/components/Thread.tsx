import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { MessageUser } from './MessageUser'
import { MessageAssistant } from './MessageAssistant'
import { MessageSystem } from './MessageSystem'
import { ThinkingIndicator } from './ThinkingIndicator'
import { StreamingAssistantBubble } from './StreamingAssistantBubble'
import { CompletionInterstitial } from './CompletionInterstitial'
import { ChapterDivider } from './ChapterDivider'
import { useChatStore } from '@/stores/chatStore'
import { useAutoScroll } from '../hooks/useAutoScroll'
import { detectChapters } from '../lib/detectChapters'
import type { MessageRow } from '@/types/db'

interface Props {
  messages: MessageRow[]
}

/**
 * Render the message list in chronological order. The oldest message
 * present at mount is treated as "history" for the typewriter (instant),
 * everything that arrives later animates. A 32 px gap separates message
 * pairs; every six pairs gets a hairline divider for breath.
 *
 * Auto-scroll: on each new message, scroll the page to the bottom so
 * the latest assistant turn lands inside the viewport. Pause-on-scroll-
 * up + new-messages pill ship in batch 4.
 */
export function Thread({ messages }: Props) {
  const isThinking = useChatStore((s) => s.isAssistantThinking)
  const isStreaming = useChatStore((s) => s.streamingMessage !== null)
  const { id } = useParams<{ id: string }>()
  const projectId = id ?? ''
  // Snapshot the set of message ids at mount so the typewriter renders
  // these rows as "history" (instant). useState's lazy initializer runs
  // exactly once on mount — replaces the previous read-and-write-ref-
  // during-render pattern that the React 19 Hooks plugin flags.
  const [initialIds] = useState<Set<string>>(() => new Set(messages.map((m) => m.id)))

  // Phase 7 Move 6 — smart auto-scroll: place the latest assistant
  // turn's spec-tag at viewport-top:90 instead of dumping the user
  // at the bottom of a long body. JumpToLatestFab (rendered inside
  // InputBar) owns the matching pause/jump UI independently.
  let latestAssistantId: string | null = null
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'assistant') {
      latestAssistantId = messages[i].id
      break
    }
  }
  useAutoScroll({ latestAssistantId, topOffset: 90 })

  // Phase 7 Move 4 — chapter detection. Map by startIdx for O(1)
  // lookup in the render loop. Index is 1-based so the divider's
  // Roman numeral reads naturally (I, II, III, …).
  const chapters = useMemo(() => detectChapters(messages), [messages])
  const chapterAt = useMemo(() => {
    const map = new Map<number, { chapter: (typeof chapters)[number]; index: number }>()
    chapters.forEach((c, i) => map.set(c.startIdx, { chapter: c, index: i + 1 }))
    return map
  }, [chapters])

  return (
    <ol className="flex flex-col gap-8">
      {messages.map((row, idx) => {
        const isHistory = initialIds.has(row.id)
        const chapterEntry = chapterAt.get(idx)
        const showDivider = idx > 0 && idx % 6 === 0 && !chapterEntry
        // Find the previous assistant message for match-cut detection.
        let previousSpecialist: string | null = null
        for (let j = idx - 1; j >= 0; j--) {
          if (messages[j].role === 'assistant' && messages[j].specialist) {
            previousSpecialist = messages[j].specialist
            break
          }
        }
        // Phase 3.1 #32 — the very first assistant message in the thread
        // becomes the View Transitions API target so the wizard's
        // transition-screen hairline morphs into its match-cut rule.
        const isFirstAssistant =
          row.role === 'assistant' &&
          !messages.slice(0, idx).some((m) => m.role === 'assistant')
        return (
          <li key={row.id} className="flex flex-col gap-8">
            {chapterEntry && (
              <ChapterDivider
                chapter={chapterEntry.chapter}
                index={chapterEntry.index}
              />
            )}
            {showDivider && (
              <span aria-hidden="true" className="block h-px bg-border-strong/30 my-2" />
            )}
            {row.role === 'user' && <MessageUser message={row} />}
            {row.role === 'assistant' && (
              <MessageAssistant
                message={row}
                isHistory={isHistory}
                previousSpecialist={previousSpecialist}
                isHandoffTarget={isFirstAssistant && !isHistory}
              />
            )}
            {row.role === 'system' && <MessageSystem message={row} />}
          </li>
        )
      })}
      {/* Phase 3.4 #52 — when streamingMessage is set, render the
       * streaming bubble in place of the ThinkingIndicator. The bubble
       * keeps the same shape as MessageAssistant so swap-to-persisted
       * at stream-complete is visually seamless. */}
      {isStreaming && (
        <li>
          <StreamingAssistantBubble />
        </li>
      )}
      {isThinking && !isStreaming && (
        <li>
          <ThinkingIndicator />
        </li>
      )}
      {!isThinking && !isStreaming && projectId && (
        <li>
          <CompletionInterstitial projectId={projectId} />
        </li>
      )}

      {/* Phase 4.1.6 — the jump-to-latest FAB used to live here (Phase
        * 3.7 #76 Patch A). Moved into <InputBar /> so it sits within
        * the same ~120 px footer zone as the Continue chip + send
        * button. See JumpToLatestFab.tsx. */}
    </ol>
  )
}
