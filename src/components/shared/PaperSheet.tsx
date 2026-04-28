import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface Props {
  children: ReactNode
  className?: string
  /** Padding scale. lg = px-12 py-14 (chat workspace), md = px-8 py-10
   *  (wizard, default), sm = px-6 py-8 (mobile or nested sheets). */
  padded?: 'lg' | 'md' | 'sm'
  /** Pulls the responsive max-width default off so the caller can size
   *  the sheet to whatever container it lives in. */
  fluid?: boolean
}

const PADDING: Record<NonNullable<Props['padded']>, string> = {
  lg: 'px-8 sm:px-12 pt-10 sm:pt-14 pb-12 sm:pb-14',
  md: 'px-6 sm:px-8 pt-8 sm:pt-10 pb-10',
  sm: 'px-5 sm:px-6 py-6 sm:py-8',
}

/**
 * Phase 3.3 #48 — paper-sheet chrome primitive shared between the chat
 * workspace's PaperCard, the wizard's question wrapper, and (in
 * future) any other surface that needs to read as "paper sitting on
 * paper." Just the chrome — no project-coupled title block, no
 * north-arrow placement, no specific content.
 *
 * Visuals locked:
 *   • bg-paper
 *   • 1px ink/12 hairline border
 *   • rounded-[2px] (no soft corners — this is paper)
 *   • inset white-edge highlight + soft 1px paper-on-paper drop shadow
 *   • paper-grain overlay at 8% (subtly stronger than the page's 4%
 *     so the sheet's substrate reads as a distinct layer)
 *   • responsive max-w-2xl out-of-the-box (override with className when
 *     a different width is required)
 */
export function PaperSheet({ children, className, padded = 'md', fluid = false }: Props) {
  return (
    <div
      className={cn(
        'relative bg-paper border border-ink/12 rounded-[2px]',
        !fluid && 'mx-auto max-w-2xl',
        PADDING[padded],
        className,
      )}
      style={{
        boxShadow:
          'inset 0 1px 0 hsl(0 0% 100% / 0.6), 0 1px 0 rgba(0,0,0,0.04), 0 8px 32px -12px rgba(20,15,8,0.08)',
      }}
    >
      {/* Sheet-level paper grain — slightly stronger than the page tint
       * so the sheet reads as paper-on-paper. Multiply blend keeps it
       * tonal, not chromatic. */}
      <span
        aria-hidden="true"
        className="absolute inset-0 rounded-[2px] pointer-events-none opacity-[0.08] mix-blend-multiply"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='256' height='256'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.6 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
          imageRendering: 'pixelated',
        }}
      />
      <div className="relative">{children}</div>
    </div>
  )
}
