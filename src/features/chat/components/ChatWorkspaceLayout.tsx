import type { ReactNode } from 'react'

interface Props {
  leftRail?: ReactNode
  rightRail?: ReactNode
  inputBar?: ReactNode
  children: ReactNode
}

/**
 * Three-zone desktop grid for the chat workspace.
 *   • lg+ : 280 px | flexible | 360 px, max width 1440 px
 *   • <lg : center column only; rails open as drawers (commit #14)
 *
 * Background is the existing `.bg-blueprint` class on the wrapper —
 * 4.5% opacity ink hairlines, defined in globals.css. Center column
 * is constrained to max-w-2xl + generous vertical padding so messages
 * read like a focused document, not a chat-app stream.
 */
export function ChatWorkspaceLayout({ leftRail, rightRail, inputBar, children }: Props) {
  return (
    <div className="min-h-dvh bg-paper relative isolate">
      <div aria-hidden="true" className="absolute inset-0 bg-blueprint pointer-events-none -z-10" />
      <div className="mx-auto w-full max-w-[1440px] grid lg:grid-cols-[280px_minmax(0,1fr)_360px] grid-cols-1">
        <aside className="hidden lg:flex border-r border-border-strong/30 min-h-dvh">
          {leftRail}
        </aside>

        <main className="relative min-h-dvh flex flex-col">
          <div className="flex-1 flex justify-center px-6 sm:px-10 lg:px-14">
            <div className="w-full max-w-2xl py-16 lg:py-20">{children}</div>
          </div>
          {inputBar}
        </main>

        <aside className="hidden lg:flex border-l border-border-strong/30 min-h-dvh">
          {rightRail}
        </aside>
      </div>
    </div>
  )
}
