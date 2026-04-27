import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { m, useReducedMotion } from 'framer-motion'
import { Container } from '@/components/shared/Container'
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher'
import { Picture } from '@/components/shared/Picture'
import { Wordmark } from '@/components/shared/Wordmark'
import { useAuth } from '@/hooks/useAuth'
import { useAuthStore } from '@/stores/authStore'

/**
 * Phase 2.5 will replace this with the actual dashboard / two-question
 * wizard. For Phase 2 it's a calm placeholder behind ProtectedRoute,
 * proving that auth + session + protected routing work end-to-end.
 *
 * Visual: warm-paper canvas with the finalcta-windows photo at ~8 %
 * opacity behind, eyebrow + Instrument Serif greeting personalised
 * with the user's first name, "Ihr Projekt-Workspace folgt in Kürze."
 * subtitle, account email small and secondary, calm fade-in on mount.
 */
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
      {/* Atmospheric backdrop — finalcta-windows at ~8 % through a
          paper overlay. "Lights are on, your workspace is open." */}
      <div aria-hidden="true" className="absolute inset-0 -z-10 overflow-hidden">
        <Picture
          stem="finalcta-windows"
          alt=""
          loading="lazy"
          sizes="100vw"
          className="absolute inset-0 w-full h-full"
          imgClassName="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-paper" style={{ opacity: 0.92 }} />
      </div>

      <header className="relative z-10 border-b border-clay/15 backdrop-blur-sm bg-[hsl(var(--paper)/0.55)]">
        <Container className="flex h-16 md:h-[72px] items-center justify-between">
          <Wordmark />
          <div className="flex items-center gap-5">
            <LanguageSwitcher />
            <span
              className="h-4 w-px bg-border-strong/55"
              aria-hidden="true"
            />
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
          className="max-w-xl text-center flex flex-col items-center"
        >
          <p className="eyebrow inline-flex items-center mb-7 text-foreground/65">
            <span className="accent-dot" aria-hidden="true" />
            {t('dashboard.placeholder.eyebrow')}
          </p>

          <h1 className="font-display text-display-3 md:text-display-2 text-ink leading-[1.02] mb-8">
            {firstName
              ? t('dashboard.placeholder.greeting', { name: firstName })
              : t('dashboard.placeholder.greetingNone')}
          </h1>

          <p className="text-body-lg text-ink/70 leading-relaxed max-w-md mb-12">
            {t('dashboard.placeholder.body')}
          </p>

          {user?.email && (
            <p className="text-xs text-ink/45 tracking-tight">
              <span className="inline-block size-1 rounded-full bg-clay align-middle mr-2" />
              {user.email}
            </p>
          )}
        </m.div>
      </main>
    </div>
  )
}
