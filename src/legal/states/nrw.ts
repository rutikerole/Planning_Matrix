// ───────────────────────────────────────────────────────────────────────
// Phase 11 commit 2 — Nordrhein-Westfalen StateDelta stub
//
// Article-number scaffolding only. No persona prose. Persona-grade
// content lands in Phase 12.
// ───────────────────────────────────────────────────────────────────────

import type { StateDelta } from './_types.ts'

const SYSTEM_BLOCK = `══════════════════════════════════════════════════════════════════════════
BUNDESLAND-DISZIPLIN: NORDRHEIN-WESTFALEN — strukturelle Eckdaten
══════════════════════════════════════════════════════════════════════════

Hinweis. Detail-Spezifika für Nordrhein-Westfalen werden in einer
späteren Bearbeitungsphase ergänzt. Aktuelle Empfehlungen orientieren
sich an den unten aufgeführten Strukturmarken sowie an MBO-Defaults.

LBO. BauO NRW (Bauordnung für das Land Nordrhein-Westfalen).
     Strukturmarker: § (Paragraph) — wie Bundesrecht.
     Stand: BauO NRW Fassung 2018, novelliert zuletzt 2024.

VERFAHRENSTYPEN.
  § 62 BauO NRW   Genehmigungsfreie Vorhaben
  § 63 BauO NRW   Vereinfachtes Baugenehmigungsverfahren
  § 64 BauO NRW   Baugenehmigungsverfahren (regulär)
  § 65 BauO NRW   Sonderbau-Verfahren

ZENTRALE PARAGRAPHEN.
  § 5 BauO NRW    Abstandsflächen
  § 6 BauO NRW    Bauliche Anlagen mit großen Abmessungen
  § 49 BauO NRW   Stellplätze und Garagen
  § 50 BauO NRW   Spielplätze
  § 60 BauO NRW   Gebäudeklassen
  § 67 BauO NRW   Bauvorlageberechtigung
  § 71 BauO NRW   Bautechnische Nachweise

BAUVORLAGEBERECHTIGUNG.
  Architekten- und Stadtplanerkammer Nordrhein-Westfalen (AKNW)
  https://www.aknw.de/
  Eintragung in die Liste der Bauvorlageberechtigten erforderlich.
  Ingenieurkammer-Bau NRW (IK-Bau NRW) — https://www.ikbaunrw.de/

VERMESSUNG.
  Öffentlich bestellte:r Vermessungsingenieur:in (ÖbVI) — kanonische
  Bezeichnung in NRW für hoheitliche Vermessungsleistungen.

XPLANUNG / B-PLAN.
  XPlanung-Pflicht für Bebauungspläne seit 2022-10-05. Aggregation
  über INSPIRE-PLU-Dienste in Aufbau (siehe Phase-15-Notiz).
`

const ALLOWED_CITATIONS: readonly string[] = [
  '§ 5 BauO NRW',
  '§ 6 BauO NRW',
  '§ 49 BauO NRW',
  '§ 50 BauO NRW',
  '§ 60 BauO NRW',
  '§ 62 BauO NRW',
  '§ 63 BauO NRW',
  '§ 64 BauO NRW',
  '§ 65 BauO NRW',
  '§ 67 BauO NRW',
  '§ 71 BauO NRW',
] as const

export const NRW_DELTA: StateDelta = {
  bundesland: 'nrw',
  bundeslandLabelDe: 'Nordrhein-Westfalen',
  bundeslandLabelEn: 'North Rhine-Westphalia',
  // Approximate Bundesland-PLZ-Heuristik. Übergangsbereiche zu
  // Niedersachsen / Hessen / RLP nicht trennscharf.
  postcodeRanges: ['32125-33829', '40210-48739', '50126-53947', '57072-59969'],
  systemBlock: SYSTEM_BLOCK,
  cityBlock: null,
  allowedCitations: ALLOWED_CITATIONS,
}
