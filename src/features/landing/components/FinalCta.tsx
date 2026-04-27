import { useTranslation } from 'react-i18next'
import { Container } from '@/components/shared/Container'
import { Section } from '@/components/shared/Section'
import { AnimatedReveal } from '@/components/shared/AnimatedReveal'
import { CtaButton } from '@/components/shared/CtaButton'
import { SectionBackdrop } from '../visuals/SectionBackdrop'

const MAILTO =
  'mailto:vibecoders786@gmail.com?subject=Planning%20Matrix%20%E2%80%94%20Fr%C3%BChzugang'

export function FinalCta() {
  const { t } = useTranslation()
  return (
    <Section id="cta" bordered className="isolate">
      <SectionBackdrop stem="finalcta-windows" paperOpacity={0.75} parallax />
      <Container>
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
          <AnimatedReveal>
            <p className="eyebrow inline-flex items-center justify-center">
              <span className="accent-dot" aria-hidden="true" />
              {t('finalCta.eyebrow')}
            </p>
          </AnimatedReveal>
          <AnimatedReveal delay={0.06}>
            <h2 className="font-display text-display-2 md:text-display-1 text-ink leading-[0.98] mt-7 mb-9">
              {t('finalCta.heading')}
            </h2>
          </AnimatedReveal>
          <AnimatedReveal delay={0.14}>
            <p className="text-body-lg md:text-body-xl text-muted-foreground max-w-xl mb-12">
              {t('finalCta.body')}
            </p>
          </AnimatedReveal>
          <AnimatedReveal delay={0.22}>
            <CtaButton href={MAILTO} variant="primary">
              {t('finalCta.cta')}
            </CtaButton>
          </AnimatedReveal>
        </div>
      </Container>
    </Section>
  )
}
