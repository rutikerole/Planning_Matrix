// ───────────────────────────────────────────────────────────────────────
// Phase 11 — Legal registry
//
// Resolves a `projects.bundesland` value to a StateDelta. Phase 11
// commit 1 ships only Bayern; commits 2 + 3 add the other 15. Until
// then, an unknown Bundesland code falls back to BAYERN_DELTA so the
// chat never crashes — with a one-line stdout warning so we can
// detect drift via the standard logs.
//
// The fallback choice is deliberate: today the wizard hardcodes
// 'bayern' (audit B04, held), so production traffic never hits the
// fallback. A direct DB write or a smokeWalk fixture is the only way
// to exercise non-Bayern paths in commit 1; both warrant a logged
// warning when an unknown code is passed.
// ───────────────────────────────────────────────────────────────────────

import type { BundeslandCode, StateDelta } from './states/_types.ts'
import { BAYERN_DELTA } from './states/bayern.ts'

/**
 * State registry. Keyed by canonical Bundesland code. Phase 11 commit
 * 1: Bayern only. Commits 2 + 3 fill the other 15 entries.
 */
const REGISTRY: Partial<Record<BundeslandCode, StateDelta>> = {
  bayern: BAYERN_DELTA,
}

/**
 * Resolve a `projects.bundesland` string to a StateDelta. The input is
 * lower-cased and trimmed before lookup so wizard / DB drift on
 * casing doesn't create silent misses. Unknown codes fall back to
 * Bayern with a stdout warning.
 */
export function resolveStateDelta(bundesland: string | null | undefined): StateDelta {
  const raw = (bundesland ?? '').trim().toLowerCase()
  const code = raw as BundeslandCode
  const hit = REGISTRY[code]
  if (hit) return hit
  if (raw !== '' && raw !== 'bayern') {
    console.warn(
      `[legalRegistry] unknown bundesland="${raw}" — falling back to BAYERN_DELTA. Add a StateDelta entry in src/legal/states/${raw}.ts to silence.`,
    )
  }
  return BAYERN_DELTA
}

/**
 * For tests + the smokeWalk: list every code currently registered.
 * Phase 11 commit 1 returns ['bayern'] only.
 */
export function listRegisteredStates(): readonly BundeslandCode[] {
  return Object.keys(REGISTRY) as BundeslandCode[]
}
