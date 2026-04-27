import { useTranslation } from 'react-i18next'
import { Container } from '@/components/shared/Container'
import { CtaButton } from '@/components/shared/CtaButton'
import { GradientMesh } from '../visuals/GradientMesh'
import { MatrixHero } from '../visuals/MatrixHero'

const MAILTO =
  'mailto:vibecoders786@gmail.com?subject=Planning%20Matrix%20%E2%80%94%20Fr%C3%BChzugang'

export function Hero() {
  const { t } = useTranslation()
  return (
    <section
      id="hero"
      className="relative isolate overflow-hidden bg-blueprint pt-32 md:pt-40 lg:pt-48 pb-24 md:pb-28 lg:pb-32"
    >
      <GradientMesh />

      <Container className="relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-y-16 lg:gap-x-10 items-center">
          {/* Text column */}
          <div className="lg:col-span-7">
            <p className="eyebrow inline-flex items-center mb-7 animate-fade-rise">
              <span className="accent-dot" aria-hidden="true" />
              {t('hero.eyebrow')}
            </p>

            <span
              aria-hidden="true"
              className="block h-px w-24 bg-ink/40 mb-10 origin-left animate-hairline-draw"
            />

            <h1
              className="font-display text-display-2 lg:text-display-1 text-ink mb-8 md:mb-10 animate-fade-rise"
              style={{ animationDelay: '0.12s' }}
            >
              <span className="block">{t('hero.headlineLineOne')}</span>
              <span className="block italic text-ink/85">
                {t('hero.headlineLineTwo')}
              </span>
            </h1>

            <p
              className="text-body-lg md:text-body-xl text-muted-foreground max-w-[36rem] mb-10 animate-fade-rise"
              style={{ animationDelay: '0.28s' }}
            >
              {t('hero.subheadline')}
            </p>

            <div
              className="flex flex-wrap items-center gap-x-6 gap-y-4 animate-fade-rise"
              style={{ animationDelay: '0.4s' }}
            >
              <CtaButton href={MAILTO} variant="primary">
                {t('common.ctaPrimary')}
              </CtaButton>
              <CtaButton href="#product" variant="ghost">
                {t('common.ctaSecondary')}
              </CtaButton>
            </div>

            <p
              className="mt-14 md:mt-16 text-sm text-muted-foreground max-w-md animate-fade-rise"
              style={{ animationDelay: '0.55s' }}
            >
              <span
                aria-hidden="true"
                className="inline-block size-1 rounded-full bg-clay align-middle mr-2.5"
              />
              {t('hero.trustline')}
            </p>
          </div>

          {/* Matrix visual column */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <MatrixHero />
          </div>
        </div>
      </Container>
    </section>
  )
}
