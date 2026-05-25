import type { ProjectRow } from '@/types/db'
import type { ProjectState, Role } from '@/types/projectState'
import { deriveBaselineRoles } from './deriveBaselineRoles'
import { stripVersionTokens } from '@/lib/stripVersionTokens'

export interface ResolvedRoles {
  roles: Role[]
  isFromState: boolean
}

const normTitle = (s: string): string => s.toLowerCase().replace(/[^a-zäöüß]/g, '')

/** v1.0.29 Bug 67/82 — scrub internal version tokens from user-facing role copy. */
function sanitizeRole(r: Role): Role {
  return {
    ...r,
    rationale_de: stripVersionTokens(r.rationale_de ?? ''),
    rationale_en: stripVersionTokens(r.rationale_en ?? ''),
    qualifier: r.qualifier
      ? { ...r.qualifier, reason: stripVersionTokens(r.qualifier.reason ?? '') || r.qualifier.reason }
      : r.qualifier,
  }
}

/**
 * Phase 8.5 (A.3) — pure variant of useResolvedRoles (Phase 8.1).
 * For non-React callers (PDF + export pipelines).
 */
export function resolveRoles(
  project: ProjectRow,
  state: Partial<ProjectState>,
): ResolvedRoles {
  const persona = (state.roles ?? []).map(sanitizeRole)
  const baseline = deriveBaselineRoles({
    intent: project.intent,
    bundesland: project.bundesland,
  }).map(sanitizeRole)

  if (persona.length === 0) return { roles: baseline, isFromState: false }

  // v1.0.29 Bug 67 — union floor. A thin persona emission (the Hamburg T-02
  // walk emitted ONE role yet the persona had named five) must not suppress
  // the deterministic baseline. Persona roles win on content; baseline roles
  // the persona didn't cover are appended, matched by normalized title.
  const have = new Set(
    persona.flatMap((r) => [normTitle(r.title_de), normTitle(r.title_en)]),
  )
  const missing = baseline.filter(
    (b) => !have.has(normTitle(b.title_de)) && !have.has(normTitle(b.title_en)),
  )
  return { roles: [...persona, ...missing], isFromState: true }
}
