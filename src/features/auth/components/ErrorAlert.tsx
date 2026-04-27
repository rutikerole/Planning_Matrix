import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface Props {
  children: ReactNode
  className?: string
}

/**
 * Top-of-form server error display. role="alert" + aria-atomic so
 * screen readers announce the message when it appears. Calm hairline
 * left-border in clay; no red, no icon, matches the per-field error
 * treatment so the page reads as one tone of voice.
 */
export function ErrorAlert({ children, className }: Props) {
  return (
    <div
      role="alert"
      aria-atomic="true"
      className={cn(
        'border-l-2 border-clay pl-3.5 py-2 text-sm text-ink/85',
        className,
      )}
    >
      {children}
    </div>
  )
}
