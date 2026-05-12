// ───────────────────────────────────────────────────────────────────────
// v1.0.9 Bug 13 — German postal-code → Bundesland inference.
//
// Deterministic first-two-digits lookup against the Deutsche Post
// postal-sector map. Each prefix 00..99 maps to a Bundesland registry
// code (`bayern`, `nrw`, etc.). Several prefixes legitimately span
// border regions (notably 03/06/07 in the east, 49/66/67 along the
// NRW/Niedersachsen/Saarland/RLP edges). In those cases we route to
// the dominant Land for the prefix and rely on the wizard's manual
// override to catch the edge cases — the dropdown is always present
// and the user knows their plot better than a 2-digit lookup.
//
// Reference table is the same as the one the user-of-record signed
// off for v1.0.9 Bug 13. Single source of truth — do not duplicate
// in tests; tests import the function and assert known outputs.
//
// Fallback: when the address is unparseable (no 5-digit postcode
// detected), returns 'bayern' — the project's historical default,
// preserving v1.0.6 behaviour for empty/malformed input.
// ───────────────────────────────────────────────────────────────────────

import type { BundeslandCode } from '@/legal/states/_types'
import { extractPostcode } from '@/lib/addressParse'

const PREFIX_TO_BUNDESLAND: Record<number, BundeslandCode> = (() => {
  const m: Record<number, BundeslandCode> = {}
  const setRange = (from: number, to: number, code: BundeslandCode) => {
    for (let i = from; i <= to; i++) m[i] = code
  }
  setRange(1, 9, 'sachsen')
  setRange(10, 14, 'berlin')
  setRange(15, 16, 'brandenburg')
  setRange(17, 19, 'mv')
  setRange(20, 22, 'hamburg')
  setRange(23, 25, 'sh')
  setRange(26, 27, 'niedersachsen')
  m[28] = 'bremen'
  setRange(29, 31, 'niedersachsen')
  setRange(32, 33, 'nrw')
  setRange(34, 36, 'hessen')
  setRange(37, 38, 'niedersachsen')
  m[39] = 'sachsen-anhalt'
  setRange(40, 48, 'nrw')
  m[49] = 'niedersachsen'
  setRange(50, 53, 'nrw')
  setRange(54, 56, 'rlp')
  setRange(57, 59, 'nrw')
  setRange(60, 65, 'hessen')
  m[66] = 'saarland'
  m[67] = 'rlp'
  setRange(68, 69, 'bw')
  setRange(70, 79, 'bw')
  setRange(80, 87, 'bayern')
  m[88] = 'bw'
  m[89] = 'bayern'
  setRange(90, 96, 'bayern')
  m[97] = 'bayern'
  setRange(98, 99, 'thueringen')
  return m
})()

export interface InferenceResult {
  /** The Bundesland the postcode resolves to. 'bayern' on fallback. */
  bundesland: BundeslandCode
  /** The 5-digit postcode that drove the inference, or null on fallback. */
  postcode: string | null
}

/**
 * Resolve a free-text German address to the Bundesland its postcode
 * sits in. See module docstring for the lookup table and fallback
 * behaviour.
 */
export function inferBundeslandFromPostcode(addr: string | null | undefined): InferenceResult {
  const plz = extractPostcode(addr ?? '')
  if (!plz) return { bundesland: 'bayern', postcode: null }
  const prefix = Number.parseInt(plz.slice(0, 2), 10)
  if (!Number.isFinite(prefix)) return { bundesland: 'bayern', postcode: plz }
  const resolved = PREFIX_TO_BUNDESLAND[prefix]
  return { bundesland: resolved ?? 'bayern', postcode: plz }
}
