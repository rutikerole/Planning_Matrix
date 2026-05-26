// ───────────────────────────────────────────────────────────────────────
// Phase 11 — Bayern StateDelta wrapper
//
// Wraps the existing BAYERN_BLOCK + MUENCHEN_BLOCK constants into a
// StateDelta. The string content of both blocks is unchanged in Phase
// 11 commit 1 — the gate is "Bayern flow byte-for-byte unchanged."
// Refactoring the content layout (e.g., extracting T-01 PFLICHTTHEMEN
// into the template tail, or moving the ÖbVI/ADBV block to a separate
// vermessungsstellen field) is Phase 12+ work.
//
// `allowedCitations` is the canonical Bayern citation reference list
// previously hard-coded in citationLint.ts. Same strings, new home —
// citationLint will resolve per-state in a later commit.
// ───────────────────────────────────────────────────────────────────────

import type { StateDelta } from './_types.ts'
import { BAYERN_BLOCK } from '../bayern.ts'
import { MUENCHEN_BLOCK } from '../muenchen.ts'
// v1.0.33 C3 — single source of truth (was duplicated here + citationLint.ts).
import { BAYERN_ALLOWED_CITATIONS } from '../bayernAllowedCitations.ts'

export const BAYERN_DELTA: StateDelta = {
  bundesland: 'bayern',
  bundeslandLabelDe: 'Bayern',
  bundeslandLabelEn: 'Bavaria',
  // PLZ heuristic from bayern.ts:374-385.
  postcodeRanges: ['80000-87999', '90000-96499'],
  systemBlock: BAYERN_BLOCK,
  cityBlock: MUENCHEN_BLOCK,
  allowedCitations: BAYERN_ALLOWED_CITATIONS,
}
