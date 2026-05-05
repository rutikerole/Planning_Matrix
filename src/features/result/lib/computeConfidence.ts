import type { ProjectState } from '@/types/projectState'
import { computeSectionCompleteness } from './computeSectionCompleteness'

export interface ConfidenceBreakdown {
  /** Composite percent shown in the header (0–100 integer). */
  total: number
  /** Fact-quality mix score (0–100 integer). */
  factScore: number
  /** Section completeness score (0–100 integer). */
  sectionScore: number
  /** Weighting applied to factScore (0–100 integer; e.g. 65). */
  factWeight: number
  /** Weighting applied to sectionScore (0–100 integer; e.g. 35). */
  sectionWeight: number
}

const FACT_WEIGHT = 0.65
const SECTION_WEIGHT = 0.35

/**
 * Phase 8 / 8.1 (A.6) — header confidence percent.
 *
 * Two factors:
 *   1. Fact quality mix — DECIDED/VERIFIED count 1.0, CALCULATED 0.85,
 *      ASSUMED 0.4; sum / count.
 *   2. Section completeness — how many of the 6 workspace sections
 *      have persona-emitted content. See computeSectionCompleteness.
 *
 * Composite = 0.65 × factScore + 0.35 × sectionScore. This makes the
 * header honest: a project with a few decided facts but 5 empty
 * sections can no longer score 86%; it scores ~50%.
 *
 * Returns 0 when the project has no facts AND no sections populated
 * (the header renders an em-dash in that case rather than 0%).
 */
export function computeConfidence(state: Partial<ProjectState>): number {
  return computeConfidenceBreakdown(state).total
}

export function computeConfidenceBreakdown(
  state: Partial<ProjectState>,
): ConfidenceBreakdown {
  const facts = state.facts ?? []
  let factScore = 0
  if (facts.length > 0) {
    let sum = 0
    for (const f of facts) {
      const q = f.qualifier?.quality
      if (q === 'DECIDED' || q === 'VERIFIED') sum += 1.0
      else if (q === 'CALCULATED') sum += 0.85
      else if (q === 'ASSUMED') sum += 0.4
    }
    factScore = Math.round((sum / facts.length) * 100)
  }
  const sectionScore = computeSectionCompleteness(state).percent
  const total =
    facts.length === 0 && sectionScore === 0
      ? 0
      : Math.round(factScore * FACT_WEIGHT + sectionScore * SECTION_WEIGHT)
  return {
    total,
    factScore,
    sectionScore,
    factWeight: Math.round(FACT_WEIGHT * 100),
    sectionWeight: Math.round(SECTION_WEIGHT * 100),
  }
}
