/**
 * Phase 8.2 (B.4) — short rationales for each cost-row in the
 * Cost & Timeline tab. Surfaced as italic-serif Georgia 11.5px below
 * the role label so the bauherr can see WHY a number is what it is
 * without opening the tooltip.
 *
 * Curated for orientation only — same verifyBeforePublicLaunch caveat
 * as costNormsMuenchen.
 *
 * v1.0.6 Bug 1 — documented downgrade. The strings below are
 * Bayern-flavoured ("Bayern-Faktor", "BayBO Art. 62", "Pflicht für
 * Neubauten in Bayern"). For a Hessen project they still surface
 * verbatim because these rationales are static per-row text, not
 * bundesland-templated. Accepted v1.0.6 leakage; per-state rationale
 * sets are v1.1 content scope. The numeric breakdown + the dynamic
 * inputs label (`${inputs.bundesland} factor`) are correct.
 */

export interface CostRationale {
  /** Matches CostBreakdown key in costNormsMuenchen.ts. */
  key:
    | 'architekt'
    | 'tragwerksplanung'
    | 'vermessung'
    | 'energieberatung'
    | 'behoerdengebuehren'
  rationaleDe: string
  rationaleEn: string
}

export const COST_RATIONALES: CostRationale[] = [
  {
    key: 'architekt',
    rationaleDe:
      'HOAI Honorarzone III · Leistungsphasen 1–4 · skaliert mit Wohnfläche × Bayern-Faktor.',
    rationaleEn:
      'HOAI Honorarzone III · service phases 1–4 · scales with floor area × Bayern factor.',
  },
  {
    key: 'tragwerksplanung',
    rationaleDe:
      'BayBO Art. 62 Standsicherheitsnachweis · typischer Einfamilien-/Mehrfamilien-Anteil.',
    rationaleEn:
      'BayBO Art. 62 structural certification · typical single/multi-family share.',
  },
  {
    key: 'vermessung',
    rationaleDe:
      'Amtlicher Lageplan mit Höhenpunkten · Pflicht für Neubauten in Bayern.',
    rationaleEn:
      'Official site plan with elevation points · mandatory for new builds in Bayern.',
  },
  {
    key: 'energieberatung',
    rationaleDe:
      'GEG 2024 Wärmeschutznachweis + Energieausweis · vor LP 4 zu erstellen.',
    rationaleEn:
      'GEG 2024 thermal-protection certificate + energy passport · prepared before LP 4.',
  },
  {
    key: 'behoerdengebuehren',
    rationaleDe:
      'Bauamtsgebühr + ggf. denkmalrechtliche Erlaubnis + nachbarliche Beteiligung.',
    rationaleEn:
      'Bauamt fee + heritage permit if applicable + neighbour involvement.',
  },
]

const BY_KEY = new Map(COST_RATIONALES.map((r) => [r.key, r]))

export function findCostRationale(
  key: CostRationale['key'],
): CostRationale | undefined {
  return BY_KEY.get(key)
}
