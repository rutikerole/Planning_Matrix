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
  // v1.0.29 Bug 68 — T-02 MFH deterministic baseline. The Hamburg walk
  // surfaced only generic energy/KfW/insurance cards because no MFH-specific
  // suggestion existed. These are state-neutral (no Bayern, no fabricated
  // chamber URL, no fabricated KfW) and rank high for neubau via intent +
  // template + scope.
  {
    id: 'bauvoranfrage-neubau',
    applicableTemplates: ['T-01', 'T-02'],
    category: 'regulation',
    titleDe: 'Bauvoranfrage beim Bauamt stellen',
    titleEn: 'File a Bauvoranfrage with the building authority',
    bodyDe:
      'Klären Sie vor dem Bauantrag die Zulässigkeit nach § 34 BauGB bzw. den B-Plan-Status sowie etwaige Erhaltungs- oder Gestaltungssatzungen verbindlich mit dem zuständigen Bauamt/Bezirksamt.',
    bodyEn:
      'Before the full permit application, clarify admissibility under § 34 BauGB or the Bebauungsplan status — plus any preservation or design ordinances — bindingly with the responsible building authority / district office.',
    reasoningDe: 'Eine Bauvoranfrage sichert die grundsätzliche Bebaubarkeit, bevor Planungskosten entstehen.',
    reasoningEn: 'A Bauvoranfrage secures basic buildability before planning costs are incurred.',
    intents: ['neubau_einfamilienhaus', 'neubau_mehrfamilienhaus'],
    scopeMatch: /§\s*34|bebauungsplan|innenbereich|unbekannt/i,
    relevanceWeight: 1.5,
    verifyBeforePublicLaunch: true,
  },
  {
    id: 'kernteam-mfh',
    applicableTemplates: ['T-02'],
    category: 'precedent',
    titleDe: 'Kernteam für das Mehrfamilienhaus beauftragen',
    titleEn: 'Commission the core team for the multi-family build',
    bodyDe:
      'Ein MFH der Gebäudeklasse 3+ braucht früh ein abgestimmtes Team: bauvorlageberechtigte:r Architekt:in, Tragwerksplanung, Brandschutz, GEG-Energieberatung und Schallschutz (DIN 4109). Architekt:innen-Auswahl über die Architektenkammer Ihres Bundeslandes, gefiltert nach Erfahrung in der passenden Gebäudeklasse.',
    bodyEn:
      "A GK 3+ multi-family build needs an aligned team early: a submission-authorized architect, structural, fire-protection, GEG energy, and sound-insulation (DIN 4109) planners. Shortlist architects via your federal state's chamber of architects, filtered by experience in the relevant building class.",
    reasoningDe: 'Die fünf Fachplanungen greifen ineinander — frühe Beauftragung vermeidet Nachläufe in LP 1–4.',
    reasoningEn: 'The five disciplines interlock — early commissioning avoids rework in LP 1–4.',
    intents: ['neubau_mehrfamilienhaus'],
    relevanceWeight: 1.6,
    verifyBeforePublicLaunch: true,
  },
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
      'Bauanträge in Bayern erfordern einen amtlichen Lageplan im Maßstab 1:500. Vermesser:in in LP 3 binden, sonst staut sich die Antragstellung. Liegt ein älterer Plan vor: vom Vermesser auf Aktualität prüfen lassen.',
    bodyEn:
      'Bavarian permit applications require an official site plan at scale 1:500. Engage the surveyor in LP 3 — otherwise the application backs up. If an older plan exists, have the surveyor verify currency.',
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
  // v1.0.30 Bug 94/95/103 — T-04 use-conversion deterministic baseline. The
  // Leipzig walk (retail → gastronomy) left the Suggestions tab, the PDF
  // Section 08 recommendations AND the PDF Executive Summary page empty:
  // state.recommendations is empty (persona Bug 63) and no T-04-relevant smart
  // suggestion fired. These four are state-neutral (NO Bayern token, NO
  // fabricated chamber/§/URL — only real federal references) and feed all three
  // surfaces via pickSmartSuggestions. `bauvoranfrage-umnutzung` is the always-on
  // floor (no scopeMatch) → guarantees the exec page renders and restores the
  // 12th page (Bug 103); the three Fachgutachten cards are scope-gated to the
  // use-change facts the persona records.
  {
    id: 'bauvoranfrage-umnutzung',
    applicableTemplates: ['T-04'],
    category: 'regulation',
    titleDe: 'Bauvoranfrage zur Gebietsverträglichkeit stellen',
    titleEn: 'File a Bauvoranfrage on use-type admissibility',
    bodyDe:
      'Eine Nutzungsänderung ist nur zulässig, wenn die neue Nutzung im Baugebiet (§§ 1–11 BauNVO bzw. § 34 BauGB) zulässig ist. Klären Sie die Gebietsverträglichkeit und etwaige Auflagen verbindlich mit dem zuständigen Bauamt, bevor Planungskosten entstehen.',
    bodyEn:
      'A use change is only admissible if the new use is permitted in the area (§§ 1–11 BauNVO or § 34 BauGB). Clarify the use-type admissibility and any conditions bindingly with the responsible building authority before planning costs are incurred.',
    reasoningDe:
      'Die Zulässigkeit der neuen Nutzung ist die Grundvoraussetzung jeder Umnutzung — vor allem anderen klären.',
    reasoningEn:
      'The admissibility of the new use is the precondition for any conversion — clarify it before anything else.',
    relevanceWeight: 1.5,
    verifyBeforePublicLaunch: true,
  },
  {
    id: 'schallschutz-umnutzung',
    applicableTemplates: ['T-04'],
    category: 'tooling',
    titleDe: 'Schallschutzgutachten beauftragen',
    titleEn: 'Commission a sound-insulation assessment',
    bodyDe:
      'Eine Nutzungsänderung Richtung Wohnen oder mit Lärmquellen verschärft die Schallschutzanforderungen (DIN 4109). Eine Bestandsaufnahme durch eine:n Schallschutzgutachter:in klärt, ob vorhandene Bauteile (z. B. eine Holzbalkendecke) ertüchtigt werden müssen.',
    bodyEn:
      'A use change toward residential — or one that introduces noise sources — raises the sound-insulation requirements (DIN 4109). A survey by a sound-insulation specialist clarifies whether existing elements (e.g. a timber-beam ceiling) need upgrading.',
    reasoningDe:
      'Schallschutz ist bei Use-Changes der häufigste Nachrüst-Kostentreiber — früh prüfen.',
    reasoningEn:
      'Sound insulation is the most common retrofit cost driver in use changes — check it early.',
    scopeMatch: /schallschutz|din\s*4109/i,
    relevanceWeight: 1.4,
    verifyBeforePublicLaunch: true,
  },
  {
    id: 'brandschutz-rettungsweg-umnutzung',
    applicableTemplates: ['T-04'],
    category: 'risk',
    titleDe: 'Brandschutzkonzept + Rettungswegplan erstellen lassen',
    titleEn: 'Have a fire-protection concept + escape-route plan prepared',
    bodyDe:
      'Eine geänderte Nutzung kann einen zweiten Rettungsweg und ein angepasstes Brandschutzkonzept auslösen. Lassen Sie früh durch eine:n Brandschutzplaner:in prüfen, ob der vorhandene Rettungsweg (z. B. über den Hinterhof) ausreicht oder baulich ergänzt werden muss.',
    bodyEn:
      'A changed use can trigger a second escape route and an adjusted fire-protection concept. Have a fire-protection planner check early whether the existing escape route (e.g. via the rear courtyard) is sufficient or needs structural completion.',
    reasoningDe:
      'Ein fehlender zweiter Rettungsweg ist ein häufiger Genehmigungs-Stopper bei Umnutzungen.',
    reasoningEn:
      'A missing second escape route is a common approval blocker in use conversions.',
    scopeMatch: /brandschutz|rettungsweg/i,
    relevanceWeight: 1.4,
    verifyBeforePublicLaunch: true,
  },
  {
    id: 'ta-laerm-umnutzung',
    applicableTemplates: ['T-04'],
    category: 'regulation',
    titleDe: 'TA-Lärm-Gutachten für die neue Nutzung einholen',
    titleEn: 'Obtain a TA-Lärm assessment for the new use',
    bodyDe:
      'Gastronomie und andere lärmintensive Nutzungen müssen die Immissionsrichtwerte der TA Lärm gegenüber der Nachbarschaft einhalten. Ein Außenlärm-Gutachten vor dem Bauantrag belegt die Verträglichkeit (Öffnungszeiten, Außenbereich, Technik).',
    bodyEn:
      'Gastronomy and other noise-intensive uses must meet the TA Lärm immission limits toward the neighbourhood. An external-noise assessment before the permit application demonstrates compatibility (opening hours, outdoor area, building services).',
    reasoningDe:
      'Bei Gastronomie ist der Nachweis nach TA Lärm regelmäßig Genehmigungsvoraussetzung.',
    reasoningEn:
      'For gastronomy, a TA Lärm demonstration is regularly a precondition for approval.',
    scopeMatch: /ta.?l(ä|ae)rm|gastronom|gaststätte|sitzpl|caf(é|e)/i,
    relevanceWeight: 1.4,
    verifyBeforePublicLaunch: true,
  },
  // v1.0.31 C6 — T-05 demolition floor (Bug 103 for abbruch). The nrw-t05
  // fixtures carry empty state.recommendations (persona Bug 63) and no demolition
  // suggestion fired, so the Executive page was skipped → the PDF rendered 11 pp
  // (TOC drift). Mirrors the T-04 floor: `schadstoffgutachten-abbruch` is the
  // always-on floor (no scopeMatch) that guarantees the exec page renders and
  // restores the 12th page; the other two are scope-gated to the demolition
  // facts. State-neutral — only federal GefStoffV / KrWG references, no Bayern
  // token, no fabricated chamber/§/URL.
  {
    id: 'schadstoffgutachten-abbruch',
    applicableTemplates: ['T-05'],
    category: 'risk',
    titleDe: 'Schadstoffgutachten vor dem Abbruch beauftragen',
    titleEn: 'Commission a hazardous-materials survey before demolition',
    bodyDe:
      'Vor jedem Abbruch ist eine Schadstofferkundung (Asbest, KMF, PCB, PAK) nach GefStoffV erforderlich. Das Gutachten bestimmt Rückbau- und Entsorgungsweg und ist die Grundlage für belastbare Festangebote.',
    bodyEn:
      'Every demolition requires a hazardous-materials survey (asbestos, mineral fibre, PCB, PAH) under the GefStoffV. The survey determines the dismantling and disposal route and is the basis for reliable fixed quotes.',
    reasoningDe:
      'Das Schadstoffgutachten ist der erste verbindliche Schritt jedes Abbruchs — ohne es ist keine seriöse Kostenschätzung möglich.',
    reasoningEn:
      'The hazardous-materials survey is the first binding step of any demolition — no serious cost estimate is possible without it.',
    relevanceWeight: 1.5,
    verifyBeforePublicLaunch: true,
  },
  {
    id: 'entsorgungsnachweis-abbruch',
    applicableTemplates: ['T-05'],
    category: 'regulation',
    titleDe: 'Entsorgungs- und Verwertungsnachweis (KrWG) vorbereiten',
    titleEn: 'Prepare the disposal and recovery records (KrWG)',
    bodyDe:
      'Abbruchabfälle sind nach Kreislaufwirtschaftsgesetz (KrWG) zu trennen, zu dokumentieren und zu verwerten bzw. zu entsorgen. Mengen und Nachweise früh mit dem Abbruchunternehmen klären.',
    bodyEn:
      'Demolition waste must be separated, documented and recovered or disposed of under the Circular Economy Act (KrWG). Clarify volumes and records early with the demolition contractor.',
    reasoningDe:
      'Entsorgungskosten sind nach den Schadstoffen der zweitgrößte Abbruch-Kostentreiber.',
    reasoningEn:
      'After hazardous materials, disposal is the second-largest demolition cost driver.',
    scopeMatch: /entsorgung|krwg|abfall|schadstoff|asbest/i,
    relevanceWeight: 1.4,
    verifyBeforePublicLaunch: true,
  },
  {
    id: 'standsicherheit-nachbar-abbruch',
    applicableTemplates: ['T-05'],
    category: 'risk',
    titleDe: 'Standsicherheit der Nachbarbebauung prüfen',
    titleEn: 'Check the structural stability of adjacent buildings',
    bodyDe:
      'Bei grenzständiger oder angebauter Bebauung ist die Standsicherheit der Nachbargebäude während und nach dem Abbruch nachzuweisen (z. B. Sicherung freigelegter Brandwände).',
    bodyEn:
      'For buildings at or sharing a boundary, the structural stability of neighbouring buildings during and after demolition must be demonstrated (e.g. securing exposed party walls).',
    reasoningDe:
      'Freigelegte Nachbar-Brandwände sind die häufigste Haftungsfalle beim Teilabbruch.',
    reasoningEn:
      'Exposed neighbouring party walls are the most common liability trap in partial demolition.',
    scopeMatch: /standsicherheit|nachbar|brandwand|grenz/i,
    relevanceWeight: 1.3,
    verifyBeforePublicLaunch: true,
  },
]
