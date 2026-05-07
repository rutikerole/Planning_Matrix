import type { ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useIsDesigner } from '@/hooks/useIsDesigner'

/**
 * Phase 13 Week 2 — gate for /architect/* routes.
 *
 * Mirrors AdminGuard with three states:
 *
 *   1. No auth user → redirect to /sign-in?next=<encoded path>.
 *   2. Authenticated but profiles.role !== 'designer' → render
 *      <NotAuthorized>. Friendly 403 with link back to /dashboard.
 *      Distinct from the qualifier_role_violation server-side gate;
 *      that fires on chat-turn writes, this hides the dashboard
 *      surface from non-designers.
 *   3. Designer → render children.
 *
 * useIsDesigner is cached for 5 min, so route changes inside
 * /architect/* don't re-issue the profiles.role read.
 */
export function ArchitectGuard({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuthStore()
  const { isDesigner, isLoading: gateLoading } = useIsDesigner()
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    if (isLoading) return
    if (!user) {
      const next = encodeURIComponent(location.pathname + location.search)
      navigate(`/sign-in?next=${next}`, { replace: true })
    }
  }, [isLoading, user, location.pathname, location.search, navigate])

  if (isLoading || (!!user && gateLoading)) {
    return <GateLoading />
  }
  if (!user) return <GateLoading />
  if (!isDesigner) return <NotAuthorized />
  return <>{children}</>
}

function GateLoading() {
  return (
    <div className="grid min-h-screen place-items-center bg-[hsl(var(--paper))] text-[hsl(var(--ink))]">
      <div className="font-mono text-xs uppercase tracking-[0.18em] text-[hsl(var(--ink))]/50">
        Verifying architect
      </div>
    </div>
  )
}

function NotAuthorized() {
  return (
    <div className="grid min-h-screen place-items-center bg-[hsl(var(--paper))] px-6">
      <div className="max-w-md space-y-4 text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[hsl(var(--ink))]/45">
          403 — Restricted
        </p>
        <h1 className="text-2xl text-[hsl(var(--ink))]">
          The architect console is for bauvorlageberechtigte/n only.
        </h1>
        <p className="text-sm text-[hsl(var(--ink))]/65">
          Your account is not registered as an architect for this
          environment. If you received an invite link, sign in with the
          account that received the invitation.
        </p>
        <div className="pt-2">
          <Link
            to="/dashboard"
            className="inline-block border-b border-[hsl(var(--ink))]/30 pb-0.5 text-sm text-[hsl(var(--ink))] hover:border-[hsl(var(--ink))]"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
