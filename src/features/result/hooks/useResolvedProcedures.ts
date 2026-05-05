import { useMemo } from 'react'
import type { ProjectRow } from '@/types/db'
import type { Procedure, ProjectState } from '@/types/projectState'
import { deriveBaselineProcedure } from '../lib/deriveBaselineProcedure'

export interface ResolvedProcedures {
  procedures: Procedure[]
  /** True when persona-emitted; false when rendering the baseline. */
  isFromState: boolean
}

/**
 * Phase 8.1 (A.3) — single source of truth for the procedure list.
 * Persona-emitted procedures take precedence; baseline fills in until
 * the consultation has narrowed down the actual procedure path.
 */
export function useResolvedProcedures(
  project: ProjectRow,
  state: Partial<ProjectState>,
): ResolvedProcedures {
  return useMemo(() => {
    const persona = state.procedures ?? []
    if (persona.length > 0) return { procedures: persona, isFromState: true }
    return {
      procedures: deriveBaselineProcedure({
        intent: project.intent,
        bundesland: project.bundesland,
      }),
      isFromState: false,
    }
  }, [project.intent, project.bundesland, state.procedures])
}
