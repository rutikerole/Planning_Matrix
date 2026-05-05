import type { Role } from '@/types/projectState'

/**
 * Phase 8.1 (A.1) — baseline `Role[]` inferred from project intent +
 * Bundesland when persona hasn't yet emitted any roles.
 *
 * The baseline is intentionally conservative: 5 roles for a new
 * residential build (architekt, tragwerksplaner, energieberater,
 * vermesser, bauamt — the canonical Bayern EFH/MFH set), and a
 * smaller set for sanierung / umnutzung / abbruch where some specialists
 * are situational rather than reliably required.
 *
 * Every baseline role carries `qualifier: { source: 'LEGAL', quality:
 * 'CALCULATED', setBy: 'system' }` so the UI can render a clay-tint
 * "likely · pending architect confirmation" pill on baseline rows.
 * Once the persona emits real roles in `state.roles`, the selector
 * (`useResolvedRoles`) prefers those over the baseline.
 *
 * verifyBeforePublicLaunch — same caveat as costNormsMuenchen and the
 * smart-suggestions bank: educational orientation, not legal advice.
 */

interface Args {
  intent: string
  bundesland: string
}

const NOW = (): string => new Date().toISOString()

const baselineRole = (
  id: string,
  title_de: string,
  title_en: string,
  rationale_de: string,
  rationale_en: string,
): Role => ({
  id,
  title_de,
  title_en,
  needed: true,
  rationale_de,
  rationale_en,
  qualifier: {
    source: 'LEGAL',
    quality: 'CALCULATED',
    setAt: NOW(),
    setBy: 'system',
    reason:
      'Baseline für Bayern abgeleitet — wird durch konkrete Berater:innen-Empfehlungen überschrieben.',
  },
})

const NEW_BUILD_ROLES = (): Role[] => [
  baselineRole(
    'R-Architekt',
    'Architekt:in',
    'Architect',
    'Bauvorlageberechtigt nach BayBO Art. 61; reicht den Antrag ein.',
    'Licensed for permit submissions under BayBO Art. 61.',
  ),
  baselineRole(
    'R-Tragwerksplaner',
    'Tragwerksplaner:in',
    'Structural engineer',
    'Standsicherheitsnachweis nach BayBO Art. 62.',
    'Structural certification under BayBO Art. 62.',
  ),
  baselineRole(
    'R-Energieberater',
    'Energieberater:in',
    'Energy consultant',
    'Wärmeschutznachweis nach GEG 2024 — Bestandteil des Antrags.',
    'Thermal protection certification under GEG 2024 — required for the application.',
  ),
  baselineRole(
    'R-Vermesser',
    'Vermesser:in',
    'Surveyor',
    'Amtlicher Lageplan; bei Neubauten in Bayern Pflicht.',
    'Official site plan; mandatory for new builds in Bayern.',
  ),
  baselineRole(
    'R-Bauamt',
    'Bauamt',
    'Building authority',
    'Kommunale Genehmigungsbehörde — prüft und entscheidet.',
    'Municipal permitting body — reviews and decides.',
  ),
]

const RENOVATION_ROLES = (): Role[] => [
  baselineRole(
    'R-Architekt',
    'Architekt:in',
    'Architect',
    'Bestandsaufnahme + Antragstellung; bauvorlageberechtigt nach BayBO Art. 61.',
    'Existing-condition survey + permit submission; licensed under BayBO Art. 61.',
  ),
  baselineRole(
    'R-Tragwerksplaner',
    'Tragwerksplaner:in',
    'Structural engineer',
    'Bei strukturellen Eingriffen Pflicht — Standsicherheitsnachweis.',
    'Required for any structural intervention — load-path certification.',
  ),
  baselineRole(
    'R-Energieberater',
    'Energieberater:in',
    'Energy consultant',
    'Bei wesentlichen Sanierungen GEG-Nachweis erforderlich.',
    'GEG certificate required for major renovations.',
  ),
  baselineRole(
    'R-Bauamt',
    'Bauamt',
    'Building authority',
    'Kommunale Genehmigungsbehörde — prüft und entscheidet.',
    'Municipal permitting body — reviews and decides.',
  ),
]

const DEMOLITION_ROLES = (): Role[] => [
  baselineRole(
    'R-Architekt',
    'Architekt:in',
    'Architect',
    'Antragstellung Abbruch + Entsorgungskonzept.',
    'Demolition application + waste-management concept.',
  ),
  baselineRole(
    'R-Tragwerksplaner',
    'Tragwerksplaner:in',
    'Structural engineer',
    'Beurteilung der Standsicherheit während des Abbruchs.',
    'Structural assessment of stability during demolition.',
  ),
  baselineRole(
    'R-Bauamt',
    'Bauamt',
    'Building authority',
    'Abbruchanzeige bzw. Genehmigung je nach Größe.',
    'Demolition notification or permit depending on size.',
  ),
]

export function deriveBaselineRoles({ intent, bundesland }: Args): Role[] {
  // v1 only ships Bayern baselines; other Länder fall through to the
  // new-build set as the safest default. Once Phase 9 expands beyond
  // Bayern this conditional becomes a Bundesland switch.
  void bundesland

  switch (intent) {
    case 'neubau_einfamilienhaus':
    case 'neubau_mehrfamilienhaus':
    case 'aufstockung':
    case 'anbau':
      return NEW_BUILD_ROLES()
    case 'sanierung':
    case 'umnutzung':
      return RENOVATION_ROLES()
    case 'abbruch':
      return DEMOLITION_ROLES()
    default:
      return NEW_BUILD_ROLES()
  }
}
