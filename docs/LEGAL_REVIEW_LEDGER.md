# Legal Review Ledger — standing

Entries here are shipped content changes (or content holds) that await
confirmation by a licensed reviewer (Bauvorlageberechtigte:r / Fachanwalt:in
für Bau- und Architektenrecht). An entry stays OPEN until a named reviewer
signs off; the commit that closes it must reference the entry id.

Status vocabulary: **BLOCKED-ON-LAWYER-CONFIRM** (shipped, flagged, awaiting
review) · **CONFIRMED** (reviewer signed off) · **REVERTED** (review rejected
the change; content rolled back).

---

## LRL-1 · BW × T-06 stateOverrides cell — Aufstockung privilege re-author

- **Status:** BLOCKED-ON-LAWYER-CONFIRM
- **Opened:** 2026-06-11 (branch `fix/t06-walk1`, BW/Stuttgart T-06 walk 1)
- **What shipped:** the BW × T-06 cell (`src/legal/templates/stateOverrides.ts`,
  `'T-06'.bw`) was re-authored against INGESTED provision bodies
  (`scripts/legal-corpus/states/bw.json` §§ 2, 5, 27f, 37, 56 —
  `body_de_official`, source: AKBW Merkblatt 610 konsolidierter Volltext,
  Stand 16.03.2026; § 37 load-bearing sentences cross-checked verbatim against
  dejure.org; official portal landesrecht-bw.de attempted twice, JS shell,
  NO_TEXT). New cell content:
  1. § 27f LBO BW scoped correctly as Brandschutz-/GK-Sprung-Entschärfung
     (Abs. 2/3) — it contains NO Stellplatz and NO Abstandsflächen rule.
  2. Abstandsflächen privilege § 5 Abs. 5 Satz 2 Nr. 1 LBO BW (≤ 2-storey
     Wohnraum-Aufstockung within the existing footprint not counted toward
     Wandhöhe; building ≥ 5 years).
  3. Stellplatz exemption § 37 Abs. 3 Satz 2 LBO BW (no additional parking
     for Wohnraum-Aufstockungen on ≥ 5-year buildings) + Ablöse exclusion for
     dwellings § 37 Abs. 7 Satz 1 with mandatory Abweichung (Satz 2).
  4. Mandatory Abweichungen § 56 Abs. 2 Nr. 1 LBO BW.
  5. GK height measure pinned to § 2 Abs. 4 Satz 2 LBO BW (FOK oberstes
     Aufenthaltsraum-Geschoss — never Trauf-/Firsthöhe).
- **What the reviewer must confirm:**
  - The privilege readings above (esp. § 37 Abs. 3 S. 2 applied to a project
    adding 2 flats on a 1957 building, and § 37 Abs. 7's exclusion of the
    Ablöse route for notwendige Wohnungs-Stellplätze).
  - **The open question the cell deliberately does NOT answer:** the
    relationship between the state-law exemption (§ 37 Abs. 3 S. 2 LBO BW)
    and MUNICIPAL Stellplatzsatzungen (örtliche Bauvorschriften, § 74 LBO
    BW) — can a Satzung re-impose parking for Wohnraum-Aufstockungen the
    state law exempts? The cell instructs the persona to flag this as an
    open question, never to decide it.
  - § 27f Abs. 2 conditions list is summarised, not exhaustive — confirm the
    summary does not overpromise.
- **Walk finding adjudicated (F2):** walk 1's
  `stellplatz_abloesung_erforderlich = true · LEGAL · CALCULATED` and the
  turn-7 "the City of Stuttgart may require an Ablösung" answer were
  wrong-direction per the ingested § 37 text (exemption + Ablöse exclusion).
  Persona/directive changes ride the SHA bundle (SPRINT_PLAN, "Persona
  directive bundle" items 3–5); this entry covers the CELL content only.
- **Gate:** `verify:template-tail-citations` Tier-3 now requires ingested
  body text for every operative-effect § in this cell (registry
  `OPERATIVE_BODY_REQUIRED['T-06|bw']`).

---

# Corpus verification ledger — standing

Verification items that need a primary-source confirmation (not a licensed
reviewer). Filed 2026-06-12 (fix/t07-prewalk, T-07 deep-dive Finding 0 —
previously these existed only in session memory). An entry closes when the
corpus entry is re-verified against the official source and the commit
references the entry id.

## CVL-1 · §§ 15 / 38 LBO BW heading-check against the 2026 Neufassung

- **Status:** OPEN (headings consistent at mirror tier; primary re-check pending)
- **What:** `§ 15 LBO BW` (cited as Brandschutz, `stateCitations.ts:139`,
  `states/bw.ts:382`) and `§ 38 LBO BW` (Sonderbauten, `states/bw.ts:388`,
  `stateOverrides.ts:908`). The 2026-06-12 deep dive confirmed both corpus
  headings match their usage ("Brandschutz" / "Sonderbauten") — but the
  bw.json heading layer is the 2025-03-18 secondary-mirror stand, while the
  BW systemBlock attests a 16.03.2026 Neufassung ("Bauturbo"-Anpassung).
  Confirm neither § was renumbered/retitled by the Neufassung (AKBW
  Merkblatt 610 Volltext is the proven source for LBO BW).

## CVL-2 · § 51 NBauO primary-source verify

- **Status:** OPEN
- **What:** `§ 51 NBauO` = "Sonderbauten" exists in
  `scripts/legal-corpus/states/niedersachsen.json` heading-only at
  `verification_tier: secondary-mirror` (fetched 2026-05-27,
  baunormenlexikon.de). It is allowlisted and instructed (the ni-s51 class).
  Confirm heading + currency against voris/Nds. primary source and upgrade
  the tier field.

## CVL-3 · § 51 GEG (Erweiterung und Ausbau) corpus ingestion

- **Status:** OPEN
- **Opened:** 2026-06-13 (T-07 Hessen walk 1, secondary finding)
- **What:** For a **heated Anbau** to an existing building, the correct GEG
  provision is **§ 51 GEG 2024 — "Anforderungen an ein bestehendes Gebäude bei
  Erweiterung und Ausbau"** (new heated/cooled rooms must meet the 1.2×
  Referenzgebäude transmission-loss limit, Anlage 1; the **50 m²** threshold
  adds the § 14 summer-heat requirement; for Nichtwohngebäude, >100 %
  Nutzflächen-extension triggers full new-build §§ 18/19). The corpus
  (`scripts/legal-corpus/federal.json`, `laws.GEG`) carries only §§ **8, 10,
  48, 80** — **§ 51 is MISSING**. This is the § 27f-lesson: a real operative
  provision absent from corpus.
- **Action:** ingest § 51 GEG body from a primary source (gesetze-im-internet.de
  / official GEG), add to `federal.json` + the allowlists that need it, re-run
  `verify:citations`. Then LRL-2 can re-author the cell citation.
- **Source leads (web, 2026-06-13):** geg-info.de/geg_2024/051_…, BBSR-GEG
  portal "Anbau, Ausbau und Aufstockung", Haufe GEG-2024 synopsis § 51.

---

# Legal Review Ledger — additional entries (T-07 Hessen walk 1)

## LRL-2 · HE × T-07 and base T-07 block — energy-citation re-author

- **Status:** BLOCKED-ON-LAWYER-CONFIRM (not yet shipped — recorded for a later
  authoring pass; gated on CVL-3 ingesting § 51 GEG first)
- **Opened:** 2026-06-13 (T-07 Hessen walk 1)
- **What needs changing:** the T-07 cells' ENERGIE line cites **§ 10 GEG**
  ("Grundsatz und Niedrigstenergiegebäude" — the **new-build** principle) for an
  Anbau. The base block also pairs "§ 10 GEG (Neubau-Teil) · § 48 GEG (Anschluss
  an Bestand)". For a heated extension the dominant provision is **§ 51 GEG**
  (Erweiterung/Ausbau, see CVL-3), not § 10 (new-build) and not § 48 (which is
  exterior-component change). Re-author the HE × T-07 cell
  (`stateOverrides.ts`, HE ENERGIE line) **and** the base `t07-anbau.ts` energy
  line to lead with § 51 GEG once it is in corpus.
- **Reviewer must confirm:** § 51 GEG as the correct primary for a heated Anbau;
  whether § 10 / § 48 retain any secondary role; the 50 m² § 14 summer-heat hinge
  (the walked project is 45 m² → below it).
- **REPORT ONLY this branch** — no cell prose changed on `fix/t07-walk1`.

## LRL-3 · Bayern base T-07 block — Art. 57 Abs. 7 Anzeige is wrong-direction for an Anbau

- **Status:** BLOCKED-ON-LAWYER-CONFIRM / Bayern-architect-gated (SHA-scope:
  editing the base block re-baselines nothing by itself — `t07-anbau.ts` is a
  template tail, NOT in the Bayern SHA prefix — but it moves the edge fingerprint
  and needs the pending Bayern-architect review at `t07-anbau.ts:15`)
- **Opened:** 2026-06-12 (T-07 body-findings, `docs/T07_BODY_FINDINGS_2026-06-12.md`)
- **What:** `src/legal/templates/t07-anbau.ts:68` ("Anzeige nach Art. 57 Abs. 7
  ist auch hier anwendbar") and `:186` ("bei verfahrensfreien Anbauten empfohlen")
  instruct the persona toward an **Art. 57 Abs. 7 Anzeige for an Anbau**. The
  ingested body (`scripts/legal-corpus/states/bayern.json` Art. 57, primary-source
  2026-06-12) shows **Abs. 7 covers only Ausbauten i.S.v. Abs. 1 Nr. 18 +
  Nutzungsänderungen nach Abs. 4 Nr. 1 — NOT Anbauten**. The instruction is
  wrong-direction (F2-class). Not walk-blocking for HE/BB (München-gated), but
  must be corrected before any Bayern T-07 walk leans on Abs. 7.
- **Reviewer must confirm:** the correct verfahrensfrei/Anzeige routing for a
  Bayern Anbau (Art. 57 Abs. 1 Nr. 1 a 75 m³ verfahrensfrei; whether any Anzeige
  duty applies); whether an ≤ 75 m³ Anbau qualifies as a "Gebäude" under Abs. 1
  Nr. 1 a (doctrine question the body text does not decide).

## LRL-4 · BB × T-07 cell — § 62 BbgBO chat-prose framing

- **Status:** BLOCKED-ON-LAWYER-CONFIRM (low severity; structured routing
  already correct, prose-only mischaracterization)
- **Opened:** 2026-06-13 (T-07 Brandenburg walk 2, Potsdam)
- **What:** in the live walk the persona described § 62 BbgBO Bauanzeige as
  "applies only to an exhaustive list of specified cases, not broadly to all
  development within a qualified Bebauungsplan area." The ingested BbgBO § 62
  body (`states/brandenburg.json`, primary-source BRAVORS, per
  `T07_BODY_FINDINGS`) shows § 62 covers "Errichtung und Änderung von
  Wohngebäuden der Gebäudeklassen 1 und 2" in a qualified B-Plan, ELECTIVE at
  the Bauherr's option — our exact fact pattern (GK 1 Wohngebäude, qualified
  B-Plan, Anbau = Änderung). The STRUCTURED deliverable handled this correctly
  (Top-3 items 01/02 + verify-card flag § 62 as the route to confirm), so this
  is NOT a silent-wrong in the artifact — but the chat prose framing
  mischaracterizes the provision and should be corrected in the BB cell to
  match the ingested body (elective, not narrow-list). Reviewer: confirm the
  § 62 scope reading and the elective nature for an Anbau-as-Änderung.
