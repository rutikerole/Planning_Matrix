import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Container } from '@/components/shared/Container'
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher'
import { Wordmark } from '@/components/shared/Wordmark'
import { BlueprintSubstrate } from '@/features/chat/components/BlueprintSubstrate'
import { useAuth } from '@/hooks/useAuth'
import { useAuthStore } from '@/stores/authStore'
import { useProjectsList } from './hooks/useProjectsList'
import { ProjectList } from './components/ProjectList'
import { ProjectListEmpty } from './components/ProjectListEmpty'
import {
  formatProjectsCount,
  formatRelativeOrAbsolute,
  welcomeName,
  type Lang,
} from './lib/dashboardFormat'

/**
 * Phase 3.3 #47 — dashboard rebuilt as the atelier reception room.
 *
 * Replaces the placeholder rooftop-photo dashboard. Reads top-down as:
 *   • header — wordmark left, language switcher + sign-out right
 *   • welcome block — eyebrow + headline (Willkommen, {name}.)
 *     + 96px hairline + activity sentence (italic)
 *   • PROJEKTE schedule index — list of project rows or empty state
 *
 * Background: paper grain (already global) + shared <BlueprintSubstrate />
 * with cursor lens, drift, and table breath. The Berlin rooftop photo
 * is permanently retired; the substrate is the dashboard's atmosphere.
 */
export function DashboardPage() {
  const { t, i18n } = useTranslation()
  const auth = useAuth()
  const { user, profile } = useAuthStore()
  const lang = (i18n.resolvedLanguage ?? 'de') as Lang
  const { data: projects, isPending } = useProjectsList()

  useEffect(() => {
    document.title = t('dashboard.atelier.docTitle')
  }, [t, i18n.resolvedLanguage])

  const name = welcomeName(profile?.full_name, user?.email)
  const projectsCount = projects?.length ?? 0
  const lastActivity = projects?.[0]?.updated_at
    ? formatRelativeOrAbsolute(projects[0].updated_at, lang)
    : null

  return (
    <div className="min-h-dvh bg-paper relative isolate flex flex-col">
      {/* Atelier substrate — paper grain is global; layer the blueprint
       * substrate here. Lensing + drift active; table breath stays calm. */}
      <BlueprintSubstrate />

      <header className="relative z-10 border-b border-ink/12 bg-paper/85 backdrop-blur-[2px]">
        <Container className="flex h-16 md:h-[72px] items-center justify-between">
          <Wordmark />
          <div className="flex items-center gap-5">
            <LanguageSwitcher />
            <span className="h-4 w-px bg-ink/20" aria-hidden="true" />
            <button
              type="button"
              onClick={() => void auth.signOut()}
              className="text-[13.5px] font-medium text-ink/80 hover:text-ink transition-colors duration-soft px-2.5 py-1.5 rounded-sm hover:bg-ink/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {t('dashboard.atelier.signOut')}
            </button>
          </div>
        </Container>
      </header>

      <main className="relative z-10 flex-1">
        <Container className="py-12 md:py-16 lg:py-20 max-w-[960px] flex flex-col gap-14">
          {/* Welcome block */}
          <section className="flex flex-col gap-6">
            <p className="eyebrow inline-flex items-center text-foreground/65">
              <span className="accent-dot" aria-hidden="true" />
              {t('dashboard.atelier.eyebrow')}
            </p>
            <h1 className="font-display text-[clamp(40px,5.5vw,56px)] text-ink leading-[1.05] -tracking-[0.022em]">
              {name
                ? t('dashboard.atelier.greeting', { name }).replace(/\.$/, '')
                : t('dashboard.atelier.greetingNone').replace(/\.$/, '')}
              <span className="text-clay">.</span>
            </h1>
            <span aria-hidden="true" className="block h-px w-24 bg-ink/20" />
            {!isPending && projectsCount > 0 && (
              <p className="font-serif italic text-[14px] sm:text-[15px] text-ink/65 leading-relaxed">
                {formatProjectsCount({ count: projectsCount, lang })}{' '}
                {lastActivity && (
                  <>
                    {t('dashboard.atelier.lastActivitySentence')}:{' '}
                    <span className="text-clay/85 tabular-figures">
                      {lastActivity}
                    </span>
                    .
                  </>
                )}
              </p>
            )}
          </section>

          {/* Projects schedule */}
          <section className="flex flex-col gap-4">
            <header className="flex items-baseline justify-between gap-4">
              <h2 className="text-[11px] font-medium uppercase tracking-[0.22em] text-foreground/65">
                {t('dashboard.atelier.projectsHeading')}
              </h2>
              <Link
                to="/projects/new"
                className="text-[12px] italic text-clay/85 hover:text-ink underline underline-offset-4 decoration-clay/55 transition-colors duration-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm"
              >
                {t('dashboard.atelier.newCta')}
              </Link>
            </header>
            <span aria-hidden="true" className="block h-px bg-ink/15" />

            {isPending ? (
              <p className="font-serif italic text-[14px] text-clay/70 py-8 text-center">
                {t('dashboard.atelier.loading')}
              </p>
            ) : projectsCount === 0 ? (
              <ProjectListEmpty />
            ) : (
              <ProjectList projects={projects ?? []} />
            )}
          </section>
        </Container>
      </main>
    </div>
  )
}
