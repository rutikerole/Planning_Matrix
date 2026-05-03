import { useEffect, useState } from 'react'
import { useReducedMotion } from 'framer-motion'

/**
 * Phase 3.2 #37 — north arrow rosette in the paper card's top-right corner.
 *
 * Per Q8 (locked) — the arrow draws itself in via stroke-dashoffset over
 * 1.6s on first mount, then settles. Calmer than a 360° spin.
 * Reduced-motion: static, fully drawn from frame zero.
 */
export function NorthArrow() {
  const reduced = useReducedMotion()
  const [drawn, setDrawn] = useState(reduced)

  useEffect(() => {
    if (reduced) return
    const t = setTimeout(() => setDrawn(true), 50)
    return () => clearTimeout(t)
  }, [reduced])

  const dashLength = 56
  const transition = reduced
    ? 'none'
    : 'stroke-dashoffset 1.6s cubic-bezier(0.16, 1, 0.3, 1)'

  return (
    <svg
      width="32"
      height="36"
      viewBox="0 0 32 36"
      fill="none"
      aria-hidden="true"
      className="text-drafting-blue"
    >
      {/* The "N" letter floating above the arrow */}
      <text
        x="16"
        y="6"
        fontSize="7"
        fontStyle="italic"
        textAnchor="middle"
        fill="hsl(var(--ink) / 0.45)"
        fontFamily="'Instrument Serif', serif"
      >
        N
      </text>
      {/* The arrow shaft + barbed head */}
      <path
        d="M 16 10 L 16 32 M 16 10 L 12 14 M 16 10 L 20 14"
        stroke="currentColor"
        strokeOpacity="0.55"
        strokeWidth="1"
        strokeLinecap="round"
        strokeDasharray={dashLength}
        strokeDashoffset={drawn ? 0 : dashLength}
        style={{ transition }}
      />
      {/* A tiny circular rosette at the base — architectural drawing convention. */}
      <circle
        cx="16"
        cy="32"
        r="1.2"
        fill="currentColor"
        fillOpacity="0.55"
      />
    </svg>
  )
}
