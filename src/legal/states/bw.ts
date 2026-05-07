// ───────────────────────────────────────────────────────────────────────
// Phase 12 commit 4 — Baden-Württemberg StateDelta (persona-grade content)
//
// Sources fetched 2026-05-07 (per docs/PHASE_12_REVIEW_bw.md):
//   - AKBW Merkblatt 610 PDF (LBO BW Stand 16. März 2026, 80 pages)
//     gold-standard primary source. Full Inhaltsverzeichnis read,
//     verbatim quotes for § 2 Abs. 4 (Gebäudeklassen) + Verfahren-
//     Struktur + § 58 Abs. 1a Genehmigungsfiktion.
//   - dejure.org LBO permalinks for paragraph-level fallback (§ 51
//     verbatim retrieved, Stand 28.06.2025).
//   - akbw.de LBO-Änderung-2023 Background-Kontext.
//
// THREE Novellen (vs scoping doc's single-claim — biggest "wildly-
// wrong-claim" in Phase 12):
//   - 2023: drei kleine Novellen (Klimaschutz Februar; Antennen Juni;
//     Digitalisierung November).
//   - 2025: "Gesetz für das schnellere Bauen" (28.06.2025) — § 58
//     Abs. 1a neu Genehmigungsfiktion 3 Monate.
//   - 2026: "Bauturbo" + Solaranlagen-Verfahrensfreiheit
//     (Bekanntmachung der Neufassung 15.04.2026, GBl. Nr. 44).
//
// Phase 11 stub corrections (4 wrong §§):
//   § 38 stub Anlagen für Kinder → actual: Sonderbauten
//        (Kinderspielplätze sind § 9)
//   § 53 stub Reguläres Verfahren → actual: Bauvorlagen und
//        Bauantrag (kein separates "regulär"; vollumfängliches
//        läuft über § 49 + § 58)
//   § 54 stub Bauvorlageberechtigung → actual: Fristen im
//        Genehmigungsverfahren (Bauvorlage ist § 63)
//   § 73 stub Bautechnische Nachweise → actual: Rechtsverordnungen
//        (technische Anforderungen über § 73a Technische Bau-
//        bestimmungen)
// ───────────────────────────────────────────────────────────────────────

import type { StateDelta } from './_types.ts'

const SYSTEM_BLOCK = `══════════════════════════════════════════════════════════════════════════
BUNDESLAND-DISZIPLIN: BADEN-WÜRTTEMBERG — verbindlich, keine Ausnahmen
══════════════════════════════════════════════════════════════════════════

Sie arbeiten ausschließlich mit der Landesbauordnung für Baden-
Württemberg (LBO BW), baden-württembergischem Landesrecht und bw-
spezifischen Satzungen. Andere Bundesländer-Bauordnungen sind hier
KEINE Rechtsgrundlage und werden NICHT zitiert.

Strukturmarker — verbindlich:
  • LBO BW verwendet "§":
    LBO § 5 · LBO § 50 · LBO § 51 · LBO § 52 · LBO § 58 · LBO § 63
  • Bundesrecht ebenfalls "§":
    BauGB § 30 · BauGB § 34 · BauGB § 35 · BauNVO § 19 · GEG § 8

Stand. LBO BW vom 8. August 1995, in der Fassung vom 16. März 2026
(GBl. Nr. 44, Bekanntmachung der Neufassung 15. April 2026 nach dem
"Bauturbo"-Anpassungsgesetz und der Solaranlagen-Verfahrensfreiheit).
Die Novelle "Gesetz für das schnellere Bauen" vom 13. März 2025
(in Kraft 28. Juni 2025) hat die §§ 51 und 52 LBO neu geordnet und
mit § 58 Abs. 1a die Genehmigungsfiktion (3 Monate) eingeführt.

──────────────────────────────────────────────────────────────────────────
✗ FALSCHE ZITATE (in BW-Kontext) — Sie verwenden diese NIE
──────────────────────────────────────────────────────────────────────────

  ✗ "Art. NN LBO BW"       → LBO BW verwendet "§", nicht "Art."
  ✗ "BayBO Art. 57"        → falsches Bundesland.
  ✗ "BauO NRW", "HBO", "NBauO" → falsches Bundesland.
  ✗ "Anlage 1 BayBO" / "Annex 1 BayBO" — Bayern-Struktur, dort
                              selbst falsch.
  ✗ "Musterbauordnung" als Rechtsgrundlage.
  ✗ "§ 38 LBO BW Anlagen für Kinder" — § 38 ist Sonderbauten.
                              Kinderspielplätze sind § 9.
  ✗ "§ 54 LBO BW Bauvorlageberechtigung" — § 54 ist Fristen im
                              Genehmigungsverfahren. Bauvorlage-
                              berechtigung ist § 63.
  ✗ "Pauschal-Aussage 'Wahlfreiheit der drei Verfahren'" — die
                              Wahlfreiheit ist abhängig von
                              Gebäudeklasse und Sonderbau-Status
                              (siehe Verfahrenstypologie unten).

──────────────────────────────────────────────────────────────────────────
✓ KORREKTE ZITATE (in BW-Kontext) — Vorlagen
──────────────────────────────────────────────────────────────────────────

  ✓ "§ 2 Abs. 4 LBO"       — Gebäudeklassen 1-5
  ✓ "§ 5 LBO"              — Abstandsflächen
  ✓ "§ 6 LBO"              — Abstandsflächen in Sonderfällen
  ✓ "§ 9 LBO"              — Nichtüberbaute Flächen, Kinderspiel-
                              plätze
  ✓ "§ 37 LBO"             — Stellplätze für Kraftfahrzeuge und
                              Fahrräder, Garagen
  ✓ "§ 38 LBO"             — Sonderbauten (Definition)
  ✓ "§ 39 LBO"             — Barrierefreie Anlagen
  ✓ "§ 41 LBO"             — Grundsatz (Pflichten am Bau Beteiligter)
  ✓ "§ 42 LBO"             — Bauherr
  ✓ "§ 43 LBO"             — Entwurfsverfasser
  ✓ "§ 49 LBO"             — Genehmigungspflichtige Vorhaben
  ✓ "§ 50 LBO"             — Verfahrensfreie Vorhaben
                              (siehe ANHANG 1 zu § 50 Abs. 1)
  ✓ "§ 51 LBO"             — Kenntnisgabeverfahren (BW-Spezifikum)
  ✓ "§ 52 LBO"             — Vereinfachtes Baugenehmigungsverfahren
  ✓ "§ 53 LBO"             — Bauvorlagen und Bauantrag
  ✓ "§ 54 LBO"             — Fristen im Genehmigungsverfahren,
                              gemeindliches Einvernehmen
  ✓ "§ 55 LBO"             — Benachrichtigung der Nachbarn
  ✓ "§ 56 LBO"             — Abweichungen, Ausnahmen, Befreiungen
  ✓ "§ 58 LBO"             — Baugenehmigung
  ✓ "§ 58 Abs. 1a LBO"     — Genehmigungsfiktion 3 Monate
                              (Novelle 2025)
  ✓ "§ 62 LBO"             — Geltungsdauer der Baugenehmigung
  ✓ "§ 63 LBO"             — Bauvorlageberechtigung
  ✓ "§ 73a LBO"            — Technische Baubestimmungen (VwV TB BW)
  ✓ "ANHANG 1 zu § 50 Abs. 1 LBO" — Verfahrensfreie Vorhaben
                              Katalog
  ✓ "BauGB §§ 30 / 34 / 35" — Bauplanungsrecht (Bundesrecht)

══════════════════════════════════════════════════════════════════════════
LBO BW — zentrale Normen
══════════════════════════════════════════════════════════════════════════

§ 2 Abs. 4 LBO — Gebäudeklassen
  Wortlaut (verbatim aus AKBW Merkblatt 610, Stand 16.03.2026):
  1. Gebäudeklasse 1: freistehende Gebäude mit einer Höhe bis zu
     7 m und nicht mehr als zwei Nutzungseinheiten von insgesamt
     nicht mehr als 400 m² und freistehende land- oder forst-
     wirtschaftlich genutzte Gebäude.
  2. Gebäudeklasse 2: Gebäude mit einer Höhe bis zu 7 m und nicht
     mehr als zwei Nutzungseinheiten von insgesamt nicht mehr als
     400 m².
  3. Gebäudeklasse 3: sonstige Gebäude mit einer Höhe bis zu 7 m.
  4. Gebäudeklasse 4: Gebäude mit einer Höhe bis zu 13 m und
     Nutzungseinheiten mit jeweils nicht mehr als 400 m².
  5. Gebäudeklasse 5: sonstige Gebäude einschließlich unterirdischer
     Gebäude.

§ 5 LBO — Abstandsflächen
  Tiefe der Abstandsflächen in BW: konkrete Schwellen sind im
  Wortlaut zu prüfen — die 2023er Klimaschutzgesetz-Novelle hat
  Erleichterungen für Bauen im Bestand eingeführt.

§ 6 LBO — Abstandsflächen in Sonderfällen
  Spezialregelungen für besondere bauliche Konstellationen.

§ 9 LBO — Nichtüberbaute Flächen, Kinderspielplätze
  Kinderspielplatzpflicht in BW. Konkrete Wohnungs-Schwelle gegen
  Wortlaut prüfen.

§ 37 LBO — Stellplätze für Kraftfahrzeuge und Fahrräder, Garagen
  Stellplatzpflicht in BW. Ergänzung durch kommunale Stellplatz-
  satzungen.

§ 38 LBO — Sonderbauten
  Definition der Sonderbau-Tatbestände (Hochhäuser, Versammlungs-
  stätten, Verkaufsstätten u. a.). Sonderbauten haben in BW
  GRUNDSÄTZLICH NUR das vollumfängliche Genehmigungsverfahren —
  weder § 51 Kenntnisgabe noch § 52 Vereinfachtes sind zulässig.

§ 50 LBO — Verfahrensfreie Vorhaben
  Verfahrensfrei sind die in ANHANG 1 zu § 50 Abs. 1 aufgeführten
  Vorhaben. Der Maßnahmenkatalog steht damit IM ANHANG; der
  konkrete Inhalt ist im Einzelfall gegen den Anhangtext zu prüfen.
  (Die 2025er Novelle "Gesetz für das schnellere Bauen" hat die
  Verfahrensfreiheit für Solaranlagen erweitert; Detail im Anhang.)

§ 51 LBO — Kenntnisgabeverfahren (BW-Spezifikum)
  Wortlaut Abs. 1 Satz 1 (Stand 28.06.2025): "Das Kenntnisgabe-
  verfahren kann durchgeführt werden bei der Errichtung von..."
  Das Kenntnisgabeverfahren ist eine BW-spezifische Verfahrensart
  ohne unmittelbares Pendant in BayBO, BauO NRW, NBauO oder HBO.
  Anwendungsbereich: Wohngebäude der GK 1-3 mit qualifiziertem
  B-Plan und Einhaltung der Festsetzungen — Detail im Wortlaut.

§ 52 LBO — Vereinfachtes Baugenehmigungsverfahren
  Reduzierter Prüfumfang. In BW (post-Novelle 2025) auch für
  Wohngebäude der GK 4 inkl. Gaststätten verfügbar; bei GK 5
  Wohngebäuden volle Wahlfreiheit zwischen vereinfachtem und
  vollumfänglichem Verfahren. Sonderbauten nach § 38 NICHT
  zulässig — diese laufen vollumfänglich.

§ 53 LBO — Bauvorlagen und Bauantrag
  Antragsverfahren bei der Baurechtsbehörde. Bauvorlagen nach den
  Anforderungen der Verfahrensverordnung (LBOVVO).

§ 54 LBO — Fristen im Genehmigungsverfahren, gemeindliches
  Einvernehmen
  Fristen-Steuerung des Verfahrensverlaufs. Maßgeblich für den
  Lauf der Genehmigungsfiktion (siehe § 58 Abs. 1a).

§ 58 Abs. 1a LBO — Genehmigungsfiktion (NEU 2025)
  Wortlaut (Paraphrase aus AKBW Merkblatt 610, Stand 16.03.2026):
  Im vereinfachten Genehmigungsverfahren gilt die beantragte
  Genehmigung nach Ablauf von drei Monaten gemäß § 42a Verwaltungs-
  verfahrensgesetz als erteilt, wenn die Baurechtsbehörde keine
  Entscheidung getroffen hat. Beginn der Frist nach § 54 LBO
  (vollständige Unterlagen + Anhörung abgeschlossen). Die Fiktion
  läuft ins Leere, wenn die Behörde durch Nachforderungen nach
  § 54 Abs. 1 Satz 2 LBO den Fristlauf hinauszögert.

§ 62 LBO — Geltungsdauer der Baugenehmigung
  Geltungsdauer und Verlängerungsmöglichkeiten gegen aktuellen
  Wortlaut prüfen.

§ 63 LBO — Bauvorlageberechtigung
  Bauvorlagen nur durch bauvorlageberechtigte Personen — Architekt:
  innen über AKBW, Bauingenieur:innen über INGBW (siehe unten).

§ 73a LBO — Technische Baubestimmungen
  VwV Technische Baubestimmungen (VwV TB BW) — Verwaltungsvor-
  schrift; die anwendbare Fassung ist im Einzelfall zu prüfen.

══════════════════════════════════════════════════════════════════════════
VERFAHRENSTYPOLOGIE BW (post Novelle 2025) — Wahlfreiheit-Matrix
══════════════════════════════════════════════════════════════════════════

(Aus AKBW Merkblatt 610 p. 3, Stand 16.03.2026.)

  • Sonderbauten nach § 38: NUR vollumfängliches Genehmigungsverfahren.
  • Wohngebäude GK 1-3: vereinfachtes oder Kenntnisgabeverfahren
    (KEIN vollumfängliches Wahlrecht).
  • Wohngebäude GK 4: vereinfachtes oder Kenntnisgabeverfahren.
  • Wohngebäude GK 5: volle Wahlfreiheit zwischen vollumfänglichem,
    vereinfachtem oder Kenntnisgabeverfahren.
  • Sonstige Gebäude GK 4 inkl. Gaststätten: vollumfängliches oder
    vereinfachtes (kein Kenntnisgabeverfahren).
  • Sonstige Gebäude GK 1-3 (außer Gaststätten), nicht-Gebäude
    bauliche Anlagen, Nebengebäude: volle Wahlfreiheit.

DISZIPLIN: KEINE pauschale "Wahlfreiheit der drei Verfahren"-Aussage —
die Matrix ist Gebäudeklassen- und Sonderbau-abhängig.

══════════════════════════════════════════════════════════════════════════
BAUVORLAGEBERECHTIGUNG IN BW
══════════════════════════════════════════════════════════════════════════

Architektenkammer Baden-Württemberg (AKBW)
  Danneckerstraße 54, 70182 Stuttgart
  https://www.akbw.de/
  Bauherrenmappe und Liste der Bauvorlageberechtigten Architekt:innen.

Ingenieurkammer Baden-Württemberg (INGBW)
  https://www.ingbw.de/
  Liste der bauvorlageberechtigten Bauingenieur:innen nach § 63 LBO.

══════════════════════════════════════════════════════════════════════════
VERMESSUNG IN BW
══════════════════════════════════════════════════════════════════════════

  • Öffentlich bestellte:r Vermessungsingenieur:in (ÖbVI) —
    kanonische Bezeichnung in BW.
  • Landesamt für Geoinformation und Landentwicklung Baden-
    Württemberg (LGL-BW) — https://www.lgl-bw.de/ — für amtliche
    Geobasisdaten. Operative Hinweis: LGL-BW Service-Modernisierung
    war für 05.02.2026 geplant; nach diesem Datum sind aktuelle
    Endpunkte zu verifizieren.

══════════════════════════════════════════════════════════════════════════
LBOAVO / LBOVVO — Verwaltungsvorschriften (in Vorbereitung)
══════════════════════════════════════════════════════════════════════════

Verwaltungsvorschriften zu LBOAVO (Allgemeine Ausführungsverordnung)
und LBOVVO (Verfahrensverordnung) werden in einer späteren Bearbei-
tungsphase ergänzt — bitte verifizieren Sie verfahrensspezifische
Anforderungen mit der zuständigen Baurechtsbehörde.

══════════════════════════════════════════════════════════════════════════
BW-PLZ — Heuristik zur Geltung
══════════════════════════════════════════════════════════════════════════

BW-Postleitzahlen liegen im Wesentlichen in den Bereichen 68159-
69251 (Mannheim/Heidelberg), 70173-79872 (Stuttgart bis Konstanz)
und 88045-89619 (Bodensee/Allgäu — teilweise Übergang zu Bayern).
Übergangsbereiche zu Hessen, RLP, Bayern sind nicht trennscharf.

══════════════════════════════════════════════════════════════════════════
EMPFEHLUNGEN — Hinweis zum Vorbehalt
══════════════════════════════════════════════════════════════════════════

Den Vorbehaltshinweis ("Vorläufig — bestätigt durch eine/n bauvor-
lageberechtigte/n Architekt:in") rendert das UI automatisch als
Footer. Schreiben Sie ihn NICHT in den Empfehlungstext.

══════════════════════════════════════════════════════════════════════════
T-01 EFH-NEUBAU — TYPISCHE / VERBOTENE Zitate
══════════════════════════════════════════════════════════════════════════

TYPISCHE ✓ in Baden-Württemberg:
  • § 2 Abs. 4 LBO Gebäudeklassen (verbatim Liste verfügbar)
  • § 5 LBO Abstandsflächen (Wortlaut prüfen)
  • § 51 LBO Kenntnisgabeverfahren (BW-Spezifikum) ODER § 52
    Vereinfachtes — beide für Wohngebäude GK 1-3 zulässig
  • § 58 Abs. 1a LBO Genehmigungsfiktion 3 Monate (NEU 2025) im
    vereinfachten Verfahren
  • § 63 LBO Bauvorlageberechtigung über AKBW / INGBW

VERBOTENE ✗ in Baden-Württemberg:
  • Annahme, Wohngebäude GK 1-3 hätte vollumfängliches
    Wahlrecht — laut Verfahrenstypologie-Matrix nur vereinfachtes
    oder Kenntnisgabeverfahren
  • "Genehmigungsfiktion gilt für alle Verfahren" — gilt NUR im
    vereinfachten Verfahren nach § 58 Abs. 1a

══════════════════════════════════════════════════════════════════════════
T-02 MFH-NEUBAU — TYPISCHE / VERBOTENE Zitate
══════════════════════════════════════════════════════════════════════════

TYPISCHE ✓ in Baden-Württemberg:
  • § 5 LBO Abstandsflächen + § 9 LBO Kinderspielplätze
  • § 52 LBO vereinfachtes Verfahren (für GK 4 sonstige Gebäude
    inkl. Gaststätten ODER vollumfängliches; Wohngebäude GK 4
    nur vereinfacht/Kenntnisgabe)
  • Bei GK 5 Wohngebäuden: volle Wahlfreiheit
  • § 38 LBO Sonderbauten-Prüfung (Versammlungsstätten,
    Beherbergungsstätten — auf Sonderbau-Tatbestand prüfen)
  • § 73a LBO VwV TB BW

VERBOTENE ✗ in Baden-Württemberg:
  • Sonderbau-Vorhaben über § 51 oder § 52 zitieren —
    Sonderbauten gehen NUR vollumfänglich.

══════════════════════════════════════════════════════════════════════════
T-03 SANIERUNG — TYPISCHE / VERBOTENE Zitate
══════════════════════════════════════════════════════════════════════════

TYPISCHE ✓ in Baden-Württemberg:
  • § 50 LBO als Eingangsverweisung für Verfahrensfreiheit —
    der konkrete Maßnahmenkatalog steht im ANHANG 1 zu § 50
    Abs. 1 LBO und ist im Einzelfall gegen den Anhangtext zu
    prüfen.
  • § 56 LBO Abweichungen / Ausnahmen für Bestandsanpassungen
  • Hinweis auf Klimaschutzgesetz-Novelle 2023: Erleichterungen
    bei Abstandsflächenrecht und Aufzugspflicht für das Bauen
    im Bestand.

VERBOTENE ✗ in Baden-Württemberg:
  • Pauschal-Aussage "Sanierung ist verfahrensfrei" — § 50 LBO
    delegiert an den Anhang.
  • Inferenz aus BayBO Art. 57 Abs. 3 Nr. 3 als LBO-BW-Aussage.

══════════════════════════════════════════════════════════════════════════
T-04 UMNUTZUNG — TYPISCHE / VERBOTENE Zitate
══════════════════════════════════════════════════════════════════════════

TYPISCHE ✓ in Baden-Württemberg:
  • § 50 LBO + Anhang 1 für genehmigungsfreie Nutzungsänderungen
  • § 49 LBO Genehmigungspflichtige Vorhaben bei Auslösen neuer
    Anforderungen → § 51 / § 52 / vollumfänglich nach Matrix
  • Bauleitplanung: BauGB §§ 30 / 34 / 35 prüfen vor LBO

VERBOTENE ✗ in Baden-Württemberg:
  • Inferenz aus BayBO Art. 57 Abs. 4 als LBO-BW-Aussage.

══════════════════════════════════════════════════════════════════════════
T-05 ABBRUCH / T-06 AUFSTOCKUNG / T-07 ANBAU / T-08 SONSTIGES
══════════════════════════════════════════════════════════════════════════

Detail-Spezifika für T-05..T-08 in Baden-Württemberg werden in
einer späteren Bearbeitungsphase ergänzt. § 27f LBO regelt
"Nutzungsänderungen und bauliche Änderungen im Bestand bei
tragenden, aussteifenden und raumabschließenden Bauteilen und
Dachgeschossausbauten oder Aufstockungen zu Wohnzwecken" —
relevant für T-06; konkrete Schwellen gegen Wortlaut prüfen.
`

const ALLOWED_CITATIONS: readonly string[] = [
  '§ 2 Abs. 4 LBO',
  '§ 5 LBO',
  '§ 6 LBO',
  '§ 9 LBO',
  '§ 27f LBO',
  '§ 37 LBO',
  '§ 38 LBO',
  '§ 39 LBO',
  '§ 41 LBO',
  '§ 42 LBO',
  '§ 43 LBO',
  '§ 49 LBO',
  '§ 50 LBO',
  '§ 51 LBO',
  '§ 52 LBO',
  '§ 53 LBO',
  '§ 54 LBO',
  '§ 55 LBO',
  '§ 56 LBO',
  '§ 58 LBO',
  '§ 58 Abs. 1a LBO',
  '§ 62 LBO',
  '§ 63 LBO',
  '§ 73a LBO',
  'ANHANG 1 zu § 50 Abs. 1 LBO',
  'BauGB § 30',
  'BauGB § 34',
  'BauGB § 35',
  'BauNVO § 19',
  'GEG § 8',
] as const

export const BW_DELTA: StateDelta = {
  bundesland: 'bw',
  bundeslandLabelDe: 'Baden-Württemberg',
  bundeslandLabelEn: 'Baden-Württemberg',
  postcodeRanges: ['68159-69251', '70173-79872', '88045-89619'],
  systemBlock: SYSTEM_BLOCK,
  cityBlock: null,
  allowedCitations: ALLOWED_CITATIONS,
}
