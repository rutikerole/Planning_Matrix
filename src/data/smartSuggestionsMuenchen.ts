/**
 * Phase 3.5 #64 — proactive suggestions bank.
 *
 * Static lookup keyed by intent + bundesland + scope keywords. Each
 * suggestion carries a German + English title + body and a marker
 * for which combination it's relevant for. The matcher in
 * smartSuggestionsMatcher.ts walks project state and returns 3-5
 * applicable entries.
 *
 * Phase 5 — renamed from smartSuggestionsErlangen.ts as part of
 * the Erlangen → München pivot. The Stellplatzsatzung suggestion
 * was tightened to reference München's StPlS 926 (Oct 2025
 * Novellation) explicitly; a new München-specific Baumschutz-
 * suggestion was added.
 *
 * verifyBeforePublicLaunch — same flagging pattern as the Phase 3.4
 * fact bank. These are educational, not legal advice.
 */

/**
 * Phase 8.1 (A.5 + B.2) — category + reasoning + relevance fields
 * added. The matcher uses relevance + filter matches to sort cards
 * best-match-first; the SuggestionsTab card surfaces `reasoningDe/En`
 * as an always-visible "Why we think this" sub-line.
 */
export type SuggestionCategory =
  | 'insurance'
  | 'energy'
  | 'tooling'
  | 'precedent'
  | 'regulation'
  | 'risk'

export interface SmartSuggestion {
  id: string
  /** Category controls the eyebrow + grouping in the Suggestions tab. */
  category: SuggestionCategory
  /** Title in German. */
  titleDe: string
  /** Title in English. */
  titleEn: string
  /** Body in German. */
  bodyDe: string
  /** Body in English. */
  bodyEn: string
  /** One-line "why we think this" — always visible under the body. */
  reasoningDe: string
  reasoningEn: string
  /** Optional intent filter — only show when project.intent matches. */
  intents?: string[]
  /** Optional bundesland filter — only show when project.bundesland matches. */
  bundeslaender?: string[]
  /** Optional regex run against the project corpus (facts + procedures). */
  scopeMatch?: RegExp
  /**
   * Phase 8.1 — base relevance weight (1 = standard). Bump above 1
   * for suggestions that should jump the queue regardless of how many
   * filters they declared.
   */
  relevanceWeight?: number
  verifyBeforePublicLaunch: true
}

export const SMART_SUGGESTIONS_MUENCHEN: SmartSuggestion[] = [
  {
    id: 'pv-pflicht',
    category: 'energy',
    titleDe: 'Photovoltaikanlage einplanen',
    titleEn: 'Plan a photovoltaic system',
    bodyDe:
      'Bayern verlangt seit 2025 PV bei Wohnneubauten. Dies sollte früh in die Planung einfließen, da Statik und Elektrik abhängen.',
    bodyEn:
      'Bavaria has required PV on new residential builds since 2025. Plan it early — structural + electrical scope depends on it.',
    reasoningDe: 'Bayern Klimaschutzgesetz schreibt PV bei jedem Wohnneubau vor.',
    reasoningEn: 'Bayern Klimaschutzgesetz mandates PV on every new residential build.',
    intents: ['neubau_einfamilienhaus', 'neubau_mehrfamilienhaus'],
    bundeslaender: ['Bayern'],
    relevanceWeight: 1.5,
    verifyBeforePublicLaunch: true,
  },
  {
    id: 'bauherrenversicherung',
    category: 'insurance',
    titleDe: 'Versicherungsangebote vergleichen',
    titleEn: 'Compare insurance offers',
    bodyDe:
      'Bauherrenhaftpflicht und Bauleistungsversicherung sind in dieser Phase relevant. Beide vor Baubeginn abschließen.',
    bodyEn:
      'Builder liability and construction insurance are relevant at this stage. Bind both before any work starts.',
    reasoningDe: 'Bauherrenhaftpflicht wird im Moment der Antragseinreichung relevant.',
    reasoningEn: 'Builder liability becomes relevant at the moment of permit submission.',
    verifyBeforePublicLaunch: true,
  },
  {
    id: 'kfw-foerderung',
    category: 'energy',
    titleDe: 'Förderprogramme prüfen (KfW)',
    titleEn: 'Check funding programs (KfW)',
    bodyDe:
      'Bei energetischen Maßnahmen können KfW-Förderungen die Investition deutlich reduzieren. Antrag VOR Beauftragung der Leistung.',
    bodyEn:
      'Energy-related measures may qualify for KfW funding that significantly reduces investment. Apply BEFORE awarding the work.',
    reasoningDe: 'KfW-Anträge müssen vor der Leistungsbeauftragung gestellt werden — Frist matters.',
    reasoningEn: 'KfW applications must be filed before awarding the work — the deadline matters.',
    scopeMatch: /sanierung|geg|energie|w(ä|ae)rmeschutz/i,
    verifyBeforePublicLaunch: true,
  },
  {
    id: 'denkmal-pruefen',
    category: 'regulation',
    titleDe: 'Denkmalrechtliche Erlaubnis prüfen',
    titleEn: 'Check heritage-law permits',
    bodyDe:
      'Falls das Bestandsgebäude oder die Umgebung unter Denkmalschutz steht, ist eine zusätzliche Erlaubnis nach BayDSchG erforderlich.',
    bodyEn:
      'If the existing building or its surroundings are listed, an additional permit under BayDSchG is required.',
    reasoningDe: 'BayDSchG-Erlaubnis stapelt sich auf die Baugenehmigung — sequentiell zu beantragen.',
    reasoningEn: 'BayDSchG permits stack on top of the building permit — sequential application.',
    intents: ['sanierung', 'umnutzung', 'abbruch'],
    bundeslaender: ['Bayern'],
    relevanceWeight: 1.3,
    verifyBeforePublicLaunch: true,
  },
  {
    id: 'baulasten',
    category: 'risk',
    titleDe: 'Baulastenverzeichnis einsehen',
    titleEn: 'Inspect the land charges register',
    bodyDe:
      'Das Baulastenverzeichnis kann öffentlich-rechtliche Verpflichtungen offenlegen, die Sie als neue:r Eigentümer:in übernehmen.',
    bodyEn:
      'The Baulastenverzeichnis can reveal public-law obligations that transfer with ownership. Inspect before purchase.',
    reasoningDe: 'Verborgene Wegerechte oder Stellplatznachweise können das Vorhaben kippen.',
    reasoningEn: 'Hidden rights of way or parking allocations can derail the project.',
    bundeslaender: ['Bayern'],
    verifyBeforePublicLaunch: true,
  },
  {
    id: 'stellplatzsatzung-muenchen',
    category: 'regulation',
    titleDe: 'Münchner Stellplatzsatzung StPlS 926 prüfen',
    titleEn: "Check Munich's StPlS 926 parking ordinance",
    bodyDe:
      'Die im Oktober 2025 novellierte Münchner Stellplatzsatzung (StPlS 926) schreibt 1 Stellplatz je Wohneinheit vor und erlaubt ÖPNV-bedingte Reduktionen. Hinweis: § 3 GBS ist seit dem 1. Oktober 2025 in München ausgesetzt — StPlS 926 ist die geltende Quelle.',
    bodyEn:
      "Munich's StPlS 926 (amended October 2025) sets 1 parking space per dwelling and allows public-transit reductions. Note: § 3 GBS has been suspended in Munich since 1 October 2025 — StPlS 926 is the governing source.",
    reasoningDe: 'StPlS 926 löst seit 10/2025 die GBS in München ab — Quelle aktualisieren.',
    reasoningEn: 'StPlS 926 has replaced GBS in Munich since 10/2025 — update your source.',
    bundeslaender: ['Bayern'],
    verifyBeforePublicLaunch: true,
  },
  {
    id: 'baumschutz-muenchen',
    category: 'regulation',
    titleDe: 'Münchner Baumschutzverordnung 901 beachten',
    titleEn: "Check Munich's tree-protection ordinance (901)",
    bodyDe:
      'Seit Dezember 2025 schützt die Münchner Baumschutzverordnung (Satzung 901) alle Bäume mit einem Stammumfang ab 60 cm in 100 cm Höhe. Vor Baubeginn ist eine Baumkartierung sinnvoll, um Fäll- oder Schutzauflagen frühzeitig zu erkennen.',
    bodyEn:
      "Since December 2025, Munich's tree-protection ordinance (901) covers all trees with a trunk circumference of 60 cm or more (measured at 100 cm height). A tree survey before site work helps surface felling permits or protective requirements early.",
    reasoningDe: 'Baumkartierung früh erspart spätere Auflagen oder Verzögerungen.',
    reasoningEn: 'A tree survey early avoids later restrictions or delays.',
    bundeslaender: ['Bayern'],
    verifyBeforePublicLaunch: true,
  },
  {
    id: 'energieausweis',
    category: 'energy',
    titleDe: 'Energieausweis frühzeitig planen',
    titleEn: 'Plan the energy certificate early',
    bodyDe:
      'Der Energieausweis nach GEG 2024 ist Bestandteil des Bauantrags. Energieberater:in einbinden, bevor LP 4 abgeschlossen wird.',
    bodyEn:
      'The energy certificate under GEG 2024 is part of the permit application. Engage the energy consultant before completing LP 4.',
    reasoningDe: 'GEG 2024 verlangt den Nachweis vor LP-4-Übergabe — sonst Antrag unvollständig.',
    reasoningEn: 'GEG 2024 requires the certificate before the LP 4 hand-off — else the application is incomplete.',
    intents: ['neubau_einfamilienhaus', 'neubau_mehrfamilienhaus', 'sanierung'],
    relevanceWeight: 1.2,
    verifyBeforePublicLaunch: true,
  },
  {
    id: 'nachbarschaft',
    category: 'risk',
    titleDe: 'Nachbarschaft frühzeitig informieren',
    titleEn: 'Inform neighbours early',
    bodyDe:
      'Eine kurze Information an die direkten Nachbarn vor Antragstellung reduziert Widerspruchsrisiken nach BayBO Art. 66.',
    bodyEn:
      'Briefing direct neighbours before application reduces objection risk under BayBO Art. 66.',
    reasoningDe: 'BayBO Art. 66 gibt Nachbarn ein Widerspruchsrecht — Vorabinformation entschärft.',
    reasoningEn: 'BayBO Art. 66 grants neighbours an objection right — early notice defuses it.',
    bundeslaender: ['Bayern'],
    verifyBeforePublicLaunch: true,
  },
]
