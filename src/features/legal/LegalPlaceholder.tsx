import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Container } from '@/components/shared/Container'
import { Wordmark } from '@/components/shared/Wordmark'

interface Props {
  /** i18n key for the document title (e.g. legal.imprintTitle).
   * Phase 4.1 #124 — kept for backward compat, but the route's <SEO />
   * renders the seo.title.legal* key now; this prop is no longer used
   * for the document.title path. */
  titleKey: string
}

/**
 * Stub for /impressum, /datenschutz, /agb. Visual continuity with the
 * landing page (warm paper, clay accent, Instrument Serif headline) +
 * a "Folgt in Kürze" body. These three pages are legally required for
 * a German B2B site and will get real content before public launch.
 */
export function LegalPlaceholder(_props: Props) {
  const { t } = useTranslation()

  return (
    <div className="min-h-dvh bg-paper flex flex-col">
      <header>
        <Container className="flex h-16 md:h-[72px] items-center">
          <Wordmark />
        </Container>
      </header>
      <main className="flex-1 flex items-center justify-center px-6 py-20">
        <div className="max-w-md text-center">
          <p className="eyebrow inline-flex items-center mb-6 text-foreground/65">
            <span className="accent-dot" aria-hidden="true" />
            {t('legal.placeholder.eyebrow')}
          </p>
          <h1 className="font-display text-display-3 text-ink leading-[1.05] mb-6">
            {t('legal.placeholder.headline')}
          </h1>
          <p className="text-base text-ink/70 leading-relaxed mb-8">
            {t('legal.placeholder.body')}
          </p>
          <Link
            to="/"
            className="inline-block text-sm text-ink/85 underline underline-offset-4 decoration-clay/55 hover:decoration-clay hover:text-ink transition-colors"
          >
            ← {t('legal.placeholder.back')}
          </Link>
        </div>
      </main>
    </div>
  )
}
