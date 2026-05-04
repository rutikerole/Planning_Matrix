// Phase 7.6 §1.7 — global app header.
//
// 48 px tall, full-width, paper bg with hairline-bottom + slight
// backdrop-blur. Mounted via the router shell on every authenticated
// route so the user always has profile + language + sign-out
// affordances regardless of which page they're on.
//
// Composition reuses existing primitives:
//   - <Wordmark> for the brand mark (links to /dashboard)
//   - <LanguageSwitcher> for DE / EN
//   - <UserMenu> for the avatar + dropdown
//
// Spine + AstrolabeStickyHeader sit underneath this header (they
// reserve their `top` offset via CSS variable --app-header-h).

import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LogOut, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Wordmark } from '@/components/shared/Wordmark'
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher'
import { useAuth } from '@/hooks/useAuth'
import { useAuthStore } from '@/stores/authStore'

export const APP_HEADER_HEIGHT = 48

interface Props {
  className?: string
}

export function AppHeader({ className }: Props) {
  return (
    <header
      data-app-header="true"
      className={cn(
        // Phase 7.7 §1.2 — fixed (not sticky) so it never consumes
        // layout space. Eliminates the ChamberLayout's appHeaderHeight
        // arithmetic and the visible gap above the Spine.
        'fixed top-0 left-0 right-0 z-50 w-full',
        'h-12',
        'bg-[hsl(var(--paper)/0.92)] backdrop-blur-[6px]',
        'border-b border-[var(--hairline,rgba(26,22,18,0.10))]',
        className,
      )}
      style={{ height: `${APP_HEADER_HEIGHT}px` }}
    >
      <div className="mx-auto h-full max-w-[1440px] flex items-center justify-between px-4 md:px-6">
        <Link
          to="/dashboard"
          className="inline-flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay/55 focus-visible:ring-offset-2 focus-visible:ring-offset-paper rounded-sm"
        >
          <Wordmark size="sm" asLink={false} />
        </Link>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <span aria-hidden="true" className="h-4 w-px bg-ink/15" />
          <UserMenu />
        </div>
      </div>
    </header>
  )
}

export function UserMenu() {
  const { t } = useTranslation()
  const { signOut } = useAuth()
  const user = useAuthStore((s) => s.user)
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement | null>(null)

  // Close on outside click / Esc.
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!wrapperRef.current) return
      if (!wrapperRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const initials = computeInitials(
    user?.user_metadata?.full_name as string | undefined,
    user?.email,
  )

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('appHeader.openMenu')}
        className={cn(
          'inline-flex items-center justify-center',
          'size-8 rounded-full',
          'bg-clay/10 text-clay-deep border border-clay/30',
          'hover:bg-clay/15 transition-colors duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay/55 focus-visible:ring-offset-2 focus-visible:ring-offset-paper',
          'font-medium text-[12px] tabular-nums leading-none',
        )}
      >
        {initials || <User aria-hidden="true" className="size-4" />}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 w-[220px] bg-paper border border-[var(--hairline-strong,rgba(26,22,18,0.18))] rounded-md shadow-[0_10px_36px_-8px_rgba(26,22,18,0.18)] py-1.5 z-50"
        >
          {user?.email && (
            <p className="px-3 py-1.5 text-[11px] text-ink/55 truncate" title={user.email}>
              {user.email}
            </p>
          )}
          <span aria-hidden="true" className="block h-px bg-[var(--hairline,rgba(26,22,18,0.10))] my-1" />
          <button
            type="button"
            role="menuitem"
            onClick={() => void signOut()}
            className="w-full inline-flex items-center gap-2 px-3 py-2 text-left text-[13px] text-ink hover:bg-[hsl(var(--clay)/0.08)] transition-colors duration-150"
          >
            <LogOut aria-hidden="true" className="size-3.5 text-clay" />
            {t('appHeader.signOut')}
          </button>
        </div>
      )}
    </div>
  )
}

function computeInitials(fullName?: string, email?: string | null): string {
  const src = (fullName ?? email ?? '').trim()
  if (!src) return ''
  if (src.includes('@')) return src[0]?.toUpperCase() ?? ''
  const parts = src.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
}
