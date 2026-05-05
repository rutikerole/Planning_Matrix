import type { ProjectRow } from '@/types/db'
import type { ProjectState } from '@/types/projectState'
import { ExecutiveRead } from '../Cards/ExecutiveRead'
import { AtAGlance } from '../Cards/AtAGlance'
import { ActionCards } from '../Cards/ActionCards'
import { ComparableProjectsSlot } from '../Cards/ComparableProjectsSlot'

interface Props {
  project: ProjectRow
  state: Partial<ProjectState>
}

/**
 * Phase 8 — Tab 1 Overview. The "if I read nothing else" tab.
 *
 * Composition: 2-column top row (Executive Read 1.4fr + At a Glance
 * 1fr) → action cards row (Do next · Verify · Data quality). Stacks
 * to single column on small viewports.
 */
export function OverviewTab({ project, state }: Props) {
  return (
    <div className="flex flex-col gap-8 max-w-[1100px]">
      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6 lg:gap-10">
        <ExecutiveRead project={project} state={state} />
        <AtAGlance project={project} state={state} />
      </div>
      <ActionCards project={project} state={state} />
      <ComparableProjectsSlot />
    </div>
  )
}
