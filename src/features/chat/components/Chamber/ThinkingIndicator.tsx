// Phase 7 Chamber — ThinkingIndicator.
//
// Inline in the thread (NOT a separate band). The visual register is
// "atelier at work": specialist sigil under a soft clay halo, mono
// caption with a live elapsed-time tick (proof of life so the user
// never wonders if it's frozen), italic action line that rotates with
// a Y-slide cross-fade, three sequenced clay dots in place of the
// static ellipsis, and a drafting hairline trace that sweeps under
// the label like a pencil stroke being drawn and erased.
//
// Reduced-motion: halo, dots, trace, slide all disabled. The label
// still rotates so semantically the same content lands; just instant.

import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useReducedMotion } from 'framer-motion'
import { useChatStore } from '@/stores/chatStore'
import type { Specialist } from '@/types/projectState'
import { ChamberSigil } from '../../lib/specialistSigils'
import { cn } from '@/lib/utils'

const ROTATION_MS = 2400
const SWAP_MS = 240

const FALLBACK_LINES_DE: Record<Specialist, string[]> = {
  moderator: ['Das Team berät sich.'],
  planungsrecht: ['Planungsrecht prüft die Festsetzungen.'],
  bauordnungsrecht: ['Bauordnung prüft die Verfahrenspflicht.'],
  sonstige_vorgaben: ['Wir prüfen weitere Vorgaben.'],
  verfahren: ['Wir synthetisieren die Verfahren.'],
  beteiligte: ['Wir leiten Fachplaner ab.'],
  synthesizer: ['Wir verdichten die Erkenntnisse.'],
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export function ThinkingIndicator() {
  const { t } = useTranslation()
  const reduced = useReducedMotion()
  const isThinking = useChatStore((s) => s.isAssistantThinking)
  const specialistRaw = useChatStore((s) => s.currentSpecialist)
  const seedLabel = useChatStore((s) => s.currentThinkingLabel)
  const specialist: Specialist = (specialistRaw ?? 'moderator') as Specialist

  const lines = useMemo<string[]>(() => {
    const fallback = FALLBACK_LINES_DE[specialist] ?? FALLBACK_LINES_DE.moderator
    const raw = t(`chat.thinking.actions.${specialist}`, {
      returnObjects: true,
      defaultValue: fallback,
    })
    const arr =
      Array.isArray(raw) && raw.every((x) => typeof x === 'string')
        ? (raw as string[])
        : fallback
    if (arr.length === 0) return fallback
    if (seedLabel && seedLabel.length > 0) return [seedLabel, ...arr.slice(1)]
    return arr
  }, [t, specialist, seedLabel])

  const [idx, setIdx] = useState(0)
  const [swap, setSwap] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const startedAtRef = useRef<number | null>(null)

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!isThinking) {
      setIdx(0)
      setSwap(false)
      setElapsed(0)
      startedAtRef.current = null
    } else if (startedAtRef.current === null) {
      startedAtRef.current = Date.now()
    }
  }, [isThinking])

  useEffect(() => {
    if (!isThinking || lines.length <= 1) return
    const id = window.setInterval(() => {
      if (reduced) {
        setIdx((i) => (i + 1) % lines.length)
        return
      }
      setSwap(true)
      window.setTimeout(() => {
        setIdx((i) => (i + 1) % lines.length)
        setSwap(false)
      }, SWAP_MS)
    }, ROTATION_MS)
    return () => window.clearInterval(id)
  }, [isThinking, lines.length, reduced])

  // Elapsed-time tick. Updates every 500ms while thinking; stops on idle.
  // Date.now() lives inside the interval (event-handler-equivalent) — never
  // called during render — so no react-hooks/purity issues.
  useEffect(() => {
    if (!isThinking) return
    const id = window.setInterval(() => {
      const startedAt = startedAtRef.current
      if (startedAt !== null) {
        setElapsed(Math.floor((Date.now() - startedAt) / 1000))
      }
    }, 500)
    return () => window.clearInterval(id)
  }, [isThinking])
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!isThinking) return null

  const specialistLabel = t(`chat.specialists.${specialist}`)
  const currentLine = lines[idx] ?? lines[0] ?? t('chat.thinking.staticLabel')
  const elapsedLabel = formatElapsed(elapsed)

  return (
    <article
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={`${specialistLabel} — ${t('chat.thinking.staticLabel')}`}
      className="flex items-start gap-3 py-2"
    >
      {/* Sigil under a pulsing clay halo */}
      <span
        className="relative flex h-7 w-7 shrink-0 items-center justify-center"
        style={{ color: 'hsl(var(--clay))' }}
      >
        {!reduced && (
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-full bg-clay/25 blur-[6px] animate-thinking-halo"
          />
        )}
        <span className={cn('relative', !reduced && 'chamber-sigil-active')}>
          <ChamberSigil specialist={specialist} size={20} />
        </span>
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {/* Specialist label + live elapsed-time tick */}
        <div className="flex items-baseline gap-2 leading-none">
          <span className="font-mono text-[10.5px] tracking-[0.20em] uppercase text-clay">
            {specialistLabel}
          </span>
          <span
            aria-hidden="true"
            className="font-mono text-[9.5px] tabular-nums tracking-wider text-ink/40"
          >
            {elapsedLabel}
          </span>
        </div>

        {/* Action line with three sequenced clay dots in place of the
            static ellipsis. The line slides up 4px on enter and down
            4px on exit, so each rotation feels arrived-at. */}
        <span
          className={cn(
            'font-serif italic text-[15px] text-ink/82 leading-snug',
            !reduced &&
              'transition-[opacity,transform] duration-[240ms] ease-[cubic-bezier(0.16,1,0.3,1)]',
            !reduced && swap
              ? 'opacity-0 translate-y-1'
              : 'opacity-100 translate-y-0',
          )}
        >
          {currentLine}
          <span
            aria-hidden="true"
            className="ml-1.5 inline-flex items-baseline gap-[3px]"
          >
            <span
              className={cn(
                'block h-1 w-1 rounded-full bg-clay/75',
                !reduced && 'animate-thinking-dot',
              )}
              style={{ animationDelay: '0s' }}
            />
            <span
              className={cn(
                'block h-1 w-1 rounded-full bg-clay/75',
                !reduced && 'animate-thinking-dot',
              )}
              style={{ animationDelay: '0.18s' }}
            />
            <span
              className={cn(
                'block h-1 w-1 rounded-full bg-clay/75',
                !reduced && 'animate-thinking-dot',
              )}
              style={{ animationDelay: '0.36s' }}
            />
          </span>
        </span>

        {/* Drafting hairline trace — sweeps left→right then erases
            right→left, like a pencil stroke being drawn. Disabled
            under reduced-motion. */}
        {!reduced && (
          <span
            aria-hidden="true"
            className="mt-0.5 block h-px w-28 overflow-hidden"
          >
            <span className="block h-full w-full bg-clay/45 animate-thinking-trace" />
          </span>
        )}
      </div>
    </article>
  )
}
