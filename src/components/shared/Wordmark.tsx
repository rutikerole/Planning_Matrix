import { cn } from '@/lib/utils'

interface Props {
  className?: string
  size?: 'sm' | 'lg'
  asLink?: boolean
}

/**
 * 2×2 matrix monogram — the visual essence of Planning Matrix:
 * a four-quadrant grid with the bottom-right cell filled clay,
 * reading as "the system has mapped a position." Hairline ink
 * outlines on the other three cells.
 */
function MatrixMonogram({ size }: { size: 'sm' | 'lg' }) {
  const px = size === 'sm' ? 18 : 22
  return (
    <svg
      viewBox="0 0 22 22"
      width={px}
      height={px}
      aria-hidden="true"
      className="shrink-0"
    >
      {/* Top-left */}
      <rect
        x="1.5"
        y="1.5"
        width="8"
        height="8"
        fill="none"
        stroke="hsl(var(--ink))"
        strokeOpacity="0.85"
        strokeWidth="1.1"
      />
      {/* Top-right */}
      <rect
        x="12.5"
        y="1.5"
        width="8"
        height="8"
        fill="none"
        stroke="hsl(var(--ink))"
        strokeOpacity="0.85"
        strokeWidth="1.1"
      />
      {/* Bottom-left */}
      <rect
        x="1.5"
        y="12.5"
        width="8"
        height="8"
        fill="none"
        stroke="hsl(var(--ink))"
        strokeOpacity="0.85"
        strokeWidth="1.1"
      />
      {/* Bottom-right — the "answered" cell, filled clay */}
      <rect
        x="12.5"
        y="12.5"
        width="8"
        height="8"
        fill="hsl(var(--clay))"
      />
    </svg>
  )
}

export function Wordmark({ className, size = 'sm', asLink = true }: Props) {
  const inner = (
    <span
      className={cn(
        'inline-flex items-center gap-2.5 text-ink select-none',
        className,
      )}
      aria-label="Planning Matrix"
    >
      <MatrixMonogram size={size} />
      <span
        className={cn(
          'leading-none tracking-[-0.012em]',
          size === 'sm' ? 'text-[16px]' : 'text-[20px]',
        )}
      >
        <span className="font-sans font-medium">Planning</span>{' '}
        <span className="font-serif italic font-normal -ml-0.5">Matrix</span>
      </span>
    </span>
  )

  if (asLink) {
    return (
      <a
        href="/"
        className="inline-flex items-center rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-4 focus-visible:ring-offset-background"
      >
        {inner}
      </a>
    )
  }
  return inner
}
