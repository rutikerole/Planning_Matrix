import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { m, useReducedMotion } from 'framer-motion'
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher'
import { Wordmark } from '@/components/shared/Wordmark'

/**
 * Calm 404 for /projects/:id when the project doesn't exist OR the
 * caller isn't its owner. We deliberately don't distinguish the two
 * cases — RLS is the boundary; leaking existence would be a privacy
 * issue. The page mirrors the dashboard placeholder in tone: paper
 * background, eyebrow, serif headline, body, primary CTA back to
 * /dashboard.
 */
export function ProjectNotFound() {
  const { t } = useTranslation()
  const reduced = useReducedMotion()

  useEffect(() => {
    document.title = t('chat.notFound.title')
  }, [t])

  return (
    <m.div
      initial={reduced ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduced ? 0 : 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="min-h-dvh bg-paper relative isolate flex flex-col"
    >
      <header className="relative z-10 px-6 sm:px-10 lg:px-14 xl:px-20">
        <div className="flex h-16 md:h-[72px] items-center justify-between">
          <Wordmark to="/dashboard" />
          <LanguageSwitcher />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-[34rem] flex flex-col items-center text-center gap-6">
          <p className="eyebrow inline-flex items-center text-foreground/65">
            <span className="accent-dot" aria-hidden="true" />
            {t('chat.notFound.eyebrow')}
          </p>
          <h1 className="font-display text-display-3 md:text-display-2 text-ink leading-[1.05] -tracking-[0.02em]">
            {t('chat.notFound.headline').replace(/\.$/, '')}
            <span className="text-clay">.</span>
          </h1>
          <p className="text-body-lg text-ink/70 leading-relaxed max-w-[28rem]">
            {t('chat.notFound.body')}
          </p>
          <Link
            to="/dashboard"
            className="group inline-flex items-center gap-2 h-11 px-5 mt-2 rounded-[5px] bg-ink text-paper text-[14px] font-medium tracking-tight transition-[background-color,color,box-shadow,transform] duration-soft ease-soft hover:bg-ink/92 motion-safe:hover:-translate-y-px shadow-[0_1px_0_hsl(var(--paper)/0.05)_inset,0_2px_4px_-1px_hsl(220_15%_11%/0.18)] hover:shadow-[0_1px_0_hsl(var(--paper)/0.05)_inset,0_8px_18px_-6px_hsl(220_15%_11%/0.32)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {t('chat.notFound.cta')}
          </Link>
        </div>
      </main>
    </m.div>
  )
}
