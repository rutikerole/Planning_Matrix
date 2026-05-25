// Phase 7 Chamber — pure progress computation (extracted from
// useChamberProgress so it is unit-testable under the smoke-script runner,
// which has no React).
//
// Phase 7.7 §1.1 — percent is the MAX of (turnsFraction, blended, …). The
// "blended" formula boosts upward once the persona commits (areas → ACTIVE,
// recs ≥ 3); the floor prevents it from PUNISHING a project whose persona
// hasn't emitted recommendations yet.
//
// v1.0.29 Bug 69/70 — added the SPINE-STAGE floor + synthesis-reached
// handoff. The Hamburg T-02 walk showed Round 12 "synthesis · speaking" at
// 55% (= 12/22) because the formula never reflected how far the consultation
// advanced through the 8 spine stages, nor that the synthesizer had taken the
// floor. Now: floor on the completed-stage fraction; when the synthesizer is
// speaking AND the three legal areas are settled, the briefing is ready
// (→ percent ≥ 95 → useCompletionGate fires hero/ready → BriefingCTA pulses)
// even if the persona never emitted the strict final_synthesis state (its
// recommendations_delta is thin — Bug 63, persona-side, deferred).

import type { MessageRow } from '@/types/db'
import type { ProjectState, Specialist } from '@/types/projectState'
import { SPINE_STAGES, type SpineStageId } from './spineStageDefinitions'

export const TOTAL_ESTIMATE_T01 = 22

export interface ChamberProgress {
  percent: number
  currentTurn: number
  totalEstimate: number
  spokenSpecialists: Set<Specialist>
  recentSpecialist: Specialist | null
  isReadyForReview: boolean
  currentStageId: SpineStageId | null
  debug: {
    turnsFraction: number
    areasFraction: number
    recsFraction: number
    blended: number
    areasComplete: number
    recsCount: number
  }
}

/** First not-done stage's index; SPINE_STAGES.length when all are done. */
function liveStageIndex(state: ProjectState | undefined, list: MessageRow[]): number {
  if (!state) return 0
  for (let i = 0; i < SPINE_STAGES.length; i++) {
    let done: boolean
    try {
      done = SPINE_STAGES[i].isDone(state, list)
    } catch {
      done = false
    }
    if (!done) return i
  }
  return SPINE_STAGES.length
}

export function computeChamberProgress(
  messages: MessageRow[],
  state: Partial<ProjectState> | undefined,
  completionSignal: string | null,
  totalEstimate: number = TOTAL_ESTIMATE_T01,
): ChamberProgress {
  const list = messages
  const assistants = list.filter(
    (m) => m.role === 'assistant' && !m.id.startsWith('system:'),
  )
  const currentTurn = assistants.length

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

  const finalStage = SPINE_STAGES[SPINE_STAGES.length - 1]
  let isSpineComplete = false
  try {
    if (state) {
      const canonical = finalStage.isDone(state as ProjectState, list)
      const proceduresCount = state.procedures?.length ?? 0
      const recsCount = state.recommendations?.length ?? 0
      const areasActive = (['A', 'B', 'C'] as const).some(
        (k) => state.areas?.[k]?.state === 'ACTIVE',
      )
      const hasMaterialResult = proceduresCount >= 1 && areasActive && recsCount >= 1
      isSpineComplete = canonical || hasMaterialResult
    }
  } catch {
    isSpineComplete = false
  }

  // v1.0.29 Bug 69/70 — spine-stage floor + synthesis handoff.
  const liveIdx = liveStageIndex(state as ProjectState | undefined, list)
  const stageFraction = state ? liveIdx / SPINE_STAGES.length : 0
  const synthesizerSpoke = spoken.has('synthesizer' as Specialist)
  const reachedSynthesis = synthesizerSpoke && areasComplete >= 3

  const blended = turnsFraction * 0.6 + areasFraction * 0.2 + recsFraction * 0.2
  const floored = Math.max(turnsFraction, blended, stageFraction)
  const finalRaw = isSpineComplete
    ? 1
    : reachedSynthesis || isReadyForReview
      ? Math.max(floored, 0.95)
      : floored
  const percent = Math.max(0, Math.min(100, Math.round(finalRaw * 100)))

  const currentStageId: SpineStageId | null = state
    ? liveIdx >= SPINE_STAGES.length
      ? SPINE_STAGES[SPINE_STAGES.length - 1].id
      : SPINE_STAGES[liveIdx].id
    : null

  return {
    percent,
    currentTurn,
    totalEstimate,
    spokenSpecialists: spoken,
    recentSpecialist: recent,
    // Derived readiness (synthesis reached) counts as ready-for-review so
    // downstream consumers don't depend solely on the transient store signal.
    isReadyForReview: isReadyForReview || reachedSynthesis,
    currentStageId,
    debug: { turnsFraction, areasFraction, recsFraction, blended, areasComplete, recsCount },
  }
}
