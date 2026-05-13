// ───────────────────────────────────────────────────────────────────────
// v1.0.10 — central state-localization registry.
//
// The deterministic computation layers (cost engine, baseline procedure
// derivation, risk register, PDF export) were Bayern-hardcoded through
// v1.0.9 even though the persona-prompt layer became state-aware in
// v1.0.5/v1.0.6. This module is the single per-state lookup the
// non-LLM surfaces consume.
//
// Each entry's §§ citations were verified against the corresponding
// `src/legal/states/<code>.ts` ALLOWED_CITATIONS array — citations
// already proven against authoritative state-portal sources during
// Phase 12 (NRW, BW, Hessen, Niedersachsen) and the Bayern SHA region.
//
// Stub states (the 11 minimum-content Bundesländer) fall back to a
// generic "your Land's LBO" framing — visible-gap rule, never a
// silent Bayern leak.
// ───────────────────────────────────────────────────────────────────────

import type { BundeslandCode } from './states/_types'

export interface ProcedurePack {
  /** Verbatim § citation including the LBO short name. */
  citation: string
  /** German display name (e.g. "Vereinfachtes Baugenehmigungsverfahren"). */
  nameDe: string
  /** English display name. */
  nameEn: string
}

export interface StateLocalization {
  bundesland: BundeslandCode
  labelDe: string
  labelEn: string
  /** Architects' chamber abbreviation + full name. */
  chamber: { abbrev: string; nameDe: string; nameEn: string }
  /** Monument authority (Denkmalpflege). */
  monumentAuthority: {
    abbrev: string
    nameDe: string
    nameEn: string
    /** Notes on intra-state regional split (e.g. LVR vs LWL for NRW). */
    regionalSplit?: { de: string; en: string }
  }
  /**
   * Per-category procedure names. Stub states use generic phrasing
   * (citation === '' is a marker to render without a § anchor).
   */
  procedure: {
    free: ProcedurePack | null
    notification?: ProcedurePack | null
    simplified: ProcedurePack
    regular: ProcedurePack
  }
  /** Structural-certificate citation surfaced in cost rationales. */
  structuralCert: { citation: string; descriptionDe: string; descriptionEn: string }
  /** Surveying-plan note surfaced in cost rationales. */
  surveyingNote: { de: string; en: string }
  /** "scales with floor area × Bayern factor" replacement framing. */
  costFactorLabel: { de: string; en: string }
  /** Procedure & documents tab + PDF caveat — replaces "typical Bayern fee tables". */
  pdfCaveat: { de: string; en: string }
}

const BAYERN: StateLocalization = {
  bundesland: 'bayern',
  labelDe: 'Bayern',
  labelEn: 'Bavaria',
  chamber: {
    abbrev: 'ByAK',
    nameDe: 'Bayerische Architektenkammer',
    nameEn: 'Bavarian Chamber of Architects',
  },
  monumentAuthority: {
    abbrev: 'BLfD',
    nameDe: 'Bayerisches Landesamt für Denkmalpflege',
    nameEn: 'Bavarian State Office for the Preservation of Monuments',
  },
  procedure: {
    free: {
      citation: 'BayBO Art. 57',
      nameDe: 'Verfahrensfreie Vorhaben',
      nameEn: 'Procedure-free projects',
    },
    notification: {
      citation: 'BayBO Art. 57 Abs. 7',
      nameDe: 'Anzeigeverfahren',
      nameEn: 'Notification procedure',
    },
    simplified: {
      citation: 'BayBO Art. 58',
      nameDe: 'Vereinfachtes Baugenehmigungsverfahren',
      nameEn: 'Simplified building permit',
    },
    regular: {
      citation: 'BayBO Art. 59',
      nameDe: 'Baugenehmigungsverfahren (regulär)',
      nameEn: 'Regular building permit',
    },
  },
  structuralCert: {
    citation: 'BayBO Art. 62',
    descriptionDe: 'Standsicherheitsnachweis',
    descriptionEn: 'Structural certification',
  },
  surveyingNote: {
    de: 'Amtlicher Lageplan mit Höhenpunkten — Pflicht für Neubauten.',
    en: 'Official site plan with elevation points — mandatory for new builds.',
  },
  costFactorLabel: {
    de: 'HOAI Honorarzone III · Leistungsphasen 1–4 · deutscher Basiswert (regionale Varianz ±10%; staatsspezifische BKI-Anpassung in Vorbereitung).',
    en: 'HOAI fee zone III · service phases 1–4 · German baseline (regional variance ±10%; state-specific BKI adjustment in preparation).',
  },
  pdfCaveat: {
    de: 'Orientierungswerte aus HOAI-Honorartafel · keine verbindlichen Angebote.',
    en: 'Orientation values from the HOAI fee tables · not binding quotes.',
  },
}

const NRW: StateLocalization = {
  bundesland: 'nrw',
  labelDe: 'Nordrhein-Westfalen',
  labelEn: 'North Rhine-Westphalia',
  chamber: {
    abbrev: 'AKNW',
    nameDe: 'Architektenkammer Nordrhein-Westfalen',
    nameEn: 'Chamber of Architects North Rhine-Westphalia',
  },
  monumentAuthority: {
    abbrev: 'LVR/LWL',
    nameDe: 'LVR-Amt für Denkmalpflege (Rheinland) bzw. LWL-Denkmalpflege (Westfalen)',
    nameEn: 'LVR Office (Rhineland) or LWL Office (Westphalia)',
    regionalSplit: {
      de: 'Rheinland (PLZ 40–53, 57–59): LVR · Westfalen (PLZ 32–33, 44–48 westfälischer Teil): LWL.',
      en: 'Rhineland (PLZ 40–53, 57–59): LVR · Westphalia (PLZ 32–33, 44–48 western part): LWL.',
    },
  },
  procedure: {
    free: {
      citation: '§ 62 BauO NRW',
      nameDe: 'Verfahrensfreie Bauvorhaben',
      nameEn: 'Procedure-free projects',
    },
    notification: {
      citation: '§ 63 BauO NRW',
      nameDe: 'Genehmigungsfreistellung',
      nameEn: 'Permit exemption',
    },
    simplified: {
      citation: '§ 64 BauO NRW',
      nameDe: 'Vereinfachtes Baugenehmigungsverfahren',
      nameEn: 'Simplified building permit',
    },
    regular: {
      citation: '§ 65 BauO NRW',
      nameDe: 'Baugenehmigungsverfahren (regulär)',
      nameEn: 'Regular building permit',
    },
  },
  structuralCert: {
    citation: '§ 68 BauO NRW',
    descriptionDe: 'Bautechnische Nachweise',
    descriptionEn: 'Structural certification',
  },
  surveyingNote: {
    de: 'Amtlicher Lageplan einer ÖbVI — Pflicht im Baugenehmigungsverfahren.',
    en: 'Official site plan from a public-licensed surveyor (ÖbVI) — mandatory in the permit process.',
  },
  costFactorLabel: {
    de: 'HOAI Honorarzone III · Leistungsphasen 1–4 · deutscher Basiswert (regionale Varianz ±10%; staatsspezifische BKI-Anpassung in Vorbereitung).',
    en: 'HOAI fee zone III · service phases 1–4 · German baseline (regional variance ±10%; state-specific BKI adjustment in preparation).',
  },
  pdfCaveat: {
    de: 'Orientierungswerte aus HOAI-Honorartafel · keine verbindlichen Angebote.',
    en: 'Orientation values from the HOAI fee tables · not binding quotes.',
  },
}

const BW: StateLocalization = {
  bundesland: 'bw',
  labelDe: 'Baden-Württemberg',
  labelEn: 'Baden-Württemberg',
  chamber: {
    abbrev: 'AKBW',
    nameDe: 'Architektenkammer Baden-Württemberg',
    nameEn: 'Chamber of Architects Baden-Württemberg',
  },
  monumentAuthority: {
    abbrev: 'LAD',
    nameDe: 'Landesamt für Denkmalpflege Baden-Württemberg',
    nameEn: 'Baden-Württemberg State Office for Monument Preservation',
  },
  procedure: {
    free: {
      citation: '§ 50 LBO',
      nameDe: 'Verfahrensfreie Vorhaben',
      nameEn: 'Procedure-free projects',
    },
    notification: {
      citation: '§ 51 LBO',
      nameDe: 'Kenntnisgabeverfahren',
      nameEn: 'Notification procedure (Kenntnisgabe)',
    },
    simplified: {
      citation: '§ 52 LBO',
      nameDe: 'Vereinfachtes Baugenehmigungsverfahren',
      nameEn: 'Simplified building permit',
    },
    regular: {
      citation: '§ 58 LBO',
      nameDe: 'Baugenehmigung',
      nameEn: 'Regular building permit',
    },
  },
  structuralCert: {
    citation: '§ 73a LBO',
    descriptionDe: 'Technische Baubestimmungen (VwV TB BW)',
    descriptionEn: 'Technical building rules (VwV TB BW)',
  },
  surveyingNote: {
    de: 'Lageplan nach LBOVVO — bei Neubau und größeren Anbauten Pflicht.',
    en: 'Site plan per LBOVVO — mandatory for new builds and larger extensions.',
  },
  costFactorLabel: {
    de: 'HOAI Honorarzone III · Leistungsphasen 1–4 · deutscher Basiswert (regionale Varianz ±10%; staatsspezifische BKI-Anpassung in Vorbereitung).',
    en: 'HOAI fee zone III · service phases 1–4 · German baseline (regional variance ±10%; state-specific BKI adjustment in preparation).',
  },
  pdfCaveat: {
    de: 'Orientierungswerte aus HOAI-Honorartafel · keine verbindlichen Angebote.',
    en: 'Orientation values from the HOAI fee tables · not binding quotes.',
  },
}

const HESSEN: StateLocalization = {
  bundesland: 'hessen',
  labelDe: 'Hessen',
  labelEn: 'Hesse',
  chamber: {
    abbrev: 'AKH',
    nameDe: 'Architekten- und Stadtplanerkammer Hessen',
    nameEn: 'Chamber of Architects and Urban Planners Hesse',
  },
  monumentAuthority: {
    abbrev: 'LfDH',
    nameDe: 'Landesamt für Denkmalpflege Hessen',
    nameEn: 'Hesse State Office for Monument Preservation',
  },
  procedure: {
    free: {
      citation: '§ 63 HBO',
      nameDe: 'Baugenehmigungsfreie Bauvorhaben',
      nameEn: 'Procedure-free projects',
    },
    notification: {
      citation: '§ 64 HBO',
      nameDe: 'Genehmigungsfreistellung (Wohnungsbau im qB-Plan)',
      nameEn: 'Permit exemption (residential within qualified plan)',
    },
    simplified: {
      citation: '§ 65 HBO',
      nameDe: 'Vereinfachtes Baugenehmigungsverfahren',
      nameEn: 'Simplified building permit',
    },
    regular: {
      citation: '§ 66 HBO',
      nameDe: 'Baugenehmigungsverfahren (regulär)',
      nameEn: 'Regular building permit',
    },
  },
  structuralCert: {
    citation: '§ 68 HBO',
    descriptionDe: 'Bautechnische Nachweise',
    descriptionEn: 'Structural certification',
  },
  surveyingNote: {
    de: 'Amtlicher Lageplan ÖbVI — Pflicht im Baugenehmigungsverfahren.',
    en: 'Official site plan from a public-licensed surveyor — mandatory in the permit process.',
  },
  costFactorLabel: {
    de: 'HOAI Honorarzone III · Leistungsphasen 1–4 · deutscher Basiswert (regionale Varianz ±10%; staatsspezifische BKI-Anpassung in Vorbereitung).',
    en: 'HOAI fee zone III · service phases 1–4 · German baseline (regional variance ±10%; state-specific BKI adjustment in preparation).',
  },
  pdfCaveat: {
    de: 'Orientierungswerte aus HOAI-Honorartafel · keine verbindlichen Angebote.',
    en: 'Orientation values from the HOAI fee tables · not binding quotes.',
  },
}

const NIEDERSACHSEN: StateLocalization = {
  bundesland: 'niedersachsen',
  labelDe: 'Niedersachsen',
  labelEn: 'Lower Saxony',
  chamber: {
    abbrev: 'AKNDS',
    nameDe: 'Architektenkammer Niedersachsen',
    nameEn: 'Chamber of Architects Lower Saxony',
  },
  monumentAuthority: {
    abbrev: 'NLD',
    nameDe: 'Niedersächsisches Landesamt für Denkmalpflege',
    nameEn: 'Lower Saxony State Office for Monument Preservation',
  },
  procedure: {
    free: {
      citation: '§ 60 NBauO',
      nameDe: 'Verfahrensfreie Baumaßnahmen',
      nameEn: 'Procedure-free projects',
    },
    notification: {
      citation: '§ 62 NBauO',
      nameDe: 'Sonstige genehmigungsfreie Baumaßnahmen',
      nameEn: 'Other permit-free projects',
    },
    simplified: {
      citation: '§ 63 NBauO',
      nameDe: 'Vereinfachtes Baugenehmigungsverfahren',
      nameEn: 'Simplified building permit',
    },
    regular: {
      citation: '§ 64 NBauO',
      nameDe: 'Baugenehmigungsverfahren (regulär)',
      nameEn: 'Regular building permit',
    },
  },
  structuralCert: {
    citation: '§ 65 NBauO',
    descriptionDe: 'Bautechnische Nachweise',
    descriptionEn: 'Structural certification',
  },
  surveyingNote: {
    de: 'Amtlicher Lageplan ÖbVI — Pflicht im Baugenehmigungsverfahren.',
    en: 'Official site plan from a public-licensed surveyor — mandatory in the permit process.',
  },
  costFactorLabel: {
    de: 'HOAI Honorarzone III · Leistungsphasen 1–4 · deutscher Basiswert (regionale Varianz ±10%; staatsspezifische BKI-Anpassung in Vorbereitung).',
    en: 'HOAI fee zone III · service phases 1–4 · German baseline (regional variance ±10%; state-specific BKI adjustment in preparation).',
  },
  pdfCaveat: {
    de: 'Orientierungswerte aus HOAI-Honorartafel · keine verbindlichen Angebote.',
    en: 'Orientation values from the HOAI fee tables · not binding quotes.',
  },
}

// Generic stub for the 11 minimum-content Bundesländer. Visible-gap
// framing: no fabricated §§, points the user at "your Bundesland's
// LBO" + a generic chamber/authority placeholder.
function makeStub(bundesland: BundeslandCode, labelDe: string, labelEn: string): StateLocalization {
  return {
    bundesland,
    labelDe,
    labelEn,
    chamber: {
      abbrev: 'AK',
      nameDe: `Architektenkammer ${labelDe}`,
      nameEn: `Chamber of Architects (${labelEn})`,
    },
    monumentAuthority: {
      abbrev: 'LfD',
      nameDe: `Landesamt für Denkmalpflege ${labelDe}`,
      nameEn: `State Office for Monument Preservation (${labelEn})`,
    },
    procedure: {
      free: { citation: '', nameDe: 'Verfahrensfreie Vorhaben', nameEn: 'Procedure-free projects' },
      simplified: {
        citation: '',
        nameDe: 'Vereinfachtes Baugenehmigungsverfahren',
        nameEn: 'Simplified building permit',
      },
      regular: {
        citation: '',
        nameDe: 'Baugenehmigungsverfahren (regulär)',
        nameEn: 'Regular building permit',
      },
    },
    structuralCert: {
      citation: '',
      descriptionDe: 'Bautechnische Nachweise',
      descriptionEn: 'Structural certification',
    },
    surveyingNote: {
      de: 'Amtlicher Lageplan — Pflicht im Baugenehmigungsverfahren.',
      en: 'Official site plan — mandatory in the permit process.',
    },
    // v1.0.22 Bug I — stub-state costFactorLabel uses the same
    // honest-baseline framing as substantive states. The state name
    // ({labelDe}/{labelEn}) was previously interpolated to imply
    // regional differentiation that the cost engine does not apply.
    costFactorLabel: {
      de: 'HOAI Honorarzone III · Leistungsphasen 1–4 · deutscher Basiswert (regionale Varianz ±10%; staatsspezifische BKI-Anpassung in Vorbereitung).',
      en: 'HOAI fee zone III · service phases 1–4 · German baseline (regional variance ±10%; state-specific BKI adjustment in preparation).',
    },
    pdfCaveat: {
      de: 'Orientierungswerte aus HOAI-Honorartafel · keine verbindlichen Angebote.',
      en: 'Orientation values from the HOAI fee tables · not binding quotes.',
    },
  }
}

const REGISTRY: Record<BundeslandCode, StateLocalization> = {
  bayern: BAYERN,
  nrw: NRW,
  bw: BW,
  hessen: HESSEN,
  niedersachsen: NIEDERSACHSEN,
  berlin: makeStub('berlin', 'Berlin', 'Berlin'),
  hamburg: makeStub('hamburg', 'Hamburg', 'Hamburg'),
  bremen: makeStub('bremen', 'Bremen', 'Bremen'),
  brandenburg: makeStub('brandenburg', 'Brandenburg', 'Brandenburg'),
  mv: makeStub('mv', 'Mecklenburg-Vorpommern', 'Mecklenburg-Western Pomerania'),
  rlp: makeStub('rlp', 'Rheinland-Pfalz', 'Rhineland-Palatinate'),
  saarland: makeStub('saarland', 'Saarland', 'Saarland'),
  sachsen: makeStub('sachsen', 'Sachsen', 'Saxony'),
  'sachsen-anhalt': makeStub('sachsen-anhalt', 'Sachsen-Anhalt', 'Saxony-Anhalt'),
  sh: makeStub('sh', 'Schleswig-Holstein', 'Schleswig-Holstein'),
  thueringen: makeStub('thueringen', 'Thüringen', 'Thuringia'),
}

/**
 * Resolve a `projects.bundesland` string to its localization pack.
 * Unknown/empty inputs fall back to Bayern (preserves Phase-12-era
 * behaviour for legacy unmigrated rows).
 */
export function getStateLocalization(
  bundesland: string | null | undefined,
): StateLocalization {
  const code = (bundesland ?? '').trim().toLowerCase() as BundeslandCode
  return REGISTRY[code] ?? BAYERN
}
