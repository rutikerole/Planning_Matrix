// ───────────────────────────────────────────────────────────────────────
// Phase 3.8 #84 — MobileChatWorkspace
//
// Dedicated mobile orchestrator. Composes:
//   • MobileTopHeader  — collapsing on scroll (Q6 locked)
//   • ChatProgressBarMobile — sticky compact band below header
//   • ChatDropZone + Thread — full-viewport message column
//   • InputBar (embedded mode) wrapped in a fixed-bottom band that
//     respects safe-area-inset-bottom and rises above the on-screen
//     keyboard via useKeyboardHeight
//   • MobileRailDrawer (existing) for left/right secondary actions
//
// Branched into from ChatWorkspacePage when useViewport().isMobile.
// Desktop continues to use the unified-footer three-column layout.
// ───────────────────────────────────────────────────────────────────────

import { type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Drawer } from 'vaul'
import { BlueprintSubstrate } from '@/components/shared/BlueprintSubstrate'
import { useKeyboardHeight } from '@/lib/useKeyboardHeight'
import type { ProjectRow } from '@/types/db'
import { MobileTopHeader } from './MobileTopHeader'
import { ChatProgressBar } from './Progress/ChatProgressBar'

interface Props {
  project: ProjectRow
  leftRail: ReactNode
  rightRail: ReactNode
  inputBar: ReactNode
  /** Mobile drawer state, lifted from ChatWorkspacePage. */
  leftOpen: boolean
  rightOpen: boolean
  onLeftOpenChange: (open: boolean) => void
  onRightOpenChange: (open: boolean) => void
  onProgressClick: () => void
  rightBadge: boolean
  /** Empty state vs thread — passed straight through. */
  children: ReactNode
}

export function MobileChatWorkspace({
  project,
  leftRail,
  rightRail,
  inputBar,
  leftOpen,
  rightOpen,
  onLeftOpenChange,
  onRightOpenChange,
  onProgressClick: _onProgressClick,
  rightBadge,
  children,
}: Props) {
  const { t } = useTranslation()
  const keyboardHeight = useKeyboardHeight()

  return (
    <div
      className="min-h-dvh bg-paper relative isolate flex flex-col"
      data-mode="operating"
    >
      <BlueprintSubstrate />
      <div aria-hidden="true" className="grain-overlay-fixed" />

      <MobileTopHeader
        projectName={project.name}
        plotAddress={project.plot_address}
        onLeftClick={() => onLeftOpenChange(true)}
        onRightClick={() => onRightOpenChange(true)}
        leftOpen={leftOpen}
        rightOpen={rightOpen}
        rightBadge={rightBadge}
      />

      {/* Phase 3.8 #84 — sticky compact progress band below the
        * collapsing header. ChatProgressBar's compact mode (Phase 3.6
        * #69) drops labels but keeps segments + percent. */}
      <div className="sticky top-[44px] z-20 bg-paper/95 backdrop-blur-[2px] border-b border-ink/10 px-3 py-1.5">
        <ChatProgressBar compact />
      </div>

      {/* Thread surface — bottom padding accounts for the fixed input
        * bar (max ~140 px including chips + attachments + safe-area). */}
      <main
        className="flex-1 px-3 pt-4"
        style={{
          paddingBottom: `calc(160px + env(safe-area-inset-bottom, 0px))`,
        }}
      >
        {children}
      </main>

      {/* Fixed-bottom input bar. Rises above the on-screen keyboard via
        * useKeyboardHeight; falls back to safe-area-inset when no
        * keyboard is open. */}
      <div
        data-pm-mobile-input-bar="true"
        className="fixed bottom-0 left-0 right-0 z-30 bg-paper/95 backdrop-blur-[3px] border-t border-ink/12"
        style={{
          paddingBottom:
            keyboardHeight > 0
              ? `${keyboardHeight}px`
              : 'env(safe-area-inset-bottom, 0px)',
          transition: 'padding-bottom 120ms ease-out',
        }}
      >
        <div className="px-3 pt-2 pb-2">{inputBar}</div>
      </div>

      {/* Left + right vaul drawers carry the secondary actions that
        * lived in the unified-footer columns on desktop. */}
      <Drawer.Root
        open={leftOpen}
        onOpenChange={onLeftOpenChange}
        direction="left"
      >
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-ink/40 backdrop-blur-[2px] z-40" />
          <Drawer.Content
            aria-label={t('chat.mobile.openLeftRail', {
              defaultValue: 'Linke Spalte öffnen',
            })}
            className="fixed top-0 bottom-0 left-0 w-[88%] max-w-[360px] z-50 bg-paper border-r border-ink/15 outline-none overflow-y-auto pt-safe pb-safe"
          >
            <Drawer.Title className="sr-only">
              {t('chat.mobile.openLeftRail', {
                defaultValue: 'Linke Spalte',
              })}
            </Drawer.Title>
            <div className="px-1">{leftRail}</div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      <Drawer.Root
        open={rightOpen}
        onOpenChange={onRightOpenChange}
        direction="right"
      >
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-ink/40 backdrop-blur-[2px] z-40" />
          <Drawer.Content
            aria-label={t('chat.mobile.openRightRail', {
              defaultValue: 'Rechte Spalte öffnen',
            })}
            className="fixed top-0 bottom-0 right-0 w-[88%] max-w-[360px] z-50 bg-paper border-l border-ink/15 outline-none overflow-y-auto pt-safe pb-safe"
          >
            <Drawer.Title className="sr-only">
              {t('chat.mobile.openRightRail', {
                defaultValue: 'Rechte Spalte',
              })}
            </Drawer.Title>
            <div className="px-1">{rightRail}</div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  )
}
