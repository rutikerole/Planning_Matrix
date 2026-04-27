import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

interface Props {
  /** Plain text question / framing, e.g. "Already registered?". */
  prompt: string
  /** Link label, e.g. "Sign in". */
  linkLabel: string
  /** Internal route to navigate to. */
  to: string
  className?: string
  children?: ReactNode
}

/**
 * Cross-page link block under each auth form: "Already registered?
 * Sign in", etc. Restrained, single-line, matches the muted-foreground
 * register so it never competes with the primary CTA.
 */
export function AuthFooter({
  prompt,
  linkLabel,
  to,
  className,
  children,
}: Props) {
  return (
    <p
      className={cn(
        'mt-10 text-sm text-ink/60',
        className,
      )}
    >
      {prompt}{' '}
      <Link
        to={to}
        className="font-medium text-ink/85 underline underline-offset-4 decoration-clay/55 hover:decoration-clay hover:text-ink transition-colors duration-soft rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        {linkLabel}
      </Link>
      {children}
    </p>
  )
}
