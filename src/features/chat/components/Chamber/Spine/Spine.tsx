// Phase 7.5 — Spine sidebar.
//
// 240 px fixed left aside. Carries:
//   - SpineHeader (sticky top): wordmark + project + plot + round
//     + slim 2 px progress bar.
//   - SpineStageList (scrollable middle): 8 stages over a clay-rail.
//   - SpineFooter (sticky bottom): one always-visible Open briefing
//     button (BriefingCTA variant="sidebar").
//
// On viewports < 1024 px the Spine is hidden; SpineMobileTrigger
// renders a 36 px strip below AstrolabeStickyHeader instead and opens
// the full Spine in a vaul left drawer.
//
// Subsequent commits fill the slots; this file is the shell.

import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface Props {
  header?: ReactNode
  stageList?: ReactNode
  footer?: ReactNode
  className?: string
}

export function Spine({ header, stageList, footer, className }: Props) {
  return (
    <aside
      aria-label="Project journey"
      role="complementary"
      data-spine-root="true"
      className={cn(
        'hidden lg:flex',
        // Phase 7.6 §1.7 — sits below the global app header (48 px).
        'fixed left-0 top-12 bottom-0 z-[25]',
        'w-spine flex-col',
        'bg-paper-card border-r border-[var(--hairline,rgba(26,22,18,0.10))]',
        className,
      )}
    >
      {header}
      <div className="flex-1 min-h-0 flex flex-col">{stageList}</div>
      {footer}
    </aside>
  )
}
