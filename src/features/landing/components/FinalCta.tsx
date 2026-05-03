import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useReducedMotionPref } from '../hooks/useReducedMotionPref'

const EASE = [0.16, 1, 0.3, 1] as const

export function FinalCTA() {
  const { t } = useTranslation()
  const reduce = useReducedMotionPref()
  const [count, setCount] = useState(47)
  const [bloomTick, setBloomTick] = useState(0)

  useEffect(() => {
    if (reduce) return
    let cancelled = false
    function schedule() {
      const ms = 4000 + Math.random() * 1000
      window.setTimeout(() => {
        if (cancelled) return
        if (document.hidden) {
          schedule()
          return
        }
        setCount((c) => Math.min(c + 1, 999))
        setBloomTick((b) => b + 1)
        schedule()
      }, ms)
    }
    schedule()
    return () => {
      cancelled = true
    }
  }, [reduce])

  return (
    <section
      id="cta"
      className="relative overflow-hidden bg-pm-dark py-32 text-pm-dark-paper"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-50"
        style={{
          background:
            'linear-gradient(to right, transparent, var(--pm-clay-bloom), transparent)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-[10%] top-[20%] h-[480px] w-[480px] rounded-full opacity-40 blur-3xl"
        style={{
          background:
            'radial-gradient(circle, var(--pm-clay-bloom) 0%, transparent 60%)',
          animation: reduce ? 'none' : 'pm-bloom-drift 14s ease-in-out infinite',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-[10%] right-[10%] h-[420px] w-[420px] rounded-full opacity-30 blur-3xl"
        style={{
          background:
            'radial-gradient(circle, var(--pm-clay-glow) 0%, transparent 60%)',
          animation: reduce
            ? 'none'
            : 'pm-bloom-drift 18s ease-in-out infinite reverse',
        }}
      />

      <div className="relative mx-auto max-w-3xl px-6 text-center">
        <motion.div
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
          whileInView={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: reduce ? 0.1 : 0.6, ease: EASE }}
          className="font-mono text-[12px] uppercase tracking-[0.22em] text-pm-clay-bloom"
        >
          {t('landing.cta.eyebrow')}
        </motion.div>

        <motion.h2
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24 }}
          whileInView={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{
            duration: reduce ? 0.1 : 0.7,
            ease: EASE,
            delay: reduce ? 0 : 0.08,
          }}
          className="mt-5 font-serif text-[clamp(2.5rem,6vw,5rem)] leading-[0.98] tracking-tight text-pm-dark-paper"
        >
          {t('landing.cta.h.l1')}
          <br />
          <span className="italic text-pm-clay-bloom">
            {t('landing.cta.h.l2')}
          </span>
        </motion.h2>

        <motion.p
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
          whileInView={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{
            duration: reduce ? 0.1 : 0.6,
            ease: EASE,
            delay: reduce ? 0 : 0.18,
          }}
          className="mx-auto mt-6 max-w-xl font-sans text-[1.0625rem] leading-relaxed text-pm-dark-mute"
        >
          {t('landing.cta.sub')}
        </motion.p>

        <div className="mt-10 flex items-center justify-center gap-3">
          <span
            className="block h-1.5 w-1.5 rounded-full bg-pm-clay-bloom animate-pm-pulse-clay"
            aria-hidden
          />
          <span className="font-mono text-[13px] text-pm-dark-mute">
            {t('landing.cta.live')}
          </span>
          <motion.span
            key={bloomTick}
            initial={
              reduce ? false : { boxShadow: '0 0 0 0 var(--pm-clay-bloom)' }
            }
            animate={
              reduce ? undefined : { boxShadow: '0 0 0 24px transparent' }
            }
            transition={{ duration: reduce ? 0 : 0.6, ease: 'easeOut' }}
            className="rounded-full px-2 font-mono text-[14px] text-pm-clay-bloom"
            aria-live="polite"
          >
            {count}
          </motion.span>
          <span className="font-mono text-[13px] text-pm-dark-mute">
            {t('landing.cta.liveSuffix')}
          </span>
        </div>

        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link
            to="/sign-up"
            className="border border-pm-clay bg-pm-clay px-7 py-3 font-sans text-[15px] text-pm-paper transition-colors hover:bg-pm-clay-deep"
          >
            {t('landing.cta.cta1')}
          </Link>
          <a
            href="#chat"
            className="border border-pm-dark-paper/40 px-7 py-3 font-sans text-[15px] text-pm-dark-paper transition-colors hover:bg-pm-dark-soft"
          >
            {t('landing.cta.cta2')}
          </a>
        </div>
      </div>
    </section>
  )
}
