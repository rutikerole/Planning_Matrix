/**
 * Phase 8.1 (A.8) — plain-language interpretations of the statutes
 * the Result Workspace's Legal Landscape tab renders. Maps the
 * citation label (as emitted by composeLegalDomains) to a 1-2 sentence
 * "what this means for your project" snippet in DE + EN, plus an
 * external public-source URL.
 *
 * Interpretation is NOT the statute text (copyright + length); it's
 * the practitioner gloss that a Bauherr can act on. External link
 * opens the formal text on gesetze-bayern.de or gesetze-im-internet.de.
 *
 * verifyBeforePublicLaunch — same caveat as the rest of the workspace's
 * interpretive content. These are educational, not legal advice.
 */

export interface LegalRuleSnippet {
  /** Match the citation label that composeLegalDomains emits, e.g. "§ 34 BauGB". */
  label: string
  interpretationDe: string
  interpretationEn: string
  externalUrl: string
  verifyBeforePublicLaunch: true
}

export const LEGAL_RULE_SNIPPETS: LegalRuleSnippet[] = [
  // ── BauGB ──────────────────────────────────────────────────────────
  {
    label: '§ 30 BauGB',
    interpretationDe:
      'Qualifizierter Bebauungsplan: gilt, wenn das Grundstück in einem rechtskräftigen B-Plan liegt. Das Vorhaben muss dessen Festsetzungen einhalten — Art und Maß der Nutzung, überbaubare Fläche, Verkehrsflächen.',
    interpretationEn:
      "Qualified development plan: applies when your plot lies in a binding Bebauungsplan. The project must conform to its provisions — type and degree of use, buildable area, traffic surfaces.",
    externalUrl: 'https://www.gesetze-im-internet.de/bbaug/__30.html',
    verifyBeforePublicLaunch: true,
  },
  {
    label: '§ 34 BauGB',
    interpretationDe:
      'Unbeplanter Innenbereich: gilt, wenn kein B-Plan existiert, das Grundstück aber in einem im Zusammenhang bebauten Ortsteil liegt. Das Vorhaben muss sich nach Art, Maß, Bauweise und überbauter Grundstücksfläche in die Eigenart der Umgebung einfügen.',
    interpretationEn:
      'Unplanned inner area: applies when no Bebauungsplan exists but the plot is in a contiguously built-up part of town. The project must fit into the character of its surroundings in type, scale, construction method, and footprint.',
    externalUrl: 'https://www.gesetze-im-internet.de/bbaug/__34.html',
    verifyBeforePublicLaunch: true,
  },
  {
    label: '§ 35 BauGB',
    interpretationDe:
      'Außenbereich: alles außerhalb von B-Plan und Innenbereich. Bauen ist hier nur in privilegierten Ausnahmen zulässig (Land- und Forstwirtschaft, ortsgebundene Vorhaben). Wohnneubau ist regelmäßig unzulässig.',
    interpretationEn:
      'Outer area: everything outside a Bebauungsplan and unplanned inner area. Building here is only allowed in privileged exceptions (agriculture, forestry, location-bound projects). New residential construction is generally not permitted.',
    externalUrl: 'https://www.gesetze-im-internet.de/bbaug/__35.html',
    verifyBeforePublicLaunch: true,
  },
  {
    label: 'BauNVO',
    interpretationDe:
      'Baunutzungsverordnung: präzisiert die im B-Plan zulässigen Nutzungsarten (WA · WS · MK …) sowie das Maß der baulichen Nutzung (GRZ, GFZ, Geschosszahl, Höhen).',
    interpretationEn:
      'Land Use Ordinance (BauNVO): refines the use types permitted by a Bebauungsplan (WA · WS · MK …) plus the degree of construction (GRZ, GFZ, storey count, heights).',
    externalUrl: 'https://www.gesetze-im-internet.de/baunvo/',
    verifyBeforePublicLaunch: true,
  },
  // ── BayBO ──────────────────────────────────────────────────────────
  {
    label: 'BayBO Art. 2',
    interpretationDe:
      'Definiert die Gebäudeklassen 1–5 nach Höhe und Nutzungseinheiten. Die Klasse bestimmt Brandschutzanforderungen, Standsicherheitsnachweise und Verfahrensart.',
    interpretationEn:
      'Defines building classes 1–5 by height and dwelling units. The class drives fire-protection requirements, structural certification, and procedure type.',
    externalUrl: 'https://www.gesetze-bayern.de/Content/Document/BayBO-2',
    verifyBeforePublicLaunch: true,
  },
  {
    label: 'BayBO Art. 6',
    interpretationDe:
      'Abstandsflächen: regelt den Mindestabstand zu Nachbargrundstücken. Faustregel 0,4 H mit Mindestmaß 3 m; Sonderregeln bei Anbau, Wand-an-Wand und Bestand.',
    interpretationEn:
      'Setbacks: minimum distances to neighbouring plots. Rule of thumb 0.4 × building height, with a 3 m minimum; special rules for attached buildings, wall-to-wall, and existing structures.',
    externalUrl: 'https://www.gesetze-bayern.de/Content/Document/BayBO-6',
    verifyBeforePublicLaunch: true,
  },
  {
    label: 'BayBO Art. 47',
    interpretationDe:
      'Stellplätze: legt die Pflicht zur Bereitstellung notwendiger Stellplätze fest. In München ersetzt seit Oktober 2025 die Stellplatzsatzung (StPlS 926) die GBS — 1 Stellplatz je Wohneinheit, ÖPNV-bedingte Reduktionen möglich.',
    interpretationEn:
      'Parking: requires provision of necessary parking spaces. In Munich since October 2025 the local Stellplatzsatzung (StPlS 926) replaces the GBS — 1 space per dwelling, public-transit-based reductions possible.',
    externalUrl: 'https://www.gesetze-bayern.de/Content/Document/BayBO-47',
    verifyBeforePublicLaunch: true,
  },
  {
    label: 'BayBO Art. 57',
    interpretationDe:
      'Genehmigungsfreistellung: wenn ein qualifizierter B-Plan vorliegt und das Vorhaben dessen Festsetzungen einhält, entfällt die Baugenehmigung. Anzeige genügt; das Bauamt kann widersprechen.',
    interpretationEn:
      'Permit exemption: when a qualified Bebauungsplan exists and the project complies with it, no permit is required. A notification suffices; the Bauamt may object.',
    externalUrl: 'https://www.gesetze-bayern.de/Content/Document/BayBO-57',
    verifyBeforePublicLaunch: true,
  },
  {
    label: 'BayBO Art. 58',
    interpretationDe:
      'Vereinfachtes Baugenehmigungsverfahren: Standardpfad für Wohnvorhaben in den Gebäudeklassen 1–3. Bauamt prüft nur Übereinstimmung mit B-Plan / § 34 sowie örtliche Bauvorschriften — Bauvorlageberechtigte:r haftet für die Materie.',
    interpretationEn:
      'Simplified building permit: the standard path for residential projects in building classes 1–3. The Bauamt only checks compliance with the Bebauungsplan / § 34 and local building rules — the licensed planner is liable for substance.',
    externalUrl: 'https://www.gesetze-bayern.de/Content/Document/BayBO-58',
    verifyBeforePublicLaunch: true,
  },
  {
    label: 'BayBO Art. 60',
    interpretationDe:
      'Baugenehmigungsverfahren: Vollprüfung durch das Bauamt. Pflicht bei Sonderbauten und in Sonderregelfällen — etwa bei mehr als nur Wohnnutzung oder bei besonderen Brandschutzanforderungen.',
    interpretationEn:
      'Full building permit procedure: full review by the Bauamt. Required for Sonderbauten and special cases — e.g. mixed-use beyond residential, or specific fire-protection requirements.',
    externalUrl: 'https://www.gesetze-bayern.de/Content/Document/BayBO-60',
    verifyBeforePublicLaunch: true,
  },
  {
    label: 'BayBO Art. 61',
    interpretationDe:
      'Bauvorlageberechtigung: nur Architekt:innen und Bauingenieur:innen mit Eintrag in die Liste der Bauvorlageberechtigten dürfen Bauanträge einreichen. Pflicht für jedes genehmigungspflichtige Vorhaben.',
    interpretationEn:
      'Submission entitlement: only architects and civil engineers listed as bauvorlageberechtigt may file permit applications. Required for every permit-bound project.',
    externalUrl: 'https://www.gesetze-bayern.de/Content/Document/BayBO-61',
    verifyBeforePublicLaunch: true,
  },
  // ── GEG ────────────────────────────────────────────────────────────
  {
    label: 'GEG 2024',
    interpretationDe:
      'Gebäudeenergiegesetz 2024: schreibt für Neubauten und wesentliche Sanierungen einen Wärmeschutz- und Energieausweis vor. Bestandteil des Bauantrags; Energieberater:in muss vor LP 4 eingebunden sein.',
    interpretationEn:
      'Building Energy Act (GEG) 2024: mandates a thermal-protection and energy certificate for new builds and major renovations. Part of the permit application; an energy consultant must be engaged before LP 4.',
    externalUrl: 'https://www.gesetze-im-internet.de/geg/',
    verifyBeforePublicLaunch: true,
  },
  {
    label: 'Brandschutz',
    interpretationDe:
      'Gebäudeklassen-abhängige Brandschutzanforderungen aus der BayBO und BayTBest. Ab GK 4 in der Regel Brandschutznachweis durch:r staatlich anerkannte:n Sachverständige:n.',
    interpretationEn:
      "Building-class-dependent fire-protection requirements from BayBO and BayTBest. From GK 4 typically requires a fire-protection certificate from a state-accredited expert.",
    externalUrl: 'https://www.gesetze-bayern.de/Content/Document/BayBO',
    verifyBeforePublicLaunch: true,
  },
  // ── München-specific ───────────────────────────────────────────────
  {
    label: 'Stellplatzsatzung',
    interpretationDe:
      'Münchner Stellplatzsatzung (StPlS 926, novelliert 10/2025): 1 Stellplatz je Wohneinheit; ÖPNV-bedingte Reduktion auf 0,5 möglich. Hinweis: § 3 GBS ist seit 1.10.2025 ausgesetzt.',
    interpretationEn:
      'Munich parking ordinance (StPlS 926, amended 10/2025): 1 space per dwelling; public-transit reduction down to 0.5 possible. Note: § 3 GBS has been suspended since 1 Oct 2025.',
    externalUrl: 'https://www.muenchen.de/rathaus/Stadtrecht/Vorschrift/926.html',
    verifyBeforePublicLaunch: true,
  },
  {
    label: 'Denkmalschutz',
    interpretationDe:
      'Bayerisches Denkmalschutzgesetz: Baudenkmäler und Ensembles benötigen eine zusätzliche Erlaubnis nach BayDSchG, parallel zur Baugenehmigung. Frühzeitig beim Landesamt anfragen.',
    interpretationEn:
      'Bayerisches Denkmalschutzgesetz: heritage-protected buildings and ensembles require an additional BayDSchG permit alongside the building permit. Inquire with the Landesamt early.',
    externalUrl: 'https://www.gesetze-bayern.de/Content/Document/BayDSchG',
    verifyBeforePublicLaunch: true,
  },
  {
    label: 'Baulasten',
    interpretationDe:
      'Baulastenverzeichnis: öffentlich-rechtliche Verpflichtungen, die mit dem Grundstück übergehen — Wegerechte, Abstandsflächen-Übernahmen, Stellplatznachweise. Vor Kauf einsehen.',
    interpretationEn:
      'Baulastenverzeichnis (land-charges register): public-law obligations that transfer with the plot — rights of way, setback transfers, parking allocations. Inspect before purchase.',
    externalUrl: 'https://www.muenchen.de/dienstleistungsfinder/muenchen/1063572/',
    verifyBeforePublicLaunch: true,
  },
]

const BY_LABEL = new Map(LEGAL_RULE_SNIPPETS.map((s) => [s.label, s]))

export function findRuleSnippet(label: string): LegalRuleSnippet | undefined {
  return BY_LABEL.get(label)
}
