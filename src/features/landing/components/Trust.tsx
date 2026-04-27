import { useTranslation } from 'react-i18next'
import { Container } from '@/components/shared/Container'
import { Section } from '@/components/shared/Section'
import { AnimatedReveal } from '@/components/shared/AnimatedReveal'

const PILLARS = [
  {
    idx: 'I',
    title: 'trust.pillarOneTitle',
    body: 'trust.pillarOneBody',
  },
  {
    idx: 'II',
    title: 'trust.pillarTwoTitle',
    body: 'trust.pillarTwoBody',
  },
  {
    idx: 'III',
    title: 'trust.pillarThreeTitle',
    body: 'trust.pillarThreeBody',
  },
] as const

export function Trust() {
  const { t } = useTranslation()
  return (
    <Section id="trust" bordered>
      <Container>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-y-10 lg:gap-x-12">
          {/* Heading column */}
          <div className="lg:col-span-5 flex flex-col gap-7">
            <AnimatedReveal>
              <p className="eyebrow inline-flex items-center">
                <span className="accent-dot" aria-hidden="true" />
                {t('trust.eyebrow')}
              </p>
            </AnimatedReveal>
            <AnimatedReveal delay={0.06}>
              <h2 className="font-display text-display-3 md:text-display-2 text-ink leading-[0.98]">
                {t('trust.heading')}
              </h2>
            </AnimatedReveal>
          </div>

          {/* Body column */}
          <div className="lg:col-span-6 lg:col-start-7 flex flex-col gap-7 max-w-2xl">
            <AnimatedReveal delay={0.1}>
              <p className="text-body-lg md:text-body-xl text-ink/85 leading-relaxed">
                {t('trust.body1')}
              </p>
            </AnimatedReveal>
            <AnimatedReveal delay={0.2}>
              <p className="text-body-lg text-muted-foreground leading-relaxed">
                {t('trust.body2')}
              </p>
            </AnimatedReveal>
          </div>
        </div>

        {/* Pillars */}
        <div className="mt-24 md:mt-32 pt-12 border-t border-border grid grid-cols-1 md:grid-cols-3 gap-y-12 md:gap-x-12 lg:gap-x-16">
          {PILLARS.map((p, i) => (
            <AnimatedReveal key={p.idx} delay={i * 0.07}>
              <div className="flex flex-col gap-3">
                <span className="font-display italic text-clay text-[15px] tabular-nums">
                  {p.idx}
                </span>
                <h3 className="text-[18px] font-medium tracking-tight text-ink mt-1">
                  {t(p.title)}
                </h3>
                <p className="text-base text-muted-foreground leading-relaxed">
                  {t(p.body)}
                </p>
              </div>
            </AnimatedReveal>
          ))}
        </div>
      </Container>
    </Section>
  )
}
