import type { ProjectRow } from '@/types/db'
import type { Procedure, ProjectState } from '@/types/projectState'
import { deriveBaselineProcedure } from './deriveBaselineProcedure'
import { detectProcedure, type ProcedureType } from './costNormsMuenchen'

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

/**
 * Sprint 0 addendum (P1-A sibling) — THE single cost procedure-type resolver.
 *
 * The four cost surfaces previously resolved the procedure multiplier three
 * different ways: Cost tab + PDF read raw `state.procedures` (→ 'unknown' when
 * empty); At-a-Glance went through `resolveProcedures`; Executive Read inlined
 * its own baseline fallback. They agreed numerically ONLY because the baseline
 * procedure rationale happens to map to detectProcedure='unknown' (mult 1.0,
 * verified) — a latent desync that a single rationale edit or a detectProcedure
 * tweak would silently expose across surfaces. This makes the procedure axis a
 * single source of truth, mirroring resolveCostAreaSqm for the area axis.
 *
 * Resolution: the canonical `resolveProcedures` (persona procedures when
 * present, else the labelled "wahrscheinlich · pending architect" baseline),
 * the primary procedure (erforderlich, else first), then the cost engine's
 * detectProcedure heuristic. Cost and the procedure label shown to the bauherr
 * now come from the same place and cannot drift.
 */
export function resolveCostProcedureType(
  project: ProjectRow,
  state: Partial<ProjectState>,
): ProcedureType {
  const { procedures } = resolveProcedures(project, state)
  const primary =
    procedures.find((p) => p.status === 'erforderlich') ?? procedures[0]
  return detectProcedure(primary?.rationale_de ?? '')
}
