/**
 * Phase 3.5 #64 — proactive suggestions bank.
 *
 * Static lookup keyed by intent + bundesland + scope keywords. Each
 * suggestion carries a German + English title + body and a marker
 * for which combination it's relevant for. The matcher in
 * smartSuggestionsMatcher.ts walks project state and returns 3-5
 * applicable entries.
 *
 * verifyBeforePublicLaunch — same flagging pattern as the Phase 3.4
 * fact bank. These are educational, not legal advice.
 */

export interface SmartSuggestion {
  id: string
  /** Title in German. */
  titleDe: string
  /** Title in English. */
  titleEn: string
  /** Body in German. */
  bodyDe: string
  /** Body in English. */
  bodyEn: string
  /** Optional intent filter — only show when project.intent matches. */
  intents?: string[]
  /** Optional bundesland filter — only show when project.bundesland matches. */
  bundeslaender?: string[]
  /** Optional regex run against the project corpus (facts + procedures). */
  scopeMatch?: RegExp
  verifyBeforePublicLaunch: true
}

export const SMART_SUGGESTIONS_ERLANGEN: SmartSuggestion[] = [
  {
    id: 'pv-pflicht',
    titleDe: 'Photovoltaikanlage einplanen',
    titleEn: 'Plan a photovoltaic system',
    bodyDe:
      'Bayern verlangt seit 2025 PV bei Wohnneubauten. Dies sollte früh in die Planung einfließen, da Statik und Elektrik abhängen.',
    bodyEn:
      'Bavaria has required PV on new residential builds since 2025. Plan it early — structural + electrical scope depends on it.',
    intents: ['neubau_einfamilienhaus', 'neubau_mehrfamilienhaus'],
    bundeslaender: ['Bayern'],
    verifyBeforePublicLaunch: true,
  },
  {
    id: 'bauherrenversicherung',
    titleDe: 'Versicherungsangebote vergleichen',
    titleEn: 'Compare insurance offers',
    bodyDe:
      'Bauherrenhaftpflicht und Bauleistungsversicherung sind in dieser Phase relevant. Beide vor Baubeginn abschließen.',
    bodyEn:
      'Builder liability and construction insurance are relevant at this stage. Bind both before any work starts.',
    verifyBeforePublicLaunch: true,
  },
  {
    id: 'kfw-foerderung',
    titleDe: 'Förderprogramme prüfen (KfW)',
    titleEn: 'Check funding programs (KfW)',
    bodyDe:
      'Bei energetischen Maßnahmen können KfW-Förderungen die Investition deutlich reduzieren. Antrag VOR Beauftragung der Leistung.',
    bodyEn:
      'Energy-related measures may qualify for KfW funding that significantly reduces investment. Apply BEFORE awarding the work.',
    scopeMatch: /sanierung|geg|energie|w(ä|ae)rmeschutz/i,
    verifyBeforePublicLaunch: true,
  },
  {
    id: 'denkmal-pruefen',
    titleDe: 'Denkmalrechtliche Erlaubnis prüfen',
    titleEn: 'Check heritage-law permits',
    bodyDe:
      'Falls das Bestandsgebäude oder die Umgebung unter Denkmalschutz steht, ist eine zusätzliche Erlaubnis nach BayDSchG erforderlich.',
    bodyEn:
      'If the existing building or its surroundings are listed, an additional permit under BayDSchG is required.',
    intents: ['sanierung', 'umnutzung', 'abbruch'],
    bundeslaender: ['Bayern'],
    verifyBeforePublicLaunch: true,
  },
  {
    id: 'baulasten',
    titleDe: 'Baulastenverzeichnis einsehen',
    titleEn: 'Inspect the land charges register',
    bodyDe:
      'Das Baulastenverzeichnis kann öffentlich-rechtliche Verpflichtungen offenlegen, die Sie als neue:r Eigentümer:in übernehmen.',
    bodyEn:
      'The Baulastenverzeichnis can reveal public-law obligations that transfer with ownership. Inspect before purchase.',
    bundeslaender: ['Bayern'],
    verifyBeforePublicLaunch: true,
  },
  {
    id: 'stellplatzsatzung',
    titleDe: 'Kommunale Stellplatzsatzung prüfen',
    titleEn: 'Check the municipal parking ordinance',
    bodyDe:
      'Die Mindestzahl notwendiger Stellplätze richtet sich nach der örtlichen Stellplatzsatzung — diese kann strenger sein als BayBO Art. 47.',
    bodyEn:
      'Minimum parking space count follows the local Stellplatzsatzung — often stricter than BayBO Art. 47.',
    bundeslaender: ['Bayern'],
    verifyBeforePublicLaunch: true,
  },
  {
    id: 'energieausweis',
    titleDe: 'Energieausweis frühzeitig planen',
    titleEn: 'Plan the energy certificate early',
    bodyDe:
      'Der Energieausweis nach GEG 2024 ist Bestandteil des Bauantrags. Energieberater:in einbinden, bevor LP 4 abgeschlossen wird.',
    bodyEn:
      'The energy certificate under GEG 2024 is part of the permit application. Engage the energy consultant before completing LP 4.',
    intents: ['neubau_einfamilienhaus', 'neubau_mehrfamilienhaus', 'sanierung'],
    verifyBeforePublicLaunch: true,
  },
  {
    id: 'nachbarschaft',
    titleDe: 'Nachbarschaft frühzeitig informieren',
    titleEn: 'Inform neighbours early',
    bodyDe:
      'Eine kurze Information an die direkten Nachbarn vor Antragstellung reduziert Widerspruchsrisiken nach BayBO Art. 66.',
    bodyEn:
      'Briefing direct neighbours before application reduces objection risk under BayBO Art. 66.',
    bundeslaender: ['Bayern'],
    verifyBeforePublicLaunch: true,
  },
]
