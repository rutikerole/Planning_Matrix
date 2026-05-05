import type { ProjectState } from '@/types/projectState'

/**
 * Phase 8 — header confidence percent. Different from the chat
 * progress gauge: this measures *quality* of the underlying data, not
 * progression of the conversation.
 *
 *   DECIDED + VERIFIED → weight 1.0
 *   CALCULATED          → weight 0.85
 *   ASSUMED             → weight 0.4
 *
 * The score is the weighted sum divided by the total fact count,
 * clamped to 0–100. Empty state returns 0 (the header renders an
 * em-dash in that case rather than a misleading zero).
 */
export function computeConfidence(state: Partial<ProjectState>): number {
  const facts = state.facts ?? []
  if (facts.length === 0) return 0
  let sum = 0
  for (const f of facts) {
    const q = f.qualifier?.quality
    if (q === 'DECIDED' || q === 'VERIFIED') sum += 1.0
    else if (q === 'CALCULATED') sum += 0.85
    else if (q === 'ASSUMED') sum += 0.4
  }
  return Math.round((sum / facts.length) * 100)
}
