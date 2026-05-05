/**
 * Phase 8.3 (C.2) — risk catalog. ~10 typical Bayern construction
 * risks with likelihood-evidence patterns + impact + un-risk notes.
 *
 * Each entry's `evidencePattern` is a regex run against the project
 * corpus (facts + procedures + areas reasons). When the pattern hits,
 * likelihood scales up; otherwise we use the catalog's `baseLikelihood`.
 *
 * Score = likelihood × impact (each 1–3). Both axes correspond to the
 * 3×3 dot-matrix in RiskRegisterCard.
 *
 * verifyBeforePublicLaunch — same caveat as the rest of the workspace's
 * curated content. Risks listed here surface real-world concerns; the
 * un-risk-this notes are educational, not prescriptive.
 */

export interface RiskCatalogEntry {
  id: string
  titleDe: string
  titleEn: string
  /** Likelihood 1–3 when no evidence pattern hits. */
  baseLikelihood: 1 | 2 | 3
  /** Impact 1–3 — fixed; impact is intrinsic to the risk type. */
  impact: 1 | 2 | 3
  /** Optional regex; when it hits, likelihood is bumped to bumpedLikelihood. */
  evidencePattern?: RegExp
  bumpedLikelihood?: 1 | 2 | 3
  /** Optional intent filter (most renovations carry statics-surprise risk; demos don't). */
  intents?: string[]
  unriskDe: string
  unriskEn: string
  verifyBeforePublicLaunch: true
}

export const RISK_CATALOG: RiskCatalogEntry[] = [
  {
    id: 'risk-bplan-late-discovery',
    titleDe: 'B-Plan-Spätbefund',
    titleEn: 'B-Plan late discovery',
    baseLikelihood: 2,
    impact: 3,
    evidencePattern: /§\s*34|innenbereich|kein\s+b-plan/i,
    bumpedLikelihood: 3,
    unriskDe:
      'Bauamt-Vorbescheid einholen oder B-Plan-Anfrage frühzeitig stellen.',
    unriskEn:
      'Request a Bauamt pre-decision or B-Plan inquiry early in the project.',
    verifyBeforePublicLaunch: true,
  },
  {
    id: 'risk-denkmal',
    titleDe: 'Denkmalschutz-Auflage',
    titleEn: 'Heritage-protection requirement',
    baseLikelihood: 1,
    impact: 3,
    evidencePattern: /denkmal|baydschg|ensemble/i,
    bumpedLikelihood: 3,
    unriskDe:
      'Beim Landesamt für Denkmalpflege Auskunft anfordern, bevor LP 2 abgeschlossen ist.',
    unriskEn:
      'Request guidance from the Landesamt für Denkmalpflege before completing LP 2.',
    verifyBeforePublicLaunch: true,
  },
  {
    id: 'risk-baumschutz',
    titleDe: 'Baumschutz-Auflagen',
    titleEn: 'Tree-protection restrictions',
    baseLikelihood: 2,
    impact: 2,
    evidencePattern: /baum|baumschutz/i,
    bumpedLikelihood: 3,
    unriskDe:
      'Baumkartierung vor Baufeldfreimachung; ggf. Fällantrag stellen.',
    unriskEn:
      'Commission a tree survey before site clearing; file felling permits if needed.',
    verifyBeforePublicLaunch: true,
  },
  {
    id: 'risk-stellplatz',
    titleDe: 'Stellplatz-Engpass',
    titleEn: 'Parking shortfall',
    baseLikelihood: 2,
    impact: 2,
    evidencePattern: /stellplatz|stpls|gbs/i,
    bumpedLikelihood: 3,
    unriskDe:
      'StPlS 926 prüfen; ÖPNV-bedingte Reduktion oder Ablöseverhandlung mit der LHM.',
    unriskEn:
      'Check StPlS 926; negotiate public-transit reduction or commutation with the city.',
    verifyBeforePublicLaunch: true,
  },
  {
    id: 'risk-nachbar',
    titleDe: 'Nachbarwiderspruch',
    titleEn: 'Neighbour objection',
    baseLikelihood: 2,
    impact: 2,
    unriskDe:
      'Nachbarschaft frühzeitig informieren; Unterschriften vor Antragstellung einholen.',
    unriskEn:
      'Brief neighbours early; collect signatures before filing the application.',
    verifyBeforePublicLaunch: true,
  },
  {
    id: 'risk-statik',
    titleDe: 'Statische Überraschung im Bestand',
    titleEn: 'Existing-building structural surprise',
    baseLikelihood: 2,
    impact: 3,
    intents: ['sanierung', 'umnutzung', 'aufstockung', 'anbau'],
    unriskDe:
      'Tragwerksplaner:in mit Erst-Begehung beauftragen, bevor LP 3 abgeschlossen wird.',
    unriskEn:
      'Engage a structural engineer for an initial walk-through before completing LP 3.',
    verifyBeforePublicLaunch: true,
  },
  {
    id: 'risk-geg',
    titleDe: 'GEG-Nachforderung',
    titleEn: 'GEG follow-up requirements',
    baseLikelihood: 2,
    impact: 2,
    evidencePattern: /geg|w(ä|ae)rmeschutz|energie|sanierung/i,
    bumpedLikelihood: 3,
    unriskDe:
      'Energieberater:in vor LP 4 binden; Sanierungsfahrplan parallel erstellen.',
    unriskEn:
      'Engage the energy consultant before LP 4; draft a renovation roadmap in parallel.',
    verifyBeforePublicLaunch: true,
  },
  {
    id: 'risk-brandschutz',
    titleDe: 'Brandschutz-Eskalation',
    titleEn: 'Fire-protection scope creep',
    baseLikelihood: 1,
    impact: 2,
    evidencePattern: /gk\s*[45]|sonderbau|brandschutz/i,
    bumpedLikelihood: 3,
    unriskDe:
      'Brandschutznachweis durch staatlich anerkannte:n Sachverständige:n; Vorabstimmung mit Branddirektion.',
    unriskEn:
      'State-accredited fire-protection certificate; preliminary alignment with the Branddirektion.',
    verifyBeforePublicLaunch: true,
  },
  {
    id: 'risk-altlast',
    titleDe: 'Altlasten / Bodenverdacht',
    titleEn: 'Contaminated soil suspicion',
    baseLikelihood: 1,
    impact: 3,
    evidencePattern: /altlast|brownfield|gewerbe.*bestand/i,
    bumpedLikelihood: 2,
    unriskDe:
      'Boden-Vorerkundung vor Aushub; Altlastenkataster der LHM einsehen.',
    unriskEn:
      'Soil pre-investigation before excavation; consult the city contaminated-sites register.',
    verifyBeforePublicLaunch: true,
  },
  {
    id: 'risk-bauamt-auslastung',
    titleDe: 'Bauamt-Stau',
    titleEn: 'Bauamt backlog',
    baseLikelihood: 2,
    impact: 1,
    unriskDe:
      'Realistische Pufferzeiten einplanen; vollständige Unterlagen erhöhen die Geschwindigkeit.',
    unriskEn:
      'Plan realistic buffer time; complete documents speed up the review.',
    verifyBeforePublicLaunch: true,
  },
]
