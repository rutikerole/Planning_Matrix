// ───────────────────────────────────────────────────────────────────────
// Phase 11 commit 2 — Baden-Württemberg StateDelta stub
//
// Article-number scaffolding only. No persona prose. Persona-grade
// content lands in Phase 12.
// ───────────────────────────────────────────────────────────────────────

import type { StateDelta } from './_types.ts'

const SYSTEM_BLOCK = `══════════════════════════════════════════════════════════════════════════
BUNDESLAND-DISZIPLIN: BADEN-WÜRTTEMBERG — strukturelle Eckdaten
══════════════════════════════════════════════════════════════════════════

Hinweis. Detail-Spezifika für Baden-Württemberg werden in einer
späteren Bearbeitungsphase ergänzt. Aktuelle Empfehlungen orientieren
sich an den unten aufgeführten Strukturmarken sowie an MBO-Defaults.

LBO. LBO BW (Landesbauordnung für Baden-Württemberg).
     Strukturmarker: § (Paragraph) — wie Bundesrecht.
     Stand: LBO BW mit Modernisierungsnovelle 2023.

VERFAHRENSTYPEN.
  § 50 LBO BW    Verfahrensfreie Vorhaben
  § 51 LBO BW    Kenntnisgabeverfahren
  § 52 LBO BW    Vereinfachtes Baugenehmigungsverfahren
  § 53 LBO BW    Reguläres Baugenehmigungsverfahren
  § 54 LBO BW    Bauvorlageberechtigung

ZENTRALE PARAGRAPHEN.
  § 5 LBO BW     Abstandsflächen
  § 37 LBO BW    Stellplätze für Kraftfahrzeuge
  § 38 LBO BW    Anlagen für Kinder
  § 2 Abs. 4 LBO BW  Gebäudeklassen
  § 73 LBO BW    Bautechnische Nachweise

BAUVORLAGEBERECHTIGUNG.
  Architektenkammer Baden-Württemberg (AKBW)
  https://www.akbw.de/
  Eintragung in die Liste der Bauvorlageberechtigten erforderlich.
  Ingenieurkammer Baden-Württemberg (INGBW) — https://www.ingbw.de/

VERMESSUNG.
  Öffentlich bestellte:r Vermessungsingenieur:in (ÖbVI) — kanonische
  Bezeichnung in Baden-Württemberg für hoheitliche Vermessungs-
  leistungen.

KENNTNISGABEVERFAHREN — BW-spezifische Eigenheit.
  Das Kenntnisgabeverfahren nach § 51 LBO BW ist ein BW-spezifisches
  Verfahren ohne unmittelbares Pendant in BayBO oder BauO NRW.
`

const ALLOWED_CITATIONS: readonly string[] = [
  '§ 2 Abs. 4 LBO BW',
  '§ 5 LBO BW',
  '§ 37 LBO BW',
  '§ 38 LBO BW',
  '§ 50 LBO BW',
  '§ 51 LBO BW',
  '§ 52 LBO BW',
  '§ 53 LBO BW',
  '§ 54 LBO BW',
  '§ 73 LBO BW',
] as const

export const BW_DELTA: StateDelta = {
  bundesland: 'bw',
  bundeslandLabelDe: 'Baden-Württemberg',
  bundeslandLabelEn: 'Baden-Württemberg',
  // Approximate Bundesland-PLZ-Heuristik. Übergangsbereiche zu Hessen
  // / RLP / Bayern nicht trennscharf.
  postcodeRanges: ['68159-69251', '70173-79872', '88045-89619'],
  systemBlock: SYSTEM_BLOCK,
  cityBlock: null,
  allowedCitations: ALLOWED_CITATIONS,
}
