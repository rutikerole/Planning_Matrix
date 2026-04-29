/**
 * D8 — plot-address validation.
 *
 * The wizard takes the address as free text, with no autocomplete or
 * geocoding for v1. We require minimal evidence that it actually is a
 * postal address rather than a stray phrase: ≥ 6 characters, contains
 * a digit (a house number or postcode), AND either contains a comma
 * (separating street from city) OR matches a 5-digit German postcode
 * pattern.
 *
 * Phase 1 (post-audit) — v1 scope narrows from "Bayern" to
 * "Erlangen-only" (AUDIT_REPORT.md §6). The format check stays as
 * the first floor; the Erlangen-postcode check is layered on top by
 * `isErlangenAddress` and surfaced in the wizard UI.
 *
 * Pure function — also used by the submission flow in commit #11 to
 * prevent invalid addresses from reaching the project insert.
 */
export function isPlotAddressValid(input: string): boolean {
  const trimmed = input.trim()
  if (trimmed.length < 6) return false
  if (!/\d/.test(trimmed)) return false
  return /,/.test(trimmed) || /\b\d{5}\b/.test(trimmed)
}

/**
 * Erlangen Stadtgebiet postcodes. Source: Deutsche Post / Stadt Erlangen
 * (Erlangen-Innenstadt 91052, Erlangen-West 91054, Erlangen-Bruck 91056,
 * Erlangen-Tennenlohe 91058). Maintained as a literal-union return type
 * so call sites can switch on the resolved postcode safely.
 */
export type ErlangenPostcode = '91052' | '91054' | '91056' | '91058'

const ERLANGEN_POSTCODE_RE = /\b(91052|91054|91056|91058)\b/

/**
 * Pull the first Erlangen postcode out of a free-text address. Returns
 * null when no Erlangen postcode is present. The match is anchored on
 * word boundaries so `'910521'` never spuriously matches `'91052'`.
 */
export function extractErlangenPostcode(address: string): ErlangenPostcode | null {
  const m = address.match(ERLANGEN_POSTCODE_RE)
  return m ? (m[1] as ErlangenPostcode) : null
}

/** True iff the address contains an Erlangen Stadtgebiet postcode. */
export function isErlangenAddress(address: string): boolean {
  return extractErlangenPostcode(address) !== null
}
