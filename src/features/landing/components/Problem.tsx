import { useTranslation } from 'react-i18next'
import { Container } from '@/components/shared/Container'
import { Section } from '@/components/shared/Section'
import { SectionHeader } from '@/components/shared/SectionHeader'
import { AnimatedReveal } from '@/components/shared/AnimatedReveal'
import { cn } from '@/lib/utils'

const BLOCKS = [
  { idx: '01', key: 'problem.block1', tone: 'muted' },
  { idx: '02', key: 'problem.block2', tone: 'ink' },
  { idx: '03', key: 'problem.block3', tone: 'display' },
] as const

export function Problem() {
  const { t } = useTranslation()
  return (
    <Section id="problem" bordered>
      <Container>
        <SectionHeader
          eyebrow={t('problem.eyebrow')}
          heading={t('problem.heading')}
        />

        <div className="mt-20 md:mt-28 flex flex-col gap-14 md:gap-20">
          {BLOCKS.map((b, i) => (
            <AnimatedReveal key={b.idx} delay={i * 0.05}>
              <div className="flex flex-col gap-4 md:flex-row md:gap-10">
                <span className="font-display text-[15px] italic text-clay tabular-nums shrink-0 md:w-14 md:pt-3">
                  {b.idx}
                </span>
                <p
                  className={cn(
                    'max-w-3xl',
                    b.tone === 'muted' &&
                      'text-body-lg md:text-body-xl text-muted-foreground',
                    b.tone === 'ink' &&
                      'text-title md:text-title-lg text-ink leading-[1.3]',
                    b.tone === 'display' &&
                      'font-display text-headline md:text-display-3 italic text-ink leading-[1.06]',
                  )}
                >
                  {t(b.key)}
                </p>
              </div>
            </AnimatedReveal>
          ))}
        </div>
      </Container>
    </Section>
  )
}
