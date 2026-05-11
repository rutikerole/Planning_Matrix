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

// v1.0.6 Bug 4 — header confidence is the fact-quality mix only.
//
// The legacy formula (factScore × 0.65 + sectionScore × 0.35) let
// sectionScore=100 inflate a factScore=82 project to ~94%, which is
// not defensible when only 57% of facts are DECIDED. Hessen × T-03
// smoke walk surfaced "CONFIDENCE 94% — preliminary · pending
// architect confirmation" against the DataQualityDonut's
// Decided 57% / Calculated 17% / Assumed 26% — the two surfaces
// visibly disagreed.
//
// Resolution: factScore alone drives the header. sectionScore stays
// computed in the breakdown for tooltip transparency but contributes
// 0 to the composite. The "How was this computed?" link should
// surface the unweighted mix verbatim.
const FACT_WEIGHT = 1.0
const SECTION_WEIGHT = 0.0

/**
 * Phase 8 / 8.1 (A.6) — header confidence percent.
 *
 * v1.0.6 Bug 4: factScore is the sole driver of the composite total.
 * sectionScore is still computed in the breakdown so the tooltip can
 * surface "fact-quality 82% · section completeness 100%" verbatim,
 * but it no longer lifts the headline number above the fact-quality
 * mix it claims to summarise.
 *
 * Fact-quality mix: DECIDED/VERIFIED count 1.0, CALCULATED 0.85,
 * ASSUMED 0.4; sum / count.
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
