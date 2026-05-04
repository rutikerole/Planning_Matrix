// Phase 7 Chamber — ThinkingIndicator.
//
// Inline in the thread (NOT a separate band). Specialist sigil + italic
// label. The label rotates between the model's `thinking_label`
// hint (slot 0) and per-specialist generic actions every 2.8s with a
// 280ms cross-fade.
//
// Reduced-motion: sigil static, no fade — labels still rotate but
// instantly.

import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useReducedMotion } from 'framer-motion'
import { useChatStore } from '@/stores/chatStore'
import type { Specialist } from '@/types/projectState'
import { ChamberSigil } from '../../lib/specialistSigils'
import { cn } from '@/lib/utils'

const ROTATION_MS = 2800
const SWAP_MS = 280

const FALLBACK_LINES_DE: Record<Specialist, string[]> = {
  moderator: ['Das Team berät sich.'],
  planungsrecht: ['Planungsrecht prüft die Festsetzungen.'],
  bauordnungsrecht: ['Bauordnung prüft die Verfahrenspflicht.'],
  sonstige_vorgaben: ['Wir prüfen weitere Vorgaben.'],
  verfahren: ['Wir synthetisieren die Verfahren.'],
  beteiligte: ['Wir leiten Fachplaner ab.'],
  synthesizer: ['Wir verdichten die Erkenntnisse.'],
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

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!isThinking) {
      setIdx(0)
      setSwap(false)
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
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!isThinking) return null

  const specialistLabel = t(`chat.specialists.${specialist}`)
  const currentLine = lines[idx] ?? lines[0] ?? t('chat.thinking.staticLabel')

  return (
    <article
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={`${specialistLabel} — ${t('chat.thinking.staticLabel')}`}
      className="flex items-center gap-3 py-2"
    >
      <span
        className={reduced ? '' : 'chamber-sigil-active'}
        style={{ color: 'hsl(var(--clay))' }}
      >
        <ChamberSigil specialist={specialist} size={20} />
      </span>
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="font-mono text-[10.5px] tracking-[0.20em] uppercase text-clay leading-none">
          {specialistLabel}
        </span>
        <span
          className={cn(
            'font-serif italic text-[15px] text-ink/82 leading-snug',
            !reduced && 'transition-opacity duration-[280ms] ease-[cubic-bezier(0.16,1,0.3,1)]',
            !reduced && swap ? 'opacity-0' : 'opacity-100',
          )}
        >
          {currentLine}
          <span aria-hidden="true" className="inline-block ml-1">…</span>
        </span>
      </div>
    </article>
  )
}
