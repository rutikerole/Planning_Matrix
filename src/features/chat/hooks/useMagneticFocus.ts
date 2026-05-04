// Phase 7 Chamber — magnetic focus.
//
// Single IntersectionObserver for the entire thread. The observer
// fires whenever any message crosses the viewport-center band
// (rootMargin -40% top + bottom — the band is the middle 20% of the
// viewport). The element with the largest intersection ratio inside
// that band becomes the "focused" message; we set
// `data-focus="true"` on it and clear the others.
//
// One observer for N messages instead of N observers.

import { useEffect, useRef } from 'react'

export function useMagneticFocus(rootSelector = '[data-chamber-thread]', itemSelector = '[data-chamber-message]') {
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const root = document.querySelector(rootSelector) as HTMLElement | null
    if (!root) return

    let raf = 0
    const recompute = () => {
      const items = Array.from(
        root.querySelectorAll<HTMLElement>(itemSelector),
      )
      const cy = window.innerHeight / 2
      let bestEl: HTMLElement | null = null
      let bestDist = Infinity
      for (const el of items) {
        const rect = el.getBoundingClientRect()
        const ec = (rect.top + rect.bottom) / 2
        // Only consider items at least partially in the viewport.
        if (rect.bottom < 0 || rect.top > window.innerHeight) continue
        const dist = Math.abs(ec - cy)
        if (dist < bestDist) {
          bestDist = dist
          bestEl = el
        }
      }
      for (const el of items) {
        if (el === bestEl) {
          el.setAttribute('data-focus', 'true')
        } else if (el.hasAttribute('data-focus')) {
          el.removeAttribute('data-focus')
        }
      }
    }

    const schedule = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        recompute()
      })
    }

    const obs = new IntersectionObserver(schedule, {
      rootMargin: '-40% 0px -40% 0px',
      threshold: [0, 0.5, 1],
    })
    observerRef.current = obs

    // Observe each message; refresh when the DOM changes.
    const observeAll = () => {
      const items = root.querySelectorAll<HTMLElement>(itemSelector)
      items.forEach((el) => obs.observe(el))
    }
    observeAll()

    const mo = new MutationObserver(() => {
      obs.disconnect()
      const items = root.querySelectorAll<HTMLElement>(itemSelector)
      items.forEach((el) => obs.observe(el))
      schedule()
    })
    mo.observe(root, { childList: true, subtree: true })

    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule, { passive: true })
    schedule()

    return () => {
      mo.disconnect()
      obs.disconnect()
      observerRef.current = null
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [rootSelector, itemSelector])
}
