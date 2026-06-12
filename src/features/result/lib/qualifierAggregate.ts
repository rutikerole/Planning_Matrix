/**
 * Phase 3.5 #63 — qualifier aggregation for the confidence radial.
 *
 * Walks the entire project state and counts qualifier qualities
 * (DECIDED / CALCULATED / VERIFIED / ASSUMED / unknown) across all
 * objects that carry a qualifier: facts, procedures, documents,
 * roles, recommendations.
 *
 * The radial groups CALCULATED + VERIFIED into a single
 * "drafting-blue" slice (both represent "the model worked it out"),
 * keeps DECIDED (ink) and ASSUMED (clay) separate, and falls back
 * to "unknown" (ink/30) for items lacking a qualifier.
 */

import type { ProjectState } from '@/types/projectState'
import { isDeliverableFactKey } from '@/legal/systemFlagFilter'

export type SliceKey = 'DECIDED' | 'CALCULATED' | 'VERIFIED' | 'ASSUMED' | 'UNKNOWN'

export interface Aggregate {
  total: number
  counts: Record<SliceKey, number>
  /** Count of items where qualifier.quality === 'ASSUMED'. */
  assumedCount: number
}

export function aggregateQualifiers(state: Partial<ProjectState>): Aggregate {
  const counts: Record<SliceKey, number> = {
    DECIDED: 0,
    CALCULATED: 0,
    VERIFIED: 0,
    ASSUMED: 0,
    UNKNOWN: 0,
  }
  let total = 0

  const tally = (q: { source?: string; quality?: string } | undefined) => {
    total++
    const k = q?.quality
    if (k === 'DECIDED' || k === 'CALCULATED' || k === 'VERIFIED' || k === 'ASSUMED') {
      counts[k]++
    } else {
      counts.UNKNOWN++
    }
  }

  // fix/t06-walk2 — the quality denominator + confidence inputs must not
  // count system flags or template-foreign typed facts (walk-2: 41-fact
  // donut included plot.outside_munich_acknowledged + abbruch_typ-on-T-06).
  ;(state.facts ?? [])
    .filter((f) => isDeliverableFactKey(f.key, state.templateId))
    .forEach((f) => tally(f.qualifier))
  ;(state.procedures ?? []).forEach((p) => tally(p.qualifier))
  ;(state.documents ?? []).forEach((d) => tally(d.qualifier))
  ;(state.roles ?? []).forEach((r) => tally(r.qualifier))
  ;(state.recommendations ?? []).forEach((r) => tally(r.qualifier))

  return {
    total,
    counts,
    assumedCount: counts.ASSUMED,
  }
}
