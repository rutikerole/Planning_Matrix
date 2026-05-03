/**
 * Shared address-string parsers. Replaces three near-identical
 * regex blocks that lived in dashboard/, wizard/, and loader/.
 *
 * All functions are pure and return null when no match exists —
 * callers that want a fallback string (e.g. "München", "Ihrem
 * Standort") should add it themselves.
 */

/**
 * Pull the street name out of a German-style address.
 *
 *   "Türkenstraße 25, 80799 München"        → "Türkenstraße"
 *   "Hans-Sachs-Straße 10, 80469 München"   → "Hans-Sachs-Straße"
 *
 * Pattern: characters at the start, followed by whitespace + digit
 * (the house number). Handles compound names with hyphens, dots,
 * digits, and Unicode letters.
 */
export function extractStreetName(addr: string): string | null {
  if (!addr) return null
  const match = addr.match(/^([\p{L}\p{M}\d.\- ]+?)\s+\d+/u)
  return match?.[1]?.trim() ?? null
}

/**
 * Pull the 5-digit German postcode out of an address.
 *
 *   "Türkenstraße 25, 80799 München"  → "80799"
 */
export function extractPostcode(addr: string): string | null {
  if (!addr) return null
  const match = addr.match(/\b(\d{5})\b/)
  return match?.[1] ?? null
}

/**
 * Pull the city name (the chunk after the postcode) out of a German
 * address. Falls back to the trailing comma-separated chunk when no
 * postcode is present.
 *
 *   "Türkenstraße 25, 80799 München"        → "München"
 *   "Innstraße 23, 83022 Rosenheim"         → "Rosenheim"
 *   "Some Place, Bavaria"                    → "Bavaria"
 */
export function extractCity(addr: string): string | null {
  if (!addr) return null
  const trimmed = addr.trim()
  const postcodeMatch = trimmed.match(/\b\d{5}\s+([^,]+)/)
  const cityFromPostcode = postcodeMatch?.[1]?.trim()
  if (cityFromPostcode) return cityFromPostcode
  const lastChunk = trimmed.split(',').pop()?.trim()
  if (lastChunk && lastChunk !== trimmed) return lastChunk
  return null
}

/**
 * Cheap structural check for "looks like a postal address."
 * No autocomplete or geocoding — wizard takes the address as free
 * text. Requires ≥ 6 chars, contains a digit (house number or
 * postcode), AND either contains a comma (street/city separator)
 * OR matches a 5-digit postcode pattern.
 *
 * Reused by the wizard's submission gate AND the chat input's
 * "looks like an address?" suggestion logic.
 */
export function isPlotAddressValid(input: string): boolean {
  const trimmed = input.trim()
  if (trimmed.length < 6) return false
  if (!/\d/.test(trimmed)) return false
  return /,/.test(trimmed) || /\b\d{5}\b/.test(trimmed)
}
