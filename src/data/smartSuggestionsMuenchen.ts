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

/**
 * Phase 8.5 (D.1) — evidence-fact filter. A template "passes" the
 * evidence check when, for every entry in its evidenceFacts list,
 * the project state contains a fact with the matching key (and, if
 * `expectedValue` is given, that exact value). Each evidence-fact
 * hit also bumps the matcher's relevance score so cards with
 * project-specific signals jump the queue.
 */
export interface EvidenceFactRequirement {
  key: string
  /** When set, the fact's value must equal this. When omitted, mere
   *  presence of the key in state.facts is enough. */
  expectedValue?: unknown
}

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
  /**
   * Phase 10 commit 11 — applicableTemplates filter. When set, the
   * suggestion fires only for projects whose templateId is in this
   * list. Decoupled from `intents` because intents are wizard slugs;
   * templateIds are post-routing identifiers (Phase 10 explicitly
   * makes the project-shape semantic the authoritative filter).
   *
   * Suppression matrix (cross-references brief §1):
   *   - T-03 (Sanierung) loses Stellplatz, PV-Neubau, Baumschutz,
   *     Lageplan, Gebäudeklasse-Diskussion (GK bleibt, BayBO Art.
   *     46 Abs. 6 indirekt)
   *   - T-06 (Aufstockung) loses ALL Stellplatz-related suggestions
   *     (BayBO Art. 81 Abs. 1 Nr. 4 b Privileg seit 01.10.2025) +
   *     PV-Neubau (Art. 44a gilt nur Wohn-NEUBAU)
   *   - T-08 (Sonstiges) starts empty — restraint until sub-category
   *     elicited
   */
  applicableTemplates?: import('@/types/projectState').TemplateId[]
  /** Optional regex run against the project corpus (facts + procedures). */
  scopeMatch?: RegExp
  /**
   * Phase 8.5 (D.1) — evidence-fact filter. ALL entries must match
   * for the template to fire (in addition to intent / bundesland /
   * scope filters). Each match also adds +2.0 to the relevance score
   * in the matcher.
   */
  evidenceFacts?: EvidenceFactRequirement[]
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
    applicableTemplates: ['T-01', 'T-02'],
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
    bundeslaender: ['bayern'],
    relevanceWeight: 1.5,
    verifyBeforePublicLaunch: true,
  },
  {
    id: 'bauherrenversicherung',
    applicableTemplates: ['T-01', 'T-02', 'T-06', 'T-07'],
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
    applicableTemplates: ['T-01', 'T-02', 'T-03', 'T-06'],
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
    applicableTemplates: ['T-03', 'T-04', 'T-05'],
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
    bundeslaender: ['bayern'],
    relevanceWeight: 1.3,
    verifyBeforePublicLaunch: true,
  },
  {
    id: 'baulasten',
    applicableTemplates: ['T-01', 'T-02', 'T-06', 'T-07'],
    category: 'risk',
    titleDe: 'Baulastenverzeichnis einsehen',
    titleEn: 'Inspect the land charges register',
    bodyDe:
      'Das Baulastenverzeichnis kann öffentlich-rechtliche Verpflichtungen offenlegen, die Sie als neue:r Eigentümer:in übernehmen.',
    bodyEn:
      'The Baulastenverzeichnis can reveal public-law obligations that transfer with ownership. Inspect before purchase.',
    reasoningDe: 'Verborgene Wegerechte oder Stellplatznachweise können das Vorhaben kippen.',
    reasoningEn: 'Hidden rights of way or parking allocations can derail the project.',
    bundeslaender: ['bayern'],
    verifyBeforePublicLaunch: true,
  },
  {
    id: 'stellplatzsatzung-muenchen',
    applicableTemplates: ['T-01', 'T-02'],
    category: 'regulation',
    titleDe: 'Münchner Stellplatzsatzung StPlS 926 prüfen',
    titleEn: "Check Munich's StPlS 926 parking ordinance",
    bodyDe:
      'Die im Oktober 2025 novellierte Münchner Stellplatzsatzung (StPlS 926) schreibt 1 Stellplatz je Wohneinheit vor und erlaubt ÖPNV-bedingte Reduktionen. Hinweis: § 3 GBS ist seit dem 1. Oktober 2025 in München ausgesetzt — StPlS 926 ist die geltende Quelle.',
    bodyEn:
      "Munich's StPlS 926 (amended October 2025) sets 1 parking space per dwelling and allows public-transit reductions. Note: § 3 GBS has been suspended in Munich since 1 October 2025 — StPlS 926 is the governing source.",
    reasoningDe: 'StPlS 926 löst seit 10/2025 die GBS in München ab — Quelle aktualisieren.',
    reasoningEn: 'StPlS 926 has replaced GBS in Munich since 10/2025 — update your source.',
    bundeslaender: ['bayern'],
    verifyBeforePublicLaunch: true,
  },
  {
    id: 'baumschutz-muenchen',
    applicableTemplates: ['T-01', 'T-02', 'T-05', 'T-07'],
    category: 'regulation',
    titleDe: 'Münchner Baumschutzverordnung 901 beachten',
    titleEn: "Check Munich's tree-protection ordinance (901)",
    bodyDe:
      'Seit Dezember 2025 schützt die Münchner Baumschutzverordnung (Satzung 901) alle Bäume mit einem Stammumfang ab 60 cm in 100 cm Höhe. Vor Baubeginn ist eine Baumkartierung sinnvoll, um Fäll- oder Schutzauflagen frühzeitig zu erkennen.',
    bodyEn:
      "Since December 2025, Munich's tree-protection ordinance (901) covers all trees with a trunk circumference of 60 cm or more (measured at 100 cm height). A tree survey before site work helps surface felling permits or protective requirements early.",
    reasoningDe: 'Baumkartierung früh erspart spätere Auflagen oder Verzögerungen.',
    reasoningEn: 'A tree survey early avoids later restrictions or delays.',
    bundeslaender: ['bayern'],
    verifyBeforePublicLaunch: true,
  },
  {
    id: 'energieausweis',
    applicableTemplates: ['T-01', 'T-02', 'T-03', 'T-06'],
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
    applicableTemplates: ['T-01', 'T-02', 'T-04', 'T-06', 'T-07'],
    category: 'risk',
    titleDe: 'Nachbarschaft frühzeitig informieren',
    titleEn: 'Inform neighbours early',
    bodyDe:
      'Eine kurze Information an die direkten Nachbarn vor Antragstellung reduziert Widerspruchsrisiken nach BayBO Art. 66.',
    bodyEn:
      'Briefing direct neighbours before application reduces objection risk under BayBO Art. 66.',
    reasoningDe: 'BayBO Art. 66 gibt Nachbarn ein Widerspruchsrecht — Vorabinformation entschärft.',
    reasoningEn: 'BayBO Art. 66 grants neighbours an objection right — early notice defuses it.',
    bundeslaender: ['bayern'],
    verifyBeforePublicLaunch: true,
  },

  // ── Phase 8.5 (D.1) — project-specific München templates ──────────────
  {
    id: 'baumgutachten',
    applicableTemplates: ['T-01', 'T-02', 'T-05', 'T-07'],
    category: 'regulation',
    titleDe: 'Baumkartierung vor Einreichung beauftragen',
    titleEn: 'Commission a tree survey before submission',
    bodyDe:
      'Eine Baumkartierung dokumentiert den Schutzradius jedes erfassten Baums (Stammumfang ≥ 60 cm) und beugt Streit in der Bauphase vor. Wer früh kartiert, kann Schutzauflagen in den Lageplan einarbeiten statt später nachzubessern.',
    bodyEn:
      'A tree survey documents the protection radius of each covered tree (trunk circumference ≥ 60 cm) and prevents disputes during the construction phase. Surveying early lets you bake protective requirements into the site plan rather than retrofitting later.',
    reasoningDe:
      'Baumschutzverordnung 901 gilt seit 12/2025 für jeden Baum mit ≥ 60 cm Umfang — Kartierung sollte vor LP 4 fertig sein.',
    reasoningEn:
      "Munich's Baumschutzverordnung 901 (effective Dec 2025) covers every tree with ≥ 60 cm circumference — survey should complete before LP 4.",
    bundeslaender: ['bayern'],
    evidenceFacts: [{ key: 'baumschutz_betroffen' }],
    relevanceWeight: 1.4,
    verifyBeforePublicLaunch: true,
  },
  {
    id: 'ensemble-blfd',
    applicableTemplates: ['T-01', 'T-02', 'T-03', 'T-04', 'T-05', 'T-06', 'T-07'],
    category: 'regulation',
    titleDe: 'BLfD-Anfrage zum Ensemble-Schutz absetzen',
    titleEn: 'File a BLfD enquiry on ensemble protection',
    bodyDe:
      'In Schwabing, Maxvorstadt und Lehel gelten Ensemble-Schutz-Eintragungen, die zusätzlich zur Baugenehmigung eine BayDSchG-Erlaubnis erfordern. Die BLfD-Antwort dauert typisch 4–6 Wochen — vor LP 3 abschicken, sonst schiebt sich der Zeitplan.',
    bodyEn:
      "Schwabing, Maxvorstadt and Lehel carry ensemble-protection entries that require an additional BayDSchG permit alongside the building permit. The BLfD's response typically takes 4–6 weeks — file before LP 3 to avoid timeline slippage.",
    reasoningDe:
      'Ensemble-Status entscheidet über Pflichtdokumente und Verfahrensart — späte Klärung verzögert das gesamte Verfahren.',
    reasoningEn:
      'Ensemble status determines required documents and procedure type — late clarification delays the whole process.',
    bundeslaender: ['bayern'],
    evidenceFacts: [
      { key: 'ensemble_schwabing_geprueft', expectedValue: false },
    ],
    relevanceWeight: 1.6,
    verifyBeforePublicLaunch: true,
  },
  {
    id: 'pv-konzept-baybo44a',
    applicableTemplates: ['T-01', 'T-02'],
    category: 'energy',
    titleDe: 'PV-Konzept nach Art. 44a BayBO dokumentieren',
    titleEn: 'Document the PV concept per BayBO Art. 44a',
    bodyDe:
      'Bayerns PV-Pflicht (Art. 44a BayBO) verlangt im Bauantrag ein dokumentiertes PV-Konzept — typischerweise 1 kWp je 35–50 m² Dachfläche. Das Konzept muss Anlagenleistung, Montage, Anschluss und Eigenverbrauchsstrategie umreißen.',
    bodyEn:
      'Bavaria PV requirement (Art. 44a BayBO) requires a documented PV concept in the application — typically 1 kWp per 35–50 m² of roof area. The concept must outline capacity, mounting, grid connection, and self-consumption strategy.',
    reasoningDe:
      'PV-Konzept ist Pflichtbestandteil — fehlt es, gilt der Antrag als unvollständig.',
    reasoningEn:
      "PV concept is a required component — missing it makes the application incomplete.",
    intents: ['neubau_einfamilienhaus', 'neubau_mehrfamilienhaus'],
    bundeslaender: ['bayern'],
    relevanceWeight: 1.3,
    verifyBeforePublicLaunch: true,
  },
  {
    id: 'lageplan-amtlich',
    applicableTemplates: ['T-01', 'T-02', 'T-06', 'T-07'],
    category: 'tooling',
    titleDe: 'Amtlichen Lageplan (M = 1:500) beauftragen',
    titleEn: 'Commission an official site plan (M = 1:500)',
    bodyDe:
      'Bauanträge in München erfordern einen amtlichen Lageplan im Maßstab 1:500. Vermesser:in in LP 3 binden, sonst staut sich die Antragstellung. Liegt ein älterer Plan vor: vom Vermesser auf Aktualität prüfen lassen.',
    bodyEn:
      'Munich permit applications require an official site plan at scale 1:500. Engage the surveyor in LP 3 — otherwise the application backs up. If an older plan exists, have the surveyor verify currency.',
    reasoningDe:
      'Ohne aktuellen Lageplan keine vollständige Antragstellung — typische Verzögerungsursache.',
    reasoningEn:
      'No current site plan = incomplete application — classic source of delay.',
    bundeslaender: ['bayern'],
    intents: [
      'neubau_einfamilienhaus',
      'neubau_mehrfamilienhaus',
      'aufstockung',
      'anbau',
    ],
    verifyBeforePublicLaunch: true,
  },
  {
    id: 'abbruch-anzeige',
    applicableTemplates: ['T-01', 'T-02', 'T-04', 'T-05'],
    category: 'regulation',
    titleDe: 'Abbruchanzeige nach BayBO Art. 57 vorbereiten',
    titleEn: 'Prepare a demolition notification per BayBO Art. 57',
    bodyDe:
      'Wird ein Bestand abgerissen oder rückgebaut, ist eine separate Abbruchanzeige bei der Unteren Bauaufsichtsbehörde erforderlich — typisch 4 Wochen vor Baufeldfreimachung. Entsorgungskonzept (KrWG) gehört dazu.',
    bodyEn:
      'When existing structures are demolished or removed, a separate demolition notification at the lower building authority is required — typically 4 weeks before site clearance. A waste-management concept (KrWG) accompanies it.',
    reasoningDe:
      'Abbruchanzeige ist verfahrensseitig vom Bauantrag getrennt — nicht vergessen einreichen.',
    reasoningEn:
      'Demolition notification is procedurally separate from the building permit — easy to forget.',
    intents: ['neubau_einfamilienhaus', 'neubau_mehrfamilienhaus', 'umnutzung'],
    bundeslaender: ['bayern'],
    evidenceFacts: [{ key: 'bestandsgebaeude_abbruch_geplant' }],
    relevanceWeight: 1.4,
    verifyBeforePublicLaunch: true,
  },
  {
    id: 'kfw-40-foerderung',
    applicableTemplates: ['T-01', 'T-02', 'T-03', 'T-06'],
    category: 'energy',
    titleDe: 'KfW-Effizienzhaus-40-Antrag VOR Auftragsvergabe',
    titleEn: 'File KfW Efficiency-House-40 application BEFORE contract award',
    bodyDe:
      'KfW-Effizienzhaus-40-Förderung muss zwingend VOR Auftragsvergabe an die Bauleistung beantragt werden. Spätantrag verfällt — klassischer Stichtag-Fehler in der LP-6-Phase.',
    bodyEn:
      'KfW Efficiency-House-40 funding must be applied for BEFORE awarding construction contracts. Late applications expire — classic LP 6 deadline pitfall.',
    reasoningDe:
      'Antragsfrist liegt vor Vergabe — Reihenfolge stimmen mit dem Energieberater ab.',
    reasoningEn:
      'Application deadline precedes contract award — coordinate the sequence with the energy consultant.',
    scopeMatch: /kfw\s*40|kfw-40|effizienzhaus|effizienz-haus/i,
    relevanceWeight: 1.3,
    verifyBeforePublicLaunch: true,
  },
  {
    id: 'bauherren-haftpflicht-bind',
    applicableTemplates: ['T-01', 'T-02', 'T-06', 'T-07'],
    category: 'insurance',
    titleDe: 'Bauherrenhaftpflicht VOR Baubeginn binden',
    titleEn: 'Bind builder liability insurance BEFORE site work',
    bodyDe:
      'Bauherrenhaftpflicht muss VOR jedem Baubeginn — auch vor Vermessung oder Probeschachtungen — abgeschlossen sein. Schäden vor Versicherungsbeginn bleiben am Bauherrn hängen.',
    bodyEn:
      "Builder liability insurance must be in force BEFORE any site work — even surveying or test excavations. Damages occurring before policy start fall on the owner.",
    reasoningDe:
      'Versicherungsbeginn vor Spatenstich verhindert Deckungslücken in der Anlaufphase.',
    reasoningEn:
      'Policy start before ground-breaking prevents coverage gaps during the kickoff phase.',
    bundeslaender: ['bayern'],
    relevanceWeight: 1.1,
    verifyBeforePublicLaunch: true,
  },
  {
    id: 'stellplatz-nachweis-doku',
    applicableTemplates: ['T-01', 'T-02'],
    category: 'regulation',
    titleDe: 'Stellplatznachweis schriftlich dem Antrag beilegen',
    titleEn: 'Append a written parking proof to the application',
    bodyDe:
      'Münchens StPlS 926 verlangt einen schriftlichen Stellplatznachweis als Antragsbestandteil. Auch wenn die geplante Anzahl die Mindestpflicht übersteigt, muss die Dokumentation eindeutig sein — sonst Rückfragen vom Bauamt.',
    bodyEn:
      "Munich's StPlS 926 requires a written parking proof as part of the application. Even when the planned count exceeds the minimum, documentation must be unambiguous — otherwise expect Bauamt follow-ups.",
    reasoningDe:
      'StPlS 926 ist seit 10/2025 in Kraft — Format des Nachweises ist neu, Bauamt prüft strikt.',
    reasoningEn:
      'StPlS 926 has been in force since 10/2025 — the proof format is new and the Bauamt reviews strictly.',
    bundeslaender: ['bayern'],
    evidenceFacts: [{ key: 'stellplatz_anzahl_geplant' }],
    relevanceWeight: 1.2,
    verifyBeforePublicLaunch: true,
  },
]
