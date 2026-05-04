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

  // Watch user scroll to update pausedRef. Bound on `latestAssistantId`
  // so the listener references the current anchor; we deliberately do
  // NOT call measure() at mount-time — the new tag is always far
  // below the fold at the instant it arrives, which would trip a
  // false pause.
  useEffect(() => {
    if (!latestAssistantId) {
      pausedRef.current = false
      return
    }
    const measure = () => {
      const tag = document.getElementById(`spec-tag-${latestAssistantId}`)
      if (!tag) return
      const rect = tag.getBoundingClientRect()
      const distance = Math.abs(rect.top - topOffset)
      pausedRef.current = distance > PAUSE_THRESHOLD_PX
    }
    window.addEventListener('scroll', measure, { passive: true })
    window.addEventListener('resize', measure, { passive: true })
    return () => {
      window.removeEventListener('scroll', measure)
      window.removeEventListener('resize', measure)
    }
  }, [latestAssistantId, topOffset])

  // Scroll on new id when not paused.
  useEffect(() => {
    if (!latestAssistantId) return
    if (latestAssistantId === lastIdRef.current) return

    const previousId = lastIdRef.current
    lastIdRef.current = latestAssistantId

    // First mount: don't yank — leave the user wherever the page
    // landed naturally (re-load + recovery row + thread render).
    if (previousId === null) return

    if (pausedRef.current) return

    // rAF so the new spec-tag has a chance to land in the DOM before
    // we measure its position.
    requestAnimationFrame(() => {
      const tag = document.getElementById(`spec-tag-${latestAssistantId}`)
      if (!tag) return
      const rect = tag.getBoundingClientRect()
      const target = window.scrollY + rect.top - topOffset
      window.scrollTo({ top: target, behavior: 'smooth' })
    })
  }, [latestAssistantId, topOffset])
}
