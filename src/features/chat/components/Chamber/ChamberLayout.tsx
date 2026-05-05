/* eslint-disable react-refresh/only-export-components */
// Phase 7 Chamber — top-level shell.
//
// Phase 7.6 §1.1 — replaced document-level scroll with a viewport-
// height grid. The Spine is `position: fixed` (unchanged) but the
// conversation column now owns its OWN scroll context (overflow-y on
// `<main>`); document body never scrolls. This:
//
//   - keeps the Spine stable when the user wheels,
//   - lets InputBar use `position: sticky; bottom: 0` inside main
//     (guaranteed visible by layout, no z-stack guesswork),
//   - lets AstrolabeStickyHeader stay sticky to the top of main.
//
// JumpToLatest + useAutoScroll measure off `mainRef.current` instead
// of `window.scrollY` — exposed via context so consumers don't
// prop-drill.

import {
  createContext,
  useContext,
  useRef,
  type ReactNode,
  type RefObject,
} from 'react'

interface Props {
  /** Phase 7.5 — left Spine sidebar (desktop only, ≥ 1024 px). */
  spine?: ReactNode
  /** Phase 7.5 — collapsed Spine trigger strip (< 1024 px). */
  spineMobileTrigger?: ReactNode
  /** Sticky header — sticky to top of <main> scroll context.
   *  Phase 7.8: now hosts <ConversationStrip /> instead of
   *  <AstrolabeStickyHeader />. */
  stickyHeader?: ReactNode
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
  /** Phase 7.10 — bottom-right slot rendered OUTSIDE the input
   *  column wrapper. Used for the Stand-up affordance so it sits
   *  in the right gutter of the chat surface, independent of the
   *  centered input pill. */
  bottomRightSlot?: ReactNode
}

// Phase 7.6 — main scroll container ref exposed via context so
// `<JumpToLatest>` and `useAutoScroll` can target the right scroller.
const ChamberMainRefCtx = createContext<RefObject<HTMLElement | null> | null>(null)

export function useChamberMainRef(): RefObject<HTMLElement | null> | null {
  return useContext(ChamberMainRefCtx)
}

export function ChamberLayout({
  spine,
  spineMobileTrigger,
  stickyHeader,
  thread,
  inputZone,
  ledger,
  banners,
  overlays,
  bottomRightSlot,
}: Props) {
  const mainRef = useRef<HTMLElement | null>(null)
  return (
    <ChamberMainRefCtx.Provider value={mainRef}>
      <div
        className="relative isolate chamber-breath"
        data-mode="operating"
        style={{
          // Phase 7.7 §1.2 — AppHeader was fixed at top; Phase 7.9
          // drops it on /projects/:id entirely (Spine carries the
          // wordmark + auth). Chamber now occupies the full dvh
          // with no top padding.
          height: '100dvh',
        }}
      >
        {/* z-0 background stack.
         *
         * Phase 7.8 §2.7 — AmbientTint dropped (no specialist hue wash).
         * Phase 7.9 §2.7 — BlueprintSubstrate dropped (no grid).
         * Phase 7.10 — CursorParallax dropped. It was painting two
         * radial gradients with different hues (warm at 18%/22%,
         * cooler at 78%/78%), which made the right side of the page
         * read visibly grayer than the left. Single uniform paper
         * warmth now — only the grain texture remains as ambient. */}
        <div aria-hidden="true" className="grain-overlay-fixed" />

        {/* Banners — fixed at the very top of the chamber surface. */}
        {banners}

        {/* Phase 7.5 — left Spine (desktop, ≥ 1024 px). Now reads its
          * top offset from the appHeaderHeight prop so it sits below
          * the global app header. */}
        {spine}

        {/* Phase 7.5 — collapsed Spine trigger strip (< 1024 px). */}
        {spineMobileTrigger}

        {/* Conversation surface — shifted right of the Spine on lg+.
          * IMPORTANT: this wrapper owns the scroll context. The page
          * body itself never scrolls. */}
        <div className="relative z-10 lg:pl-spine h-full">
          <main
            ref={mainRef}
            data-chamber-main="true"
            className="h-full overflow-y-auto overflow-x-hidden flex flex-col"
          >
            {/* Sticky-top sticky header — sticks to the top of the
              * scroll container (main), never overlays the Spine.
              * Phase 7.8 §2.2: hosts <ConversationStrip />. The
              * <topRegion> slot (full Astrolabe + 7-sigil row) was
              * killed and never re-mounted. */}
            {stickyHeader}

            {/* Thread column */}
            <div className="mx-auto w-full max-w-[var(--chamber-col-max)] px-[var(--chamber-col-px-mobile)] md:px-[var(--chamber-col-px-tablet)] lg:px-[var(--chamber-col-px-desktop)] pt-6 md:pt-8 pb-[180px] md:pb-[200px] flex-1">
              {thread}
            </div>

            {/* Sticky-bottom input zone — pinned to the bottom of the
              * main scroll container. Phase 7.6 §1.6: fixed → sticky.
              * Always visible regardless of scroll position. */}
            <div
              className="sticky bottom-0 z-30 -mt-[200px] md:-mt-[200px]"
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
              {/* Phase 7.10 — solid paper bg + no border-top + no
                * backdrop-blur. The previous transparent-with-blur
                * band was letting message text ghost through; the
                * input pill now sits on a clean paper floor instead. */}
              <div className="mx-auto w-full max-w-[var(--chamber-col-max)] px-[var(--chamber-col-px-mobile)] md:px-[var(--chamber-col-px-tablet)] lg:px-[var(--chamber-col-px-desktop)] pt-3 pb-3 bg-paper">
                {inputZone}
              </div>
              {/* Phase 7.10 — bottom-right slot. Lives OUTSIDE the
                * column wrapper so the Stand-up affordance can sit
                * in the right gutter of the chat surface, independent
                * of the centered input pill. Reserved 24 px from the
                * viewport right so it doesn't overlap the LedgerTab
                * (vertically centered, not at the bottom). */}
              {bottomRightSlot && (
                <div className="absolute right-6 bottom-3 z-10 pointer-events-auto">
                  {bottomRightSlot}
                </div>
              )}
            </div>
          </main>
        </div>

        {/* Right-edge ledger pull (desktop) / floating pill (mobile). */}
        {ledger}

        {/* Modals + overlays */}
        {overlays}
      </div>
    </ChamberMainRefCtx.Provider>
  )
}
