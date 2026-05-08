import type { ProjectRow } from '@/types/db'
import type { ProjectState } from '@/types/projectState'
import { ExecutiveRead } from '../Cards/ExecutiveRead'
import { AtAGlance } from '../Cards/AtAGlance'
import { ActionCards } from '../Cards/ActionCards'
import { ComparableProjectsSlot } from '../Cards/ComparableProjectsSlot'
import {
  VorlaeufigFooter,
  isPending,
} from '@/features/architect/components/VorlaeufigFooter'

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
 *
 * v1.0.3 — tab-level Vorläufig footer aggregates across every
 * qualifier-bearing entity in `state` (recommendations, procedures,
 * documents, roles). Hides only when ALL of them are
 * DESIGNER+VERIFIED — the architect verification flow's binding
 * client-side signal.
 */
export function OverviewTab({ project, state }: Props) {
  const anyPending =
    (state.recommendations ?? []).some((r) =>
      isPending(r.qualifier?.source, r.qualifier?.quality),
    ) ||
    (state.procedures ?? []).some((p) =>
      isPending(p.qualifier?.source, p.qualifier?.quality),
    ) ||
    (state.documents ?? []).some((d) =>
      isPending(d.qualifier?.source, d.qualifier?.quality),
    ) ||
    (state.roles ?? []).some((r) =>
      isPending(r.qualifier?.source, r.qualifier?.quality),
    )
  return (
    <div className="flex flex-col gap-8 max-w-[1100px]">
      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6 lg:gap-10">
        <ExecutiveRead project={project} state={state} />
        <AtAGlance project={project} state={state} />
      </div>
      <ActionCards project={project} state={state} />
      <ComparableProjectsSlot />
      {anyPending && <VorlaeufigFooter source={null} quality={null} />}
    </div>
  )
}
