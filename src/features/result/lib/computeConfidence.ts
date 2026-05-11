import type { ProjectState } from '@/types/projectState'
import { computeSectionCompleteness } from './computeSectionCompleteness'
import { aggregateQualifiers } from './qualifierAggregate'

export interface ConfidenceBreakdown {
  /** Composite percent shown in the header (0–100 integer). */
  total: number
  /** Qualifier-mix score across all qualifier-bearing categories
   *  (facts + procedures + documents + roles + recommendations).
   *  Field name kept as `factScore` for backward compatibility with
   *  callers; the underlying scope widened in v1.0.7. */
  factScore: number
  /** Section completeness score (0–100 integer). */
  sectionScore: number
  /** Weighting applied to factScore (0–100 integer; e.g. 100 in v1.0.6+). */
  factWeight: number
  /** Weighting applied to sectionScore (0–100 integer; 0 in v1.0.6+). */
  sectionWeight: number
}

// v1.0.6 Bug 4 + v1.0.7 Bug 8 — header confidence is the qualifier-
// mix score across ALL qualifier-bearing categories, weighted to
// match the DataQualityDonut grouping the user sees on the same
// page.
//
// v1.0.6 (Bug 4) dropped sectionScore weight to 0 so the header
// number couldn't be inflated by section completeness above the
// fact-quality mix.
//
// v1.0.7 (Bug 8) widens the SCOPE of the mix. Previously the score
// walked only state.facts; the donut walks all five categories
// (facts + procedures + documents + roles + recommendations). On
// the Hessen × T-03 project the donut showed 57/17/26 but the
// header showed 91% because facts had a different (more DECIDED)
// distribution than the global. The two surfaces visibly diverged.
// Switching to aggregateQualifiers makes the header number track
// exactly what the donut shows the user.
//
// Weighting mirrors the donut's slice grouping:
//   - DECIDED                       × 1.0
//   - CALCULATED + VERIFIED         × 0.85
//   - ASSUMED + UNKNOWN             × 0.4
// For a 57/17/26 donut split this resolves to ≈ 82, which is the
// defensible value Rutik called for.
const FACT_WEIGHT = 1.0
const SECTION_WEIGHT = 0.0

/**
 * Phase 8 / 8.1 (A.6) — header confidence percent.
 *
 * v1.0.7 Bug 8: scope widened to all 5 qualifier-bearing categories
 * (matches DataQualityDonut). Weighting:
 *   DECIDED 1.0 · CALCULATED+VERIFIED 0.85 · ASSUMED+UNKNOWN 0.4
 *
 * Returns 0 when the project has no qualifier-bearing items AND
 * no sections populated (the header renders an em-dash in that
 * case rather than 0%).
 */
export function computeConfidence(state: Partial<ProjectState>): number {
  return computeConfidenceBreakdown(state).total
}

export function computeConfidenceBreakdown(
  state: Partial<ProjectState>,
): ConfidenceBreakdown {
  const agg = aggregateQualifiers(state)
  let factScore = 0
  if (agg.total > 0) {
    const decidedWeight = agg.counts.DECIDED * 1.0
    const calcWeight =
      (agg.counts.CALCULATED + agg.counts.VERIFIED) * 0.85
    const assumedWeight =
      (agg.counts.ASSUMED + agg.counts.UNKNOWN) * 0.4
    const sum = decidedWeight + calcWeight + assumedWeight
    factScore = Math.round((sum / agg.total) * 100)
  }
  const sectionScore = computeSectionCompleteness(state).percent
  const total =
    agg.total === 0 && sectionScore === 0
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
