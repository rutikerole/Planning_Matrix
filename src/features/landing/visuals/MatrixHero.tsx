import { useId, useRef } from 'react'
import { m, useScroll, useTransform } from 'framer-motion'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

/* ── Geometry ──────────────────────────────────────────────────────────── */
const CX = 270
const CY = 270
const INNER_R = 86
const OUTER_R = 212
const SPAN = 28 // half-width of each sector in degrees

/** Polar → Cartesian where 0° points up (12 o'clock), increasing clockwise. */
function polar(r: number, deg: number): [number, number] {
  const a = (deg * Math.PI) / 180
  return [CX + r * Math.sin(a), CY - r * Math.cos(a)]
}

function sectorPath(startA: number, endA: number): string {
  const [iax, iay] = polar(INNER_R, startA)
  const [ibx, iby] = polar(INNER_R, endA)
  const [oax, oay] = polar(OUTER_R, startA)
  const [obx, oby] = polar(OUTER_R, endA)
  const f = (n: number) => n.toFixed(2)
  return [
    `M ${f(iax)} ${f(iay)}`,
    `L ${f(oax)} ${f(oay)}`,
    `A ${OUTER_R} ${OUTER_R} 0 0 1 ${f(obx)} ${f(oby)}`,
    `L ${f(ibx)} ${f(iby)}`,
    `A ${INNER_R} ${INNER_R} 0 0 0 ${f(iax)} ${f(iay)}`,
    'Z',
  ].join(' ')
}

const SECTOR_A = sectorPath(-SPAN, SPAN)
const SECTOR_B = sectorPath(120 - SPAN, 120 + SPAN)
const SECTOR_C = sectorPath(240 - SPAN, 240 + SPAN)

const TRAVEL_DOTS: Array<[number, number, number]> = [
  // [x, y, delayPhase 0/1/2]
  ...[-15, 0, 15].map((a, i) => [...polar(OUTER_R, a), i] as [number, number, number]),
  ...[105, 120, 135].map((a, i) => [...polar(OUTER_R, a), i] as [number, number, number]),
  ...[225, 240, 255].map((a, i) => [...polar(OUTER_R, a), i] as [number, number, number]),
]

/* ── Component ─────────────────────────────────────────────────────────── */
export function MatrixHero() {
  const reduced = usePrefersReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  })
  const y = useTransform(scrollYProgress, [0, 1], reduced ? [0, 0] : [0, 60])
  const id = useId().replace(/:/g, '')

  return (
    <m.div
      ref={ref}
      style={{ y }}
      className="relative w-full max-w-[460px] mx-auto lg:max-w-[540px] aspect-square"
    >
      <svg
        viewBox="0 0 540 540"
        className="w-full h-full"
        role="img"
        aria-label="Planning Matrix — drei Rechtsbereiche um ein Vorhaben"
      >
        <defs>
          {/* Sector A — zoning grid */}
          <pattern
            id={`grid-${id}`}
            patternUnits="userSpaceOnUse"
            width="16"
            height="16"
          >
            <path
              d="M 16 0 L 0 0 L 0 16"
              fill="none"
              stroke="hsl(var(--clay))"
              strokeWidth="0.4"
              strokeOpacity="0.4"
            />
          </pattern>
          {/* Sector B — building-code measurement ticks */}
          <pattern
            id={`ticks-${id}`}
            patternUnits="userSpaceOnUse"
            width="14"
            height="20"
          >
            <path
              d="M 7 0 L 7 20"
              stroke="hsl(var(--clay))"
              strokeWidth="0.5"
              strokeOpacity="0.5"
              fill="none"
            />
            <path
              d="M 4 5 L 10 5 M 4 15 L 10 15"
              stroke="hsl(var(--clay))"
              strokeWidth="0.4"
              strokeOpacity="0.32"
              fill="none"
            />
          </pattern>
          {/* Sector C — adjacent-rules dot scatter */}
          <pattern
            id={`dots-${id}`}
            patternUnits="userSpaceOnUse"
            width="22"
            height="22"
          >
            <circle cx="5" cy="6" r="1" fill="hsl(var(--clay))" fillOpacity="0.6" />
            <circle cx="16" cy="13" r="1" fill="hsl(var(--clay))" fillOpacity="0.5" />
            <circle cx="10" cy="19" r="1" fill="hsl(var(--clay))" fillOpacity="0.55" />
          </pattern>
        </defs>

        {/* Outer matrix frame — draws first */}
        <rect
          x="30"
          y="30"
          width="480"
          height="480"
          fill="none"
          stroke="hsl(var(--clay))"
          strokeOpacity="0.45"
          strokeWidth="1"
          pathLength={1}
          strokeDasharray="1"
          strokeDashoffset="1"
          className="animate-draw-path"
          style={{ animationDelay: '0.4s' }}
        />

        {/* Sector A — Planungsrecht (top) */}
        <g
          className="animate-fade-rise"
          style={{ animationDelay: '1.0s' }}
        >
          <path d={SECTOR_A} fill={`url(#grid-${id})`} />
          <path
            d={SECTOR_A}
            fill="none"
            stroke="hsl(var(--clay))"
            strokeOpacity="0.55"
            strokeWidth="0.7"
          />
        </g>

        {/* Sector B — Bauordnungsrecht (lower-right) */}
        <g
          className="animate-fade-rise"
          style={{ animationDelay: '1.15s' }}
        >
          <path d={SECTOR_B} fill={`url(#ticks-${id})`} />
          <path
            d={SECTOR_B}
            fill="none"
            stroke="hsl(var(--clay))"
            strokeOpacity="0.55"
            strokeWidth="0.7"
          />
        </g>

        {/* Sector C — Sonstige Vorgaben (lower-left) */}
        <g
          className="animate-fade-rise"
          style={{ animationDelay: '1.3s' }}
        >
          <path d={SECTOR_C} fill={`url(#dots-${id})`} />
          <path
            d={SECTOR_C}
            fill="none"
            stroke="hsl(var(--clay))"
            strokeOpacity="0.55"
            strokeWidth="0.7"
          />
        </g>

        {/* Traveling clay dots — pulse along outer arcs in sequence */}
        <g style={{ animationDelay: '1.5s' }}>
          {TRAVEL_DOTS.map(([x, y, phase], i) => (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="2.5"
              fill="hsl(var(--clay))"
              className="animate-travel-dot"
              style={{ animationDelay: `${phase * 1.3 + 1.5}s` }}
            />
          ))}
        </g>

        {/* House outline — central Vorhaben */}
        <path
          d="M 220 320 L 220 250 L 270 200 L 320 250 L 320 320 Z"
          fill="none"
          stroke="hsl(var(--ink))"
          strokeWidth="1.4"
          strokeLinejoin="miter"
          pathLength={1}
          strokeDasharray="1"
          strokeDashoffset="1"
          className="animate-draw-path"
          style={{ animationDelay: '0.65s' }}
        />
        {/* House door */}
        <path
          d="M 258 320 L 258 290 L 282 290 L 282 320"
          fill="none"
          stroke="hsl(var(--ink))"
          strokeWidth="1"
          pathLength={1}
          strokeDasharray="1"
          strokeDashoffset="1"
          className="animate-draw-path"
          style={{ animationDelay: '0.95s' }}
        />

        {/* Pulsing center dot (Vorhaben) — group fades in once, circle breathes forever */}
        <g className="animate-fade-rise" style={{ animationDelay: '1.5s' }}>
          <circle
            cx="270"
            cy="304"
            r="4"
            fill="hsl(var(--clay))"
            className="animate-breath-dot"
            style={{
              transformOrigin: 'center',
              transformBox: 'fill-box',
            }}
          />
        </g>

        {/* Labels */}
        <g className="animate-fade-rise" style={{ animationDelay: '1.7s' }}>
          <text
            x="270"
            y="20"
            textAnchor="middle"
            fontFamily="Inter, system-ui, sans-serif"
            fontSize="10"
            fontWeight="500"
            letterSpacing="1.8"
            fill="hsl(var(--muted-foreground))"
          >
            A · PLANUNGSRECHT
          </text>
        </g>
        <g className="animate-fade-rise" style={{ animationDelay: '1.85s' }}>
          <text
            x="525"
            y="403"
            textAnchor="end"
            fontFamily="Inter, system-ui, sans-serif"
            fontSize="10"
            fontWeight="500"
            letterSpacing="1.8"
            fill="hsl(var(--muted-foreground))"
          >
            B · BAUORDNUNGSRECHT
          </text>
        </g>
        <g className="animate-fade-rise" style={{ animationDelay: '2.0s' }}>
          <text
            x="15"
            y="403"
            textAnchor="start"
            fontFamily="Inter, system-ui, sans-serif"
            fontSize="10"
            fontWeight="500"
            letterSpacing="1.8"
            fill="hsl(var(--muted-foreground))"
          >
            C · SONSTIGE VORGABEN
          </text>
        </g>
      </svg>
    </m.div>
  )
}
