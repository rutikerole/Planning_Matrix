import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { BlueprintGrid } from './shared'
import { CursorBloom } from './CursorBloom'
import { useReducedMotionPref } from '../hooks/useReducedMotionPref'
import { photos } from '../lib/photos'

const EASE = [0.16, 1, 0.3, 1] as const

export function Hero() {
  const { t } = useTranslation()
  const reduce = useReducedMotionPref()

  return (
    <section
      id="top"
      className="relative overflow-hidden bg-pm-paper pb-32 pt-32 sm:pb-40 sm:pt-36"
    >
      <BlueprintGrid />
      {/* Atmospheric warm-clay bloom (CSS only) */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/4 h-[640px] w-[640px] rounded-full opacity-40 blur-3xl"
        style={{
          background:
            'radial-gradient(circle, var(--pm-clay-bloom) 0%, transparent 60%)',
          mixBlendMode: 'multiply',
          animation: reduce ? 'none' : 'pm-bloom-drift 14s ease-in-out infinite',
        }}
      />
      <CursorBloom scope="hero" />

      <div className="relative mx-auto max-w-7xl px-6">
        <motion.div
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
          animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={{ duration: reduce ? 0.1 : 0.6, ease: EASE }}
        >
          <span className="font-mono text-[12px] uppercase tracking-[0.18em] text-pm-clay">
            {t('landing.hero.eyebrow')}
          </span>
        </motion.div>

        <motion.h1
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24 }}
          animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={{ duration: reduce ? 0.1 : 0.7, ease: EASE, delay: reduce ? 0 : 0.08 }}
          className="mt-6 font-serif text-[clamp(3rem,8vw,7rem)] leading-[0.92] tracking-tight text-pm-ink"
        >
          {t('landing.hero.h1.l1')}
          <br />
          <span className="italic text-pm-clay">{t('landing.hero.h1.l2')}</span>
        </motion.h1>

        <motion.p
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
          animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={{ duration: reduce ? 0.1 : 0.6, ease: EASE, delay: reduce ? 0 : 0.18 }}
          className="mt-8 max-w-2xl text-[1.1875rem] leading-relaxed text-pm-ink-mid"
        >
          {t('landing.hero.sub')}
        </motion.p>

        <motion.ul
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
          animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={{ duration: reduce ? 0.1 : 0.5, ease: EASE, delay: reduce ? 0 : 0.28 }}
          className="mt-10 flex flex-wrap gap-3"
        >
          {(['live', 'short', 'audit'] as const).map((k, i) => (
            <li
              key={k}
              className="flex items-center gap-2 rounded-full border border-pm-hair px-4 py-1.5 font-sans text-[13px] text-pm-ink-mid"
            >
              <span
                className={`block h-1.5 w-1.5 rounded-full bg-pm-clay ${
                  i === 0 ? 'animate-pm-pulse-clay' : ''
                }`}
                aria-hidden
              />
              {t(`landing.hero.meta.${k}`)}
            </li>
          ))}
        </motion.ul>

        <motion.div
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
          animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={{ duration: reduce ? 0.1 : 0.5, ease: EASE, delay: reduce ? 0 : 0.36 }}
          className="mt-12 flex flex-wrap gap-4"
        >
          <Link
            to="/sign-up"
            className="border border-pm-clay bg-pm-clay px-7 py-3 font-sans text-[15px] text-pm-paper transition-colors hover:bg-pm-clay-deep"
          >
            {t('landing.hero.cta1')}
          </Link>
          <a
            href="#chat"
            className="border border-pm-ink/30 px-7 py-3 font-sans text-[15px] text-pm-ink transition-colors hover:bg-pm-paper-deep/40"
          >
            {t('landing.hero.cta2')}
          </a>
        </motion.div>

        {/* 3-card stack — desktop only */}
        <div className="relative mt-20 hidden h-[480px] md:block">
          <CardA reduce={reduce} />
          <CardB reduce={reduce} />
          <CardC reduce={reduce} />
        </div>

        {/* Mobile fallback — single card */}
        <div className="mt-16 flex justify-center md:hidden">
          <CardB reduce={reduce} mobile />
        </div>
      </div>
    </section>
  )
}

function CardA({ reduce }: { reduce: boolean }) {
  return (
    <motion.div
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 30 }}
      whileInView={reduce ? { opacity: 0.9 } : { opacity: 0.9, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: reduce ? 0.1 : 0.7, ease: EASE }}
      className="absolute left-[6%] top-8 z-10 h-[280px] w-[420px] -rotate-3 overflow-hidden border border-pm-hair shadow-sm"
      style={{ scale: 0.92 }}
    >
      <img
        src={photos.hero}
        alt="Wohngebäude in Deutschland — Beispielmotiv"
        loading="lazy"
        decoding="async"
        width={420}
        height={280}
        className="h-full w-full object-cover"
      />
    </motion.div>
  )
}

function CardB({ reduce, mobile = false }: { reduce: boolean; mobile?: boolean }) {
  const { t } = useTranslation()
  const c = (key: string) => t(`landing.hero.card2.${key}`) as string
  const rows = [
    { k: c('row1Key'), v: c('row1Val'), tag: c('row1Tag'), accent: 'clay' as const },
    { k: c('row2Key'), v: c('row2Val'), tag: c('row2Tag'), accent: 'clay' as const },
    { k: c('row3Key'), v: c('row3Val'), tag: c('row3Tag'), accent: 'mute' as const },
  ]
  const recs = [c('rec1'), c('rec2'), c('rec3')]

  return (
    <motion.div
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 30 }}
      whileInView={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: reduce ? 0.1 : 0.7, ease: EASE, delay: reduce ? 0 : 0.15 }}
      className={`${
        mobile
          ? 'relative w-full max-w-[420px]'
          : 'absolute left-1/2 top-0 z-20 h-[360px] w-[460px] -translate-x-1/2 animate-pm-float-card'
      } border border-pm-hair bg-pm-paper-tint p-6 shadow-md`}
    >
      <div className="mb-5 font-mono text-[11px] uppercase tracking-[0.16em] text-pm-ink-mid">
        {c('title')}
      </div>
      <div className="space-y-3">
        {rows.map((r, i) => (
          <div
            key={i}
            className="flex items-baseline justify-between border-b border-pm-hair pb-2"
          >
            <span className="text-sm text-pm-ink-mid">{r.k}</span>
            <div className="flex items-center gap-3">
              <span className="font-serif text-base text-pm-ink">{r.v}</span>
              <span
                className={`font-mono text-[9px] uppercase tracking-wider ${
                  r.accent === 'clay' ? 'text-pm-clay' : 'text-pm-ink-mute2'
                }`}
              >
                {r.tag}
              </span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 border-t border-pm-hair pt-4">
        <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.18em] text-pm-clay">
          {c('topThree')}
        </div>
        <ol className="list-none space-y-2">
          {recs.map((item, i) => (
            <li key={i} className="flex items-baseline gap-3">
              <span className="font-mono text-xs text-pm-clay">0{i + 1}</span>
              <span className="text-sm text-pm-ink">{item}</span>
            </li>
          ))}
        </ol>
      </div>
    </motion.div>
  )
}

function CardC({ reduce }: { reduce: boolean }) {
  const { t } = useTranslation()
  return (
    <motion.div
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 30, rotate: 4 }}
      whileInView={reduce ? { opacity: 1 } : { opacity: 1, y: 0, rotate: 4 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: reduce ? 0.1 : 0.7, ease: EASE, delay: reduce ? 0 : 0.3 }}
      className="absolute right-[4%] top-24 z-30 h-[180px] w-[280px] border border-pm-hair p-5 shadow-md"
      style={{
        background:
          'linear-gradient(180deg, hsl(48 70% 88%) 0%, hsl(46 60% 84%) 100%)',
      }}
    >
      <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-pm-ink-mid">
        Note · 04.27
      </div>
      <p className="mt-4 font-serif text-[19px] italic leading-snug text-pm-ink-soft">
        {t('landing.hero.note')}
      </p>
    </motion.div>
  )
}
