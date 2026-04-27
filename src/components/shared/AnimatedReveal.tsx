import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

interface Props {
  children: ReactNode
  delay?: number
  y?: number
  duration?: number
  className?: string
  as?: 'div' | 'span' | 'li'
}

const EASE_CALM = [0.16, 1, 0.3, 1] as const

export function AnimatedReveal({
  children,
  delay = 0,
  y = 14,
  duration = 0.7,
  className,
  as = 'div',
}: Props) {
  const reduced = useReducedMotion()

  if (reduced) {
    if (as === 'span') return <span className={className}>{children}</span>
    if (as === 'li') return <li className={className}>{children}</li>
    return <div className={className}>{children}</div>
  }

  const Component =
    as === 'span' ? motion.span : as === 'li' ? motion.li : motion.div

  return (
    <Component
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration, delay, ease: EASE_CALM }}
    >
      {children}
    </Component>
  )
}
