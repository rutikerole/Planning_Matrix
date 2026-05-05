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
  /** Phase 8.5 (D.3) — optional Bundesland filter. Only fires when
   *  the project's bundesland appears in the array. */
  bundeslaender?: string[]
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

  // ── Phase 8.5 (D.3) — München-specific risks ──────────────────────────
  {
    id: 'risk-schwabing-ensemble',
    titleDe: 'Schwabing-Ensemble-Schutz',
    titleEn: 'Schwabing ensemble protection',
    baseLikelihood: 1,
    impact: 3,
    evidencePattern: /ensemble|schwabing|maxvorstadt|lehel/i,
    bumpedLikelihood: 3,
    unriskDe:
      'BLfD-Anfrage zum Ensemble-Schutz absetzen, bevor LP 3 startet — die Antwort braucht 4–6 Wochen.',
    unriskEn:
      'File a BLfD enquiry on ensemble protection before LP 3 starts — the response takes 4–6 weeks.',
    verifyBeforePublicLaunch: true,
  },
  {
    id: 'risk-baumschutz-fussabdruck',
    titleDe: 'Baumschutz im Footprint',
    titleEn: 'Tree protection inside the footprint',
    baseLikelihood: 2,
    impact: 2,
    evidencePattern: /baum|baumschutz|baumkartier|baumgutachten/i,
    bumpedLikelihood: 3,
    unriskDe:
      'Baumkartierung vor Lageplan-Erstellung; Schutzradius in den Antrag eintragen, ggf. Ausnahmegenehmigung beantragen.',
    unriskEn:
      'Tree survey before site-plan drafting; record protection radii in the application; apply for exemptions if needed.',
    verifyBeforePublicLaunch: true,
  },
  {
    id: 'risk-stps926-novellation',
    titleDe: 'StPlS-926-Auslegungs­änderungen',
    titleEn: 'StPlS 926 interpretation changes',
    baseLikelihood: 1,
    impact: 2,
    evidencePattern: /stellplatz|stpls|926|gbs|u-bahn|öpnv|oepnv/i,
    bumpedLikelihood: 3,
    unriskDe:
      'Stellplatznachweis nach StPlS 926 (Stand Oktober 2025) erstellen; ÖPNV-Reduktion explizit dokumentieren.',
    unriskEn:
      "Prepare a parking proof per StPlS 926 (October 2025 edition); document any public-transit reduction explicitly.",
    verifyBeforePublicLaunch: true,
  },
  {
    id: 'risk-bauamt-sommer-rotation',
    titleDe: 'Bauamt-Sommerrotation München',
    titleEn: "Munich Bauamt summer rotation",
    baseLikelihood: 2,
    impact: 1,
    unriskDe:
      'Einreichung außerhalb der Sommer-Reduktion (15.07–01.09) planen; sonst Pufferzeiten verdoppeln.',
    unriskEn:
      'Schedule submission outside the summer slowdown (15 Jul – 1 Sep); otherwise double the buffer time.',
    verifyBeforePublicLaunch: true,
  },
  {
    id: 'risk-pv-pflicht-vollzug',
    titleDe: 'PV-Pflicht-Vollzugsrisiko',
    titleEn: 'PV requirement enforcement risk',
    baseLikelihood: 2,
    impact: 2,
    evidencePattern: /pv|photovoltaik|art\.?\s*44a|44 a/i,
    bumpedLikelihood: 3,
    unriskDe:
      'PV-Konzept im Antrag dokumentieren — Anlagen­leistung, Montagekonzept, Anschlussart. Späte Korrekturen kosten Zeit.',
    unriskEn:
      'Document the PV concept in the application — capacity, mounting, grid connection. Late corrections cost time.',
    intents: ['neubau_einfamilienhaus', 'neubau_mehrfamilienhaus'],
    verifyBeforePublicLaunch: true,
  },
  {
    id: 'risk-maxvorstadt-dichte',
    titleDe: 'Maxvorstadt-Nachbar­widerspruch',
    titleEn: 'Maxvorstadt neighbour objection',
    baseLikelihood: 2,
    impact: 2,
    evidencePattern: /§\s*34|innenbereich|maxvorstadt|lehel|schwabing-west/i,
    bumpedLikelihood: 3,
    unriskDe:
      'Nachbarn vor Antragstellung informieren (Vorgespräch + Unterschriften). § 34 BauGB triggert dichte Stadtteile zuverlässig zu Widerspruchsverfahren.',
    unriskEn:
      'Brief neighbours before filing (pre-meeting + signatures). § 34 BauGB reliably triggers objection proceedings in dense districts.',
    bundeslaender: ['Bayern'],
    verifyBeforePublicLaunch: true,
  },
  {
    id: 'risk-geg-nachweis-fehlend',
    titleDe: 'GEG-Nachweis fehlt bei Einreichung',
    titleEn: 'Missing GEG certificate at submission',
    baseLikelihood: 2,
    impact: 2,
    evidencePattern: /geg|energieausweis|w(ä|ae)rmeschutz/i,
    bumpedLikelihood: 3,
    unriskDe:
      'Energieberater:in vor LP 4 binden; Wärmeschutznachweis ist Pflicht­bestandteil — Bauamt verweigert die Antragsannahme ohne.',
    unriskEn:
      'Engage the energy consultant before LP 4; thermal-protection certificate is required — the Bauamt rejects incomplete applications.',
    verifyBeforePublicLaunch: true,
  },
  {
    id: 'risk-vorbescheid-versaeumt',
    titleDe: 'Vorbescheid versäumt',
    titleEn: 'Pre-decision missed',
    baseLikelihood: 1,
    impact: 3,
    evidencePattern: /§\s*34|innenbereich|nicht.{0,8}qualifiziert|grenzwert/i,
    bumpedLikelihood: 2,
    unriskDe:
      'Bauvoranfrage nach BauGB § 34(1) vor LP 3 stellen — Klärung des Einfügungsgebots verhindert Komplettablehnung später.',
    unriskEn:
      "Request a pre-decision per BauGB § 34(1) before LP 3 — clarifying the Einfügungsgebot prevents full rejection later.",
    verifyBeforePublicLaunch: true,
  },
]
