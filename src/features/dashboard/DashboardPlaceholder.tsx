import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { m, useReducedMotion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { Container } from '@/components/shared/Container'
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher'
import { Picture } from '@/components/shared/Picture'
import { Wordmark } from '@/components/shared/Wordmark'
import { useAuth } from '@/hooks/useAuth'
import { useAuthStore } from '@/stores/authStore'

export function DashboardPlaceholder() {
  const { t, i18n } = useTranslation()
  const auth = useAuth()
  const { user, profile } = useAuthStore()
  const reduced = useReducedMotion()

  useEffect(() => {
    document.title = t('dashboard.placeholder.title')
  }, [t, i18n.resolvedLanguage])

  const firstName = profile?.full_name?.trim().split(/\s+/)[0] ?? null

  return (
    <div className="min-h-dvh bg-paper relative isolate flex flex-col overflow-hidden">
      {/* Atmospheric backdrop — domain-a-aerial at ~6% through a heavy
          paper overlay. The architect's view from above, faint enough
          that the type still does the work. */}
      <div aria-hidden="true" className="absolute inset-0 -z-10 overflow-hidden">
        <Picture
          stem="domain-a-aerial"
          alt=""
          loading="lazy"
          sizes="100vw"
          className="absolute inset-0 w-full h-full"
          imgClassName="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-paper" style={{ opacity: 0.94 }} />
      </div>

      <header className="relative z-10 border-b border-clay/15 backdrop-blur-sm bg-[hsl(var(--paper)/0.6)]">
        <Container className="flex h-16 md:h-[72px] items-center justify-between">
          <Wordmark />
          <div className="flex items-center gap-5">
            <LanguageSwitcher />
            <span className="h-4 w-px bg-border-strong/55" aria-hidden="true" />
            <button
              type="button"
              onClick={() => void auth.signOut()}
              className="text-[13.5px] font-medium text-ink/80 hover:text-ink transition-colors duration-soft px-2.5 py-1.5 rounded-sm hover:bg-muted/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {t('dashboard.placeholder.signOut')}
            </button>
          </div>
        </Container>
      </header>

      <main className="relative z-10 flex-1 flex items-center justify-center px-6 py-16">
        <m.div
          initial={reduced ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-xl text-center flex flex-col items-center"
        >
          <p className="eyebrow inline-flex items-center mb-7 text-foreground/65">
            <span className="accent-dot" aria-hidden="true" />
            {t('dashboard.placeholder.eyebrow')}
          </p>

          <h1 className="font-display text-display-3 md:text-display-2 text-ink leading-[1.02] mb-7">
            {firstName ? (
              <>
                {t('dashboard.placeholder.greeting', { name: firstName }).replace(/\.$/, '')}
                <span className="text-clay">.</span>
              </>
            ) : (
              <>
                {t('dashboard.placeholder.greetingNone').replace(/\.$/, '')}
                <span className="text-clay">.</span>
              </>
            )}
          </h1>

          <p className="text-body-lg text-ink/70 leading-relaxed max-w-md mb-10">
            {t('dashboard.placeholder.body')}
          </p>

          <span
            aria-hidden="true"
            className="block h-px w-16 bg-clay/55 mb-10"
          />

          {/* Real CTA — wizard entrypoint. Mirrors the existing primary
              CtaButton chrome (h-11, ink fill, paper text, calm hover
              lift) so it sits cleanly inside the dashboard placeholder
              layout while the project list comes in a later phase. */}
          <Link
            to="/projects/new"
            className="group inline-flex items-center gap-2 h-11 px-5 rounded-[5px] bg-ink text-paper text-[14px] font-medium tracking-tight transition-[background-color,color,box-shadow,transform] duration-soft ease-soft hover:bg-ink/92 shadow-[0_1px_0_hsl(var(--paper)/0.05)_inset,0_2px_4px_-1px_hsl(220_15%_11%/0.18)] hover:shadow-[0_1px_0_hsl(var(--paper)/0.05)_inset,0_8px_18px_-6px_hsl(220_15%_11%/0.32)] motion-safe:hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <span>{t('dashboard.placeholder.ctaNew')}</span>
            <ArrowRight
              aria-hidden="true"
              className="size-4 -mr-1 shrink-0 transition-transform duration-soft ease-soft group-hover:translate-x-0.5"
            />
          </Link>

          {user?.email && (
            <p className="mt-12 text-xs text-ink/45 tracking-tight">
              <span className="inline-block size-1 rounded-full bg-clay align-middle mr-2" />
              {user.email}
            </p>
          )}
        </m.div>
      </main>
    </div>
  )
}
