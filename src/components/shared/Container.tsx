import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export function Container({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'mx-auto w-full max-w-[1240px] px-6 sm:px-8 md:px-10 lg:px-16',
        className,
      )}
      {...props}
    />
  )
}
