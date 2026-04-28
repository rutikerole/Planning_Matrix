// ───────────────────────────────────────────────────────────────────────
// Phase 3.8 #87 — useLongPress
//
// Press-and-hold detection. Defaults to 500 ms hold; cancels if the
// pointer moves more than 5 px (so the user can scroll without
// triggering a context menu).
//
// Returns spreadable pointer handlers. Consumers typically wire these
// onto a wrapping element AND onto its interactive child, then open
// a vaul drawer or context sheet on fire.
// ───────────────────────────────────────────────────────────────────────

import { useCallback, useRef } from 'react'

interface UseLongPressOptions {
  /** Hold duration in ms. Default 500. */
  delay?: number
  /** Movement threshold (px) that cancels the press. Default 5. */
  movementCancel?: number
  onLongPress: () => void
}

interface UseLongPressReturn {
  onPointerDown: (e: React.PointerEvent) => void
  onPointerMove: (e: React.PointerEvent) => void
  onPointerUp: (e: React.PointerEvent) => void
  onPointerCancel: (e: React.PointerEvent) => void
}

export function useLongPress(opts: UseLongPressOptions): UseLongPressReturn {
  const { delay = 500, movementCancel = 5, onLongPress } = opts
  const timerId = useRef<number | null>(null)
  const startX = useRef(0)
  const startY = useRef(0)
  const fired = useRef(false)

  const clear = useCallback(() => {
    if (timerId.current !== null) {
      window.clearTimeout(timerId.current)
      timerId.current = null
    }
  }, [])

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      fired.current = false
      startX.current = e.clientX
      startY.current = e.clientY
      timerId.current = window.setTimeout(() => {
        fired.current = true
        onLongPress()
      }, delay)
    },
    [delay, onLongPress],
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const dx = Math.abs(e.clientX - startX.current)
      const dy = Math.abs(e.clientY - startY.current)
      if (dx > movementCancel || dy > movementCancel) clear()
    },
    [movementCancel, clear],
  )

  const onPointerUp = useCallback(() => {
    clear()
  }, [clear])

  const onPointerCancel = useCallback(() => {
    clear()
  }, [clear])

  return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel }
}
