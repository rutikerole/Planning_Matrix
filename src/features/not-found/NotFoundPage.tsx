import { useTranslation } from 'react-i18next'
import { Container } from '@/components/shared/Container'
import { CtaButton } from '@/components/shared/CtaButton'
import { GrainOverlay } from '@/components/shared/GrainOverlay'
import { Wordmark } from '@/components/shared/Wordmark'

export function NotFoundPage() {
  const { t } = useTranslation()
  return (
    <>
      <header className="absolute top-0 inset-x-0 z-10">
        <Container className="flex h-16 md:h-[72px] items-center">
          <Wordmark />
        </Container>
      </header>
      <main className="relative min-h-dvh flex items-center justify-center">
        <Container className="py-24 max-w-2xl text-center flex flex-col items-center">
          <p
            className="font-display text-[clamp(6rem,18vw,12rem)] text-ink/85 leading-[0.85] mb-8 italic"
            aria-hidden="true"
          >
            {t('notFound.code')}
          </p>
          <span
            aria-hidden="true"
            className="block h-px w-16 bg-clay mb-10"
          />
          <h1 className="font-display text-display-3 md:text-display-2 text-ink leading-[1.02] mb-6">
            {t('notFound.heading')}
          </h1>
          <p className="text-body-lg text-muted-foreground max-w-md mb-10 leading-relaxed">
            {t('notFound.body')}
          </p>
          <CtaButton href="/" variant="primary">
            {t('notFound.cta')}
          </CtaButton>
        </Container>
      </main>
      <GrainOverlay />
    </>
  )
}
