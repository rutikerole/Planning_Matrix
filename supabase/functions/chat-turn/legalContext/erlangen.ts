// ───────────────────────────────────────────────────────────────────────
// Phase 3 — legalContext/erlangen.ts
//
// Source of truth: data/erlangen/. Quarterly refresh — re-extract
// from JSON after each refresh of that directory. Hand-composed for
// Phase 3; auto-generation from JSON is a Phase-4 polish.
//
// Audit B1 (city-templated Top-3 example, no fabricated Bauamt name)
// and B3 (Stellplatzsatzung verbatim values + city-fall-back honesty)
// are applied here.
// ───────────────────────────────────────────────────────────────────────

export const ERLANGEN_BLOCK = `══════════════════════════════════════════════════════════════════════════
ERLANGEN — Stadtebene
══════════════════════════════════════════════════════════════════════════

In der ersten Produktversion deckt Planning Matrix nur die kreisfreie
Stadt Erlangen mit voller Genauigkeit ab — Postleitzahlen 91052, 91054,
91056 und 91058. Adressen außerhalb dieser PLZ-Bereiche werden Sie
ehrlich behandeln: Sie nennen die zugehörige Bayern-Regelung allgemein,
aber sagen offen, dass die spezifische kommunale Satzung nicht im
Datensatz vorliegt.

══════════════════════════════════════════════════════════════════════════
BAUAUFSICHTSAMT DER STADT ERLANGEN
══════════════════════════════════════════════════════════════════════════

Offizieller Name: „Bauaufsichtsamt der Stadt Erlangen". Verwenden Sie
diesen Namen wörtlich — niemals „Bauamt", niemals „Bauaufsicht
Erlangen", niemals „Stadtplanungsamt".

Adresse: Gebbertstraße 1, 91052 Erlangen
Telefon (allgemein): 09131 86-1002 (alternativ -1004)
Fax: 09131 86-1011
E-Mail (allgemein): bauaufsichtsamt@stadt.erlangen.de
Öffnungszeiten: Montag–Donnerstag 09:30–15:00 Uhr, Freitag 09:30–
12:00 Uhr (persönliche Termine nur nach vorheriger Vereinbarung).

Spezialistische Kontakte:
  • Zentrale Planannahme: planannahme@stadt.erlangen.de, 09131 86-1068
  • Grundstücksentwässerung:
    grundstuecksentwaesserung@stadt.erlangen.de, 09131 86-1041 oder
    -1087
  • Denkmalschutz (untere Behörde):
    denkmalschutz@stadt.erlangen.de, 09131 86-1007
  • Baureferat (übergeordnet): baureferat@stadt.erlangen.de,
    09131 86-1370

Online-Bauantrag: BayernPortal-Assistent unter
  https://formularserver-bp.bayern.de/intelliform/forms/bayernportal/
  bayernportal/Ministerien/stmb/bauantrag_hauptassistent/index

══════════════════════════════════════════════════════════════════════════
STELLPLATZSATZUNG ERLANGEN — die meistzitierte Erlanger Quelle
══════════════════════════════════════════════════════════════════════════

In Erlangen verlangt die Stellplatzsatzung (StS, Stand
Inkrafttreten 18.07.2025; vom 14.12.2023 i. d. F. vom 26.06.2025):

WOHNGEBÄUDE — Anlage 1 Nr. 1.1:
  • 1 KFZ-Stellplatz pro Wohneinheit
  • 2 Fahrradabstellplätze pro Wohneinheit
  • Bei Mietwohnungen mit Bindung nach dem Bayerischen
    Wohnraumförderungsgesetz (BayWoFG): 0,25 KFZ-Stellplätze pro WE

Studentenwohnungen (Nr. 1.3): 0,25 KFZ-Stp/WE; Studentenwohnheim:
  1 Stp je 5 Betten.
Altenwohnungen (Nr. 1.5): 0,5 KFZ-Stp/WE; Altenheim: 1 Stp je
  15 Betten/Pflegeplätze, mindestens 2 Stp.
Versammlungsstätten überörtlicher Bedeutung (Nr. 4.1): 1 Stp je
  10 Sitzplätze.
Hochschulen (Nr. 8.2): 1 Stp je 10 Studierende.
Büro allgemein (Nr. 2.1): 1 Stp je 70 m² NUF (DIN 277).
Handwerks-/Industriebetriebe (Nr. 9.1): 1 Stp je 120 m² NUF.

Berechnungsregel (§ 2 Abs. 1):
  • Richtzahl auf 2 Nachkommastellen rechnerisch ermitteln
  • Aufrunden, wenn die nachfolgende Dezimalstelle ≥ 5; sonst
    abrunden (kaufmännisch)

Ablöse (§ 3 Abs. 2) — die Stellplatzpflicht kann durch
pauschalierten Ablösungsbetrag erfüllt werden, gestaffelt nach
Zonen (Anlage-2-Zonenplan, einsehbar im Bauaufsichtsamt):
  • Zone 1: 15.000 € pro Stellplatz
  • Zone 2: 11.500 € pro Stellplatz
  • Zone 3:  8.000 € pro Stellplatz
  • Übriges Stadtgebiet: ohne Ablöse-Wert
Fahrrad-Ablöse (§ 3 Abs. 3): 750 € pro Fahrradabstellplatz
(nur in begründeten Ausnahmefällen).

Reduktion durch Mobilitätskonzept (§ 5 i. V. m. Art. 63 BayBO):
Bei Wohnungsbauvorhaben mit mindestens 10 Wohneinheiten kann die
KFZ-Stellplatzpflicht reduziert werden, wenn ein Mobilitätskonzept
die Nachfrage glaubhaft senkt.

Versickerungspflichtige Stellplatzbefestigung (§ 4 Abs. 1):
Schotter- oder Pflasterrasen — keine Vollversiegelung.

Begrünung (§ 4 Abs. 2): je 5 Stellplätze ≥ 1 standortgerechter
Baum; ab 20 Stellplätzen Innenraum-Durchgrünung.

Wenn ein Bauvorhaben in einer ANDEREN Bayerischen Gemeinde liegt,
sagen Sie offen: „Die Erlanger Stellplatzsatzung greift hier nicht.
Die zuständige Stellplatzsatzung der Gemeinde [Name] liegt nicht im
Datensatz vor — bitte beim örtlichen Bauamt erfragen." Erfinden Sie
keinen Wert.

══════════════════════════════════════════════════════════════════════════
ERHALTUNGSSATZUNG BURGBERG (Erlangen)
══════════════════════════════════════════════════════════════════════════

Vom 01.09.1989 i. d. F. vom 29.11.2001, in Kraft seit 01.01.2002.
Rechtsgrundlage: Art. 23 GO Bayern + § 172 Abs. 1 Satz 1 Nr. 1 BauGB.

Geltungsbereich (Burgberg-Quartier am nördlichen Rand der Altstadt):
  • Norden:  Bubenreuther Weg, Rudelsweiherstraße, Am Meilwald
  • Osten:   Atzelsberger Steige (samt südlicher Verlängerung)
  • Süden:   Ebrardstraße bis Willstraße + zahlreiche
             Flurstücksgrenzen (Lageplan 1:2500 beim Planungsamt)
  • Westen:  Bayreuther Straße

§ 3 Erhaltungsgebot, Genehmigung: Abbruch, Änderung,
Nutzungsänderung sowie Errichtung baulicher Anlagen unterliegen
einer Genehmigungspflicht nach § 172 BauGB. Schutzgüter (§§ 4–7):
Stadtgestalt (Villenviertel-Typus), Orts- und Landschaftsbild,
städtebauliche Bedeutung (Geschossigkeit, Fassaden-/Fenstergliederung,
Dachform), geschichtliche Bedeutung (historische Kelleranlagen mit
Sandsteinmauern, Tunnelportale, Israelitischer Friedhof).

§ 1 Abs. 3: Vorschriften des BayDSchG bleiben unberührt — die
erhaltungsrechtliche Erlaubnis tritt NEBEN baurechtliche und
denkmalrechtliche Genehmigungen.

Bei einem Sanierungs- oder Anbauvorhaben am Burgberg empfehlen Sie
IMMER eine doppelte Erlaubnisprüfung: Erhaltungssatzung + BayDSchG.
Wenn das Bestandsgebäude zudem in der Denkmalliste (Art. 6 BayDSchG)
geführt ist, sind drei Erlaubnisspuren parallel.

══════════════════════════════════════════════════════════════════════════
WERBEANLAGENSATZUNG ERLANGEN (sog. „Gestaltung" Innenstadt)
══════════════════════════════════════════════════════════════════════════

Vom 10.04.2014 i. d. F. vom 26.02.2015, in Kraft seit 13.03.2015.
Rechtsgrundlage: Art. 81 Abs. 1 Nr. 1 + 2 BayBO.

KORREKTUR: Erlangen hat KEIN einzelnes Dokument
„Gestaltungssatzung Innenstadt". Die historische
„Gestaltungssatzung für Werbeanlagen in der historischen Innenstadt"
wurde aufgehoben und durch diese konsolidierte Werbeanlagensatzung
abgelöst, die mit gestuften Festsetzungen für 4 Gebietstypen für
das gesamte Stadtgebiet gilt: § 3 Denkmalensembles + Einzeldenkmäler
(strengste Regeln), § 4 Wohngebiete + Dorfgebiete, § 5 Kern- +
Mischgebiete, § 6 Gewerbe- + Industriegebiete.

§ 1 Abs. 3: Anforderungen aus dem BayDSchG bleiben unberührt — die
Werbeanlagengenehmigung tritt NEBEN denkmalrechtlicher Erlaubnis.

Sprechen Sie nicht von einer „Gestaltungssatzung Innenstadt". Wenn
Werbeanlagen oder Fassadengestaltung relevant sind, nennen Sie die
„Werbeanlagensatzung der Stadt Erlangen".

══════════════════════════════════════════════════════════════════════════
ENTWÄSSERUNGSSATZUNG ERLANGEN (EWS) — Niederschlagswasser
══════════════════════════════════════════════════════════════════════════

Vom 03.11.2014 i. d. F. vom 29.09.2022, in Kraft seit 21.10.2022.
Begleitsatzung: Beitrags- und Gebührensatzung (BGS/EWS), Stand
2024-11-28.

§ 5 Abs. 1: Anschlusszwang für bebaute Grundstücke an die öffentliche
Entwässerungseinrichtung — Ausnahme nur bei rechtlicher oder
tatsächlicher Unmöglichkeit.

§ 5 Abs. 5: Benutzungszwang für angeschlossene Grundstücke — alles
Abwasser ist im Umfang des Benutzungsrechts in die Einrichtung
einzuleiten.

§ 5 Abs. 6 (Schlüsselregel für Neubau): Der Anschluss- und
Benutzungszwang gilt NICHT für Niederschlagswasser, sofern auf dem
Grundstück selbst dessen Versickerung oder anderweitige Beseitigung
ordnungsgemäß möglich ist. Niederschlagswasser von Dach- und
Hofflächen ist primär dezentral zu bewirtschaften (Versickerung,
Sammlung/Nutzung, gedrosselte Ableitung).

§ 4 Abs. 5: Kein Benutzungsrecht für Niederschlagswasser, soweit
eine Versickerung oder anderweitige Beseitigung ordnungsgemäß
möglich ist.

§ 10 Abs. 1: Bodengutachten + Versickerungsnachweis sind
nötigenfalls Bestandteil des Zulassungsantrags der
Grundstücksentwässerungsanlage.

§ 9 Abs. 7: Bei Grundstücken in Überschwemmungsgebieten gilt das
100-jährliche Hochwasser HQ 100 als Bemessungsgrundlage.

══════════════════════════════════════════════════════════════════════════
DENKMALLISTE ERLANGEN — Bayerischer Denkmal-Atlas
══════════════════════════════════════════════════════════════════════════

In Erlangen geführt durch das Bayerische Landesamt für Denkmalpflege
(BLfD) auf Grundlage des BayDSchG (Stand 2026):

  • 933 Baudenkmäler (Einzeldenkmäler)
  • 7 Ensembles, darunter Ensemble Altstadt/Neustadt Erlangen
    (E-5-62-000-1) — barocke Stadtbaukunst, Plan von Johann Moritz
    Richter ab 1686
  • 52 Bodendenkmäler

Repräsentative Beispiele in der Innenstadt: Markgräfliches Schloss
(Schlossplatz), Markgrafentheater (Theaterplatz), Hugenottenkirche
(Hugenottenplatz), Altstädter Pfarrkirche, Neustädter Kirche
(Friedrichstraße), Sophienkirche, Burgbergkapelle (Bayreuther
Straße 38), Palais Stutterheim (Marktplatz). Auf dem Burgberg
zusätzlich die historischen Kelleranlagen mit Sandsteinmauern.

Bei einem Sanierungs- oder Umbauvorhaben prüfen Sie IMMER, ob das
Bestandsgebäude in der Denkmalliste geführt ist oder im Umgriff
eines Ensembles liegt — Art. 6 BayDSchG-Erlaubnis ist dann ZUSÄTZLICH
zur baurechtlichen Genehmigung erforderlich. Untere
Denkmalschutzbehörde: Bauaufsichtsamt der Stadt Erlangen
(denkmalschutz@stadt.erlangen.de, 09131 86-1007).

══════════════════════════════════════════════════════════════════════════
BEBAUUNGSPLÄNE ERLANGEN — Inventar-Hinweis
══════════════════════════════════════════════════════════════════════════

Die Stadt Erlangen veröffentlicht den Stand der rechtsgültigen
Bebauungspläne unter
  https://erlangen.de/aktuelles/bplaene_rechtsgueltig
und die im Verfahren befindlichen unter
  https://erlangen.de/aktuelles/bebauungsplaene_im_verfahren.

Verfügbare Stadtteil-Abdeckung im internen Datensatz: Innenstadt,
Bruck/Anger, Tennenlohe, Eltersdorf, Frauenaurach. Es ist KEIN
strukturierter CSV-/GeoJSON-Download verfügbar; eine vollständige
Inventur aller B-Pläne liegt nicht vor.

Das zentrale Bayerische Bauleitplanungsportal
(geoportal.bayern.de/bauleitplanungsportal/) wird zum 31.10.2026
durch das DiPlan-Portal abgelöst.

WICHTIG: Wenn der Bauherr nach dem konkreten B-Plan für seine
Adresse fragt, sagen Sie offen: „Den vollständigen Bebauungsplan
erhalten Sie beim Bauaufsichtsamt der Stadt Erlangen oder über
das städtische Verzeichnis. Wir können einen B-Plan nicht live
abrufen — wir markieren die zugehörigen Annahmen als LEGAL/ASSUMED,
bis sie verifiziert sind." Erfinden Sie KEINE B-Plan-Nummer und
KEIN Aktenzeichen.

══════════════════════════════════════════════════════════════════════════
TOP-3-EMPFEHLUNGEN — Beispielmuster (Audit B1)
══════════════════════════════════════════════════════════════════════════

Bei einem typischen Erlangener Innenstadt-Vorhaben (Postleitzahl
91054, Adresse mit konkretem Straßennamen) folgen die Top-3
Empfehlungen diesem Muster:

  1. Vorbehaltlich der Prüfung durch eine/n bauvorlageberechtigte/n
     Architekt:in nach BayBO Art. 61: Bebauungsplan beim
     Bauaufsichtsamt der Stadt Erlangen anfordern (Adresse
     [Straßenname Hausnummer]).

  2. Vorbehaltlich der Prüfung durch eine/n bauvorlageberechtigte/n
     Architekt:in: Stellplatzbedarf nach Erlanger Stellplatzsatzung
     (1 KFZ-Stellplatz und 2 Fahrradabstellplätze pro Wohneinheit
     bei Wohnnutzung) verifizieren.

  3. Vorbehaltlich der Prüfung durch eine/n bauvorlageberechtigte/n
     Architekt:in: Tragwerksplaner:in (BAYIKA) und Vermessungs-
     stelle (ADBV Erlangen oder zugelassene Vermessungsstelle —
     NICHT „ÖbVI" verwenden) für Lageplan + Standsicherheitsnachweis
     beauftragen.

WICHTIG zur Adress-Disziplin: Wenn der Stadtname oder die
Stadtteil-Zuordnung nicht aus der Adresse ableitbar ist, FRAGEN
Sie nach. Erfinden Sie keinen Bauamt-Namen, keinen Stadtteil und
keine PLZ. Die einzige Stadt, deren Bauamt-Namen Sie wörtlich
nennen dürfen, ist „Bauaufsichtsamt der Stadt Erlangen".
`
