import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Container } from '@/components/shared/Container'
import { Section } from '@/components/shared/Section'
import { SectionHeader } from '@/components/shared/SectionHeader'
import { AnimatedReveal } from '@/components/shared/AnimatedReveal'

interface Step {
  idx: '01' | '02' | '03'
  titleKey: string
  bodyKey: string
  glyph: ReactNode
}

const STEPS: Step[] = [
  {
    idx: '01',
    titleKey: 'product.step1Title',
    bodyKey: 'product.step1Body',
    glyph: <GlyphCapture />,
  },
  {
    idx: '02',
    titleKey: 'product.step2Title',
    bodyKey: 'product.step2Body',
    glyph: <GlyphRecommend />,
  },
  {
    idx: '03',
    titleKey: 'product.step3Title',
    bodyKey: 'product.step3Body',
    glyph: <GlyphRelease />,
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
        <div className="mt-20 md:mt-24 grid grid-cols-1 lg:grid-cols-3 gap-y-14 lg:gap-x-12 xl:gap-x-16">
          {STEPS.map((step, i) => (
            <AnimatedReveal key={step.idx} delay={i * 0.08}>
              <article className="group flex flex-col">
                <div className="size-7 text-ink/85 mb-9 transition-colors duration-soft group-hover:text-clay">
                  {step.glyph}
                </div>
                <div className="flex items-baseline gap-3 mb-3">
                  <span className="font-display text-[15px] italic text-clay tabular-nums">
                    {step.idx}
                  </span>
                  <span
                    className="h-px flex-1 bg-border-strong group-hover:bg-clay transition-colors duration-calm ease-calm"
                    aria-hidden="true"
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

/* — Custom inline glyphs. Stroke uses currentColor so they inherit text. — */

function GlyphCapture() {
  return (
    <svg
      viewBox="0 0 28 28"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="square"
      aria-hidden="true"
      className="size-full"
    >
      <rect x="3" y="3" width="22" height="22" />
      <rect x="11" y="11" width="6" height="6" fill="currentColor" stroke="none" />
    </svg>
  )
}

function GlyphRecommend() {
  return (
    <svg
      viewBox="0 0 28 28"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="square"
      aria-hidden="true"
      className="size-full"
    >
      <circle cx="14" cy="5" r="2.2" />
      <circle cx="5" cy="22" r="2.2" />
      <circle cx="23" cy="22" r="2.2" />
      <line x1="14" y1="7.2" x2="6" y2="20" />
      <line x1="14" y1="7.2" x2="22" y2="20" />
      <line x1="7" y1="22" x2="21" y2="22" strokeDasharray="2 2" />
    </svg>
  )
}

function GlyphRelease() {
  return (
    <svg
      viewBox="0 0 28 28"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
      className="size-full"
    >
      <rect x="3" y="3" width="22" height="22" />
      <path d="M8 14.5 13 19l8-9.5" />
    </svg>
  )
}
