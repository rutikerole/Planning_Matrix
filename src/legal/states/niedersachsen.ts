// ───────────────────────────────────────────────────────────────────────
// Phase 11 commit 2 — Niedersachsen StateDelta stub
//
// Article-number scaffolding only. No persona prose. Persona-grade
// content lands in Phase 12.
// ───────────────────────────────────────────────────────────────────────

import type { StateDelta } from './_types.ts'

const SYSTEM_BLOCK = `══════════════════════════════════════════════════════════════════════════
BUNDESLAND-DISZIPLIN: NIEDERSACHSEN — strukturelle Eckdaten
══════════════════════════════════════════════════════════════════════════

Hinweis. Detail-Spezifika für Niedersachsen werden in einer späteren
Bearbeitungsphase ergänzt. Aktuelle Empfehlungen orientieren sich
an den unten aufgeführten Strukturmarken sowie an MBO-Defaults.

LBO. NBauO (Niedersächsische Bauordnung).
     Strukturmarker: § (Paragraph) — wie Bundesrecht.
     Stand: NBauO Fassung 2012, novelliert zuletzt 2022.

VERFAHRENSTYPEN.
  § 60 NBauO     Genehmigungsfreie Vorhaben
  § 62 NBauO     Vereinfachtes Baugenehmigungsverfahren
  § 63 NBauO     Reguläres Baugenehmigungsverfahren
  § 65 NBauO     Sonderbauten

ZENTRALE PARAGRAPHEN.
  § 5 NBauO      Abstandsflächen
  § 47 NBauO     Stellplätze und Garagen
  § 48 NBauO     Spielplätze
  § 2 Abs. 3 NBauO  Gebäudeklassen
  § 53 NBauO     Bauvorlageberechtigung
  § 67 NBauO     Bautechnische Nachweise

BAUVORLAGEBERECHTIGUNG.
  Architektenkammer Niedersachsen (AKNDS)
  https://www.aknds.de/
  Eintragung in die Liste der Bauvorlageberechtigten erforderlich.
  Ingenieurkammer Niedersachsen — https://www.ikn.de/

VERMESSUNG.
  Öffentlich bestellte:r Vermessungsingenieur:in (ÖbVI) — kanonische
  Bezeichnung in Niedersachsen für hoheitliche Vermessungsleistungen.
  Daneben: Landesamt für Geoinformation und Landesvermessung
  Niedersachsen (LGLN) für amtliche Geobasisdaten.
`

const ALLOWED_CITATIONS: readonly string[] = [
  '§ 2 Abs. 3 NBauO',
  '§ 5 NBauO',
  '§ 47 NBauO',
  '§ 48 NBauO',
  '§ 53 NBauO',
  '§ 60 NBauO',
  '§ 62 NBauO',
  '§ 63 NBauO',
  '§ 65 NBauO',
  '§ 67 NBauO',
] as const

export const NIEDERSACHSEN_DELTA: StateDelta = {
  bundesland: 'niedersachsen',
  bundeslandLabelDe: 'Niedersachsen',
  bundeslandLabelEn: 'Lower Saxony',
  // Approximate Bundesland-PLZ-Heuristik. Übergangsbereiche zu Bremen
  // / NRW / Sachsen-Anhalt / Hessen nicht trennscharf.
  postcodeRanges: ['21202-21789', '26122-31867', '37073-37697', '38100-38879', '49074-49849'],
  systemBlock: SYSTEM_BLOCK,
  cityBlock: null,
  allowedCitations: ALLOWED_CITATIONS,
}
