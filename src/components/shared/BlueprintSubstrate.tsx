import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'

interface Props {
  /** Cursor lens radius in px. Default 320 (chat workspace + dashboard);
   *  the wizard uses 220 to keep the headline as the focal point. */
  lensRadius?: number
  /** Whether the slow "table breath" opacity loop runs on the ink grid.
   *  Default true. Set false for the wizard, where the headline animation
   *  + paper-card shadow already carry the page's life. */
  breathing?: boolean
  /** Drift amplitude in px on the x-axis. Default 4. Set 0 to disable
   *  (the wizard is calmer than the working surfaces). */
  driftPx?: number
}

/**
 * Phase 3.2 #35 + 3.3 #48 — the page's living substrate. Two layered
 * blueprint grids fill the viewport:
 *
 *   1. Ink grid (always visible at base opacity) — minor 24px @ 4.5%,
 *      major 96px @ 7%.
 *   2. Drafting-blue grid (revealed inside a {lensRadius}px radial mask
 *      following the cursor) — same geometry, drafting-blue at 8%.
 *
 * Plus an optional ambient drift loop — `sin(t * 0.0001) * driftPx` on
 * x — and an optional "table breath" opacity loop on the ink grid.
 *
 * Reduced-motion: cursor lensing off, drift off, breath off, only the
 * ink grid renders statically.
 *
 * The overlay sits behind everything (z-index -10) and is
 * pointer-events-none, so it's safe to mount on any page.
 */
export function BlueprintSubstrate({
  lensRadius = 320,
  breathing = true,
  driftPx = 4,
}: Props = {}) {
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
    if (reduced || driftPx === 0) return
    let raf = 0
    let cancelled = false
    const start = performance.now()
    const tick = (now: number) => {
      if (cancelled) return
      const t = now - start
      const dx = Math.sin(t * 0.0001) * driftPx
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
  }, [reduced, driftPx])

  const lensMask = pos
    ? `radial-gradient(circle ${lensRadius}px at ${pos.x}px ${pos.y}px, rgba(0,0,0,1), transparent 80%)`
    : undefined

  const breathClass = breathing && !reduced ? 'pm-table-breath' : ''

  return (
    <div
      ref={driftRef}
      aria-hidden="true"
      className="fixed inset-0 -z-10 pointer-events-none"
      style={{ willChange: reduced || driftPx === 0 ? 'auto' : 'transform' }}
    >
      {/* Ink grid — always visible at base opacity. */}
      <div className={`absolute inset-0 bg-blueprint-ink ${breathClass}`} />
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
        @keyframes pmTableBreath {
          0%, 100% { opacity: 0.94; }
          50%      { opacity: 1; }
        }
        .pm-table-breath { animation: pmTableBreath 14s ease-in-out infinite; }
      `}</style>
    </div>
  )
}
