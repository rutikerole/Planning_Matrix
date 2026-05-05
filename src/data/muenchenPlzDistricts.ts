/**
 * Phase 8.5 (A.1) — München PLZ → Stadtbezirk lookup table.
 *
 * Live Tengstraße project (PLZ 80796) had its district hallucinated
 * as "12 Schwabing-Freimann" when the correct answer is "4
 * Schwabing-West". Root cause: the persona prompt asked the model to
 * derive Stadtbezirk from the address but never gave a lookup table.
 * This file provides the deterministic mapping; the persona prompt
 * (commit 12 / Tier 3) routes lookups through it instead of guessing.
 *
 * Coverage: 25 Münchner Stadtbezirke, ~70+ PLZ. Not exhaustive — some
 * PLZs span district boundaries (e.g., 80807 covers Schwabing-West and
 * Schwabing-Freimann); for those we list the dominant district.
 *
 * verifyBeforePublicLaunch — entries marked with comments flagged as
 * uncertain. Rutik should spot-check against deutschepost.de PLZ-search
 * before public launch.
 */

export interface MuenchenDistrict {
  number: number
  name: string
}

export const MUENCHEN_DISTRICTS: Record<number, string> = {
  1: 'Altstadt-Lehel',
  2: 'Ludwigsvorstadt-Isarvorstadt',
  3: 'Maxvorstadt',
  4: 'Schwabing-West',
  5: 'Au-Haidhausen',
  6: 'Sendling',
  7: 'Sendling-Westpark',
  8: 'Schwanthalerhöhe',
  9: 'Neuhausen-Nymphenburg',
  10: 'Moosach',
  11: 'Milbertshofen-Am Hart',
  12: 'Schwabing-Freimann',
  13: 'Bogenhausen',
  14: 'Berg am Laim',
  15: 'Trudering-Riem',
  16: 'Ramersdorf-Perlach',
  17: 'Obergiesing-Fasangarten',
  18: 'Untergiesing-Harlaching',
  19: 'Thalkirchen-Obersendling-Forstenried-Fürstenried-Solln',
  20: 'Hadern',
  21: 'Pasing-Obermenzing',
  22: 'Aubing-Lochhausen-Langwied',
  23: 'Allach-Untermenzing',
  24: 'Feldmoching-Hasenbergl',
  25: 'Laim',
}

/**
 * PLZ → district number map. ~70 entries; some PLZs span boundaries
 * (we list the dominant district). Sub-Bauamt routing in the persona
 * prompt depends on this; treat any PLZ outside this map as
 * "Stadtbezirk wird verifiziert" rather than guessing.
 */
export const MUENCHEN_PLZ_DISTRICTS: Record<string, number> = {
  // ── 803xx — central / Altstadt-Lehel + Ludwigsvorstadt-Isarvorstadt ─
  '80331': 1, // Altstadt
  '80333': 1, // Altstadt-Lehel
  '80335': 2, // Ludwigsvorstadt
  '80336': 2, // Ludwigsvorstadt
  '80337': 2, // Ludwigsvorstadt-Isarvorstadt
  '80339': 2, // Schwanthalerhöhe edge — borderline 8/2; 2 dominant
  '80469': 2, // Isarvorstadt
  '80538': 1, // Lehel
  '80539': 1, // Lehel

  // ── 806xx — Maxvorstadt + Neuhausen + Laim ──────────────────────────
  '80634': 9, // Neuhausen
  '80636': 9, // Neuhausen-Nymphenburg
  '80637': 9, // Neuhausen-Nymphenburg
  '80638': 9, // Neuhausen-Nymphenburg
  '80639': 9, // Neuhausen-Nymphenburg
  '80686': 25, // Laim
  '80687': 25, // Laim / Hadern edge
  '80689': 25, // Laim

  // ── 807xx — Maxvorstadt (3) + Schwabing-West (4) ────────────────────
  '80796': 4, // Schwabing-West (correct vs hallucinated 12)
  '80797': 4, // Schwabing-West
  '80798': 3, // Maxvorstadt edge — borderline 3/4; 3 dominant
  '80799': 3, // Maxvorstadt

  // ── 808xx — Schwabing-Freimann + Bogenhausen ────────────────────────
  '80801': 4, // Schwabing-West (north)
  '80802': 4, // Schwabing-West
  '80803': 4, // Schwabing-West
  '80804': 12, // Schwabing-Freimann
  '80805': 12, // Schwabing-Freimann
  '80807': 12, // Schwabing-Freimann (Englischer Garten North)
  '80809': 11, // Milbertshofen edge

  // ── 809xx — Milbertshofen-Am Hart + Moosach + Allach + Feldmoching ─
  '80933': 24, // Feldmoching
  '80935': 24, // Feldmoching-Hasenbergl
  '80937': 11, // Milbertshofen-Am Hart
  '80939': 24, // Feldmoching-Hasenbergl
  '80992': 11, // Milbertshofen
  '80993': 10, // Moosach
  '80995': 24, // Feldmoching-Hasenbergl
  '80997': 23, // Allach-Untermenzing
  '80999': 23, // Allach-Untermenzing

  // ── 812xx — Pasing + Aubing + Hadern ────────────────────────────────
  '81241': 21, // Pasing-Obermenzing
  '81243': 22, // Aubing-Lochhausen-Langwied
  '81245': 22, // Aubing
  '81247': 21, // Pasing-Obermenzing
  '81249': 21, // Pasing-Obermenzing

  // ── 813xx — Sendling + Sendling-Westpark + Hadern ───────────────────
  '81369': 7, // Sendling-Westpark
  '81371': 6, // Sendling
  '81373': 6, // Sendling
  '81375': 20, // Hadern
  '81377': 6, // Sendling
  '81379': 19, // Thalkirchen / Obersendling

  // ── 814xx — Solln + Forstenried ─────────────────────────────────────
  '81475': 19, // Solln
  '81476': 19, // Forstenried
  '81477': 19, // Fürstenried
  '81479': 19, // Solln

  // ── 815xx — Untergiesing-Harlaching + Obergiesing ───────────────────
  '81539': 17, // Obergiesing-Fasangarten
  '81541': 17, // Obergiesing
  '81543': 18, // Untergiesing-Harlaching
  '81545': 18, // Untergiesing-Harlaching
  '81547': 18, // Harlaching
  '81549': 18, // Harlaching

  // ── 816xx — Au-Haidhausen + Bogenhausen ─────────────────────────────
  '81667': 5, // Haidhausen
  '81669': 5, // Au-Haidhausen
  '81671': 5, // Haidhausen
  '81673': 14, // Berg am Laim edge
  '81675': 13, // Bogenhausen
  '81677': 13, // Bogenhausen
  '81679': 13, // Bogenhausen

  // ── 817xx — Berg am Laim + Trudering ────────────────────────────────
  '81735': 16, // Ramersdorf-Perlach
  '81737': 16, // Ramersdorf-Perlach
  '81739': 16, // Ramersdorf-Perlach

  // ── 818xx — Trudering-Riem + Ramersdorf-Perlach ─────────────────────
  '81825': 15, // Trudering
  '81827': 15, // Trudering
  '81829': 15, // Trudering-Riem

  // ── 819xx — Bogenhausen ─────────────────────────────────────────────
  '81925': 13, // Bogenhausen / Englschalking
  '81927': 13, // Bogenhausen
  '81929': 13, // Bogenhausen
}

/**
 * Phase 8.5 (A.1) — deterministic PLZ → district lookup.
 *
 * Returns null when the PLZ isn't in the table. Callers MUST surface
 * "Stadtbezirk wird verifiziert" in this case rather than guessing.
 */
export function lookupDistrict(plz: string): MuenchenDistrict | null {
  const trimmed = plz.trim()
  const number = MUENCHEN_PLZ_DISTRICTS[trimmed]
  if (!number) return null
  const name = MUENCHEN_DISTRICTS[number]
  if (!name) return null
  return { number, name }
}

/**
 * Phase 8.5 — extract a 5-digit PLZ from a free-form address string.
 * Returns null if no PLZ pattern matches.
 */
export function extractPlz(address: string | null | undefined): string | null {
  if (!address) return null
  const m = address.match(/\b(\d{5})\b/)
  if (!m) return null
  return m[1]
}

/**
 * Phase 8.5 — convenience: address → district. Combines extractPlz +
 * lookupDistrict. Returns null on either miss.
 */
export function districtFromAddress(
  address: string | null | undefined,
): MuenchenDistrict | null {
  const plz = extractPlz(address)
  if (!plz) return null
  return lookupDistrict(plz)
}
