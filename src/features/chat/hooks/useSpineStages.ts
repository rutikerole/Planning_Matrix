// Phase 7.5 — useSpineStages stub (real impl in commit 5).
//
// Exports the ResolvedSpineStage shape so SpineStage / SpineStageList
// can typecheck against it; the hook body lands in commit 5 with the
// live/next/done resolution + memoization.

import type { SpineStageId } from '../lib/spineStageDefinitions'

export type SpineStageStatus = 'done' | 'live' | 'next' | 'future'

export interface ResolvedSpineStage {
  id: SpineStageId
  index: number
  status: SpineStageStatus
  title: string
  specialistName: string
  snippet: string | null
  firstMessageIndex: number | null
}

export function useSpineStages(): ResolvedSpineStage[] {
  return []
}
