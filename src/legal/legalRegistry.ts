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
import { SACHSEN_DELTA } from './states/sachsen.ts'
import { SACHSEN_ANHALT_DELTA } from './states/sachsen-anhalt.ts'
import { THUERINGEN_DELTA } from './states/thueringen.ts'
import { RLP_DELTA } from './states/rlp.ts'
import { SAARLAND_DELTA } from './states/saarland.ts'
import { SH_DELTA } from './states/sh.ts'
import { MV_DELTA } from './states/mv.ts'
import { BRANDENBURG_DELTA } from './states/brandenburg.ts'
import { BERLIN_DELTA } from './states/berlin.ts'
import { HAMBURG_DELTA } from './states/hamburg.ts'
import { BREMEN_DELTA } from './states/bremen.ts'

/**
 * State registry. Phase 11 commit 3: full 16-state coverage.
 *
 *   - Bayern        (full content; München cityBlock)
 *   - NRW / BW      (top-state stubs — article numbers, Verfahrenstypen,
 *     Niedersachsen    Architektenkammer, key Modernisierungsdaten)
 *     Hessen
 *   - 11 minimum stubs (Sachsen, Sachsen-Anhalt, Thüringen, RLP,
 *     Saarland, SH, MV, Brandenburg, Berlin, Hamburg, Bremen) —
 *     MBO-default + "in Vorbereitung" framing. allowedCitations is
 *     deliberately empty so the firewall accepts only federal-law
 *     citations until per-state content lands (Phase 14).
 *
 * Phase 12 expands NRW/BW/Niedersachsen/Hessen to persona-grade.
 * Phase 14 expands the 11 minimum stubs.
 */
const REGISTRY: Record<BundeslandCode, StateDelta> = {
  bayern: BAYERN_DELTA,
  nrw: NRW_DELTA,
  bw: BW_DELTA,
  niedersachsen: NIEDERSACHSEN_DELTA,
  hessen: HESSEN_DELTA,
  sachsen: SACHSEN_DELTA,
  'sachsen-anhalt': SACHSEN_ANHALT_DELTA,
  thueringen: THUERINGEN_DELTA,
  rlp: RLP_DELTA,
  saarland: SAARLAND_DELTA,
  sh: SH_DELTA,
  mv: MV_DELTA,
  brandenburg: BRANDENBURG_DELTA,
  berlin: BERLIN_DELTA,
  hamburg: HAMBURG_DELTA,
  bremen: BREMEN_DELTA,
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
