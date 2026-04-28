import { useTranslation } from 'react-i18next'
import { useReducedMotion } from 'framer-motion'
import { useChatStore } from '@/stores/chatStore'
import type { Specialist } from '@/types/projectState'
import type { MessageRow } from '@/types/db'

/**
 * Phase 3.4 #58 — left-rail conversation map.
 *
 * Per Q7 override: 7 circles, one per specialist. Roman numerals
 * I–VII above each. Filled clay if visited (≥ 1 assistant turn from
 * that specialist), drafting-blue ring if currently speaking,
 * hairline outline otherwise. Hairline connectors between circles.
 * "Hier" label below the current circle in italic clay.
 *
 * Click a visited circle → smooth-scroll the chat thread to the
 * first message attributed to that specialist. Reduced-motion:
 * instant scroll.
 */

const GATES: Array<{ specialist: Specialist; numeral: string }> = [
  { specialist: 'moderator', numeral: 'I' },
  { specialist: 'planungsrecht', numeral: 'II' },
  { specialist: 'bauordnungsrecht', numeral: 'III' },
  { specialist: 'sonstige_vorgaben', numeral: 'IV' },
  { specialist: 'verfahren', numeral: 'V' },
  { specialist: 'beteiligte', numeral: 'VI' },
  { specialist: 'synthesizer', numeral: 'VII' },
]

interface Props {
  messages: MessageRow[]
}

export function VerlaufMap({ messages }: Props) {
  const { t } = useTranslation()
  const reduced = useReducedMotion()
  const currentSpecialist = useChatStore((s) => s.currentSpecialist)

  // Compute visited specialists from message history.
  const visited = new Set<Specialist>()
  for (const m of messages) {
    if (m.role === 'assistant' && m.specialist) {
      visited.add(m.specialist as Specialist)
    }
  }

  const handleNavigate = (specialist: Specialist) => {
    const target = messages.find(
      (m) => m.role === 'assistant' && m.specialist === specialist,
    )
    if (!target) return
    const el = document.querySelector(`[data-message-id="${target.id}"]`)
    if (!el) return
    el.scrollIntoView({
      behavior: reduced ? 'auto' : 'smooth',
      block: 'start',
    })
  }

  // Find current index for the "Hier" label.
  const currentIdx = currentSpecialist
    ? GATES.findIndex((g) => g.specialist === currentSpecialist)
    : -1

  return (
    <div className="flex flex-col gap-3 border-t border-border/40 pt-6">
      <p className="eyebrow text-foreground/60 text-[11px]">
        {t('chat.verlauf.eyebrow', { defaultValue: 'Verlauf' })}
      </p>

      {/* The map: 7 circles in a row */}
      <div className="relative">
        {/* Roman numerals row */}
        <ul className="flex items-end justify-between gap-px mb-2 px-1">
          {GATES.map((gate) => {
            const isCurrent = gate.specialist === currentSpecialist
            return (
              <li key={gate.specialist} className="flex-1 text-center">
                <span
                  className={`block font-serif italic text-[9px] tabular-figures leading-none transition-colors duration-soft ${
                    isCurrent ? 'text-clay-deep' : 'text-clay-deep/45'
                  }`}
                >
                  {gate.numeral}
                </span>
              </li>
            )
          })}
        </ul>

        {/* Connector + circles row */}
        <ol
          aria-label={t('chat.verlauf.eyebrow', { defaultValue: 'Verlauf' })}
          className="flex items-center justify-between gap-px relative"
        >
          {/* Hairline connector underneath */}
          <span
            aria-hidden="true"
            className="absolute left-2 right-2 top-1/2 h-px bg-ink/20 -translate-y-px"
          />
          {GATES.map((gate) => {
            const isVisited = visited.has(gate.specialist)
            const isCurrent = gate.specialist === currentSpecialist
            return (
              <li key={gate.specialist} className="flex-1 flex justify-center relative z-10">
                <button
                  type="button"
                  onClick={() => isVisited && handleNavigate(gate.specialist)}
                  disabled={!isVisited}
                  aria-label={`${gate.numeral} — ${t(`chat.specialists.${gate.specialist}`)}`}
                  className={
                    'relative size-2.5 rounded-full transition-colors duration-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background ' +
                    (isCurrent
                      ? 'bg-paper border-2 border-drafting-blue/70'
                      : isVisited
                        ? 'bg-clay border border-clay'
                        : 'bg-paper border border-ink/30')
                  }
                />
              </li>
            )
          })}
        </ol>

        {/* "Hier" label below the current circle */}
        {currentIdx >= 0 && (
          <div
            className="relative mt-1.5 text-center"
            aria-hidden="true"
            style={{
              paddingLeft: `${(currentIdx / (GATES.length - 1)) * 100}%`,
            }}
          >
            <span
              className="font-serif italic text-[11px] text-clay leading-none -ml-2 inline-block"
              style={{
                transition: reduced ? 'none' : 'padding-left 320ms cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              {t('chat.verlauf.here', { defaultValue: 'Hier' })}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
