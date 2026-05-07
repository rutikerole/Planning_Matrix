// ───────────────────────────────────────────────────────────────────────
// Phase 11 commit 2 — Hessen StateDelta stub
//
// Article-number scaffolding only. No persona prose. Persona-grade
// content lands in Phase 12.
// ───────────────────────────────────────────────────────────────────────

import type { StateDelta } from './_types.ts'

const SYSTEM_BLOCK = `══════════════════════════════════════════════════════════════════════════
BUNDESLAND-DISZIPLIN: HESSEN — strukturelle Eckdaten
══════════════════════════════════════════════════════════════════════════

Hinweis. Detail-Spezifika für Hessen werden in einer späteren
Bearbeitungsphase ergänzt. Aktuelle Empfehlungen orientieren sich
an den unten aufgeführten Strukturmarken sowie an MBO-Defaults.

LBO. HBO (Hessische Bauordnung).
     Strukturmarker: § (Paragraph) — wie Bundesrecht.
     Stand: HBO Fassung 2018, novelliert 2020.

VERFAHRENSTYPEN.
  § 63 HBO       Genehmigungsfreie Vorhaben
  § 64 HBO       Vereinfachtes Baugenehmigungsverfahren
  § 65 HBO       Reguläres Baugenehmigungsverfahren
  § 67 HBO       Sonderbauten

ZENTRALE PARAGRAPHEN.
  § 6 HBO        Abstandsflächen
  § 52 HBO       Stellplätze, Abstellplätze, Garagen
  § 2 Abs. 8 HBO Gebäudeklassen
  § 49 HBO       Bauvorlageberechtigung
  § 56 HBO       Bautechnische Nachweise
  § 78 HBO       Genehmigungsfreistellung

BAUVORLAGEBERECHTIGUNG.
  Architekten- und Stadtplanerkammer Hessen (AKH)
  https://www.akh.de/
  Eintragung in die Liste der Bauvorlageberechtigten erforderlich.
  Ingenieurkammer Hessen (IngKH) — https://www.ingkh.de/

VERMESSUNG.
  Öffentlich bestellte:r Vermessungsingenieur:in (ÖbVI) — kanonische
  Bezeichnung in Hessen für hoheitliche Vermessungsleistungen.
  Daneben: Hessische Verwaltung für Bodenmanagement und
  Geoinformation (HVBG) für amtliche Geobasisdaten.
`

const ALLOWED_CITATIONS: readonly string[] = [
  '§ 2 Abs. 8 HBO',
  '§ 6 HBO',
  '§ 49 HBO',
  '§ 52 HBO',
  '§ 56 HBO',
  '§ 63 HBO',
  '§ 64 HBO',
  '§ 65 HBO',
  '§ 67 HBO',
  '§ 78 HBO',
] as const

export const HESSEN_DELTA: StateDelta = {
  bundesland: 'hessen',
  bundeslandLabelDe: 'Hessen',
  bundeslandLabelEn: 'Hesse',
  // Approximate Bundesland-PLZ-Heuristik. Übergangsbereiche zu BW /
  // RLP / NRW / Niedersachsen / Bayern / Thüringen nicht trennscharf.
  postcodeRanges: ['34117-36469', '60306-61381', '63450-65929'],
  systemBlock: SYSTEM_BLOCK,
  cityBlock: null,
  allowedCitations: ALLOWED_CITATIONS,
}
