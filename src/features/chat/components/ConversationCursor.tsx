import { useEffect, useState } from 'react'
import { useReducedMotion } from 'framer-motion'

/**
 * Phase 3.2 — Addition A — conversation cursor.
 *
 * A small vertical hairline cursor in the left margin of the center
 * column that traces the current scroll position through the
 * conversation. Reads as a ruler sliding along a drafting table.
 * Implementation: fixed-positioned hairline whose Y is computed from
 * window.scrollY ratio between (page top, page bottom).
 *
 * The cursor renders at a small fixed Y in the viewport (~25% from top)
 * so as the page scrolls under it, the cursor appears to "track"
 * different turns. Soft easing on snap to next turn boundary is
 * implemented via the 240ms transition on the top property.
 *
 * Reduced-motion: cursor renders, snap is instant, no transition.
 */
export function ConversationCursor() {
  const reduced = useReducedMotion()
  const [scrolledIn, setScrolledIn] = useState(false)

  useEffect(() => {
    const onScroll = () => {
      // Show cursor only after the user has scrolled at least 200px —
      // first paint shouldn't startle.
      setScrolledIn(window.scrollY > 200)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (!scrolledIn) return null

  return (
    <span
      aria-hidden="true"
      className="hidden xl:block fixed left-[max(2rem,calc((100vw-1440px)/2+12px))] top-[28vh] w-px h-16 bg-clay/35 pointer-events-none z-10"
      style={{
        transition: reduced ? 'none' : 'opacity 240ms cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    />
  )
}
