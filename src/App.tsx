import { Providers } from '@/app/providers'
import { AppRouter } from '@/app/router'
import { CookieBanner } from '@/features/cookies/CookieBanner'
import { AnalyticsLifecycle } from '@/features/cookies/AnalyticsLifecycle'
import { ErrorBoundary } from '@/lib/errorTracking'

function App() {
  return (
    <ErrorBoundary>
      <Providers>
        <AppRouter />
        <CookieBanner />
        <AnalyticsLifecycle />
      </Providers>
    </ErrorBoundary>
  )
}

export default App
