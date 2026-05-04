// Phase 7.5 — SpineFooter.
//
// Sticky bottom of the Spine. Carries the BriefingCTA in its sidebar
// variant (always visible, ignores the gate's progress-scaled
// prominence). A 24 px gradient mask sits above the border so the
// stage list dissolves into the footer cleanly.

import type { CompletionGate } from '../../../hooks/useCompletionGate'
import type { CompletionSignal } from '@/types/chatTurn'
import { BriefingCTA } from '../BriefingCTA'

interface Props {
  projectId: string
  gate: CompletionGate
  signal: CompletionSignal | null
}

export function SpineFooter({ projectId, gate, signal }: Props) {
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
      <div className="border-t border-[var(--hairline,rgba(26,22,18,0.10))] px-3.5 py-3">
        <BriefingCTA
          projectId={projectId}
          gate={gate}
          signal={signal}
          variant="sidebar"
        />
      </div>
    </footer>
  )
}
