import { useMemo } from 'react'
import type { ProjectRow } from '@/types/db'
import type { ProjectState } from '@/types/projectState'
import { resolveProcedures, type ResolvedProcedures } from '../lib/resolveProcedures'

export type { ResolvedProcedures }

/**
 * Phase 8.1 (A.3) — single source of truth for the procedure list.
 * Phase 8.5 (A.3) — delegates to the pure `resolveProcedures` helper
 * so React renders + PDF/Markdown/JSON exports stay consistent.
 */
export function useResolvedProcedures(
  project: ProjectRow,
  state: Partial<ProjectState>,
): ResolvedProcedures {
  return useMemo(
    () => resolveProcedures(project, state),
    [project, state],
  )
}
