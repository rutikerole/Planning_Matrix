import type { ProjectRow } from '@/types/db'
import type { Procedure, ProjectState } from '@/types/projectState'
import { deriveBaselineProcedure } from './deriveBaselineProcedure'

export interface ResolvedProcedures {
  procedures: Procedure[]
  /** True when persona-emitted; false when rendering the baseline. */
  isFromState: boolean
}

/**
 * Phase 8.5 (A.3) — pure variant of useResolvedProcedures (Phase 8.1).
 * Identical resolution logic, no React hook semantics. Used by the
 * PDF builder + any other non-React caller (e.g., markdown / JSON
 * export pipelines) so React + PDF render the same data.
 *
 * The hook (useResolvedProcedures) keeps its memoised wrapper for
 * use in components.
 */
export function resolveProcedures(
  project: ProjectRow,
  state: Partial<ProjectState>,
): ResolvedProcedures {
  const persona = state.procedures ?? []
  if (persona.length > 0) return { procedures: persona, isFromState: true }
  return {
    procedures: deriveBaselineProcedure({
      intent: project.intent,
      bundesland: project.bundesland,
    }),
    isFromState: false,
  }
}
