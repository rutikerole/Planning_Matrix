// ───────────────────────────────────────────────────────────────────────
// Phase 3.8 #87 — useSwipeGesture
//
// Lightweight swipe-detection hook for native pointer events. No
// framer-motion drag (which fights iOS edge-swipe-back); plain pointer
// events with directional thresholds. Returns handlers + an offset so
// the consumer can render a follow-finger transform during the drag.
//
// Honours `prefers-reduced-motion`: drag still works (it's a tap-to-
// confirm interaction) but no spring physics, and the threshold
// tightens so the user can commit with a smaller motion.
//
// Known iOS edge case (PLAN §9): browser back-swipe lives at the
// outer 12 px of the viewport. Consumers should bind these handlers
// to the row's interior (not the full row width) so the system
// gesture stays accessible. The default `edgeBufferPx` is 16.
// ───────────────────────────────────────────────────────────────────────

import { useReducedMotion } from 'framer-motion'
import { useCallback, useRef, useState } from 'react'

interface UseSwipeOptions {
  /** Threshold in CSS px for committing the swipe. Default 80. */
  threshold?: number
  /** Called when the swipe commits past `threshold` to the right. */
  onSwipeRight?: () => void
  /** Called when the swipe commits past `threshold` to the left. */
  onSwipeLeft?: () => void
  /** Edge buffer reserved for browser system gestures. Default 16. */
  edgeBufferPx?: number
}

interface UseSwipeReturn {
  /** Pointer-event handlers to spread on the swipe target. */
  handlers: {
    onPointerDown: (e: React.PointerEvent) => void
    onPointerMove: (e: React.PointerEvent) => void
    onPointerUp: (e: React.PointerEvent) => void
    onPointerCancel: (e: React.PointerEvent) => void
  }
  /** Live x-offset in pixels — feed into transform: translateX(). */
  offset: number
  /** True while a pointer is down + moving past 4 px. */
  active: boolean
}

export function useSwipeGesture(opts: UseSwipeOptions = {}): UseSwipeReturn {
  const reduced = useReducedMotion()
  const threshold = opts.threshold ?? (reduced ? 40 : 80)
  const edgeBuffer = opts.edgeBufferPx ?? 16

  const startX = useRef<number | null>(null)
  const pointerId = useRef<number | null>(null)
  const [offset, setOffset] = useState(0)
  const [active, setActive] = useState(false)

  const reset = useCallback(() => {
    startX.current = null
    pointerId.current = null
    setOffset(0)
    setActive(false)
  }, [])

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (typeof window === 'undefined') return
      // Ignore touches that begin within the edge-buffer (browser
      // back-gesture territory).
      if (e.clientX < edgeBuffer || e.clientX > window.innerWidth - edgeBuffer) {
        return
      }
      startX.current = e.clientX
      pointerId.current = e.pointerId
    },
    [edgeBuffer],
  )

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (startX.current === null || pointerId.current !== e.pointerId) return
    const dx = e.clientX - startX.current
    if (Math.abs(dx) > 4 && !active) setActive(true)
    setOffset(dx)
  }, [active])

  const commit = useCallback(() => {
    const dx = offset
    if (dx > threshold) opts.onSwipeRight?.()
    else if (dx < -threshold) opts.onSwipeLeft?.()
    reset()
  }, [offset, threshold, opts, reset])

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (pointerId.current !== e.pointerId) return
      commit()
    },
    [commit],
  )

  const onPointerCancel = useCallback(
    (e: React.PointerEvent) => {
      if (pointerId.current !== e.pointerId) return
      reset()
    },
    [reset],
  )

  return {
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel },
    offset,
    active,
  }
}
