import { useRef } from 'react'
import { m, useScroll, useTransform } from 'framer-motion'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { cn } from '@/lib/utils'

interface Props {
  className?: string
}

/**
 * Architectural floor-plan SVG that draws itself line-by-line as the
 * Problem section scrolls past. Each path's strokeDashoffset is bound
 * to a sub-range of scrollYProgress, so the plan reveals at the
 * scroller's pace rather than an animation timer.
 */
export function BlueprintFloorplan({ className }: Props) {
  const reduced = usePrefersReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  })

  // Each path maps a sub-range of scroll progress to dashoffset 1 → 0.
  // Reduced-motion: drawn from the start (offset 0 always).
  const r = (a: number, b: number) =>
    useTransform(scrollYProgress, [a, b], reduced ? [0, 0] : [1, 0])

  const dOuter = r(0.05, 0.18)
  const dWallV = r(0.13, 0.26)
  const dWallH = r(0.20, 0.33)
  const dDoor1 = r(0.27, 0.38)
  const dDoor2 = r(0.32, 0.43)
  const dKitchen = r(0.36, 0.48)
  const dBath = r(0.40, 0.52)
  const dDimV = r(0.45, 0.57)
  const dDimH = r(0.48, 0.60)
  const labels = useTransform(
    scrollYProgress,
    [0.50, 0.62],
    reduced ? [1, 1] : [0, 1],
  )

  return (
    <div
      ref={ref}
      className={cn('relative w-full max-w-[320px]', className)}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 320 480"
        className="w-full h-auto"
        role="img"
        aria-label="Wohnungsgrundriss — drei-Zimmer-Wohnung"
      >
        {/* Tiny eyebrow above */}
        <text
          x="14"
          y="14"
          fontFamily="Inter, system-ui, sans-serif"
          fontSize="9"
          fontWeight="500"
          letterSpacing="1.6"
          fill="hsl(var(--muted-foreground))"
        >
          GRUNDRISS · 1:100
        </text>

        {/* Outer building rectangle */}
        <m.rect
          x="48"
          y="40"
          width="240"
          height="380"
          fill="none"
          stroke="hsl(var(--ink))"
          strokeOpacity="0.55"
          strokeWidth="1.4"
          pathLength={1}
          strokeDasharray="1"
          style={{ strokeDashoffset: dOuter }}
        />

        {/* Internal walls dividing into rooms */}
        <m.line
          x1="48"
          y1="220"
          x2="288"
          y2="220"
          stroke="hsl(var(--ink))"
          strokeOpacity="0.55"
          strokeWidth="1.1"
          pathLength={1}
          strokeDasharray="1"
          style={{ strokeDashoffset: dWallH }}
        />
        <m.line
          x1="180"
          y1="220"
          x2="180"
          y2="420"
          stroke="hsl(var(--ink))"
          strokeOpacity="0.55"
          strokeWidth="1.1"
          pathLength={1}
          strokeDasharray="1"
          style={{ strokeDashoffset: dWallV }}
        />

        {/* Doors — gap in wall + arc swing */}
        <m.path
          d="M 124 220 a 30 30 0 0 1 30 -30"
          fill="none"
          stroke="hsl(var(--ink))"
          strokeOpacity="0.4"
          strokeWidth="0.9"
          pathLength={1}
          strokeDasharray="1"
          style={{ strokeDashoffset: dDoor1 }}
        />
        <m.path
          d="M 180 320 a 28 28 0 0 0 -28 28"
          fill="none"
          stroke="hsl(var(--ink))"
          strokeOpacity="0.4"
          strokeWidth="0.9"
          pathLength={1}
          strokeDasharray="1"
          style={{ strokeDashoffset: dDoor2 }}
        />

        {/* Kitchen counter (top-right room) */}
        <m.path
          d="M 200 50 L 280 50 L 280 80 L 200 80"
          fill="none"
          stroke="hsl(var(--clay))"
          strokeOpacity="0.5"
          strokeWidth="0.9"
          pathLength={1}
          strokeDasharray="1"
          style={{ strokeDashoffset: dKitchen }}
        />

        {/* Bathroom fixtures (bottom-left) */}
        <m.path
          d="M 60 290 L 88 290 L 88 318 L 60 318 Z M 60 330 a 10 10 0 0 1 20 0 a 10 10 0 0 1 -20 0"
          fill="none"
          stroke="hsl(var(--clay))"
          strokeOpacity="0.5"
          strokeWidth="0.9"
          pathLength={1}
          strokeDasharray="1"
          style={{ strokeDashoffset: dBath }}
        />

        {/* Vertical dimension on the left */}
        <m.path
          d="M 30 40 L 30 420 M 26 40 L 34 40 M 26 420 L 34 420 M 26 220 L 34 220"
          fill="none"
          stroke="hsl(var(--clay))"
          strokeOpacity="0.7"
          strokeWidth="0.7"
          pathLength={1}
          strokeDasharray="1"
          style={{ strokeDashoffset: dDimV }}
        />

        {/* Horizontal dimension at bottom */}
        <m.path
          d="M 48 444 L 288 444 M 48 440 L 48 448 M 288 440 L 288 448 M 180 440 L 180 448"
          fill="none"
          stroke="hsl(var(--clay))"
          strokeOpacity="0.7"
          strokeWidth="0.7"
          pathLength={1}
          strokeDasharray="1"
          style={{ strokeDashoffset: dDimH }}
        />

        {/* Labels — faded in once outline is drawn */}
        <m.g style={{ opacity: labels }}>
          <text
            x="20"
            y="232"
            fontFamily="Inter, system-ui, sans-serif"
            fontSize="9"
            fontWeight="500"
            fill="hsl(var(--clay))"
          >
            7,80 m
          </text>
          <text
            x="166"
            y="462"
            textAnchor="middle"
            fontFamily="Inter, system-ui, sans-serif"
            fontSize="9"
            fontWeight="500"
            fill="hsl(var(--clay))"
          >
            12,00 m
          </text>
          <text
            x="120"
            y="135"
            fontFamily="'Instrument Serif', Georgia, serif"
            fontSize="11"
            fontStyle="italic"
            fill="hsl(var(--ink))"
            fillOpacity="0.6"
          >
            Wohnen
          </text>
          <text
            x="240"
            y="105"
            fontFamily="'Instrument Serif', Georgia, serif"
            fontSize="11"
            fontStyle="italic"
            fill="hsl(var(--ink))"
            fillOpacity="0.6"
          >
            Küche
          </text>
          <text
            x="100"
            y="350"
            fontFamily="'Instrument Serif', Georgia, serif"
            fontSize="11"
            fontStyle="italic"
            fill="hsl(var(--ink))"
            fillOpacity="0.6"
          >
            Schlafen
          </text>
          <text
            x="220"
            y="350"
            fontFamily="'Instrument Serif', Georgia, serif"
            fontSize="11"
            fontStyle="italic"
            fill="hsl(var(--ink))"
            fillOpacity="0.6"
          >
            Bad
          </text>
        </m.g>

        {/* North compass (bottom-right corner) */}
        <g transform="translate(290, 410)">
          <line
            x1="0"
            y1="0"
            x2="0"
            y2="-14"
            stroke="hsl(var(--ink))"
            strokeOpacity="0.45"
            strokeWidth="0.9"
          />
          <polygon
            points="-3,-9 0,-15 3,-9"
            fill="hsl(var(--ink))"
            fillOpacity="0.45"
          />
          <text
            x="0"
            y="6"
            textAnchor="middle"
            fontFamily="Inter, system-ui, sans-serif"
            fontSize="8"
            fill="hsl(var(--ink))"
            fillOpacity="0.5"
          >
            N
          </text>
        </g>
      </svg>
    </div>
  )
}
