// ───────────────────────────────────────────────────────────────────────
// Phase 3.7 #76 — SendButton
// Phase 3.8 #83 — adds mobile-aware size + 44 × 44 hit-area enforcement
//
// Three visual states:
//   • idle      — ink-filled circle, paper ArrowUp, hover scale-105
//   • disabled  — ink/30 fill, no hover, cursor-not-allowed
//   • streaming — drafting-blue fill, paper Square; click aborts via
//                 chatStore.abortStreaming (Phase 3.7 wiring).
//
// Mobile: visual bumps 36 → 40 px; the rendering button itself is the
// hit area, so the chrome of the button reaches the WCAG 2.5.5 floor
// without a wrapper — added padding via min-w / min-h on the button
// itself when isMobile so the touch hit-area stays predictable.
// ───────────────────────────────────────────────────────────────────────

import { useTranslation } from 'react-i18next'
import { ArrowUp, Square } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useChatStore } from '@/stores/chatStore'
import { useViewport } from '@/lib/useViewport'

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
  const { isMobile } = useViewport()

  // Visual size: 36 px desktop, 40 px mobile. Hit area enforced via
  // min-w/min-h on mobile so the touch target reaches 44 px without
  // needing a wrapping element.
  const visualSize = isMobile ? 'size-10' : 'size-9'
  const hitArea = isMobile ? 'min-w-[44px] min-h-[44px]' : ''

  if (isStreaming || isThinking) {
    return (
      <button
        type="button"
        onClick={abortStreaming}
        aria-label={t('chat.input.stop', { defaultValue: 'Antwort stoppen' })}
        className={cn(
          'shrink-0 self-end inline-flex items-center justify-center mb-1 rounded-full transition-[background-color,transform] duration-soft ease-soft',
          visualSize,
          hitArea,
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
        'shrink-0 self-end inline-flex items-center justify-center mb-1 rounded-full transition-[background-color,opacity,transform] duration-soft ease-soft',
        visualSize,
        hitArea,
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
