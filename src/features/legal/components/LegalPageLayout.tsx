// Phase 8 — shared layout for all 4 legal pages
// (Impressum / Datenschutz / AGB / Cookies).
//
// Visual continuity with the rest of the brand: paper background,
// hairline divider above + below, max-w-prose centered column,
// Instrument Serif headline, Inter body, formal Sie register.

import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Container } from '@/components/shared/Container'
import { Wordmark } from '@/components/shared/Wordmark'

interface Props {
  /** Eyebrow line above the headline (e.g. "Rechtliches"). */
  eyebrow: string
  /** The page title (e.g. "Impressum"). */
  headline: string
  /** ISO date — when the page was last reviewed. */
  lastUpdated: string
  /** The page body. Author in JSX, not i18n keys, so legal copy
   *  reads cleanly inline and reviewers can audit it in one diff. */
  children: ReactNode
}

export function LegalPageLayout({ eyebrow, headline, lastUpdated, children }: Props) {
  const { t, i18n } = useTranslation()
  const lang = (i18n.resolvedLanguage ?? 'de') as 'de' | 'en'
  const formattedDate = (() => {
    try {
      return new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'de-DE', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(new Date(lastUpdated))
    } catch {
      return lastUpdated
    }
  })()
  return (
    <div className="min-h-dvh bg-paper flex flex-col">
      <header>
        <Container className="flex h-16 md:h-[72px] items-center">
          <Wordmark />
        </Container>
      </header>
      <main className="flex-1 px-6 py-12 md:py-20">
        <article className="mx-auto max-w-prose">
          <p className="eyebrow inline-flex items-center mb-4 text-foreground/65">
            <span className="accent-dot" aria-hidden="true" />
            {eyebrow}
          </p>
          <h1 className="font-display text-display-3 text-ink leading-[1.05] mb-3">
            {headline}
          </h1>
          <p className="font-serif italic text-[12px] text-clay/85 mb-10">
            {lang === 'en' ? 'Last updated' : 'Stand'}: {formattedDate}
          </p>
          <hr className="border-border/40 mb-10" />
          <div className="prose prose-sm max-w-none text-ink/90 leading-relaxed [&_h2]:font-display [&_h2]:text-[22px] [&_h2]:text-ink [&_h2]:mt-10 [&_h2]:mb-3 [&_h3]:text-[15px] [&_h3]:font-medium [&_h3]:text-ink [&_h3]:mt-6 [&_h3]:mb-2 [&_p]:my-3 [&_ul]:my-3 [&_ul]:pl-5 [&_ul]:list-disc [&_li]:my-1 [&_a]:text-drafting-blue [&_a]:underline [&_a]:underline-offset-4 [&_a]:decoration-drafting-blue/40 hover:[&_a]:decoration-drafting-blue [&_strong]:text-ink [&_strong]:font-medium">
            {children}
          </div>
          <hr className="border-border/40 mt-12 mb-6" />
          <Link
            to="/"
            className="inline-block text-sm text-ink/85 underline underline-offset-4 decoration-clay/55 hover:decoration-clay hover:text-ink transition-colors"
          >
            ← {t('legal.placeholder.back', { defaultValue: 'Zurück zur Startseite' })}
          </Link>
        </article>
      </main>
    </div>
  )
}
