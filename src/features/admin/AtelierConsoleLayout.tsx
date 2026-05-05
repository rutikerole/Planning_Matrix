import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'

/**
 * Phase 9 — Atelier Console shell.
 *
 * Visual posture: paper/ink/clay still, but mono-leaning and dense.
 * No italic serif here — this is a workshop tool, not a salon. Top
 * bar shows env + signed-in admin + sign-out; left rail holds the
 * four primary destinations. Mobile collapses the rail behind a
 * tap-toggle drawer.
 */
export function AtelierConsoleLayout() {
  const { user } = useAuthStore()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const location = useLocation()
  const env = detectEnv()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/sign-in'
  }

  return (
    <div className="flex min-h-screen bg-[hsl(var(--paper))] text-[hsl(var(--ink))]">
      {/* ── Left rail (desktop) + Drawer (mobile) ─────────────── */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-30 flex w-60 flex-col border-r
          border-[hsl(var(--ink))]/10 bg-[hsl(var(--paper))] transition-transform
          md:static md:translate-x-0
          ${drawerOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="border-b border-[hsl(var(--ink))]/10 px-5 py-5">
          <Link to="/admin" className="block font-mono text-xs uppercase tracking-[0.18em]">
            <span className="block text-[10px] text-[hsl(var(--ink))]/45">Planning Matrix</span>
            <span className="mt-0.5 block text-[hsl(var(--ink))]">atelier console</span>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <NavSection title="Logs">
            <NavItem to="/admin/logs/projects" label="Projects" onNavigate={() => setDrawerOpen(false)} />
            <NavItem to="/admin/logs/stream" label="Live Stream" onNavigate={() => setDrawerOpen(false)} />
            <NavItem to="/admin/logs/cost" label="Cost" onNavigate={() => setDrawerOpen(false)} />
            <NavItem to="/admin/logs/search" label="Search" onNavigate={() => setDrawerOpen(false)} />
          </NavSection>
        </nav>

        <div className="border-t border-[hsl(var(--ink))]/10 px-5 py-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[hsl(var(--ink))]/45">
            Admin
          </p>
          <p className="mt-1 truncate text-xs text-[hsl(var(--ink))]/75">{user?.email ?? '—'}</p>
        </div>
      </aside>

      {drawerOpen && (
        <div
          className="fixed inset-0 z-20 bg-[hsl(var(--ink))]/30 md:hidden"
          onClick={() => setDrawerOpen(false)}
          aria-hidden
        />
      )}

      {/* ── Top bar + content ─────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-[hsl(var(--ink))]/10 px-4 py-3 md:px-6">
          <button
            type="button"
            onClick={() => setDrawerOpen((v) => !v)}
            className="md:hidden font-mono text-[11px] uppercase tracking-[0.18em] text-[hsl(var(--ink))]/70"
            aria-label="Toggle navigation"
          >
            menu
          </button>

          <div className="hidden md:block">
            <Breadcrumbs path={location.pathname} />
          </div>

          <div className="flex items-center gap-3">
            <EnvBadge env={env} />
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
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────

function NavSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <p className="px-3 pb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[hsl(var(--ink))]/35">
        {title}
      </p>
      <ul className="space-y-0.5">{children}</ul>
    </div>
  )
}

function NavItem({
  to,
  label,
  onNavigate,
}: {
  to: string
  label: string
  onNavigate: () => void
}) {
  return (
    <li>
      <NavLink
        to={to}
        onClick={onNavigate}
        className={({ isActive }) =>
          `block rounded px-3 py-1.5 font-mono text-[12px] tracking-tight transition-colors ${
            isActive
              ? 'bg-[hsl(var(--ink))]/8 text-[hsl(var(--ink))]'
              : 'text-[hsl(var(--ink))]/65 hover:bg-[hsl(var(--ink))]/4 hover:text-[hsl(var(--ink))]'
          }`
        }
      >
        {label}
      </NavLink>
    </li>
  )
}

function EnvBadge({ env }: { env: 'production' | 'preview' | 'local' }) {
  const tone =
    env === 'production'
      ? 'border-[hsl(var(--clay))] text-[hsl(var(--clay))]'
      : env === 'preview'
        ? 'border-[hsl(var(--ink))]/40 text-[hsl(var(--ink))]/75'
        : 'border-emerald-600 text-emerald-700'
  return (
    <span
      className={`inline-flex items-center rounded border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] ${tone}`}
    >
      {env}
    </span>
  )
}

function Breadcrumbs({ path }: { path: string }) {
  const parts = path.split('/').filter(Boolean)
  return (
    <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[hsl(var(--ink))]/55">
      {parts.length === 0 ? 'admin' : parts.join(' / ')}
    </p>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────

function detectEnv(): 'production' | 'preview' | 'local' {
  // Vite mode + hostname heuristics. Local dev = vite dev server,
  // preview deploys land on *.vercel.app or similar staging hosts.
  if (typeof window === 'undefined') return 'local'
  const host = window.location.hostname
  if (host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local')) {
    return 'local'
  }
  if (host.includes('preview') || host.includes('staging') || host.includes('vercel.app')) {
    return 'preview'
  }
  return 'production'
}
