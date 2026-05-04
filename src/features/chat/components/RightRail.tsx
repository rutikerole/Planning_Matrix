import type { ProjectState } from '@/types/projectState'
import type { MessageRow, ProjectRow } from '@/types/db'
import { Top3 } from './Top3'
import { ProceduresPanel } from './ProceduresPanel'
import { DocumentsPanel } from './DocumentsPanel'
import { RolesPanel } from './RolesPanel'
import { EckdatenPanel } from './EckdatenPanel'
import { ProjectPortrait } from './ProjectPortrait'
import { FactTicker } from './FactTicker'

interface Props {
  project: ProjectRow
  messages: MessageRow[]
}

// Phase 7 Move 10c — derive the live area from the latest assistant
// specialist. Only the three "area-owning" specialists map to A/B/C;
// moderator / verfahren / beteiligte / synthesizer cover work that
// spans areas, so we render no live indicator while they speak.
function liveAreaFromMessages(
  messages: MessageRow[],
): 'A' | 'B' | 'C' | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]
    if (m.role !== 'assistant' || !m.specialist) continue
    switch (m.specialist) {
      case 'planungsrecht':
        return 'A'
      case 'bauordnungsrecht':
        return 'B'
      case 'sonstige_vorgaben':
        return 'C'
      default:
        return null
    }
  }
  return null
}

/**
 * Phase 3.2 #40 — right rail rebuilt as an architectural project
 * sidebar. Reads top-to-bottom like the cover sheet of a Bauantrag:
 *
 *   1. Axonometric drawing of the active intent + scale bar M 1:100
 *   2. TOP-3 recommendation cards (drafting-blue left edge, italic
 *      Serif drop-cap titles, italic Serif margin footers)
 *   3. BEREICHE — A/B/C as a small plan-section diagram with hatched
 *      bands per state
 *   4. ECKDATEN — schedule blocks, Roman numeral column + hairline
 *   5. Schedule sections I (Verfahren) / II (Dokumente) / III (Fachplaner)
 *   6. Overview link
 *   7. Cost ticker as scale-bar flourish
 */
export function RightRail({ project, messages }: Props) {
  const state = (project.state ?? {}) as Partial<ProjectState>
  const recommendations = state.recommendations ?? []
  const facts = (state.facts ?? []).slice(-5).reverse()
  const liveArea = liveAreaFromMessages(messages)

  return (
    <div className="w-full flex flex-col px-5 py-7 gap-7">
      {/* 1. Project portrait — Phase 7 Pass 2 merges what used to be
        * two separate blocks (IntentAxonometric + BereichePlanSection)
        * into a single drawing-with-legend card. Live-area pulse
        * still drives the band whose specialist is currently
        * speaking. */}
      <ProjectPortrait
        intent={project.intent}
        state={state}
        liveArea={liveArea}
      />

      {/* 2. TOP-3 cards — hidden when empty (Pass 2 Move 4). */}
      <Top3 recommendations={recommendations} />

      {/* 4. ECKDATEN schedule */}
      <EckdatenPanel project={project} facts={facts} />

      {/* 5. Schedule sections — Verfahren · Dokumente · Fachplaner */}
      <ProceduresPanel procedures={state.procedures ?? []} />
      <DocumentsPanel documents={state.documents ?? []} />
      <RolesPanel roles={state.roles ?? []} />

      <div className="flex-1" />

      {/* Phase 3.7 #75 — Open-cockpit link + CostTicker moved into the
        * UnifiedFooter band. The FactTicker stays as the rail's idle
        * decoration. */}
      <FactTicker />
    </div>
  )
}
