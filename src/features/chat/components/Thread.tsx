import { useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { MessageUser } from './MessageUser'
import { MessageAssistant } from './MessageAssistant'
import { MessageSystem } from './MessageSystem'
import { ThinkingIndicator } from './ThinkingIndicator'
import { CompletionInterstitial } from './CompletionInterstitial'
import { useChatStore } from '@/stores/chatStore'
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
  const { id } = useParams<{ id: string }>()
  const projectId = id ?? ''
  const initialIdsRef = useRef<Set<string> | null>(null)

  // Snapshot the ids present at first render so subsequent messages
  // (the ones the user actually saw arrive) animate, while history
  // renders instantly.
  if (initialIdsRef.current === null) {
    initialIdsRef.current = new Set(messages.map((m) => m.id))
  }

  // Auto-scroll on message-count change — but not on first mount, which
  // already lands at the top of the freshly-rendered page.
  const lastCountRef = useRef(messages.length)
  useEffect(() => {
    if (messages.length > lastCountRef.current) {
      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: 'smooth',
      })
    }
    lastCountRef.current = messages.length
  }, [messages.length])

  return (
    <ol className="flex flex-col gap-8">
      {messages.map((m, idx) => {
        const isHistory = initialIdsRef.current?.has(m.id) ?? false
        const showDivider = idx > 0 && idx % 6 === 0
        return (
          <li key={m.id} className="flex flex-col gap-8">
            {showDivider && (
              <span aria-hidden="true" className="block h-px bg-border-strong/30 my-2" />
            )}
            {m.role === 'user' && <MessageUser message={m} />}
            {m.role === 'assistant' && (
              <MessageAssistant message={m} isHistory={isHistory} />
            )}
            {m.role === 'system' && <MessageSystem message={m} />}
          </li>
        )
      })}
      {isThinking && (
        <li>
          <ThinkingIndicator />
        </li>
      )}
      {!isThinking && projectId && (
        <li>
          <CompletionInterstitial projectId={projectId} />
        </li>
      )}
    </ol>
  )
}
