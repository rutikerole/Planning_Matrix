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

/**
 * Canonical Bayern citation tokens — sourced from bayern.ts +
 * muenchen.ts. Reference list (documentation today; positive-gate
 * use deferred). Mirrors citationLint.ts BAYERN_ALLOWED_CITATIONS.
 */
const BAYERN_ALLOWED_CITATIONS: readonly string[] = [
  // BayBO core articles
  'Art. 2 Abs. 3 BayBO',
  'Art. 2 Abs. 4 BayBO',
  'Art. 6 BayBO',
  'Art. 12 BayBO',
  'Art. 44a BayBO',
  'Art. 46 Abs. 6 BayBO',
  'Art. 47 BayBO',
  'Art. 57 BayBO',
  'Art. 57 Abs. 1 Nr. 1 a BayBO',
  'Art. 57 Abs. 1 Nr. 1 b BayBO',
  'Art. 57 Abs. 1 Nr. 3 b BayBO',
  'Art. 57 Abs. 1 Nr. 18 BayBO',
  'Art. 57 Abs. 3 Nr. 3 BayBO',
  'Art. 57 Abs. 4 BayBO',
  'Art. 57 Abs. 5 BayBO',
  'Art. 57 Abs. 7 BayBO',
  'Art. 58 BayBO',
  'Art. 58a BayBO',
  'Art. 59 BayBO',
  'Art. 60 BayBO',
  'Art. 61 BayBO',
  'Art. 62 BayBO',
  'Art. 64 BayBO',
  'Art. 65 BayBO',
  'Art. 66 BayBO',
  'Art. 69 BayBO',
  'Art. 76 BayBO',
  'Art. 81 Abs. 1 Nr. 4 b BayBO',
  'Art. 82c BayBO',
  // BayDSchG
  'BayDSchG Art. 6',
  // München-specific (StPlS 926, Erhaltungssatzungen via BauGB)
  'StPlS 926 Anlage 1 Nr. 1.1',
  'StPlS 926 § 3 Abs. 2',
  'StPlS 926 § 3 Abs. 4',
  'StPlS 926 § 4 Abs. 3',
  'BauGB § 172',
  // Federal-law tokens that legitimately appear next to Bayern citations
  'BauGB § 30',
  'BauGB § 34',
  'BauGB § 35',
  'BauGB § 246e',
  'BauNVO § 19',
  'GEG § 8',
  'BauGB § 31 Abs. 3',
  'BauGB § 34 Abs. 3b',
] as const

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
