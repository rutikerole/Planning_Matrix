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

// ───────────────────────────────────────────────────────────────────────
// Phase 3.6 #69 — segment-aware progress
//
// The top-of-thread bar shows the user's journey across the seven
// conversation gates. Each segment is `done` / `current` / `upcoming`;
// the current segment fills proportionally based on the specialist's
// own anchor + relative turn position so the bar still moves between
// specialist handoffs.
// ───────────────────────────────────────────────────────────────────────

export type SegmentState = 'done' | 'current' | 'upcoming'

export interface ProgressSegment {
  /** Specialist this segment represents. */
  specialist: Specialist
  state: SegmentState
  /** 0..1 fill within this segment — only meaningful when state='current'. */
  fill: number
}

export interface SegmentProgress {
  segments: ProgressSegment[]
  /** Overall percentage (0..100). */
  percent: number
  /** Index of the current segment in `segments`. */
  currentIdx: number
}

/** Order of the seven gates. Mirrors VerlaufMap from Phase 3.4. */
export const SEGMENT_ORDER: Specialist[] = [
  'moderator',
  'planungsrecht',
  'bauordnungsrecht',
  'sonstige_vorgaben',
  'verfahren',
  'beteiligte',
  'synthesizer',
]

/**
 * Compute per-segment progress for the top-of-thread bar.
 *
 * Heuristic:
 *   • The current specialist (or its index in `SEGMENT_ORDER`) marks
 *     the current segment.
 *   • All segments before it are `done`.
 *   • All segments after are `upcoming`.
 *   • Within the current segment, fill = (overall progress -
 *     anchor_of_current) / (anchor_of_next - anchor_of_current),
 *     clamped to [0, 1].
 *
 * When `completion_signal === 'ready_for_review'` the caller can pass
 * `forceComplete` to fill every segment.
 */
export function computeSegmentProgress(
  turnCount: number,
  currentSpecialist: Specialist | null,
  forceComplete = false,
): SegmentProgress {
  if (forceComplete) {
    return {
      segments: SEGMENT_ORDER.map((spec) => ({
        specialist: spec,
        state: 'done' as SegmentState,
        fill: 1,
      })),
      percent: 100,
      currentIdx: SEGMENT_ORDER.length - 1,
    }
  }

  const overall = estimateProgress(turnCount, currentSpecialist)
  const idx = currentSpecialist
    ? Math.max(0, SEGMENT_ORDER.indexOf(currentSpecialist))
    : 0

  const currentAnchor = SPECIALIST_PROGRESS[SEGMENT_ORDER[idx]]
  const nextAnchor =
    idx + 1 < SEGMENT_ORDER.length
      ? SPECIALIST_PROGRESS[SEGMENT_ORDER[idx + 1]]
      : 1

  const span = Math.max(0.001, nextAnchor - currentAnchor)
  const within = Math.max(0, Math.min(1, (overall - currentAnchor) / span))

  const segments: ProgressSegment[] = SEGMENT_ORDER.map((specialist, i) => {
    if (i < idx) return { specialist, state: 'done' as SegmentState, fill: 1 }
    if (i === idx) {
      return {
        specialist,
        state: 'current' as SegmentState,
        fill: within,
      }
    }
    return { specialist, state: 'upcoming' as SegmentState, fill: 0 }
  })

  return {
    segments,
    percent: Math.round(overall * 100),
    currentIdx: idx,
  }
}
