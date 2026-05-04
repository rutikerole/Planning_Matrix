export type AddressDetails = {
  planungsrecht: string
  bauordnung: string
  sonstige: string
  gebaeudeklasse: string
}

export type Address = {
  id: string
  line1: string
  line2: string
  flst: string
  /** SVG dimensions in viewBox 0 0 600 360 coords */
  plot: { x: number; y: number; w: number; h: number }
  buildable: { x: number; y: number; w: number; h: number }
  dimWidthLabel: string
  dimHeightLabel: string
  stats: { proc: string; docs: number; roles: number; weeks: number }
  details_de: AddressDetails
  details_en: AddressDetails
}

/**
 * Phase 5 — analyzer panel narrowed to München-only example addresses.
 * Erlangen and Rosenheim entries removed (see _DEPRECATED_ADDRESSES at
 * the bottom for archival; not exported into the live analyzer).
 *
 * The four entries below span four BayBO Verfahrensarten (Art. 57/58/59)
 * and the two relevant BauGB regimes (§ 30 / § 34) so the analyzer
 * shows real variation across München's districts.
 */
export const addresses: Address[] = [
  {
    id: 'altstadt-lehel',
    line1: 'Zweibrückenstraße 12',
    line2: '80331 München',
    flst: 'FLST. 0214/8',
    plot: { x: 80, y: 70, w: 380, h: 220 },
    buildable: { x: 130, y: 110, w: 280, h: 140 },
    dimWidthLabel: '24,8 m',
    dimHeightLabel: '15,4 m',
    stats: { proc: 'Regulär', docs: 14, roles: 6, weeks: 12 },
    details_de: {
      planungsrecht: 'BauGB § 30 — qualifizierter B-Plan + Ensemble Altstadt',
      bauordnung: 'BayBO Art. 59 — reguläres Baugenehmigungsverfahren',
      sonstige: 'Erhaltungssatzung Altstadt-Lehel + BayDSchG Art. 6',
      gebaeudeklasse: 'GK 4 — bis 13 m Höhe',
    },
    details_en: {
      planungsrecht: 'BauGB § 30 — qualified development plan + heritage ensemble',
      bauordnung: 'BayBO Art. 59 — full permit procedure',
      sonstige: 'Altstadt-Lehel preservation ordinance + BayDSchG Art. 6',
      gebaeudeklasse: 'Building class 4 — up to 13 m',
    },
  },
  {
    id: 'maxvorstadt',
    line1: 'Türkenstraße 25',
    line2: '80799 München',
    flst: 'FLST. 1184/12',
    plot: { x: 80, y: 80, w: 380, h: 200 },
    buildable: { x: 120, y: 110, w: 300, h: 140 },
    dimWidthLabel: '28,6 m',
    dimHeightLabel: '15,2 m',
    stats: { proc: 'Vereinfacht', docs: 9, roles: 4, weeks: 6 },
    details_de: {
      planungsrecht: 'BauGB § 34 — Innenbereich, eingefügt',
      bauordnung: 'BayBO Art. 58 — vereinfachtes Verfahren',
      sonstige: 'Stellplatzsatzung StPlS 926 — 1 Stp/WE',
      gebaeudeklasse: 'GK 3 — bis 7 m Höhe',
    },
    details_en: {
      planungsrecht: 'BauGB § 34 — within consolidated area',
      bauordnung: 'BayBO Art. 58 — simplified procedure',
      sonstige: 'Munich parking ordinance StPlS 926 — 1 space / dwelling',
      gebaeudeklasse: 'Building class 3 — up to 7 m',
    },
  },
  {
    id: 'schwabing-west',
    line1: 'Hohenzollernstraße 50',
    line2: '80801 München',
    flst: 'FLST. 0742/3',
    plot: { x: 90, y: 60, w: 420, h: 240 },
    buildable: { x: 140, y: 100, w: 320, h: 160 },
    dimWidthLabel: '32,4 m',
    dimHeightLabel: '18,1 m',
    stats: { proc: 'Vereinfacht', docs: 11, roles: 5, weeks: 8 },
    details_de: {
      planungsrecht: 'BauGB § 34 — Innenbereich, Erhaltungsgebiet',
      bauordnung: 'BayBO Art. 58 — vereinfachtes Verfahren',
      sonstige: 'Erhaltungssatzung Schwabing-West + StPlS 926',
      gebaeudeklasse: 'GK 3 — bis 7 m Höhe',
    },
    details_en: {
      planungsrecht: 'BauGB § 34 — consolidated area, preservation zone',
      bauordnung: 'BayBO Art. 58 — simplified procedure',
      sonstige: 'Schwabing-West preservation ordinance + StPlS 926',
      gebaeudeklasse: 'Building class 3 — up to 7 m',
    },
  },
  {
    id: 'haidhausen',
    line1: 'Wörthstraße 12',
    line2: '81675 München',
    flst: 'FLST. 0218/7',
    plot: { x: 100, y: 50, w: 400, h: 260 },
    buildable: { x: 150, y: 90, w: 300, h: 180 },
    dimWidthLabel: '24,8 m',
    dimHeightLabel: '21,4 m',
    stats: { proc: 'Freistellung', docs: 6, roles: 3, weeks: 4 },
    details_de: {
      planungsrecht: 'BauGB § 30 — qualifizierter B-Plan',
      bauordnung: 'BayBO Art. 57 — Genehmigungsfreistellung',
      sonstige: 'Erhaltungssatzung Haidhausen + StPlS 926',
      gebaeudeklasse: 'GK 2 — bis 7 m Höhe',
    },
    details_en: {
      planungsrecht: 'BauGB § 30 — qualified development plan',
      bauordnung: 'BayBO Art. 57 — exempt procedure',
      sonstige: 'Haidhausen preservation ordinance + StPlS 926',
      gebaeudeklasse: 'Building class 2 — up to 7 m',
    },
  },
]

/**
 * Archived analyzer entries from earlier (pre-Phase-5) phases. NOT
 * exported into the live `addresses` array. Retained only as a
 * historical reference and to make a future "city #2" widening a
 * one-line change.
 */
const _DEPRECATED_ADDRESSES: Address[] = [
  {
    id: 'erlangen',
    line1: 'Hauptstraße 12',
    line2: '91054 Erlangen',
    flst: 'FLST. 0742/3',
    plot: { x: 80, y: 60, w: 440, h: 240 },
    buildable: { x: 130, y: 100, w: 340, h: 160 },
    dimWidthLabel: '32,4 m',
    dimHeightLabel: '18,1 m',
    stats: { proc: 'Vereinfacht', docs: 9, roles: 4, weeks: 6 },
    details_de: {
      planungsrecht: 'BauGB § 34 — Innenbereich, eingefügt',
      bauordnung: 'BayBO Art. 58 — vereinfachtes Verfahren',
      sonstige: 'Stellplatzsatzung Erlangen, keine Baulasten',
      gebaeudeklasse: 'GK 3 — bis 7 m Höhe',
    },
    details_en: {
      planungsrecht: 'BauGB § 34 — within consolidated area',
      bauordnung: 'BayBO Art. 58 — simplified procedure',
      sonstige: 'Erlangen parking ordinance, no encumbrances',
      gebaeudeklasse: 'Building class 3 — up to 7 m',
    },
  },
  {
    id: 'rosenheim',
    line1: 'Innstraße 23',
    line2: '83022 Rosenheim',
    flst: 'FLST. 0218/7',
    plot: { x: 100, y: 50, w: 400, h: 260 },
    buildable: { x: 150, y: 90, w: 300, h: 180 },
    dimWidthLabel: '24,8 m',
    dimHeightLabel: '21,4 m',
    stats: { proc: 'Freistellung', docs: 6, roles: 3, weeks: 4 },
    details_de: {
      planungsrecht: 'BauGB § 30 — qualifizierter B-Plan',
      bauordnung: 'BayBO Art. 57 — Genehmigungsfreistellung',
      sonstige: 'Keine besonderen Vorgaben',
      gebaeudeklasse: 'GK 2 — bis 7 m Höhe',
    },
    details_en: {
      planungsrecht: 'BauGB § 30 — qualified development plan',
      bauordnung: 'BayBO Art. 57 — exempt procedure',
      sonstige: 'No special requirements',
      gebaeudeklasse: 'Building class 2 — up to 7 m',
    },
  },
]
void _DEPRECATED_ADDRESSES
