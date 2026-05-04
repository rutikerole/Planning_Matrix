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
import type { Specialist } from '@/types/projectState'
import { BlueprintSubstrate } from '@/components/shared/BlueprintSubstrate'
import { AmbientTint } from './AmbientTint'
import { CursorParallax } from './CursorParallax'

interface Props {
  /** Active specialist drives the AmbientTint cross-fade. */
  activeSpecialist: Specialist | null
  /** Phase 7.5 — left Spine sidebar (desktop only, ≥ 1024 px). */
  spine?: ReactNode
  /** Phase 7.5 — collapsed Spine trigger strip (< 1024 px). */
  spineMobileTrigger?: ReactNode
  /** Sticky header (AstrolabeStickyHeader) — sticky to top of main. */
  stickyHeader?: ReactNode
  /** Top region — full astrolabe + team strip. Hidden on mobile. */
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
  /** Phase 7.6 §1.7 — global app header reservation. The router-level
   *  <AppHeader> sits above the Chamber; this prop just tells the
   *  layout the height to reserve at the top of the grid. Default 0. */
  appHeaderHeight?: number
}

// Phase 7.6 — main scroll container ref exposed via context so
// `<JumpToLatest>` and `useAutoScroll` can target the right scroller.
const ChamberMainRefCtx = createContext<RefObject<HTMLElement | null> | null>(null)

export function useChamberMainRef(): RefObject<HTMLElement | null> | null {
  return useContext(ChamberMainRefCtx)
}

export function ChamberLayout({
  activeSpecialist,
  spine,
  spineMobileTrigger,
  stickyHeader,
  topRegion,
  thread,
  inputZone,
  ledger,
  banners,
  overlays,
  appHeaderHeight = 0,
}: Props) {
  const mainRef = useRef<HTMLElement | null>(null)
  return (
    <ChamberMainRefCtx.Provider value={mainRef}>
      <div
        className="relative isolate chamber-breath"
        data-mode="operating"
        style={{
          height: `calc(100dvh - ${appHeaderHeight}px)`,
        }}
      >
        {/* z-0 background stack — fixed to viewport, paint across the
         * whole chamber regardless of any scroll context underneath. */}
        <AmbientTint specialist={activeSpecialist} />
        <CursorParallax />
        <BlueprintSubstrate />
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
              * scroll container (main), never overlays the Spine. */}
            {stickyHeader}

            {topRegion ? (
              <div className="hidden md:block mx-auto w-full max-w-[var(--chamber-col-max)] px-[var(--chamber-col-px-tablet)] lg:px-[var(--chamber-col-px-desktop)] pt-12 lg:pt-14">
                {topRegion}
              </div>
            ) : null}

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
              <div className="mx-auto w-full max-w-[var(--chamber-col-max)] px-[var(--chamber-col-px-mobile)] md:px-[var(--chamber-col-px-tablet)] lg:px-[var(--chamber-col-px-desktop)] pt-3 pb-3 bg-[hsl(var(--paper)/0.92)] backdrop-blur-[3px] border-t border-[var(--hairline,rgba(26,22,18,0.10))]">
                {inputZone}
              </div>
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
