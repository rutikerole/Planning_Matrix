// Phase 7 Chamber — CapturedToast.
//
// Tiny micro-toast that slides in from the top-right when a new fact
// is captured. Auto-dismisses in 3.2s. Skippable via click.
// Multiple captures within the window stack briefly; we cap at 3
// visible at once and elide the rest.

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, m, useReducedMotion } from 'framer-motion'
import { factLabel } from '@/lib/factLabel'
import type { Fact } from '@/types/projectState'

interface ToastEntry {
  id: string
  label: string
}

interface Props {
  /** Fact list as it stood after the most recent assistant turn.
   *  Compared against the previous render to detect new keys. */
  facts: Fact[]
  lang: 'de' | 'en'
}

const TOAST_TTL = 3200
const MAX_STACK = 3

export function CapturedToast({ facts, lang }: Props) {
  const { t } = useTranslation()
  const reduced = useReducedMotion()
  const [stack, setStack] = useState<ToastEntry[]>([])
  const [seen, setSeen] = useState<Set<string>>(() => new Set(facts.map((f) => f.key)))

  // Detect newly-arriving fact keys and push them into the stack.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const fresh: ToastEntry[] = []
    const nextSeen = new Set(seen)
    for (const f of facts) {
      if (!nextSeen.has(f.key)) {
        nextSeen.add(f.key)
        const { label } = factLabel(f.key, lang)
        fresh.push({
          id: `${f.key}-${Date.now()}`,
          label: t('chat.chamber.capturedToast', { label }),
        })
      }
    }
    if (fresh.length === 0) return
    setSeen(nextSeen)
    setStack((prev) => [...prev, ...fresh].slice(-MAX_STACK))
  }, [facts, lang, t, seen])
  /* eslint-enable react-hooks/set-state-in-effect */

  // Auto-dismiss after TTL.
  useEffect(() => {
    if (stack.length === 0) return
    const timers = stack.map((entry) =>
      window.setTimeout(() => {
        setStack((prev) => prev.filter((e) => e.id !== entry.id))
      }, TOAST_TTL),
    )
    return () => timers.forEach(window.clearTimeout)
  }, [stack])

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-[64px] right-4 z-40 flex flex-col gap-2 pointer-events-none"
    >
      <AnimatePresence>
        {stack.map((entry) => (
          <m.div
            key={entry.id}
            initial={reduced ? false : { opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, x: 24 }}
            transition={{ duration: reduced ? 0 : 0.28, ease: [0.16, 1, 0.3, 1] }}
            onClick={() =>
              setStack((prev) => prev.filter((e) => e.id !== entry.id))
            }
            className="pointer-events-auto cursor-pointer max-w-[260px] bg-paper border border-[var(--hairline-strong)] rounded-md px-3.5 py-2"
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-clay leading-none mb-1">
              ✓
            </p>
            <p className="font-serif italic text-[12.5px] text-ink leading-snug">
              {entry.label}
            </p>
          </m.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
