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
// Phase B — corpus-backed citation fields (single source of truth:
// scripts/legal-corpus/, codegen'd to corpusCitations.generated.ts). Per-field
// fallback: a corpus value (heading-verified) wins where present, the hand-
// coded value below stays otherwise. BW + Niedersachsen are intentionally
// absent from the pack (heterogeneous BauO terminology) → fully hand-coded.
import { STATE_CORPUS_CITATIONS, STATE_CORPUS_PROCEDURE } from './corpusCitations.generated'

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
  /** Brandschutz § (fire-protection requirement, MBO-aligned § 14 in most
   *  states). Phase-C item #2 F1: closes the "§ 14 NBauO" cross-state leak —
   *  corpus-sourced per state, never the Niedersachsen else-fallback. */
  brandschutzCitation: string
  /** Verfahrensfrei / Anzeige § (permit-free notification). Phase-C item #2
   *  F2: closes the "§ 60 NBauO" leak — overlaid from the corpus `free` §. */
  permitFreeCitation: string
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
  brandschutzCitation: 'BayBO Art. 12',
  permitFreeCitation: 'BayBO Art. 57',
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
  brandschutzCitation: '§ 14 BauO NRW',
  permitFreeCitation: '§ 62 BauO NRW',
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
  // phase-c/legal-correctness — corrected two hand-coded mis-maps the
  // AUDIT_PRE_MANUAL_TESTING report flagged (BW is hand-coded; withCorpus is a
  // no-op for it). permitForm was § 58 ("Baugenehmigung" — the permit DECISION,
  // not the application); the application+documents § is § 53 LBO BW
  // ("Bauvorlagen und Bauantrag", dejure.org/gesetze/LBO/53.html). structuralCert
  // was § 73a ("Technische Baubestimmungen" — an admin rule, not a cert); the
  // Standsicherheit § is § 13 LBO BW (dejure.org/gesetze/LBO/13.html).
  permitFormCitation: '§ 53 LBO BW',
  permitSubmissionCitation: '§ 43 LBO BW',
  structuralCertCitation: '§ 13 LBO BW',
  abstandsFlaechenCitation: '§ 5 LBO BW',
  brandschutzCitation: '§ 15 LBO BW',
  permitFreeCitation: '§ 50 LBO BW',
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
  brandschutzCitation: '§ 14 HBO',
  permitFreeCitation: '§ 63 HBO',
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
  // phase-c/legal-correctness — corrected two hand-coded mis-maps (NI is
  // hand-coded; withCorpus is a no-op). permitForm was § 64 ("Baugenehmigungs-
  // verfahren" — the procedure, not the application); the application § is
  // § 67 NBauO ("Bauantrag und Bauvorlagen", NI-VORIS). permitSubmission
  // duplicated structuralCert at § 65 ("Bautechnische Nachweise"); the
  // bauvorlageberechtigt/Entwurfsverfasser entitlement is § 53 NBauO
  // ("Entwurfsverfasserin und Entwurfsverfasser", NI-VORIS). structuralCert
  // stays § 65 (correct).
  permitFormCitation: '§ 67 NBauO',
  permitSubmissionCitation: '§ 53 NBauO',
  structuralCertCitation: '§ 65 NBauO',
  abstandsFlaechenCitation: '§ 5 NBauO',
  brandschutzCitation: '§ 14 NBauO',
  permitFreeCitation: '§ 60 NBauO',
  denkmalSchutzAct: 'NDSchG',
  denkmalAuthorityDe: 'Niedersächsisches Landesamt für Denkmalpflege (NLD)',
  denkmalAuthorityEn: 'Lower Saxony State Office for Monument Preservation (NLD)',
  isSubstantive: true,
}

// ── Stub pack (honest deferral) ──────────────────────────────────────

// v1.0.29 Bug 67/82 — dropped the internal version token ("v1.0.21") that
// leaked into user-facing text (Team architect card, Domain C denkmal label,
// PDF). Honest-deferral wording only.
const STUB_VERIFY_DE = 'Detail-§ noch nicht hinterlegt — mit Bauamt oder Architektenkammer abklären'
const STUB_VERIFY_EN = 'Detail § not yet on file — confirm with local building authority or Architektenkammer'

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
    brandschutzCitation: STUB_VERIFY_DE,
    permitFreeCitation: STUB_VERIFY_DE,
    denkmalSchutzAct: `Landes-Denkmalschutzgesetz ${labelDe} (${STUB_VERIFY_DE})`,
    denkmalAuthorityDe: `Landesamt für Denkmalpflege ${labelDe}`,
    denkmalAuthorityEn: `State Office for Monument Preservation (${labelEn})`,
    isSubstantive: false,
  }
}

// Marker exported so callers can render an honest-deferral suffix in
// the user-facing locale without re-typing the wording.
export const STUB_VERIFY = { de: STUB_VERIFY_DE, en: STUB_VERIFY_EN }

/**
 * Phase B — overlay corpus-backed §-citation fields onto a pack. A corpus
 * value (heading-verified, scripts/legal-corpus/) wins where present; the
 * pack's hand-coded value stays otherwise. No-op for states absent from the
 * pack (BW / Niedersachsen — heterogeneous terminology, hand-coded). This is
 * how Hessen's § 49→§ 67 / § 66→§ 69 mis-citations get auto-corrected.
 */
function withCorpus(pack: StateCitationPack): StateCitationPack {
  const c = STATE_CORPUS_CITATIONS[pack.bundesland]
  // c carries only present (string) fields (incl. brandschutzCitation); cast
  // back to the required-field pack. permitFreeCitation overlays from the
  // procedure pack's `free` § (single corpus source of truth for verfahrensfrei)
  // — Phase-C item #2 F2. Absent (BW/Niedersachsen) → hand-coded value stays.
  const free = STATE_CORPUS_PROCEDURE[pack.bundesland]?.free
  const overlaid = c ? ({ ...pack, ...c } as StateCitationPack) : pack
  return free ? { ...overlaid, permitFreeCitation: free } : overlaid
}

/**
 * Phase C — adjacent-law short names + monument-authority names for the 11
 * newly-substantive states, replacing the Phase-A/B deferral sentences:
 *  - item #1: official Kurzbezeichnungen of the Bauvorlagen-Verordnung +
 *    Landes-Denkmalschutzgesetz (short tokens → glossary terms no longer
 *    truncate). Provenance in _meta/sources.json (adjacent_laws_phase_c).
 *  - item #2 F4: the official name of each state's monument Fachbehörde,
 *    replacing the generic "Landesamt für Denkmalpflege {Land}" template
 *    (wrong for Berlin/Hamburg/RLP/MV/…). Verified per state against the
 *    authority's own site / state portal (2026-05-27); provenance in
 *    _meta/sources.json (monument_authorities_phase_c). Thüringen renamed
 *    "Thüringisches → Thüringer" (Sept 2025), tier secondary (CAPTCHA wall).
 * The 5 substantive states (Bayern/NRW/BW/Hessen/Niedersachsen) keep their own
 * hand-coded values above and are NOT in this map.
 */
const ADJACENT_LAWS: Partial<
  Record<
    BundeslandCode,
    {
      bauVorlagenAct: string
      denkmalSchutzAct: string
      denkmalAuthorityDe: string
      denkmalAuthorityEn: string
    }
  >
> = {
  berlin: {
    bauVorlagenAct: 'BauVorlV',
    denkmalSchutzAct: 'DSchG Bln',
    denkmalAuthorityDe: 'Landesdenkmalamt Berlin',
    denkmalAuthorityEn: 'Berlin State Monuments Authority (LDA)',
  },
  brandenburg: {
    bauVorlagenAct: 'BbgBauVorlV',
    denkmalSchutzAct: 'BbgDSchG',
    denkmalAuthorityDe:
      'Brandenburgisches Landesamt für Denkmalpflege und Archäologisches Landesmuseum (BLDAM)',
    denkmalAuthorityEn:
      'Brandenburg State Office for Monument Preservation and Archaeological State Museum (BLDAM)',
  },
  bremen: {
    bauVorlagenAct: 'BremBauVorlV',
    denkmalSchutzAct: 'BremDSchG',
    denkmalAuthorityDe: 'Landesamt für Denkmalpflege Bremen',
    denkmalAuthorityEn: 'Bremen State Office for Monument Preservation',
  },
  hamburg: {
    bauVorlagenAct: 'BauVorlVO HH',
    denkmalSchutzAct: 'DSchG HH',
    denkmalAuthorityDe: 'Denkmalschutzamt (Behörde für Kultur und Medien)',
    denkmalAuthorityEn: 'Monument Protection Office (Authority for Culture and Media)',
  },
  mv: {
    bauVorlagenAct: 'BauVorlVO M-V',
    denkmalSchutzAct: 'DSchG M-V',
    denkmalAuthorityDe: 'Landesamt für Kultur und Denkmalpflege Mecklenburg-Vorpommern (LAKD M-V)',
    denkmalAuthorityEn:
      'Mecklenburg-Vorpommern State Office for Culture and Monument Preservation (LAKD M-V)',
  },
  rlp: {
    bauVorlagenAct: 'BauuntPrüfVO',
    denkmalSchutzAct: 'DSchG',
    denkmalAuthorityDe: 'Generaldirektion Kulturelles Erbe Rheinland-Pfalz (GDKE)',
    denkmalAuthorityEn: 'General Directorate for Cultural Heritage Rhineland-Palatinate (GDKE)',
  },
  saarland: {
    bauVorlagenAct: 'BauVorlVO',
    denkmalSchutzAct: 'SDschG',
    denkmalAuthorityDe: 'Landesdenkmalamt Saarland',
    denkmalAuthorityEn: 'Saarland State Monuments Authority',
  },
  sachsen: {
    bauVorlagenAct: 'DVOSächsBO',
    denkmalSchutzAct: 'SächsDSchG',
    denkmalAuthorityDe: 'Landesamt für Denkmalpflege Sachsen (LfD)',
    denkmalAuthorityEn: 'Saxony State Office for Monument Preservation (LfD)',
  },
  'sachsen-anhalt': {
    bauVorlagenAct: 'BauVorlVO',
    denkmalSchutzAct: 'DSchG ST',
    denkmalAuthorityDe: 'Landesamt für Denkmalpflege und Archäologie Sachsen-Anhalt (LDA)',
    denkmalAuthorityEn:
      'Saxony-Anhalt State Office for Monument Preservation and Archaeology (LDA)',
  },
  sh: {
    bauVorlagenAct: 'BauVorlVO',
    denkmalSchutzAct: 'DSchG SH',
    denkmalAuthorityDe: 'Landesamt für Denkmalpflege Schleswig-Holstein',
    denkmalAuthorityEn: 'Schleswig-Holstein State Office for Monument Preservation',
  },
  thueringen: {
    bauVorlagenAct: 'ThürBauVorlVO',
    denkmalSchutzAct: 'ThürDSchG',
    denkmalAuthorityDe: 'Thüringer Landesamt für Denkmalpflege und Archäologie (TLDA)',
    denkmalAuthorityEn: 'Thuringia State Office for Monument Preservation and Archaeology (TLDA)',
  },
}

/**
 * The 11 formerly-stub states carry corpus-verified BauO §§ in both chokepoints
 * (here + stateLocalization.ts) and now real adjacent-law short names (Phase C).
 * Order: makeStub (deferral baseline) → ADJACENT_LAWS (real Bauvorlagen/DSchG
 * short names) → withCorpus (overlays the §-citation fields only). Any field
 * still uncovered keeps the honest STUB_VERIFY deferral — never a fabricated §.
 */
function makeCorpusPack(b: BundeslandCode, labelDe: string, labelEn: string): StateCitationPack {
  return withCorpus({ ...makeStub(b, labelDe, labelEn), isSubstantive: true, ...(ADJACENT_LAWS[b] ?? {}) })
}

const REGISTRY: Record<BundeslandCode, StateCitationPack> = {
  bayern: withCorpus(BAYERN),
  nrw: withCorpus(NRW),
  bw: withCorpus(BW),
  hessen: withCorpus(HESSEN),
  niedersachsen: withCorpus(NIEDERSACHSEN),
  berlin: makeCorpusPack('berlin', 'Berlin', 'Berlin'),
  hamburg: makeCorpusPack('hamburg', 'Hamburg', 'Hamburg'),
  bremen: makeCorpusPack('bremen', 'Bremen', 'Bremen'),
  brandenburg: makeCorpusPack('brandenburg', 'Brandenburg', 'Brandenburg'),
  mv: makeCorpusPack('mv', 'Mecklenburg-Vorpommern', 'Mecklenburg-Western Pomerania'),
  rlp: makeCorpusPack('rlp', 'Rheinland-Pfalz', 'Rhineland-Palatinate'),
  saarland: makeCorpusPack('saarland', 'Saarland', 'Saarland'),
  sachsen: makeCorpusPack('sachsen', 'Sachsen', 'Saxony'),
  'sachsen-anhalt': makeCorpusPack('sachsen-anhalt', 'Sachsen-Anhalt', 'Saxony-Anhalt'),
  sh: makeCorpusPack('sh', 'Schleswig-Holstein', 'Schleswig-Holstein'),
  thueringen: makeCorpusPack('thueringen', 'Thüringen', 'Thuringia'),
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
