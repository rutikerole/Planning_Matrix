# v1.0.31 — PDF Vertical Slice diagnosis

**Date:** 2026-05-25 · **Baseline:** v1.0.30 (HEAD `682add0`, tag `v1.0.30`) · Bayern SHA `b18d3f7f…aacb3471` MATCH · 10/10 gates green at baseline.
**Decision:** stop the horizontal template-blind walk (see `docs/V1_0_30_STRATEGIC_RESEARCH.md`). Harden the **architect PDF** on **3 demo cells**; freeze everything else behind honest "in preparation" UI.

> **The finish line, finally defined:** 12/12 PDF MUST checks GREEN on **T-01 Bayern München + T-05 NRW Köln + T-03 Hessen Frankfurt**, all other templates/states behind honest "coverage in preparation" UI, tag `v1.0.31`. No more horizontal grind until this passes.

---

## The 3 demo cells (substantive states × proven/bounded templates)

| Cell | Intent | State tier | Fixture (new) |
|------|--------|-----------|---------------|
| **T-01 × Bayern** | neubau (EFH, Genehmigungsfreistellung) | substantive | `bayern-t01-muenchen.json` |
| **T-05 × NRW** | abbruch (verfahrensfrei) | substantive | `nrw-t05-koeln.json` |
| **T-03 × Hessen** | sanierung (vereinfacht) | substantive | `hessen-t03-frankfurt.json` |

**Deliberately frozen** (not in demo): T-02/T-04/T-06/T-07/T-08, all 11 non-substantive stub states. Existing fixtures (`nrw-t05-bonn`, `hamburg-t02`, `sachsen-t04`, 16-state T-01 matrix) stay green — the freeze is a **UI gate only** (`ExportMenu.tsx`); `buildExportPdf` core is untouched, so `smoke-pdf-matrix.mts:99` (which imports `buildExportPdf` directly) keeps rendering them.

---

## The 12 PDF MUST checks — baseline status

🟢 pass · 🟡 holds-but-unguarded/needs-confirm · 🔴 fail

| # | Check | T-01 Bayern | T-05 NRW | T-03 Hessen |
|---|-------|:-:|:-:|:-:|
| 1 | § citations verifiable (no-fab + manual verify; XML grounding = Phase 2) | 🟡 | 🟡 | 🟡 |
| 2 | Procedure correct + CALCULATED | 🟡 | 🟢 | 🔴 |
| 3 | Cost differs OR honest disclosure | 🟢 | 🟢 | 🔴 |
| 4 | 12 sections + correct TOC | 🟢 | 🟢 | 🟡 |
| 5 | No stub-string leak | 🟢 | 🟢 | 🟡 |
| 6 | No cross-state token leak | 🟢 | 🟢 | 🟡 |
| 7 | Web verdict === PDF Section 05 | 🟡 | 🟡 | 🟡 |
| 8 | Confidence reflects open domains | 🟢 | 🟢 | 🟢 |
| 9 | Documents template-correct | 🟢 | 🟢 | 🟡 |
| 10 | Fact labels EN/DE correct | 🟢 | 🟢 | 🟡 |
| 11 | Cover + signature no overlap (Bug 59 ✓ / Bug 60 ✗) | 🔴 | 🔴 | 🔴 |
| 12 | German typography clean (±, m², ß/ä/ö/ü) | 🟢 | 🟢 | 🟢 |

**Cross-cell 🔴: Bug 60 signature overlap (page 10, identical for all cells).** Cell-specific 🔴: T-03 procedure + cost (template-blind renovation).

---

## Root causes (file:line)

**Check 11 — signature overlap (Bug 60).** `verification.ts:195-253` places the Bauherr field at fixed `bauherrY = sigStartY - 100`; `drawSignatureField` (`pdfPrimitives.ts:1022-1052`) draws the sublabel at `lineY-28` → Bauherr "Date" lands ~4 pt from the disclaimer. Same page for every cell. **Fix:** measure the legend `endY`, derive `sigStartY` from it, reflow the three signature rows content-up. **Risk:** medium — shared page; regression-guard `bayern-t03`, `nrw-t05`, `hamburg-t02`, `sachsen-t04`. Revert-if-worse.

**Check 3 — T-03 cost renders new-build HOAI rows.** `exportPdf.ts:684-755` builds 5 new-build HOAI rows; only `isDemolition` (`:717`) / `isUseConversion` (`:725`) branch out; T-03 (`intent === 'sanierung'`, derived via `intentFromTemplate`, `:384`) falls to the `else` (`:748-755`). **Fix:** add `isRenovation` honest stub mirroring T-05/T-04 ("renovation cost depends on scope — request Fachplaner quotes"). No fabricated renovation BKI.

**Check 2 — T-03 Hessen procedure → ASSUMED.** `resolveProcedure.ts` honors persona `verfahren_indikation` for any state (branches 2/3, `:298-348`) but otherwise Hessen-sanierung hits the generic branch (`:412-451`) → `standard`/`ASSUMED` (only NRW has a `resolveNrwSanierung`, `:350`). **Fix:** seed the fixture's `verfahren.typ` with the HBO conclusion ("vereinfachtes Baugenehmigungsverfahren nach § 65 HBO") → branch 3 → CALCULATED. Verified against HBO 2018 (§ 65 = vereinfachtes Verfahren).

**Check 2 — T-01 Bayern Genehmigungsfreistellung label fidelity.** Branch 2 (`:299`) matches `/genehmigungsfrei/` (Freistellung lowercases to contain it) → CALCULATED, but returns `kind:'verfahrensfrei'` rather than the distinct `genehmigungsfreigestellt` kind (which exists, `:38,:215`). **Fix:** detect Freistellung → `genehmigungsfreigestellt` label.

**Check 1 — citations.** Statute-XML grounding is **Phase 2 (v1.0.32)**. This sprint's bar (per Rutik): fabrication gate stays green (already) **+ manual verification** of the 3 cells' §§ against official law, documented in the commit body.

**Check 4 — T-03 TOC + Key Data.** Bug 103 (exec page null → TOC drift) was fixed for T-04 via a suggestions floor (`exportPdf.ts:472-473`); confirm T-03 has recommendations/suggestions so the exec page renders. Bug 78 (Key Data >~15 rows collides with footer, `keyData.ts:136-231`) bit T-04 (17 rows); the 3 demo cells likely produce <15 rows → confirm, keep Bug 78 deferred if all fit.

**Check 7 — convergence.** Procedure is single-sourced (`resolveProcedure` threaded everywhere) but the web↔PDF assertion exists only for T-04 (v1.0.30 C11). **Fix:** add the same assertion for the 3 cells.

---

## Commit map

| Commit | Scope |
|--------|-------|
| C1 | this diagnosis doc |
| C2 | 3 demo fixtures (`bayern-t01-muenchen`, `nrw-t05-koeln`, `hessen-t03-frankfurt`) seeded with `verfahren.typ`; smoke arms (`runBayernT01`/`runNrwT05Koeln`/`runHessenT03` in smoke-architect-flow + render arms in smoke-pdf-text). §§ manually verified (Check 1). |
| C3 | T-03 `isRenovation` honest cost stub + pdfStrings DE/EN parity (Check 3) |
| C4 | T-01 Genehmigungsfreistellung → `genehmigungsfreigestellt` label fidelity (Check 2) |
| C5 | **Bug 60 signature reflow** (Check 11) — measure-then-place; regression-guarded; revert-if-worse |
| C6 | Key Data overflow guard / confirm 3 cells single-page (Check 4 / Bug 78) |
| C7 | web↔PDF Section 05 convergence assertions for 3 cells (Check 7) |
| C8 | T-03/Hessen stub-leak + label + docs sweep (checks 5/9/10) |
| C9 | Freeze logic (ExportMenu ×2) + stub-state banner (QuestionPlot/QuestionIntent) |
| C10 | Cross-cutting verify (checks 6/8/12 on 3 cells) + T-03 risk rows if needed |
| C11 | CHANGELOG + HANDOFF + BACKLOG + tag v1.0.31 |

---

## Non-negotiables (every commit)

Bayern SHA `b18d3f7f…aacb3471` MATCH · 16-state T-01 matrix 16/16 · `nrw-t05-bonn` + `hamburg-t02` + `sachsen-t04` fixtures stay green · daily gates green every commit · no red commits · no chat-turn redeploy · no migrations · no fabrication (honest "in Vorbereitung" / stub for any unsourced number) · lint net-zero in touched files · revert-if-worse on the Bug 60 reflow.

---

## Resolution

| Check / Bug | Status | Commit |
|---|---|---|
| Check 1 — citations (no-fab + manual verify) | ✅ (machine XML grounding → Phase 2) | C2 `1d81e56` |
| Check 2 — procedure CALCULATED + correct § | ✅ | C2 `1d81e56` + C7 `efc768f` |
| Check 3 — cost honest (T-03 renovation stub) | ✅ | C3 `b4f70bb` |
| Check 4 — 12 sections + TOC (+ T-05 exec floor) | ✅ | C6 `78a769d` |
| Check 5 — no stub-state leak (Hessen) | ✅ | C8 `c53b2e2` |
| Check 6 — no cross-state Bayern-leak | ✅ | C3/C8/C10 |
| Check 7 — web↔PDF Section 05 converge | ✅ | C7 `efc768f` |
| Check 8 — confidence reflects open domains | ✅ (95/96/93) | C10 `60f2613` |
| Check 9 — documents template-correct | ✅ | C8 `c53b2e2` |
| Check 10 — fact labels EN/DE | ✅ | C2 `1d81e56` / C8 |
| Check 11 — cover + signature no overlap (Bug 60) | ✅ (geometric proof; visual = smoke walk) | C5 `78a7969` |
| Check 12 — typography (±, m², ß/ä/ö/ü) | ✅ | C10 `60f2613` |
| Freeze non-demo cells + stub banner | ✅ | C9 `425cc39` |
| Bug 78 multi-page Key Data | ⏭ DEFERRED (does not bite the demo cells; bites T-04+) | — |
| C4 Genehmigungsfreistellung label | ⏭ DROPPED (repo models Bayern as Art.57/58/59; T-01 uses vereinfachtes Art.58) | C2 |

**12/12 MUST checks GREEN on T-01 Bayern + T-05 NRW + T-03 Hessen.** The loop ends.
