// Phase 7 Chamber — cursor-following subtle background motion.
//
// A tiny pair of warm radial gradients that drift with the cursor.
// Disabled on touch devices (no mouse) and on reduced-motion.
//
// Phase 7.8 §2.8 — magnitude halved (18 → 9 px). With AmbientTint
// gone, the parallax was the only ambient motion left and it was
// reading as too active for the Manuscript surface.

import { useEffect, useRef } from 'react'
import { useReducedMotion } from 'framer-motion'

const STRENGTH = 9 // max px offset from cursor

export function CursorParallax() {
  const reduced = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (reduced) return
    if (typeof window === 'undefined') return
    if (window.matchMedia('(hover: none)').matches) return

    let raf = 0
    let pendingX = 0
    let pendingY = 0

    const onMove = (e: MouseEvent) => {
      const cx = e.clientX / window.innerWidth - 0.5
      const cy = e.clientY / window.innerHeight - 0.5
      pendingX = cx * STRENGTH
      pendingY = cy * STRENGTH
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        if (ref.current) {
          ref.current.style.transform = `translate3d(${pendingX}px, ${pendingY}px, 0)`
        }
      })
    }
    window.addEventListener('mousemove', onMove, { passive: true })
    return () => {
      window.removeEventListener('mousemove', onMove)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [reduced])

  return (
    <div
      aria-hidden="true"
      ref={ref}
      className="fixed inset-0 z-0 pointer-events-none transition-transform duration-[60ms] ease-out"
      style={{
        backgroundImage:
          'radial-gradient(circle at 18% 22%, hsl(38 38% 92% / 0.42) 0%, transparent 38%), radial-gradient(circle at 78% 78%, hsl(25 30% 90% / 0.32) 0%, transparent 42%)',
        mixBlendMode: 'multiply',
      }}
    />
  )
}
