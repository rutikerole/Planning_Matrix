// Phase 9.2 — bridge the cookie consent state to Sentry init / shutdown.
//
// Mirrors AnalyticsLifecycle.tsx for PostHog. Mounted once in App.tsx
// after Providers. Gated on state.functional (rather than analytics)
// because error tracking is closer to "necessary diagnostics" than
// "marketing analytics" — but the conservative DSGVO read still wants
// explicit opt-in via the cookie banner's Customize step. Accept All
// turns both flags on and Sentry initialises.
//
// State transitions:
//   - first paint, no consent yet → state is null → Sentry stays off
//   - user clicks Reject → state.functional = false → no init
//   - user clicks Accept All → state.functional = true → initSentry()
//   - user toggles Functional off later → shutdownSentry() flushes
//     pending events with a 2-second deadline, then closes

import { useEffect } from 'react'
import { useCookieConsent } from './useCookieConsent'
import { initSentry, shutdownSentry } from '@/lib/errorTracking'

export function SentryLifecycle() {
  const { state } = useCookieConsent()
  useEffect(() => {
    if (state?.functional) {
      initSentry()
    } else {
      shutdownSentry()
    }
  }, [state?.functional])
  return null
}
