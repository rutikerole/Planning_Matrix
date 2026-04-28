// ───────────────────────────────────────────────────────────────────────
// Phase 3.7 #78 — Architectural scale bar
//
// Replaces the inline thin-line + ticks element that used to render
// alongside the cover-hero axonometric. A real architect's scale bar
// has alternating ink/paper segments (like a ruler), tick marks at
// each segment boundary extending below the bar, and numerical labels
// underneath.
//
//   M 1:100   ┃▓▓▓▓┃    ┃▓▓▓▓┃    ┃▓▓▓▓┃    ┃▓▓▓▓┃
//             0    1    2    3    4 m
// ───────────────────────────────────────────────────────────────────────

import { cn } from '@/lib/utils'

interface Props {
  /** Drawing scale label. Defaults to "M 1:100". */
  label?: string
  /** Number of segments. Defaults to 4 (covering 0–4 m). */
  segments?: number
  /** Width of one segment in pixels. */
  segmentWidth?: number
  /** Bar thickness. */
  barHeight?: number
  className?: string
  /** Hide the numerical labels (compact variant). */
  compactLabels?: boolean
  /**
   * Phase 3.7 #78 follow-up — Tailwind classes overriding the label's
   * size + color. Used by IntentAxonometricXL to render the cover-hero
   * variant at 15 px ink/80 instead of the default 11 px clay/72.
   */
  labelTextClass?: string
}

export function ScaleBar({
  label = 'M 1:100',
  segments = 4,
  segmentWidth = 22,
  barHeight = 6,
  className,
  compactLabels,
  labelTextClass,
}: Props) {
  const totalWidth = segmentWidth * segments
  const tickHeight = 4
  const labelOffset = 9
  const svgHeight = barHeight + tickHeight + (compactLabels ? 0 : labelOffset)

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 select-none',
        // Default tone — overridden by labelTextClass when provided.
        !labelTextClass && 'text-clay/72',
        className,
      )}
      role="img"
      aria-label={label}
    >
      <span
        className={cn(
          'font-serif italic tabular-figures whitespace-nowrap',
          labelTextClass ?? 'text-[11px]',
        )}
      >
        {label}
      </span>
      <svg
        width={totalWidth + 2}
        height={svgHeight + 2}
        viewBox={`0 0 ${totalWidth + 2} ${svgHeight + 2}`}
        fill="none"
        aria-hidden="true"
      >
        {/* Alternating fill segments — ink for even, paper for odd. */}
        {Array.from({ length: segments }, (_, i) => (
          <rect
            key={i}
            x={1 + i * segmentWidth}
            y={1}
            width={segmentWidth}
            height={barHeight}
            fill={i % 2 === 0 ? 'currentColor' : 'transparent'}
            stroke="currentColor"
            strokeWidth="0.6"
          />
        ))}
        {/* Tick marks at each boundary. */}
        {Array.from({ length: segments + 1 }, (_, i) => (
          <line
            key={i}
            x1={1 + i * segmentWidth}
            y1={1 + barHeight}
            x2={1 + i * segmentWidth}
            y2={1 + barHeight + tickHeight}
            stroke="currentColor"
            strokeWidth="0.6"
            strokeLinecap="round"
          />
        ))}
        {/* Numerical labels — 0 1 2 3 4 m */}
        {!compactLabels &&
          Array.from({ length: segments + 1 }, (_, i) => (
            <text
              key={i}
              x={1 + i * segmentWidth}
              y={1 + barHeight + tickHeight + labelOffset - 1}
              fontSize="7.5"
              fontFamily="'Inter', system-ui, sans-serif"
              fill="currentColor"
              textAnchor={i === segments ? 'end' : i === 0 ? 'start' : 'middle'}
              opacity="0.75"
            >
              {i === segments ? `${i} m` : i}
            </text>
          ))}
      </svg>
    </div>
  )
}
