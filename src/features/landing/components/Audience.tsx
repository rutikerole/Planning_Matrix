import { useTranslation } from 'react-i18next'
import { Container } from '@/components/shared/Container'
import { Section } from '@/components/shared/Section'
import { SectionHeader } from '@/components/shared/SectionHeader'
import { AnimatedReveal } from '@/components/shared/AnimatedReveal'

const CARDS = [
  {
    tag: 'audience.card1Tag',
    title: 'audience.card1Title',
    body: 'audience.card1Body',
  },
  {
    tag: 'audience.card2Tag',
    title: 'audience.card2Title',
    body: 'audience.card2Body',
  },
  {
    tag: 'audience.card3Tag',
    title: 'audience.card3Title',
    body: 'audience.card3Body',
  },
] as const

export function Audience() {
  const { t } = useTranslation()
  return (
    <Section id="audience" bordered>
      <Container>
        <SectionHeader
          eyebrow={t('audience.eyebrow')}
          heading={t('audience.heading')}
        />

        <div className="mt-20 md:mt-24 grid grid-cols-1 md:grid-cols-3 gap-px bg-border md:overflow-hidden">
          {CARDS.map((card, i) => (
            <AnimatedReveal key={card.tag} delay={i * 0.07}>
              <article className="group relative h-full bg-background hover:bg-muted/40 transition-colors duration-calm ease-calm">
                {/* Top hairline that picks up clay on hover */}
                <span
                  aria-hidden="true"
                  className="absolute inset-x-8 top-0 h-px bg-border-strong group-hover:bg-clay transition-colors duration-soft"
                />
                <div className="px-8 pt-12 pb-12 md:pt-14 md:pb-16 lg:px-10 lg:pt-16 lg:pb-20 flex flex-col gap-7 h-full">
                  <p className="eyebrow inline-flex items-center text-clay">
                    <span
                      aria-hidden="true"
                      className="inline-block size-1 rounded-full bg-clay align-middle mr-2.5"
                    />
                    {t(card.tag)}
                  </p>
                  <h3 className="font-display text-title md:text-title-lg text-ink leading-[1.15]">
                    {t(card.title)}
                  </h3>
                  <p className="text-body-lg text-muted-foreground leading-relaxed">
                    {t(card.body)}
                  </p>
                </div>
              </article>
            </AnimatedReveal>
          ))}
        </div>
      </Container>
    </Section>
  )
}
