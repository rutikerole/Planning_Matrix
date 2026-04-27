import { useRef } from 'react'
import { m, useScroll, useTransform } from 'framer-motion'
import { Picture } from '@/components/shared/Picture'
import { cn } from '@/lib/utils'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

interface Props {
  /** Filename stem in /public/images/. */
  stem: string
  /** Paper-overlay opacity. Higher = more paper shows through. Default 0.88
   *  (≈ 12 % photo). Final CTA uses 0.75 for the loud "payoff" feel. */
  paperOpacity?: number
  /** Add a 5-px scroll-bound vertical drift. Opt in per section. */
  parallax?: boolean
  /** Tailwind class for object-position, e.g. 'object-center' or 'object-[60%_50%]'. */
  objectPosition?: string
  className?: string
}

/**
 * Atmospheric photo backdrop for a Section. Renders behind content at
 * `-z-10` with a tinted paper overlay on top. Sections themselves stay
 * unbg'd so the body's paper colour fills any unused stacking layer.
 */
export function SectionBackdrop({
  stem,
  paperOpacity = 0.88,
  parallax = false,
  objectPosition = 'object-center',
  className,
}: Props) {
  const reduced = usePrefersReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  })
  const y = useTransform(
    scrollYProgress,
    [0, 1],
    reduced || !parallax ? [0, 0] : [-5, 5],
  )

  return (
    <m.div
      ref={ref}
      style={{ y }}
      aria-hidden="true"
      className={cn(
        'absolute inset-0 -z-10 overflow-hidden pointer-events-none',
        className,
      )}
    >
      <Picture
        stem={stem}
        alt=""
        loading="lazy"
        sizes="100vw"
        className="absolute inset-0 w-full h-full"
        imgClassName={cn(
          'absolute inset-0 w-full h-full object-cover',
          objectPosition,
        )}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-paper"
        style={{ opacity: paperOpacity }}
      />
    </m.div>
  )
}
