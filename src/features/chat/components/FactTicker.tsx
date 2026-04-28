import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, m, useReducedMotion } from 'framer-motion'
import { useChatStore } from '@/stores/chatStore'
import { FACTS_BAYERN } from '@/data/factsBayern'

const IDLE_THRESHOLD_MS = 30_000
const FACT_HOLD_MS = 12_000

/**
 * Phase 3.4 #56 — Bavarian fact ticker for the right rail.
 *
 * Renders the "Wussten Sie?" eyebrow + a single educational fact
 * during idle stretches: no thinking, no recent activity, no
 * completion interstitial. A new fact is chosen every 12s without
 * within-session repeats; fades over 600ms (Framer Motion).
 *
 * Hidden when:
 *   • isAssistantThinking — the activity dot owns the rail
 *   • streamingMessage active — same
 *   • lastCompletionSignal !== 'continue' — interstitial owns the rail
 *   • turnCount === 0 — first turn, conversation hasn't started
 *
 * Reduced-motion: facts swap instantly, no fade.
 */
export function FactTicker() {
  const { i18n, t } = useTranslation()
  const reduced = useReducedMotion()
  const lang = (i18n.resolvedLanguage ?? 'de') as 'de' | 'en'
  const isThinking = useChatStore((s) => s.isAssistantThinking)
  const streaming = useChatStore((s) => s.streamingMessage !== null)
  const completion = useChatStore((s) => s.lastCompletionSignal)
  const turnCount = useChatStore((s) => s.turnCount)

  const seenIdsRef = useRef<Set<string>>(new Set())
  const [factIndex, setFactIndex] = useState<number | null>(null)
  const [idle, setIdle] = useState(false)

  // Idle detection — flip after IDLE_THRESHOLD_MS without thinking.
  // The early `setIdle(false)` calls reset state when external
  // streaming/thinking flags change. Linter flags this as cascading,
  // but it's the right shape — Zustand store is the source of truth.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (isThinking || streaming) {
      setIdle(false)
      return
    }
    if (completion !== null && completion !== 'continue') {
      setIdle(false)
      return
    }
    if (turnCount === 0) {
      setIdle(false)
      return
    }
    const timer = setTimeout(() => setIdle(true), IDLE_THRESHOLD_MS)
    return () => clearTimeout(timer)
  }, [isThinking, streaming, completion, turnCount])
  /* eslint-enable react-hooks/set-state-in-effect */

  // Pick a new fact when we go idle, then cycle every FACT_HOLD_MS.
  useEffect(() => {
    if (!idle) return
    const pickNext = () => {
      const seen = seenIdsRef.current
      // Reset the seen set when we've shown them all.
      if (seen.size >= FACTS_BAYERN.length) seen.clear()
      let next = Math.floor(Math.random() * FACTS_BAYERN.length)
      let guard = 0
      while (seen.has(FACTS_BAYERN[next].id) && guard < 50) {
        next = Math.floor(Math.random() * FACTS_BAYERN.length)
        guard++
      }
      seen.add(FACTS_BAYERN[next].id)
      setFactIndex(next)
    }
    pickNext()
    const cycle = setInterval(pickNext, FACT_HOLD_MS)
    return () => clearInterval(cycle)
  }, [idle])

  if (!idle || factIndex === null) return null
  const fact = FACTS_BAYERN[factIndex]

  return (
    <aside className="flex flex-col gap-2 border-t border-border/40 pt-6">
      <p className="text-[9px] font-medium uppercase tracking-[0.20em] text-clay/85">
        {t('chat.facts.eyebrow', {
          defaultValue: lang === 'en' ? 'Did you know?' : 'Wussten Sie?',
        })}
      </p>
      <div className="relative min-h-[3.5rem]">
        <AnimatePresence mode="wait">
          <m.p
            key={fact.id}
            initial={reduced ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: -4 }}
            transition={{ duration: reduced ? 0 : 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="font-serif italic text-[11px] text-ink/65 leading-relaxed"
          >
            {lang === 'en' ? fact.en : fact.de}
          </m.p>
        </AnimatePresence>
      </div>
    </aside>
  )
}
