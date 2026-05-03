import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'framer-motion'
import { SectionHead, FadeRise } from './shared'
import { photos } from '../lib/photos'
import { useReducedMotionPref } from '../hooks/useReducedMotionPref'

const EASE = [0.16, 1, 0.3, 1] as const

/* §7.3 audit log lines — verbatim, formal, no softening. */
const AUDIT_LOG = [
  '[2026-04-27 14:32:08]  fact_added         plot.flst         CLIENT/VERIFIED',
  '[2026-04-27 14:32:14]  area_state         A → ACTIVE        BauGB § 34',
  '[2026-04-27 14:32:21]  rec_upserted       R-01              rank 1',
  '[2026-04-27 14:32:35]  qualifier_changed  proc.type         LEGAL/CALCULATED',
  '[2026-04-27 14:32:42]  fact_added         baurecht.gk       LEGAL/CALCULATED',
  '[2026-04-27 14:32:51]  rec_upserted       R-02              rank 2',
  '[2026-04-27 14:33:04]  area_state         B → ACTIVE        BayBO Art. 58',
  '[2026-04-27 14:33:18]  rec_upserted       R-03              rank 3',
  '[2026-04-27 14:33:31]  fact_added         stellplatz.req    AUTHORITY/VERIFIED',
  '[2026-04-27 14:33:47]  area_state         C → ACTIVE        Erlangen StPS',
] as const

export function Trust() {
  const { t } = useTranslation()
  return (
    <section id="trust" className="bg-pm-paper py-32">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHead
          eyebrow={t('landing.trust.eyebrow')}
          l1={t('landing.trust.h.l1')}
          l2={t('landing.trust.h.l2')}
          sub={t('landing.trust.sub')}
          align="left"
          maxWidth="max-w-3xl"
        />

        <div className="mt-16 grid grid-cols-1 gap-4 md:auto-rows-[180px] md:grid-cols-12">
          <FadeRise className="md:col-span-7 md:row-span-2">
            <Terminal label={t('landing.trust.t1.label')} h={t('landing.trust.t1.h')} p={t('landing.trust.t1.p')} />
          </FadeRise>
          <FadeRise delay={0.06} className="md:col-span-5">
            <Plain label={t('landing.trust.t2.label')} h={t('landing.trust.t2.h')} p={t('landing.trust.t2.p')} />
          </FadeRise>
          <FadeRise delay={0.12} className="md:col-span-5">
            <Photo
              src={photos.trust}
              alt={t('landing.trust.t3.alt')}
              label={t('landing.trust.t3.label')}
              h={t('landing.trust.t3.h')}
              p={t('landing.trust.t3.p')}
            />
          </FadeRise>
          <FadeRise delay={0.18} className="md:col-span-4">
            <BigStat h={t('landing.trust.t4.h')} p={t('landing.trust.t4.p')} />
          </FadeRise>
          <FadeRise delay={0.22} className="md:col-span-4">
            <Plain label={t('landing.trust.t5.label')} h={t('landing.trust.t5.h')} />
          </FadeRise>
          <FadeRise delay={0.26} className="md:col-span-4">
            <Plain label={t('landing.trust.t6.label')} h={t('landing.trust.t6.h')} />
          </FadeRise>
        </div>
      </div>
    </section>
  )
}

function Terminal({ label, h, p }: { label: string; h: string; p: string }) {
  const reduce = useReducedMotionPref()
  const [lines, setLines] = useState<{ id: number; text: string }[]>(
    AUDIT_LOG.slice(0, 5).map((text, i) => ({ id: i, text })),
  )
  useEffect(() => {
    if (reduce) return
    let counter = AUDIT_LOG.slice(0, 5).length
    let logIdx = 5
    const handle = window.setInterval(() => {
      if (document.hidden) return
      const next = AUDIT_LOG[logIdx % AUDIT_LOG.length]
      logIdx += 1
      counter += 1
      const newLine = { id: counter, text: next }
      setLines((prev) => [...prev.slice(-7), newLine])
    }, 2400)
    return () => window.clearInterval(handle)
  }, [reduce])

  return (
    <div className="flex h-full flex-col bg-pm-dark p-6 text-pm-dark-paper">
      <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-pm-dark-mute">
        {label}
      </div>
      <h3 className="font-serif text-[clamp(1.25rem,1.8vw,1.5rem)] leading-tight text-pm-dark-paper">
        {h}
      </h3>
      <p className="mt-1 font-sans text-[13px] text-pm-dark-mute">{p}</p>
      <div className="mt-4 flex-1 overflow-hidden font-mono text-[10.5px] leading-relaxed text-pm-dark-mute">
        <AnimatePresence initial={false}>
          {lines.map((l) => (
            <motion.div
              key={l.id}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduce ? 0.1 : 0.4, ease: EASE }}
              className="whitespace-pre"
            >
              {l.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}

function Plain({ label, h, p }: { label?: string; h: string; p?: string }) {
  return (
    <div className="flex h-full flex-col justify-between border border-pm-hair bg-pm-paper-tint p-6">
      {label ? (
        <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-pm-clay">
          {label}
        </div>
      ) : (
        <span aria-hidden />
      )}
      <div>
        <h3 className="font-serif text-[clamp(1.125rem,1.6vw,1.375rem)] leading-tight text-pm-ink">
          {h}
        </h3>
        {p ? (
          <p className="mt-2 font-sans text-[13px] leading-relaxed text-pm-ink-mid">
            {p}
          </p>
        ) : null}
      </div>
    </div>
  )
}

function Photo({
  src,
  alt,
  label,
  h,
  p,
}: {
  src: string
  alt: string
  label: string
  h: string
  p: string
}) {
  return (
    <div className="relative h-full min-h-[200px] overflow-hidden border border-pm-hair">
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        width={900}
        height={600}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div
        className="absolute inset-0 bg-gradient-to-t from-pm-ink/80 via-pm-ink/30 to-transparent"
        aria-hidden
      />
      <div className="absolute bottom-0 left-0 right-0 p-6">
        <div className="mb-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-pm-clay-bloom">
          {label}
        </div>
        <h3 className="font-serif text-[clamp(1.125rem,1.6vw,1.375rem)] leading-tight text-pm-paper">
          {h}
        </h3>
        <p className="mt-1 font-sans text-[13px] leading-relaxed text-pm-paper/80">
          {p}
        </p>
      </div>
    </div>
  )
}

function BigStat({ h, p }: { h: string; p: string }) {
  return (
    <div className="flex h-full flex-col justify-between border border-pm-hair bg-pm-paper p-6">
      <span aria-hidden />
      <div>
        <div className="font-serif text-[clamp(2rem,3.5vw,3rem)] leading-none text-pm-clay">
          {h.split(' ')[0]}
        </div>
        <div className="mt-2 font-sans text-[13px] text-pm-ink">
          {h.split(' ').slice(1).join(' ')}
        </div>
        <p className="mt-2 font-sans text-[13px] text-pm-ink-mid">{p}</p>
      </div>
    </div>
  )
}
