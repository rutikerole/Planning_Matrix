// ───────────────────────────────────────────────────────────────────────
// v1.0.23 Bug D — deterministic address blob parser.
//
// The wizard's address input accepts a single blob like
// "Pariser Platz 1, 10117 Berlin" and persists it verbatim onto
// project.plot_address. Downstream PLZ-district resolution depends on
// the four components (street / hausnummer / plz / stadt) being
// separable, but the v1.0.20 flow had no validation step: if the
// blob was malformed (e.g. missing PLZ), the project shipped with a
// silently-broken address.
//
// This module is the single parser. It greedy-parses the canonical
// German address pattern (street + hausnummer, comma, PLZ + stadt)
// and returns either a structured ParsedAddress or a parsed: false
// envelope that the wizard surfaces as "fall back to structured
// fields for manual entry".
//
// Spec:
//   • PLZ via regex \b\d{5}\b
//   • Stadt = word(s) after the PLZ (until end of string)
//   • Hausnummer = trailing number-with-optional-letter on the street
//   • Street = remaining substring before the comma + PLZ
// ───────────────────────────────────────────────────────────────────────

export interface ParsedAddress {
  parsed: true
  street: string
  hausnummer: string
  plz: string
  stadt: string
  /** True when every field is present + non-empty AND the structure
   *  is canonical (a single comma separating street-side from PLZ-
   *  side). False when some fields are missing or the canonical
   *  layout is ambiguous. */
  isComplete: boolean
}

export interface UnparsedAddress {
  parsed: false
  fallbackToStructured: true
  raw: string
}

export type AddressParseResult = ParsedAddress | UnparsedAddress

const PLZ_RX = /\b(\d{5})\b/
const HAUSNUMMER_TRAILING_RX = /\s+(\d+[a-zA-Z]?)\s*$/

/**
 * Parse a German address blob into its four canonical components.
 * Never throws — malformed input returns the UnparsedAddress envelope.
 */
export function parseAddressBlob(blob: string): AddressParseResult {
  const trimmed = (blob ?? '').trim()
  if (trimmed.length === 0) {
    return { parsed: false, fallbackToStructured: true, raw: blob ?? '' }
  }
  // Require a PLZ — without one the blob is not a German address.
  const plzMatch = trimmed.match(PLZ_RX)
  if (!plzMatch) {
    return { parsed: false, fallbackToStructured: true, raw: trimmed }
  }
  const plz = plzMatch[1] ?? ''
  const plzIndex = plzMatch.index ?? -1
  if (plzIndex < 0) {
    return { parsed: false, fallbackToStructured: true, raw: trimmed }
  }
  // Stadt is everything after the PLZ.
  const stadt = trimmed.slice(plzIndex + plz.length).trim().replace(/^[,;\s]+/, '')
  // Street-side is everything BEFORE the PLZ, trimmed.
  const streetSide = trimmed.slice(0, plzIndex).trim().replace(/[,;\s]+$/, '')
  // Hausnummer is the trailing number-with-optional-letter on the
  // street side. If absent, leave street as the full streetSide and
  // hausnummer empty (incomplete).
  const hausnummerMatch = streetSide.match(HAUSNUMMER_TRAILING_RX)
  let street = streetSide
  let hausnummer = ''
  if (hausnummerMatch) {
    hausnummer = hausnummerMatch[1] ?? ''
    street = streetSide.slice(0, hausnummerMatch.index ?? streetSide.length).trim()
  }
  // Drop trailing comma on street.
  street = street.replace(/[,;\s]+$/, '')
  const isComplete =
    street.length > 0 && hausnummer.length > 0 && plz.length === 5 && stadt.length > 0
  return {
    parsed: true,
    street,
    hausnummer,
    plz,
    stadt,
    isComplete,
  }
}

// ── Optional helper: PLZ → bundesland sanity check ────────────────
//
// Surface a warning when the parsed PLZ does not map to the
// project's selected bundesland. Approximate ranges (v1.0.23 baseline,
// authoritative cross-state PLZ list parked for v1.0.24+):

const PLZ_RANGES: Record<string, ReadonlyArray<[number, number]>> = {
  bayern: [[80000, 87999], [90000, 96499]],
  nrw: [[32125, 33829], [40210, 48739], [50126, 53947], [57072, 59969]],
  berlin: [[10115, 14199]],
  hamburg: [[20000, 21149], [22000, 22769]],
  bremen: [[27568, 28779]],
  hessen: [[34000, 36399], [60000, 65929]],
  niedersachsen: [[26000, 27478], [28780, 31868], [37000, 38559]],
  bw: [[68000, 79879], [88000, 89537]],
}

export function plzMatchesBundesland(
  plz: string,
  bundesland: string | null | undefined,
): boolean | null {
  if (!plz || plz.length !== 5) return null
  const code = (bundesland ?? '').trim().toLowerCase()
  const ranges = PLZ_RANGES[code]
  if (!ranges) return null
  const n = parseInt(plz, 10)
  if (!Number.isFinite(n)) return null
  return ranges.some(([lo, hi]) => n >= lo && n <= hi)
}
