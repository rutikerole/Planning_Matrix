import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { m, useScroll, useTransform } from 'framer-motion'
import { Container } from '@/components/shared/Container'
import { CtaButton } from '@/components/shared/CtaButton'
import { Picture } from '@/components/shared/Picture'
import { MatrixHero } from '../visuals/MatrixHero'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

const MAILTO =
  'mailto:vibecoders786@gmail.com?subject=Planning%20Matrix%20%E2%80%94%20Fr%C3%BChzugang'

const HERO_STEM = 'hero-rooftop'

export function Hero() {
  const { t } = useTranslation()
  const reduced = usePrefersReducedMotion()
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  })
  const photoY = useTransform(
    scrollYProgress,
    [0, 1],
    reduced ? [0, 0] : [0, -80],
  )
  const textY = useTransform(
    scrollYProgress,
    [0, 1],
    reduced ? [0, 0] : [0, -40],
  )
  const sealY = useTransform(
    scrollYProgress,
    [0, 1],
    reduced ? [0, 0] : [0, 60],
  )

  return (
    <section
      ref={ref}
      id="hero"
      className="relative isolate overflow-hidden bg-paper min-h-[86vh] lg:min-h-[90vh] pt-32 md:pt-40 lg:pt-44 pb-20 md:pb-24 lg:pb-28"
    >
      {/* Background photo with parallax + Ken Burns */}
      <m.div
        aria-hidden="true"
        style={{ y: photoY }}
        className="absolute inset-0 -z-20"
      >
        <Picture
          stem={HERO_STEM}
          alt=""
          loading="eager"
          fetchPriority="high"
          decoding="sync"
          width={1600}
          height={1067}
          sizes="100vw"
          className="absolute inset-0 w-full h-full"
          imgClassName="absolute inset-0 w-full h-full object-cover object-[60%_50%] motion-safe:animate-ken-burns"
        />
      </m.div>

      {/* Warm-paper gradient overlay — heavier at top-left where type sits */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-br from-[hsl(var(--paper)/0.82)] via-[hsl(var(--paper)/0.45)] to-[hsl(var(--paper)/0.12)]"
      />

      {/* Subtle gradient shimmer — drifts on a 38-second loop */}
      <div
        aria-hidden="true"
        className="absolute -inset-[3%] -z-10 pointer-events-none mix-blend-multiply motion-safe:animate-gradient-shimmer"
      >
        <div className="absolute inset-0 bg-gradient-to-tl from-transparent via-[hsl(32_50%_88%/0.18)] to-transparent" />
      </div>

      {/* Bottom fade-out so the section blends into Problem */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-40 -z-10 bg-gradient-to-b from-transparent to-paper"
      />

      <Container className="relative z-10 h-full">
        <m.div
          style={{ y: textY }}
          className="max-w-[42rem] flex flex-col"
        >
          <p className="eyebrow inline-flex items-center mb-6 animate-fade-rise text-ink/85">
            <span className="accent-dot" aria-hidden="true" />
            {t('hero.eyebrow')}
          </p>

          <span
            aria-hidden="true"
            className="block h-px w-24 bg-ink/40 mb-8 origin-left animate-hairline-draw"
          />

          <h1
            className="font-display text-display-2 lg:text-display-1 text-ink mb-7 lg:mb-9 animate-fade-rise"
            style={{ animationDelay: '0.18s' }}
          >
            <span className="block">{t('hero.headlineLineOne')}</span>
            <span className="block italic text-ink/85">
              {t('hero.headlineLineTwo')}
            </span>
          </h1>

          <p
            className="text-body-lg md:text-body-xl text-ink/85 max-w-[34rem] mb-9 animate-fade-rise"
            style={{ animationDelay: '0.45s' }}
          >
            {t('hero.subheadline')}
          </p>

          {/* Phase 4.1.5 — early-access is now the primary action in
            * the body (the header demoted it to a text link). Supporting
            * microcopy sits directly under the button so first-time
            * visitors still see the offer twice on the page. */}
          <div
            className="flex flex-col gap-3 animate-fade-rise"
            style={{ animationDelay: '0.65s' }}
          >
            <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
              <CtaButton href={MAILTO} variant="primary">
                {t('common.ctaPrimary')}
              </CtaButton>
              <CtaButton href="#product" variant="ghost">
                {t('common.ctaSecondary')}
              </CtaButton>
            </div>
            <p className="text-[13px] italic text-ink/70 leading-relaxed max-w-[28rem]">
              {t('hero.earlyAccessSupport')}
            </p>
          </div>

          <p
            className="mt-12 text-sm text-ink/70 max-w-md animate-fade-rise"
            style={{ animationDelay: '0.85s' }}
          >
            <span
              aria-hidden="true"
              className="inline-block size-1 rounded-full bg-clay align-middle mr-2.5"
            />
            {t('hero.trustline')}
          </p>

          {/* Mobile-only matrix seal — inline below trustline */}
          <div className="lg:hidden mt-12 self-start">
            <SealCard>
              <MatrixHero size="seal" className="max-w-[200px]" />
            </SealCard>
          </div>
        </m.div>
      </Container>

      {/* Desktop matrix seal — absolute bottom-right */}
      <m.div
        style={{ y: sealY }}
        className="absolute hidden lg:block z-10 bottom-10 right-10 xl:bottom-14 xl:right-14"
      >
        <SealCard>
          <MatrixHero size="seal" />
        </SealCard>
      </m.div>
    </section>
  )
}

/**
 * Paper-tinted glass card that hosts the matrix seal so it stays legible
 * on top of the hero photograph.
 */
function SealCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative bg-[hsl(var(--paper)/0.78)] backdrop-blur-md p-3 rounded-md border border-border-strong/45 shadow-[0_4px_12px_-4px_hsl(220_15%_11%/0.10),0_18px_40px_-16px_hsl(220_15%_11%/0.18)]">
      {children}
    </div>
  )
}
