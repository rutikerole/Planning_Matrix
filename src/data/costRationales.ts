/**
 * Phase 8.2 (B.4) — short rationales for each cost-row in the
 * Cost & Timeline tab. Surfaced as italic-serif Georgia 11.5px below
 * the role label so the bauherr can see WHY a number is what it is
 * without opening the tooltip.
 *
 * Curated for orientation only — same verifyBeforePublicLaunch caveat
 * as costNormsMuenchen.
 *
 * v1.0.10 — state-parameterized. Previously hardcoded "Bayern-Faktor",
 * "BayBO Art. 62 Standsicherheitsnachweis", and "Pflicht für
 * Neubauten in Bayern". Now reads getStateLocalization(bundesland)
 * and composes per-state strings: structural-cert citation switches
 * to § 68 BauO NRW / § 73a LBO / § 68 HBO / § 65 NBauO per state;
 * surveying note + cost-factor framing localized per Bundesland.
 * Bayern projects render the same strings as v1.0.6+.
 */

import { getStateLocalization } from '@/legal/stateLocalization'

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

/**
 * Per-row rationale resolver. State-parameterized via
 * `getStateLocalization` — Bayern projects keep the original wording;
 * non-Bayern projects swap in the per-state structural-cert citation,
 * surveying note, and cost-factor label.
 *
 * The second argument is optional only for backward compatibility with
 * callers that don't yet thread bundesland; missing input resolves to
 * Bayern (preserves v1.0.6+ output verbatim).
 */
export function findCostRationale(
  key: CostRationale['key'],
  bundesland?: string | null,
): CostRationale | undefined {
  const loc = getStateLocalization(bundesland)
  switch (key) {
    case 'architekt':
      return {
        key,
        rationaleDe: loc.costFactorLabel.de,
        rationaleEn: loc.costFactorLabel.en,
      }
    case 'tragwerksplanung': {
      const cert = loc.structuralCert
      // Substantive states show "<citation> · <description>"; stub
      // states show just description (citation === '').
      const tagDe = cert.citation
        ? `${cert.citation} ${cert.descriptionDe}`
        : cert.descriptionDe
      const tagEn = cert.citation
        ? `${cert.citation} ${cert.descriptionEn}`
        : cert.descriptionEn
      return {
        key,
        rationaleDe: `${tagDe} · typischer Einfamilien-/Mehrfamilien-Anteil.`,
        rationaleEn: `${tagEn} · typical single/multi-family share.`,
      }
    }
    case 'vermessung':
      return {
        key,
        rationaleDe: loc.surveyingNote.de,
        rationaleEn: loc.surveyingNote.en,
      }
    case 'energieberatung':
      // GEG is FEDERAL law — same wording regardless of Bundesland.
      return {
        key,
        rationaleDe:
          'GEG 2024 Wärmeschutznachweis + Energieausweis · vor LP 4 zu erstellen.',
        rationaleEn:
          'GEG 2024 thermal-protection certificate + energy passport · prepared before LP 4.',
      }
    case 'behoerdengebuehren':
      // Bauamt fee structure is municipal — keep state-neutral.
      return {
        key,
        rationaleDe:
          'Bauamtsgebühr + ggf. denkmalrechtliche Erlaubnis + nachbarliche Beteiligung.',
        rationaleEn:
          'Bauamt fee + heritage permit if applicable + neighbour involvement.',
      }
    default:
      return undefined
  }
}
