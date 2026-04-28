// ───────────────────────────────────────────────────────────────────────
// Phase 3.8 #84 — MobileTopHeader
//
// Collapsing-on-scroll mobile chat header (Q6 locked: NYT pattern).
// Layout: hamburger · project name (truncate) + plot subtitle · kebab.
// Heights: 56 px expanded → 44 px collapsed when scrollY > 80. The
// fold reuses the folded-paper-tab icons from the existing
// MobileTopBar (SVG stays); typography compresses.
//
// Sticky to top with `pt-safe` so the iOS notch / Android status bar
// doesn't eat into the title block. The progress bar mounts BELOW
// this header (so it's also sticky and visible).
// ───────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { TouchTarget } from '@/components/TouchTarget'

interface Props {
  projectName: string
  plotAddress?: string | null
  onLeftClick: () => void
  onRightClick: () => void
  rightBadge?: boolean
  leftOpen: boolean
  rightOpen: boolean
}

export function MobileTopHeader({
  projectName,
  plotAddress,
  onLeftClick,
  onRightClick,
  rightBadge,
  leftOpen,
  rightOpen,
}: Props) {
  const { t } = useTranslation()
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    let raf = 0
    const handler = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        setCollapsed(window.scrollY > 80)
      })
    }
    window.addEventListener('scroll', handler, { passive: true })
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', handler)
    }
  }, [])

  const cleanProjectName = projectName.split('·')[0]?.trim() ?? projectName

  return (
    <header
      data-pm-mobile-header="true"
      data-collapsed={collapsed}
      className={cn(
        'sticky top-0 z-30 bg-paper/95 backdrop-blur-[2px] border-b border-ink/12 pt-safe',
        'transition-[height] duration-soft ease-soft',
      )}
    >
      <div
        className={cn(
          'mx-auto max-w-[1024px] px-2 flex items-stretch gap-1 transition-[height] duration-soft',
          collapsed ? 'h-11' : 'h-14',
        )}
      >
        <TouchTarget
          onClick={onLeftClick}
          aria-label={t('chat.mobile.openLeftRail')}
          aria-expanded={leftOpen}
          className="self-center text-drafting-blue/75 hover:text-drafting-blue rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <FoldedTabIcon side="left" />
        </TouchTarget>

        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="flex-1 min-w-0 flex flex-col justify-center items-center px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm"
          title={projectName}
        >
          {!collapsed && (
            <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-clay/85 leading-none">
              {t('chat.mobile.eyebrow', { defaultValue: 'Projekt' })}
            </p>
          )}
          <p
            className={cn(
              'font-medium text-ink truncate transition-[font-size] duration-soft',
              collapsed ? 'text-[13px] mt-0' : 'text-[14px] mt-1',
            )}
          >
            {cleanProjectName}
          </p>
          {!collapsed && plotAddress && (
            <p className="font-serif italic text-[11px] text-clay/72 truncate max-w-full leading-tight mt-0.5">
              {plotAddress}
            </p>
          )}
        </button>

        <TouchTarget
          onClick={onRightClick}
          aria-label={t('chat.mobile.openRightRail')}
          aria-expanded={rightOpen}
          className="self-center relative text-drafting-blue/75 hover:text-drafting-blue rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <FoldedTabIcon side="right" />
          {rightBadge && (
            <span
              aria-hidden="true"
              className="absolute top-2.5 right-2.5 size-1 rounded-full bg-clay"
            />
          )}
        </TouchTarget>
      </div>
    </header>
  )
}

/** Folded-paper tab icon — drafting-blue stroke, chamfered corner. */
function FoldedTabIcon({ side }: { side: 'left' | 'right' }) {
  const transform = side === 'right' ? 'scale(-1, 1) translate(-22, 0)' : undefined
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 22 22"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <g transform={transform}>
        <path d="M 3 3 L 15 3 L 19 7 L 19 19 L 3 19 Z" />
        <path d="M 15 3 L 15 7 L 19 7" strokeOpacity="0.55" />
        <path d="M 6 11 L 16 11" strokeOpacity="0.45" />
        <path d="M 6 14 L 14 14" strokeOpacity="0.4" />
      </g>
    </svg>
  )
}
