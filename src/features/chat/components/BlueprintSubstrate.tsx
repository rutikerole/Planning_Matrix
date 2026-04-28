import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'

/**
 * Phase 3.2 #35 — the page's living substrate. Two layered blueprint grids
 * fill the chat workspace area:
 *
 *   1. Ink grid (always visible at base opacity) — minor 24px @ 4.5%, major
 *      96px @ 7%.
 *   2. Drafting-blue grid (revealed inside a 320px radial mask following
 *      the cursor) — same geometry, drafting-blue at 8%.
 *
 * Plus a slow ambient drift loop — `sin(t * 0.0001) * 4` translation on x,
 * imperceptible per-frame, registered over time. Establishes the page is
 * alive even when no scroll, no thinking.
 *
 * Reduced-motion: cursor lensing off, drift off, only the ink grid renders
 * statically.
 *
 * The overlay sits behind everything (z-index -10) and is pointer-events-none.
 */
export function BlueprintSubstrate() {
  const reduced = useReducedMotion()
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const driftRef = useRef<HTMLDivElement>(null)

  // Cursor lensing.
  useEffect(() => {
    if (reduced) return
    let raf = 0
    let pending: { x: number; y: number } | null = null
    const onMove = (e: PointerEvent) => {
      pending = { x: e.clientX, y: e.clientY }
      if (raf) return
      raf = requestAnimationFrame(() => {
        if (pending) setPos(pending)
        raf = 0
      })
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onMove)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [reduced])

  // Ambient drift.
  useEffect(() => {
    if (reduced) return
    let raf = 0
    let cancelled = false
    const start = performance.now()
    const tick = (now: number) => {
      if (cancelled) return
      const t = now - start
      const dx = Math.sin(t * 0.0001) * 4
      if (driftRef.current) {
        driftRef.current.style.transform = `translate3d(${dx.toFixed(2)}px, 0, 0)`
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelled = true
      if (raf) cancelAnimationFrame(raf)
    }
  }, [reduced])

  const lensMask = pos
    ? `radial-gradient(circle 320px at ${pos.x}px ${pos.y}px, rgba(0,0,0,1), transparent 80%)`
    : undefined

  return (
    <div
      ref={driftRef}
      aria-hidden="true"
      className="fixed inset-0 -z-10 pointer-events-none"
      style={{ willChange: reduced ? 'auto' : 'transform' }}
    >
      {/* Ink grid — always visible at base opacity. */}
      <div className="absolute inset-0 bg-blueprint-ink" />
      {/* Drafting-blue grid — only inside the cursor lens. */}
      {!reduced && pos && (
        <div
          className="absolute inset-0 bg-blueprint-blue"
          style={{
            WebkitMaskImage: lensMask,
            maskImage: lensMask,
          }}
        />
      )}
      <style>{`
        .bg-blueprint-ink {
          background-image:
            url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96'><path d='M 96 0 L 0 0 L 0 96' fill='none' stroke='hsl(220 16%25 11%25 / 0.07)' stroke-width='1'/></svg>"),
            url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24'><path d='M 24 0 L 0 0 L 0 24' fill='none' stroke='hsl(220 16%25 11%25 / 0.045)' stroke-width='0.5'/></svg>");
          background-size: 96px 96px, 24px 24px;
        }
        .bg-blueprint-blue {
          background-image:
            url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96'><path d='M 96 0 L 0 0 L 0 96' fill='none' stroke='hsl(212 38%25 32%25 / 0.12)' stroke-width='1'/></svg>"),
            url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24'><path d='M 24 0 L 0 0 L 0 24' fill='none' stroke='hsl(212 38%25 32%25 / 0.08)' stroke-width='0.5'/></svg>");
          background-size: 96px 96px, 24px 24px;
        }
      `}</style>
    </div>
  )
}
