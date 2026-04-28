import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface Props {
  eyebrow: string
  /** Headline — may include JSX (e.g. an italic-serif accent word). */
  heading: ReactNode
  /** Optional sub-headline beneath the headline. */
  intro?: ReactNode
  children: ReactNode
  className?: string
}

/**
 * Phase 3.3 #49 — auth form card in atelier register.
 *
 *   ATELIER · ANMELDUNG               ← eyebrow (Inter 11 0.22em via .eyebrow)
 *   Willkommen zurück.                 ← Instrument Serif clamp(36,5vw,48), period in clay
 *   Setzen Sie Ihre Arbeit fort.       ← italic Serif 16 ink/65
 *   ────                               ← w-12 hairline ink/15
 *   {form}
 */
export function AuthCard({
  eyebrow,
  heading,
  intro,
  children,
  className,
}: Props) {
  return (
    <div className={cn('w-full max-w-[28rem]', className)}>
      <p className="eyebrow inline-flex items-center mb-5 text-foreground/65">
        <span className="accent-dot" aria-hidden="true" />
        {eyebrow}
      </p>
      <h1 className="font-display text-[clamp(36px,5vw,48px)] text-ink leading-[1.05] -tracking-[0.02em] mb-4">
        {heading}
      </h1>
      {intro && (
        <p className="font-serif italic text-[15px] sm:text-[16px] text-ink/65 leading-relaxed mb-7 max-w-[26rem]">
          {intro}
        </p>
      )}
      <div aria-hidden="true" className="h-px w-12 bg-ink/15 mb-8" />
      {children}
    </div>
  )
}
