import type { ProjectState } from '@/types/projectState'

export type LegalRelevance = 'HIGH' | 'PARTIAL' | 'NONE'

export interface LegalDomainRow {
  /** Citation pill text, e.g. `§ 34 BauGB`. */
  label: string
  /** Hatched-bar fill level. */
  relevance: LegalRelevance
  /** Right-side status text. */
  status: string
}

export interface LegalDomain {
  key: 'A' | 'B' | 'C'
  /** Localised title. */
  title: string
  relevance: LegalRelevance
  rows: LegalDomainRow[]
}

/**
 * Phase 8 — extract of the heuristic legal-domain composer that used
 * to live inside `LegalLandscape.tsx`. The new Legal Landscape Tab and
 * the (still-unused-as-of-commit-2) legacy section both consume this.
 *
 * Composition is regex-over-corpus for now. The model produces facts
 * + procedures + documents with citation evidence; we sniff for the
 * canonical statutes (§§ 30/34/35 BauGB, BayBO Art. 2/57/58/60/6,
 * GEG, Brandschutz, Stellplatz, Denkmal, Baulast) and emit one row
 * per hit with HIGH / PARTIAL / NONE relevance. The Areas A/B/C state
 * machine adjusts each domain's overall relevance.
 */
export function composeLegalDomains(
  state: Partial<ProjectState>,
  lang: 'de' | 'en',
): LegalDomain[] {
  const facts = state.facts ?? []
  const procedures = state.procedures ?? []
  const documents = state.documents ?? []
  const areas = state.areas

  const corpus = [
    ...facts.map(
      (f) =>
        `${f.key} ${typeof f.value === 'string' ? f.value : ''} ${f.evidence ?? ''} ${f.qualifier?.reason ?? ''}`,
    ),
    ...procedures.map(
      (p) =>
        `${p.title_de} ${p.title_en} ${p.rationale_de ?? ''} ${p.rationale_en ?? ''} ${p.qualifier?.reason ?? ''}`,
    ),
    ...documents.map(
      (d) => `${d.title_de} ${d.title_en} ${d.qualifier?.reason ?? ''}`,
    ),
  ]
    .filter(Boolean)
    .join('\n')
    .toLowerCase()

  const has = (re: RegExp) => re.test(corpus)

  // Domain A — Planungsrecht
  const aRows: LegalDomainRow[] = []
  if (has(/§\s*30\s*baugb|baugb\s*§?\s*30/)) {
    aRows.push({
      label: '§ 30 BauGB',
      relevance: 'HIGH',
      status: lang === 'en' ? 'qualified inner area' : 'qualifizierter Innenbereich',
    })
  }
  if (has(/§\s*34\s*baugb|baugb\s*§?\s*34/)) {
    aRows.push({
      label: '§ 34 BauGB',
      relevance: 'HIGH',
      status: lang === 'en' ? 'unplanned inner area' : 'unbeplanter Innenbereich',
    })
  }
  if (has(/§\s*35\s*baugb|baugb\s*§?\s*35/)) {
    aRows.push({
      label: '§ 35 BauGB',
      relevance: 'PARTIAL',
      status: lang === 'en' ? 'outer area' : 'Außenbereich',
    })
  }
  if (has(/baunvo/)) {
    aRows.push({
      label: 'BauNVO',
      relevance: 'PARTIAL',
      status: lang === 'en' ? 'land use' : 'Nutzungsart',
    })
  }
  const areaA = areas?.A
  const aRelevance: LegalRelevance =
    areaA?.state === 'ACTIVE'
      ? 'HIGH'
      : areaA?.state === 'PENDING'
        ? 'PARTIAL'
        : aRows.length > 0
          ? 'PARTIAL'
          : 'NONE'

  // Domain B — Bauordnungsrecht
  const bRows: LegalDomainRow[] = []
  if (has(/baybo\s*art\.?\s*2\b/)) {
    bRows.push({
      label: 'BayBO Art. 2',
      relevance: 'HIGH',
      status: lang === 'en' ? 'building class' : 'Gebäudeklasse',
    })
  }
  if (has(/baybo\s*art\.?\s*58\b/)) {
    bRows.push({
      label: 'BayBO Art. 58',
      relevance: 'HIGH',
      status: lang === 'en' ? 'simplified procedure' : 'vereinfachtes Verfahren',
    })
  }
  if (has(/baybo\s*art\.?\s*57\b/)) {
    bRows.push({
      label: 'BayBO Art. 57',
      relevance: 'PARTIAL',
      status: lang === 'en' ? 'permit exemption check' : 'Genehmigungsfreistellung',
    })
  }
  if (has(/baybo\s*art\.?\s*60\b/)) {
    bRows.push({
      label: 'BayBO Art. 60',
      relevance: 'HIGH',
      status: lang === 'en' ? 'full permit' : 'Baugenehmigungsverfahren',
    })
  }
  if (has(/baybo\s*art\.?\s*6\b/)) {
    bRows.push({
      label: 'BayBO Art. 6',
      relevance: 'PARTIAL',
      status: lang === 'en' ? 'setbacks' : 'Abstandsflächen',
    })
  }
  if (has(/\bgeg\b/)) {
    bRows.push({
      label: 'GEG 2024',
      relevance: 'HIGH',
      status: lang === 'en' ? 'thermal protection' : 'Wärmeschutz · Energiebilanz',
    })
  }
  if (has(/brandschutz/)) {
    bRows.push({
      label: 'Brandschutz',
      relevance: 'PARTIAL',
      status: lang === 'en' ? 'GK-dependent fire protection' : 'gebäudeklassenabhängig',
    })
  }
  const areaB = areas?.B
  const bRelevance: LegalRelevance =
    areaB?.state === 'ACTIVE'
      ? 'HIGH'
      : areaB?.state === 'PENDING'
        ? 'PARTIAL'
        : bRows.length > 0
          ? 'HIGH'
          : 'NONE'

  // Domain C — Sonstige Vorgaben
  const cRows: LegalDomainRow[] = []
  if (has(/baybo\s*art\.?\s*47\b|stellplatz/)) {
    cRows.push({
      label: 'Stellplatzsatzung',
      relevance: 'PARTIAL',
      status: lang === 'en' ? 'municipal' : 'kommunal',
    })
  }
  if (has(/denkmal|baydschg/)) {
    cRows.push({
      label: 'Denkmalschutz',
      relevance: 'HIGH',
      status: lang === 'en' ? 'listed building applicable' : 'denkmalrechtlich',
    })
  }
  if (has(/baulast/)) {
    cRows.push({
      label: 'Baulasten',
      relevance: 'PARTIAL',
      status: lang === 'en' ? 'check land charges' : 'Baulastenverzeichnis',
    })
  }
  const areaC = areas?.C
  const cRelevance: LegalRelevance =
    areaC?.state === 'ACTIVE'
      ? 'HIGH'
      : areaC?.state === 'PENDING'
        ? 'PARTIAL'
        : cRows.length > 0
          ? 'PARTIAL'
          : 'NONE'

  return [
    {
      key: 'A',
      title: lang === 'en' ? 'Planning law' : 'Planungsrecht',
      relevance: aRelevance,
      rows: aRows,
    },
    {
      key: 'B',
      title: lang === 'en' ? 'Building law' : 'Bauordnungsrecht',
      relevance: bRelevance,
      rows: bRows,
    },
    {
      key: 'C',
      title: lang === 'en' ? 'Other requirements' : 'Sonstige Vorgaben',
      relevance: cRelevance,
      rows: cRows,
    },
  ]
}

export function relevanceLabel(r: LegalRelevance, lang: 'de' | 'en'): string {
  if (r === 'HIGH') return lang === 'en' ? 'Highly relevant' : 'Hoch relevant'
  if (r === 'PARTIAL') return lang === 'en' ? 'Partially relevant' : 'Teilrelevant'
  return lang === 'en' ? 'Not yet assessed' : 'Noch nicht beurteilt'
}
