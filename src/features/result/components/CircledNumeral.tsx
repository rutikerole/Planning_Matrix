interface Props {
  /** 1, 2, or 3 — extends to higher digits but the brief asks only for ①②③. */
  n: number
  /** Render at this px size (default 56). */
  size?: number
  className?: string
}

/**
 * Phase 3.5 #61 — custom circled numerals for the Top-3 hero treatment.
 *
 * Per the brief: NOT a Unicode `①②③` glyph — match the hand-drawn
 * aesthetic. Drawing is an italic Serif numeral inside a hand-drawn
 * circle with sub-pixel deviations baked into the path data (same
 * technique as the specialist sigils).
 *
 * Stroke colour inherited from `currentColor`; the numeral inside
 * uses the page's clay-deep token. Default size 56 — large enough
 * to dominate the recommendation card.
 */
export function CircledNumeral({ n, size = 56, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={['shrink-0 text-clay-deep/85', className].filter(Boolean).join(' ')}
    >
      {/* Hand-drawn circle — three slightly-overlapping arcs with
       * sub-pixel deviation rather than a single mathematical circle.
       * Draws as one continuous path. */}
      <path d="M 32 4.4 C 47.4 4 60.1 16.7 59.6 32.2 C 60.0 47.5 47.6 60.3 32.1 59.8 C 16.6 60.2 3.9 47.6 4.3 32.0 C 4.0 16.7 16.4 4.0 32 4.4 Z" />
      {/* Italic Serif numeral inside — Georgia is a stable italic
       * fallback when Instrument Serif TTFs aren't deployed. */}
      <text
        x="32"
        y="44"
        fontFamily="Georgia, 'Instrument Serif', serif"
        fontStyle="italic"
        fontWeight="500"
        fontSize="40"
        textAnchor="middle"
        fill="hsl(25 32% 28%)"
        stroke="none"
      >
        {n}
      </text>
    </svg>
  )
}
