// Phase 8 — bridge the cookie consent state to PostHog init / shutdown.
// Mounted once in App.tsx after Providers.

import { useEffect } from 'react'
import { useCookieConsent } from './useCookieConsent'
import { initPostHog, shutdownPostHog } from '@/lib/analytics'

export function AnalyticsLifecycle() {
  const { state } = useCookieConsent()
  useEffect(() => {
    if (state?.analytics) {
      initPostHog()
    } else {
      shutdownPostHog()
    }
  }, [state?.analytics])
  return null
}
