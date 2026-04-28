// ───────────────────────────────────────────────────────────────────────
// Phase 3.4 #53 — progress estimation for the chat workspace
//
// The Bayreuth single-family-home renovation arc moves through ~12-18
// turns spanning seven specialists. Each specialist signals roughly
// where the conversation is in that arc. We estimate progress as the
// max of (specialist anchor, turn-count fraction) so the bar feels
// honest whether a single specialist takes longer than expected or the
// arc moves faster.
// ───────────────────────────────────────────────────────────────────────

import type { Specialist } from '@/types/projectState'

/**
 * Anchor progress fractions per specialist. The percent the conversation
 * is roughly through when this voice is active. Calibrated against
 * Phase 3 conversation transcripts.
 */
export const SPECIALIST_PROGRESS: Record<Specialist, number> = {
  moderator: 0.05,
  planungsrecht: 0.25,
  bauordnungsrecht: 0.5,
  sonstige_vorgaben: 0.7,
  verfahren: 0.85,
  beteiligte: 0.92,
  synthesizer: 0.98,
}

const TYPICAL_TURN_COUNT = 18
const TURN_COUNT_CEILING = 0.95

export function estimateProgress(
  turnCount: number,
  currentSpecialist: Specialist | null,
): number {
  const fromSpec = currentSpecialist ? SPECIALIST_PROGRESS[currentSpecialist] : 0.05
  const fromTurns = Math.min(turnCount / TYPICAL_TURN_COUNT, TURN_COUNT_CEILING)
  return Math.max(fromSpec, fromTurns)
}

/**
 * Render-friendly turns-remaining range. Returns "—" when progress is
 * very high (we're in the wrap-up phase) or very low (we don't know
 * enough to estimate). Otherwise a tight range like "4–5".
 */
export function estimateTurnsRemaining(progress: number): string {
  if (progress >= 0.95) return ''
  const remainingFloat = (1 - progress) * TYPICAL_TURN_COUNT
  const lo = Math.max(1, Math.floor(remainingFloat - 1))
  const hi = Math.max(lo, Math.ceil(remainingFloat + 1))
  return lo === hi ? String(lo) : `${lo}–${hi}`
}
