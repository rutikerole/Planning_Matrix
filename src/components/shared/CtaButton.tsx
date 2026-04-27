import type { ReactNode } from 'react'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'ghost'

interface Props {
  href: string
  variant?: Variant
  external?: boolean
  className?: string
  children: ReactNode
  ariaLabel?: string
}

const SIZE = 'h-11'

export function CtaButton({
  href,
  variant = 'primary',
  external,
  className,
  children,
  ariaLabel,
}: Props) {
  const isMail = href.startsWith('mailto:')

  return (
    <a
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      aria-label={ariaLabel}
      className={cn(
        'group inline-flex items-center gap-2 text-[14px] font-medium tracking-tight transition-[background-color,color,box-shadow,transform] duration-soft ease-soft',
        SIZE,
        variant === 'primary' &&
          'rounded-[5px] bg-ink px-5 text-paper hover:bg-ink/92 shadow-[0_1px_0_hsl(var(--paper)/0.05)_inset,0_2px_4px_-1px_hsl(220_15%_11%/0.18)] hover:shadow-[0_1px_0_hsl(var(--paper)/0.05)_inset,0_8px_18px_-6px_hsl(220_15%_11%/0.32)] motion-safe:hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        variant === 'ghost' &&
          'text-ink hover:text-clay focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm',
        className,
      )}
    >
      <span>{children}</span>
      <ArrowRight
        aria-hidden="true"
        className={cn(
          'shrink-0 transition-transform duration-soft ease-soft group-hover:translate-x-0.5',
          variant === 'primary' ? 'size-4 -mr-1' : 'size-[14px]',
          isMail && variant === 'primary' && 'group-hover:translate-x-1',
        )}
      />
    </a>
  )
}
