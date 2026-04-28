// ───────────────────────────────────────────────────────────────────────
// Phase 3.8 #83 — useKeyboardHeight
//
// On mobile web, the soft keyboard reduces the visualViewport (the
// region the user actually sees) without changing window.innerHeight
// in some browsers. `visualViewport.height` minus `window.innerHeight`
// (clamped at 0) is a reliable proxy for keyboard height across iOS
// Safari + Chrome Android.
//
// Returns 0 when no keyboard is open, on desktop, or when
// visualViewport is unsupported.
//
// Known edge case (called out in PLAN §9): Android Chrome can show a
// brief overlap between the address-bar collapse animation and a
// freshly-opened keyboard; we throttle via rAF so the value settles.
// ───────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react'

export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const vv = window.visualViewport
    if (!vv) return // unsupported (very old browsers)

    let raf = 0
    const compute = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const layout = window.innerHeight
        const visual = vv.height + vv.offsetTop
        // When keyboard opens, visual < layout. Clamp negative noise to 0.
        const diff = Math.max(0, layout - visual)
        // Tiny offsets (< 60 px) come from address-bar collapse, not
        // a keyboard. Ignore them so the input bar doesn't jiggle.
        setHeight(diff > 60 ? diff : 0)
      })
    }

    compute()
    vv.addEventListener('resize', compute)
    vv.addEventListener('scroll', compute)
    return () => {
      cancelAnimationFrame(raf)
      vv.removeEventListener('resize', compute)
      vv.removeEventListener('scroll', compute)
    }
  }, [])

  return height
}
