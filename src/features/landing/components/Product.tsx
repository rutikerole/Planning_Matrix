import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Container } from '@/components/shared/Container'
import { Section } from '@/components/shared/Section'
import { SectionHeader } from '@/components/shared/SectionHeader'
import { AnimatedReveal } from '@/components/shared/AnimatedReveal'
import { CaptureMockup } from '../visuals/CaptureMockup'
import { RecommendMockup } from '../visuals/RecommendMockup'
import { ReleaseMockup } from '../visuals/ReleaseMockup'

interface Step {
  idx: '01' | '02' | '03'
  titleKey: string
  bodyKey: string
  mockup: ReactNode
}

const STEPS: Step[] = [
  {
    idx: '01',
    titleKey: 'product.step1Title',
    bodyKey: 'product.step1Body',
    mockup: <CaptureMockup />,
  },
  {
    idx: '02',
    titleKey: 'product.step2Title',
    bodyKey: 'product.step2Body',
    mockup: <RecommendMockup />,
  },
  {
    idx: '03',
    titleKey: 'product.step3Title',
    bodyKey: 'product.step3Body',
    mockup: <ReleaseMockup />,
  },
]

export function Product() {
  const { t } = useTranslation()
  return (
    <Section id="product" bordered>
      <Container>
        <SectionHeader
          eyebrow={t('product.eyebrow')}
          heading={t('product.heading')}
        />
        <div className="mt-20 md:mt-24 grid grid-cols-1 lg:grid-cols-3 gap-y-16 lg:gap-x-12 xl:gap-x-16">
          {STEPS.map((step, i) => (
            <AnimatedReveal key={step.idx} delay={i * 0.08}>
              <article className="group flex flex-col">
                <div className="mb-10 md:mb-12">{step.mockup}</div>
                <div className="flex items-baseline gap-3 mb-3">
                  <span className="font-display text-[15px] italic text-clay tabular-nums">
                    {step.idx}
                  </span>
                  <span
                    aria-hidden="true"
                    className="h-px flex-1 bg-border-strong group-hover:bg-clay transition-colors duration-calm ease-calm"
                  />
                </div>
                <h3 className="font-display text-title md:text-title-lg text-ink mb-4 leading-tight">
                  {t(step.titleKey)}
                </h3>
                <p className="text-body-lg text-muted-foreground leading-relaxed max-w-md">
                  {t(step.bodyKey)}
                </p>
              </article>
            </AnimatedReveal>
          ))}
        </div>
      </Container>
    </Section>
  )
}
