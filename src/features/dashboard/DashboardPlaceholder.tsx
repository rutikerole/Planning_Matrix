import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Container } from '@/components/shared/Container'
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher'
import { Wordmark } from '@/components/shared/Wordmark'
import { useAuth } from '@/hooks/useAuth'
import { useAuthStore } from '@/stores/authStore'

/**
 * Phase 2.5 will replace this with the actual dashboard / two-question
 * wizard. For Phase 2 it's a calm placeholder behind ProtectedRoute,
 * proving that auth + session + protected routing all work end-to-end.
 */
export function DashboardPlaceholder() {
  const { t, i18n } = useTranslation()
  const auth = useAuth()
  const { user, profile } = useAuthStore()

  useEffect(() => {
    document.title = t('dashboard.placeholder.title')
  }, [t, i18n.resolvedLanguage])

  return (
    <div className="min-h-dvh bg-paper flex flex-col">
      <header className="border-b border-border">
        <Container className="flex h-16 md:h-[72px] items-center justify-between">
          <Wordmark />
          <div className="flex items-center gap-5">
            <LanguageSwitcher />
            <span className="h-4 w-px bg-border-strong/55" aria-hidden="true" />
            <button
              type="button"
              onClick={() => void auth.signOut()}
              className="text-[13.5px] font-medium text-ink/80 hover:text-ink transition-colors duration-soft px-2 py-1.5 rounded-sm hover:bg-muted/45"
            >
              {t('dashboard.placeholder.signOut')}
            </button>
          </div>
        </Container>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-24">
        <div className="max-w-xl text-center flex flex-col items-center">
          <p className="eyebrow inline-flex items-center mb-6 text-foreground/65">
            <span className="accent-dot" aria-hidden="true" />
            {t('dashboard.placeholder.eyebrow')}
          </p>
          <h1 className="font-display text-display-3 md:text-display-2 text-ink leading-[1.05] mb-7">
            {t('dashboard.placeholder.headline')}
          </h1>
          <p className="text-body-lg text-ink/70 leading-relaxed max-w-md mb-10">
            {t('dashboard.placeholder.body')}
          </p>
          {profile?.full_name && (
            <p className="text-sm text-ink/55">
              {profile.full_name}{' '}
              <span className="text-ink/40">·</span>{' '}
              <span className="text-ink/45">{user?.email}</span>
            </p>
          )}
          {!profile?.full_name && user?.email && (
            <p className="text-sm text-ink/45">{user.email}</p>
          )}
        </div>
      </main>
    </div>
  )
}
