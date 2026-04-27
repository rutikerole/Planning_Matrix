import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { HairlineDivider } from './HairlineDivider'

interface SectionProps extends HTMLAttributes<HTMLElement> {
  bordered?: boolean
  tight?: boolean
}

export function Section({
  className,
  bordered,
  tight,
  children,
  ...props
}: SectionProps) {
  return (
    <section
      className={cn(
        'relative',
        tight ? 'py-16 md:py-24' : 'py-24 md:py-32 lg:py-40',
        className,
      )}
      {...props}
    >
      {bordered && <HairlineDivider />}
      {children}
    </section>
  )
}
