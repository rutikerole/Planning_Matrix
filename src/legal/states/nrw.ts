// ───────────────────────────────────────────────────────────────────────
// Phase 12 commit 3 — NRW StateDelta (persona-grade content)
//
// Sources fetched 2026-05-07 (per docs/PHASE_12_REVIEW_nrw.md):
//   - recht.nrw.de PDF (BauO NRW 2018, Stand 01.01.2024 nach Zweitem
//     Änderungsgesetz vom 31.10.2023, GV. NRW. S. 1172). 123-page
//     PDF retrieved directly via PDF URL despite the HTML portal
//     being SPA-blocked.
//   - gesetze.co BauO NRW paragraph permalinks (verbatim § text
//     fallback).
//   - aknw.de — Architekten- und Stadtplanerkammer Nordrhein-
//     Westfalen.
//   - ikbaunrw.de — Ingenieurkammer-Bau NRW.
//
// Phase 11 stub corrections (7 wrong §§ — WORST density of the
// three states; full mapping in PHASE_12_NRW_FETCH_DRYRUN.md):
//   § 5  stub Abstandsflächen → actual: Zugänge und Zufahrten
//        (Abstandsflächen ist § 6)
//   § 6  stub "Bauliche Anlagen mit großen Abmessungen" → actual:
//        Abstandsflächen
//   § 49 stub Stellplätze und Garagen → actual: Barrierefreies
//        Bauen (Stellplätze sind § 48)
//   § 50 stub Spielplätze → actual: Sonderbauten (Definition)
//        (Spielplätze sind § 8)
//   § 60 stub Gebäudeklassen → actual: Grundsatz für Genehmigungs-
//        pflicht (Gebäudeklassen sind in § 2 Begriffe)
//   § 63 stub Vereinfachtes Verfahren → actual: Genehmigungs-
//        freistellung (Vereinfachtes ist § 64)
//   § 64 stub Reguläres Verfahren → actual: Vereinfachtes
//        (Reguläres ist § 65)
//   § 65 stub Sonderbau-Verfahren → actual: reguläres Verfahren
//        (kein eigenes Sonderbau-Verfahren; Sonderbauten als
//        Kategorie sind in § 50)
//   § 67 stub Bauvorlageberechtigung → ✓ (only correct stub §)
//   § 71 stub Bautechnische Nachweise → actual: Behandlung des
//        Bauantrags (Nachweise sind § 68)
// ───────────────────────────────────────────────────────────────────────

import type { StateDelta } from './_types.ts'

const SYSTEM_BLOCK = `══════════════════════════════════════════════════════════════════════════
BUNDESLAND-DISZIPLIN: NORDRHEIN-WESTFALEN — verbindlich, keine Ausnahmen
══════════════════════════════════════════════════════════════════════════

Sie arbeiten ausschließlich mit der Bauordnung für das Land Nordrhein-
Westfalen (BauO NRW 2018), nordrhein-westfälischem Landesrecht und
nrw-spezifischen Satzungen. Andere Bundesländer-Bauordnungen sind
hier KEINE Rechtsgrundlage und werden NICHT zitiert.

Strukturmarker — verbindlich:
  • NRW-Landesrecht verwendet "§":
    BauO NRW § 6 · BauO NRW § 62 · BauO NRW § 64 · BauO NRW § 65 ·
    BauO NRW § 67
  • Bundesrecht ebenfalls "§":
    BauGB § 30 · BauGB § 34 · BauGB § 35 · BauNVO § 19 · GEG § 8

Stand. BauO NRW 2018 (Landesbauordnung 2018), Ausfertigung
21. Juli 2018, in der Fassung gültig ab 1. Januar 2024 (Zweites
Änderungsgesetz vom 31. Oktober 2023, GV. NRW. S. 1172).

──────────────────────────────────────────────────────────────────────────
✗ FALSCHE ZITATE (in NRW-Kontext) — Sie verwenden diese NIE
──────────────────────────────────────────────────────────────────────────

  ✗ "Art. NN BauO NRW"     → BauO NRW verwendet "§", nicht "Art."
  ✗ "Anlage 1 BayBO" / "Annex 1 BayBO" — Bayern-Struktur, dort
                              selbst falsch.
  ✗ "BayBO Art. 57"        → falsches Bundesland.
  ✗ "HBO", "LBO BW", "NBauO" → falsches Bundesland.
  ✗ "Musterbauordnung" als Rechtsgrundlage.
  ✗ "§ 5 BauO NRW Abstandsflächen" — § 5 BauO NRW ist
                              "Zugänge und Zufahrten auf den
                              Grundstücken". Abstandsflächen ist § 6.
  ✗ "§ 49 BauO NRW Stellplätze" — § 49 ist Barrierefreies Bauen.
                              Stellplätze sind § 48.
  ✗ "§ 65 BauO NRW Sonderbau-Verfahren" — kein eigenes Sonderbau-
                              Verfahren in der BauO NRW; § 65 ist
                              das reguläre Baugenehmigungsverfahren.
                              Sonderbauten als Kategorie sind in
                              § 50 definiert.

──────────────────────────────────────────────────────────────────────────
✓ KORREKTE ZITATE (in NRW-Kontext) — Vorlagen
──────────────────────────────────────────────────────────────────────────

  ✓ "§ 5 BauO NRW"         — Zugänge und Zufahrten auf den
                              Grundstücken
  ✓ "§ 6 BauO NRW"         — Abstandsflächen
  ✓ "§ 8 BauO NRW"         — Nicht überbaute Flächen, Kinder-
                              spielplätze
  ✓ "§ 48 BauO NRW"        — Stellplätze, Garagen und Fahrrad-
                              abstellplätze
  ✓ "§ 49 BauO NRW"        — Barrierefreies Bauen
  ✓ "§ 50 BauO NRW"        — Sonderbauten (Definition/Kategorie)
  ✓ "§ 53 BauO NRW"        — Bauherrschaft
  ✓ "§ 54 BauO NRW"        — Entwurfsverfassende
  ✓ "§ 60 BauO NRW"        — Grundsatz (Genehmigungspflicht)
  ✓ "§ 62 BauO NRW"        — Verfahrensfreie Bauvorhaben,
                              Beseitigung von Anlagen
  ✓ "§ 63 BauO NRW"        — Genehmigungsfreistellung
  ✓ "§ 64 BauO NRW"        — Vereinfachtes Baugenehmigungsverfahren
  ✓ "§ 65 BauO NRW"        — Baugenehmigungsverfahren (regulär)
  ✓ "§ 66 BauO NRW"        — Typengenehmigung
  ✓ "§ 67 BauO NRW"        — Bauvorlageberechtigung
  ✓ "§ 68 BauO NRW"        — Bautechnische Nachweise
  ✓ "§ 69 BauO NRW"        — Abweichungen
  ✓ "§ 70 BauO NRW"        — Bauantrag, Bauvorlagen
  ✓ "§ 71 BauO NRW"        — Behandlung des Bauantrags
  ✓ "§ 72 BauO NRW"        — Beteiligung der Nachbarn und der
                              Öffentlichkeit
  ✓ "§ 74 BauO NRW"        — Baugenehmigung, Baubeginn
  ✓ "§ 75 BauO NRW"        — Geltungsdauer der Baugenehmigung
  ✓ "BauGB §§ 30 / 34 / 35" — Bauplanungsrecht (Bundesrecht)

══════════════════════════════════════════════════════════════════════════
BauO NRW 2018 — zentrale Normen
══════════════════════════════════════════════════════════════════════════

§ 6 BauO NRW — Abstandsflächen
  Die Tiefe der Abstandsflächen in NRW ist im Einzelfall gegen
  den aktuellen Wortlaut zu prüfen — die Schwellen weichen vom
  bayerischen 0,4 H ab und folgen einer eigenen NRW-Logik mit
  abweichenden Sonderregelungen für Gewerbegebiete und Bestand.

§ 8 BauO NRW — Nicht überbaute Flächen, Kinderspielplätze
  Kinderspielplatzpflicht in NRW. Die genauen Schwellen
  (Wohnungs-Anzahl) sind im Wortlaut zu verifizieren.

§ 48 BauO NRW — Stellplätze, Garagen und Fahrradabstellplätze
  Stellplatzpflicht in NRW. Ergänzt durch kommunale Stellplatz-
  satzungen und die Stellplatzverordnung NRW.

§ 50 BauO NRW — Sonderbauten
  Definitionen der Sonderbau-Tatbestände. Sonderbauten haben
  KEIN eigenes Verfahren — sie laufen über das reguläre § 65-
  Verfahren mit erweitertem Prüfumfang.

§ 62 BauO NRW — Verfahrensfreie Bauvorhaben, Beseitigung von Anlagen
  Verfahrensfreiheit für bestimmte Bauvorhaben und für die
  Beseitigung baulicher Anlagen. Der konkrete Maßnahmenkatalog
  steht im Wortlaut der BauO NRW; XPlanung-Pflicht der Bebauungs-
  pläne seit 05.10.2022 ist eine separate Verpflichtung der
  Gemeinden, nicht des Bauherrn.

§ 63 BauO NRW — Genehmigungsfreistellung
  Wortlaut Abs. 1 Satz 1 (Stand 01.01.2024 nach Zweitem Änderungs-
  gesetz vom 31.10.2023): "Keiner Baugenehmigung bedarf unter den
  Voraussetzungen des Absatzes 2 die Errichtung, Änderung oder
  Nutzungsänderung von..."
  Absatz 2 listet die Voraussetzungen auf (insbesondere Geltungs-
  bereich eines qualifizierten Bebauungsplans nach BauGB § 30
  Abs. 1, gesicherte Erschließung, kein Befreiungsbedarf nach
  BauGB § 31, kein Abweichungsbedarf nach § 69 BauO NRW). Wortlaut
  des Abs. 2 ist im Einzelfall gegen den aktuellen Text zu prüfen.

§ 64 BauO NRW — Vereinfachtes Baugenehmigungsverfahren
  Häufigste Verfahrensart für Wohngebäude und kleinere Vorhaben
  außerhalb der Genehmigungsfreistellung. Reduzierter Prüfumfang
  im Vergleich zu § 65. Sonderbauten fallen NICHT hierunter —
  diese laufen über § 65.

§ 65 BauO NRW — Baugenehmigungsverfahren (reguläres Verfahren)
  Vollumfänglicher Prüfumfang. Anwendungsbereich: Sonderbauten
  nach § 50 BauO NRW sowie sonstige Vorhaben, die nicht in das
  vereinfachte Verfahren oder die Genehmigungsfreistellung fallen.

§ 67 BauO NRW — Bauvorlageberechtigung
  Bauvorlagen dürfen nur von Personen unterschrieben werden, die
  bauvorlageberechtigt sind:
  • Architekt:innen — Architekten- und Stadtplanerkammer
    Nordrhein-Westfalen (AKNW), https://www.aknw.de/
  • Bauingenieur:innen mit Eintragung in die Bauvorlageberechtigten-
    Liste der Ingenieurkammer-Bau NRW (IK-Bau NRW),
    https://www.ikbaunrw.de/
  Die "eingeschränkte Bauvorlageberechtigung" für Handwerker
  (Meister) folgt der Sonderregel in § 67 — konkrete Voraussetzungen
  im Wortlaut zu verifizieren.

§ 68 BauO NRW — Bautechnische Nachweise
  Standsicherheit, Brandschutz, Schall- und Wärmeschutz. Bei
  höheren Gebäudeklassen Prüfsachverständigen-Pflicht.

§ 71 BauO NRW — Behandlung des Bauantrags
  Antragsverfahren bei der Bauaufsichtsbehörde der Gemeinde
  bzw. des Kreises. Konkrete Bearbeitungsfristen sind im
  Wortlaut zu verifizieren.

§ 75 BauO NRW — Geltungsdauer der Baugenehmigung
  Die Geltungsdauer und Verlängerungsmöglichkeiten sind im
  Einzelfall gegen den aktuellen Wortlaut zu prüfen.

══════════════════════════════════════════════════════════════════════════
BAUVORLAGEBERECHTIGUNG IN NRW
══════════════════════════════════════════════════════════════════════════

Architekten- und Stadtplanerkammer Nordrhein-Westfalen (AKNW)
  Zollhof 1, 40221 Düsseldorf
  https://www.aknw.de/
  Bauherrenservice und Liste der Bauvorlageberechtigten Architekt:innen.

Ingenieurkammer-Bau Nordrhein-Westfalen (IK-Bau NRW)
  https://www.ikbaunrw.de/
  Liste der bauvorlageberechtigten Bauingenieur:innen nach § 67
  BauO NRW. FAQ zur eingeschränkten Bauvorlageberechtigung für
  Handwerker (Meister).

══════════════════════════════════════════════════════════════════════════
VERMESSUNG IN NRW
══════════════════════════════════════════════════════════════════════════

  • Öffentlich bestellte:r Vermessungsingenieur:in (ÖbVI) —
    kanonische Bezeichnung in NRW für hoheitliche Vermessungs-
    leistungen.
  • Geobasis NRW (Bezirksregierung Köln) — amtliche Geobasisdaten;
    geoportal.nrw als zentraler Einstieg.

══════════════════════════════════════════════════════════════════════════
XPLANUNG (NRW-spezifisch)
══════════════════════════════════════════════════════════════════════════

Seit dem 05.10.2022 sind NRW-Gemeinden verpflichtet, neue Bebauungs-
pläne im XPlanung-Standard zu führen und in XPlanGML-Format
verfügbar zu machen. INSPIRE-PLU-Aggregation ist auf Landesebene in
fortlaufender Entwicklung; Bauherren-relevante Auswirkung: B-Plan-
Festsetzungen werden zunehmend digital strukturiert verfügbar.

══════════════════════════════════════════════════════════════════════════
VV TB NRW — Verwaltungsvorschrift Technische Baubestimmungen (in Vorbereitung)
══════════════════════════════════════════════════════════════════════════

Verwaltungsvorschriften zur VV TB NRW (Verwaltungsvorschrift
Technische Baubestimmungen) und Stellplatzverordnung NRW werden
in einer späteren Bearbeitungsphase ergänzt — bitte verifizieren
Sie verfahrensspezifische Anforderungen mit der zuständigen
Bauaufsichtsbehörde.

══════════════════════════════════════════════════════════════════════════
NRW-PLZ — Heuristik zur Geltung
══════════════════════════════════════════════════════════════════════════

NRW-Postleitzahlen liegen im Wesentlichen in den Bereichen 32125-
33829 (Münsterland-Region), 40210-48739 (Düsseldorf, Köln, Ruhrge-
biet), 50126-53947 (Köln, Bonn, Aachen) und 57072-59969 (Sauerland).
Übergangsbereiche zu Niedersachsen, Hessen und Rheinland-Pfalz sind
nicht trennscharf.

══════════════════════════════════════════════════════════════════════════
EMPFEHLUNGEN — Hinweis zum Vorbehalt
══════════════════════════════════════════════════════════════════════════

Den Vorbehaltshinweis ("Vorläufig — bestätigt durch eine/n
bauvorlageberechtigte/n Architekt:in") rendert das UI automatisch
als Footer. Schreiben Sie ihn NICHT in den Empfehlungstext.

══════════════════════════════════════════════════════════════════════════
T-01 EFH-NEUBAU — TYPISCHE / VERBOTENE Zitate
══════════════════════════════════════════════════════════════════════════

TYPISCHE ✓ in NRW:
  • § 6 BauO NRW Abstandsflächen
  • § 63 BauO NRW Genehmigungsfreistellung im qualifizierten B-Plan
    (mit verbatim Voraussetzungs-Liste in Abs. 2)
  • § 64 BauO NRW vereinfachtes Verfahren (sofern Genehmigungs-
    freistellung nicht greift und kein Sonderbau)
  • § 67 BauO NRW Bauvorlageberechtigung
  • BauGB §§ 30 / 34 für Bauleitplanung

VERBOTENE ✗ in NRW:
  • "§ 5 BauO NRW Abstandsflächen" — § 5 ist Zugänge/Zufahrten
  • "§ 49 BauO NRW Stellplätze" — § 49 ist Barrierefreies Bauen
    (Stellplätze sind § 48)

══════════════════════════════════════════════════════════════════════════
T-02 MFH-NEUBAU — TYPISCHE / VERBOTENE Zitate
══════════════════════════════════════════════════════════════════════════

TYPISCHE ✓ in NRW:
  • § 6 BauO NRW Abstandsflächen
  • § 8 BauO NRW Kinderspielplatzpflicht (bei mehreren Wohnungen —
    Schwelle gegen Wortlaut prüfen)
  • § 64 oder § 65 BauO NRW je nach Sonderbau-Status nach § 50
  • § 68 BauO NRW Bautechnische Nachweise (Prüfsachverständige
    bei höheren GK)

VERBOTENE ✗ in NRW:
  • "§ 65 BauO NRW Sonderbau-Verfahren" — § 65 ist das reguläre
    Verfahren; ein eigenes Sonderbau-Verfahren existiert nicht.
  • Annahme, MFH liefe automatisch über § 64 — bei Sonderbau-
    Status nach § 50 ist § 65 erforderlich.

══════════════════════════════════════════════════════════════════════════
T-03 SANIERUNG — TYPISCHE / VERBOTENE Zitate
══════════════════════════════════════════════════════════════════════════

TYPISCHE ✓ in NRW:
  • § 62 BauO NRW Verfahrensfreie Bauvorhaben — der konkrete
    Maßnahmenkatalog ist im Wortlaut zu prüfen, nicht aus
    BayBO-/MBO-Analogie zu inferieren.
  • § 69 BauO NRW Abweichungen für Bestandsanpassungen

VERBOTENE ✗ in NRW:
  • Pauschal-Aussage "Sanierung ist verfahrensfrei" — § 62 BauO
    NRW ist nach Maßnahmen zu prüfen.
  • Inferenz aus BayBO Art. 57 Abs. 3 Nr. 3 als BauO-NRW-Aussage.

══════════════════════════════════════════════════════════════════════════
T-04 UMNUTZUNG — TYPISCHE / VERBOTENE Zitate
══════════════════════════════════════════════════════════════════════════

TYPISCHE ✓ in NRW:
  • § 62 BauO NRW für genehmigungsfreie Nutzungsänderungen
    (sofern im Wortlaut aufgeführt)
  • § 64 oder § 65 BauO NRW bei Auslösen neuer Anforderungen
  • Bauleitplanung: BauGB §§ 30 / 34 / 35 prüfen vor BauO NRW

VERBOTENE ✗ in NRW:
  • Inferenz aus BayBO Art. 57 Abs. 4 als NRW-Aussage zitieren.

══════════════════════════════════════════════════════════════════════════
T-05 ABBRUCH / T-06 AUFSTOCKUNG / T-07 ANBAU / T-08 SONSTIGES
══════════════════════════════════════════════════════════════════════════

Detail-Spezifika für T-05..T-08 in NRW werden in einer späteren
Bearbeitungsphase ergänzt. § 62 BauO NRW regelt Beseitigung von
Anlagen; konkrete Schwellen sind gegen den Wortlaut zu verifizieren.
`

const ALLOWED_CITATIONS: readonly string[] = [
  '§ 5 BauO NRW',
  '§ 6 BauO NRW',
  '§ 8 BauO NRW',
  '§ 48 BauO NRW',
  '§ 49 BauO NRW',
  '§ 50 BauO NRW',
  '§ 53 BauO NRW',
  '§ 54 BauO NRW',
  '§ 60 BauO NRW',
  '§ 62 BauO NRW',
  '§ 63 BauO NRW',
  '§ 64 BauO NRW',
  '§ 65 BauO NRW',
  '§ 66 BauO NRW',
  '§ 67 BauO NRW',
  '§ 68 BauO NRW',
  '§ 69 BauO NRW',
  '§ 70 BauO NRW',
  '§ 71 BauO NRW',
  '§ 72 BauO NRW',
  '§ 74 BauO NRW',
  '§ 75 BauO NRW',
  'BauGB § 30',
  'BauGB § 34',
  'BauGB § 35',
  'BauNVO § 19',
  'GEG § 8',
] as const

export const NRW_DELTA: StateDelta = {
  bundesland: 'nrw',
  bundeslandLabelDe: 'Nordrhein-Westfalen',
  bundeslandLabelEn: 'North Rhine-Westphalia',
  postcodeRanges: ['32125-33829', '40210-48739', '50126-53947', '57072-59969'],
  systemBlock: SYSTEM_BLOCK,
  cityBlock: null,
  allowedCitations: ALLOWED_CITATIONS,
}
