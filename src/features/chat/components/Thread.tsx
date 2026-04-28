import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { m, AnimatePresence, useReducedMotion } from 'framer-motion'
import { ArrowDown } from 'lucide-react'
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
  // Snapshot the set of message ids at mount so the typewriter renders
  // these rows as "history" (instant). useState's lazy initializer runs
  // exactly once on mount — replaces the previous read-and-write-ref-
  // during-render pattern that the React 19 Hooks plugin flags.
  const [initialIds] = useState<Set<string>>(() => new Set(messages.map((m) => m.id)))

  // Auto-scroll: drives the new-message pill via the paused flag.
  const { paused, resume } = useAutoScroll([messages.length, isThinking])

  return (
    <ol className="flex flex-col gap-8">
      {messages.map((row, idx) => {
        const isHistory = initialIds.has(row.id)
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

      {/* Phase 3.7 #76 (Patch A) — "Jump to latest" floating-action
        * button. Used to be a paper-tab pill in atelier register that
        * read as a label, not an action. Now a circular FAB:
        * paper bg + ink/85 border + ink ArrowDown + drop shadow.
        * Anchored bottom-right of the message column above the
        * unified footer. Aria-label localized. */}
      <AnimatePresence>
        {paused && (
          <m.li
            initial={reduced ? false : { opacity: 0, y: 8, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: 4, scale: 0.92 }}
            transition={{ duration: reduced ? 0 : 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="fixed right-6 bottom-[calc(180px+1rem)] sm:right-10 lg:right-[calc(360px+1rem)] z-30"
          >
            <button
              type="button"
              onClick={resume}
              aria-label={t('chat.jumpToLatest', {
                defaultValue: 'Zum neuesten Beitrag',
              })}
              title={t('chat.jumpToLatest', {
                defaultValue: 'Zum neuesten Beitrag',
              })}
              className="inline-flex items-center justify-center size-10 bg-paper border border-ink/85 rounded-full text-ink/85 shadow-[0_4px_16px_-4px_hsl(220_15%_11%/0.22)] hover:bg-ink hover:text-paper motion-safe:hover:scale-[1.05] transition-[background-color,color,transform] duration-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <ArrowDown aria-hidden="true" className="size-[16px]" />
            </button>
          </m.li>
        )}
      </AnimatePresence>
    </ol>
  )
}
