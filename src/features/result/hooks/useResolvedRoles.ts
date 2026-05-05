import { useMemo } from 'react'
import type { ProjectRow } from '@/types/db'
import type { ProjectState } from '@/types/projectState'
import { resolveRoles, type ResolvedRoles } from '../lib/resolveRoles'

export type { ResolvedRoles }

/**
 * Phase 8.1 (A.1) — single source of truth for the role list.
 * Phase 8.5 (A.3) — delegates to the pure `resolveRoles` helper so
 * React renders + PDF/Markdown/JSON exports stay consistent.
 */
export function useResolvedRoles(
  project: ProjectRow,
  state: Partial<ProjectState>,
): ResolvedRoles {
  return useMemo(
    () => resolveRoles(project, state),
    [project, state],
  )
}
