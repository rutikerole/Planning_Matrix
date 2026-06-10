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
 * feat/result-actions-to-rail: this bar is the MOBILE surface only. The
 * workspace MOUNTS it only below 900px (useViewport) and mounts the rail
 * variant above — so exactly one ResultActions (and one set of modals/toast)
 * is ever live. No `display:none` on this modal-owning tree. At ≥900px the
 * same actions live in the identity rail (`ResultRail` → `ResultActions
 * variant="rail"`); the desktop result page loses its bottom chrome entirely.
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
