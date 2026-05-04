// Phase 7 Chamber — single-column conversation.
//
// Sets per-message `--chamber-distance` from the latest assistant
// (or last message) so the CSS rule in globals.css fades older turns
// by distance. The magnetic-focus hook adds `data-focus="true"` to
// whichever message sits closest to the viewport-center band, which
// CSS uses to override the fade.
//
// Past turns rendered with isHistory=true so Typewriter renders
// instantly; future turns animate.

import { useEffect, useMemo, useState } from 'react'
import { useChatStore } from '@/stores/chatStore'
import type { MessageRow } from '@/types/db'
import { useMagneticFocus } from '../../hooks/useMagneticFocus'
import { useThreadController } from './ThreadContext'
import { defaultScrollToMessage } from './threadScrollHelpers'
import { MessageAssistant } from './MessageAssistant'
import { MessageUser } from './MessageUser'
import { MessageSystem } from './MessageSystem'
import { ThinkingIndicator } from './ThinkingIndicator'
import { StreamingAssistantBubble } from './StreamingAssistantBubble'

interface Props {
  messages: MessageRow[]
}

export function Thread({ messages }: Props) {
  const isThinking = useChatStore((s) => s.isAssistantThinking)
  const isStreaming = useChatStore((s) => s.streamingMessage !== null)

  // Snapshot the ids present at mount — those render as history (instant).
  const [initialIds] = useState<Set<string>>(
    () => new Set(messages.map((m) => m.id)),
  )

  // Find the index of the latest assistant message (or last index if none).
  const latestIdx = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant') return i
    }
    return Math.max(0, messages.length - 1)
  }, [messages])

  // Activate magnetic focus once we have any messages.
  useMagneticFocus()

  // Phase 7.5 — register a thread controller so the Spine can scroll
  // to a stage's first message via context. Uses the default DOM-scan
  // implementation; the magnetic-focus IO is untouched.
  const ctx = useThreadController()
  useEffect(() => {
    if (!ctx) return
    ctx.registerController({ scrollToMessage: defaultScrollToMessage })
    return () => ctx.registerController(null)
  }, [ctx])

  return (
    <ol
      data-chamber-thread="true"
      className="flex flex-col gap-10 md:gap-12"
    >
      {messages.map((row, idx) => {
        const distance = Math.max(0, latestIdx - idx)
        const isHistory = initialIds.has(row.id)
        // Find previous assistant for match-cut.
        let previousSpecialist: string | null = null
        for (let j = idx - 1; j >= 0; j--) {
          if (messages[j].role === 'assistant' && messages[j].specialist) {
            previousSpecialist = messages[j].specialist
            break
          }
        }
        return (
          <li
            key={row.id}
            data-chamber-message="true"
            data-chamber-active={distance === 0 ? 'true' : undefined}
            data-message-id={row.id}
            style={{ ['--chamber-distance' as string]: distance }}
          >
            {row.role === 'user' && <MessageUser message={row} />}
            {row.role === 'assistant' && (
              <MessageAssistant
                message={row}
                isHistory={isHistory}
                previousSpecialist={previousSpecialist}
                isActive={idx === latestIdx}
              />
            )}
            {row.role === 'system' && <MessageSystem message={row} />}
          </li>
        )
      })}

      {isStreaming && (
        <li data-chamber-message="true" style={{ ['--chamber-distance' as string]: 0 }}>
          <StreamingAssistantBubble />
        </li>
      )}
      {isThinking && !isStreaming && (
        <li data-chamber-message="true" style={{ ['--chamber-distance' as string]: 0 }}>
          <ThinkingIndicator />
        </li>
      )}
    </ol>
  )
}
