# Planning Matrix — T-01 Cross-State Audit Report
### Template T-01 · Neubau Einfamilienhaus (New single-family home)

**Audit date:** 29 May 2026
**Auditor role:** Wizard-operator + PDF auditor (per MANUAL_TESTING_HANDOFF.md §8 / §10 / §11)
**Prod state under test:** `main` @ `61dc21f` · planning-matrix.vercel.app · Edge fn (Layer-C) live
**States walked (2 of 16):**

| # | Bundesland | Tier | Banner | City / Address | Doc no. | Confidence |
|---|---|---|---|---|---|---|
| 1 | **Bayern** | deep reference | OFF (correct) | Schaezlerstraße 14, 86150 Augsburg | PM-2026-0529-S39 | 71% |
| 2 | **Rheinland-Pfalz** | thin · unique 1998 numbering | ON (correct) | Schillerplatz 3, 55116 Mainz | PM-2026-0529-S10 | 69% |

**Why these two:** Bayern is the gold-standard baseline that all other states inherit from at T-01 (§9). RLP is the single most dangerous thin state — the *only* one in the corpus with the scrambled 1998 LBauO numbering family (§9: verfahrensfrei § 62, Freistellung § 67, vereinfacht § 66, regulär § 61 + § 70, Bauantrag § 63, bauvorlageber. § 64, Abstand § 8), where any baseline leak or wrong-family mapping shows up loudly. Together they bracket the easiest and hardest cases.

---

## 0 · TL;DR — the one-screen verdict

> **T-01 is NOT release-clean. 3 RED, 7 YELLOW, ~8 COSMETIC.**
> The **legal/conversational engine is excellent** (~90% sound) — it handled the unique RLP numbering live without a single Bayern leak. **The failures live almost entirely in the PDF baseline template**, and the two worst ones reproduce *identically* on both states, which proves they are **baseline-wide bugs, not per-state corpus errors.**

**The single most important finding (RED-1):** Every PDF says the permit path is the **simplified procedure** in its Key-Data/Overview/chat layers, but says the **regular/standard procedure** in its Procedures (Section 05) + Legal-Area-B layers — *inside the same signed document.* BY: Art. 59 vs Art. 60. RLP: § 66 vs § 70. This is the "never silently wrong" trust-contract breach (handoff §1). One shared template field causes it. Fix once → fixes all 16 states.

**Confidence scoring (my calibration):**

| Layer | Confidence it's correct | Basis |
|---|---|---|
| Conversational/legal engine | **~90%** | Both walks legally sound; RLP scrambled family perfect; zero cross-state bleed |
| Banner / tier logic (§4) | **~98%** | Both states behaved exactly per spec |
| Citations (state-correctness) | **~88%** | Chat layer flawless; PDF has the Art.60/§70 default + §5 BauuntPrüfVO inconsistency |
| Cost engine | **~55%** | München-anchored (known), but ALSO ignores elicited inputs + two different basis code-paths |
| PDF artifact integrity | **~70%** | Renders clean, but procedure contradiction + stale München string + truncations |
| **Blended T-01 ship-readiness** | **~72–75%** | Gated by 1 trust-contract RED; cheap to fix |

---

## 1 · Methodology & scope

Per the handoff cadence (§8): one template, multiple states, operator drives the wizard with plausible answers, then audits across the resulting PDFs. This session ran **T-01 across 2 states** (the founder's chosen 2-per-template plan, 8 templates × 2 = 16 state-coverage strategy).

**What was inspected for each walk:**
- Every intake question + the answer fed back (full conversational transcript).
- Live chat surface (banner, citations, procedure routing, authority resolution).
- The exported 13-page B2B PDF, section by section (Executive, Legal A/B/C, Costs, Timeline, Procedures, Documents, Team, Recommendations, Key Data, Verification, Glossary).
- Cross-PDF diff: which fields are identical (→ shared template) vs which diverge (→ state-specific path).

**Audit lens (handoff §1 trust contract):** "never silently wrong." An honest *"preliminary, verify locally"* is acceptable. A confidently-stated *wrong* or *internally-contradictory* fact is the unforgivable class. This report weights internal contradiction and silent-wrong as RED even when each half is individually defensible.

---

## 2 · §8 Checklist scorecard (the handoff's own list)

| §8 Check | Bayern | RLP | Notes |
|---|---|---|---|
| **Address acceptance** | ✅ PASS | ✅ PASS | Both real addresses accepted; BY showed the honest "outside München map pilot — legal analysis still runs" note |
| **§§ correct-for-state** | ⚠️ PARTIAL | 🔴 FAIL | Chat perfect both; PDF has Art.60/§70 default contradiction (RED-1) + RLP §5 BauuntPrüfVO vs §13 LBauO split (YELLOW-3) |
| **Banner state correct (§4)** | ✅ PASS (OFF) | ✅ PASS (ON) | RLP banner names exactly the 5 deep states — textbook |
| **All result tabs render** | ✅ PASS | ✅ PASS* | BY: all 6 tabs screenshotted clean. RLP: PDF complete (tabs not re-shot but content present) |
| **PDF clean (no garble/trunc/missing)** | ✅ PASS | ✅ PASS | 13pp each, no winAnsi garble; minor table truncations are cosmetic |
| **Map loads** | ✅ PASS | n/a | BY map painted (München tiles); RLP map not screenshotted this walk |
| **NO Bayern leak on non-Bayern** | n/a | ✅ PASS | **Zero** BayBO / Art.57-62 / München on RLP. The headline win. |
| **NO fabricated §§** | ✅ PASS | ⚠️ PARTIAL | RLP § 70 is in-family-but-mislabeled (RED-1), not strictly fabricated |
| **Cost basis label honest** | 🟡 YELLOW | 🟡 YELLOW | München-anchored = yellow by design (§7.4); but input-handling bug worsens it |
| **Banner copy correct** | ✅ PASS | ✅ PASS | Well-formed, preliminary wording present where required |

---

## 3 · 🔴 RED findings (stop-and-report)

### RED-1 — Procedure self-contradiction inside one signed PDF *(BOTH states — confirmed baseline-wide)*

**Severity:** 🔴🔴 Highest. Direct breach of the §1 trust contract.

In **both** documents, two different permit paths are asserted in the same brief:

**Bayern (PM-S39):**
- Says **Art. 59 (vereinfacht / simplified)** in: live chat (every turn), Overview "AT A GLANCE → Procedure: Simplified building permit · BayBO Art. 59" (Image 11), Procedure tab heading "Simplified building permit · BayBO Art. 59" (Image 9), Key-Data p.10 "Procedure Likely: BayBO Art. 59 vereinfachtes…", "Verfahren: BayBO Art. 59".
- Says **Art. 60 (regulär / standard)** in: **p.4 Legal Area B** "Standard building permit (BayBO Art. 60) as the starting point"; **p.7 Section 05 Procedures** "Standard building permit · BayBO Art. 60 REQUIRED"; **p.11 Key-Data → Procedure indication** "Standard building permit · BayBO Art. 60 — LEGAL · ASSUMED".

**RLP (PM-S10):**
- Says **§ 66 (vereinfacht)** in: live chat (every turn), Key-Data p.10 "Verfahrensart Hypothese: § 66 LBauO (vereinfachtes Genehmigungsverfahren) — LEGAL · CALCULATED".
- Says **§ 70 (regulär)** in: **p.4 Legal Area B** "Standard building permit (§ 70 LBauO) as the starting point"; **p.7 Section 05 Procedures** "Standard building permit · § 70 LBauO REQUIRED"; **p.11 Key-Data → Procedure indication** "Standard building permit · § 70 LBauO — LEGAL · ASSUMED".

**Why it's RED, not yellow:** A layperson reading p.7 (the "Procedures · permit path" section — the most action-oriented page) will prepare for the **regular** procedure (more documents, longer review, neighbour participation), when the actual computed route is the **simplified** procedure. The two halves of the document disagree about the single most consequential output. This is precisely "confidently citing the wrong path" — silent-wrong by contradiction.

**Root cause (high confidence):** Section 05 Procedures + Legal-Area-B render a **static default** — "Standard building permit · {regulär §}" — that is never overwritten by the *computed* `procedureLikely`. The Key-Data table and Overview read `procedureLikely` correctly; Section 05/Legal-B read a hardcoded `procedureIndication` (note both PDFs literally label it "Procedure indication … LEGAL · ASSUMED" while the real one is "LEGAL · CALCULATED"). Because it reproduces identically across a deep state (BY, Art family) and a thin scrambled state (RLP, § family), it is a **template-layer bug**, not corpus.

**Suspected file/field:** the Section-05 Procedures block + Legal-Area-B in the PDF assembly — `procedureIndication` defaulting to the regulär article instead of inheriting `procedureLikely`. (Handoff §3 file-evidence points at `stateOverrides.ts` / `BLOCKS[T]`; this is the PDF renderer's procedure field, not the SSE/event logic — safe to touch under the UI-only mandate *only if* it is presentation; if it is a content field, route to backend owner.)

**Fix leverage:** ONE field. Patch `procedureIndication → procedureLikely` and the contradiction disappears on all 16 states at T-01 (and almost certainly T-02…T-08, which share the template).

---

### RED-2 — Hardcoded "Munich" string on a non-Munich project *(Bayern)*

**Severity:** 🔴 The §10 "hardcoded München (authority/closure/§)" class, firing intra-Bayern.

**Location:** PM-S39 **p.9 Recommendation #04** and the live Suggestions card (Image 2):
> *"**Munich** permit applications require an official site plan at scale 1:500. Engage the surveyor in LP 3…"*

The project is in **Augsburg**, not Munich. The recommendation copy has Munich hardcoded.

**Aggravating + mitigating:**
- *Mitigating:* the rest of the brief resolved the authority **correctly** — chat Synthesis says "Bauordnungsamt der Stadt **Augsburg** (Rathausplatz 1, 86150 Augsburg)" and Key-Data p.11 marks it "LEGAL · **VERIFIED**". So the authority engine is right; only the recommendation *string* is stale.
- *Aggravating:* it sits in the Top-recommendations / "DO NEXT" surface — high-visibility, action-oriented. And it's intra-Bayern, which means it would *also* mis-fire for München projects' neighbours, Nürnberg, Würzburg, etc. — every non-München Bavarian city.

**Cross-check vs RLP:** The RLP equivalent (PM-S10 p.9 recs) uses the **generic** "the responsible building authority / district office" and "Stadtplanungsamt Mainz" — correct and city-resolved. So the Munich string is hardcoded **specifically into the Bayern baseline recommendation #04**, not the shared rec set. Confirms it's a Bayern-path literal.

**Suspected file/field:** `BLOCKS[T-01]` recommendation #04 (Bayern baseline) — "Munich permit applications require…" literal. Replace with city-token / generic.

---

### RED-3 — Cost engine ignores elicited project size + uses two different basis paths *(BOTH states)*

**Severity:** 🔴 borderline (could be argued 🟡 since cost is known-uncalibrated per §7.4) — escalated to RED because it is a **silent input-drop**, not just a calibration gap, and it produces a **2× cost divergence** that a user would read as "regional," when it's actually a bug.

**Evidence:**
- BY p.5: *"Computed from **400 m² façade**"* — but the elicited net usable floor area was **290 m²** (chat: "Net usable floor area approximately 290 m²"). The 400 is a hardcoded default; the user's 290 was dropped. Architect fee shown €33,300–62,200.
- RLP p.5: *"Computed from **floor area only (façade area not captured)**"* — a *different* basis description entirely. Architect fee shown €15,000–28,000.
- Same template, same HOAI Zone III, two projects of near-identical size (165 m² footprint, 3 storeys + attic both) → **costs differ by ~2×** (BY total €54,900–102,700 vs RLP €24,700–46,200).

**Why RED:** The divergence is presented as if meaningful (each has a confident range and an "Estimate confidence: ±25%" / "±10%" label), but it is driven by (a) BY using a phantom 400 m² façade, (b) RLP using "floor area only," (c) neither consistently using the elicited 290 m². A user comparing two cities would draw a false conclusion ("RLP is half the cost of Bayern"). That's silent-wrong in the cost domain.

**Note vs §7.4:** The handoff says München-anchored *numbers* are yellow. This finding is *not* about regional anchoring — it's about **dropping the user's stated size** and **two inconsistent basis code-paths**. Those are bugs the §7.4 carve-out doesn't cover.

**Suspected file/field:** cost engine input contract (`costNormsMuenchen.ts` + the per-state basis selector). The "400 m² façade" default and the "floor area only / façade not captured" branch are two different entry points; neither reads the elicited `nettoNutzflaeche`.

---

## 4 · 🟡 YELLOW findings (note + continue)

### YELLOW-1 — Cost basis label honesty (both)
BY p.5 "German baseline (regional variance ±10%)" + cost tab "Bavaria factor"; RLP p.5 "German baseline … ±10%". Both carry "Orientation values · not binding quotes." This is **honest enough** per §10/§7.4 (München-anchored = yellow). Logged so it isn't mistaken for a regional-calibration claim (which would be RED). The label does *not* falsely claim regional calibration — good. (The *numbers* problem is RED-3, separate.)

### YELLOW-2 — Cost basis unit mislabeled "façade" (BY)
p.5 calls 400 m² a *façade* area ("400 m² façade"); the Cost tab (Image 4) calls the same 400 a generic "400 m²"; HOAI fees are normally on **BGF/NF**, not façade. Mislabeled basis unit. Compounds RED-3.

### YELLOW-3 — RLP structural citation split: § 13 LBauO vs § 5 BauuntPrüfVO (RLP)
The chat + Key-Data p.11 correctly cite **§ 13 LBauO RLP** for the Standsicherheitsnachweis. But the Documents (p.7), Cost (p.5), and Team (p.8) sections cite **§ 5 BauuntPrüfVO** for "structural certification." Two different structural citations in one document. BauuntPrüfVO is a real RLP instrument (so not fabricated), but the inconsistency should be corpus-verified — flagged given §7.2 (RLP is secondary-mirror tier, exactly the class that produced the Brandenburg §70/72 miscount). **Verify which is the correct submission basis and unify.**

### YELLOW-4 — Asbestos/PCB "Altbau before 1995" recommended on a NEW build (both)
PM-S39 p.7 and PM-S10 p.7 both list *"Asbestos/PCB pre-investigation (Altbau before 1995) · RECOMMENDED."* Both projects are **Neubau** (T-01) — BY on a sealed plot, RLP on a vacant Baulücke. A pre-1995-fabric pollutant survey is irrelevant to new construction. Renovation-document content bleeding into a new-build brief. Template hygiene; low harm (only "recommended") but wrong-context.

### YELLOW-5 — Sound-insulation marked CONDITIONAL but likely REQUIRED (both)
p.7 both: *"Sound-insulation certificate (DIN 4109) · CONDITIONAL — Mandatory for multi-family and attached buildings."* Both buildings are **attached** (geschlossene Bauweise, party walls on both boundaries — explicitly elicited). DIN 4109 party-wall sound insulation is therefore plausibly **required**, not conditional. Minor under-trigger; both states identically (→ template).

### YELLOW-6 — Executive-summary field-key + truncation leakage (BY Overview)
Image 11 Overview prose: *"6 flags need professional eyes: GEBAEUDEKLASSE: GK 4 (BayBO Art. 2 Abs. 3 Nr. 4) — nicht fr…; PROCEDURE LIKELY: BayBO Art. 59 vereinfachtes Baugenehmigun…. Named next actor: architect."* Raw uppercase field keys (`GEBAEUDEKLASSE`, `PROCEDURE LIKELY`, `VERFAHREN`) and mid-word truncations ("nicht fr…") surface in user-facing prose. Reads unfinished/machine-generated. (The "VERIFY WITH ARCHITECT" list reuses the same truncated strings.)

### YELLOW-7 — RLP recommendation set drops PV + Munich-site-plan but is otherwise leaner (RLP)
PM-S10 has **5** recommendations vs BY's **8**. RLP correctly omits the Bayern-specific PV/Art.44a recs (good — no leak). But it also has no PV/energy-mandate recommendation at all beyond the generic GEG-cert one, even though RLP has its own EEWärmeG/landesrecht energy posture. Not wrong, but thin — flag for the Pass-B prose enrichment (W4). Lower priority.

---

## 5 · ⚪ COSMETIC findings (log at end)

1. **Key-Data table truncations (both, p.10–11):** values cut mid-word with "…": BY "Mischsyst…", "freistehend, F…", "Rathausplatz 1,…"; RLP "Denkmalzone / Ensemble nach DS…", "koordinier…". Acceptable for a dense table, but trims meaning.
2. **RLP run-on labels (p.11):** "Standsicherheitsnachweis Erforderlich**ja**" (missing space), "Waermeschutznachweis Erforderlich ja (GEG § 10)" formatting. Cosmetic.
3. **Glossary GEG line (both):** "§ 48 governs **renovation** energy obligations" — both are new builds; boilerplate slightly off-context. Harmless.
4. **BY glossary carries BayDSchG + BLfD** though Denkmal never arose in the BY walk; RLP glossary correctly carries DSchG RLP + GDKE (Denkmal *did* arise). RLP's glossary is actually better-targeted than BY's here.
5. **DE/EN mixing in BY Procedure tab (Image 9):** English heading then appended German sentence "Wahrscheinliches Verfahren basierend auf Vorhaben + Bundesland — bestätigt durch die Architekt:in." EN parity untested (§7.5) — note for the EN-toggle pass, not a bug yet.
6. **"VALID FOR 30 DAYS · expires 28 June 2026"** correct on both. ✅
7. **DOC NO scheme** (PM-2026-0529-S39 / -S10) consistent. ✅
8. **Confidence figures** (BY 71% / RLP 69%) plausibly reflect RLP's extra open Denkmal question + thin-state uncertainty. Sensible. ✅

---

## 6 · What is genuinely GOOD (state plainly, per §10)

This is not a list of damning-with-faint-praise. These are real, load-bearing wins:

1. **The RLP banner is textbook (§4).** ON, well-formed, and it names *exactly* the 5 deep states: "Substantive data currently exists for Bayern, NRW, Baden-Württemberg, Hessen and Niedersachsen." This is the single most-confused boundary in the handoff and it works live, first try.
2. **ZERO Bayern leak on RLP — the headline win.** No `BayBO`, no `Art. 57-62`, no München authority, no München closure calendar, no Bavarian PV/Art.44a recommendation. On the *hardest* state (unique numbering), the override + crossStateBleedGuard held completely. This is exactly what §7.3/W3 worried might fail (model sees both baseline + override and must let override win) — and it won.
3. **RLP live-chat citations are 100% correct scrambled-family.** Across the whole walk the model cited: § 2 (GK), § 8 (Abstand — the RLP-unique number, NOT § 6 standard-MBO, NOT BayBO Art. 6), § 13 (Standsicherheit), § 15 (Brandschutz), § 50 (Sonderbau), § 64 (bauvorlageber.), § 66 (vereinfacht), § 67 (Freistellung). Every one matches the §9 RLP row. The model did **not** fall back to the standard § 61/62/63/64 ladder. This was the #1 risk for this state and the conversational layer passed cleanly.
4. **Bayern uses Art. throughout, never §.** Art. 2, 12, 44a, 57, 58, 59, 60, 61, 62, 64 — all correct Bavarian articles. No `§ NN BayBO` slip anywhere.
5. **Federal law correct on both:** § 34 BauGB, § 30 BauGB, § 172 BauGB (Erhaltungssatzung — correctly surfaced for the Mainz historic core), § 48 GEG, GEG § 10. The §34 inner-area routing was reasoned correctly on both walks.
6. **RLP Denkmal handling is impressively precise.** The model correctly: identified Schillerplatz as a likely Denkmalzone/Ensemble, distinguished an unbuilt Baulücke from a listed Kulturdenkmal, named the correct authorities (Untere Denkmalschutzbehörde Stadt Mainz + GDKE), and correctly stated the denkmalrechtliche Genehmigung runs **parallel and procedurally independent** from the Baugenehmigung. That is genuinely architect-grade reasoning and it's all in the chat + Key-Data + Legal-C.
7. **Authority resolution is city-accurate.** BY → Bauordnungsamt Augsburg (Rathausplatz 1), marked LEGAL·VERIFIED. RLP → Stadtplanungsamt/Bauamt Mainz. Neither defaulted to München authority.
8. **PDFs render clean.** 13 pages each, no winAnsi garble, no truncated *sections* (only cosmetic in-cell trims), TOC accurate, qualifier tables intact, signature block present, glossary present.
9. **Qualifier discipline is good.** Fields are honestly tagged CLIENT·DECIDED / CLIENT·ASSUMED / LEGAL·CALCULATED / LEGAL·ASSUMED / LEGAL·VERIFIED. Data-quality donut (BY 56/24/20, RLP 48/26/26) reflects the thin-state's higher assumption load — honest.
10. **Procedure routing logic itself is correct** — the engine knew Freistellung (Art.58 / §67) is excluded with no qualified B-Plan and correctly landed on vereinfacht (Art.59 / §66). The ONLY problem is the PDF's Section-05 default not reading that result (RED-1).

---

## 7 · Baseline-wide vs state-specific — the cross-PDF diff

The most valuable output of testing 2 states is separating **shared-template bugs** (appear on both) from **state-incidental** ones (appear on one). Confirmed:

| Finding | Bayern | RLP | Class |
|---|---|---|---|
| RED-1 Procedure contradiction | Art.60 vs Art.59 | §70 vs §66 | **BASELINE-WIDE** (template) |
| RED-2 Munich site-plan string | present (rec #04) | absent (generic) | **Bayern-path literal** |
| RED-3 Cost ignores elicited size | 400 m² façade phantom | "floor area only" | **BASELINE-WIDE** (two paths) |
| YELLOW-3 structural §13 vs §5 split | n/a (Art.62 consistent) | present | **RLP-specific** |
| YELLOW-4 Asbestos on new build | present | present | **BASELINE-WIDE** |
| YELLOW-5 DIN 4109 conditional | present | present | **BASELINE-WIDE** |
| YELLOW-6 field-key leakage | present | (not screenshotted) | likely baseline |
| Banner ON correctness | OFF ✓ | ON ✓ | per-state, both correct |
| Cross-state bleed | n/a | none ✓ | per-state, correct |

**Conclusion:** 3 of the issues are baseline-wide template bugs. That's *good news for fixing* — RED-1 and RED-3 and the two template YELLOWs are each single-point fixes that propagate to all 16 states. RED-2 is a one-line Bayern-baseline string. Only YELLOW-3 is genuinely RLP-local.

---

## 8 · Full conversational transcript review

### 8.1 Bayern (Augsburg) — turn-by-turn

| Turn | Wizard asked | Answer fed | Engine response — audit |
|---|---|---|---|
| Zoning | Qualified B-Plan or §34? | No / §34, built-up core | ✅ Correctly routed to §34 inner-area; excluded Freistellung Art.58 |
| Zoning | Surrounding character? | 3-4 storey MFH, mixed | ✅ Correctly pivoted Einfügen test to Maß + Bauweise, not use type |
| Zoning | Storeys + eave height? | III + attic, 9.5-10m eave, 13m ridge | ✅ Confirmed Maß fits; correctly raised GRZ + Bauweise as next test |
| Zoning | Plot + footprint? | 320 m² / 165 m² → GRZ 0.52 | ✅ Accepted 0.5-0.6 surrounding; geschlossene Bauweise boundary build OK |
| Building | Wohneinheiten? | 1 (owner-occupied) | ⚠️ Operator initially said "freistehend GK4"; **engine correctly corrected** — in geschlossene Bauweise NOT freistehend; GK4 via Art.2 Abs.3 Nr.4 (≤13m, ≤400m²/unit). Good catch by the engine. |
| Building | Ridge highest point? | Yes, 13m | ✅ Engine then correctly clarified determinative height is uppermost-Aufenthaltsraum floor, not ridge — sharper than the operator. Confirmed GK4. |
| Building | Net floor area? | 290 m² | ✅ Confirmed <400m² ceiling. **NOTE: this 290 was later dropped by the cost engine — see RED-3.** |
| Procedure | Infrastructure connected? | Fully serviced | ✅ Erschließung secured §34; correctly called Hausanschluss an organisational step |
| Procedure | Architect/Energieberater engaged? | Not yet | ✅ Correctly flagged need for bauvorlageber. Architekt for Art.59 Bauvorlagen |
| Synthesis | Protected trees? | No, sealed plot | (closed walk) ✅ BAYAK as Architektenkammer contact; Bauordnungsamt Augsburg correct |

**Bayern chat verdict:** Legally sound throughout, and twice the engine was *more precise than the operator* (geschlossene-Bauweise GK classification; determinative-height definition). That's a strong signal the persona model is well-grounded on BayBO.

### 8.2 RLP (Mainz) — turn-by-turn

| Turn | Wizard asked | Answer fed | Engine response — audit |
|---|---|---|---|
| Zoning | B-Plan or §34? | No / §34, historic core | ✅ §34 routing; **immediately raised § 172 BauGB Erhaltungssatzung + DSchG RLP** — exactly right for a historic square |
| Adjacent | Use type? | Purely residential SFH | ✅ Art-der-Nutzung met; pivoted to Denkmal layer |
| Adjacent | Existing structure listed? | Unbuilt Baulücke | ✅ Correctly distinguished Baulücke ≠ Kulturdenkmal; named Untere Denkmalschutzbehörde Mainz + GDKE; denkmalrechtliche Genehmigung required |
| Adjacent | Design status? | III + attic, 9.5-10m, 13m ridge, geschlossen | ✅ **Cited "§ 66 or § 67 LBauO"** — correct RLP scrambled family, NOT standard ladder, NOT BayBO. First confirmation the override fires. |
| Building | Footprint? | 165 m² / 320 m² → GRZ 0.52 | ✅ Cited § 2 (GK), § 50 (Sonderbau), § 66 (vereinfacht), § 67 (Freistellung), § 64 (bauvorlageber.) — all RLP-correct. Landed GK3 + § 66. |
| Zoning | GRZ ceiling? | 0.52, surrounding 0.5-0.6 | ⚠️ Engine cited "§ 17 BauNVO 0.4 ceiling" then correctly said §34 permits higher where surroundings support it. Legally fine; minor: §17 BauNVO Obergrenzen apply to B-Plan areas, less directly to §34 — but the conclusion (Einfügen-driven) is right. |
| Zoning | Abstandsflächen both sides? | Continuous geschlossen, rear only | ✅ Cited **§ 8 LBauO RLP** — the RLP-unique Abstand number. Perfect. |
| Building | Architect engaged? | No, add to Top-3 | ✅ Cited § 13 (Standsicherheit), § 10 GEG (Wärmeschutz), § 64 (bauvorlageber.), § 66 (vereinfacht). All correct. |

**RLP chat verdict:** This is the proof point. On the single hardest state, the conversational engine cited the full scrambled family correctly and never leaked Bayern. The Denkmal reasoning was architect-grade. The chat layer is the strongest part of the product.

---

## 9 · §9/§11 expectation conformance for T-01

Per §11: "T-01 Neubau EFH — route to Genehmigungsfreistellung if qualified B-Plan & no Sonderbau, else vereinfacht. Thin states have an override at T-01 too (88 cells) — Berlin should cite § 62/§ 63 BauO Bln, not BayBO."

| Expectation | Result |
|---|---|
| Route Freistellung-or-vereinfacht | ✅ Both correctly excluded Freistellung (no qualified B-Plan) → vereinfacht. (PDF Section-05 then mislabeled it regulär — RED-1.) |
| Bayern cites Art. (gold standard) | ✅ All Art., banner OFF, München cost/closure appropriate here |
| Thin state cites OWN BauO, not BayBO | ✅ RLP cited LBauO §§ throughout, scrambled family correct, zero BayBO |
| Watch baseline didn't leak through at T-01 | ✅ It did not leak into chat/citations. It DID leak the procedure *label* (RED-1) and Munich string (RED-2) — but those are template defaults, not state-law leaks |

**§9 RLP row conformance (the scrambled family):**

| §9 RLP anchor | Expected | Observed | Match |
|---|---|---|---|
| verfahrensfrei | § 62 | (not exercised) | — |
| Freistellung | § 67 | § 67 (chat) | ✅ |
| vereinfacht | § 66 | § 66 (chat + Key-Data) | ✅ |
| regulär | § 61 + § 70 | § 70 (PDF Section-05, mislabeled "standard") | ⚠️ in-family but wrong-role label (RED-1) |
| Bauantrag | § 63 | § 63 (PDF p.7 permit form) | ✅ |
| bauvorlageber. | § 64 | § 64 (chat + p.8) | ✅ |
| Abstand | § 8 | § 8 (chat + Key-Data) | ✅ |

7/7 articles correct-or-in-family. The only deviation is the *role* mislabel of § 70 (RED-1), not a wrong number.

---

## 10 · Bug ledger (prioritised fix list)

| ID | Sev | Title | States | Suspected locus | Fix size | Propagation |
|---|---|---|---|---|---|---|
| RED-1 | 🔴🔴 | Procedure contradiction (vereinfacht vs regulär in same PDF) | both | PDF Section-05 + Legal-B `procedureIndication` not reading `procedureLikely` | 1 field | all 16 states, all 8 templates |
| RED-2 | 🔴 | "Munich" hardcoded in site-plan recommendation | BY | `BLOCKS[T-01]` Bayern rec #04 literal | 1 string | all Bavarian non-München cities |
| RED-3 | 🔴 | Cost engine drops elicited size + 2 inconsistent basis paths | both | `costNormsMuenchen.ts` input contract / basis selector | medium | all states |
| YEL-3 | 🟡 | RLP structural §13 LBauO vs §5 BauuntPrüfVO split | RLP | RLP override docs/cost/team structural citation | verify+unify | RLP only |
| YEL-4 | 🟡 | Asbestos/PCB (pre-1995) on a NEW build | both | shared docs template | conditional gate | all states |
| YEL-5 | 🟡 | DIN 4109 marked CONDITIONAL but likely REQUIRED for attached | both | shared docs template | trigger logic | all states |
| YEL-6 | 🟡 | Field-key + truncation leakage in Exec summary prose | BY | Overview/exec-summary string assembly | string clean | likely all |
| YEL-1/2 | 🟡 | Cost label "façade"/unit honesty | both | cost label copy | copy | all |
| YEL-7 | 🟡 | RLP rec set thin (no energy-mandate rec) | RLP | Pass-B prose (W4) | enrich | thin states |
| COSM | ⚪ | Table truncations, run-on labels, glossary off-context | both | PDF table cells / glossary | cosmetic | all |

**Recommended single ticket:** RED-1 + the `procedureIndication` field. Highest harm, lowest effort, widest propagation. Do this before any further template testing — otherwise every subsequent template (T-02…T-08) will show the same contradiction and you'll re-log it 6 more times.

---

## 11 · Is 2 states enough for T-01? — confidence rationale

**Yes, for T-01, with one caveat.**

**Why 2 is sufficient here:**
- You sampled the two structural extremes: the inherited baseline (Bayern) and the most-divergent numbering family (RLP). Any bug appearing on *both* is proven baseline-wide (RED-1, RED-3, YEL-4/5). Any bug on *one* is isolated (RED-2 Bayern-literal, YEL-3 RLP-local). A 2-sample test across the extremes is exactly what's needed to make that split.
- The banner boundary (§4) was exercised in both directions (OFF for deep, ON for thin) and passed both.
- The cross-state bleed guard was tested on its hardest case (unique numbering) and held.

**The caveat — what 2 states does NOT cover:**
- The 9 *other* thin numbering families remain unverified at T-01: Sachsen-Anhalt (down-1, § 60/61/62/63/67/64), Thüringen (up-2, § 63/64/65/66/74/67), Saarland (off-by-1 + § 7 Abstand), Brandenburg (the §66/68 post-fix — must confirm NO §70/72 regression), and the standard-MBO thin states (Berlin/Hamburg/Bremen/SH/MV). Each could mis-map the way RLP almost did.
- The cost 2× divergence (RED-3) should be checked against a third state to confirm it's input-drop and not a legitimate regional factor.
- EN parity (§7.5) was not tested — both walks were EN-UI but the legal prose stayed German; a true EN-toggle pass is still owed.

**Net:** T-01 conclusions are solid at **~73% blended ship-confidence**. The engine is release-grade; the PDF template needs RED-1/2/3 fixed before T-01 can be called clean. I would **not** sign T-01 off as "5 clean" — but the failures are concentrated, cheap, and mostly one shared field.

---

## 12 · Recommended next moves

1. **Fix RED-1 first** (`procedureIndication → procedureLikely`) before testing any more templates — it will otherwise recur on all of T-02…T-08.
2. **Fix RED-2** (Munich string) and **RED-3** (cost input contract) in the same sprint.
3. When resuming template testing, for **T-02 (MFH)** watch specifically: (a) does RED-1 recur (it will until patched); (b) Sonderbau over/under-trigger (§11 — the hardest template); (c) Brandschutz § becomes load-bearing.
4. For the **third+ thin state** at any template, prioritise **Brandenburg** (confirm §66/68, NO §70/72 regression — the audit's critical historical bug) and a **shifted-family** state (Thüringen up-2 or LSA down-1) to test whether the override handles non-RLP scrambling.
5. Schedule one dedicated **EN-toggle pass** (§7.5) — currently zero coverage.

---

## 13 · Sign-off

- **T-01 conversational/legal engine:** PASS (~90%). Architect-grade reasoning, correct on the hardest state, zero cross-state bleed.
- **T-01 PDF artifact:** CONDITIONAL FAIL (~70%). One trust-contract RED (procedure contradiction), one hardcoded-Munich RED, one cost-input RED. All concentrated, all cheap.
- **T-01 overall:** **NOT release-clean. ~73% blended.** Gate on RED-1/2/3.
- **2-state coverage for T-01:** SUFFICIENT to draw confident structural conclusions; numbering-family generalisation across the other 9 thin states remains open for later templates.

*Brutally honest bottom line: the product's brain is better than its paperwork. The legal engine earned trust this session — including on the one state most likely to break it. But the PDF will hand a layperson two contradictory permit paths and a Munich instruction in Augsburg, and that's exactly the "silently wrong" the whole product exists to prevent. Fix the three REDs — they're small — and T-01 is genuinely shippable.*

---

*End of T-01 cross-state audit. Doc covers Bayern (PM-2026-0529-S39) + Rheinland-Pfalz (PM-2026-0529-S10).*
