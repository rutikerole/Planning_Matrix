// Phase 7.5 — SpineFooter.
//
// Sticky bottom of the Spine. Carries the BriefingCTA in its sidebar
// variant (always visible, ignores the gate's progress-scaled
// prominence). A 24 px gradient mask sits above the border so the
// stage list dissolves into the footer cleanly.
//
// Phase 7.9 §2.3 — auth zone added below the briefing button.
// DE/EN segmented switch (left) + RE avatar with chevron (right).
// The components are reused as-is from the AppHeader (LanguageSwitcher
// + UserMenu) so DE/EN persistence and the sign-out flow continue
// to wire through the same hooks.

import type { CompletionGate } from '../../../hooks/useCompletionGate'
import type { CompletionSignal } from '@/types/chatTurn'
import { BriefingCTA } from '../BriefingCTA'
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher'
import { UserMenu } from '@/components/shared/AppHeader'
import { InlineLogsButton } from '@/features/admin/components/InlineLogsButton'

interface Props {
  projectId: string
  /** Phase 9.1 — surfaced to the admin Logs drawer header. */
  projectName: string
  gate: CompletionGate
  signal: CompletionSignal | null
}

export function SpineFooter({ projectId, projectName, gate, signal }: Props) {
  return (
    <footer className="sticky bottom-0 bg-paper-card relative">
      {/* 24 px upper gradient mask */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-6 left-0 right-0 h-6"
        style={{
          backgroundImage:
            'linear-gradient(to bottom, hsl(38 30% 96% / 0) 0%, hsl(38 30% 96% / 1) 100%)',
        }}
      />
      <div className="border-t border-[var(--hairline,rgba(26,22,18,0.10))] px-5 py-3.5 flex flex-col gap-2.5">
        <BriefingCTA
          projectId={projectId}
          gate={gate}
          signal={signal}
          variant="sidebar"
        />
        {/* Phase 9.1 — admin-only Logs button. Renders nothing for
         *  non-admins so the rhythm of the footer is preserved. */}
        <InlineLogsButton
          projectId={projectId}
          projectName={projectName}
          variant="sidebar"
        />
        {/* Phase 7.9 §2.3 — auth zone. */}
        <div className="flex items-center justify-between px-1 pt-1">
          <LanguageSwitcher />
          <UserMenu />
        </div>
      </div>
    </footer>
  )
}
