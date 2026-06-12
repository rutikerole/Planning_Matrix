# T-07 body-ingestion findings — 2026-06-12 (REPORT ONLY)

Companion to `docs/T07_DEEP_DIVE_2026-06-12.md` §5 (risk R7) and the
`fix/t07-prewalk` item-5 ingestion. Four provision bodies were ingested from
primary sources into the corpus (BayBO Art. 57 · BbgBO §§ 61, 62 · HBO § 64a;
fetch metadata on each corpus entry) and the Tier-3 operative-body gate now
covers `T-07|bayern`, `T-07|brandenburg`, `T-07|hessen` (proven RED
pre-ingestion). **No cell or base-block prose was changed** — this doc records
what the body text says, for the walk and for the next authoring pass.

## 1. BayBO Art. 57 (Bayern — base block `t07-anbau.ts`)

Source: BAYERN.RECHT (amtliches Portal), Text gilt ab 01.05.2026; two
consistent fetches; dejure cross-check unavailable (404).

- **Abs. 1 Nr. 1 a** (the 75 m³ anchor): covers „**Gebäude** mit einem
  Brutto-Rauminhalt bis zu 75 m³, außer im Außenbereich …". The provision
  speaks of *Gebäude*, not *Anbauten*. Whether an Anbau qualifies (as
  Errichtung eines Gebäudes in the extension sense) is a commentary/doctrine
  question the body text does not decide. The base block's worked examples
  (`t07-anbau.ts:235-250`) treat an ≤ 75 m³ Anbau as verfahrensfrei — that
  reading needs the pending Bayern-architect review to confirm (review
  checkbox at `t07-anbau.ts:15` is still ☐).
- **Abs. 7 — WRONG-DIRECTION instruction in the base block (F2-class).**
  Body text: Abs. 7's Anzeige covers „**Ausbauten** im Sinne von Abs. 1
  Nr. 18" and „**Nutzungsänderungen** nach Abs. 4 Nr. 1" (2 Wochen, Textform,
  an die **Gemeinde**). It does **not** cover Anbauten. The base block
  instructs the opposite: `t07-anbau.ts:68` („Anzeige nach Art. 57 Abs. 7 ist
  auch hier anwendbar") and `:186` („bei verfahrensfreien Anbauten
  empfohlen"). Per the ingested body an Anbau is neither an Ausbau i.S.v.
  Nr. 18 noch eine Nutzungsänderung — the instructed Anzeige route does not
  exist for it. **REPORT ONLY** — base-block correction is Bayern content
  (architect-review-gated, template-tail change → edge fingerprint move);
  walks recommended for T-07 are HE/BB, so this is not walk-blocking, but it
  must be fixed before any Bayern T-07 walk leans on Abs. 7.
- **Abs. 5** (Beseitigung): verfahrensfrei classes + „mindestens einen Monat
  zuvor der Gemeinde und der Bauaufsichtsbehörde anzuzeigen" — consistent
  with the T-05 anzeige wording (and explains why
  `beseitigungCitationFor('bayern')` = „BayBO Art. 57").

## 2. BbgBO §§ 61, 62 (Brandenburg × T-07 — the recommended thin walk)

Source: BRAVORS (amtliches Vorschriftensystem), BbgBO i.d.F. 15.11.2018,
zuletzt geändert 28.09.2023 — matches the corpus heading layer's Stand.

- **§ 61 Abs. 1 Nr. 1 a:** the BB 75 m³ class requires „Gebäude **ohne
  Aufenthaltsräume**, Toiletten oder Feuerstätten" — a habitable Anbau can
  **never** be verfahrensfrei under Buchst. a (narrower than Bayern's a).
  The Anbau-relevant verfahrensfrei classes are **Buchst. k** (vor der
  Außenwand eines Wohngebäudes errichtete **unbeheizte Wintergärten** aus
  lichtdurchlässigen Baustoffen, ≤ 20 m² Grundfläche **und** ≤ 75 m³ BRI)
  and **Buchst. j** (Terrassenüberdachungen ≤ 30 m², ≤ 4 m Tiefe). A modest
  *habitable* Anbau is NOT verfahrensfrei in BB.
- **§ 62 Bauanzeigeverfahren:** covers „Errichtung **und Änderung** von
  Wohngebäuden der Gebäudeklassen 1 und 2" (incl. Nebenanlagen) within a
  qualified B-Plan (§ 30 Abs. 1/2 BauGB), **optional** („auf Wunsch der
  Bauherrin oder des Bauherrn", abweichend von §§ 63/64), conditions:
  B-Plan-konform + gesicherte Erschließung. Mechanics: 1-week receipt
  confirmation (Abs. 2); start after **1 month** unless untersagt/freigegeben
  (Abs. 3); 4-year validity. **Walk consequence:** a Potsdam Anbau on a
  GK 1/2 EFH inside a qualified B-Plan IS § 62-eligible (Anbau = Änderung) —
  the walk exercises the anzeige tier as designed, and the now-shipped
  neutral anzeige wording (item 1) is what should render.

## 3. HBO § 64a (Hessen × T-07 — the recommended deep walk)

Source: konsolidierter HBO-Volltext des Hessischen Wirtschaftsministeriums
(Broschüre Stand Oktober 2025, „Baupaket I"); amtliches Portal
rv.hessenrecht.hessen.de is a JS shell (NO_TEXT, recorded).

- **Body:** „Bis zum **31. Dezember 2030** gilt § 64 Abs. 1 Satz 1 **Nr. 2
  bis Nr. 5** und Abs. 2 bis 5 entsprechend auch für die **Errichtung von
  Wohngebäuden** im unbeplanten Innenbereich nach § 34 BauGB", with a
  Bauaufsicht month-veto added to the Gemeinde veto.
- **Adjudication of the deep dive's „Errichtung" question:** § 64 Abs. 1
  Satz 1 (the B-Plan Freistellung) explicitly covers „die Errichtung,
  **Änderung** oder Nutzungsänderung". § 64a extends only „die
  **Errichtung** von Wohngebäuden" to § 34 areas — it does **not** carry the
  Änderung alternative across. A typical Anbau is an Änderung of the
  existing Wohngebäude → per body text it does **NOT** ride § 64a in
  unbeplanter Innenbereich (route there: vereinfachtes Verfahren § 65). In
  qualified B-Plan areas an Anbau IS freistellungsfähig via § 64 Abs. 1
  Satz 1 directly.
- **Cell impact (REPORT ONLY):** the HE × T-07 cell's hedge „bei
  Wohngebäuden ggf. erweitert nach § 64a HBO" (stateOverrides T-07 hessen
  cell, ROUTING section) is likely over-inclusive for an Anbau. The walk
  should probe exactly this; any cell correction is an authoring change
  (light legal review per Bucket-B discipline), not part of this branch.
- Useful walk mechanics from § 64 Abs. 3: Bauvorlagen to the
  Bauaufsichtsbehörde, Gemeinde month-veto (no Prüfpflicht), start permitted
  after the month absent veto; § 64a sunsets 2030-12-31.

## Gate

`verify:template-tail-citations` Tier-3 `OPERATIVE_BODY_REQUIRED` extended:
`'T-07|hessen': ['64a']`, `'T-07|brandenburg': ['61','62']`,
`'T-07|bayern': ['57']` — proven RED pre-ingestion (4 missing-body
violations), GREEN post-ingestion (9 §§ body-verified repo-wide).
