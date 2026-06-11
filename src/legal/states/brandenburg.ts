// ───────────────────────────────────────────────────────────────────────
// Phase 11 commit 3 — Brandenburg minimum stub
//
// MBO-default + "in Vorbereitung" framing. No persona content.
//
// C10 batch (2026-05-28) — seventh Flächenland. allowedCitations
// populated from scripts/legal-corpus/states/brandenburg.json (BbgBO
// Bekanntmachung 15.11.2018 i.d.F. Gesetz v. 28.09.2023 GVBl. I/23
// Nr. 18). 0 primary + 98 mirror via baunormenlexikon.de. NB: § 62
// Bauanzeigeverfahren is BB-specific institute; § 32a Photovoltaik-
// anlagen is the FIRST corpus-captured PV-Pflicht-§ across all states.
// systemBlock REMAINS skeleton — Pass A + Pass C only (Path 2'').
// ───────────────────────────────────────────────────────────────────────

import type { StateDelta } from './_types.ts'
import { buildAntiBayernLeakBlock } from './_antiBayernLeak.ts'

const ANTI_LEAK = buildAntiBayernLeakBlock({
  labelDe: 'Brandenburg',
  labelEn: 'Brandenburg',
  codePrefix: 'BbgBO',
  isSubstantive: false,
})

const SYSTEM_BLOCK = `${ANTI_LEAK}══════════════════════════════════════════════════════════════════════════
BUNDESLAND-DISZIPLIN: BRANDENBURG — Mindest-Eckdaten
══════════════════════════════════════════════════════════════════════════

Hinweis: Detail-Spezifika für Brandenburg werden in einer späteren
Bearbeitungsphase ergänzt. Bis dahin gelten die MBO-Defaults als
Arbeitsgrundlage. Aussagen zu konkreten Paragraphen oder Verfahren
sind ohne ausdrückliche Verifikation durch eine/n bauvorlage-
berechtigte/n Architekt:in nicht belastbar.

LBO. BbgBO (Brandenburgische Bauordnung).
     Strukturmarker: § (Paragraph) — wie Bundesrecht.

DEFAULT-FALLBACK. MBO als Referenzrahmen, soweit projektrelevante
Brandenburg-Spezifika nicht vorliegen.
`

// BB allow-list — every § the C10 BB cell addendums cite, sourced from
// scripts/legal-corpus/states/brandenburg.json. Mostly-standard numbering
// EXCEPT: § 70 Nachweise (vs § 66 standard), § 72 Bauantrag (vs § 68
// standard). BB-specific institutes captured: § 62 Bauanzeigeverfahren,
// § 32a Photovoltaikanlagen für die Stromerzeugung auf Dächern (first
// corpus-captured PV-Pflicht-§ in any state).
// Enforcement / admin omits: § 84 (Einstellung Arbeiten — work-stoppage),
// § 85 (Beseitigung/Nutzungsuntersagung — classic enforcement), § 86
// (Anpassung bestehender baulicher Anlagen — enforcement-adjacent), § 87
// (Bauüberwachung — oversight admin), § 92 (Technische Baubestimmungen —
// admin meta, BW § 73a precedent). Skipped: § 4 (Anwendungsbereich),
// § 66-§ 69 (EU recognition Bauvorlageberechtigung sub-§§), § 73
// (Behandlung Bauantrag), § 74 (Nachbar/Öffentlichkeit-Beteiligung),
// § 80 (Vorbescheid), § 81 (Fliegende Bauten), § 82 (Bauaufsichtliche
// Zustimmung). 4-§ brandschutz spread (heading-evident: § 14+§ 26+§ 30+
// § 33) — only § 14 corpus-tagged (under-tag pattern).
const ALLOWED_CITATIONS: readonly string[] = [
  // BbgBO core §§ (per scripts/legal-corpus/states/brandenburg.json)
  '§ 2 BbgBO',      // Begriffe (Gebäudeklassen)
  '§ 6 BbgBO',      // Abstandsflächen, Abstände
  '§ 12 BbgBO',     // Standsicherheit
  '§ 14 BbgBO',     // Brandschutz
  '§ 26 BbgBO',     // Allg. Anforderungen Brandverhalten Baustoffe/Bauteile
  '§ 30 BbgBO',     // Brandwände
  '§ 32a BbgBO',    // Photovoltaikanlagen für die Stromerzeugung auf Dächern (BB-unique)
  '§ 33 BbgBO',     // Erster und zweiter Rettungsweg
  '§ 49 BbgBO',     // Stellplätze, Garagen, Abstellplätze für Fahrräder
  '§ 51 BbgBO',     // Sonderbauten
  '§ 54 BbgBO',     // Entwurfsverfasserin und Entwurfsverfasser
  '§ 61 BbgBO',     // Genehmigungsfreie Vorhaben
  '§ 62 BbgBO',     // Bauanzeigeverfahren (BB-specific institute)
  '§ 63 BbgBO',     // Vereinfachtes Baugenehmigungsverfahren
  '§ 64 BbgBO',     // Baugenehmigungsverfahren (regulär)
  '§ 65 BbgBO',     // Bauvorlageberechtigung
  '§ 66 BbgBO',     // Bautechnische Nachweise — instructed in stateOverrides (audit:instructed-citations)
  '§ 68 BbgBO',     // Bauantrag, Bauvorlagen — instructed in stateOverrides
  '§ 70 BbgBO',     // Beteiligung der Nachbarn und der Öffentlichkeit (comment was stale: Bautechnische Nachweise = § 66)
  '§ 72 BbgBO',     // Baugenehmigung, Baubeginn (comment was stale: Bauantrag/Bauvorlagen = § 68)
  // Federal (per scripts/legal-corpus/federal.json)
  '§ 30 BauGB',
  '§ 31 BauGB',
  '§ 34 BauGB',
  '§ 35 BauGB',
  '§ 172 BauGB',
  '§ 1 BauNVO',
  '§ 3 BauNVO',
  '§ 4 BauNVO',
  '§ 4a BauNVO',
  '§ 6 BauNVO',
  '§ 9 BauNVO',
  '§ 12 BauNVO',
  '§ 16 BauNVO',
  '§ 19 BauNVO',
  '§ 20 BauNVO',
  '§ 23 BauNVO',
  '§ 10 GEG',
  '§ 48 GEG',
  '§ 80 GEG',
]

export const BRANDENBURG_DELTA: StateDelta = {
  bundesland: 'brandenburg',
  bundeslandLabelDe: 'Brandenburg',
  bundeslandLabelEn: 'Brandenburg',
  postcodeRanges: ['01968-01998', '03044-03253', '14467-16949'],
  systemBlock: SYSTEM_BLOCK,
  cityBlock: null,
  allowedCitations: ALLOWED_CITATIONS,
}
