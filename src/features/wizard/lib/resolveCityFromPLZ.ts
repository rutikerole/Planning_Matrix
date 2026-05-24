// ───────────────────────────────────────────────────────────────────────
// v1.0.25 Bug 42 — explicit city resolution by PLZ.
//
// Replaces the legacy `bundesland === 'bayern' ? 'muenchen' : null`
// hardcode in useCreateProject, which stamped EVERY Bayern project as
// 'muenchen' (so a Nuremberg/Augsburg project got the München cityBlock)
// and — pre-B04 — froze `city='muenchen'` onto rows that were later
// relabeled to other Bundesländer (NON_BAYERN_PROD_FORENSICS.md: two
// "hessen" rows carry a stale city='muenchen').
//
// The cityBlock pilot is Bayern-only (München substantive; Erlangen
// parked, see src/legal/compose.ts). So:
//   • non-Bayern projects        → null   (no cityBlock pilot)
//   • Bayern + München PLZ        → 'muenchen'
//   • Bayern + Erlangen PLZ       → 'erlangen'
//   • Bayern, any other PLZ       → null
//
// The bundesland gate is load-bearing: it prevents the forensics bug
// where a non-Bayern-tagged project with a München address would be
// stamped 'muenchen'. A non-Bayern project NEVER gets a Bayern city.
// ───────────────────────────────────────────────────────────────────────

import type { BundeslandCode } from '@/legal/states/_types'
import { extractPostcode } from '@/lib/addressParse'

export type CityCode = 'muenchen' | 'erlangen'

// München Stadtgebiet: 80331–81929 (the 70-PLZ set introduced in
// migration 0010). Erlangen: 91052–91058.
const MUENCHEN_PLZ_MIN = 80331
const MUENCHEN_PLZ_MAX = 81929
const ERLANGEN_PLZ_MIN = 91052
const ERLANGEN_PLZ_MAX = 91058

/**
 * Resolve the `projects.city` value from the plot address + Bundesland.
 * Pure + deterministic; returns null whenever no cityBlock-pilot city
 * applies (which is the common case outside München).
 */
export function resolveCityFromPLZ(
  address: string | null | undefined,
  bundesland: BundeslandCode,
): CityCode | null {
  // cityBlock pilot is Bayern-only — never assign a Bayern city to a
  // project in another Bundesland (the forensics leak).
  if (bundesland !== 'bayern') return null
  const plz = extractPostcode(address ?? '')
  if (!plz) return null
  const n = Number.parseInt(plz, 10)
  if (!Number.isFinite(n)) return null
  if (n >= MUENCHEN_PLZ_MIN && n <= MUENCHEN_PLZ_MAX) return 'muenchen'
  if (n >= ERLANGEN_PLZ_MIN && n <= ERLANGEN_PLZ_MAX) return 'erlangen'
  return null
}
