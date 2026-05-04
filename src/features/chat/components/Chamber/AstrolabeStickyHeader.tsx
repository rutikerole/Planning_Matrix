// Phase 7 Chamber — AstrolabeStickyHeader.
//
// Fixed-top bar that fades in once the user has scrolled past the
// full astrolabe. Carries: wordmark · project name · compact astrolabe
// · meta line · SpecialistTeam strip · overflow menu (•••).
//
// Mobile: the sticky header is ALWAYS visible (the full astrolabe is
// never rendered on mobile). Tap the compact astrolabe → bottom-sheet
// with the full version.

import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Specialist } from '@/types/projectState'
import type { ChamberProgress } from '../../hooks/useChamberProgress'
import { Astrolabe } from './Astrolabe'

interface Props {
  projectName: string
  plotAddress?: string | null
  progress: ChamberProgress
  /** Whether the full astrolabe is mounted at top (desktop only).
   *  When true, the sticky bar fades in on scroll. When false, sticky
   *  bar is always visible (mobile). */
  hasFullAbove: boolean
  onAstrolabeClick: () => void
  onSigilClick?: (s: Specialist) => void
  /** Slot for the SpecialistTeam strip (rendered to the right of meta).
   *  Hidden on small screens. */
  teamSlot?: ReactNode
  /** Slot for the overflow menu's content (passed through). */
  overflowSlot?: ReactNode
  /** Briefing CTA placeholder — only renders when completion gate passes. */
  briefingSlot?: ReactNode
}

const THRESHOLD_PX = 132

export function AstrolabeStickyHeader({
  projectName,
  plotAddress,
  progress,
  hasFullAbove,
  onAstrolabeClick,
  onSigilClick,
  teamSlot,
  overflowSlot,
  briefingSlot,
}: Props) {
  const { t } = useTranslation()
  const [scrolled, setScrolled] = useState(!hasFullAbove)

  useEffect(() => {
    if (!hasFullAbove) return
    const onScroll = () => setScrolled(window.scrollY > THRESHOLD_PX)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [hasFullAbove])

  // Mobile / no-full-above mode — always visible. Derived; no effect.
  const visible = !hasFullAbove ? true : scrolled

  const specialistLabel = progress.recentSpecialist
    ? t(`chat.specialists.${progress.recentSpecialist}`)
    : t('chat.chamber.atTopReady')
  const meta = t('chat.chamber.astrolabeTurnLabel', {
    current: progress.currentTurn,
    total: progress.totalEstimate,
  })

  return (
    <div
      className={cn(
        // Phase 7.5 — shift to start at left-spine on desktop so the
        // Spine sidebar stays visible to the left of the bar.
        'fixed top-0 left-0 lg:left-spine right-0 z-30',
        'transition-[opacity,transform] duration-[240ms] ease-[cubic-bezier(0.16,1,0.3,1)]',
        visible
          ? 'opacity-100 translate-y-0 pointer-events-auto'
          : 'opacity-0 -translate-y-2 pointer-events-none',
      )}
    >
      <div className="bg-[hsl(var(--paper)/0.92)] backdrop-blur-[6px] border-b border-[var(--hairline,rgba(26,22,18,0.10))]">
        <div className="mx-auto w-full max-w-[1280px] px-4 md:px-6 py-2 flex items-center gap-3 md:gap-4">
          {/* Phase 7.5 — Wordmark + project name DROPPED on desktop;
            * the Spine sidebar carries them. Mobile keeps both since
            * the Spine is collapsed and the user must open the drawer
            * to see project context. */}
          <Link
            to="/dashboard"
            className="lg:hidden md:inline-flex font-serif italic text-[14px] text-clay-deep hover:text-clay leading-none whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay/55 focus-visible:ring-offset-2 focus-visible:ring-offset-paper rounded-sm"
          >
            {t('chat.chamber.wordmark')}
          </Link>
          <p
            className="lg:hidden sm:block font-serif text-[13px] text-ink truncate min-w-0 max-w-[260px]"
            title={projectName}
          >
            {projectName.split('·')[0]?.trim() ?? projectName}
            {plotAddress && (
              <span className="text-clay/72 italic ml-2">· {plotAddress}</span>
            )}
          </p>
          {/* Compact astrolabe */}
          <Astrolabe
            percent={progress.percent}
            currentTurn={progress.currentTurn}
            totalEstimate={progress.totalEstimate}
            currentSpecialist={progress.recentSpecialist}
            spokenSpecialists={progress.spokenSpecialists}
            size="compact"
            onSigilClick={onSigilClick}
            onClick={onAstrolabeClick}
            ariaLabel={t('chat.chamber.astrolabeLabel', { percent: progress.percent })}
          />
          {/* Meta */}
          <p className="hidden md:block font-mono text-[10px] uppercase tracking-[0.14em] text-clay leading-none whitespace-nowrap">
            <span className="text-ink">{progress.percent}%</span>
            <span className="mx-1.5 text-ink/30">·</span>
            <span className="font-serif italic normal-case tracking-normal text-clay-deep">
              {specialistLabel}
            </span>
          </p>
          <p className="hidden lg:block font-mono text-[10px] uppercase tracking-[0.14em] text-ink/55 leading-none whitespace-nowrap">
            {meta}
          </p>
          {/* Team strip */}
          <div className="hidden md:flex flex-1 justify-end items-center gap-2">
            {teamSlot}
          </div>
          {/* Briefing CTA placeholder */}
          {briefingSlot}
          {/* Overflow */}
          <OverflowMenu trigger={<MoreHorizontal aria-hidden="true" className="size-4" />}>
            {overflowSlot}
          </OverflowMenu>
        </div>
      </div>
    </div>
  )
}

function OverflowMenu({ trigger, children }: { trigger: ReactNode; children?: ReactNode }) {
  const [open, setOpen] = useState(false)
  const { t } = useTranslation()
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t('chat.chamber.stickyHeaderOverflow')}
        aria-haspopup="menu"
        aria-expanded={open}
        className="size-9 inline-flex items-center justify-center rounded-full text-ink/65 hover:text-ink hover:bg-ink/[0.04] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
      >
        {trigger}
      </button>
      {open && (
        <>
          <div
            aria-hidden="true"
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div
            role="menu"
            className="absolute right-0 top-full mt-2 z-50 w-[260px] bg-paper border border-[var(--hairline-strong,rgba(26,22,18,0.18))] rounded-md shadow-[0_10px_36px_-8px_rgba(26,22,18,0.18)] py-2"
          >
            {children}
          </div>
        </>
      )}
    </div>
  )
}
