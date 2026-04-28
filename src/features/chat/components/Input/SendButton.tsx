// ───────────────────────────────────────────────────────────────────────
// Phase 3.7 #76 — SendButton
//
// Extracted from InputBar so the visual identity has its own home.
// Three states:
//   • idle      — ink-filled circle, paper ArrowUp icon, hover scale-105
//   • disabled  — ink/30 fill, no hover, cursor-not-allowed
//   • streaming — drafting-blue fill, paper Square icon (Q2 locked: wire
//                 to abort the in-flight request via chatStore's
//                 currentAbortController)
// ───────────────────────────────────────────────────────────────────────

import { useTranslation } from 'react-i18next'
import { ArrowUp, Square } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useChatStore } from '@/stores/chatStore'

interface Props {
  /** True when textarea is empty AND no attachments AND no active suggestion. */
  isEmpty: boolean
  /** Hardcoded force-disable (e.g. session lost). */
  disabled?: boolean
  onSend: () => void
}

export function SendButton({ isEmpty, disabled, onSend }: Props) {
  const { t } = useTranslation()
  const isStreaming = useChatStore((s) => s.streamingMessage !== null)
  const isThinking = useChatStore((s) => s.isAssistantThinking)
  const abortStreaming = useChatStore((s) => s.abortStreaming)

  // Streaming state takes precedence over disabled/empty — clicking
  // mid-stream aborts the request.
  if (isStreaming || isThinking) {
    return (
      <button
        type="button"
        onClick={abortStreaming}
        aria-label={t('chat.input.stop', { defaultValue: 'Antwort stoppen' })}
        className={cn(
          'shrink-0 self-end inline-flex items-center justify-center size-9 mb-1 rounded-full transition-[background-color,transform] duration-soft ease-soft',
          'bg-drafting-blue text-paper hover:bg-drafting-blue/92',
          'motion-safe:hover:scale-[1.05] motion-safe:active:scale-[0.96]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-drafting-blue focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        )}
      >
        <Square aria-hidden="true" className="size-[14px] fill-current" />
      </button>
    )
  }

  const inert = disabled || isEmpty
  return (
    <button
      type="button"
      onClick={onSend}
      disabled={inert}
      aria-label={t('chat.input.send')}
      className={cn(
        'shrink-0 self-end inline-flex items-center justify-center size-9 mb-1 rounded-full transition-[background-color,opacity,transform] duration-soft ease-soft',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        inert
          ? 'bg-ink/30 text-paper/85 cursor-not-allowed'
          : 'bg-ink text-paper hover:bg-ink/92 motion-safe:hover:scale-[1.05] motion-safe:active:scale-[0.96]',
      )}
    >
      <ArrowUp aria-hidden="true" className="size-[18px]" />
    </button>
  )
}
