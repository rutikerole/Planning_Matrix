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
