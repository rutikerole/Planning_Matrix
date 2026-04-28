import { useEffect, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { LazyMotion, domAnimation } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import '@/lib/i18n'
import { useSession } from '@/hooks/useSession'
import { MobileFrame } from '@/components/MobileFrame'
import { SkipLink } from '@/components/SkipLink'

const queryClient = new QueryClient()

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <LazyMotion features={domAnimation} strict>
        <BrowserRouter>
          {/* Phase 3.8 #83 — singleton mount sets data-pm-viewport on
            * <html>. Mobile token block in globals.css activates when
            * the attribute reads "mobile". */}
          <MobileFrame>
            {/* Phase 3.8 #89 — keyboard / screen-reader skip link.
              * Only visible when focused. Routes anchors a #main-content
              * id; pages without it gracefully fall through. */}
            <SkipLink />
            <SessionGuard>{children}</SessionGuard>
          </MobileFrame>
        </BrowserRouter>
      </LazyMotion>
    </QueryClientProvider>
  )
}

/**
 * Mounted once at the app root. Subscribes to Supabase's auth state
 * via useSession and hydrates the zustand auth store. No-ops cleanly
 * if Supabase env vars aren't wired yet. Phase 4.1 #124 — also keeps
 * <html lang> in sync with the resolved i18n language so screen
 * readers and search engines get the right locale signal after a
 * client-side switch.
 */
function SessionGuard({ children }: { children: ReactNode }) {
  useSession()
  const { i18n } = useTranslation()
  useEffect(() => {
    const lang = i18n.resolvedLanguage ?? 'de'
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang
    }
  }, [i18n.resolvedLanguage])
  return <>{children}</>
}
