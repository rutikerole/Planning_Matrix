import { useTranslation } from 'react-i18next'
import { CountUp } from './CountUp'
import { FadeRise } from './shared'

export function StatsStrip() {
  const { t } = useTranslation()
  return (
    <section className="relative bg-pm-dark py-24 text-pm-dark-paper">
      {/* Hairline gradient sweep */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-40"
        style={{
          background:
            'linear-gradient(to right, transparent, var(--pm-clay-bloom), transparent)',
        }}
      />
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-6 md:grid-cols-4 md:gap-12">
        <Stat label={t('landing.stats.l1')} desc={t('landing.stats.d1')} to={47892} suffix="+" />
        <Stat label={t('landing.stats.l2')} desc={t('landing.stats.d2')} to={16} />
        <Stat label={t('landing.stats.l3')} desc={t('landing.stats.d3')} to={4} />
        <Stat label={t('landing.stats.l4')} desc={t('landing.stats.d4')} to={200000} suffix="+" />
      </div>
    </section>
  )
}

function Stat({
  label,
  desc,
  to,
  suffix = '',
}: {
  label: string
  desc: string
  to: number
  suffix?: string
}) {
  return (
    <FadeRise>
      <div>
        <div className="font-serif text-[clamp(3rem,5.5vw,6rem)] leading-none text-pm-clay-bloom">
          <CountUp to={to} suffix={suffix} duration={2400} />
        </div>
        <div className="mt-3 font-sans text-[13px] uppercase tracking-wide text-pm-dark-mute">
          {label}
        </div>
        <div className="mt-2 max-w-[28ch] font-sans text-[13px] text-pm-dark-mute2">
          {desc}
        </div>
      </div>
    </FadeRise>
  )
}
