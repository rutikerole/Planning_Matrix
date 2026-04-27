import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface SectionProps extends HTMLAttributes<HTMLElement> {
  bordered?: boolean
  tight?: boolean
}

export function Section({
  className,
  bordered,
  tight,
  ...props
}: SectionProps) {
  return (
    <section
      className={cn(
        'relative',
        tight ? 'py-16 md:py-24' : 'py-24 md:py-32 lg:py-40',
        bordered && 'border-t border-border',
        className,
      )}
      {...props}
    />
  )
}
