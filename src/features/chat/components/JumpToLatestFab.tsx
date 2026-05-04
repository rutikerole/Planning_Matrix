// ───────────────────────────────────────────────────────────────────────
// Phase 4.1.6 / Phase 7 Move 6 — JumpToLatestFab
//
// The "↓ N new" pill that surfaces when the user has scrolled away
// from the live edge. Phase 7 changes the threshold + jump target to
// match useAutoScroll's smart-scroll model:
//
//   • "live edge"     = latest spec-tag at viewport-top:90
//   • "scrolled away" = |spec-tag.top − 90| > 200 px
//   • jump target     = scroll the spec-tag back to viewport-top:90
//                       (not "scroll to bottom" any more)
//
// Counter: increments when latestAssistantId changes WHILE
// scrolledAway. Reset on click. Hidden when count is 0; visible
// otherwise next to the arrow.
//
// Falls back to the v1 "scroll to bottom" / "distance from bottom > 100"
// behaviour when no anchor id is available (initial render before any
// assistant turn lands), so the FAB still works on a fresh project.
// ───────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { m, AnimatePresence, useReducedMotion } from 'framer-motion'
import { ArrowDown } from 'lucide-react'

interface Props {
  /** id of the latest persisted assistant message; null = no anchor. */
  latestAssistantId?: string | null
}

const TOP_OFFSET = 90
const SCROLLED_AWAY_THRESHOLD_PX = 200
const FALLBACK_BOTTOM_THRESHOLD_PX = 100

export function JumpToLatestFab({ latestAssistantId = null }: Props) {
  const { t } = useTranslation()
  const reduced = useReducedMotion()
  const [scrolledAway, setScrolledAway] = useState(false)
  const [newCount, setNewCount] = useState(0)
  const lastSeenIdRef = useRef<string | null>(latestAssistantId)
  const scrolledAwayRef = useRef(false)

  // Sync ref so the new-turn-while-away effect reads the latest value
  // without becoming a render-cycle dependency.
  useEffect(() => {
    scrolledAwayRef.current = scrolledAway
  }, [scrolledAway])

  // Increment counter on new turn arrival while away. Don't increment
  // on first sighting (component just mounted) — only on transitions.
  useEffect(() => {
    const previous = lastSeenIdRef.current
    lastSeenIdRef.current = latestAssistantId
    if (!latestAssistantId || latestAssistantId === previous) return
    if (previous === null) return
    if (scrolledAwayRef.current) {
      setNewCount((c) => c + 1)
    }
  }, [latestAssistantId])

  // Measure scrolledAway. With an anchor: |spec-tag.top - 90| > 200.
  // Without: legacy "distance from bottom > 100".
  useEffect(() => {
    const measure = () => {
      if (latestAssistantId) {
        const tag = document.getElementById(`spec-tag-${latestAssistantId}`)
        if (!tag) {
          setScrolledAway(false)
          return
        }
        const rect = tag.getBoundingClientRect()
        const distance = Math.abs(rect.top - TOP_OFFSET)
        setScrolledAway(distance > SCROLLED_AWAY_THRESHOLD_PX)
        return
      }
      const distanceFromBottom =
        document.documentElement.scrollHeight -
        (window.scrollY + window.innerHeight)
      setScrolledAway(distanceFromBottom > FALLBACK_BOTTOM_THRESHOLD_PX)
    }
    measure()
    window.addEventListener('scroll', measure, { passive: true })
    window.addEventListener('resize', measure, { passive: true })
    return () => {
      window.removeEventListener('scroll', measure)
      window.removeEventListener('resize', measure)
    }
  }, [latestAssistantId])

  const jumpToLatest = () => {
    setNewCount(0)
    if (!latestAssistantId) {
      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: 'smooth',
      })
      return
    }
    const tag = document.getElementById(`spec-tag-${latestAssistantId}`)
    if (!tag) {
      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: 'smooth',
      })
      return
    }
    const rect = tag.getBoundingClientRect()
    const target = window.scrollY + rect.top - TOP_OFFSET
    window.scrollTo({ top: target, behavior: 'smooth' })
  }

  const ariaLabel =
    newCount > 0
      ? t('chat.jumpToLatest.newCount', {
          count: newCount,
          defaultValue:
            newCount === 1
              ? '1 neue Nachricht'
              : `${newCount} neue Nachrichten`,
        })
      : t('chat.jumpToLatest.label', { defaultValue: 'Zum neuesten Beitrag' })

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
            aria-label={ariaLabel}
            title={ariaLabel}
            className="pointer-events-auto inline-flex items-center justify-center gap-2 h-10 min-w-10 px-2.5 bg-paper border border-ink/85 rounded-full text-ink/85 shadow-[0_4px_16px_-4px_hsl(220_15%_11%/0.22)] hover:bg-ink hover:text-paper motion-safe:hover:scale-[1.05] transition-[background-color,color,transform] duration-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <ArrowDown aria-hidden="true" className="size-[16px]" />
            {newCount > 0 && (
              <span className="font-mono text-[10px] tracking-[0.06em] tabular-nums">
                {newCount}
              </span>
            )}
          </button>
        </m.div>
      )}
    </AnimatePresence>
  )
}
