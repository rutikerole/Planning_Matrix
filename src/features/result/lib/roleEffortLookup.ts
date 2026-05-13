import { getStateCitations } from '@/legal/stateCitations'

/**
 * Phase 3.5 #62 — typical hour-range estimates per role per project class.
 *
 * Used in Section VI ("Das Team") to render an effort line below
 * each specialist card. Pure lookup; numbers drawn from common HOAI
 * 2021 fee tables + practitioner ranges. Flagged
 * verifyBeforePublicLaunch in spirit — these are educational
 * orientation values, not quotes.
 *
 * v1.0.21 Bug 23 — the qualification line (qualificationDe/En) now
 * keys the § citation off the project's Bundesland. The previous
 * static record encoded BayBO Art. 61 / Art. 62 for every project,
 * which surfaced as a literal BayBO citation on Berlin / NRW
 * projects. The structure stays a Record so call-sites that index by
 * RoleKey continue to compile; the values become state-aware via
 * getRoleEffortLookup(bundesland).
 */

export type RoleKey =
  | 'architekt'
  | 'tragwerksplaner'
  | 'energieberater'
  | 'vermesser'
  | 'brandschutzplaner'
  | 'bauamt'

export interface RoleEffort {
  /** "30–60 h" / "approx. 1 day". Locale-rendered by caller. */
  rangeHours: string
  /** German display label for the role title. */
  titleDe: string
  /** English display label. */
  titleEn: string
  /** Short qualification line (DE). */
  qualificationDe: string
  qualificationEn: string
}

/**
 * Returns the role-effort lookup for the given Bundesland. Unknown /
 * empty bundesland resolves to the state-citations registry's stub
 * fallback (NOT a silent Bayern leak) — see stateCitations.ts.
 */
export function getRoleEffortLookup(
  bundesland: string | null | undefined,
): Record<RoleKey, RoleEffort> {
  const c = getStateCitations(bundesland)
  return {
    architekt: {
      rangeHours: '30–60 h',
      titleDe: 'Architekt:in',
      titleEn: 'Architect',
      qualificationDe: `bauvorlageberechtigt nach ${c.permitSubmissionCitation}`,
      qualificationEn: `licensed for permit submissions (${c.permitSubmissionCitation})`,
    },
    tragwerksplaner: {
      rangeHours: '15–35 h',
      titleDe: 'Tragwerksplaner:in',
      titleEn: 'Structural engineer',
      qualificationDe: `Standsicherheitsnachweis nach ${c.structuralCertCitation}`,
      qualificationEn: `structural certification (${c.structuralCertCitation})`,
    },
    energieberater: {
      rangeHours: '6–12 h',
      titleDe: 'Energieberater:in',
      titleEn: 'Energy consultant',
      qualificationDe: 'Wärmeschutznachweis nach GEG 2024',
      qualificationEn: 'thermal protection certification (GEG 2024)',
    },
    vermesser: {
      rangeHours: '4–8 h',
      titleDe: 'Vermesser:in',
      titleEn: 'Surveyor',
      qualificationDe: 'amtlicher Lageplan',
      qualificationEn: 'official site plan',
    },
    brandschutzplaner: {
      rangeHours: '8–20 h',
      titleDe: 'Brandschutzplaner:in',
      titleEn: 'Fire safety planner',
      qualificationDe: 'Brandschutznachweis (gebäudeklassenabhängig)',
      qualificationEn: 'fire protection certification (building-class dependent)',
    },
    bauamt: {
      rangeHours: '—',
      titleDe: 'Bauamt',
      titleEn: 'Building authority',
      qualificationDe: 'kommunale Baugenehmigungsbehörde',
      qualificationEn: 'municipal building permit authority',
    },
  }
}

/**
 * @deprecated v1.0.21 — use getRoleEffortLookup(bundesland) instead.
 * Kept for callers in transition; resolves to the unknown-state stub
 * pack (no fabricated §§). Will be removed once all consumers thread
 * bundesland through.
 */
export const ROLE_EFFORT_LOOKUP: Record<RoleKey, RoleEffort> =
  getRoleEffortLookup(null)
