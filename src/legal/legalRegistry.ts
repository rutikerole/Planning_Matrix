// ───────────────────────────────────────────────────────────────────────
// Phase 11 — Legal registry
//
// Resolves a `projects.bundesland` value to a StateDelta. Phase 11
// commit 1 ships Bayern; commit 2 adds NRW + BW + Niedersachsen +
// Hessen; commit 3 adds the remaining 11. Unknown Bundesland codes
// fall back to BAYERN_DELTA so the chat never crashes.
//
// Telemetry is the caller's job. The registry stays pure (no
// console.warn, no side effects). Edge Function callers query
// `isRegisteredBundesland(code)` before resolving and emit a
// `legal.bundesland.fallback` event on the active span when the
// predicate returns false. This makes drift queryable via logs.spans
// instead of stdout-only.
// ───────────────────────────────────────────────────────────────────────

import type { BundeslandCode, StateDelta } from './states/_types.ts'
import { BAYERN_DELTA } from './states/bayern.ts'
import { NRW_DELTA } from './states/nrw.ts'
import { BW_DELTA } from './states/bw.ts'
import { NIEDERSACHSEN_DELTA } from './states/niedersachsen.ts'
import { HESSEN_DELTA } from './states/hessen.ts'

/**
 * State registry. Keyed by canonical Bundesland code. Phase 11 commit
 * 2: Bayern + the four top states (NRW, BW, Niedersachsen, Hessen) —
 * the latter four carry stub-grade scaffolding only (article numbers
 * + Verfahrenstypen + Architektenkammer + key Modernisierungsdaten).
 * Persona-grade content for the four lands in Phase 12; the
 * remaining 11 minimum stubs land in Phase 11 commit 3.
 */
const REGISTRY: Partial<Record<BundeslandCode, StateDelta>> = {
  bayern: BAYERN_DELTA,
  nrw: NRW_DELTA,
  bw: BW_DELTA,
  niedersachsen: NIEDERSACHSEN_DELTA,
  hessen: HESSEN_DELTA,
}

/**
 * Normalise a raw `projects.bundesland` string into a lookup key.
 * Trims + lower-cases so wizard / DB drift on casing doesn't create
 * silent misses. Returns the raw normalised string (NOT cast to
 * BundeslandCode — callers that need the cast use `as BundeslandCode`
 * after a successful registry hit).
 */
export function normalizeBundeslandCode(bundesland: string | null | undefined): string {
  return (bundesland ?? '').trim().toLowerCase()
}

/**
 * Predicate: is this Bundesland string registered (and therefore
 * served by its own StateDelta) in the current build?
 *
 * Edge Function pattern (mirror of supabase/functions/chat-turn/
 * tracer.ts span events): test before resolving, emit
 * `legal.bundesland.fallback` on a parent span when the answer is
 * false. The registry never warns or logs on its own.
 */
export function isRegisteredBundesland(bundesland: string | null | undefined): boolean {
  const code = normalizeBundeslandCode(bundesland)
  return code in REGISTRY
}

/**
 * Resolve a `projects.bundesland` string to a StateDelta. Unknown
 * codes fall back to BAYERN_DELTA silently — the caller is expected
 * to gate on `isRegisteredBundesland(...)` first if it cares to
 * emit telemetry. Today the wizard hardcodes 'bayern' (audit B04,
 * held), so production traffic never hits the fallback.
 */
export function resolveStateDelta(bundesland: string | null | undefined): StateDelta {
  const code = normalizeBundeslandCode(bundesland) as BundeslandCode
  return REGISTRY[code] ?? BAYERN_DELTA
}

/**
 * For tests + the smokeWalk: list every code currently registered.
 * Phase 11 commit 1 returns ['bayern']; commit 2 adds 4; commit 3
 * adds 11 more for full 16-state coverage.
 */
export function listRegisteredStates(): readonly BundeslandCode[] {
  return Object.keys(REGISTRY) as BundeslandCode[]
}
