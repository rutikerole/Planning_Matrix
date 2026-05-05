import { useMemo } from 'react'
import type { ProjectRow } from '@/types/db'
import type { ProjectState, Role } from '@/types/projectState'
import { deriveBaselineRoles } from '../lib/deriveBaselineRoles'

export interface ResolvedRoles {
  roles: Role[]
  /** True when the persona has emitted at least one role; false when
   *  we're rendering the baseline. UI uses this to show a "likely ·
   *  pending architect confirmation" badge on baseline rows. */
  isFromState: boolean
}

/**
 * Phase 8.1 (A.1) — single source of truth for the role list across
 * AtAGlance, TeamTab, and (future) CostTimelineTab. Returns persona-
 * emitted `state.roles` when present (`isFromState: true`), else the
 * intent-derived baseline (`isFromState: false`).
 */
export function useResolvedRoles(
  project: ProjectRow,
  state: Partial<ProjectState>,
): ResolvedRoles {
  return useMemo(() => {
    const personaRoles = state.roles ?? []
    if (personaRoles.length > 0) {
      return { roles: personaRoles, isFromState: true }
    }
    const roles = deriveBaselineRoles({
      intent: project.intent,
      bundesland: project.bundesland,
    })
    return { roles, isFromState: false }
  }, [project.intent, project.bundesland, state.roles])
}
