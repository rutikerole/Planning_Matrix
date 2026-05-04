// Phase 7 Chamber — top-level shell.
//
// Single component handles desktop / tablet / mobile through plain
// CSS responsive utilities. Replaces ChatWorkspaceLayout +
// MobileChatWorkspace + the unified-footer band.
//
// Layout zones:
//   1. AmbientTint + CursorParallax + BlueprintSubstrate — z-index 0.
//   2. AstrolabeStickyHeader — sticky top bar (fades in on scroll).
//   3. Top region (only at scroll-y = 0): wordmark + project context
//      + full Astrolabe (desktop / tablet only) + SpecialistTeam strip.
//   4. Conversation column — single-column thread, max-w 720px.
//   5. Sticky-bottom InputBar.
//   6. LedgerTab pinned to right edge (desktop) / right corner pill (mobile).
//   7. BriefingCTA at thread end.
//
// Subsequent commits replace the placeholder children of this shell
// with the real Astrolabe, Thread, InputBar, LedgerTab, BriefingCTA.

import type { ReactNode } from 'react'
import type { Specialist } from '@/types/projectState'
import { BlueprintSubstrate } from '@/components/shared/BlueprintSubstrate'
import { AmbientTint } from './AmbientTint'
import { CursorParallax } from './CursorParallax'

interface Props {
  /** Active specialist drives the AmbientTint cross-fade. */
  activeSpecialist: Specialist | null
  /** Sticky header (AstrolabeStickyHeader). */
  stickyHeader?: ReactNode
  /** Top region — wordmark + full astrolabe + team strip. Hidden on mobile. */
  topRegion?: ReactNode
  /** The conversation thread. */
  thread: ReactNode
  /** Smart chips + briefing CTA + input bar (always rendered together). */
  inputZone: ReactNode
  /** Right-edge ledger pull. */
  ledger?: ReactNode
  /** Banners (offline / rate-limit / error) — top of viewport. */
  banners?: ReactNode
  /** Modals / overlays (StandUp). */
  overlays?: ReactNode
}

export function ChamberLayout({
  activeSpecialist,
  stickyHeader,
  topRegion,
  thread,
  inputZone,
  ledger,
  banners,
  overlays,
}: Props) {
  return (
    <div
      className="min-h-dvh relative isolate chamber-breath"
      data-mode="operating"
    >
      {/* z-0 background stack */}
      <AmbientTint specialist={activeSpecialist} />
      <CursorParallax />
      <BlueprintSubstrate />
      <div aria-hidden="true" className="grain-overlay-fixed" />

      {/* Banners — fixed at the very top (above sticky header). */}
      {banners}

      {/* Sticky header — z-30. */}
      {stickyHeader}

      {/* Conversation surface */}
      <div className="relative z-10">
        {topRegion ? (
          <div className="hidden md:block mx-auto w-full max-w-[var(--chamber-col-max)] px-[var(--chamber-col-px-tablet)] lg:px-[var(--chamber-col-px-desktop)] pt-12 lg:pt-14">
            {topRegion}
          </div>
        ) : null}

        {/* Thread column */}
        <main className="mx-auto w-full max-w-[var(--chamber-col-max)] px-[var(--chamber-col-px-mobile)] md:px-[var(--chamber-col-px-tablet)] lg:px-[var(--chamber-col-px-desktop)] pt-6 md:pt-8 pb-[180px] md:pb-[200px]">
          {thread}
        </main>

        {/* Input zone — fixed bottom. */}
        <div
          className="fixed bottom-0 left-0 right-0 z-30"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          <div
            aria-hidden="true"
            className="absolute -top-16 left-0 right-0 h-16 pointer-events-none"
            style={{
              backgroundImage:
                'linear-gradient(180deg, hsl(var(--paper) / 0) 0%, hsl(var(--paper) / 0.92) 100%)',
            }}
          />
          <div className="mx-auto w-full max-w-[var(--chamber-col-max)] px-[var(--chamber-col-px-mobile)] md:px-[var(--chamber-col-px-tablet)] lg:px-[var(--chamber-col-px-desktop)] pt-3 pb-3 bg-[hsl(var(--paper)/0.92)] backdrop-blur-[3px] border-t border-[var(--hairline,rgba(26,22,18,0.10))]">
            {inputZone}
          </div>
        </div>
      </div>

      {/* Right-edge ledger pull (desktop) / floating pill (mobile). */}
      {ledger}

      {/* Modals + overlays */}
      {overlays}
    </div>
  )
}
