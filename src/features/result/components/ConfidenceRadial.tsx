import type { Aggregate, SliceKey } from '../lib/qualifierAggregate'

interface Props {
  aggregate: Aggregate
  /** Render diameter in px. Default 240. */
  size?: number
}

/**
 * Phase 3.5 #63 — THE one new visual primitive permitted in this batch.
 *
 * Confidence radial: a doughnut chart showing project-wide qualifier
 * breakdown. Slice colors all from the locked palette — ink (DECIDED),
 * drafting-blue/65 (CALCULATED + VERIFIED merged into a single
 * "from-the-model" slice), clay (ASSUMED), ink/30 (UNKNOWN).
 *
 * The doughnut leaves a paper-color ring between slices for fine
 * separation, and a hollow center the caller can decorate with a
 * count + "Datenpunkte" label.
 *
 * Reduced-motion: instant render, no entrance animation.
 */
export function ConfidenceRadial({ aggregate, size = 240 }: Props) {
  const radius = size / 2
  const inner = radius * 0.62
  const center = radius

  // Compute slice fractions in canonical order. Preserves drawing order
  // so the same colour palette appears in the same band positions.
  const order: SliceKey[] = ['DECIDED', 'CALCULATED', 'VERIFIED', 'ASSUMED', 'UNKNOWN']
  const total = aggregate.total || 1

  let cumulative = 0
  const slices = order
    .map((k) => {
      const count = aggregate.counts[k]
      const fraction = count / total
      if (fraction === 0) return null
      const startAngle = cumulative * 2 * Math.PI - Math.PI / 2
      cumulative += fraction
      const endAngle = cumulative * 2 * Math.PI - Math.PI / 2
      return { key: k, count, fraction, startAngle, endAngle }
    })
    .filter((s): s is NonNullable<typeof s> => s !== null)

  // If aggregate is fully empty, render an empty ring.
  if (slices.length === 0) {
    return (
      <svg
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
        aria-hidden="true"
        data-pm-confidence-radial="true"
        className="text-clay/35 max-w-full h-auto"
      >
        <circle
          cx={center}
          cy={center}
          r={(radius + inner) / 2}
          fill="none"
          stroke="currentColor"
          strokeWidth={radius - inner}
          strokeOpacity="0.4"
          strokeDasharray="3 4"
        />
      </svg>
    )
  }

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      aria-hidden="true"
      data-pm-confidence-radial="true"
      className="max-w-full h-auto"
    >
      {slices.map((s) => (
        <path
          key={s.key}
          d={describeSlice(center, radius, inner, s.startAngle, s.endAngle)}
          fill={fillForSlice(s.key)}
          stroke="hsl(38 30% 97%)"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  )
}

function describeSlice(
  cx: number,
  rOuter: number,
  rInner: number,
  startAngle: number,
  endAngle: number,
): string {
  // Clamp angle to avoid overlap on a single full slice.
  const sweep = endAngle - startAngle
  const largeArc = sweep > Math.PI ? 1 : 0

  const x0 = cx + rOuter * Math.cos(startAngle)
  const y0 = cx + rOuter * Math.sin(startAngle)
  const x1 = cx + rOuter * Math.cos(endAngle)
  const y1 = cx + rOuter * Math.sin(endAngle)
  const x2 = cx + rInner * Math.cos(endAngle)
  const y2 = cx + rInner * Math.sin(endAngle)
  const x3 = cx + rInner * Math.cos(startAngle)
  const y3 = cx + rInner * Math.sin(startAngle)

  return [
    `M ${x0.toFixed(2)} ${y0.toFixed(2)}`,
    `A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`,
    `L ${x2.toFixed(2)} ${y2.toFixed(2)}`,
    `A ${rInner} ${rInner} 0 ${largeArc} 0 ${x3.toFixed(2)} ${y3.toFixed(2)}`,
    'Z',
  ].join(' ')
}

function fillForSlice(key: SliceKey): string {
  switch (key) {
    case 'DECIDED':
      return 'hsl(220 16% 11%)' // ink
    case 'CALCULATED':
      return 'hsl(212 38% 32% / 0.78)' // drafting-blue, deeper
    case 'VERIFIED':
      return 'hsl(212 38% 32% / 0.55)' // drafting-blue, lighter
    case 'ASSUMED':
      return 'hsl(25 30% 38%)' // clay
    case 'UNKNOWN':
    default:
      return 'hsl(220 16% 11% / 0.3)' // ink/30
  }
}
