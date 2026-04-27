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
 * The form card itself — eyebrow, big serif headline, optional sub,
 * a hairline divider, then the form slot. No box, no shadow; on warm
 * paper the type does the work.
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
      <h1 className="font-display text-headline md:text-display-3 text-ink leading-[1.05] mb-4">
        {heading}
      </h1>
      {intro && (
        <p className="text-base text-ink/75 leading-relaxed mb-8 max-w-[26rem]">
          {intro}
        </p>
      )}
      <div
        aria-hidden="true"
        className="h-px w-16 bg-clay/55 mb-8"
      />
      {children}
    </div>
  )
}
