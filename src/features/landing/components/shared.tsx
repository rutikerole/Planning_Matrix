import type { ReactNode, HTMLAttributes } from 'react'
import { motion } from 'framer-motion'
import { useReducedMotionPref } from '../hooks/useReducedMotionPref'

type Tone = 'paper' | 'dark'

export function Eyebrow({
  children,
  tone = 'paper',
  className = '',
}: {
  children: ReactNode
  tone?: Tone
  className?: string
}) {
  const color =
    tone === 'dark' ? 'text-pm-clay-bloom' : 'text-pm-clay'
  return (
    <span
      className={`font-mono text-[11px] uppercase tracking-[0.18em] ${color} ${className}`}
    >
      {children}
    </span>
  )
}

/** Inline italic span for the second display line. Instrument Serif italic. */
export function Ital({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return <span className={`italic ${className}`}>{children}</span>
}

export function SectionHead({
  eyebrow,
  l1,
  l2,
  sub,
  align = 'center',
  tone = 'paper',
  maxWidth = 'max-w-3xl',
}: {
  eyebrow?: string
  l1: string
  l2?: string
  sub?: string
  align?: 'left' | 'center'
  tone?: Tone
  maxWidth?: string
}) {
  const headColor = tone === 'dark' ? 'text-pm-dark-paper' : 'text-pm-ink'
  const subColor = tone === 'dark' ? 'text-pm-dark-mute' : 'text-pm-ink-mid'
  const claySpan = tone === 'dark' ? 'text-pm-clay-bloom' : 'text-pm-clay'
  const alignClass =
    align === 'center' ? 'text-center mx-auto items-center' : 'text-left items-start'
  return (
    <FadeRise>
      <div className={`flex flex-col ${alignClass} ${maxWidth} ${align === 'center' ? 'mx-auto' : ''}`}>
        {eyebrow ? (
          <Eyebrow tone={tone} className="mb-5">
            {eyebrow}
          </Eyebrow>
        ) : null}
        <h2
          className={`font-serif text-[clamp(2.5rem,5.5vw,4.5rem)] leading-[0.98] tracking-tight ${headColor}`}
        >
          {l1}
          {l2 ? (
            <>
              <br />
              <span className={`italic ${claySpan}`}>{l2}</span>
            </>
          ) : null}
        </h2>
        {sub ? (
          <p
            className={`mt-6 max-w-2xl text-[1.0625rem] leading-relaxed ${subColor}`}
          >
            {sub}
          </p>
        ) : null}
      </div>
    </FadeRise>
  )
}

/**
 * Reveal-on-view: opacity + small y-shift, 600 ms cap. Reduced-motion
 * collapses to instant 100 ms opacity-only.
 */
export function FadeRise({
  children,
  delay = 0,
  className = '',
  as = 'div',
  amount = 0.25,
}: {
  children: ReactNode
  delay?: number
  className?: string
  as?: 'div' | 'section' | 'article'
  amount?: number
}) {
  const reduce = useReducedMotionPref()
  const Tag = motion[as] as typeof motion.div
  return (
    <Tag
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 18 }}
      whileInView={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount }}
      transition={{
        duration: reduce ? 0.1 : 0.6,
        delay: reduce ? 0 : delay,
        ease: [0.16, 1, 0.3, 1],
      }}
      className={className}
    >
      {children}
    </Tag>
  )
}

/** Decorative blueprint grid background — fixed, subtle, full-section. */
export function BlueprintGrid({
  className = '',
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 opacity-[0.045] ${className}`}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24'><path d='M 24 0 L 0 0 L 0 24' fill='none' stroke='%23161310' stroke-width='1'/></svg>\")",
        backgroundSize: '24px 24px',
      }}
    />
  )
}
