/**
 * Phase 3.4 #56 — Bavarian building-permit fact bank.
 *
 * Cycled by the right-rail FactTicker during idle moments
 * (no thinking, no recent user input, no completion interstitial).
 *
 * Phase 5 — renamed from factsErlangen.ts as part of the
 * Erlangen → München pivot. The Erlangen-specific Geoportal fact
 * was retired and replaced with München-specific anchors
 * (StPlS 2025 Novellation, BaumschutzV 60 cm, GBS § 3 Suspension)
 * sourced from data/muenchen/. The remaining Bayern-level facts
 * carry over unchanged.
 *
 * VERIFY_BEFORE_PUBLIC_LAUNCH — every entry below carries the
 * `verifyBeforePublicLaunch: true` flag. These are educational
 * "Wussten Sie?" facts, not legal advice. Real legal review is a
 * Phase 4+ content task; the flag exists to make every fact greppable
 * before the product is shown to architects + Bauherren in a binding
 * context.
 */

export interface MuenchenFact {
  /** Permanent id so we can rotate stable per-session. */
  id: string
  de: string
  en: string
  /** Most-relevant § / Art. reference. */
  reference: string
  /** Educational — pending legal review per the comment above. */
  verifyBeforePublicLaunch: true
}

export const FACTS_MUENCHEN: MuenchenFact[] = [
  {
    id: 'pv-pflicht-2025',
    de: 'Bayern hat 2025 die PV-Pflicht für Wohnneubauten eingeführt.',
    en: 'Bavaria introduced the solar requirement for new residential builds in 2025.',
    reference: 'Bayerisches Klimaschutzgesetz',
    verifyBeforePublicLaunch: true,
  },
  {
    id: 'gk1-baybo',
    de: 'Die Gebäudeklasse 1 nach BayBO Art. 2 (3) gilt für freistehende Gebäude bis 7 m Höhe.',
    en: 'Building class 1 under BayBO Art. 2 (3) applies to detached buildings up to 7 m in height.',
    reference: 'BayBO Art. 2 (3)',
    verifyBeforePublicLaunch: true,
  },
  {
    id: 'art-58-vereinfachtes',
    de: 'Das vereinfachte Verfahren nach BayBO Art. 58 ist die häufigste Verfahrensart für Einfamilienhäuser.',
    en: 'The simplified procedure under BayBO Art. 58 is the most common path for single-family homes.',
    reference: 'BayBO Art. 58',
    verifyBeforePublicLaunch: true,
  },
  {
    id: 'art-57-genehmigungsfreistellung',
    de: 'Die Genehmigungsfreistellung nach BayBO Art. 57 entfällt, sobald tragende Bauteile geändert werden.',
    en: 'Permit exemption under BayBO Art. 57 lapses as soon as load-bearing components are modified.',
    reference: 'BayBO Art. 57',
    verifyBeforePublicLaunch: true,
  },
  {
    id: 'muenchen-geoportal',
    de: 'München veröffentlicht Bebauungspläne über das städtische Geoportal (geoportal.muenchen.de).',
    en: "Munich publishes Bebauungspläne via the city's geoportal (geoportal.muenchen.de).",
    reference: 'Stadt München Geoportal',
    verifyBeforePublicLaunch: true,
  },
  {
    id: 'geg-2024',
    de: 'Der GEG 2024 löste die EnEV ab und gilt für alle Neubauten und größere Sanierungen.',
    en: 'GEG 2024 replaced the EnEV and governs all new builds and major renovations.',
    reference: 'GEG 2024',
    verifyBeforePublicLaunch: true,
  },
  {
    id: 'sonderbau-art-60',
    de: 'Bei Sonderbauten nach BayBO Art. 2 (4) gilt immer das Baugenehmigungsverfahren nach Art. 60.',
    en: 'Special buildings under BayBO Art. 2 (4) always go through the full permit procedure under Art. 60.',
    reference: 'BayBO Art. 2 (4) + Art. 60',
    verifyBeforePublicLaunch: true,
  },
  {
    id: 'baugb-30',
    de: '§ 30 BauGB regelt das Bauen im qualifiziert beplanten Innenbereich — Bebauungsplan + Erschließung gegeben.',
    en: 'BauGB § 30 governs building in fully planned inner areas — Bebauungsplan + access required.',
    reference: 'BauGB § 30',
    verifyBeforePublicLaunch: true,
  },
  {
    id: 'baugb-34',
    de: '§ 34 BauGB regelt das Einfügen in den unbeplanten Innenbereich — Eigenart der näheren Umgebung zählt.',
    en: 'BauGB § 34 governs fitting into the unplanned inner area — character of the surroundings counts.',
    reference: 'BauGB § 34',
    verifyBeforePublicLaunch: true,
  },
  {
    id: 'baugb-35',
    de: '§ 35 BauGB regelt das Bauen im Außenbereich — privilegierte vs. sonstige Vorhaben.',
    en: 'BauGB § 35 governs building in the outer area — privileged vs. other projects.',
    reference: 'BauGB § 35',
    verifyBeforePublicLaunch: true,
  },
  {
    id: 'abstandsflaeche-baybo-6',
    de: 'BayBO Art. 6 verlangt mindestens 0,4 H Abstandsfläche zu Nachbargrenzen, in der Regel mindestens 3 m.',
    en: 'BayBO Art. 6 requires a setback of at least 0.4 H from neighbour boundaries, generally ≥ 3 m.',
    reference: 'BayBO Art. 6',
    verifyBeforePublicLaunch: true,
  },
  {
    id: 'stellplaetze-baybo-47',
    de: 'BayBO Art. 47 verlangt notwendige Stellplätze; die örtliche Stellplatzsatzung präzisiert die Anzahl.',
    en: 'BayBO Art. 47 requires necessary parking spaces; the local Stellplatzsatzung sets the count.',
    reference: 'BayBO Art. 47',
    verifyBeforePublicLaunch: true,
  },
  {
    id: 'denkmal-bayerndschg',
    de: 'Bei denkmalgeschützten Gebäuden ist eine zusätzliche Erlaubnis nach BayDSchG erforderlich.',
    en: 'Listed buildings require an additional permit under the Bavarian Heritage Act (BayDSchG).',
    reference: 'BayDSchG Art. 6',
    verifyBeforePublicLaunch: true,
  },
  {
    id: 'art-61-bauantrag',
    de: 'Der Bauantrag nach BayBO Art. 61 ist über die Gemeinde bei der Bauaufsichtsbehörde einzureichen.',
    en: 'The building permit application under BayBO Art. 61 is filed with the building authority via the municipality.',
    reference: 'BayBO Art. 61',
    verifyBeforePublicLaunch: true,
  },
  {
    id: 'frist-genehmigung',
    de: 'Im vereinfachten Verfahren entscheidet die Behörde grundsätzlich innerhalb von drei Monaten.',
    en: 'In the simplified procedure, the authority generally decides within three months.',
    reference: 'BayBO Art. 64',
    verifyBeforePublicLaunch: true,
  },
  {
    id: 'bauvorlageberechtigung',
    de: 'Bauvorlageberechtigt ist nur, wer nach BayBO Art. 61 Abs. 2 in der entsprechenden Liste eingetragen ist.',
    en: 'Only persons listed under BayBO Art. 61 (2) may submit building documents (bauvorlageberechtigt).',
    reference: 'BayBO Art. 61 Abs. 2',
    verifyBeforePublicLaunch: true,
  },
  {
    id: 'brandschutz-gk',
    de: 'Brandschutzanforderungen steigen mit der Gebäudeklasse — GK 1–3 und GK 4–5 unterscheiden sich deutlich.',
    en: 'Fire-protection requirements scale with building class — GK 1–3 and GK 4–5 differ significantly.',
    reference: 'BayBO Art. 24 ff.',
    verifyBeforePublicLaunch: true,
  },
  {
    id: 'tragwerk-nachweis',
    de: 'Der Standsicherheitsnachweis ist bei Sonderbauten und höheren Gebäudeklassen prüfpflichtig.',
    en: 'Structural certification is subject to mandatory review in special buildings and higher classes.',
    reference: 'BayBO Art. 62',
    verifyBeforePublicLaunch: true,
  },
  {
    id: 'energie-nachweis-geg',
    de: 'Der Wärmeschutznachweis nach GEG 2024 ist Bestandteil jedes Bauantrags für Neubauten.',
    en: 'The thermal-protection certificate under GEG 2024 is part of every building application for new builds.',
    reference: 'GEG § 8',
    verifyBeforePublicLaunch: true,
  },
  {
    id: 'flaechennutzung-fnp',
    de: 'Der Flächennutzungsplan (FNP) gibt die Grundzüge der Bodennutzung vor — er ist behördenverbindlich, nicht bürgerverbindlich.',
    en: 'The Flächennutzungsplan (FNP) sets the basic land-use framework — it binds authorities, not citizens directly.',
    reference: 'BauGB § 5',
    verifyBeforePublicLaunch: true,
  },
  {
    id: 'bebauungsplan-festsetzungen',
    de: 'Ein qualifizierter Bebauungsplan trifft Festsetzungen zu Art und Maß der baulichen Nutzung, Bauweise und Erschließung.',
    en: 'A qualified Bebauungsplan sets out the type and extent of use, building method, and access.',
    reference: 'BauGB § 30 Abs. 1',
    verifyBeforePublicLaunch: true,
  },
  {
    id: 'art-2-bauliche-anlage',
    de: 'Eine bauliche Anlage im Sinne der BayBO Art. 2 muss mit dem Erdboden verbunden sein und aus Bauprodukten bestehen.',
    en: 'A building within the meaning of BayBO Art. 2 must be connected to the ground and consist of building products.',
    reference: 'BayBO Art. 2 Abs. 1',
    verifyBeforePublicLaunch: true,
  },
  {
    id: 'nachbarbeteiligung',
    de: 'Die Nachbarbeteiligung im Baugenehmigungsverfahren erfolgt über die Vorlage des Bauantrags durch die Gemeinde.',
    en: 'Neighbour involvement in the permit procedure is handled via the municipality forwarding the application.',
    reference: 'BayBO Art. 66',
    verifyBeforePublicLaunch: true,
  },
  {
    id: 'sanierung-anzeigepflicht',
    de: 'Energetische Sanierungen sind oft anzeigepflichtig statt genehmigungspflichtig — die Schwelle liegt bei tragenden Eingriffen.',
    en: 'Energy refurbishments are often notifiable rather than permit-bound — the threshold lies at structural changes.',
    reference: 'BayBO Art. 57 Abs. 1',
    verifyBeforePublicLaunch: true,
  },
  {
    id: 'umnutzung-baurecht',
    de: 'Eine Nutzungsänderung ist baurechtlich relevant, wenn sich die Anforderungen an das Gebäude wesentlich ändern.',
    en: 'A change of use is relevant when the building requirements substantively change as a result.',
    reference: 'BayBO Art. 57 Abs. 4',
    verifyBeforePublicLaunch: true,
  },
  {
    id: 'abbruch-anzeige',
    de: 'Der Abbruch ist nach BayBO Art. 57 Abs. 5 grundsätzlich anzeigepflichtig.',
    en: 'Demolition is generally notifiable under BayBO Art. 57 (5).',
    reference: 'BayBO Art. 57 Abs. 5',
    verifyBeforePublicLaunch: true,
  },
  {
    id: 'erschliessung-baugb',
    de: 'Die gesicherte Erschließung ist Voraussetzung jeder Baugenehmigung im Innenbereich.',
    en: 'Secured access is a precondition for any permit in the inner area.',
    reference: 'BauGB § 30 + § 34',
    verifyBeforePublicLaunch: true,
  },
  {
    id: 'art-83-rechtsmittel',
    de: 'Gegen eine Baugenehmigung kann der Nachbar binnen eines Monats Widerspruch oder Klage erheben.',
    en: 'Neighbours may appeal a building permit within one month.',
    reference: 'BayBO Art. 83',
    verifyBeforePublicLaunch: true,
  },
  {
    id: 'munich-stellplatz-2025',
    de: 'Die Münchner Stellplatzsatzung (StPlS 926) wurde im Oktober 2025 novelliert; sie schreibt 1 Stellplatz je Wohneinheit vor und erlaubt ÖPNV-Reduktionen.',
    en: "Munich's parking ordinance (StPlS 926) was amended in October 2025; it sets 1 space per dwelling unit and allows public-transit reductions.",
    reference: 'StPlS 926 (Oct 2025)',
    verifyBeforePublicLaunch: true,
  },
  {
    id: 'munich-baumschutz-60cm',
    de: 'Die Münchner Baumschutzverordnung (Satzung 901) schützt seit Dezember 2025 alle Bäume ab 60 cm Stammumfang in 100 cm Höhe.',
    en: "Munich's tree-protection ordinance (901) protects all trees with a trunk circumference of 60 cm or more (measured at 100 cm height) since December 2025.",
    reference: 'BaumschutzV 901 (Dez 2025)',
    verifyBeforePublicLaunch: true,
  },
  {
    id: 'munich-gbs-3-suspension',
    de: 'In München ist § 3 GBS (Garagen- und Stellplatzverordnung) seit dem 1. Oktober 2025 ausgesetzt — die Stellplatzsatzung StPlS 926 ist die geltende Quelle.',
    en: "In Munich, § 3 GBS (garage/parking regulation) has been suspended since 1 October 2025 — StPlS 926 is the governing source.",
    reference: 'GBS § 3 (suspended 2025-10-01)',
    verifyBeforePublicLaunch: true,
  },
  {
    id: 'munich-bauamt-3offices',
    de: 'Die Münchner Lokalbaukommission ist in drei Bauämter (Mitte, Ost, West) gegliedert; das zuständige Amt ergibt sich aus dem Stadtbezirk.',
    en: "Munich's Lokalbaukommission is split into three sub-offices (Mitte, Ost, West); jurisdiction is determined by Stadtbezirk.",
    reference: 'LBK München',
    verifyBeforePublicLaunch: true,
  },
  {
    id: 'naturschutz-eingriff',
    de: 'Ein Eingriff in Natur und Landschaft kann eine Ausgleichsleistung nach Naturschutzrecht auslösen.',
    en: 'Interventions in nature and landscape may trigger compensatory measures under nature-protection law.',
    reference: 'BNatSchG § 14',
    verifyBeforePublicLaunch: true,
  },
]
