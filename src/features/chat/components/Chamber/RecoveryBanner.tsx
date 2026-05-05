import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { RotateCcw, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MessageRow } from '@/types/db'
import type { UserAnswer } from '@/types/chatTurn'

const ORPHAN_AFTER_MS = 60_000

interface Props {
  messages: MessageRow[] | undefined
  /** Active assistant streaming-bubble guard: when a stream is in
   *  flight we don't want the banner to appear briefly during normal
   *  in-flight turns. */
  isStreaming: boolean
  /** Phase 8.6 (B.3) — re-submit the orphaned user message with the
   *  same client_request_id so the Edge Function's idempotency replay
   *  detects the prior partial commit and either short-circuits with
   *  the cached assistant or re-calls Anthropic to produce one. */
  onRetry: (input: {
    userMessage: string
    userMessageEn?: string
    userAnswer: UserAnswer
    clientRequestId?: string
  }) => void
}

interface OrphanCandidate {
  message: MessageRow
  ageMs: number
}

function computeOrphan(
  messages: MessageRow[] | undefined,
  isStreaming: boolean,
): OrphanCandidate | null {
  if (!messages || messages.length === 0) return null
  if (isStreaming) return null
  const last = messages[messages.length - 1]
  if (last.role !== 'user') return null
  const ts = new Date(last.created_at).getTime()
  if (Number.isNaN(ts)) return null
  const ageMs = Date.now() - ts
  if (ageMs < ORPHAN_AFTER_MS) return null
  return { message: last, ageMs }
}

/**
 * Phase 8.6 (B.3) — RecoveryBanner.
 *
 * Detects "last turn didn't complete" — the chat workspace mounts and
 * finds the most recent user message has no following assistant message
 * within ORPHAN_AFTER_MS. This happens when a network failure between
 * Anthropic completion and DB commit interrupts the turn, or when the
 * tab is closed mid-flight.
 *
 * Idempotent retry: clicking Retry re-submits the same user message
 * with the SAME clientRequestId. The Edge Function's
 * insertUserMessageOrFetchExisting detects the existing user row and
 * the commit_chat_turn idempotency-replay (Phase 8.6 commit 4) detects
 * any cached assistant — so retries are always safe, never duplicate.
 *
 * Dismissal: a Close button hides the banner for the session. The
 * banner re-evaluates on every messages cache update so transient
 * disappearances (banner shown → retry clicked → assistant arrives)
 * resolve naturally.
 */
export function RecoveryBanner({ messages, isStreaming, onRetry }: Props) {
  const { t } = useTranslation()
  const [dismissed, setDismissed] = useState(false)
  // Tick once a second so age-based detection resolves itself when
  // the page is left open across the threshold.
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (dismissed) return
    const id = window.setInterval(() => setTick((n) => n + 1), 1000)
    return () => window.clearInterval(id)
  }, [dismissed])

  // Direct render-time derivation. The `tick` state above causes a
  // re-render every second so wall-clock-based `Date.now()` checks
  // resolve naturally; a useMemo here would trip React 19's
  // react-hooks/purity rule for the impure Date.now() call.
  void tick
  const orphan = computeOrphan(messages, isStreaming)

  if (dismissed || !orphan) return null

  const handleRetry = () => {
    const userMessage = orphan.message.content_de
    const userMessageEn = orphan.message.content_en ?? undefined
    const userAnswer = (orphan.message.user_answer as UserAnswer | null) ?? {
      kind: 'text' as const,
      text: userMessage,
    }
    const clientRequestId = orphan.message.client_request_id ?? undefined
    onRetry({ userMessage, userMessageEn, userAnswer, clientRequestId })
    setDismissed(true)
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'mx-auto my-3 max-w-2xl flex items-start gap-3 px-4 py-3',
        'bg-paper-card border border-clay/40 rounded-[8px]',
        'text-[13px] leading-snug text-ink',
      )}
      data-no-print="true"
    >
      <RotateCcw aria-hidden="true" className="size-4 text-clay/85 mt-0.5 shrink-0" />
      <div className="flex-1 flex flex-col gap-1.5">
        <p className="font-medium">
          {t('chat.recovery.title', { defaultValue: 'Letzte Anfrage nicht abgeschlossen' })}
        </p>
        <p className="text-clay/85 italic font-serif text-[12px] leading-snug">
          {t('chat.recovery.body', {
            defaultValue:
              'Die letzte Nachricht wurde gesendet, aber das Planungsteam hat nicht geantwortet. Erneut versuchen?',
          })}
        </p>
        <div className="flex items-center gap-3 mt-1">
          <button
            type="button"
            onClick={handleRetry}
            className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-[12px] font-medium bg-ink text-paper hover:bg-ink/92 transition-colors duration-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper-card"
          >
            <RotateCcw aria-hidden="true" className="size-3" />
            {t('chat.recovery.retry', { defaultValue: 'Erneut versuchen' })}
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="text-[11.5px] italic text-clay/85 hover:text-ink underline underline-offset-4 decoration-clay/55 transition-colors duration-soft"
          >
            {t('chat.recovery.dismiss', { defaultValue: 'Ausblenden' })}
          </button>
        </div>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label={t('chat.recovery.close', { defaultValue: 'Schließen' })}
        className="size-6 inline-flex items-center justify-center rounded-full text-ink/45 hover:text-ink hover:bg-ink/[0.06] transition-colors duration-soft"
      >
        <X aria-hidden="true" className="size-3" />
      </button>
    </div>
  )
}
