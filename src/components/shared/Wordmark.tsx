import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

interface Props {
  className?: string
  /** Phase 3.3 #50 — three sizes:
   *   xs  → 14px glyph + 12px lockup (chat workspace left rail)
   *   sm  → 16px glyph + 14px lockup (mobile top bar)
   *   md  → 18px glyph + 16px lockup (default — dashboard, wizard, auth)
   */
  size?: 'xs' | 'sm' | 'md'
  /** Glyph color tone. `ink` is the default; `drafting-blue` lifts the
   *  glyph to drafting-blue 85% (used on the dashboard hero context to
   *  sell the atelier register immediately). The wordmark text stays
   *  ink in both cases. */
  tone?: 'ink' | 'drafting-blue'
  /** When true (default), wraps the lockup in a router link. */
  asLink?: boolean
  /** Link target. Defaults to `/` (landing). Pass `/dashboard` on
   *  post-login surfaces so the logo never bounces an authed user
   *  back to marketing. */
  to?: string
}

const SIZE: Record<NonNullable<Props['size']>, { glyph: number; text: string }> = {
  xs: { glyph: 14, text: 'text-[12px]' },
  sm: { glyph: 16, text: 'text-[14px]' },
  md: { glyph: 18, text: 'text-[16px]' },
}

/**
 * Phase 3.3 #50 — wordmark refinement.
 *
 * The 4-square monogram is replaced with a tiny axonometric building
 * glyph: a simple isometric cube viewed from above-left, with a faint
 * ground-shadow hairline. Hand-drawn-feeling via baked sub-pixel
 * deviations in the path data — same technique as the Phase 3.2
 * specialist sigils, no live `feTurbulence`.
 *
 * Typography: Inter "Planning" 500 + Instrument Serif italic "Matrix"
 * 500 sit at the same optical weight despite different proportions.
 * Letter-spacing tightens to -0.005em; OpenType features inherit from
 * the body rule.
 */
function AxonometricBuildingGlyph({
  px,
  tone,
}: {
  px: number
  tone: 'ink' | 'drafting-blue'
}) {
  return (
    <svg
      viewBox="0 0 16 16"
      width={px}
      height={px}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn(
        'shrink-0',
        tone === 'drafting-blue' ? 'text-drafting-blue/85' : 'text-ink/85',
      )}
    >
      {/* Front face — parallelogram */}
      <path d="M 3 8 L 10.05 7.95 L 10 14 L 3 14 Z" />
      {/* Right face — parallelogram */}
      <path d="M 10.05 7.95 L 12.85 5.1 L 13 11 L 10 14 Z" />
      {/* Top face — parallelogram */}
      <path d="M 3 8 L 6 5 L 12.85 5.1 L 10.05 7.95 Z" />
      {/* Ground shadow — short dashed line */}
      <path
        d="M 1 15 L 12 15"
        strokeOpacity="0.35"
        strokeDasharray="2 2"
        strokeWidth="0.85"
      />
    </svg>
  )
}

export function Wordmark({
  className,
  size = 'md',
  tone = 'ink',
  asLink = true,
  to = '/',
}: Props) {
  const dims = SIZE[size]
  const inner = (
    <span
      className={cn(
        'inline-flex items-center gap-2 text-ink select-none',
        className,
      )}
      aria-label="Planning Matrix"
    >
      <AxonometricBuildingGlyph px={dims.glyph} tone={tone} />
      <span
        className={cn(
          'leading-none tracking-[-0.005em]',
          dims.text,
        )}
      >
        <span className="font-sans font-medium">Planning</span>{' '}
        <span className="font-serif italic font-medium -ml-0.5">Matrix</span>
      </span>
    </span>
  )

  if (asLink) {
    return (
      <Link
        to={to}
        className="inline-flex items-center rounded-sm transition-colors duration-soft hover:text-ink/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-4 focus-visible:ring-offset-background"
      >
        {inner}
      </Link>
    )
  }
  return inner
}
