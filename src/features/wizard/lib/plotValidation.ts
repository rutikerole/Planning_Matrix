/**
 * D8 — plot-address validation.
 *
 * The wizard takes the address as free text, with no autocomplete or
 * geocoding for v1. We require minimal evidence that it actually is a
 * postal address rather than a stray phrase: ≥ 6 characters, contains
 * a digit (a house number or postcode), AND either contains a comma
 * (separating street from city) OR matches a 5-digit German postcode
 * pattern. Bayern postcodes start with 8 or 9 — the model uses that as
 * a sanity signal but we don't gate the wizard on it (a Bavarian
 * project could legitimately reference a non-Bavarian neighbour parcel).
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
