import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { AnimatedReveal } from './AnimatedReveal'

interface Props {
  eyebrow: string
  heading: ReactNode
  sub?: ReactNode
  align?: 'left' | 'center'
  asH1?: boolean
  className?: string
  withDot?: boolean
}

export function SectionHeader({
  eyebrow,
  heading,
  sub,
  align = 'left',
  asH1 = false,
  className,
  withDot = true,
}: Props) {
  const Heading = asH1 ? 'h1' : 'h2'
  return (
    <div
      className={cn(
        'flex flex-col gap-6 max-w-3xl',
        align === 'center' && 'mx-auto text-center items-center',
        className,
      )}
    >
      <AnimatedReveal>
        <p
          className={cn(
            'eyebrow inline-flex items-center',
            align === 'center' && 'justify-center',
          )}
        >
          {withDot && <span className="accent-dot" aria-hidden="true" />}
          {eyebrow}
        </p>
      </AnimatedReveal>
      <AnimatedReveal delay={0.06}>
        <Heading className="font-display text-headline md:text-display-3 text-ink">
          {heading}
        </Heading>
      </AnimatedReveal>
      {sub && (
        <AnimatedReveal delay={0.14}>
          <p
            className={cn(
              'text-body-lg text-muted-foreground max-w-xl',
              align === 'center' && 'mx-auto',
            )}
          >
            {sub}
          </p>
        </AnimatedReveal>
      )}
    </div>
  )
}
