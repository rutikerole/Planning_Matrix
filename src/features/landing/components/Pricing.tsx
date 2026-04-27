import { useTranslation } from 'react-i18next'
import { Container } from '@/components/shared/Container'
import { Section } from '@/components/shared/Section'
import { AnimatedReveal } from '@/components/shared/AnimatedReveal'
import { CtaButton } from '@/components/shared/CtaButton'

const MAILTO =
  'mailto:vibecoders786@gmail.com?subject=Planning%20Matrix%20%E2%80%94%20Fr%C3%BChzugang'

export function Pricing() {
  const { t } = useTranslation()
  return (
    <Section id="pricing" bordered>
      <Container>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-y-10 lg:gap-x-12">
          <div className="lg:col-span-5">
            <AnimatedReveal>
              <p className="eyebrow inline-flex items-center mb-7">
                <span className="accent-dot" aria-hidden="true" />
                {t('pricing.eyebrow')}
              </p>
            </AnimatedReveal>
            <AnimatedReveal delay={0.06}>
              <h2 className="font-display text-display-3 md:text-display-2 text-ink leading-[1] max-w-md">
                {t('pricing.heading')}
              </h2>
            </AnimatedReveal>
          </div>

          <div className="lg:col-span-6 lg:col-start-7 max-w-xl">
            <AnimatedReveal delay={0.1}>
              <div className="border-l-2 border-clay/60 pl-6 md:pl-8">
                <p className="text-body-lg text-ink/85 leading-relaxed mb-8">
                  {t('pricing.body')}
                </p>
                <CtaButton href={MAILTO} variant="primary">
                  {t('common.ctaPrimary')}
                </CtaButton>
                <p className="mt-8 text-sm text-muted-foreground inline-flex items-center">
                  <span
                    aria-hidden="true"
                    className="inline-block size-1 rounded-full bg-clay align-middle mr-2.5"
                  />
                  {t('pricing.note')}
                </p>
              </div>
            </AnimatedReveal>
          </div>
        </div>
      </Container>
    </Section>
  )
}
