import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { SectionHead, FadeRise } from './shared'

type Billing = 'monthly' | 'annual'

const EASE = [0.16, 1, 0.3, 1] as const

export function Pricing() {
  const { t } = useTranslation()
  const [billing, setBilling] = useState<Billing>('annual')

  return (
    <section id="pricing" className="bg-pm-paper py-32">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHead
          eyebrow={t('landing.pricing.eyebrow')}
          l1={t('landing.pricing.h.l1')}
          l2={t('landing.pricing.h.l2')}
          sub={t('landing.pricing.sub')}
        />

        <FadeRise delay={0.06} className="mt-10 flex justify-center">
          <div className="flex items-center gap-3">
            <div className="inline-flex border border-pm-hair bg-pm-paper-tint p-1">
              {(['monthly', 'annual'] as const).map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setBilling(b)}
                  aria-pressed={billing === b}
                  className={`px-4 py-1.5 font-sans text-[13px] transition-all ${
                    billing === b
                      ? 'bg-pm-paper text-pm-ink shadow-sm'
                      : 'text-pm-ink-mid'
                  }`}
                >
                  {t(`landing.pricing.${b}`)}
                </button>
              ))}
            </div>
            <span className="font-mono text-[11px] uppercase tracking-wide text-pm-clay">
              {t('landing.pricing.annualNote')}
            </span>
          </div>
        </FadeRise>

        <div className="mx-auto mt-12 grid max-w-6xl grid-cols-1 gap-6 lg:grid-cols-3">
          <FadeRise>
            <Card tier="solo" billing={billing} />
          </FadeRise>
          <FadeRise delay={0.06}>
            <Card tier="studio" billing={billing} featured />
          </FadeRise>
          <FadeRise delay={0.12}>
            <Card tier="enterprise" billing={billing} />
          </FadeRise>
        </div>

        <p className="mt-8 text-center font-sans text-[13px] text-pm-ink-mute2">
          {t('landing.pricing.guarantee')}
        </p>
      </div>
    </section>
  )
}

function Card({
  tier,
  billing,
  featured = false,
}: {
  tier: 'solo' | 'studio' | 'enterprise'
  billing: Billing
  featured?: boolean
}) {
  const { t } = useTranslation()
  const k = (suffix: string) => `landing.pricing.${tier}.${suffix}`
  const isEnterprise = tier === 'enterprise'

  const priceMonthly = !isEnterprise
    ? (t(k('priceMonthly')) as unknown as number)
    : null
  const priceAnnual = !isEnterprise
    ? (t(k('priceAnnual')) as unknown as number)
    : null
  const priceLabel = isEnterprise ? (t(k('priceLabel')) as string) : ''

  const features = ([1, 2, 3, 4, 5] as const)
    .map((n) => t(k(`f${n}`)) as string)
    .filter((s) => s && !s.startsWith('landing.pricing.'))

  return (
    <div
      className={`flex h-full flex-col p-8 ${
        featured
          ? 'border-2 border-pm-clay-soft bg-pm-paper-tint shadow-lg'
          : 'border border-pm-hair bg-pm-paper'
      }`}
    >
      {featured ? (
        <div className="mb-4 inline-block self-start font-mono text-[10px] uppercase tracking-[0.18em] text-pm-clay-bloom">
          {t(k('ribbon'))}
        </div>
      ) : null}
      <h3 className="font-serif text-[clamp(1.5rem,2.4vw,1.875rem)] text-pm-ink">
        {t(k('name'))}
      </h3>
      <p className="mt-1 font-sans text-[13px] text-pm-ink-mid">{t(k('sub'))}</p>

      <div className="mt-6 min-h-[5rem]">
        <AnimatePresence mode="wait">
          {isEnterprise ? (
            <motion.div
              key="enterprise"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: EASE }}
              className="font-serif text-[clamp(1.75rem,3vw,2.5rem)] leading-none text-pm-ink"
            >
              {priceLabel}
            </motion.div>
          ) : (
            <motion.div
              key={billing}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: EASE }}
              className="flex items-baseline gap-2"
            >
              <span className="font-serif text-[clamp(2.5rem,4vw,3.5rem)] leading-none text-pm-ink">
                {billing === 'annual' ? priceAnnual : priceMonthly}
              </span>
              <span className="font-mono text-[12px] text-pm-ink-mid">
                {t('landing.pricing.unit')}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <ul className="mt-6 list-none space-y-3">
        {features.map((f, i) => (
          <li key={i} className="flex items-baseline gap-3">
            <span aria-hidden className="font-mono text-[12px] text-pm-clay">
              ✓
            </span>
            <span className="font-sans text-[14px] text-pm-ink-mid">{f}</span>
          </li>
        ))}
      </ul>

      {isEnterprise ? (
        <a
          href="mailto:hallo@planning-matrix.de?subject=Enterprise%20Anfrage"
          className="mt-8 inline-block border border-pm-ink/30 px-5 py-3 text-center font-sans text-[14px] text-pm-ink transition-colors hover:bg-pm-paper-deep/40"
        >
          {t(k('cta'))}
        </a>
      ) : (
        <Link
          to="/sign-up"
          className={`mt-8 inline-block px-5 py-3 text-center font-sans text-[14px] transition-colors ${
            featured
              ? 'border border-pm-clay bg-pm-clay text-pm-paper hover:bg-pm-clay-deep'
              : 'border border-pm-ink/30 text-pm-ink hover:bg-pm-paper-deep/40'
          }`}
        >
          {t(k('cta'))}
        </Link>
      )}
    </div>
  )
}
