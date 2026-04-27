import { useTranslation } from 'react-i18next'
import { Container } from '@/components/shared/Container'
import { CtaButton } from '@/components/shared/CtaButton'

const MAILTO = 'mailto:vibecoders786@gmail.com?subject=Planning%20Matrix%20%E2%80%94%20Fr%C3%BChzugang'

export function Hero() {
  const { t } = useTranslation()
  return (
    <section
      id="hero"
      className="relative pt-36 md:pt-44 lg:pt-52 pb-24 md:pb-28 lg:pb-32"
    >
      <Container>
        <div className="max-w-[58rem]">
          {/* Eyebrow */}
          <p className="eyebrow inline-flex items-center mb-7 animate-fade-rise">
            <span className="accent-dot" aria-hidden="true" />
            {t('hero.eyebrow')}
          </p>

          {/* Hairline above headline — draws once on load */}
          <span
            aria-hidden="true"
            className="block h-px w-24 bg-ink/40 mb-10 origin-left animate-hairline-draw"
          />

          {/* Headline (h1) — two lines, second line in italic for emphasis */}
          <h1
            className="font-display text-display-1 text-ink mb-8 md:mb-10 animate-fade-rise"
            style={{ animationDelay: '0.12s' }}
          >
            <span className="block">{t('hero.headlineLineOne')}</span>
            <span className="block italic text-ink/85">
              {t('hero.headlineLineTwo')}
            </span>
          </h1>

          {/* Subheadline */}
          <p
            className="text-body-lg md:text-body-xl text-muted-foreground max-w-[40rem] mb-10 animate-fade-rise"
            style={{ animationDelay: '0.28s' }}
          >
            {t('hero.subheadline')}
          </p>

          {/* CTAs */}
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

          {/* Trust line */}
          <p
            className="mt-16 md:mt-20 text-sm text-muted-foreground max-w-md animate-fade-rise"
            style={{ animationDelay: '0.55s' }}
          >
            <span
              aria-hidden="true"
              className="inline-block size-1 rounded-full bg-clay align-middle mr-2.5"
            />
            {t('hero.trustline')}
          </p>
        </div>
      </Container>

    </section>
  )
}
