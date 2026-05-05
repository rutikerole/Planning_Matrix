import type { ProjectState } from '@/types/projectState'

export interface SectionCompleteness {
  overview: boolean
  legal: boolean
  procedure: boolean
  team: boolean
  cost: boolean
  suggestions: boolean
  /** Number of populated sections out of 6. */
  populated: number
  /** populated / 6, rounded to 0–100 integer. */
  percent: number
}

/**
 * Phase 8.1 (A.6) — section completeness for the workspace's six base
 * tabs. "Populated" means the persona has emitted enough real data
 * for the section to render meaningful content. Baseline-only sections
 * (the workspace's auto-derived cost / procedure / role rows) score
 * `false` here — they're filled by helpers, not by the consultation.
 *
 * Used by computeConfidence as the section-completeness factor in the
 * two-factor formula, and by the header confidence-tooltip to render
 * the breakdown to the user.
 */
export function computeSectionCompleteness(
  state: Partial<ProjectState>,
): SectionCompleteness {
  const facts = state.facts ?? []
  const procedures = state.procedures ?? []
  const documents = state.documents ?? []
  const roles = state.roles ?? []
  const recommendations = state.recommendations ?? []
  const areas = state.areas

  const overview = facts.length >= 4 || recommendations.length > 0
  const legal =
    !!areas &&
    (areas.A?.state === 'ACTIVE' ||
      areas.B?.state === 'ACTIVE' ||
      areas.C?.state === 'ACTIVE')
  const procedure = procedures.length > 0 || documents.length > 0
  const team = roles.filter((r) => r.needed).length > 0
  // Cost is "populated" when there's enough state for the cost
  // engine's heuristics (procedure, klasse, area) to vary meaningfully
  // — not just the BASE multiplier × default.
  const corpus = facts
    .map((f) => `${f.key} ${typeof f.value === 'string' ? f.value : ''}`)
    .join(' ')
    .toLowerCase()
  const cost =
    procedures.length > 0 ||
    /gebaeudeklasse|geb_klasse|gk_/i.test(corpus) ||
    /m²|m2|qm|quadratmeter/i.test(corpus)
  // Suggestions: the matcher caps at 8 visible; we treat ≥1 fitted
  // suggestion as "populated." Computing the matcher here would be
  // a circular import, so we approximate via the same shape: any
  // recommendations present, or area-A active (a meaningful proxy
  // for "we know enough about this project to surface fits").
  const suggestions = recommendations.length > 0 || legal

  const flags = [overview, legal, procedure, team, cost, suggestions]
  const populated = flags.filter(Boolean).length
  const percent = Math.round((populated / flags.length) * 100)

  return {
    overview,
    legal,
    procedure,
    team,
    cost,
    suggestions,
    populated,
    percent,
  }
}
