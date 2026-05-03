import { useTranslation } from 'react-i18next'
import { SectionHead, FadeRise } from './shared'
import { CountUp } from './CountUp'
import { photos } from '../lib/photos'

export function Perspectives() {
  const { t } = useTranslation()
  return (
    <section id="perspectives" className="bg-pm-paper py-32">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHead
          eyebrow={t('landing.persp.eyebrow')}
          l1={t('landing.persp.h.l1')}
          l2={t('landing.persp.h.l2')}
          align="left"
          maxWidth="max-w-3xl"
        />

        <div className="mt-16 grid grid-cols-1 gap-4 md:auto-rows-[180px] md:grid-cols-12">
          {/* B1 — photo card, col-span-7 row-span-2 */}
          <FadeRise className="md:col-span-7 md:row-span-2">
            <PhotoCard
              src={photos.perspectives1}
              alt={t('landing.persp.b1.alt')}
              label={t('landing.persp.b1.label')}
              h={t('landing.persp.b1.h')}
              p={t('landing.persp.b1.p')}
            />
          </FadeRise>

          {/* B2 — stat card */}
          <FadeRise delay={0.06} className="md:col-span-5">
            <StatCard
              label={t('landing.persp.b2.label')}
              count={47892}
              suffix="+"
              small={t('landing.persp.b2.small')}
            />
          </FadeRise>

          {/* B3 — plain card */}
          <FadeRise delay={0.12} className="md:col-span-5">
            <PlainCard
              label={t('landing.persp.b3.label')}
              h={t('landing.persp.b3.h')}
              p={t('landing.persp.b3.p')}
            />
          </FadeRise>

          {/* B4 — wide photo */}
          <FadeRise delay={0.18} className="md:col-span-12">
            <PhotoCard
              src={photos.perspectives2}
              alt={t('landing.persp.b4.alt')}
              label={t('landing.persp.b4.label')}
              h={t('landing.persp.b4.h')}
              p={t('landing.persp.b4.p')}
            />
          </FadeRise>
        </div>
      </div>
    </section>
  )
}

function PhotoCard({
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
    <div className="group relative h-full min-h-[260px] overflow-hidden border border-pm-hair">
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        width={1200}
        height={800}
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
      />
      <div
        className="absolute inset-0 bg-gradient-to-t from-pm-ink/85 via-pm-ink/40 to-transparent"
        aria-hidden
      />
      <div className="absolute bottom-0 left-0 right-0 p-6">
        <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-pm-clay-bloom">
          {label}
        </div>
        <h3 className="font-serif text-[clamp(1.5rem,2.4vw,2rem)] text-pm-paper leading-tight">
          {h}
        </h3>
        <p className="mt-2 max-w-xl font-sans text-[14px] leading-relaxed text-pm-paper/80">
          {p}
        </p>
      </div>
    </div>
  )
}

function StatCard({
  label,
  count,
  suffix,
  small,
}: {
  label: string
  count: number
  suffix?: string
  small: string
}) {
  return (
    <div className="flex h-full flex-col justify-between border border-pm-hair bg-pm-paper-tint p-6">
      <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-pm-clay">
        {label}
      </div>
      <div>
        <div className="font-serif text-[clamp(2.5rem,4vw,3.5rem)] leading-none text-pm-clay">
          <CountUp to={count} suffix={suffix} />
        </div>
        <p className="mt-3 font-sans text-[13px] leading-relaxed text-pm-ink-mid">
          {small}
        </p>
      </div>
    </div>
  )
}

function PlainCard({ label, h, p }: { label: string; h: string; p: string }) {
  return (
    <div className="flex h-full flex-col justify-between border border-pm-hair bg-pm-paper p-6">
      <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-pm-clay">
        {label}
      </div>
      <div>
        <h3 className="font-serif text-[clamp(1.25rem,1.8vw,1.5rem)] leading-tight text-pm-ink">
          {h}
        </h3>
        <p className="mt-2 font-sans text-[13px] leading-relaxed text-pm-ink-mid">
          {p}
        </p>
      </div>
    </div>
  )
}
