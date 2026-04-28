import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { LazyMotion, domAnimation } from 'framer-motion'
import '@/lib/i18n'
import { useSession } from '@/hooks/useSession'
import { MobileFrame } from '@/components/MobileFrame'

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
 * if Supabase env vars aren't wired yet.
 */
function SessionGuard({ children }: { children: ReactNode }) {
  useSession()
  return <>{children}</>
}
