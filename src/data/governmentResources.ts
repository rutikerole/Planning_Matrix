// ───────────────────────────────────────────────────────────────────────
// Phase D (manager feedback) — official German government resources for
// building-permit planning, surfaced on the result Overview tab.
//
// Every URL below is a REAL official source (federal ministry /
// gesetze-im-internet, state ministry / Bauaufsicht, state Geoportal,
// state Architektenkammer, or the state Landesbauordnung text), verified
// by fetch on 2026-05-27. No fabricated links. Federal resources are
// shared across all states; per-state resources are keyed by the
// project's Bundesland. A handful of state portals are JS map apps or sit
// behind anti-bot walls (they open normally in a browser); these are
// confirmed-official and kept — see the link-resolution check in
// scripts/verify-gov-links.mjs.
//
// Kept deliberately lean (title + url + category, no per-link prose) to
// respect the bundle ceiling — the descriptive line is a category label
// rendered from i18n by GovernmentResources.tsx.
// ───────────────────────────────────────────────────────────────────────

import type { BundeslandCode } from '@/legal/states/_types'

export type GovResourceCategory =
  | 'authority' // Bauaufsicht / ministry "Bauen" guide
  | 'geoportal' // Geoportal / Bebauungsplan portal
  | 'chamber' //   Architektenkammer
  | 'lawText' //   Landes-/Bundesgesetz full text
  | 'city' //      municipal building authority (pilot: München)
  | 'funding' //   funding programmes (KfW)
  | 'fees' //      HOAI fee schedule

export interface GovResource {
  category: GovResourceCategory
  /** Official German name (proper noun). */
  titleDe: string
  /** Short English gloss. */
  titleEn: string
  /** Verified official URL. */
  url: string
}

/** Federal resources — shown for every project, regardless of state. */
export const FEDERAL_RESOURCES: readonly GovResource[] = [
  {
    category: 'lawText',
    titleDe: 'Baugesetzbuch (BauGB)',
    titleEn: 'Federal Building Code (BauGB)',
    url: 'https://www.gesetze-im-internet.de/bbaug/',
  },
  {
    category: 'lawText',
    titleDe: 'Gebäudeenergiegesetz (GEG)',
    titleEn: 'Building Energy Act (GEG)',
    url: 'https://www.gesetze-im-internet.de/geg/',
  },
  {
    category: 'funding',
    titleDe: 'KfW-Förderung: Neubau',
    titleEn: 'KfW funding: new builds',
    url: 'https://www.kfw.de/inlandsfoerderung/Privatpersonen/Neubau/',
  },
  {
    category: 'fees',
    titleDe: 'Honorarordnung (HOAI 2013)',
    titleEn: 'Architect/engineer fees (HOAI)',
    url: 'https://www.gesetze-im-internet.de/hoai_2013/',
  },
] as const

/** Per-state resources, keyed by Bundesland code. */
export const GOV_RESOURCES: Record<BundeslandCode, readonly GovResource[]> = {
  bayern: [
    {
      category: 'authority',
      titleDe: 'Bayerische Bauordnung & Vollzug (StMB)',
      titleEn: 'Bavarian building code (ministry)',
      url: 'https://www.stmb.bayern.de/buw/baurechtundtechnik/bauordnungsrecht/bauordnungundvollzug/index.php',
    },
    {
      category: 'geoportal',
      titleDe: 'Geoportal Bayern / BayernAtlas',
      titleEn: 'Bavaria geoportal (BayernAtlas)',
      url: 'https://www.geoportal.bayern.de/',
    },
    {
      category: 'chamber',
      titleDe: 'Bayerische Architektenkammer (ByAK)',
      titleEn: 'Bavarian chamber of architects',
      url: 'https://www.byak.de/planen-und-bauen/recht-und-berufspraxis/baurecht/bauordnungsrecht.html',
    },
    {
      category: 'lawText',
      titleDe: 'Bayerische Bauordnung (BayBO)',
      titleEn: 'Bavarian building code (text)',
      url: 'https://www.gesetze-bayern.de/Content/Document/BayBO',
    },
    {
      category: 'city',
      titleDe: 'München: Bauantrag & Verfahren',
      titleEn: 'Munich: permit procedure',
      url: 'https://stadt.muenchen.de/infos/bauantrag-verfahren.html',
    },
  ],
  nrw: [
    {
      category: 'authority',
      titleDe: 'Wohngebäude bauen (Bauportal.NRW)',
      titleEn: 'Building homes (NRW portal)',
      url: 'https://bauportal.nrw/wohngebaeude-bauen-nordrhein-westfalen',
    },
    {
      category: 'geoportal',
      titleDe: 'GEOportal.NRW',
      titleEn: 'NRW geoportal',
      url: 'https://www.geoportal.nrw/',
    },
    {
      category: 'chamber',
      titleDe: 'Bauantragsformulare (AKNW)',
      titleEn: 'Permit forms (NRW chamber)',
      url: 'https://www.aknw.de/berufspraxis/planen-und-bauen/bauantragsformulare',
    },
    {
      category: 'lawText',
      titleDe: 'Bauordnung NRW (BauO NRW)',
      titleEn: 'NRW building code (text)',
      url: 'https://recht.nrw.de/lrgv/gesetz/01012024-bauordnung-fuer-das-land-nordrhein-westfalen-landesbauordnung-2018-bauo-nrw/',
    },
  ],
  bw: [
    {
      category: 'authority',
      titleDe: 'Bauordnungsrecht (Ministerium BW)',
      titleEn: 'Building regulation law (BW ministry)',
      url: 'https://mlw.baden-wuerttemberg.de/de/bauen-wohnen/baurecht/bauordnungsrecht',
    },
    {
      category: 'geoportal',
      titleDe: 'Geoportal BW',
      titleEn: 'BW geoportal',
      url: 'https://www.geoportal-bw.de/',
    },
    {
      category: 'chamber',
      titleDe: 'Bauvorschriften & Vordrucke (AKBW)',
      titleEn: 'Building rules & forms (chamber)',
      url: 'https://www.akbw.de/berufspraxis/bauantragsverfahren-bw/bauvorschriften-und-vordrucke-in-bw',
    },
  ],
  niedersachsen: [
    {
      category: 'authority',
      titleDe: 'Niedersächsische Bauordnung (NBauO)',
      titleEn: 'Lower Saxony building code (NBauO)',
      url: 'https://www.mw.niedersachsen.de/startseite/bauen_wohnen/bauordnungsrecht_bautechnik_und_gebaudeenergierecht/nbauo/niedersachsische-bauordnung-nbauo-217310.html',
    },
    {
      category: 'geoportal',
      titleDe: 'Geodatenportal Niedersachsen',
      titleEn: 'Lower Saxony geodata portal',
      url: 'https://www.geodaten.niedersachsen.de/startseite/',
    },
    {
      category: 'chamber',
      titleDe: 'Architektenkammer Niedersachsen',
      titleEn: 'Lower Saxony chamber of architects',
      url: 'https://www.aknds.de/',
    },
  ],
  hessen: [
    {
      category: 'authority',
      titleDe: 'Hessische Bauordnung (HBO, Ministerium)',
      titleEn: 'Hesse building code (ministry)',
      url: 'https://wirtschaft.hessen.de/wohnen-und-bauen/baurecht-und-bautechnik/hessische-bauordnung-hbo',
    },
    {
      category: 'geoportal',
      titleDe: 'Bauleitplanung Hessen',
      titleEn: 'Land-use planning (Hesse)',
      url: 'https://bauleitplanung.hessen.de/',
    },
    {
      category: 'chamber',
      titleDe: 'Öffentliches Baurecht (AKH)',
      titleEn: 'Public building law (chamber)',
      url: 'https://www.akh.de/beratung/rechtsberatung/oeffentliches-baurecht-1',
    },
  ],
  sachsen: [
    {
      category: 'authority',
      titleDe: 'Bauvorschriften (Sachsen)',
      titleEn: 'Building regulations (Saxony)',
      url: 'https://www.bauen-wohnen.sachsen.de/bauvorschriften.html',
    },
    {
      category: 'geoportal',
      titleDe: 'Geoportal Sachsenatlas',
      titleEn: 'Saxony geoportal',
      url: 'https://geoportal.sachsen.de/',
    },
    {
      category: 'chamber',
      titleDe: 'Architektenkammer Sachsen',
      titleEn: 'Saxony chamber of architects',
      url: 'https://www.aksachsen.org/',
    },
    {
      category: 'lawText',
      titleDe: 'Sächsische Bauordnung (SächsBO)',
      titleEn: 'Saxony building code (text)',
      url: 'https://www.revosax.sachsen.de/vorschrift/1779-Saechsische-Bauordnung',
    },
  ],
  'sachsen-anhalt': [
    {
      category: 'authority',
      titleDe: 'Öffentliches Baurecht (MID LSA)',
      titleEn: 'Public building law (Saxony-Anhalt)',
      url: 'https://mid.sachsen-anhalt.de/infrastruktur/bauen-und-wohnen/oeffentliches-baurecht',
    },
    {
      category: 'geoportal',
      titleDe: 'Geodatenportal Sachsen-Anhalt',
      titleEn: 'Saxony-Anhalt geodata portal',
      url: 'https://www.lvermgeo.sachsen-anhalt.de/de/gdp-geodaten-karten.html',
    },
    {
      category: 'chamber',
      titleDe: 'Architektenkammer Sachsen-Anhalt',
      titleEn: 'Saxony-Anhalt chamber of architects',
      url: 'https://www.ak-lsa.de/',
    },
  ],
  thueringen: [
    {
      category: 'authority',
      titleDe: 'Bauordnungsrecht (Thüringen)',
      titleEn: 'Building regulation law (Thuringia)',
      url: 'https://infrastruktur-landwirtschaft.thueringen.de/unsere-themen/bau/baurecht/bauordnungsrecht',
    },
    {
      category: 'geoportal',
      titleDe: 'Thüringen Viewer (Geoportal)',
      titleEn: 'Thuringia geoportal viewer',
      url: 'https://thueringenviewer.thueringen.de/',
    },
    {
      category: 'chamber',
      titleDe: 'Architektenkammer Thüringen',
      titleEn: 'Thuringia chamber of architects',
      url: 'https://architekten-thueringen.de/',
    },
    {
      category: 'lawText',
      titleDe: 'Thüringer Bauordnung (ThürBO)',
      titleEn: 'Thuringia building code (text)',
      url: 'https://landesrecht.thueringen.de/bsth/document/jlr-BauOTH2024rahmen',
    },
  ],
  rlp: [
    {
      category: 'authority',
      titleDe: 'Bauvorschriften (FM Rheinland-Pfalz)',
      titleEn: 'Building rules (RLP ministry)',
      url: 'https://fm.rlp.de/themen/baurecht-und-bautechnik/bauvorschriften',
    },
    {
      category: 'geoportal',
      titleDe: 'Geoportal Rheinland-Pfalz',
      titleEn: 'RLP geoportal',
      url: 'https://www.geoportal.rlp.de/',
    },
    {
      category: 'chamber',
      titleDe: 'Architektenkammer Rheinland-Pfalz',
      titleEn: 'RLP chamber of architects',
      url: 'https://www.diearchitekten.org/',
    },
  ],
  saarland: [
    {
      category: 'authority',
      titleDe: 'Bauen und Wohnen (MIBS Saarland)',
      titleEn: 'Building & housing (Saarland)',
      url: 'https://www.saarland.de/mibs/DE/portale/bauenundwohnen/home',
    },
    {
      category: 'geoportal',
      titleDe: 'Geoportal Saarland',
      titleEn: 'Saarland geoportal',
      url: 'https://geoportal.saarland.de/',
    },
    {
      category: 'chamber',
      titleDe: 'Bau- und Vergaberecht (AK Saarland)',
      titleEn: 'Building & procurement law (chamber)',
      url: 'https://aksaarland.de/service/recht/bau-und-vergaberecht/',
    },
  ],
  sh: [
    {
      category: 'authority',
      titleDe: 'Bauordnungsrecht (Schleswig-Holstein)',
      titleEn: 'Building regulation law (S-H)',
      url: 'https://www.schleswig-holstein.de/DE/landesregierung/themen/planen-bauen-wohnen/bauen/Bauordnungsrecht',
    },
    {
      category: 'geoportal',
      titleDe: 'Bauleitpläne SH (DigitalerAtlasNord)',
      titleEn: 'Land-use plans (S-H)',
      url: 'https://danord.gdi-sh.de/view/BuFPlaene',
    },
    {
      category: 'chamber',
      titleDe: 'Hinweise zur LBO (AIK-SH)',
      titleEn: 'Building code guidance (chamber)',
      url: 'https://www.aik-sh.de/mitteilung-hinweis/hinweise-zur-landesbauordnung-schleswig-holstein/',
    },
  ],
  mv: [
    {
      category: 'authority',
      titleDe: 'Bauordnungsrecht (Mecklenburg-Vorpommern)',
      titleEn: 'Building regulation law (M-V)',
      url: 'https://www.regierung-mv.de/Landesregierung/im/Bau/Planen-und-Bauen/Bauordnungsrecht/',
    },
    {
      category: 'geoportal',
      titleDe: 'GeoPortal M-V',
      titleEn: 'M-V geoportal',
      url: 'https://www.geoportal-mv.de/',
    },
    {
      category: 'chamber',
      titleDe: 'Rechtsgrundlagen (Architektenkammer M-V)',
      titleEn: 'Legal foundations (M-V chamber)',
      url: 'https://www.architektenkammer-mv.de/de/ueber-die-ak-m-v/rechtsgrundlagen/',
    },
  ],
  brandenburg: [
    {
      category: 'authority',
      titleDe: 'Bauordnungsrecht (MIL Brandenburg)',
      titleEn: 'Building regulation law (Brandenburg)',
      url: 'https://mil.brandenburg.de/mil/de/themen/planen-bauen/oberste-bauaufsicht/bauordnungsrecht/',
    },
    {
      category: 'geoportal',
      titleDe: 'Geoportal Brandenburg',
      titleEn: 'Brandenburg geoportal',
      url: 'https://geoportal.brandenburg.de/',
    },
    {
      category: 'chamber',
      titleDe: 'Brandenburgische Architektenkammer',
      titleEn: 'Brandenburg chamber of architects',
      url: 'https://www.ak-brandenburg.de/',
    },
    {
      category: 'lawText',
      titleDe: 'Brandenburgische Bauordnung (BbgBO)',
      titleEn: 'Brandenburg building code (text)',
      url: 'https://bravors.brandenburg.de/gesetze/bbgbo_2016',
    },
  ],
  berlin: [
    {
      category: 'authority',
      titleDe: 'Bauaufsicht (Senat Berlin)',
      titleEn: 'Building supervision (Berlin)',
      url: 'https://www.berlin.de/sen/sbw/service/rechtsvorschriften/bereich-bauen/bauaufsicht/',
    },
    {
      category: 'geoportal',
      titleDe: 'Bebauungspläne online (Berlin)',
      titleEn: 'Development plans online (Berlin)',
      url: 'https://www.berlin.de/sen/stadtentwicklung/planung/bebauungsplanverfahren/bebauungsplanverfahren-in-berlin/bebauungsplaene-online/',
    },
    {
      category: 'chamber',
      titleDe: 'Bauordnung Berlin (AK Berlin)',
      titleEn: 'Berlin building code (chamber)',
      url: 'https://www.ak-berlin.de/fachkompetenzen/fachthemen/gesetze-normen-und-verordnungen/bauordnung-berlin/',
    },
  ],
  hamburg: [
    {
      category: 'authority',
      titleDe: 'Bauen (BSW Hamburg)',
      titleEn: 'Building (Hamburg authority)',
      url: 'https://www.hamburg.de/politik-und-verwaltung/behoerden/behoerde-fuer-stadtentwicklung-und-wohnen/themen/wohnen/bauen',
    },
    {
      category: 'geoportal',
      titleDe: 'Planportal (Geoportal Hamburg)',
      titleEn: 'Development plans (Hamburg)',
      url: 'https://geoportal-hamburg.de/planportal/',
    },
    {
      category: 'chamber',
      titleDe: 'Bauordnungsrecht & Bauantrag (AKHH)',
      titleEn: 'Building law & permit (chamber)',
      url: 'https://www.akhh.de/mitglieder/recht/bauordnungsrecht-insbesondere-der-bauantrag/',
    },
  ],
  bremen: [
    {
      category: 'authority',
      titleDe: 'Rechtsgrundlagen Bau (Bremen)',
      titleEn: 'Building legal foundations (Bremen)',
      url: 'https://bau.bremen.de/bau/planen-bauen/rechtsgrundlagen-3559',
    },
    {
      category: 'geoportal',
      titleDe: 'Bauleitpläne (Bremen)',
      titleEn: 'Land-use plans (Bremen)',
      url: 'https://www.bauleitplan.bremen.de/uebersichtsplan.php',
    },
    {
      category: 'chamber',
      titleDe: 'Architektenkammer Bremen',
      titleEn: 'Bremen chamber of architects',
      url: 'https://www.akhb.de/',
    },
  ],
}

/**
 * Resolve a project's Bundesland string to its per-state resource list.
 * Defensive: unknown / empty state → empty array (the federal block still
 * renders). Mirrors the lowercase code convention used everywhere else.
 */
export function resourcesForBundesland(
  bundesland: string | null | undefined,
): readonly GovResource[] {
  const code = (bundesland ?? '').toLowerCase() as BundeslandCode
  return GOV_RESOURCES[code] ?? []
}
