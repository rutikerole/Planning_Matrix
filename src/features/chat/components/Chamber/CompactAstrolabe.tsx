// Phase 7.8 §2.2 — CompactAstrolabe.
//
// A stripped 38 px progress dial used inside the new ConversationStrip
// (Manuscript direction). It is intentionally smaller and quieter than
// the legacy Astrolabe `compact` size (44 px with sigil ring + needle):
//
//   - Outer ring (0.5 px clay/55 hairline)
//   - Clay arc from 12 o'clock through (percent / 100) × 360°
//   - Italic Georgia percent number in the center (11 px)
//
// Drops, vs. the full Astrolabe:
//   - inner ring + 7 specialist sigils
//   - 22 turn ticks
//   - clay needle pointing at the current turn
//   - drag-to-scrub gesture (38 px is too small for the gesture; the
//     full astrolabe in StandUp keeps it)
//
// The component is purely visual — no click handler, no aria
// affordances beyond `aria-label`. It is decorative inside the strip.

import { useReducedMotion } from 'framer-motion'

interface Props {
  percent: number
  ariaLabel?: string
  /** Override the size if a different host needs it. Default 38 px. */
  size?: number
  /** Phase 7.9 §2.4 — when provided, the dial renders as a button
   *  and tapping it opens the StandUp overlay. */
  onClick?: () => void
}

export function CompactAstrolabe({ percent, ariaLabel, size = 38, onClick }: Props) {
  const reduced = useReducedMotion()

  const clamped = Math.max(0, Math.min(100, percent))
  const cx = size / 2
  const cy = size / 2
  const r = size * 0.46

  // Path math: arc from 12 o'clock clockwise through clamped/100 × 360°.
  // For a near-full circle we need the large-arc flag.
  const angleRad = (clamped / 100) * 2 * Math.PI
  const endX = cx + r * Math.sin(angleRad)
  const endY = cy - r * Math.cos(angleRad)
  const largeArc = clamped > 50 ? 1 : 0
  const arcPath =
    clamped <= 0
      ? ''
      : clamped >= 100
        ? `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.001} ${cy - r}`
        : `M ${cx} ${cy - r} A ${r} ${r} 0 ${largeArc} 1 ${endX} ${endY}`

  const Wrapper = onClick ? 'button' : 'div'
  const wrapperProps = onClick
    ? {
        type: 'button' as const,
        onClick,
        'aria-label': ariaLabel ?? `${clamped}%`,
      }
    : { role: 'img' as const, 'aria-label': ariaLabel ?? `${clamped}%` }

  return (
    <Wrapper
      {...wrapperProps}
      className={
        onClick
          ? 'relative shrink-0 select-none rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay/55 focus-visible:ring-offset-2 focus-visible:ring-offset-paper transition-transform duration-150 motion-safe:hover:scale-[1.04] motion-safe:active:scale-[0.96]'
          : 'relative shrink-0 select-none'
      }
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden="true"
        className="absolute inset-0"
      >
        {/* Outer hairline ring */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="rgba(123,92,63,0.55)"
          strokeWidth={0.5}
        />
        {/* Clay arc */}
        {arcPath && (
          <path
            d={arcPath}
            fill="none"
            stroke="hsl(var(--clay))"
            strokeWidth={1.5}
            strokeLinecap="round"
            style={{
              transition: reduced
                ? 'none'
                : 'd 600ms cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          />
        )}
      </svg>
      {/* Center percent */}
      <span
        className="absolute inset-0 grid place-items-center font-serif italic text-ink tabular-figures leading-none"
        style={{
          fontFamily: "Georgia, 'Instrument Serif', serif",
          fontSize: 11,
        }}
      >
        {clamped}
      </span>
    </Wrapper>
  )
}
