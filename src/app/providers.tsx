import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import '@/lib/i18n'
import { useSession } from '@/hooks/useSession'

const queryClient = new QueryClient()

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <SessionGuard>{children}</SessionGuard>
      </BrowserRouter>
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
