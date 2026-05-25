# v1.0.30 — Strategic Research Pass

**Date:** 2026-05-25 · **Mode:** research only — no code, no bug fixes, no template work, no commits to `main`.
**Trigger:** Rutik's question after 7 sprints — *"Why are we in a never-ending bug loop? What do competitors do? What data do they use? Are we overcomplicating this?"*
**Method:** codebase trace (file:line) + two web-research sweeps (competitors; data sources) + the repo's own prior research (`PHASE_11_OQ3_GEOPORTAL_RESEARCH.md`, `PHASE_12_SOURCE_ACCESS_CHECK.md`, `cost-formula.md`, the three v1.0.28/29/30 diagnosis docs).
**Tone:** brutal honest. Prove or declare. No comfort framing. I do not defend prior sprint decisions; I assume the current approach may be wrong until the evidence says otherwise.

**One-paragraph answer up front.** Yes, we are overcomplicating it — in two specific, fixable ways: (1) we **hand-author legal statute text and § citations per state** when the official, machine-readable text is free as downloadable XML; we are recreating `gesetze-im-internet.de` by hand, one wrong § at a time. (2) We are discovering **one known architectural gap (a template-blind deterministic pipeline) 22 bugs at a sprint**, reactively, via live walks, instead of fixing it once as a parametric refactor. We are **not** overcomplicating the thing that is actually our moat: state-correct German legal synthesis with an architect-verify shield. The loop is real, its root cause is singular and known, and "done at 8 templates × 16 states" is **not** achievable at the current cadence without changing approach. The fix is to shrink to a credible 3-cell vertical slice, kill the biggest bug *categories* with two cheap free-data integrations (statute XML + Destatis cost API), and only then decide whether to grind the remaining matrix or re-platform on data.

---

## 1. Competitor landscape

I categorized 19 real products. The headline finding: **the middle of the market is thin but no longer empty**, and nobody assembles the full stack Planning Matrix is building (address + project type → *state-correct, legally-cited* feasibility report + cost + architect handoff, self-serve).

### B2C consumer tools (cost / affordability only — zero legality)
- **ImmoScout24 Baurechner / Baufinanzierungsrechner** — free, lead-gen for mortgage brokers. Answers "what can I afford," not "what may I build." No zoning, no citations. (immobilienscout24.de/baufinanzierung)
- **bauen.de / hausbau-rechner.de family** — free build-cost estimators from size/finish level. Pure cost. (bauen.de)
- **baukostenplan.de** — **€99 one-time per project**, produces a 17-page PDF with DIN 276 breakdown + BKI benchmarks. Cost only; no buildability. (baukostenplan.de)
- **McCube** — modular-home configurator, **€2,000–2,600/m²**; their own pages note a Baugenehmigung is still required. (mc-cube.at)

### Closest competitors — address-in / feasibility-out
- **baupotenzial.de — closest self-serve match.** Enter address → draw plot polygon → outputs exact m², GPS corner points, **GRZ/GFZ-based 3D massing variants**, PDF exposé. **But it hedges harder than we do and deliberately avoids official data:** it markets results as *"datenbasierte Orientierung,"* states *"Planungsrecht (B-Plan, BauO, Abstandsflächen) bleibt maßgeblich,"* footer *"keine Rechtsberatung,"* and explicitly does not replace a Bauvoranfrage or B-Plan-Auslegung. Crucially its data is **OpenStreetMap footprints + Mapillary + AI plausibility — not cadastre, not actual B-Plan documents — and it emits no legal citations.** Price not public. Nationwide but legally generic. This is a *massing visualizer*, not a legal-feasibility engine.
- **Kaufmann Bau — Bebauungsanalyse — closest on legal reasoning.** Address + Flur number → human-prepared analysis explicitly framed as **"Bebauungsanalyse nach §30 oder §34"** (the BauGB pathway split), plus max Wohnflächenberechnung + Kosteneinschätzung + Lageplan + 3D. **€599 + VAT** per analysis. But it is **manual**, a lead-gen funnel for one builder's MFH business, geographically concentrated in southern DE / Vorarlberg, with no Bauvoranfrage caveat. Not scalable, not multi-state, not self-serve.
- **online-architekt.net / Planeco Building** — productized architect service: 7-step flow from inquiry to a signed-ready Bauantrag set, feasibility check → fixed-price offer. Validates the **architect-handoff half of our thesis as real paid demand**, but it is human labor, not an instant report. Custom Festpreis. (Notably, Planeco is one of the *sources our own T-04 template cites* for Art. 57 Abs. 4 — `t04-umnutzung.ts`.)

### B2B professional workflow (all post-feasibility)
- **PlanRadar** — site documentation / defect management, **from €29/user/mo**. No feasibility.
- **Capmo** — DACH construction PM, quote-based pricing. No feasibility.
- **Cosuno** — tendering & subcontractor award, AI Preisspiegel from "Europe's largest construction database." Procurement, post-decision.
- **Plan.One** — building-product catalogue (Schüco/Knauf-backed), free for architects. Specs, not sites.

### Official state / city portals (intake only — confirmed)
- **Bayern Digitaler Bauantrag** (digitalerbauantrag.bayern.de) — free; submits a *finished* Bauantrag, tracks status. **Does not assess feasibility, produces no citations.**
- **Federal "Digitale Baugenehmigung" (EfA, MV-led)** — shared Vorgangsraum for applicant + architect + authority; **~45,000 digital applications across 13 states by Q3 2025.** Pure submission/processing. No feasibility, no citations.
- **ViBa-BW, AKNW NRW, DigiBauG Hessen** — state variants, same intake-not-assessment pattern.

### Adjacent / infrastructure
- **BKI** — the cost-data backbone (see §2). Paid software/books, no API.
- **PriceHubble / 21st Real Estate** — AVM + market analytics; PriceHubble's "Building Simulator" is **price/rent-driven, not zoning-driven** — it doesn't tell you what's legally permitted.
- **Rulemapping Group — the watch item.** "Law as code," **€12M raised, SPRIND-backed,** explicitly names **Baugenehmigung** as a target domain. Today it sells the rules-engine layer to institutions, not end users — but it is the most credible future entrant into the *legal-correctness core* we're hand-building. (rulemapping.com/law-as-code)

### Synthesis
The market splits exactly as Rutik suspected: **dumb B2C cost calculators ↔ heavy B2B workflow ↔ official intake portals**, with a thin bridge occupied by two partial players. **baupotenzial** owns self-serve massing but refuses official data and citations. **Kaufmann** owns §30/§34 reasoning but does it manually and regionally. **No one** combines (a) official cadastral/B-Plan data, (b) state-correct §-level citations, (c) instant self-serve, and (d) a structured architect-verify handoff. That four-way combination is a genuinely defensible wedge — **and three of the four are exactly where we are weakest or hand-faking it.**

---

## 2. Data sources — the free/paid reality (the decisive section)

This is where the strategic picture changed since our own last look. Our `PHASE_12_SOURCE_ACCESS_CHECK.md` (2026-05-07) concluded that `gesetze-im-internet.de` paragraph permalinks 404 from server-side fetch and that state portals are SPA shells — so we **shifted to dejure.org + hand-authoring** and deferred everything else. That conclusion was reasonable *for live-permalink fetching*, but it under-scoped the data world. Here is what is actually accessible **today**, with pricing and API status.

| # | Source | Free / API today? | Replaces (in our heuristic tool) | Effort |
|---|--------|-------------------|----------------------------------|--------|
| 1 | **gesetze-im-internet.de** (GEG, BauGB, BauNVO, MBO) — **XML/HTML/PDF/EPUB** | **YES** — official, free, full **downloadable XML corpus** | Hand-authored / LLM-paraphrased § citations → exact current statutory text for RAG grounding | **Low** |
| 2 | **Destatis GENESIS API** (Baupreisindex, table family **61261**) — REST/JSON | **YES** — free, **no registration**, REST/JSON (POST replaced SOAP 2025-07-15) | Invented cost-trend / regional-escalation numbers → official Baupreisindex | **Low–Med** |
| 3 | **ALKIS via state WFS** (all 16 states) | **YES** — free open data, real WFS 2.0 | Invented parcel size / building footprint / land-use facts → actual cadastre geometry | **Med** (16 endpoints) |
| 4 | **State Geoportals** WMS/WFS (NRW, BW, BY, HE, NI) | **YES** — free OGC APIs | Invented site context | **Med** |
| 5 | **B-Plan / XPlanung WFS** (Berlin strong; others partial; many PDF-only) | **Partial** — free WFS where it exists; no national registry | Invented GRZ/GFZ/Art-der-Nutzung → structured XPlanGML where available | **High** |
| 6 | **BKG geocoder + Verwaltungsgebiete** | **Partial** — small-scale free; precise HK-DE tiered | Address → responsible Kreis/Stadt | **Med** |
| 7 | **Bauamt directory** | **Partial** — no national API; some state CSVs (Brandenburg); derive via #6 + hand-built ~400-row table | "Which authority handles your address" | **Med** |
| 8 | **Architektenkammer** (16 chambers) | **Partial** — free **web forms, NO API**, voluntary listing | Verifying an architect is registered | **High, low ROI** |
| 9 | **KfW / Förderdatenbank** | **No public API** — KfW dev portal token-gated for banks; Förderdatenbank web-only | Funding amounts / program names | **High, stale fast** |
| 10 | **BKI Baukosten** | **No** — paid software/books, **no API** | €/m² construction-cost benchmarks | **High + copyright risk** |

**BKI specifics (the prompt asked for pricing):** BKI Kostenplaner 2026 — Statistik **€799 net**, Statistik plus **€1,399 net**, Statistik plus [Positionen] **€1,899 net**; perpetual **single-seat** license, secondary activations **+30% of list each**, network use needs a special license. **No REST/JSON API — only one-way GAEB DA XML export.** Using BKI numbers means manual transcription of copyrighted tables. **This is exactly the data we should NOT try to recreate or license for a demo.** (bki.de/produkte/kostenplanung, bki.de/agb)

**The cadastre landscape flipped while we weren't looking.** As of 2024–2025, **all 16 states provide ALKIS parcel geometry as free open data** — RLP (2024-06-09) and Saarland were the last holdouts and both flipped in 2024; Hessen has been free since 2022-02-01 (the older "Hessen is paid" references are outdated). Real WFS 2.0 endpoints, NAS/GML formats. License matrix: **DL-DE Zero 2.0** (NRW, Berlin — no attribution even required), **DL-DE BY 2.0** (BW, RLP — attribution), **CC BY 4.0** (Bayern). Owner names are never in open data; geometry, parcel IDs, footprints, land use are. EU Regulation 2023/138 (high-value datasets) is pushing toward universal free provision. (open.nrw, geodaten.sachsen.de, hvbg.hessen.de/geoinformation/open-data)

**B-Plan is the honest hard part.** **XPlanung / XPlanGML** is the legally binding exchange standard (XLeitstelle), carrying Art der baulichen Nutzung, GRZ/GFZ, Baugrenzen as *structured fields*. But **§4a Abs. 4 BauGB mandates publication via state portals, so there is no single national registry** — there are ~16 state portals + city systems, wildly uneven. **Berlin is excellent** (`gdi.berlin.de/services/wfs/bplan`, DL-DE Zero, all procedures by status). Hamburg still serves PDFs publicly. Many smaller communes are PDF-only. So B-Plan grounding is real but patchy — exactly the kind of thing to label "best-effort where available" rather than promise everywhere.

**Bottom line for bug-killing:** the three highest-leverage, lowest-effort sources — **statute XML (#1), Destatis Baupreisindex API (#2), ALKIS WFS (#3)** — directly attack our three biggest bug *categories*: fabricated/missing §§, identical-cost-across-states, and ASSUMED plot facts. None of them is BKI. None requires recreating a paid dataset.

---

## 3. Accuracy / scope benchmarking of the closest competitors

- **baupotenzial.de** — accuracy claim is *deliberately weak*: "datenbasierte Orientierung," "keine Rechtsberatung," does not replace Bauvoranfrage/B-Plan-Auslegung. Data: OSM + Mapillary + AI (not official). **No legal citations.** Scope: nationwide but legally generic, not per-state-correct.
- **Kaufmann Bau** — frames the legal pathway (§30/§34) but hedges *less* (no Bauvoranfrage caveat on the landing page); manual; southern DE; MFH-only funnel.
- **online-architekt / Planeco** — accuracy comes from a real licensed architect doing the work; "feasibility check first, then fixed-price offer" — i.e. the human *is* the accuracy guarantee.
- **Official portals** — make no feasibility claim at all; they're intake.

**The industry norm is to hedge to "preliminary / consult an architect / a Bauvoranfrage is binding."** Every credible player does it. **Our "VORLÄUFIG — Architekt:in-Bestätigung ausstehend" footer + the architect-verify legal shield is exactly aligned with the market norm** — that is a thing we got *right*, not a weakness. The differentiator we can credibly claim that none of them do: *we show the actual §§ and the procedure pathway, state-correct, instantly.* But that claim is only as good as the citations behind it — which today are hand-typed (see §6).

---

## 4. Planning Matrix's actual positioning

### Where we are genuinely AHEAD
- **State-correct legal synthesis.** The persona reasons correctly in state law — every diagnosis doc confirms it. From `V1_0_30_T04_LEIPZIG_DIAGNOSIS.md`: *"Persona quality across the 9-round walk was EXCELLENT — SächsBO, § 6 BauNVO MI, DIN 4109/4109-5, TA Lärm, T30-RS, § 33 SächsBO Rettungsweg, all state-correct German law."* No competitor reasons at this depth instantly.
- **Multi-state structural coverage.** 16 Bundesländer registered (`src/legal/states/_types.ts`), 5 substantive (Bayern, NRW, BW, Hessen, Niedersachsen), with a cross-state bleed firewall (`crossStateBleedGuard.ts`). baupotenzial is legally generic; Kaufmann is one region.
- **Architect-verify legal shield.** Invite → accept → verify → footer clears → owner-edit erosion (`architectInviteApi.ts`, `verify-fact`, `useVerificationReactivity.ts`). online-architekt's paid demand proves the market wants this handoff.
- **Free vs paid, instant vs manual.** Our nearest legal-reasoning competitor (Kaufmann) charges €599 and is manual; we're instant.
- **Honest framing matches the market norm** (the VORLÄUFIG shield), and **bilingual DE/EN** with parity gates.

### Where we are BEHIND
- **No real parcel/cadastre data.** baupotenzial draws the actual plot polygon with GPS corners; we have a **München-only** B-Plan WMS (`tileLayer.tsx` hardcodes `geoportal.muenchen.de`) and no ALKIS anywhere — despite ALKIS now being free in all 16 states.
- **No real cost data.** `REGION_MULT = 1.0` for every state (`cost-formula.md`): the v1.0.27 brutal-honesty report confirms **identical € figures across all 16 states** (Bug 35) — "a manager will notice identical costs across states."
- **Citation depth is hand-authored and fragile.** Hessen's Phase-11 stub had **5 wrong §§** (§49/§56/§64/§67/§78 mapped to wrong HBO articles, per `PHASE_ROADMAP.md` Phase 14 note). 11 of 16 states are still placeholder stubs.
- **No Architektenkammer verification, no Bauamt directory** beyond München's hardcoded calendar.
- **UX polish** — baupotenzial's 3D massing is more demo-seductive than our fact tables.

### Where we are OVER-ENGINEERING
- **Hand-authoring statute text per state when the official text is free XML.** Phase 12 budgets *150–250 LOC of hand-written legal content per state* (`PHASE_ROADMAP.md`) and a per-state fetch-dry-run + review doc. We are **manually rebuilding `gesetze-im-internet.de`** and inheriting its error rate (5 wrong §§ in one state). The official GEG/BauGB/BauO text ships as downloadable XML — ingest once, ground citations against it, stop hand-typing §§.
- **A template-blind deterministic pipeline reimplemented by hand, one template at a time.** The cost/procedure/risk/timeline composers branch only on `isDemolition` (`exportPdf.ts:717`); every other template falls through to EFH defaults. We are discovering this **the same way three sprints running** (§6) instead of parametrizing it once.
- **An 8 × 16 = 128-cell ambition.** `PHASE_16` scopes a *640-fixture nightly matrix* (16 states × 8 templates × 5 personas). For a manager demo we need **3 cells deep**, not 128 shallow.

---

## 5. What "80%" actually means — a measurable, manager-demo-ready bar

"80%" has never been defined, which is *why* the loop feels endless: with no finish line, every walk finds new bugs and none of them is "the last one." Here is a concrete bar. **A cell passes the 80% bar when all 12 MUST checks are YES.** Checks 13–15 are honest-gap items that may be NO *as long as the gap is surfaced in the UI as a coverage statement, not discovered by the manager as a bug.*

**MUST work (all 12 binary, no gray zone):**
1. Every § citation shown is verifiable against official statute text (no fabricated `§ NN BauO …`). *(today: gated for fabrication by `smoke:pdf-matrix`, but not for correctness — see §6)*
2. Procedure verdict (verfahrensfrei / vereinfacht / regulär) matches the template's legal logic **and** shows CALCULATED (not ASSUMED) when the reasoning chain is present. *(Bug 90)*
3. Cost differs across the 3 demo states **OR** the UI explicitly states the regional factor is not yet applied — never silently identical. *(Bug 35)*
4. The PDF has the same section set + page count across all 3 cells (no missing Executive Summary / TOC drift). *(Bug 103)*
5. No internal/stub strings ("Detail-§ noch nicht hinterlegt", "in Vorbereitung") leak into user-facing role/document/citation text. *(Bug 97/98)*
6. No cross-state token leak (BayBO/München/Schwabing) in non-Bayern output. *(Bug 65 — gated)*
7. Web "At a glance" verdict === PDF Section 05 verdict for the same project. *(Bug 92)*
8. Confidence % reflects open domains (no 87% with two PENDING domains). *(Bug 102)*
9. Required-documents list is template-correct (demolition ≠ GEG thermal; use-change ≠ new-build LP1-4). *(Bug 88)*
10. Every fact label renders in the correct locale in both DE and EN PDFs. *(Bug 104)*
11. The wizard shows an honest coverage caption for the demo state. *(Bug 72 — fixed)*
12. Architect-verify flow runs end-to-end on at least one cell (invite → accept → verify → footer clears). *(needs the verify-fact + chat-turn redeploys flagged in the v1.0.27 report)*

**Honest-gap (NO is acceptable if surfaced, not hidden):**
13. Plot facts (Flurstück / parcel area / GRZ-GFZ) are either sourced (ALKIS/B-Plan) or clearly marked ASSUMED — never CALCULATED without a source.
14. No PDF layout collision on the demo cells (signature block Bug 60, multi-page Key Data Bug 78) — *or* those sections are simplified to fit.
15. Gaps (11 stub states, regional cost, KfW) are explicit roadmap statements in the UI, not bugs the manager finds.

**The minimum matrix that must PASS this bar before a client demo — 3 cells deep, not 8×16 shallow.** Pick *substantive states* (so citations are real) × *templates with proven fix-shapes* (so the template-blind class is closed):

| Cell | Why this cell |
|------|---------------|
| **T-01 × Bayern (München)** | The flagship — fully sourced, live B-Plan WMS, real glossary/risk. This is "what done looks like." |
| **T-05 × NRW (Köln)** | Demolition; NRW is substantive (real BauO NRW §§); fix-shape proven in v1.0.28 (`nrw-t05-bonn` fixture exists). |
| **T-03 × Hessen (Frankfurt)** | Renovation — the 2025-Modernisierungsgesetz-heaviest template; Hessen is substantive; distinct from the other two. |

**Deliberately NOT in the demo set:** any **stub state** (Sachsen, Hamburg) and any **template without a fixture** (T-06/07/08). Note that v1.0.29 walked T-02 × Hamburg (a *Stadtstaat stub*) and v1.0.30 walked T-04 × Sachsen (a *Flächenland stub*) — i.e. we keep testing a **new template AND a non-substantive state simultaneously**, which is why each walk surfaces *both* template-blind bugs *and* stub-leak bugs. Demoing substantive-state × proven-template cells isolates strength.

---

## 6. The loop diagnosis — brutal honest

### Why each sprint finds MORE bugs than it closed
Because every sprint is fixing **the same single root cause**, and choosing harder cells each time. The deterministic render pipeline (cost, procedure, risk, do-next, timeline, legal-domain, labels) was authored for **T-01 / EFH / Bayern** and branches on template type in exactly **one** place — `const isDemolition = procedureCase.intent === 'abbruch'` (`exportPdf.ts:717`). Every other template falls through to new-build/EFH shape. The persona is consistently *correct*; the render layer **silently overrides it** with T-01 defaults. From the T-04 diagnosis: *"Every bug below is in the DETERMINISTIC pipeline, not the persona."*

The bug counts: **v1.0.28 (T-05) = 12 → v1.0.29 (T-02) = 19 → v1.0.30 (T-04) = 22.** Rising, for three compounding reasons:
1. **Same class, never generalized.** Each walk re-derives the same fix-shape (add a template branch to cost/procedure/risk/labels) on a new template. Three proofs of an identical fix that was never applied parametrically.
2. **Harder cells each time.** They paired each new template with a *non-substantive state*, doubling the surface with stub-leak bugs (Class S) on top of template-blind bugs (Class A).
3. **CI couldn't accumulate coverage.** `smoke:pdf-matrix` was the **16-state T-01 matrix** — *"No existing gate exercises T-04. That is why every bug below is invisible to CI."* Each sprint adds *one* fixture, so the class only becomes gate-visible one cell at a time.

### Is it ending or accelerating?
**The core template-blind class is converging** (the fix-shape is proven and mechanical), but **the surface is not exhausted.** Remaining: T-06/T-07/T-08 (same pattern, no fixtures yet — explicitly flagged in all three diagnosis docs); 11 stub states (Phase 14, *cut to post-v1*); deferred deep PDF-layout bugs (60/78/105/109); persona-side thinness (Bug 63); and the 7 remaining `COST_BANDS_BY_TEMPLATE` Bayern-bleed entries. At **~1 template per sprint via manual walk**, closing T-06/07/08 alone is **3 sprints**, plus a dedicated PDF-layout sprint, plus stub-state authoring. **Realistically 5–8 more sprints** to get "all 8 templates clean across the 5 substantive states" — and that is *before* the data gaps (cost, parcel) that a manager will see.

### Root cause — combination, but ranked
1. **Architecture (primary).** A T-01 baseline + surgical per-template overrides instead of *template-parametric* cost/procedure/risk/timeline engines. Scales horizontally (states via registry) but **not vertically** (templates need a manual render-walk each). This is a design smell, not a bug stream.
2. **Testing (enabler).** No fixture per cell until it's walked → CI structurally cannot catch the class in advance. The loop is *reactive by construction*.
3. **Scope discipline (multiplier).** An 8×16 ambition with no defined "80%" finish line means there is always another cell, so the loop *cannot* terminate by its own logic.
4. **Data (secondary).** Most "bugs" are logic, not data — but the most *manager-visible* residue (identical costs, stub-state §§, hand-typed citation errors) is data, and it's the part that makes the product look unfinished even when the pipeline is clean.

### Is "done" achievable without changing approach?
**Not efficiently.** Each cell costs a live walk + a surgical sprint + a new fixture. The math (≥5–8 sprints) is the answer. "Done at 8×16" via the current method is a multi-month grind that still leaves the architecture smell and the data gaps. **The approach has to change — not because it's wrong, but because it doesn't terminate.**

---

## 7. Re-scoping proposal

**The options as posed:**
- **(a) Keep template-blind propagation** → 5–8 more sprints for T-06/07/08 + per-state authoring. Honest, but slow, reactive, and leaves both the architecture smell and the data gaps.
- **(b) Shift to sourced-data integration** → would kill ~50% of the *manager-visible* bug categories (citations, costs, plot facts), but it does **not** fix template-blind logic — that is not a data problem. Bigger lift; right long-term spine.
- **(c) Shrink to 2–3 states × 3 templates × demo polish** → 1–2 sprints, credible vertical slice, then expand.
- **(d) Hybrid: (c) first, then evaluate (a) vs (b).**

**Recommendation: (d), with a specific, ordered shape.**

**Sprint 1 — the vertical slice (this is option c).** Lock the three demo cells from §5 (T-01×Bayern, T-05×NRW, T-03×Hessen). Add a fixture for each. Fix **only** the bugs that appear on those three cells against the 12 MUST checks. Freeze everything else (T-06/07/08, stub states, deep PDF layout) behind honest "coverage in preparation" UI (check 15). Ship a demo that passes 12/12 on three cells. **Evidence this is ~1–2 sprints:** the v1.0.28/29/30 walks each closed 9–15 bugs of this exact shape in one sprint; three *substantive-state* cells avoid the stub-leak (Class S) half of the work entirely.

**Between the slice and any expansion — two cheap free-data integrations (the high-ROI half of option b; explicitly NOT BKI).**
- **Statute XML grounding (Source #1).** Ingest the official `gesetze-im-internet.de` XML for BauGB/BauNVO/GEG + the BauO of the demo states, index it, and verify rendered citations against it. This **permanently kills the fabricated/wrong-§ class** (Hessen's 5 wrong §§ would have been caught) and **removes the per-state hand-authoring grind** that Phase 12 budgets at 150–250 LOC/state. This is the single highest-leverage move and it is *low effort*. Our own `PHASE_12` conclusion ("permalinks 404") was about *live fetch* — the XML *corpus download* sidesteps it entirely.
- **Destatis Baupreisindex API (Source #2).** Free REST/JSON, table 61261, no registration. Replaces the identical-cost smell (Bug 35) with an honest, sourced regional/temporal cost index — without touching BKI's paid, API-less, copyright-encumbered tables.

**Only then decide (a) vs (b) for the rest of the matrix**, informed by whether the demo lands. If we expand, do the template-blind fix **once, parametrically** (make cost/procedure/risk/timeline engines take a `templateProfile`), as a deliberate architecture sprint — not 5 more reactive walks. ALKIS WFS (Source #3) becomes the next data layer to move Area A's plot facts from ASSUMED → CALCULATED (check 13), now that it's free in all 16 states.

**Why not (a) alone:** it doesn't terminate and leaves the data gaps. **Why not full (b):** re-platforming on data before we have a passing demo risks another open-ended project; data doesn't fix template-blind logic. **Why (d):** it produces a *shippable, credible artifact in 1–2 sprints* (the thing the v1.5 manager actually needs), then spends data effort only where it provably kills bug categories, then makes the big architecture call from a position of having shipped.

---

## What I would do if I were Rutik

1. **Stop walking new template × stub-state cells.** Every such walk maximizes bug discovery — it's the most expensive way to learn the same lesson. The next walk should be a *substantive* cell.
2. **Define "80%" as the 12 MUST checks on 3 cells (§5) and write it into the BACKLOG as the finish line.** The loop feels endless because there is no line. Draw it. T-01×Bayern, T-05×NRW, T-03×Hessen.
3. **Run one slice sprint** to pass 12/12 on those three cells; freeze the rest behind honest coverage UI. That is the manager demo.
4. **Spend one focused effort on statute-XML citation grounding** (`gesetze-im-internet.de` XML). This is the cheapest, highest-leverage anti-bug move we have and it ends the per-state hand-authoring grind that is quietly the real source of the citation-correctness debt. Add the Destatis Baupreisindex API to kill the identical-cost smell.
5. **Do NOT touch BKI** (paid, no API, copyright minefield) and **do NOT chase Architektenkammer verification** (no API, voluntary listing, can't prove a negative). Both are low-ROI traps.
6. **Make the template-blind fix parametric — once — only if the demo justifies expansion.** Three proofs of the fix-shape already exist; the fourth should be a refactor, not a walk.
7. **Reframe the moat honestly in the demo:** we are the only tool that gives instant, state-correct, §-cited feasibility with an architect-verify shield. baupotenzial has prettier 3D and no law; we have the law and no 3D. Lead with the law — but make sure, before the demo, that the law on those three cells is *sourced*, not hand-typed.

The product thesis is sound and the market gap is real. We are not lost — we are **running an open-ended matrix with no finish line, hand-building data that's free, and discovering one architectural gap in slow motion.** Draw the line at three cells, ground the citations in free XML, and the loop ends.

---

*Sources inline. Codebase claims carry file:line. No code, templates, or PDFs were modified in this pass. The Bayern composeLegalContext SHA was not touched.*
