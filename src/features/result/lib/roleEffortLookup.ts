/**
 * Phase 3.5 #62 — typical hour-range estimates per role per project class.
 *
 * Used in Section VI ("Das Team") to render an effort line below
 * each specialist card. Pure lookup; numbers drawn from common HOAI
 * 2021 fee tables + practitioner ranges for Bayern. Flagged
 * verifyBeforePublicLaunch in spirit — these are educational
 * orientation values, not quotes.
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

/** verifyBeforePublicLaunch: every value here is educational. */
export const ROLE_EFFORT_LOOKUP: Record<RoleKey, RoleEffort> = {
  architekt: {
    rangeHours: '30–60 h',
    titleDe: 'Architekt:in',
    titleEn: 'Architect',
    qualificationDe: 'bauvorlageberechtigt nach Art. 61 BayBO',
    qualificationEn: 'licensed for permit submissions (BayBO Art. 61)',
  },
  tragwerksplaner: {
    rangeHours: '15–35 h',
    titleDe: 'Tragwerksplaner:in',
    titleEn: 'Structural engineer',
    qualificationDe: 'Standsicherheitsnachweis nach BayBO Art. 62',
    qualificationEn: 'structural certification (BayBO Art. 62)',
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
