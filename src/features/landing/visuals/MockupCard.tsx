import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface Props {
  children: ReactNode
  className?: string
}

/**
 * Glass-paper card used for the three product mockups.
 * Subtle ink shadow + faint border + backdrop blur — sits like a slice
 * of the product UI floating on the warm paper background.
 */
export function MockupCard({ children, className }: Props) {
  return (
    <div
      className={cn(
        'relative w-full max-w-[340px] mx-auto rounded-lg border border-border-strong/45 bg-paper/85 backdrop-blur-md',
        'shadow-[0_1px_2px_hsl(220_15%_11%/0.04),0_14px_32px_-12px_hsl(220_15%_11%/0.08)]',
        'p-5 md:p-6',
        className,
      )}
    >
      {children}
    </div>
  )
}
