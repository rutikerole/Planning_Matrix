import { useRef } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { m, AnimatePresence, useReducedMotion } from 'framer-motion'
import { MessageUser } from './MessageUser'
import { MessageAssistant } from './MessageAssistant'
import { MessageSystem } from './MessageSystem'
import { ThinkingIndicator } from './ThinkingIndicator'
import { StreamingAssistantBubble } from './StreamingAssistantBubble'
import { CompletionInterstitial } from './CompletionInterstitial'
import { useChatStore } from '@/stores/chatStore'
import { useAutoScroll } from '../hooks/useAutoScroll'
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
  const { t } = useTranslation()
  const reduced = useReducedMotion()
  const isThinking = useChatStore((s) => s.isAssistantThinking)
  const isStreaming = useChatStore((s) => s.streamingMessage !== null)
  const { id } = useParams<{ id: string }>()
  const projectId = id ?? ''
  const initialIdsRef = useRef<Set<string> | null>(null)

  if (initialIdsRef.current === null) {
    initialIdsRef.current = new Set(messages.map((m) => m.id))
  }

  // Auto-scroll: drives the new-message pill via the paused flag.
  const { paused, resume } = useAutoScroll([messages.length, isThinking])

  return (
    <ol className="flex flex-col gap-8">
      {messages.map((row, idx) => {
        const isHistory = initialIdsRef.current?.has(row.id) ?? false
        const showDivider = idx > 0 && idx % 6 === 0
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

      {/* New-message pill — appears when auto-scroll has paused and a
       * new turn lands. Click resumes scrolling to the latest. */}
      <AnimatePresence>
        {paused && (
          <m.li
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: 4 }}
            transition={{ duration: reduced ? 0 : 0.2 }}
            className="fixed bottom-28 left-1/2 -translate-x-1/2 z-30"
          >
            <button
              type="button"
              onClick={resume}
              className="text-[11px] text-clay bg-paper border border-border-strong/55 rounded-sm px-3 py-1.5 shadow-[0_4px_16px_-4px_hsl(220_15%_11%/0.18)] hover:bg-muted/40 transition-colors duration-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {t('chat.newMessagePill')}
            </button>
          </m.li>
        )}
      </AnimatePresence>
    </ol>
  )
}
