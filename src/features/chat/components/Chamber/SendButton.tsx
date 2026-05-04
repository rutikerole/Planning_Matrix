// Phase 7 Chamber — SendButton.
//
// Large dark filled circle. When a turn is in flight (chatStore has
// an active AbortController), the icon switches to a stop glyph and
// click calls abortStreaming().

import { ArrowUp, Square } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { useChatStore } from '@/stores/chatStore'

interface Props {
  disabled?: boolean
  isEmpty?: boolean
  onSend: () => void
}

export function SendButton({ disabled, isEmpty, onSend }: Props) {
  const { t } = useTranslation()
  const inFlight = useChatStore((s) => s.currentAbortController !== null)
  const abort = useChatStore((s) => s.abortStreaming)

  const sendLabel = t('chat.input.send', { defaultValue: 'Senden' })
  const stopLabel = t('chat.input.stop', { defaultValue: 'Antwort stoppen' })

  if (inFlight) {
    return (
      <button
        type="button"
        onClick={abort}
        aria-label={stopLabel}
        className={cn(
          'shrink-0 inline-flex items-center justify-center size-11 rounded-full',
          'bg-ink text-paper transition-transform duration-150',
          'hover:scale-105 motion-safe:active:scale-95',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper',
        )}
      >
        <Square aria-hidden="true" className="size-4 fill-current" />
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onSend}
      disabled={disabled || isEmpty}
      aria-label={sendLabel}
      className={cn(
        'shrink-0 inline-flex items-center justify-center size-11 rounded-full',
        'transition-[background-color,color,transform] duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper',
        disabled || isEmpty
          ? 'bg-ink/20 text-paper/60 cursor-not-allowed'
          : 'bg-ink text-paper hover:scale-105 motion-safe:active:scale-95',
      )}
    >
      <ArrowUp aria-hidden="true" className="size-5" />
    </button>
  )
}
