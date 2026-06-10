import { cn } from '@/lib/utils'
import type { MessageRow, ProjectRow } from '@/types/db'
import { ResultActions } from './ResultActions'
import type { ResultSource } from './ResultWorkspace'

interface ProjectEventRow {
  id: string
  created_at: string
  triggered_by: string
  event_type: string
  reason?: string | null
}

interface Props {
  project: ProjectRow
  messages: MessageRow[]
  events: ProjectEventRow[]
  source: ResultSource
}

/**
 * Phase 8 — sticky bottom action bar of the Result Workspace.
 *
 * feat/result-actions-to-rail: this bar is now the MOBILE surface only
 * (`spine:hidden`). At ≥900px the same actions live in the identity rail
 * (`ResultRail` → `ResultActions variant="rail"`), so the desktop result page
 * loses its bottom chrome entirely. The action set itself is shared via
 * `ResultActions` — this component is just the mobile sticky shell.
 *
 * Shared mode: hidden — recipients shouldn't generate further share links or
 * write actions. The workspace skips this footer entirely when
 * source.kind === 'shared'.
 */
export function ResultFooter({ project, messages, events, source }: Props) {
  if (source.kind === 'shared') return null

  return (
    <footer
      className={cn(
        'sticky bottom-0 z-[var(--z-band)] bg-paper-card/95 backdrop-blur-[6px] border-t border-ink/15',
        'px-4 sm:px-6 lg:px-8 py-3',
        // Desktop carries these actions in the rail; hide the bottom bar.
        'spine:hidden',
      )}
      data-no-print="true"
    >
      <div className="max-w-[1200px] mx-auto">
        <ResultActions
          project={project}
          messages={messages}
          events={events}
          variant="bar"
        />
      </div>
    </footer>
  )
}
