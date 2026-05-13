// ───────────────────────────────────────────────────────────────────────
// v1.0.21 — State-aware citation pack.
//
// The deterministic surfaces (PDF section caveats, specialist
// rationales, required-document citations, risk-register monument
// authority, legal-landscape DSchG row) need per-state citations.
// Through v1.0.20 those surfaces hard-coded one state (Bayern in
// roles + roleEffort + composeDoNext + legalCitations; NRW in
// requiredDocuments + the exportPdf Stadtarchiv caveat). On a Berlin
// project the NRW Stadtarchiv-Düsseldorf string and the Bayern BLfD
// risk both surfaced in the rendered PDF — the v1.0.20 Berlin × T-01
// Pariser Platz smoke walk flagged 13 bugs of which 5 trace back to
// this hard-coding (Bug 23, 23b, 23c, 23d, 23-PRIME).
//
// This module is the single state→citation lookup the non-LLM
// surfaces consume for the citation values that StateLocalization
// (procedure §§) does not already carry. StateLocalization stays the
// canonical source for procedure-name + procedure-§ + chamber +
// monument-authority + cost-factor; this pack adds the FORM citation,
// Bauvorlagenverordnung name, structural-cert §, Abstandsflächen §,
// permit-submission-entitlement §, and a state-correct DSchG short
// name. Two-table split keeps each table's responsibility tight.
//
// SUBSTANTIVE vs STUB. Bayern + NRW + BW + Hessen + Niedersachsen
// carry verified citations. The remaining 11 Bundesländer (including
// Stadtstaaten Berlin / Hamburg / Bremen) return honest-deferral
// placeholders — see CITATION_VERIFICATION_NEEDED.md for the per-
// state stubs awaiting verification. Honesty rule: never fabricate
// a § for a state we have not verified.
// ───────────────────────────────────────────────────────────────────────

import type { BundeslandCode } from './states/_types'

export interface StateCitationPack {
  bundesland: BundeslandCode
  labelDe: string
  labelEn: string
  /** Likely Stadtarchiv city for verification references — the capital
   *  city of the Bundesland (or main archive city for the Stadtstaaten).
   *  Used in render-time caveats like "verify with Stadtarchiv X". */
  archivCity: string
  /** State Bauvorlagenverordnung short name (e.g. 'BauVorlVO NRW'). */
  bauVorlagenAct: string
  /** § citation for the standard (vollständiges) building-permit
   *  application form. */
  permitFormCitation: string
  /** Bauvorlageberechtigt entitlement § (who may sign permit
   *  documents). */
  permitSubmissionCitation: string
  /** Structural-certificate § (Standsicherheits-/Tragwerksnachweis). */
  structuralCertCitation: string
  /** Abstandsflächen § (setback rule). */
  abstandsFlaechenCitation: string
  /** State monument-protection act short name. */
  denkmalSchutzAct: string
  /** State monument-protection authority name. */
  denkmalAuthorityDe: string
  denkmalAuthorityEn: string
  /** True = verified substantive content; false = stub with honest-
   *  deferral wording in every citation field. */
  isSubstantive: boolean
}

// ── Substantive packs (verified) ─────────────────────────────────────

const BAYERN: StateCitationPack = {
  bundesland: 'bayern',
  labelDe: 'Bayern',
  labelEn: 'Bavaria',
  archivCity: 'München',
  bauVorlagenAct: 'BauVorlV (Bayerische Bauvorlagenverordnung)',
  permitFormCitation: 'BayBO Art. 64',
  permitSubmissionCitation: 'BayBO Art. 61',
  structuralCertCitation: 'BayBO Art. 62',
  abstandsFlaechenCitation: 'BayBO Art. 6',
  denkmalSchutzAct: 'BayDSchG',
  denkmalAuthorityDe: 'Bayerisches Landesamt für Denkmalpflege (BLfD)',
  denkmalAuthorityEn: 'Bavarian State Office for Monument Preservation (BLfD)',
  isSubstantive: true,
}

const NRW: StateCitationPack = {
  bundesland: 'nrw',
  labelDe: 'Nordrhein-Westfalen',
  labelEn: 'North Rhine-Westphalia',
  archivCity: 'Düsseldorf',
  bauVorlagenAct: 'BauVorlVO NRW',
  permitFormCitation: '§ 70 BauO NRW',
  permitSubmissionCitation: '§ 67 BauO NRW',
  structuralCertCitation: '§ 68 BauO NRW',
  abstandsFlaechenCitation: '§ 6 BauO NRW',
  denkmalSchutzAct: 'DSchG NRW',
  denkmalAuthorityDe: 'LVR-Amt für Denkmalpflege im Rheinland bzw. LWL-Denkmalpflege Westfalen',
  denkmalAuthorityEn: 'LVR Office (Rhineland) or LWL Office (Westphalia) for Monument Preservation',
  isSubstantive: true,
}

const BW: StateCitationPack = {
  bundesland: 'bw',
  labelDe: 'Baden-Württemberg',
  labelEn: 'Baden-Württemberg',
  archivCity: 'Stuttgart',
  bauVorlagenAct: 'LBOVVO BW',
  permitFormCitation: '§ 58 LBO BW',
  permitSubmissionCitation: '§ 43 LBO BW',
  structuralCertCitation: '§ 73a LBO BW',
  abstandsFlaechenCitation: '§ 5 LBO BW',
  denkmalSchutzAct: 'DSchG BW',
  denkmalAuthorityDe: 'Landesamt für Denkmalpflege Baden-Württemberg (LAD)',
  denkmalAuthorityEn: 'Baden-Württemberg State Office for Monument Preservation (LAD)',
  isSubstantive: true,
}

const HESSEN: StateCitationPack = {
  bundesland: 'hessen',
  labelDe: 'Hessen',
  labelEn: 'Hesse',
  archivCity: 'Wiesbaden',
  bauVorlagenAct: 'BauVorlV Hessen',
  permitFormCitation: '§ 66 HBO',
  permitSubmissionCitation: '§ 49 HBO',
  structuralCertCitation: '§ 68 HBO',
  abstandsFlaechenCitation: '§ 6 HBO',
  denkmalSchutzAct: 'HDSchG',
  denkmalAuthorityDe: 'Landesamt für Denkmalpflege Hessen (LfDH)',
  denkmalAuthorityEn: 'Hesse State Office for Monument Preservation (LfDH)',
  isSubstantive: true,
}

const NIEDERSACHSEN: StateCitationPack = {
  bundesland: 'niedersachsen',
  labelDe: 'Niedersachsen',
  labelEn: 'Lower Saxony',
  archivCity: 'Hannover',
  bauVorlagenAct: 'BauVorlVO Nds',
  permitFormCitation: '§ 64 NBauO',
  permitSubmissionCitation: '§ 65 NBauO',
  structuralCertCitation: '§ 65a NBauO',
  abstandsFlaechenCitation: '§ 5 NBauO',
  denkmalSchutzAct: 'NDSchG',
  denkmalAuthorityDe: 'Niedersächsisches Landesamt für Denkmalpflege (NLD)',
  denkmalAuthorityEn: 'Lower Saxony State Office for Monument Preservation (NLD)',
  isSubstantive: true,
}

// ── Stub pack (honest deferral) ──────────────────────────────────────

const STUB_VERIFY_DE = 'Detail-§ in v1.0.21 noch nicht verifiziert — mit Bauamt oder Architektenkammer abklären'
const STUB_VERIFY_EN = 'Detail § not yet verified in v1.0.21 — confirm with local building authority or Architektenkammer'

function archivCityFor(bundesland: BundeslandCode, labelDe: string): string {
  // Stadtstaaten map to themselves; other stub states use a known
  // capital city so the "Stadtarchiv {city}" reference still names
  // a real archive even when we have not verified the § detail.
  const map: Partial<Record<BundeslandCode, string>> = {
    berlin: 'Berlin',
    hamburg: 'Hamburg',
    bremen: 'Bremen',
    brandenburg: 'Potsdam',
    mv: 'Schwerin',
    rlp: 'Mainz',
    saarland: 'Saarbrücken',
    sachsen: 'Dresden',
    'sachsen-anhalt': 'Magdeburg',
    sh: 'Kiel',
    thueringen: 'Erfurt',
  }
  return map[bundesland] ?? labelDe
}

function makeStub(
  bundesland: BundeslandCode,
  labelDe: string,
  labelEn: string,
): StateCitationPack {
  return {
    bundesland,
    labelDe,
    labelEn,
    archivCity: archivCityFor(bundesland, labelDe),
    bauVorlagenAct: `Bauvorlagenverordnung ${labelDe} — ${STUB_VERIFY_DE}`,
    permitFormCitation: STUB_VERIFY_DE,
    permitSubmissionCitation: STUB_VERIFY_DE,
    structuralCertCitation: STUB_VERIFY_DE,
    abstandsFlaechenCitation: STUB_VERIFY_DE,
    denkmalSchutzAct: `Landes-Denkmalschutzgesetz ${labelDe} (${STUB_VERIFY_DE})`,
    denkmalAuthorityDe: `Landesamt für Denkmalpflege ${labelDe}`,
    denkmalAuthorityEn: `State Office for Monument Preservation (${labelEn})`,
    isSubstantive: false,
  }
}

// Marker exported so callers can render an honest-deferral suffix in
// the user-facing locale without re-typing the wording.
export const STUB_VERIFY = { de: STUB_VERIFY_DE, en: STUB_VERIFY_EN }

const REGISTRY: Record<BundeslandCode, StateCitationPack> = {
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
 * Resolve a `projects.bundesland` string to its citation pack. Unknown
 * values resolve to a stub Bayern-labelled pack with honest-deferral
 * fields (NOT the substantive Bayern pack — fabricating Bayern §§ on
 * an unknown state is the Bug 23-family root cause this module fixes).
 */
export function getStateCitations(
  bundesland: string | null | undefined,
): StateCitationPack {
  const code = (bundesland ?? '').trim().toLowerCase() as BundeslandCode
  const pack = REGISTRY[code]
  if (pack) return pack
  // Unknown bundesland → honest stub, NOT a silent Bayern leak.
  return makeStub('bayern' as BundeslandCode, 'unbekannt', 'unknown')
}
