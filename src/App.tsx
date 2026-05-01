import { Providers } from '@/app/providers'
import { AppRouter } from '@/app/router'
import { CookieBanner } from '@/features/cookies/CookieBanner'
import { AnalyticsLifecycle } from '@/features/cookies/AnalyticsLifecycle'
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
        <AnalyticsLifecycle />
      </Providers>
    </ErrorBoundary>
  )
}

export default App
