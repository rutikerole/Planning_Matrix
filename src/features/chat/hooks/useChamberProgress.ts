// Phase 7 Chamber — single hook that drives every progress surface.
//
// Returns the percent (rounded), current turn (1-indexed), total
// estimate, the set of specialists who have spoken, and the latest
// recent specialist (used by the astrolabe to highlight the active
// sigil and by AmbientTint to choose its background tint).
//
// Phase 7.7 §1.1 — percent is the MAX of (turnsFraction, blended).
// The "blended" formula stays as the upward-boost signal when the
// persona has committed (areas → ACTIVE, recs ≥ 3); the floor at
// turnsFraction prevents the formula from PUNISHING a project where
// the persona hasn't emitted recommendations yet.
//
//   blended =  (turnCount / totalEstimate) × 0.6
//            + (areasComplete / 3)         × 0.2
//            + min(recsCount, 3) / 3       × 0.2
//   percent =  round(max(turnsFraction, blended) × 100)
//
// Exposes the intermediate fractions on the return shape so the
// ?debug=spine panel can show inputs vs output side-by-side.

import { useMemo } from 'react'
import type { MessageRow } from '@/types/db'
import type { ProjectState } from '@/types/projectState'
import {
  computeChamberProgress,
  TOTAL_ESTIMATE_T01,
  type ChamberProgress,
} from '../lib/chamberProgress'

export type { ChamberProgress }

/**
 * Phase 7 Chamber — single hook that drives every progress surface.
 * v1.0.29 — the computation now lives in the pure `computeChamberProgress`
 * (lib/chamberProgress.ts) so the smoke runner can assert it without React.
 */
export function useChamberProgress(
  messages: MessageRow[] | undefined,
  state: Partial<ProjectState> | undefined,
  completionSignal: string | null,
  templateOverride?: number,
): ChamberProgress {
  return useMemo(
    () =>
      computeChamberProgress(
        messages ?? [],
        state,
        completionSignal,
        templateOverride ?? TOTAL_ESTIMATE_T01,
      ),
    [messages, state, completionSignal, templateOverride],
  )
}
