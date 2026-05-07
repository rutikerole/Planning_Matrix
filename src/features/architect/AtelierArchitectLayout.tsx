import { Link, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'

/**
 * Phase 13 Week 2 — Architect Console shell.
 *
 * Visual posture: paper/ink/clay tokens, mono-leaning, sharp corners,
 * no shadows — same austere "atelier mode" as the Atelier Console
 * (admin Logs drawer) per the user's locked decision. The architect's
 * environment is a verification workbench, not a salon.
 *
 * No left rail in Week 2 — the only destination is the dashboard
 * (membership list) and per-project verification panels are reached
 * via the dashboard's project links. Week 3 may add a left rail when
 * additional sections (Verlauf, Notizen) land.
 */
export function AtelierArchitectLayout() {
  const { user } = useAuthStore()
  const location = useLocation()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/sign-in'
  }

  return (
    <div className="flex min-h-screen flex-col bg-[hsl(var(--paper))] text-[hsl(var(--ink))]">
      <header className="flex items-center justify-between border-b border-[hsl(var(--ink))]/10 px-4 py-3 md:px-6">
        <Link to="/architect" className="block font-mono text-xs uppercase tracking-[0.18em]">
          <span className="block text-[10px] text-[hsl(var(--ink))]/45">
            Planning Matrix
          </span>
          <span className="mt-0.5 block text-[hsl(var(--ink))]">
            architect console
          </span>
        </Link>

        <div className="hidden md:block">
          <Breadcrumbs path={location.pathname} />
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden truncate font-mono text-[11px] text-[hsl(var(--ink))]/55 md:inline">
            {user?.email ?? '—'}
          </span>
          <button
            type="button"
            onClick={handleSignOut}
            className="font-mono text-[11px] uppercase tracking-[0.18em] text-[hsl(var(--ink))]/55 hover:text-[hsl(var(--ink))]"
          >
            sign out
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-x-hidden overflow-y-auto px-4 py-6 md:px-8 md:py-8">
        <Outlet />
      </main>
    </div>
  )
}

function Breadcrumbs({ path }: { path: string }) {
  const parts = path.split('/').filter(Boolean)
  return (
    <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[hsl(var(--ink))]/55">
      {parts.length === 0 ? 'architect' : parts.join(' / ')}
    </p>
  )
}
