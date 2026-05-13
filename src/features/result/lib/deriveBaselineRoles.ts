import type { Role } from '@/types/projectState'
import { getStateCitations, type StateCitationPack } from '@/legal/stateCitations'

/**
 * Phase 8.1 (A.1) — baseline `Role[]` inferred from project intent +
 * Bundesland when persona hasn't yet emitted any roles.
 *
 * v1.0.21 Bug 23 — baseline rationales now key the permit-submission
 * § and structural-cert § off the project's Bundesland. v1.0.20 and
 * earlier hard-coded BayBO Art. 61 / Art. 62 for every project, which
 * surfaced as a literal BayBO citation on Berlin / NRW / Hessen
 * projects (Bug 23 from the v1.0.20 smoke walk). Bayern fixtures
 * continue to render BayBO §§ verbatim; non-Bayern fixtures render
 * the state-correct §, or an honest-deferral phrase for unverified
 * stub states.
 *
 * The baseline is intentionally conservative: 5 roles for a new
 * residential build (architekt, tragwerksplaner, energieberater,
 * vermesser, bauamt), and a smaller set for sanierung / umnutzung /
 * abbruch where some specialists are situational.
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
  bundeslandLabelDe: string,
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
    reason: `Baseline für ${bundeslandLabelDe} abgeleitet — wird durch konkrete Berater:innen-Empfehlungen überschrieben.`,
  },
})

const NEW_BUILD_ROLES = (citations: StateCitationPack): Role[] => [
  baselineRole(
    'R-Architekt',
    'Architekt:in',
    'Architect',
    `Bauvorlageberechtigt nach ${citations.permitSubmissionCitation}; reicht den Antrag ein.`,
    `Licensed for permit submissions under ${citations.permitSubmissionCitation}.`,
    citations.labelDe,
  ),
  baselineRole(
    'R-Tragwerksplaner',
    'Tragwerksplaner:in',
    'Structural engineer',
    `Standsicherheitsnachweis nach ${citations.structuralCertCitation}.`,
    `Structural certification under ${citations.structuralCertCitation}.`,
    citations.labelDe,
  ),
  baselineRole(
    'R-Energieberater',
    'Energieberater:in',
    'Energy consultant',
    'Wärmeschutznachweis nach GEG 2024 — Bestandteil des Antrags.',
    'Thermal protection certification under GEG 2024 — required for the application.',
    citations.labelDe,
  ),
  baselineRole(
    'R-Vermesser',
    'Vermesser:in',
    'Surveyor',
    `Amtlicher Lageplan; bei Neubauten in ${citations.labelDe} Pflicht.`,
    `Official site plan; mandatory for new builds in ${citations.labelEn}.`,
    citations.labelDe,
  ),
  baselineRole(
    'R-Bauamt',
    'Bauamt',
    'Building authority',
    'Kommunale Genehmigungsbehörde — prüft und entscheidet.',
    'Municipal permitting body — reviews and decides.',
    citations.labelDe,
  ),
]

const RENOVATION_ROLES = (citations: StateCitationPack): Role[] => [
  baselineRole(
    'R-Architekt',
    'Architekt:in',
    'Architect',
    `Bestandsaufnahme + Antragstellung; bauvorlageberechtigt nach ${citations.permitSubmissionCitation}.`,
    `Existing-condition survey + permit submission; licensed under ${citations.permitSubmissionCitation}.`,
    citations.labelDe,
  ),
  baselineRole(
    'R-Tragwerksplaner',
    'Tragwerksplaner:in',
    'Structural engineer',
    'Bei strukturellen Eingriffen Pflicht — Standsicherheitsnachweis.',
    'Required for any structural intervention — load-path certification.',
    citations.labelDe,
  ),
  baselineRole(
    'R-Energieberater',
    'Energieberater:in',
    'Energy consultant',
    'Bei wesentlichen Sanierungen GEG-Nachweis erforderlich.',
    'GEG certificate required for major renovations.',
    citations.labelDe,
  ),
  baselineRole(
    'R-Bauamt',
    'Bauamt',
    'Building authority',
    'Kommunale Genehmigungsbehörde — prüft und entscheidet.',
    'Municipal permitting body — reviews and decides.',
    citations.labelDe,
  ),
]

const DEMOLITION_ROLES = (citations: StateCitationPack): Role[] => [
  baselineRole(
    'R-Architekt',
    'Architekt:in',
    'Architect',
    'Antragstellung Abbruch + Entsorgungskonzept.',
    'Demolition application + waste-management concept.',
    citations.labelDe,
  ),
  baselineRole(
    'R-Tragwerksplaner',
    'Tragwerksplaner:in',
    'Structural engineer',
    'Beurteilung der Standsicherheit während des Abbruchs.',
    'Structural assessment of stability during demolition.',
    citations.labelDe,
  ),
  baselineRole(
    'R-Bauamt',
    'Bauamt',
    'Building authority',
    'Abbruchanzeige bzw. Genehmigung je nach Größe.',
    'Demolition notification or permit depending on size.',
    citations.labelDe,
  ),
]

export function deriveBaselineRoles({ intent, bundesland }: Args): Role[] {
  const citations = getStateCitations(bundesland)
  switch (intent) {
    case 'neubau_einfamilienhaus':
    case 'neubau_mehrfamilienhaus':
    case 'aufstockung':
    case 'anbau':
      return NEW_BUILD_ROLES(citations)
    case 'sanierung':
    case 'umnutzung':
      return RENOVATION_ROLES(citations)
    case 'abbruch':
      return DEMOLITION_ROLES(citations)
    default:
      return NEW_BUILD_ROLES(citations)
  }
}
