import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { AuthSkeleton } from './AuthSkeleton'
import { AppHeader } from './AppHeader'

interface Props {
  children: ReactNode
  /** Phase 7.6 §1.7 — opt out of the global app header for routes
   *  that need to render their own (currently: dashboard keeps its
   *  legacy header until commit 11 reconciles them). */
  hideAppHeader?: boolean
}

/**
 * Route guard. Behaviour:
 *   • isLoading=true (initial probe in flight) → render AuthSkeleton.
 *     Never flash protected content before the store has settled.
 *   • !user + !isLoading → redirect to /sign-in?next=<encoded path>.
 *     The next param is whitelisted in safeNext() — never used as a
 *     redirect target without the safety check on the consuming page.
 *   • user → render children.
 *
 * Browser back-button after sign-out: store flips to user=null +
 * isLoading=false, the effect fires immediately, redirect happens
 * before the protected component can render. Net effect: no flash.
 */
export function ProtectedRoute({ children, hideAppHeader }: Props) {
  const { user, isLoading } = useAuthStore()
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    if (isLoading) return
    if (!user) {
      const next = encodeURIComponent(location.pathname + location.search)
      navigate(`/sign-in?next=${next}`, { replace: true })
    }
  }, [isLoading, user, location.pathname, location.search, navigate])

  if (isLoading) return <AuthSkeleton />
  if (!user) return null
  return (
    <>
      {!hideAppHeader && <AppHeader />}
      {children}
    </>
  )
}
