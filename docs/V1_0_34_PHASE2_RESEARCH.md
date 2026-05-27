# V1.0.34 Phase 2 Research — Full-Matrix Synthesis

> Branch `phase-2/full-matrix` (on top of the 4 Phase-1 commits). Bayern SHA `b18d3f7…b3471` MATCH at write time. NO code written yet — this is the Turn-1 research checkpoint mandated before Turn 3.
> 7 parallel agents: A1 codebase architecture, A2 16-state law, A3 template deltas, A4 competitor/market, A5 bug audit, A6 cost/timeline sourcing, A7 registry design.
> **Verification discipline:** every legal/cost/timeline claim carries its source URL and a tag — `[VERIFIED]` = an agent fetched a primary/authoritative page and the value appears there; `[UNVERIFIED]` = could not confirm against a primary source → must NOT ship without a licensed reviewer. Nothing here is presented as chamber-grade fact unless tagged `[VERIFIED]` against a primary source.

---

## 0. THREE THINGS THE RESEARCH CONTRADICTED (read this first)

**INVERSION 1 — Your own Bau-Turbo date is wrong, twice; the code is wrong a third way.** Your prompt says "real date: 2026-10-30 in force" (top) and "2025-10-30" (Commit 4); `federal.ts:77` says "eingefügt 2024". The verified truth (A2 + A5, against gesetze-im-internet.de): **§ 246e BauGB entered into force 30 October 2025** and **sunsets 31 December 2030**. `2026-10-30` is not a real date for this provision. Commit 4 must use **2025-10-30 in force / 2030-12-31 sunset**, not 2026. [VERIFIED https://www.gesetze-im-internet.de/bbaug/__246e.html]

**INVERSION 2 — The "substantive/correct" content you're building on contains multiple verified § errors.** The premise that the 5 substantive states + authored templates are correct-and-current is FALSE. A3 found, against gesetze-bayern.de:
- **T-07 Anbau cites Abstandsflächen "0,4 H"** — wrong for a München-narrowed product. München (>250k inhabitants) → **Art. 6 Abs. 5a → 1,0 H**. 0,4 H is the sub-250k rule. This mis-sites every boundary-near Anbau. [VERIFIED]
- **T-08 cites Garage verfahrensfrei "≤ 30 m²"** — current Art. 57 Abs. 1 Nr. 1 b is **50 m²**. [VERIFIED]
- **T-02 MFH:** GK 3/4 definitions factually wrong (invented "≥3 NE" qualifier); Brandschutz-prüfpflicht stated at GK 4 but is **GK 5/Sonderbau (Art. 62b)**; Spielplatz cited "Art. 8 Abs. 2" but is **Art. 7 Abs. 3** (+ communalized to München Satzung 927, 01.10.2025). [VERIFIED]
- **T-06 Aufstockung:** Art. 46 Abs. 6 marked "Stand: stabil" but was **introduced 01.01.2025**; the "Bestand never re-qualified" claim omits the **notwendige-Treppenräume carve-out** (an over-absolute, liability-exposing claim). [VERIFIED]

**The quality bar you set — "would a German architect find an error that embarrasses us?" — the honest answer for T-02/T-06/T-07/T-08 today is YES.** Accuracy fixes to existing content must precede any expansion built on top of it.

**INVERSION 3 — Parts of your "no fabrication, primary-sourced" non-negotiable are not satisfiable from free sources by an LLM.** Specifically:
- **Per-state cost factors: no free primary source exists.** BKI Regionalfaktoren are paywalled + at Kreis (district) granularity, not per-Bundesland; Destatis Baupreisindex is **national-only** (no per-state index exists in free public data). The only all-16-state table is a *commercial calculator* (secondary). So "every cost figure has a BKI/HOAI source" cannot be met for regional factors without a paid BKI purchase by a human. (A6) [VERIFIED bki.de paywalled; VERIFIED destatis bpr110 national-only]
- **11-state law authoring has real gaps** (PV-Pflicht norms unverified for 8 states; Bauvorlagenverordnung not sourced for *any* state; some STP/BVB headings unconfirmed) and rests on authoritative-secondary sources (baunormenlexikon), not primary text read line-by-line. (A2)
- **An LLM cannot be the final legal authority.** The drift gate checks *consistency*, not *correctness*. Authoring 11 states to "chamber grade" is exactly the wrong-§ risk this product exists to prevent — it needs your licensed-reviewer loop (the architect-verify feature).

**Consequence for Turn 3:** Commits 5 (cost) and 8 (11 states) as written ("chamber-grade, no fabrication, unlock everything") cannot be honestly closed autonomously. They must be re-scoped to "ship only what is `[VERIFIED]` against a primary source; honest-stub the rest." And the commit ORDER is wrong (see §7). This is the central decision for the checkpoint.

---

## 1. Law research dossier — 16 states (Agent 2)

**Bau-Turbo §246e BauGB:** in force **30.10.2025**, sunset **31.12.2030** (Abs. 4 limits when an exemption may be granted, not permit validity). Requires municipal consent (§36a BauGB), 3-month consent window, Genehmigungsfiktion on silence. [VERIFIED gesetze-im-internet.de/bbaug/__246e.html; bundestag.de kw41-2025]

**BW reform "Gesetz für das schnellere Bauen":** law 18.03.2025, **in force 28.06.2025**; introduced **Genehmigungsfiktion § 58 Abs. 1a LBO** (deemed approval if no decision in 3 months), expanded §52 simplified procedure, integrated LBOAVO into LBO. [VERIFIED dejure.org/gesetze/LBO/2.html]

**Procedure-article map (legend: VF=verfahrensfrei ≈ BayBO Art.57, FREI=Freistellung ≈ Art.58, VEREINF=vereinfacht ≈ Art.59, VOLL=regulär; GK=Gebäudeklassen, BVB=Bauvorlageberechtigung, STP=Stellplätze). All rows [VERIFIED] against the cited portal unless flagged.**

| State | LBO + date | VF / FREI / VEREINF / VOLL | GK | BVB | STP | PV-Pflicht | Coverage |
|---|---|---|---|---|---|---|---|
| Bayern | gilt 01.05.2026 (gesetze-bayern.de) | Art.57 / 58 / 59 / 60 | Art.2 | Art.61 | Art.47 | Art.44a (Soll Wohn 2025) | FULL |
| NRW | Fass. 1.1.2024 (recht.nrw.de PDF) | §62 / 63 / 64 / 65 | §2 | §67 | §48 | §42a + SAN-VO | FULL (primary PDF) |
| BW | 28.06.2025 (dejure) | §50 / §51 Kenntnisgabe / §52 / §58 (+§58 Abs.1a Fiktion) | §2 | §63 | §37 | KlimaG BW (not LBO) | FULL |
| Hessen | 20.07.2023 (off. PDF) | §63 / 64 / 65 / 66 | §2 | §67 | §52 | none (resid.) | FULL (primary PDF) |
| Niedersachsen | amend 25.06.2025 | §60 / §62 / 63 / 64 | §2 | §65 ⚠confirm heading | §47 | §32a | FULL (minor) |
| Berlin | SBG 22.12.2024 (Senate PDF) | §61 / 62 / 63(+63a) / 64 | §2 | §65 | ⚠§-cite (no general Pkw duty) | SolG Bln (separate) | FULL proc |
| Hamburg | new HBauO 01.01.2026 | §61 / 62 / 63 / 64(+64a) | §2 | §65 | ⚠§-cite | ❓ PV norm | FULL proc / gaps |
| Bremen | new 01.07.2024 (off. PDF) | §61 / 62 / 63 / 64 | §2 | §65 | §49 | ❓ PV norm | FULL proc / PV gap |
| Brandenburg | amend 28.09.2023 (bravors) | §61 / §62 Bauanzeige / 63 / 64 | §2 | §65 | §49 | §32a | FULL |
| M-V | amend 18.03.2025 | §61 / 62 / 63 / 64 | §2 | §65 | §49 | ❓ PV | FULL proc / PV gap |
| RLP | amend 19.11.2025 | §62 / §67 Freistellung / §66 / §70 (BVB §64 — non-standard order) | §2 | §64 | §47 | ❓ PV | FULL proc (odd order) |
| Saarland | amend 27.08.2025 | §61 / §63 / 64 / 65 (+1 shift) | (in §2 area) | §66 | §47 | §12a–c | FULL |
| Sachsen | amend 01.03.2024 | §61 / 62 / 63 / 64 | §2 | §65 | §49 | ❓ PV | FULL proc / PV gap |
| Sachsen-Anhalt | amend 13.06.2024 | §60 / 61 / 62 / 63 (−1 shift) | §2 | §64 | §48 | ❓ PV | FULL proc / PV gap |
| SH | new 05.07.2024 | §61 / 62 / §63 (+Fiktion) / 64 | §2 | §65 | §49 | ❓ PV | FULL proc / PV gap |
| Thüringen | new 02.07.2024 | §63 / 64 / 65 / 66 (+2 shift) | §2 | §67 | §52 | ❓ PV | FULL proc / PV gap |

**MBO divergences an architect knows cold (must be encoded):** procedure §-numbers are NOT uniform (Bayern uses Articles; Sachsen-Anhalt −1; Thüringen +2; NRW/Hessen own; BW/RLP own schemes). BW/Brandenburg/RLP replace "Genehmigungsfreistellung" with Kenntnisgabe/Bauanzeige/Freistellungsverfahren respectively (NOT interchangeable). Genehmigungsfiktion confirmed only in BW (§58 Abs.1a) + SH (§63). PV-Pflicht lives in different statutes per state (BauO vs separate climate/solar law vs none). Stellplatzpflicht heavily devolved (Bayern abolished state baseline 01.10.2025; Berlin none).

**Licensed-reviewer-required before any client-facing citation (A2's honest gap list):** PV norms for HH/HB/MV/RLP/SN/ST/SH/TH; **Bauvorlagenverordnung per state — NOT sourced for any of the 16** (a known cross-cutting gap); Berlin/Hamburg STP §; Niedersachsen §65 heading. Source tiers: primary+locally-parsed (Bayern, NRW, Hessen, Bremen, Berlin) > authoritative-secondary (baunormenlexikon/VORIS/bravors, the other 11) — full article body text behind some paywalls was not read line-by-line.

---

## 2. Template delta map (Agent 3) — including errors in already-authored templates

All 8 templates are fully authored LLM-prompt strings; **the deterministic PDF engine ignores their legal richness** (procedure comes from `resolveProcedure.ts`, which is NRW-Sanierung-complete only; everything else → conservative `'standard'`). Per-template findings (smallest credible unlock in **bold**):

- **T-02 MFH:** Errors — GK 3/4 defs (→ Art. 2 Abs. 3), Brandschutz prüfpflicht GK4→GK5/Sonderbau (Art. 62b), Spielplatz Art. 8 Abs. 2 → **Art. 7 Abs. 3** + München Satzung 927. Missing: München 3-month Genehmigungsfiktion. **Fix 3 citations + 1 doc-condition note in `requiredDocuments.ts:215-217`.** [VERIFIED gesetze-bayern.de BayBO-2/-62b/-7]
- **T-04 Nutzungsänderung:** Most-correct template. Missing: Art. 60 / 62–62b anchor on the Abs. 4 verfahrensfrei test; a TA-Lärm/BImSchG citation for gewerbe→Wohnen (named in cost basis, absent from citations). **Precision additions only.** [VERIFIED]
- **T-06 Aufstockung:** Art. 46 Abs. 6 "stabil" → **01.01.2025**; add **notwendige-Treppenräume carve-out**; add **Abstandsflächen-recalculation leitfrage** (added height changes Art. 6 in München's 1,0 H regime). [VERIFIED]
- **T-07 Anbau:** **"0,4 H" → "1,0 H (München, Art. 6 Abs. 5a; 0,5 H 16-m-Privileg)"** everywhere — highest-value correction in the whole set (München-narrowed product). Add GRZ leitfrage (BauNVO §19). [VERIFIED schels.info + München Abstandsflächen 2025 PDF]
- **T-08 Sonstiges:** Garage **30→50 m²** (Art. 57 Abs. 1 Nr. 1 b); add Werbeanlagen anchor Art. 57 Abs. 1 Nr. 12 + GVBl. 2026 S. 75 (in force 01.04.2026); **downgrade Pool "100 m³" to `[UNVERIFIED]`** (could not pin to a clean Art. 57 anchor — do not assert). Code: `resolveProcedure.ts` needs a sonstiges branch (ambiguous small-anlage currently prints "regular permit required · ASSUMED"). [VERIFIED gesetze-bayern.de BayBO-57; verkuendung-bayern.de/gvbl/2026-75]

**Ranked corrections:** (1) T-07 0,4H→1,0H, (2) T-08 Garage 30→50, (3) T-02 Brandschutz+GK defs, (4) T-02 Spielplatz, (5) T-06 dating+Treppenraum, (6) code: PDF timeline hardcoded to T-03 24-wk Gantt + Neubau doc set shared EFH/MFH (`requiredDocuments.ts:196-258`), neither reads template GK/procedure.

---

## 3. Bug status (Agent 5) — exact geometry

| Bug | State (file:line) | Fix | Blocks Phase 2? |
|---|---|---|---|
| **60** signature | Original Bauherr overlap fixed (`verification.ts:285-301`). **NEW unguarded class:** architect name size 12, no ellipsize, at x=MARGIN(48), y=sigStartY-50 (`verification.ts:216-225`); chamber column starts x≈317.64 → **269.64 pt runway**; a self-attested name >~38-42 chars collides. `architect_name` is uncapped `text` (`0037...`/`0036`). Smoke harness is pdf-parse text-only — **zero coordinate/overlap assertions**. | `ellipsizeToWidth(name, sigHalfW+40-MIN_GAP)` at `verification.ts:216-225` | No — parallel |
| **78** Key Data | `keyData.ts:138-233` flat `forEach`, no `addPage`/margin guard. Practical break **~17 rows**; footer hairline at y=76. Demo cells 10/13/14 fit. | paginate + repeat header + update TOC/page-count (`exportPdf.ts:1510-1542`) | **YES — blocks rich-fact template unlocks (T-02/T-04/T-08 exceed 17)** |
| **117** erosion | facts-only (`projectStateHelpers.ts:352,397`); recs/procs/docs/roles blind-merge qualifier → stale VERIFIED on edit | generalize `wasVerified` downgrade to the other 4 collections | No — parallel |
| **timeline** | `timeline.ts` only DEFAULT 24-wk + DEMOLITION 10-wk; no sourced T-02/03/04/06/07/08 arcs | author sourced review-wait arcs (§5) | No |
| **§246e date** | `federal.ts:77` "eingefügt 2024" — wrong | → "in Kraft seit 30.10.2025, befristet bis 31.12.2030" | No (Commit 4) |

---

## 4. Cost + timeline sourcing (Agent 6)

**Cost — the hard truth:** the engine's `REGION_MULT` has only `bayern: 1.0`; all 15 other states silently fall to 1.0 (`costNormsMuenchen.ts:135-137,215`). No per-state factor is calibrated or sourced.
- **BKI Regionalfaktoren: paywalled, Kreis-level, no per-state aggregate, no API.** [VERIFIED bki.de/bki-regionalfaktoren]
- **Destatis Baupreisindex: national-only** (table 61261; no per-state index in free public data). GENESIS REST API is real + guest-auth (`GAST/GAST`) but was in scheduled maintenance at test time; endpoint shape confirmed. [VERIFIED destatis bpr110 + live API call returning documented maintenance envelope]
- Only all-16-state table found = commercial calculator baukostenplan.de (secondary, Niedersachsen-based). **Entire table is `[UNVERIFIED]` — must NOT ship as a calibrated factor.** Directional sanity (Bayern most expensive, Sachsen-Anhalt cheapest) is correct.
- **HOAI 2021 Zone III** values `[VERIFIED hoai.de]` but **two free hosts disagree by one Honorarzone column** — must be human-confirmed against Gesetzestext/BAK RifT before any HOAI figure ships. Engine ignores §36 Umbauzuschlag entirely.

**Timeline — partially sourceable.** Statutory anchors `[VERIFIED gesetze-bayern.de]`: Art. 58 Freistellung = begin 1 month after submission; Art. 68 = 3-week completeness then decision clock. Practitioner ranges `[VERIFIED planecobuilding/construyo/Bauamt Frankfurt]`:

| Procedure | Legal Frist | Practice | Status |
|---|---|---|---|
| verfahrensfrei | none | sofort | [VERIFIED] |
| Freistellung/Anzeige | ~1 month | 2–4 wks | [VERIFIED] |
| vereinfacht | 2 months | 2–4 months | [VERIFIED] |
| regulär | 3 months | 4–6, up to 10 months | [VERIFIED] |
| Nutzungsänderung | follows underlying | 2–3 months | [VERIFIED secondary] |
| Abbruch | Anzeige ~1 month notice | 4–8 wks if permit req. | [VERIFIED] |

**Critical caveat:** the *review-wait* week is sourceable; the *prep/submit/fix* phases and the 24-wk/10-wk totals are **PM estimates, NOT sourceable** — must stay explicitly labelled as estimates. So Commit 5 can improve the wait-window per procedure (sourced) but cannot fully source a complete arc.

---

## 5. Registry architecture (Agent 7) — the one GREEN premise

**SHA-safe: YES (binary).** `bayernSha.mjs:35-53` extracts six `export const NAME = \`…\`` literals by regex from their files and hashes them. The registry can hold Bayern prose **by import reference** (`prose.state: BAYERN_BLOCK`) without changing the hashed bytes — the hasher never imports the registry. **The one trap:** do NOT inline Bayern prose as a registry object property (renames the `export const`, breaks the regex → `Could not extract BAYERN_BLOCK`). Reference by import, never redefine.

**Design:** one `LawEntry` per `BundeslandCode` (TypeScript interface, per-state file — NOT per-template×state), exported from `src/legal/registry/`. Both surfaces import the same entry: LLM reads `prose` (SHA-locked strings), PDF reads structured `citations[]` (with `role` + `layer: federal|state|municipal` + `appliesTo: TemplateId[]` + `provenance`). `allowedCitations` becomes **derived** from `citations` (firewall + PDF can't disagree). Federal law (BauGB/GEG/HOAI) is a sibling singleton, authored once. `stateLocalization.ts` + `stateCitations.ts` become thin adapters during migration, then deleted. Provenance ceiling: registry citations top out at `LEGAL·CALCULATED`; only `verify-fact` realises `AUTHORITY·VERIFIED` (don't mix).

**Migration (3 commits, SHA gate each):** (1) registry alongside, `compose.ts` reads `prose` but emits byte-identical concatenation → SHA passes by construction; (2) repoint PDF engine to adapters, snapshot 3 demo cells byte-identical; (3) delete legacy tables, `allowedCitations` derived (update `verify-citation-drift.mjs:31,77` which hard-codes the bayernAllowedCitations path), extend drift gate to all 16 states. **Flag:** Bayern PDF procedure path routes through `detectProcedure` in `costNormsMuenchen.ts`, not `resolveProcedure.ts` — unifying it would change Bayern PDF bytes; defer to a post-migration commit.

---

## 6. Competitive map (Agent 4)

No competitor combines (a) AI pre-planning brief + (b) per-state×template PDF deliverable + (c) architect verification flipping Vorläufig→Verifiziert with named chamber attribution. Closest: **Syte/KImberly** (AI buildability — but authority-side, no sign-off), **Planeco/Construyo** (real architects, fixed-price — but human-only, no AI-draft-then-verify, no productized artifact). The verification model is **corroborated by German legal structure**: only a Bauvorlageberechtigter may legally sign, and chambers run di.BAStAI (registration registry) — PM's named-architect+chamber field mirrors infrastructure chambers endorse. [VERIFIED]

**Three strategic caveats (none fatal):** (1) liability framing must be airtight — BAK is explicit the architect stays liable; the flip must be the architect *assuming* responsibility with audit trail, not "AI says so"; (2) Planeco/Construyo could bolt an AI layer on faster than PM builds fulfillment — the moat is the *split workflow + productized artifact*; (3) **architect chambers actively OPPOSE Bau-Turbo §246e** (BayAK "eindringlicher Appell") — a §246e feature must be a neutral qualification *assessment*, not cheerleading, or it alienates the architects PM needs. Real pain it addresses: 30–40% of Bauanträge returned incomplete; processing times +~6 months since 2020. [VERIFIED]

---

## 7. Re-sequencing forced by the research

The plan's commit order has two ordering defects the research exposed:
1. **Accuracy fixes to EXISTING template content (T-02/T-06/T-07/T-08) must come BEFORE unlocking those templates** (Inversion 2) — you cannot unlock T-07 while it cites 0,4 H.
2. **Bug 78 (Key Data pagination) must come BEFORE template unlocks** (A5/Q5) — T-02/T-04/T-08 are rich-fact templates that exceed the ~17-row break; unlocking them onto a broken table ships overflow.

And two commits cannot be closed to the stated non-negotiable autonomously:
3. **Commit 5 cost** — no free per-state cost source exists; re-scope to "honest 'regional factor not yet calibrated' + Bayern baseline" rather than fabricate.
4. **Commit 8 (11 states)** — authorable to a *draft* from A2's dossier, but PV/BauVorlV gaps + secondary-source tiers mean it needs a licensed reviewer before client-facing. Re-scope to "author only `[VERIFIED]`-primary fields; keep honest 'in Vorbereitung' on anything unverified."

**Proposed re-sequenced order:** C4 (Bau-Turbo date + §-accuracy fixes to existing templates — highest accuracy/lowest risk) → C11-Bug78 (unblock rich-fact tables) → C6 (registry + federal + Bayern, SHA-safe) → C5 (timeline arcs, sourced-wait + labelled estimates) → C7 (5 substantive states into registry + their accuracy fixes) → C9/C10 (template unlocks, now on fixed content + paginating table) → C8 (stub states — drafts, honest-stub the unverified) → Bug60/117 → DE/EN parity. Cost-factor calibration is deferred pending a human BKI pull.

---

*Bayern SHA MATCH at end of research. No code, no constitutional file touched. This document + the V1_0_33 plan are the two untracked deliverables on the branch.*
