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
import type { ProjectState, Specialist } from '@/types/projectState'
import { currentStageId } from './useSpineStages'
import type { SpineStageId } from '../lib/spineStageDefinitions'

const TOTAL_ESTIMATE_T01 = 22

export interface ChamberProgress {
  percent: number
  currentTurn: number
  totalEstimate: number
  spokenSpecialists: Set<Specialist>
  recentSpecialist: Specialist | null
  isReadyForReview: boolean
  /** Phase 7.5 — the Spine's "live" stage. Null pre-state. Both
   *  surfaces (Spine + any other progress UI) must derive from the
   *  same shared computation; do not duplicate. */
  currentStageId: SpineStageId | null
  /** Phase 7.7 §1.1 — diagnostic fractions exposed for the
   *  ?debug=spine panel. Inputs vs output side-by-side. */
  debug: {
    turnsFraction: number
    areasFraction: number
    recsFraction: number
    blended: number
    areasComplete: number
    recsCount: number
  }
}

export function useChamberProgress(
  messages: MessageRow[] | undefined,
  state: Partial<ProjectState> | undefined,
  completionSignal: string | null,
  templateOverride?: number,
): ChamberProgress {
  return useMemo(() => {
    const list = messages ?? []
    const assistants = list.filter((m) => m.role === 'assistant' && !m.id.startsWith('system:'))
    const currentTurn = assistants.length
    const totalEstimate = templateOverride ?? TOTAL_ESTIMATE_T01

    const spoken = new Set<Specialist>()
    let recent: Specialist | null = null
    for (const m of assistants) {
      if (m.specialist) {
        spoken.add(m.specialist as Specialist)
        recent = m.specialist as Specialist
      }
    }

    const areas = state?.areas
    const areasComplete = (['A', 'B', 'C'] as const).filter(
      (k) => areas?.[k]?.state === 'ACTIVE',
    ).length
    const recsCount = state?.recommendations?.length ?? 0

    const turnsFraction = Math.min(currentTurn / totalEstimate, 1)
    const areasFraction = areasComplete / 3
    const recsFraction = Math.min(recsCount, 3) / 3

    const isReadyForReview = completionSignal === 'ready_for_review'
    const blended =
      turnsFraction * 0.6 + areasFraction * 0.2 + recsFraction * 0.2
    // Phase 7.7 §1.1 — floor at turnsFraction. The blended formula
    // can BOOST upward when areas/recs are present; it cannot drag
    // progress below the user's actual turn count.
    const floored = Math.max(turnsFraction, blended)
    const finalRaw = isReadyForReview ? Math.max(floored, 0.95) : floored
    const percent = Math.max(0, Math.min(100, Math.round(finalRaw * 100)))

    return {
      percent,
      currentTurn,
      totalEstimate,
      spokenSpecialists: spoken,
      recentSpecialist: recent,
      isReadyForReview,
      currentStageId: currentStageId(state as ProjectState | undefined, list),
      debug: {
        turnsFraction,
        areasFraction,
        recsFraction,
        blended,
        areasComplete,
        recsCount,
      },
    }
  }, [messages, state, completionSignal, templateOverride])
}
