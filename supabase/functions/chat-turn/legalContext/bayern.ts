// ───────────────────────────────────────────────────────────────────────
// Phase 3 — legalContext/bayern.ts
//
// Bayern-specific content. BayBO articles, BayDSchG, the corrected
// ADBV (NOT ÖbVI) framing for Vermessungsstellen in Bayern, and the
// BAYAK-not-BAYIKA correction for Brandschutz Prüfsachverständige.
//
// Audit B2 (PLZ ranges 80000-87999 / 90000-96499) and B10 (every
// recommendation prefixed with the Vorbehalt clause) are applied.
// ───────────────────────────────────────────────────────────────────────

export const BAYERN_BLOCK = `══════════════════════════════════════════════════════════════════════════
BAYERN — Bundeslandebene
══════════════════════════════════════════════════════════════════════════

══════════════════════════════════════════════════════════════════════════
BayBO — Bayerische Bauordnung
══════════════════════════════════════════════════════════════════════════

Art. 2 Abs. 3 BayBO — Gebäudeklassen
  GK 1: freistehende Gebäude bis 7 m Höhe, ≤ 2 Nutzungseinheiten,
        ≤ 400 m² BGF (typisches Einfamilienhaus)
  GK 2: nicht freistehend, sonst wie GK 1
  GK 3: sonstige Gebäude bis 7 m Höhe
  GK 4: bis 13 m Höhe, Nutzungseinheiten ≤ 400 m²
  GK 5: alle übrigen Gebäude (über 13 m oder größer als GK 4)

Art. 2 Abs. 4 BayBO — Sonderbauten
  Bestimmte Gebäude und bauliche Anlagen sind ausdrücklich Sonderbauten
  (Hochhäuser, Verkaufsstätten > 800 m², Versammlungsstätten > 200
  Personen, Krankenhäuser, Beherbergungsstätten, Kindergärten u. a.).
  Sonderbauten unterliegen IMMER dem Baugenehmigungsverfahren nach
  Art. 60 BayBO — niemals der Genehmigungsfreistellung (Art. 57) oder
  dem vereinfachten Verfahren (Art. 58).

Art. 6 BayBO — Abstandsflächen
  In Bayern beträgt die Abstandsfläche grundsätzlich 0,4 H (mindestens
  3 m) zur Nachbargrenze. Geänderte Bayern-Regelung seit 2021:
  pauschal 0,4 H, mit Ausnahmen für Gewerbe- und Industriegebiete.

Art. 44a BayBO — PV-Pflicht für Wohnneubauten
  Seit 1. Januar 2025: PV-Pflicht für Wohnneubauten in Bayern.
  Für die Konversation bedeutet das: bei Neubau-Wohngebäuden
  IMMER ein PV-Konzept als notwendiges Dokument benennen.

Art. 47 BayBO — Stellplätze und Garagen
  Notwendige Kfz-Stellplätze und Fahrradabstellplätze in
  ausreichender Zahl. Die konkrete Anzahl folgt der kommunalen
  Stellplatzsatzung (in München: siehe MÜNCHEN-Block).

Art. 57 BayBO — Genehmigungsfreistellung
  Genehmigungsfreistellung kommt in Betracht, wenn:
  (i)   qualifizierter Bebauungsplan nach § 30 Abs. 1 BauGB,
  (ii)  Vorhaben entspricht den Festsetzungen,
  (iii) Erschließung gesichert,
  (iv)  Gemeinde verlangt nicht binnen einem Monat das Verfahren
        nach Art. 58.
  Sobald tragende Bauteile geändert werden, entfällt die Freistellung.
  Sonderbauten sind IMMER ausgenommen.

Art. 58 BayBO — Vereinfachtes Verfahren
  Das vereinfachte Verfahren ist die häufigste Verfahrensart für
  Einfamilienhäuser und kleinere Wohngebäude. Prüfungsumfang ist
  reduziert; planungsrechtliche Zulässigkeit + Abstandsflächen +
  Stellplatznachweis stehen im Vordergrund. Sonderbauten fallen
  NICHT hierunter.

Art. 59 BayBO — Baugenehmigungsverfahren (reguläres Verfahren)
  Anwendungsbereich: alle baugenehmigungspflichtigen Vorhaben, die
  weder verfahrensfrei nach Art. 57 sind noch in das vereinfachte
  Verfahren nach Art. 58 fallen — insbesondere Sonderbauten im
  Sinne von Art. 2 Abs. 4 BayBO sowie sonstige Vorhaben, bei denen
  die Behörde den vollen Prüfungsumfang ausübt.

  Prüfungsumfang (gegenüber Art. 58 erweitert):
    • planungsrechtliche Zulässigkeit nach §§ 29 ff. BauGB
    • Anforderungen der BayBO und der aufgrund der BayBO
      erlassenen Vorschriften (insbesondere Brandschutz,
      Standsicherheit, Abstandsflächen, Erschließung)
    • andere öffentlich-rechtliche Vorschriften, soweit wegen der
      Baugenehmigung eine Entscheidung nach anderen öffentlich-
      rechtlichen Vorschriften entfällt oder ersetzt wird
    • beantragte Abweichungen, Ausnahmen und Befreiungen

  Frist (Art. 65 BayBO seit 01.01.2025): die Bauaufsichtsbehörde
  prüft Antrag und Bauvorlagen innerhalb von drei Wochen nach
  Eingang auf Vollständigkeit. Eine Genehmigungsfiktion (wie sie
  Art. 58 Abs. 2 für das vereinfachte Verfahren vorsieht) ist im
  regulären Verfahren NICHT vorgesehen.

  Typische Münchner Anwendungsfälle: Mehrfamilien-Wohnungsbau ab
  GK 5, Sonderbauten (Verkaufsstätten > 2.000 m², Versammlungs-
  stätten > 200 Personen, Beherbergungsstätten, Krankenhäuser,
  Kindergärten), gemischt genutzte Vorhaben mit Gewerbeanteilen
  oberhalb der Sonderbau-Schwellen. Für reine Einfamilienhaus-
  Vorhaben in München (T-01) ist Art. 58 die Regel; Art. 59 kommt
  in Betracht, wenn das Vorhaben unerwartet als Sonderbau
  einzuordnen ist.

Art. 60 BayBO — Sonderbau-Verfahren
  Das vollumfängliche Verfahren — für Sonderbauten (Art. 2 Abs. 4)
  IMMER, sonst nur in Ausnahmefällen. Brandschutznachweis und
  Standsicherheitsnachweis sind regelmäßig durch eine/n
  Prüfsachverständige/n bzw. durch Stichprobenprüfung der Behörde
  abzudecken.

Art. 61 BayBO — Bauvorlageberechtigung
  Bauvorlagen dürfen nur von Personen unterschrieben werden, die
  in der entsprechenden Liste eingetragen sind:
  • Architekt:innen — Eintragung über die Bayerische Architekten-
    kammer (BAYAK) — siehe https://www.byak.de/.
  • Ingenieur:innen mit Bauvorlageberechtigung — Eintragung über
    die Bayerische Ingenieurekammer-Bau (BAYIKA) — siehe
    https://www.bayika.de/.

Art. 62 BayBO — Bautechnische Nachweise
  Standsicherheits- und Brandschutznachweis bei Sonderbauten und
  bei höheren Gebäudeklassen (GK 4–5) durch Prüfsachverständige
  prüfpflichtig.

  WICHTIG: Die Liste der Prüfsachverständigen für BRANDSCHUTZ in
  Bayern wird bei der Bayerischen ARCHITEKTENKAMMER (BAYAK)
  geführt — NICHT bei der BAYIKA. Die Liste der Prüfsachverständigen
  für STANDSICHERHEIT (Tragwerksplanung) wird bei der BAYIKA
  geführt. Zwei unterschiedliche Kammern, zwei unterschiedliche
  Listen — verwechseln Sie das nicht.

Art. 64 BayBO — Antragsverfahren
  Im vereinfachten Verfahren (Art. 58) entscheidet die Behörde
  grundsätzlich innerhalb von drei Monaten ab Vollständigkeit der
  Bauvorlagen. Erforderliche Unterlagen: Bauantragsformular,
  amtlicher Lageplan, Bauzeichnungen 1:100, Baubeschreibung,
  Standsicherheitsnachweis, Brandschutznachweis, Wärmeschutznachweis
  nach GEG 2024, Stellplatznachweis, Entwässerungsplan.

Art. 66 BayBO — Nachbarbeteiligung
  Nachbarbeteiligung erfolgt über die Vorlage des Bauantrags durch
  die Gemeinde an die direkt angrenzenden Eigentümer.

══════════════════════════════════════════════════════════════════════════
BayDSchG — Bayerisches Denkmalschutzgesetz
══════════════════════════════════════════════════════════════════════════

In Kraft seit 1. Oktober 1973. Die Liste der Bau-, Boden- und
Ensemble-Denkmäler wird vom Bayerischen Landesamt für
Denkmalpflege (BLfD) geführt und ist über den Bayerischen
Denkmal-Atlas öffentlich zugänglich.

Art. 6 BayDSchG — Erlaubnispflicht
  Veränderungen an einem Baudenkmal — sowie ein baulicher Eingriff
  in dessen unmittelbare Umgebung — bedürfen einer
  denkmalrechtlichen Erlaubnis nach Art. 6 BayDSchG ZUSÄTZLICH zur
  baurechtlichen Genehmigung. Untere Denkmalschutzbehörde ist die
  Stadt — in München die Lokalbaukommission (LBK) des
  Referats für Stadtplanung und Bauordnung (Bauamt-Sub-Office
  je Stadtbezirk: Mitte / Ost / West).

══════════════════════════════════════════════════════════════════════════
VERMESSUNG IN BAYERN — keine ÖbVI im Sinne anderer Bundesländer
══════════════════════════════════════════════════════════════════════════

KORREKTUR-WARNUNG: Die in Baden-Württemberg, Nordrhein-Westfalen
oder Brandenburg übliche Bezeichnung „Öffentlich bestellte:r
Vermessungsingenieur:in (ÖbVI)" ist in Bayern in dieser Form NICHT
etabliert. Verwenden Sie diese Bezeichnung in Bayern nicht.

In Bayern erstellen amtliche Lagepläne nach BayBO Art. 64 Abs. 3
wahlweise:
  • das zuständige Amt für Digitalisierung, Breitband und
    Vermessung (ADBV) — für München das ADBV München,
    https://www.adbv-muenchen.bayern.de/, ODER
  • zugelassene private Vermessungsstellen.

Sprechen Sie nicht von „ÖbVI", sondern von „Vermessungsstelle"
oder „ADBV München", soweit der Kontext München ist. Bei
Empfehlungen für die Lageplanerstellung verweisen Sie auf das
ADBV oder eine private Vermessungsstelle, nicht auf einen ÖbVI.

══════════════════════════════════════════════════════════════════════════
BAYERN-PLZ — Heuristik zur Geltung
══════════════════════════════════════════════════════════════════════════

Bayern-Postleitzahlen liegen in den Bereichen 80000–87999 und
90000–96499. PLZ außerhalb dieser Bereiche sind ausdrücklich nicht
Bayern. PLZ in 88000–89999 oder 97000–99999 etc. sind NICHT Bayern;
fragen Sie höflich nach, wenn der Bauherr eine solche Adresse
nennt — z. B. „Die genannte Adresse liegt nach der Postleitzahl
außerhalb Bayerns. Sind Sie sicher, dass das Vorhaben in Bayern
liegt?"

══════════════════════════════════════════════════════════════════════════
EMPFEHLUNGEN — Vorbehalt-Prefix
══════════════════════════════════════════════════════════════════════════

Jede Empfehlung in Bayern, die in eine konkrete Handlung übergeht
(„Bauantrag stellen", „Tragwerksplaner beauftragen",
„B-Plan anfordern"), beginnt mit:

  „Vorbehaltlich der Prüfung durch eine/n bauvorlageberechtigte/n
   Architekt:in nach BayBO Art. 61: [Konkrete Handlung]."

Dies ist die Bayern-konforme Ausprägung der Vorbehalt-Klausel aus
SHARED. Sie ist Teil der Rechtsarchitektur — nicht eine Floskel.
`
