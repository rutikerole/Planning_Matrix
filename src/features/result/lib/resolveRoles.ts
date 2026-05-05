import type { ProjectRow } from '@/types/db'
import type { ProjectState, Role } from '@/types/projectState'
import { deriveBaselineRoles } from './deriveBaselineRoles'

export interface ResolvedRoles {
  roles: Role[]
  isFromState: boolean
}

/**
 * Phase 8.5 (A.3) — pure variant of useResolvedRoles (Phase 8.1).
 * For non-React callers (PDF + export pipelines).
 */
export function resolveRoles(
  project: ProjectRow,
  state: Partial<ProjectState>,
): ResolvedRoles {
  const persona = state.roles ?? []
  if (persona.length > 0) return { roles: persona, isFromState: true }
  return {
    roles: deriveBaselineRoles({
      intent: project.intent,
      bundesland: project.bundesland,
    }),
    isFromState: false,
  }
}
