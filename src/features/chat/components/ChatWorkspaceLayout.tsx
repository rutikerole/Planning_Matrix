import type { ReactNode } from 'react'
import { BlueprintSubstrate } from '@/components/shared/BlueprintSubstrate'

interface Props {
  leftRail?: ReactNode
  rightRail?: ReactNode
  /**
   * Phase 3.7 #75 — when provided, mounts as a fixed-position band
   * spanning the full grid width below the three-column body. Bottom
   * padding on the grid wrapper compensates so the last message
   * doesn't disappear under the footer.
   */
  unifiedFooter?: ReactNode
  children: ReactNode
}

/**
 * Three-zone desktop grid for the chat workspace.
 *   • lg+ : 280 px | flexible | 360 px, max width 1440 px
 *   • <lg : center column only; rails open as drawers (commit #14)
 *
 * Background is the existing `.bg-blueprint` class on the wrapper —
 * 4.5% opacity ink hairlines, defined in globals.css. Phase 4.1.10 —
 * center column widened from `max-w-2xl` (672 px / ~75 char) to
 * `max-w-3xl` (768 px / ~85 char) so it matches the InputBar's
 * EmbeddedShell exactly. German legal references
 * ("Bauordnungsrecht", "Bauvorlageberechtigung", "§ 34 BauGB") wrap
 * cleaner at 85 char, and the message column / input column now
 * share a single reading width — the Continue chip / FAB / send
 * button align across the two zones because they're anchored to the
 * same column geometry.
 */
export function ChatWorkspaceLayout({
  leftRail,
  rightRail,
  unifiedFooter,
  children,
}: Props) {
  return (
    <div
      className="min-h-dvh bg-paper relative isolate"
      // Phase 3.6 #67 — operating mode for the chat workspace. Atelier
      // tokens stay the default; this attribute opts the chat surface
      // into rounded corners + functional drop shadows + looser tracking
      // without bleeding into the landing / auth / wizard / cover hero.
      data-mode="operating"
    >
      <BlueprintSubstrate />
      <div aria-hidden="true" className="grain-overlay-fixed" />
      {/* Phase 3.7 #75 — bottom padding compensates for the fixed
        * unified footer. Desktop reserves ~180 px (input + secondary
        * actions stacked). Mobile reserves ~110 px (single bar). */}
      {/* Phase 7 Pass 2 — rails narrowed (260→220 left, 340→300
        * right) and message column clamped to 720 px so the chat
        * reads as a document instead of an instant-messenger column.
        * Net effect: more whitespace beside the message column,
        * tighter line lengths inside it. */}
      <div
        className={
          'mx-auto w-full max-w-[1440px] grid lg:grid-cols-[220px_minmax(0,1fr)_300px] grid-cols-1 ' +
          (unifiedFooter ? 'pb-[120px] lg:pb-[180px]' : '')
        }
      >
        <aside className="hidden lg:flex border-r border-border-strong/30 min-h-dvh">
          {leftRail}
        </aside>

        <main className="relative min-h-dvh flex flex-col">
          <div className="flex-1 flex justify-center px-6 sm:px-10 lg:px-14">
            <div className="w-full max-w-[720px] py-16 lg:py-20">{children}</div>
          </div>
        </main>

        <aside className="hidden lg:flex border-l border-border-strong/30 min-h-dvh">
          {rightRail}
        </aside>
      </div>

      {unifiedFooter}
    </div>
  )
}
