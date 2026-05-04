// Phase 7.5 — useSpineStages.
//
// Walks SPINE_STAGES in order, computes each stage's status, and
// memoizes by [state, messages.length, currentSpecialist].
//
// Live/next resolution (§4 of the brief):
//   1. Compute isDone for each stage.
//   2. Find the first stage where isDone === false. That stage is
//      'live' — the user is actively working through it.
//   3. The stage immediately after 'live' is 'next'. Later stages
//      are 'future'.
//   4. All stages before 'live' are 'done'.
//   5. If every stage is done, the last stage stays 'live' with the
//      completion register (the briefing CTA already pulses).
//
// Stage progression is monotonic on isDone; the persona briefly
// dipping into a future specialist (e.g., Bauordnungsrecht
// commenting during the Planungsrecht stage) does NOT reorder the
// rail — only the underlying state flag flipping does.

import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { MessageRow, ProjectRow } from '@/types/db'
import type { ProjectState, Specialist } from '@/types/projectState'
import {
  SPINE_STAGES,
  type SpineStageId,
} from '../lib/spineStageDefinitions'

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

export function useSpineStages(
  project: ProjectRow | null | undefined,
  messages: MessageRow[] | undefined,
): ResolvedSpineStage[] {
  const { t } = useTranslation()
  const messageCount = messages?.length ?? 0
  const state = project?.state as ProjectState | undefined

  return useMemo<ResolvedSpineStage[]>(() => {
    const list = messages ?? []
    if (!state) {
      // No state yet — render every stage as future, no live.
      return SPINE_STAGES.map((s) => ({
        id: s.id,
        index: s.index,
        status: 'future' as SpineStageStatus,
        title: t(s.titleKey),
        specialistName: t(`chat.specialists.${s.ownerSpecialist}`),
        snippet: null,
        firstMessageIndex: null,
      }))
    }

    // Find first not-done stage; everything before is done; that one
    // is live; one after is next; rest are future. Monotonic.
    let liveIdx = -1
    const dones = SPINE_STAGES.map((s) => {
      try {
        return s.isDone(state, list)
      } catch {
        return false
      }
    })
    for (let i = 0; i < SPINE_STAGES.length; i++) {
      if (!dones[i]) {
        liveIdx = i
        break
      }
    }

    const allDone = liveIdx === -1
    if (allDone) liveIdx = SPINE_STAGES.length - 1

    return SPINE_STAGES.map((s, i): ResolvedSpineStage => {
      let status: SpineStageStatus
      if (allDone) {
        status = i === liveIdx ? 'live' : 'done'
      } else if (i < liveIdx) {
        status = 'done'
      } else if (i === liveIdx) {
        status = 'live'
      } else if (i === liveIdx + 1) {
        status = 'next'
      } else {
        status = 'future'
      }

      let snippet: string | null = null
      if (status === 'live') {
        try {
          snippet = s.getSnippet(state)
        } catch {
          snippet = null
        }
      }

      let firstIdx: number | null = null
      try {
        firstIdx = s.getFirstMessageIndex(list)
      } catch {
        firstIdx = null
      }

      return {
        id: s.id,
        index: s.index,
        status,
        title: t(s.titleKey),
        specialistName: t(`chat.specialists.${s.ownerSpecialist}`),
        snippet,
        firstMessageIndex: firstIdx,
      }
    })
    // The dependency on messageCount + state captures every meaningful
    // change without subscribing to message body churn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, messageCount, t])
}

/** Helper used by useChamberProgress to expose currentStageId. */
export function currentStageId(
  state: ProjectState | undefined,
  messages: MessageRow[] | undefined,
): SpineStageId | null {
  if (!state) return null
  const list = messages ?? []
  for (const s of SPINE_STAGES) {
    let done: boolean
    try {
      done = s.isDone(state, list)
    } catch {
      done = false
    }
    if (!done) return s.id
  }
  return SPINE_STAGES[SPINE_STAGES.length - 1].id
}

// Re-export locked specialist enum so callers keep one import.
export type { Specialist }
