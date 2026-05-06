import { Providers } from '@/app/providers'
import { AppRouter } from '@/app/router'
import { CookieBanner } from '@/features/cookies/CookieBanner'
import { AnalyticsLifecycle } from '@/features/cookies/AnalyticsLifecycle'
import { SentryLifecycle } from '@/features/cookies/SentryLifecycle'
import { ErrorBoundary } from '@/lib/errorTracking'
import { SiteFooter } from '@/components/SiteFooter'

function App() {
  return (
    <ErrorBoundary>
      <Providers>
        {/* Phase 8 — a11y skip link. Visible on first Tab; hidden
            otherwise. Routes target id="main-content" via their
            <main> element where present. */}
        <a href="#main-content" className="pm-skip-link">
          Zum Inhalt springen
        </a>
        <AppRouter />
        <SiteFooter />
        <CookieBanner />
        {/* Phase 9.2 — both lifecycles bridge consent state to their
            respective SDKs. Sentry on state.functional, PostHog on
            state.analytics. Reject = neither loads. */}
        <SentryLifecycle />
        <AnalyticsLifecycle />
      </Providers>
    </ErrorBoundary>
  )
}

export default App
