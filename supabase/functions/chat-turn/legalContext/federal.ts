// ───────────────────────────────────────────────────────────────────────
// Phase 3 — legalContext/federal.ts
//
// Federal-law content. BauGB, BauNVO, GEG, § 246e BauGB Bauturbo.
// Loaded between SHARED_BLOCK and BAYERN_BLOCK so the model has the
// federal layer in mind before it descends into Bavarian specifics.
//
// Audit B4 fix is applied to § 246e BauGB: the model must NOT
// pauschal feststellen "§ 246e ist anwendbar" — it must always be
// presented as a possibility to verify, never as a given.
// ───────────────────────────────────────────────────────────────────────

export const FEDERAL_BLOCK = `══════════════════════════════════════════════════════════════════════════
BUNDESRECHT — der gemeinsame Rahmen aller Bundesländer
══════════════════════════════════════════════════════════════════════════

══════════════════════════════════════════════════════════════════════════
BauGB — Baugesetzbuch (planungsrechtlicher Rahmen)
══════════════════════════════════════════════════════════════════════════

§ 30 BauGB — Vorhaben im qualifizierten Bebauungsplan
  Im Geltungsbereich eines qualifizierten Bebauungsplans (Festsetzungen
  zu Art und Maß der baulichen Nutzung, Bauweise, Erschließung) ist ein
  Vorhaben zulässig, wenn es den Festsetzungen entspricht UND die
  Erschließung gesichert ist (§ 30 Abs. 1).

§ 34 BauGB — Vorhaben im unbeplanten Innenbereich
  Im im Zusammenhang bebauten Ortsteil ist ein Vorhaben zulässig, wenn
  es sich nach Art und Maß der baulichen Nutzung, der Bauweise und der
  Grundstücksfläche, die überbaut werden soll, in die Eigenart der
  näheren Umgebung einfügt UND die Erschließung gesichert ist.

§ 35 BauGB — Vorhaben im Außenbereich
  Im Außenbereich ist ein Vorhaben grundsätzlich nur zulässig, wenn es
  privilegiert ist (§ 35 Abs. 1: land-, forstwirtschaftliche Betriebe,
  öffentliche Versorgung, gartenbauliche Erzeugung u. a.). Sonstige
  Vorhaben (§ 35 Abs. 2) sind regelmäßig unzulässig — sie dürfen nur
  zugelassen werden, wenn ihre Ausführung öffentliche Belange nicht
  beeinträchtigt.

  WICHTIG für die EHRLICHKEITSPFLICHT: Erkennen Sie eine Außenbereichs-
  Indikation (z. B. Adresse am Stadtrand, freistehende Lage zwischen
  Acker- oder Forstflächen), benennen Sie § 35 BauGB explizit und
  setzen Sie completion_signal=blocked, bis die Privilegierung
  geklärt ist. Versprechen Sie keine Verfahrensart, solange die
  § 35-Frage offen ist.

══════════════════════════════════════════════════════════════════════════
BauNVO — Baunutzungsverordnung (Gebietstypen)
══════════════════════════════════════════════════════════════════════════

Die im Bebauungsplan festgesetzte BauNVO-Gebietsart bestimmt, welche
Nutzungen zulässig sind:

  • WR — Reines Wohngebiet (§ 3 BauNVO): nur Wohnen
  • WA — Allgemeines Wohngebiet (§ 4 BauNVO): vorwiegend Wohnen,
         eingeschränkt nicht-störende Nutzungen
  • WB — Besonderes Wohngebiet (§ 4a BauNVO)
  • MD — Dorfgebiet (§ 5 BauNVO)
  • MI — Mischgebiet (§ 6 BauNVO): Wohnen + nicht-wesentlich-störendes
         Gewerbe gleichrangig
  • MK — Kerngebiet (§ 7 BauNVO): zentrale Geschäfts- und
         Verwaltungsfunktionen
  • GE — Gewerbegebiet (§ 8 BauNVO)
  • GI — Industriegebiet (§ 9 BauNVO)
  • SO — Sondergebiet (§§ 10–11 BauNVO)

Bei Umnutzung Gewerbe → Wohnen prüfen Sie immer die BauNVO-Konformität:
Wohnen in einem GE oder GI ist regelmäßig nicht zulässig — eine
Befreiung nach § 31 BauGB ist im Einzelfall erforderlich. Nehmen Sie
nicht stillschweigend an, Wohnen sei automatisch zulässig.

══════════════════════════════════════════════════════════════════════════
§ 246e BauGB — Sonderregelungen für den Wohnungsbau ("Bauturbo")
══════════════════════════════════════════════════════════════════════════

§ 246e BauGB (eingefügt 2024) erlaubt unter engen Voraussetzungen
befristete Befreiungen von Festsetzungen des Bebauungsplans, von § 34
BauGB und von Vorschriften der BauNVO — zur Beschleunigung des
Wohnungsbaus.

DISZIPLIN bei § 246e BauGB:

  § 246e BauGB darf nur dann als anwendbar dargestellt werden, wenn
  (i)  eine gemeindliche Festsetzung nach § 246e Abs. 1 vorliegt, UND
  (ii) das Vorhaben den Schwellenwerten und Voraussetzungen entspricht.

  In allen anderen Fällen ist § 246e ausschließlich als zu prüfende
  Möglichkeit zu nennen, niemals als gegeben anzunehmen. Formulieren
  Sie z. B.: „Es ist offen, ob § 246e BauGB hier greift — das setzt
  eine konkrete gemeindliche Festsetzung voraus, die das Bauamt der
  Stadt bestätigen müsste."

  Versprechen Sie niemals "Bauturbo greift hier", ohne dass beide
  Bedingungen geklärt sind.

══════════════════════════════════════════════════════════════════════════
GEG 2024 — Gebäudeenergiegesetz
══════════════════════════════════════════════════════════════════════════

Das GEG (in Kraft seit 1. November 2020, novelliert zum 1. Januar
2024 — sog. „GEG 2024") löst EnEV / EnEG / EEWärmeG ab. Es regelt:

  • Energieeffizienz-Anforderungen für Neubau (Niedrigstenergiegebäude-
    Standard, KfW-Effizienzhaus-Logik)
  • Anforderungen an Bestandsgebäude bei wesentlicher Sanierung
    (Außenwand, Dach, Geschossdecke, Fenster)
  • Heizungsanforderungen (65-%-Regel für erneuerbare Energien bei
    neuen Heizungsanlagen ab 1. 1. 2024 in Neubaugebieten; gestaffelt
    in Bestandsgebieten je nach kommunaler Wärmeplanung)
  • Wärmeschutznachweis (§ 8 GEG) als Bestandteil jedes Bauantrags
    für Neubauten

Zuständig in Bayern: Bayerische Architektenkammer (BAYAK) führt die
Liste der nach GEG zugelassenen Energieberater (Energieeffizienz-
Experten); BAFA/dena/KfW betreiben die bundesweite Liste.

══════════════════════════════════════════════════════════════════════════
BNatSchG — Bundesnaturschutzgesetz (Eingriffsregelung)
══════════════════════════════════════════════════════════════════════════

Ein Eingriff in Natur und Landschaft (§ 14 BNatSchG) löst eine
Vermeidungs-, Minimierungs- und Ausgleichspflicht aus. Bei Bauvorhaben
typisch betroffen: Versiegelung von Bodenfläche, Entfernung von
Bäumen / Gehölzen, Eingriff in Biotope. Die konkrete Ausgleichshöhe
folgt den landesrechtlichen Eingriffsregelungen (in Bayern: BayNatSchG
i. V. m. der Bayerischen Kompensationsverordnung).

══════════════════════════════════════════════════════════════════════════
HOAI 2021 — Honorarordnung für Architekten und Ingenieure
══════════════════════════════════════════════════════════════════════════

Die HOAI 2021 (zuletzt 2021 reformiert: keine verbindliche Mindest-/
Höchstsätze mehr, Honorartafeln gelten als Empfehlung) ordnet die
Leistungen der Architekt:innen und Ingenieur:innen in 9 Leistungs-
phasen (§ 34 HOAI):

  LP 1 Grundlagenermittlung
  LP 2 Vorplanung
  LP 3 Entwurfsplanung
  LP 4 Genehmigungsplanung
  LP 5 Ausführungsplanung
  LP 6 Vorbereitung der Vergabe
  LP 7 Mitwirkung bei der Vergabe
  LP 8 Objektüberwachung — Bauüberwachung und Dokumentation
  LP 9 Objektbetreuung

Für die Bauantragstellung (BayBO Art. 64) ist LP 4 entscheidend.
`
