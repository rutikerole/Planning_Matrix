// ───────────────────────────────────────────────────────────────────────
// Phase 7 Move 6 — Smart auto-scroll
//
// New contract: when a new persisted assistant turn arrives, scroll the
// page so its spec-tag (`#spec-tag-<msgid>`, set by MessageAssistant)
// lands `topOffset` px below the viewport top — *not* the bottom of
// the message. The user reads each response from the start, top-down,
// instead of being yanked into the middle of a long body.
//
// Pause behaviour: when the user has scrolled more than 200 px away
// from the live edge (the spec-tag's natural top:topOffset position),
// pausedRef = true and the next-arriving turn does NOT trigger a
// scroll. JumpToLatestFab independently surfaces a "↓ N new" pill the
// user can click to resume.
//
// pausedRef is component-local; it intentionally is *not* refreshed
// the moment a new spec-tag arrives (which would always read as
// "far away" since the new tag is appended below the fold). Instead
// it carries the user's scroll state from before the new turn — the
// scroll handler effect re-binds to the new id but skips its initial
// measure() call.
//
// Reduced-motion: scroll is instant (browser native; we still call
// scrollTo with `behavior: smooth` and rely on the OS preference to
// override — same approach used elsewhere in the codebase).
// ───────────────────────────────────────────────────────────────────────

import { useEffect, useRef } from 'react'
import { useChamberMainRef } from '../components/Chamber/ChamberLayout'

interface Options {
  /**
   * id of the latest persisted assistant message. When this changes
   * the hook scrolls the corresponding spec-tag to `topOffset`. Null
   * = no anchor, no auto-scroll.
   */
  latestAssistantId: string | null
  /**
   * Distance, in px, from viewport top to the spec-tag after auto-
   * scroll completes. Default 90 — matches StickyContext's IO
   * rootMargin so both move in lock-step.
   */
  topOffset?: number
}

const PAUSE_THRESHOLD_PX = 200

export function useAutoScroll({
  latestAssistantId,
  topOffset = 90,
}: Options): void {
  const lastIdRef = useRef<string | null>(null)
  const pausedRef = useRef(false)
  const mainRefHolder = useChamberMainRef()

  // Phase 7.6 §1.6 — measurements + scroll target the chamber-main
  // scroll container (Phase 7.6 viewport-grid layout) rather than
  // the document. Falls back to window.* if no main ref is mounted
  // (e.g. pre-Chamber surfaces or test environments).
  useEffect(() => {
    if (!latestAssistantId) {
      pausedRef.current = false
      return
    }
    const main = mainRefHolder?.current
    const target: HTMLElement | Window = main ?? window
    const measure = () => {
      const tag = document.getElementById(`spec-tag-${latestAssistantId}`)
      if (!tag) return
      const rect = tag.getBoundingClientRect()
      const baseTop = main ? main.getBoundingClientRect().top : 0
      const distance = Math.abs(rect.top - baseTop - topOffset)
      pausedRef.current = distance > PAUSE_THRESHOLD_PX
    }
    target.addEventListener('scroll', measure, { passive: true })
    window.addEventListener('resize', measure, { passive: true })
    return () => {
      target.removeEventListener('scroll', measure)
      window.removeEventListener('resize', measure)
    }
  }, [latestAssistantId, topOffset, mainRefHolder])

  useEffect(() => {
    if (!latestAssistantId) return
    if (latestAssistantId === lastIdRef.current) return
    const previousId = lastIdRef.current
    lastIdRef.current = latestAssistantId
    if (previousId === null) return
    if (pausedRef.current) return

    requestAnimationFrame(() => {
      const tag = document.getElementById(`spec-tag-${latestAssistantId}`)
      if (!tag) return
      const rect = tag.getBoundingClientRect()
      const main = mainRefHolder?.current
      if (main) {
        const baseTop = main.getBoundingClientRect().top
        const top = main.scrollTop + (rect.top - baseTop) - topOffset
        main.scrollTo({ top, behavior: 'smooth' })
      } else {
        const top = window.scrollY + rect.top - topOffset
        window.scrollTo({ top, behavior: 'smooth' })
      }
    })
  }, [latestAssistantId, topOffset, mainRefHolder])
}
