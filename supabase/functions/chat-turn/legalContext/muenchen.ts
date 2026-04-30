// ───────────────────────────────────────────────────────────────────────
// Phase 5 — legalContext/muenchen.ts
//
// Source of truth: data/muenchen/. Quarterly refresh — re-extract from
// JSON after each refresh of that directory.
//
// Three Phase-4 findings carried as concrete prompt clauses:
//   (1) Stellplatzsatzung StPlS 926 — 17.09.2025 novelliert,
//       in Kraft seit 03.10.2025 (Section 2)
//   (2) Baumschutzverordnung BaumschutzV 901 — 26.11.2025
//       novelliert, in Kraft seit 31.12.2025 — Schwelle von
//       80 cm auf 60 cm Stammumfang gesenkt (Section 3)
//   (3) Gestaltungs- und Begrünungssatzung § 3 — administrativ
//       ausgesetzt seit 30.09.2025; Nachfolge-Regelung in
//       Vorbereitung (Section 4)
//
// WFS-disabled-Befund (Phase 4) ist ein Phase-6-Concern und lebt in
// data/muenchen/bplan-index.json — der Prompt referenziert keine
// Live-API-Verhaltensannahmen.
// ───────────────────────────────────────────────────────────────────────

export const MUENCHEN_BLOCK = `══════════════════════════════════════════════════════════════════════════
MÜNCHEN — Stadtebene (Landeshauptstadt München)
══════════════════════════════════════════════════════════════════════════

In der ersten Produktversion deckt Planning Matrix die Landeshauptstadt
München mit voller Genauigkeit ab — Postleitzahlen-Bereich 80331 bis
81929 (insgesamt rund 70 Münchner PLZ über die 25 Stadtbezirke).
Adressen außerhalb dieses PLZ-Bereichs werden Sie ehrlich behandeln:
Sie nennen die zugehörige Bayern-Regelung allgemein, aber sagen offen,
dass die spezifische kommunale Satzung für die andere Gemeinde nicht
im Datensatz vorliegt.

══════════════════════════════════════════════════════════════════════════
BAUAUFSICHTSBEHÖRDE — Referat für Stadtplanung und Bauordnung
══════════════════════════════════════════════════════════════════════════

Offizieller Name: „Referat für Stadtplanung und Bauordnung —
Hauptabteilung II — Stadtplanung". Verwenden Sie diesen Namen wörtlich,
oder den Kurzbegriff „Referat für Stadtplanung und Bauordnung der
Landeshauptstadt München" — niemals „Bauamt München" generisch und
niemals „Bauaufsichtsamt der Stadt München" (anders als Erlangen heißt
die Münchner Stelle nicht so).

Zentrale Adresse: Blumenstraße 28b, 80331 München
Zentrales Telefon: 089 233-28474 (alternativ 089 233-23576)
Zentrale E-Mail: plan.ha2@muenchen.de
Öffnungszeiten zentral: Montag–Donnerstag 09:30–15:00 Uhr,
Freitag 09:30–12:00 Uhr (persönliche Termine grundsätzlich nur nach
vorheriger Vereinbarung).

DREI BEGUTACHTUNGS-STELLEN — nach Stadtbezirk-Routing
─────────────────────────────────────────────────────

München teilt die Bauantrags-Bearbeitung auf drei Sub-Bauämter
auf, geroutet nach Stadtbezirk-Nummer. Wenn der Stadtbezirk aus
der Adresse ableitbar ist, nennen Sie das zuständige Sub-Bauamt
mit Email + Telefon. Wenn nicht, fragen Sie nach.
Erfinden Sie keine Sub-Bauamt-Zuordnung.

  • Begutachtung Bezirk MITTE — Stadtbezirke 1–9 + 25
    (Altstadt-Lehel, Ludwigsvorstadt-Isarvorstadt, Maxvorstadt,
    Schwabing-West, Au-Haidhausen, Sendling, Sendling-Westpark,
    Schwanthalerhöhe, Neuhausen-Nymphenburg, Laim)
    E-Mail: plan.ha2-24b@muenchen.de
    Telefon: 089 233 22550 (alternativ 089 233 26127)

  • Begutachtung Bezirk OST — Stadtbezirke 13–19
    (Bogenhausen, Berg am Laim, Trudering-Riem,
    Ramersdorf-Perlach, Obergiesing-Fasangarten,
    Untergiesing-Harlaching, Thalkirchen-Obersendling-Forstenried-
    Fürstenried-Solln)
    E-Mail: plan.ha2-34b@muenchen.de
    Telefon: 089 233 22038 (alternativ 089 233 27161)

  • Begutachtung Bezirk WEST — Stadtbezirke 10–12 + 20–24
    (Moosach, Milbertshofen-Am Hart, Schwabing-Freimann, Hadern,
    Pasing-Obermenzing, Aubing-Lochhausen-Langwied,
    Allach-Untermenzing, Feldmoching-Hasenbergl)
    E-Mail: plan.ha2-44b@muenchen.de
    Telefon: 089 233 22095

Online-Bauantrag: BayernPortal-Assistent (offizielle e-Government-
Strecke des Freistaats für die Bauantragstellung). Plan-Portal
(interaktive Karte aller Bebauungspläne) unter
https://geoportal.muenchen.de/portal/plan/.

══════════════════════════════════════════════════════════════════════════
STELLPLATZSATZUNG — StPlS 926 (NEUE FASSUNG seit Oktober 2025)
══════════════════════════════════════════════════════════════════════════

Die Münchner Stellplatzsatzung wurde mit Stadtratsbeschluss vom
17.09.2025 novelliert und ist in dieser Fassung seit 03.10.2025 in
Kraft (StPlS 926). Die folgenden Werte sind für Bauanträge ab
diesem Stichtag verbindlich; die ältere Fassung 19.12.2007 ist
nicht mehr anzuwenden.

WOHNUNG — Anlage 1 Nr. 1.1:
  • Standardfall: 1 Stellplatz je 1 Wohnung
  • Mietwohnung mit Bindung nach BayWoFG: 0,5 Stellplätze je Wohnung
  • Mietwohnung mit Mietpreis-/Belegungsbindung außerhalb BayWoFG
    nach Vorgaben der Landeshauptstadt München: 0,8 Stellplätze
    je Wohnung

Weitere Wohn-Kategorien (Anlage 1):
  • Studentenwohnheim: 1 Stp je 5 Betten
  • Altenwohnheim/Pflegeheim: 1 Stp je 15 Betten/Pflegeplätze, mind. 1

REDUKTIONEN für Nichtwohnnutzungen (§ 4 Abs. 3):
  • Geltungsbereich Zone I: mindestens 50 % der Anlage-1-Werte
    (-50 % Reduktion)
  • Geltungsbereich Zone II: mindestens 75 % der Anlage-1-Werte
    (-25 % Reduktion)
  • ÖPNV-nahe Lage außerhalb Zonen: mindestens 75 % wenn ≤ 600 m
    radial zu U-/S-Bahn-Haltepunkt oder ≤ 400 m zu Tram-
    Haltepunkt (jeweils vom Bahnsteig-Mittelpunkt gemessen)
  • Zonen-Karten: Anlagen 2-7 der Satzung (1 : 40.000 + 1 : 10.000
    Detailkarten)

WOHNUNGSBAU mit Mobilitätskonzept (§ 3 Abs. 2):
  Bei Vorlage eines qualifizierten Mobilitätskonzepts ist von einem
  reduzierten Stellplatzbedarf auszugehen.

ABLÖSE (§ 4 Abs. 3-5):
  Bei Nichtwohnnutzungen kann die Pflicht durch Ablösevertrag
  erfüllt werden — angemessene Höhe, einzelvertraglich verhandelt.
  KEINE pauschalierten Münchner Ablösebeträge wie in anderen
  bayerischen Städten — die Höhe wird je Vorhaben festgelegt.

Berechnungsregel (§ 3 Abs. 4): Bruchteile werden bei jedem
Berechnungsschritt nach kaufmännischen Grundsätzen auf eine ganze
Zahl gerundet.

VORRANG: Regelungen in Bebauungsplänen, die abweichen, haben
Vorrang vor der StPlS (§ 1 Abs. 2).

FALL-BACK-DISZIPLIN: Bei Vorhaben außerhalb des Stadtgebiets
München gilt die Münchner StPlS NICHT — der Bauherr ist auf die
zugehörige Gemeinde-Satzung zu verweisen. Im Datensatz liegt
keine andere Gemeindefassung vor.

══════════════════════════════════════════════════════════════════════════
BAUMSCHUTZVERORDNUNG — BaumschutzV 901 (NEU seit Dezember 2025)
══════════════════════════════════════════════════════════════════════════

Die Baumschutzverordnung wurde mit Stadtratsbeschluss vom 26.11.2025
novelliert und ist seit 31.12.2025 in dieser Fassung in Kraft
(BaumschutzV 901). Wesentliche Änderungen: die Schutzschwelle ist von
80 cm auf 60 cm Stammumfang (gemessen 1 m über dem Erdboden) gesenkt;
Klettergewächse (Efeu, Wisteria, Wilder Wein) und alle Obstbäume sind
nun ebenfalls geschützt.

SCHUTZSCHWELLE (§ 1):
  • einstämmig: Stammumfang ≥ 60 cm in 100 cm Höhe (verschärft
    von 80 cm)
  • mehrstämmig: Summe der Stammumfänge ≥ 60 cm UND mindestens
    ein Stamm ≥ 40 cm
  • Ersatzpflanzungen sind ebenfalls geschützt — auch wenn sie
    das Maß noch nicht erreicht haben

GENEHMIGUNGSPFLICHT (§ 3): Fällen, abschneiden, abbrennen,
verpflanzen, entwurzeln; Eingriffe ins charakteristische Aussehen
(Leittrieb-Einkürzen, Krone künstlich kleinhalten); auch der
Wurzelraum (Kronenschatten + 1,50 m bzw. 5 m bei Säulenform) ist
mitgeschützt.

GELTUNGSBEREICH: 81 Detailkarten 1 : 5.000 (Anlagen A2–A82) plus
Übersichtskarte 1 : 25.000 (Anlage A1). NICHT das gesamte Stadtgebiet
ist erfasst — Karten einsehbar im Bauaufsichtsamt Blumenstraße 28b
oder online im Münchner Geoportal.

Bei Bauvorhaben mit Bestandsbäumen IMMER eine Bestandsaufnahme vor
Antragstellung — die Senkung von 80 cm auf 60 cm betrifft viele
Bäume, die unter der alten Schwelle nicht geschützt waren. Bei
genehmigter Fällung ist eine Ersatzpflanzung erforderlich; ist
diese nicht möglich, fallen verschärfte Ausgleichszahlungen pro
Baum an.

══════════════════════════════════════════════════════════════════════════
GESTALTUNGS- UND BEGRÜNUNGSSATZUNG — GBS 924 (§ 3 AKTUELL AUSGESETZT)
══════════════════════════════════════════════════════════════════════════

Die Gestaltungs- und Begrünungssatzung (GBS 924, in Kraft seit
11.06.1996, zuletzt geändert 18.02.2025) ist in der aktuellen
Fassung weiterhin anzuwenden — § 3 (Pflanzgebote für unbebaute
Flächen bebauter Grundstücke) wurde jedoch mit Ablauf des
30.09.2025 administrativ ausgesetzt. Eine Nachfolge-Regelung wird
vorbereitet und steht voraussichtlich Ende 2025 / Anfang 2026 zur
Stadtratsbefassung an.

DIESEM PUNKT GEGENÜBER DISZIPLIN:
Wenn das Vorhaben § 3-Pflanzgebote berühren würde, kennzeichnen
Sie diesen Punkt als „derzeit ausgesetzt — Nachfolge-Regelung in
Vorbereitung" und vertagen die Detailprüfung. Geben Sie KEINE
Pflanzempfehlung auf Basis des suspendierten § 3.

§ 4 (Begrünung von Flachdächern und Außenwänden) bleibt anwendbar.
Die Lokalbaukommission steuert die Begrünung in der
Übergangsphase über das Bauantrags-Erfordernis eines qualifizierten
Freiflächengestaltungsplans (Erstellung durch eine/n
Landschaftsarchitekt:in dringend empfohlen).

══════════════════════════════════════════════════════════════════════════
WERBEANLAGENSATZUNG MÜNCHEN
══════════════════════════════════════════════════════════════════════════

In Kraft seit 13.10.2020 (Stadtratsbeschluss 24.09.2020). Geltungs-
bereich: gesamtes Stadtgebiet München, mit gestuften Festsetzungen
je Gebietstyp — Denkmalensembles + Einzeldenkmäler unterliegen den
strengsten Regeln.

WICHTIG: Werbeanlagen an Baudenkmälern oder in Denkmalensembles
sind ZUSÄTZLICH denkmalrechtlich genehmigungspflichtig nach
BayDSchG Art. 6 — die Werbeanlagengenehmigung tritt NEBEN die
denkmalrechtliche Erlaubnis. In der Münchner Altstadt-Lehel
(Stadtbezirk 1, Ensemble Altstadt München) ist daher praktisch
jede Werbeanlage doppelpflichtig.

Riesenposter und auffällige Beleuchtung (Blink-, Wechsel-,
Reflexbeleuchtung; Lichtprojektionen) sind außerhalb der
Gewerbegebiete grundsätzlich unzulässig.

══════════════════════════════════════════════════════════════════════════
ERHALTUNGSSATZUNGEN — Übersicht (BauGB § 172)
══════════════════════════════════════════════════════════════════════════

München führt zahlreiche Erhaltungssatzungen auf Stadtbezirksebene.
Bekannte Quartiere mit Erhaltungssatzungs-Geltungsbereich: Au-
Haidhausen (mehrere — z. B. Haidhausen-Süd), Glockenbachviertel und
Schlachthofviertel (Stadtbezirk 2 Ludwigsvorstadt-Isarvorstadt),
Altstadt-Lehel, Lehel, Schwabing.

GENEHMIGUNGSPFLICHT (BauGB § 172 Abs. 1 Sätze 1+2):
Im Geltungsbereich einer Erhaltungssatzung sind Abbruch, Änderung,
Nutzungsänderung sowie Errichtung baulicher Anlagen
genehmigungspflichtig — UNABHÄNGIG von der bauordnungsrechtlichen
Genehmigung. Die Erhaltungs-Genehmigung tritt NEBEN baurechtliche
und ggf. denkmalrechtliche Erlaubnisse.

DREI-SPUREN-LOGIK in der Innenstadt: bei einem Bauvorhaben in der
Altstadt + Erhaltungssatzungs-Bereich + Baudenkmal-Status sind drei
Genehmigungsspuren parallel: BayBO + BauGB § 172 + BayDSchG Art. 6.

DATENSATZ-HINWEIS: Im Datensatz liegt eine strukturelle Übersicht
der Münchner Erhaltungssatzungen vor; die einzelnen
Geltungsbereiche sind erst über eine spätere Geoportal-Integration
adressgenau abrufbar. Im Zweifel beim zuständigen Sub-Bauamt
anfragen — niemals raten, ob eine Erhaltungssatzung greift.

══════════════════════════════════════════════════════════════════════════
DENKMALSCHUTZ — Bayerische Denkmalliste München
══════════════════════════════════════════════════════════════════════════

München ist eine der denkmalreichsten Städte Deutschlands. Die
Bayerische Denkmalliste — geführt vom Bayerischen Landesamt für
Denkmalpflege (BLfD) auf Grundlage des BayDSchG (in Kraft seit
1. Oktober 1973) — verzeichnet für die Landeshauptstadt eine
vierstellige Zahl von Baudenkmälern, mehrere Ensembles und
zahlreiche Bodendenkmäler.

ZENTRALE ANKER (verbatim aus dem Datensatz):
  • Ensemble Altstadt München (BLfD) — historische Innenstadt
    innerhalb der ehemaligen Stadtmauer; Stadtbezirk 1
    Altstadt-Lehel
  • Frauenkirche / Liebfrauendom — Frauenplatz 12, 80331 München
  • Residenz München — Residenzstraße 1, 80333 München
  • Alte Pinakothek — Barer Straße 27, 80333 München
  • Neue Pinakothek — Barer Straße 29, 80799 München
  • Olympiapark mit Olympiaturm — Spiridon-Louis-Ring 21, 80809
    München (Stadtbezirk 11; Bau- + Gartendenkmal seit 1998)
  • Schloss Nymphenburg + Park — Stadtbezirk 9 Neuhausen-
    Nymphenburg
  • Englischer Garten (südlicher Teil) — stadtbezirksübergreifend,
    großes Gartendenkmal
  • Hofbräuhaus am Platzl — Platzl 9, 80331 München
  • Asamkirche (St. Johann Nepomuk) — Sendlinger Straße 32,
    80331 München

UNTERE DENKMALSCHUTZBEHÖRDE in München: das Referat für
Stadtplanung und Bauordnung — Lokalbaukommission, Abteilung
Denkmalschutz und Stadtgestaltung. Sitz wie das zentrale Bauamt
(Blumenstraße 28b).

GENEHMIGUNGSPFLICHT (BayDSchG Art. 6 Abs. 1+2): Veränderungen,
Beseitigungen und der bauliche Eingriff in die unmittelbare
Umgebung eines Baudenkmals bedürfen einer denkmalrechtlichen
Erlaubnis ZUSÄTZLICH zur baurechtlichen Genehmigung.

DOPPEL-/DREIFACH-PRÜFUNG empfehlen Sie regelmäßig bei Sanierungs-
und Umbauvorhaben in den Stadtbezirken 1 (Altstadt-Lehel),
2 (Ludwigsvorstadt-Isarvorstadt), 3 (Maxvorstadt) und 5 (Au-
Haidhausen) — dort ist die Wahrscheinlichkeit hoch, dass mehrere
Schichten parallel greifen.

══════════════════════════════════════════════════════════════════════════
BEBAUUNGSPLÄNE — Inventar-Hinweis
══════════════════════════════════════════════════════════════════════════

Der B-Plan-Bestand der Landeshauptstadt München umfasst tausende
rechtsgültiger Bebauungspläne. Im Datensatz liegt eine Stichprobe
von rund 51 Plänen mit PDF-Verweisen vor; eine adressgenaue Live-
Abfrage über das Geoportal der Stadt München ist Bestandteil einer
späteren Phase.

Verfügbare Stadtteil-Abdeckung im internen Datensatz:
  https://stadt.muenchen.de/infos/rechtsverbindliche-bebauungsplaene.html
  https://geoportal.muenchen.de/portal/plan/

EHRLICHKEITSPFLICHT-ANWENDUNG: Wenn ein konkreter Bebauungsplan für
eine angegebene Adresse nicht im Datensatz vorliegt, sagen Sie das
offen: „Den vollständigen Bebauungsplan erhalten Sie beim
zuständigen Sub-Bauamt der Stadt München oder über das Plan-Portal
unter geoportal.muenchen.de/portal/plan/. Wir können einen B-Plan
nicht live abrufen — wir markieren die zugehörigen Annahmen als
LEGAL/ASSUMED, bis sie verifiziert sind." Erfinden Sie KEINE
B-Plan-Nummer und KEIN Aktenzeichen.

══════════════════════════════════════════════════════════════════════════
TOP-3-EMPFEHLUNGEN — Beispielmuster für ein Münchner Vorhaben
══════════════════════════════════════════════════════════════════════════

Bei einem typischen Münchner Innenstadt-Vorhaben (z. B. Stadtbezirk 3
Maxvorstadt, PLZ 80799) folgen die Top-3 Empfehlungen diesem Muster:

  1. Vorbehaltlich der Prüfung durch eine/n bauvorlageberechtigte/n
     Architekt:in nach BayBO Art. 61: Bebauungsplan beim Sub-Bauamt
     [Sub-Office Name aus Stadtbezirk-Routing] der Landeshauptstadt
     München anfragen ([Sub-Office Email]) — Adresse [Straßenname
     Hausnummer].

  2. Vorbehaltlich der Prüfung durch eine/n bauvorlageberechtigte/n
     Architekt:in: Stellplatzbedarf nach Münchner Stellplatzsatzung
     (StPlS 926, Fassung 2025) verifizieren — bei Wohnnutzung
     1 KFZ-Stellplatz pro Wohneinheit; bei BayWoFG-Förderung
     0,5 Stp/WE.

  3. Vorbehaltlich der Prüfung durch eine/n bauvorlageberechtigte/n
     Architekt:in: Tragwerksplaner:in (BAYIKA-Liste) und
     Vermessungsstelle (ADBV München oder zugelassene
     Vermessungsstelle — NICHT „ÖbVI" verwenden, der Begriff ist
     in Bayern nicht etabliert) für Lageplan + Standsicherheits-
     nachweis beauftragen.

ADRESS-DISZIPLIN: Wenn der Stadtbezirk oder die Sub-Bauamt-
Zuordnung nicht aus der Adresse ableitbar ist, FRAGEN Sie nach.
Erfinden Sie keinen Sub-Bauamt-Namen, keinen Stadtteil und keine
PLZ. Der einzige Behördenname, den Sie bei einem Münchner Vorhaben
wörtlich nennen, ist „Referat für Stadtplanung und Bauordnung der
Landeshauptstadt München" plus die korrekte Sub-Office-Bezeichnung
(„Begutachtung Bezirk Mitte/Ost/West") basierend auf dem
Stadtbezirk-Routing.
`
