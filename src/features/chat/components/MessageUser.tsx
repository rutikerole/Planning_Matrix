import { useTranslation } from 'react-i18next'
import type { MessageRow } from '@/types/db'
import { MessageAttachment } from './MessageAttachment'

interface Props {
  message: MessageRow
}

/**
 * Phase 3.2 #39 — user message as a bordered paper card with a tabbed
 * corner.
 *
 * Right-aligned, ~70% column width. The card itself is bg-paper with
 * a 1px ink/15 hairline border and rounded-sm corners. A 12×12 SVG
 * fold-mark sits in the top-LEFT corner of the card (the page-corner
 * fold) — drafting-blue stroke + a 1px shadow-line behind to suggest
 * the underlying sheet. Inside the card a tiny BAUHERR eyebrow
 * (Inter 9 tracking-0.22em uppercase clay/85) sits flush-left, the
 * body Inter 15 ink leading 1.55, and a timestamp Instrument Serif
 * italic 10 clay/65 prints flush-right at the bottom.
 *
 * Reads as the client's note clipped to the dossier — a piece of
 * folded correspondence, not a chat bubble.
 */
export function MessageUser({ message }: Props) {
  const { t, i18n } = useTranslation()
  const lang = (i18n.resolvedLanguage ?? 'de') as 'de' | 'en'
  const time = formatTime(message.created_at, lang)

  return (
    <div className="flex justify-end">
      <article className="relative w-[min(70%,520px)] bg-paper border border-ink/15 rounded-sm pl-7 pr-5 py-4 flex flex-col gap-1.5 shadow-[0_1px_0_rgba(20,15,8,0.04)]">
        {/* Folded-corner mark — top-left */}
        <FoldMark />

        {/* Bauherr eyebrow */}
        <p className="text-[9px] font-medium uppercase tracking-[0.22em] text-clay/85 leading-none">
          {t('chat.user.bauherrTag', { defaultValue: 'Bauherr' })}
        </p>

        {/* Body */}
        <p className="text-[15px] text-ink leading-[1.55] whitespace-pre-wrap break-words">
          {message.content_de}
        </p>

        {/* Phase 3.6 #68 — attachments inline below the body. Skip
          * for optimistic placeholder messages (id starts with
          * "pending-") since the row hasn't been persisted yet. */}
        {!message.id.startsWith('pending-') && (
          <MessageAttachment messageId={message.id} />
        )}

        {/* Timestamp — italic Serif clay, right-aligned */}
        <p className="font-serif italic text-[10px] text-clay/65 tabular-figures self-end leading-none mt-1.5">
          {time}
        </p>
      </article>
    </div>
  )
}

/** 12×12 page-corner fold mark — drafting-blue, with a soft shadow-line. */
function FoldMark() {
  return (
    <span aria-hidden="true" className="absolute -top-px -left-px w-3 h-3 pointer-events-none">
      <svg
        viewBox="0 0 12 12"
        className="w-full h-full"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Soft shadow-line behind the fold */}
        <path
          d="M 0.5 12 L 12 0.5"
          stroke="hsl(220 16% 11% / 0.18)"
          strokeWidth="0.6"
        />
        {/* Folded triangle — paper flap */}
        <path
          d="M 0 0 L 12 0 L 0 12 Z"
          fill="hsl(36 28% 95%)"
          stroke="none"
        />
        {/* Fold edge — drafting-blue */}
        <path
          d="M 0 12 L 12 0"
          stroke="hsl(212 38% 32% / 0.55)"
          strokeWidth="0.9"
        />
        {/* Top + left frame edges (continuation of card border) */}
        <path
          d="M 0 0 L 12 0"
          stroke="hsl(220 16% 11% / 0.15)"
          strokeWidth="0.7"
        />
        <path
          d="M 0 0 L 0 12"
          stroke="hsl(220 16% 11% / 0.15)"
          strokeWidth="0.7"
        />
      </svg>
    </span>
  )
}

function formatTime(iso: string, lang: 'de' | 'en'): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString(lang === 'en' ? 'en-GB' : 'de-DE', {
    hour: '2-digit',
    minute: '2-digit',
  })
}
