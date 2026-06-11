// ───────────────────────────────────────────────────────────────────────
// v1.0.9 Bug 13 → fix/plz-detect (2026-06-12) — German postal-code →
// Bundesland inference.
//
// HISTORY: v1.0.9 shipped a hand-typed first-TWO-digits sector table.
// Two-digit Leitregionen do not align with state borders, so every
// boundary prefix silently mis-detected: the T-06 Jena walk ran a full
// consultation on SächsBO because 07743 (Thüringen) resolved 'sachsen'
// via `setRange(1, 9, 'sachsen')`. The same table sent Potsdam to
// Berlin, Halle to Sachsen, Cottbus to Sachsen, Bremerhaven to
// Niedersachsen, Ulm to Bayern, Lindau to BW, Aschaffenburg to Hessen —
// 21 of the 47 smoke fixtures failed (scripts/smoke-plz-bundesland.mts,
// RED pre-fix).
//
// NOW: longest-prefix match against PLZ_PREFIX_TO_BUNDESLAND
// (plzBundesland.generated.ts) — a minimal-depth table derived from the
// GeoNames postal dataset by scripts/gen-plz-bundesland.mjs and
// validated at generation time against a 61-city ground-truth checklist
// (hard-fail). Mixed granularity 2..5 digits; a handful of PLZ genuinely
// span a state border (e.g. 19273 Amt Neuhaus) and resolve to their
// majority side — the wizard's always-visible "Change if wrong" dropdown
// stays the documented escape hatch.
//
// Fallback: when the address is unparseable (no 5-digit postcode
// detected), returns 'bayern' — the project's historical default,
// preserving v1.0.6 behaviour for empty/malformed input.
// ───────────────────────────────────────────────────────────────────────

import type { BundeslandCode } from '@/legal/states/_types'
import { extractPostcode } from '@/lib/addressParse'
import { PLZ_PREFIX_TO_BUNDESLAND } from './plzBundesland.generated'

export interface InferenceResult {
  /** The Bundesland the postcode resolves to. 'bayern' on fallback. */
  bundesland: BundeslandCode
  /** The 5-digit postcode that drove the inference, or null on fallback. */
  postcode: string | null
}

/**
 * Resolve a free-text German address to the Bundesland its postcode
 * sits in. Longest-prefix match (5 → 1 digits) over the generated
 * GeoNames-derived table; see module docstring for fallback behaviour.
 */
export function inferBundeslandFromPostcode(addr: string | null | undefined): InferenceResult {
  const plz = extractPostcode(addr ?? '')
  if (!plz) return { bundesland: 'bayern', postcode: null }
  for (let len = 5; len >= 1; len--) {
    const hit = PLZ_PREFIX_TO_BUNDESLAND[plz.slice(0, len)]
    if (hit) return { bundesland: hit, postcode: plz }
  }
  return { bundesland: 'bayern', postcode: plz }
}
