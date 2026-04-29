// ───────────────────────────────────────────────────────────────────────
// Phase 4.1.6 — JumpToLatestFab
//
// Was previously rendered inside Thread.tsx with `position: fixed`
// pinned to the right rail's edge — visually disconnected from the
// input bar. Moved to live INSIDE the input bar (absolute, top-right
// of the embedded shell) so it sits within the same ~120 px footer
// zone as the Continue chip and the send button. Owns its own
// scroll-distance detection so Thread no longer has to forward
// pause/resume.
// ───────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { m, AnimatePresence, useReducedMotion } from 'framer-motion'
import { ArrowDown } from 'lucide-react'

const SCROLLED_AWAY_THRESHOLD_PX = 100

export function JumpToLatestFab() {
  const { t } = useTranslation()
  const reduced = useReducedMotion()
  const [scrolledAway, setScrolledAway] = useState(false)

  useEffect(() => {
    const measure = () => {
      const distance =
        document.documentElement.scrollHeight -
        (window.scrollY + window.innerHeight)
      setScrolledAway(distance > SCROLLED_AWAY_THRESHOLD_PX)
    }
    measure()
    window.addEventListener('scroll', measure, { passive: true })
    window.addEventListener('resize', measure, { passive: true })
    return () => {
      window.removeEventListener('scroll', measure)
      window.removeEventListener('resize', measure)
    }
  }, [])

  const jumpToLatest = () => {
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: 'smooth',
    })
  }

  return (
    <AnimatePresence>
      {scrolledAway && (
        <m.div
          initial={reduced ? false : { opacity: 0, y: 8, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, y: 4, scale: 0.92 }}
          transition={{ duration: reduced ? 0 : 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="pointer-events-none absolute -top-12 right-0 z-10 flex justify-end"
        >
          <button
            type="button"
            onClick={jumpToLatest}
            aria-label={t('chat.jumpToLatest', {
              defaultValue: 'Zum neuesten Beitrag',
            })}
            title={t('chat.jumpToLatest', {
              defaultValue: 'Zum neuesten Beitrag',
            })}
            className="pointer-events-auto inline-flex items-center justify-center size-10 bg-paper border border-ink/85 rounded-full text-ink/85 shadow-[0_4px_16px_-4px_hsl(220_15%_11%/0.22)] hover:bg-ink hover:text-paper motion-safe:hover:scale-[1.05] transition-[background-color,color,transform] duration-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <ArrowDown aria-hidden="true" className="size-[16px]" />
          </button>
        </m.div>
      )}
    </AnimatePresence>
  )
}
