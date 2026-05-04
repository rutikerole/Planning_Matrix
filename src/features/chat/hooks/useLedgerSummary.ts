// Phase 7 Chamber — useLedgerSummary.
//
// Selects the bits the LedgerPeek + StandUp overlay surface from
// projects.state. Pure wrapper around extractLedgerSummary in
// projectStateHelpers; mounted as a hook for memoisation parity with
// the other Chamber hooks.

import { useMemo } from 'react'
import type { ProjectState } from '@/types/projectState'
import {
  extractLedgerSummary,
  type LedgerSummary,
} from '@/lib/projectStateHelpers'

export function useLedgerSummary(state: Partial<ProjectState> | undefined): LedgerSummary {
  return useMemo(() => extractLedgerSummary(state as ProjectState | undefined), [state])
}
