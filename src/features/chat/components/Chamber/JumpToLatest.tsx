// Phase 7 Chamber — JumpToLatest.
//
// Calm pill that surfaces above the input bar when the user has
// scrolled away from the latest assistant message. Click → smooth-
// scroll the spec-tag back to viewport-top:90 (matching useAutoScroll
// in the chat-page wiring).

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowDown } from 'lucide-react'
import { AnimatePresence, m, useReducedMotion } from 'framer-motion'
import { useChamberMainRef } from './ChamberLayout'

interface Props {
  /** id of the latest assistant message; null = no anchor. */
  latestAssistantId: string | null
}

const TOP_OFFSET = 90
const AWAY_THRESHOLD = 200

export function JumpToLatest({ latestAssistantId }: Props) {
  const { t } = useTranslation()
  const reduced = useReducedMotion()
  const mainRefHolder = useChamberMainRef()
  const [scrolledAway, setScrolledAway] = useState(false)
  const [newCount, setNewCount] = useState(0)
  const lastSeen = useRef<string | null>(latestAssistantId)
  const awayRef = useRef(false)

  useEffect(() => {
    awayRef.current = scrolledAway
  }, [scrolledAway])

  // Increment new-count on arrival while scrolled away.
  useEffect(() => {
    const prev = lastSeen.current
    lastSeen.current = latestAssistantId
    if (!latestAssistantId || latestAssistantId === prev || prev === null) return
    if (awayRef.current) setNewCount((c) => c + 1)
  }, [latestAssistantId])

  // Measure scroll-away. Phase 7.6 §1.6: the conversation column owns
  // its own scroll context (chamber-main), so we read scroll position
  // off that element instead of window.scrollY.
  useEffect(() => {
    const main = mainRefHolder?.current
    if (!main) return
    const measure = () => {
      if (!latestAssistantId) {
        setScrolledAway(false)
        return
      }
      const el = document.getElementById(`spec-tag-${latestAssistantId}`)
      if (!el) {
        setScrolledAway(false)
        return
      }
      const rect = el.getBoundingClientRect()
      const mainRect = main.getBoundingClientRect()
      const dist = Math.abs(rect.top - mainRect.top - TOP_OFFSET)
      setScrolledAway(dist > AWAY_THRESHOLD)
    }
    measure()
    main.addEventListener('scroll', measure, { passive: true })
    window.addEventListener('resize', measure, { passive: true })
    return () => {
      main.removeEventListener('scroll', measure)
      window.removeEventListener('resize', measure)
    }
  }, [latestAssistantId, mainRefHolder])

  const onJump = () => {
    setNewCount(0)
    const main = mainRefHolder?.current
    if (!main) return
    if (!latestAssistantId) {
      main.scrollTo({ top: main.scrollHeight, behavior: 'smooth' })
      return
    }
    const el = document.getElementById(`spec-tag-${latestAssistantId}`)
    if (!el) {
      main.scrollTo({ top: main.scrollHeight, behavior: 'smooth' })
      return
    }
    const rect = el.getBoundingClientRect()
    const mainRect = main.getBoundingClientRect()
    main.scrollTo({
      top: main.scrollTop + (rect.top - mainRect.top) - TOP_OFFSET,
      behavior: 'smooth',
    })
  }

  const label =
    newCount > 0
      ? `${newCount} · ${t('chat.chamber.jumpToLatest')}`
      : t('chat.chamber.jumpToLatest')

  return (
    <AnimatePresence>
      {scrolledAway && (
        <m.div
          initial={reduced ? false : { opacity: 0, y: 8, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, y: 4, scale: 0.92 }}
          transition={{ duration: reduced ? 0 : 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="pointer-events-none absolute -top-12 left-1/2 -translate-x-1/2 z-10"
        >
          {/* Phase 7.7 §1.8 — pill, not a circle. The previous round
            * gray button read as a loading spinner.
            * Phase 7.10 — bigger pill: h-7 → h-9, text 11.5 → 13 px,
            * px-3.5 → px-5, icon 12 → 14 px. Sits 48 px above the
            * input pill (was 36 px) for breathing room. */}
          <button
            type="button"
            onClick={onJump}
            aria-label={label}
            title={label}
            className="pointer-events-auto inline-flex items-center gap-2 h-9 px-5 bg-paper-card border border-clay/55 rounded-full text-ink text-[13px] leading-none transition-colors duration-150 hover:bg-[hsl(var(--clay)/0.10)] hover:border-clay focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay/55 focus-visible:ring-offset-2 focus-visible:ring-offset-paper shadow-[0_2px_6px_-2px_rgba(26,22,18,0.10)]"
            style={{ letterSpacing: '0.04em' }}
          >
            <ArrowDown aria-hidden="true" className="size-[14px] text-clay" />
            <span>{label}</span>
            {newCount > 0 && (
              <span className="font-mono text-[11px] tracking-[0.06em] tabular-nums text-clay/85 ml-0.5">
                {newCount}
              </span>
            )}
          </button>
        </m.div>
      )}
    </AnimatePresence>
  )
}
