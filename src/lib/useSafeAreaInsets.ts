// ───────────────────────────────────────────────────────────────────────
// Phase 3.8 #83 — useSafeAreaInsets
//
// `env(safe-area-inset-*)` only paints meaningful values once the
// viewport meta carries `viewport-fit=cover` (Phase 3.8 fixed this in
// index.html). For components that need the numeric pixel value (e.g.
// gesture math, FAB positioning), reading the env() back into JS
// requires a tiny CSS-variable proxy — this hook does that work.
//
// The hook plants four custom-property reads on a hidden element,
// then reads the resolved values via getComputedStyle.
// ───────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react'

export interface SafeAreaInsets {
  top: number
  bottom: number
  left: number
  right: number
}

const ZERO: SafeAreaInsets = { top: 0, bottom: 0, left: 0, right: 0 }

export function useSafeAreaInsets(): SafeAreaInsets {
  const [insets, setInsets] = useState<SafeAreaInsets>(ZERO)

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return

    // Plant a hidden probe with custom properties pointing at env().
    const probe = document.createElement('div')
    probe.setAttribute('aria-hidden', 'true')
    probe.style.position = 'fixed'
    probe.style.top = '0'
    probe.style.left = '0'
    probe.style.width = '0'
    probe.style.height = '0'
    probe.style.pointerEvents = 'none'
    probe.style.setProperty('--probe-top', 'env(safe-area-inset-top)')
    probe.style.setProperty('--probe-bottom', 'env(safe-area-inset-bottom)')
    probe.style.setProperty('--probe-left', 'env(safe-area-inset-left)')
    probe.style.setProperty('--probe-right', 'env(safe-area-inset-right)')
    document.body.appendChild(probe)

    const read = () => {
      const cs = getComputedStyle(probe)
      const px = (val: string) => {
        const n = parseFloat(val)
        return Number.isFinite(n) ? n : 0
      }
      setInsets({
        top: px(cs.getPropertyValue('--probe-top')),
        bottom: px(cs.getPropertyValue('--probe-bottom')),
        left: px(cs.getPropertyValue('--probe-left')),
        right: px(cs.getPropertyValue('--probe-right')),
      })
    }

    read()
    // Re-read on resize / orientation change since insets shift when
    // the device rotates or browser-chrome collapses.
    let raf = 0
    const handler = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(read)
    }
    window.addEventListener('resize', handler, { passive: true })
    window.addEventListener('orientationchange', handler, { passive: true })

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', handler)
      window.removeEventListener('orientationchange', handler)
      document.body.removeChild(probe)
    }
  }, [])

  return insets
}
