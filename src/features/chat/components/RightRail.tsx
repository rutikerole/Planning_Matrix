import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { ProjectState } from '@/types/projectState'
import type { MessageRow, ProjectRow } from '@/types/db'
import { Top3 } from './Top3'
import { ProceduresPanel } from './ProceduresPanel'
import { DocumentsPanel } from './DocumentsPanel'
import { RolesPanel } from './RolesPanel'
import { EckdatenPanel } from './EckdatenPanel'
import { CostTicker } from './CostTicker'
import { IntentAxonometric } from './IntentAxonometric'
import { BereichePlanSection } from './BereichePlanSection'
import { FactTicker } from './FactTicker'

interface Props {
  project: ProjectRow
  messages: MessageRow[]
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
  const { t } = useTranslation()
  const state = (project.state ?? {}) as Partial<ProjectState>
  const recommendations = state.recommendations ?? []
  const facts = (state.facts ?? []).slice(-5).reverse()

  return (
    <div className="w-full flex flex-col px-5 py-7 gap-7">
      {/* 1. Axonometric drawing of the active intent */}
      <IntentAxonometric intent={project.intent} />

      {/* 2. TOP-3 cards */}
      <Top3 recommendations={recommendations} />

      {/* 3. BEREICHE plan-section */}
      <BereichePlanSection state={state} />

      {/* 4. ECKDATEN schedule */}
      <EckdatenPanel project={project} facts={facts} />

      {/* 5. Schedule sections — Verfahren · Dokumente · Fachplaner */}
      <ProceduresPanel procedures={state.procedures ?? []} />
      <DocumentsPanel documents={state.documents ?? []} />
      <RolesPanel roles={state.roles ?? []} />

      <div className="flex-1" />

      {/* 6. Overview link */}
      <Link
        to={`/projects/${project.id}/overview`}
        className="text-[12px] text-clay/85 hover:text-ink underline underline-offset-4 decoration-clay/55 self-start transition-colors duration-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm"
      >
        {t('chat.rail.openOverview')}
      </Link>

      {/* 7. Phase 3.4 #56 — Bayern fact ticker, idle-only */}
      <FactTicker />

      {/* 8. Cost ticker — scale-bar flourish */}
      <CostTicker messages={messages} />
    </div>
  )
}
