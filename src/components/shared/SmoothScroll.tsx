import { useEffect } from 'react'
import Lenis from 'lenis'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

/**
 * Mounts Lenis for gentle wheel-driven smooth scroll.
 * Skipped under prefers-reduced-motion. Touch is intentionally not synced —
 * native iOS/Android scroll is already smooth and intercepting it feels worse.
 */
export function SmoothScroll() {
  const reduced = usePrefersReducedMotion()

  useEffect(() => {
    if (reduced) return

    const lenis = new Lenis({
      lerp: 0.1,
      smoothWheel: true,
      syncTouch: false,
      wheelMultiplier: 1,
      touchMultiplier: 1.4,
    })

    document.documentElement.classList.add('lenis')

    let frameId = 0
    const raf = (time: number) => {
      lenis.raf(time)
      frameId = requestAnimationFrame(raf)
    }
    frameId = requestAnimationFrame(raf)

    return () => {
      cancelAnimationFrame(frameId)
      lenis.destroy()
      document.documentElement.classList.remove('lenis')
    }
  }, [reduced])

  return null
}
