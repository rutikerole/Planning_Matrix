import { useTranslation } from 'react-i18next'
import type { MessageRow } from '@/types/db'
import { SpecialistSigil } from '@/features/chat/components/SpecialistSigils'

interface Props {
  messages: MessageRow[]
}

/**
 * Phase 3.5 #64 — Section X: Appendix · die Beratung.
 *
 * Renders the entire conversation in a compact, print-friendly format
 * inside a `<details>` element collapsed by default. Each turn:
 *   • Assistant — left-aligned, specialist sigil + role tag (small),
 *     compact body in Inter 13.
 *   • User — right-aligned smaller card, Inter 13 ink.
 *   • System — italic clay aside.
 * Specialist handoffs marked with a hairline rule above the new
 * voice's first turn.
 *
 * Cmd+F on the open appendix is the search affordance — no custom
 * filter UI is needed.
 */
export function ConversationAppendix({ messages }: Props) {
  const { t, i18n } = useTranslation()
  const lang = (i18n.resolvedLanguage ?? 'de') as 'de' | 'en'

  if (messages.length === 0) return null

  const turnCount = messages.filter((m) => m.role === 'assistant').length
  const sessionStartIso = messages[0].created_at
  const sessionEndIso = messages[messages.length - 1].created_at
  const elapsedMin = Math.max(
    1,
    Math.round(
      (new Date(sessionEndIso).getTime() - new Date(sessionStartIso).getTime()) /
        60_000,
    ),
  )

  return (
    <section
      id="sec-appendix"
      className="px-6 sm:px-12 lg:px-20 py-20 sm:py-24 max-w-3xl mx-auto w-full scroll-mt-16 flex flex-col gap-6"
    >
      <header className="flex items-baseline gap-4">
        <span className="font-serif italic text-[20px] text-clay-deep tabular-figures leading-none w-10 shrink-0">
          X
        </span>
        <span className="text-[11px] uppercase tracking-[0.22em] font-medium text-foreground/65">
          {t('result.appendix.eyebrow', {
            defaultValue: 'Appendix · die Beratung',
          })}
        </span>
      </header>

      <span aria-hidden="true" className="block h-px w-12 bg-ink/20" />

      <details className="group">
        <summary className="cursor-pointer list-none inline-flex items-center gap-2 font-serif italic text-[14px] text-clay/85 hover:text-ink">
          <span aria-hidden="true" className="text-clay-deep">
            ⌃
          </span>
          {t('result.appendix.summary', {
            defaultValue: '{{n}} Wendungen über {{m}} Minuten',
            n: turnCount,
            m: elapsedMin,
          })}
          <span aria-hidden="true" className="text-[12px] text-ink/55 group-open:hidden ml-1">
            {t('result.appendix.expand', { defaultValue: 'Beratungsverlauf öffnen ▼' })}
          </span>
          <span aria-hidden="true" className="text-[12px] text-ink/55 hidden group-open:inline ml-1">
            {t('result.appendix.collapse', { defaultValue: 'einklappen ▲' })}
          </span>
        </summary>

        <ol className="mt-6 flex flex-col gap-4">
          {messages.map((msg, idx) => {
            const previous = idx > 0 ? messages[idx - 1] : null
            const handoff =
              msg.role === 'assistant' &&
              !!msg.specialist &&
              previous?.role === 'assistant' &&
              previous.specialist !== msg.specialist
            return (
              <li
                key={msg.id}
                className={
                  'flex flex-col gap-2 ' + (handoff ? 'pt-4 border-t border-ink/12' : '')
                }
              >
                {msg.role === 'assistant' && <AssistantTurn message={msg} lang={lang} t={t} />}
                {msg.role === 'user' && <UserTurn message={msg} lang={lang} />}
                {msg.role === 'system' && <SystemTurn message={msg} lang={lang} />}
              </li>
            )
          })}
        </ol>
      </details>
    </section>
  )
}

function AssistantTurn({
  message,
  lang,
  t,
}: {
  message: MessageRow
  lang: 'de' | 'en'
  t: (k: string, opts?: Record<string, unknown>) => string
}) {
  const text = lang === 'en' && message.content_en ? message.content_en : message.content_de
  const specialist = message.specialist ?? 'moderator'
  const time = formatTime(message.created_at, lang)
  return (
    <article className="flex flex-col gap-1.5 max-w-[85%]">
      <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.20em] text-clay leading-none">
        <SpecialistSigil specialist={specialist} />
        <span>{t(`chat.specialists.${specialist}`)}</span>
        <span aria-hidden="true" className="text-ink/30 mx-1">·</span>
        <span className="font-serif italic text-clay-deep tabular-figures normal-case tracking-normal">
          {time}
        </span>
      </div>
      <p className="text-[13px] text-ink/85 leading-[1.65]">{text}</p>
    </article>
  )
}

function UserTurn({ message, lang }: { message: MessageRow; lang: 'de' | 'en' }) {
  const time = formatTime(message.created_at, lang)
  return (
    <article className="flex justify-end">
      <div className="max-w-[80%] bg-paper border border-ink/12 rounded-[2px] px-4 py-2.5 flex flex-col gap-1">
        <p className="text-[11px] font-medium uppercase tracking-[0.20em] text-clay/85 leading-none">
          {lang === 'en' ? 'Owner' : 'Bauherr'}
          <span aria-hidden="true" className="text-ink/30 mx-1.5">·</span>
          <span className="font-serif italic text-clay-deep tabular-figures normal-case tracking-normal">
            {time}
          </span>
        </p>
        <p className="text-[13px] text-ink leading-[1.6] whitespace-pre-wrap break-words">
          {message.content_de}
        </p>
      </div>
    </article>
  )
}

function SystemTurn({ message, lang }: { message: MessageRow; lang: 'de' | 'en' }) {
  const text = lang === 'en' && message.content_en ? message.content_en : message.content_de
  return (
    <p className="font-serif italic text-[12px] text-clay/85 border-l border-clay/35 pl-3 leading-relaxed">
      {text}
    </p>
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
