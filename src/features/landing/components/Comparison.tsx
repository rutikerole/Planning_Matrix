import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { SectionHead, FadeRise } from './shared'
import { useReducedMotionPref } from '../hooks/useReducedMotionPref'

const EASE = [0.16, 1, 0.3, 1] as const

export function Comparison() {
  const { t } = useTranslation()
  return (
    <section className="bg-pm-paper-soft py-32">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHead
          eyebrow={t('landing.cmp.eyebrow')}
          l1={t('landing.cmp.h.l1')}
          l2={t('landing.cmp.h.l2')}
          sub={t('landing.cmp.sub')}
        />
        <FadeRise delay={0.1} className="mt-16">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            <Side
              tone="muted"
              label={t('landing.cmp.before.label')}
              h={t('landing.cmp.before.h')}
              steps={[
                t('landing.cmp.before.s1'),
                t('landing.cmp.before.s2'),
                t('landing.cmp.before.s3'),
                t('landing.cmp.before.s4'),
              ]}
              unit={t('landing.cmp.before.unit')}
            />
            <Side
              tone="loud"
              label={t('landing.cmp.after.label')}
              h={t('landing.cmp.after.h')}
              steps={[
                t('landing.cmp.after.s1'),
                t('landing.cmp.after.s2'),
                t('landing.cmp.after.s3'),
                t('landing.cmp.after.s4'),
              ]}
              unit={t('landing.cmp.after.unit')}
            />
          </div>
        </FadeRise>
      </div>
    </section>
  )
}

function Side({
  tone,
  label,
  h,
  steps,
  unit,
}: {
  tone: 'muted' | 'loud'
  label: string
  h: string
  steps: string[]
  unit: string
}) {
  const reduce = useReducedMotionPref()
  const bg = tone === 'loud' ? 'bg-pm-paper-tint' : 'bg-pm-paper'
  const border = tone === 'loud' ? '' : 'lg:border-r border-pm-hair'
  const eyebrow = tone === 'loud' ? 'text-pm-clay' : 'text-pm-ink-muted'
  const barColor = tone === 'loud' ? 'bg-pm-clay' : 'bg-pm-ink-mute2'
  const numColor = tone === 'loud' ? 'text-pm-clay' : 'text-pm-ink-mute2'

  return (
    <div className={`${bg} ${border} p-8 md:p-12`}>
      <div
        className={`font-mono text-[11px] uppercase tracking-[0.18em] ${eyebrow}`}
      >
        {label}
      </div>
      <h3 className="mt-3 font-serif text-[clamp(1.5rem,2.4vw,2rem)] leading-tight text-pm-ink">
        {h}
      </h3>
      <ol className="mt-8 list-none space-y-5">
        {steps.map((s, i) => (
          <li key={i} className="grid grid-cols-[68px_1fr] items-baseline gap-4">
            <span className="font-mono text-[11px] uppercase tracking-wide text-pm-ink-mute2">
              Woche {i + 1}
            </span>
            <div>
              <motion.div
                aria-hidden
                initial={reduce ? { scaleX: 1 } : { scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{
                  duration: reduce ? 0 : 0.7,
                  delay: reduce ? 0 : 0.08 * i,
                  ease: EASE,
                }}
                className={`h-[6px] origin-left ${barColor}`}
              />
              <div className="mt-1.5 font-sans text-[13px] text-pm-ink-mid">
                {s}
              </div>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-10 border-t border-pm-hair pt-6">
        <div
          className={`font-serif text-[clamp(2.5rem,5vw,4rem)] leading-none ${numColor}`}
        >
          {unit}
        </div>
      </div>
    </div>
  )
}
