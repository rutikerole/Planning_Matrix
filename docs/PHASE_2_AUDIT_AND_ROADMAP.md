# Phase 2 — Audit & Roadmap (Consolidated)

> **Branch:** `phase-2/full-matrix` · **HEAD:** `51e9cf7` · **Authored:** 2026-05-27
> **Bayern composed-prefix SHA:** `a2ffc7bb47946d7de822823144966576eb57b8ce2662a9ec07a26678a04f31a8` — **MATCH** before and after (this turn writes docs only; no constitutional file, no code, no migration touched).
> **Provenance discipline:** Claims I re-verified at `file:line` this session are cited directly. Claims inherited from the day-old parallel-agent sweeps are attributed to their source doc (`V1_0_33_PHASE2_STRATEGIC_PLAN.md`, `V1_0_34_PHASE2_RESEARCH.md`, `V1_0_34_BAYERN_PROCEDURE_CORRECTION.md`) and carry that doc's `file:line`. I did **not** independently re-derive the full 600-line analysis — that would be the third redundant audit this consolidation exists to avoid. Where I could not confirm, it says **UNVERIFIED**.

---

## 0. Why this document exists (read first)

The mega-prompt that commissioned this report asked for a fresh Phase-2 audit, on a new branch `phase-2/audit-and-roadmap`, off `v1.0.32.3` on `main`, holding the Bayern SHA `b18d3f7…`. **Every one of those anchors is stale, and one is dead by design.** Reconciled against the repo:

| Prompt premise | Repo ground truth | Evidence |
|---|---|---|
| HEAD = `v1.0.32.3` on `main` | On `phase-2/full-matrix`, **9 commits ahead**; latest tag is **`v1.0.32.5`** | `git branch`, `git tag --sort=-creatordate` |
| Bayern SHA invariant `b18d3f7…` | **Intentionally re-baselined → `a2ffc7bb…`** for a verified legal date fix; following `b18d3f7` literally would revert a correct fix | commit `c887bf2`; `scripts/lib/bayernSha.mjs` log; gate GREEN |
| "Produce the audit" | The audit **already exists** — `V1_0_33_PHASE2_STRATEGIC_PLAN.md` (5 agents, file:line) + `V1_0_34_PHASE2_RESEARCH.md` (7 agents) | both on disk, both were **untracked** until this turn |
| T-02/04/06/07/08 are "frozen, unfinished" | All 8 templates are **fully authored**; the freeze is a UI gate | `demoCoverage.ts:20`; `V1_0_33 §2.2` |

This document **consolidates** the two existing strategic docs + the Bayern correction finding into one artifact in the prompt's mandated structure, then adds the layer neither could contain: **what the 9 in-flight commits have closed since the audit was written.** It is the single source of truth for where Phase 2 actually stands.

---

## 1. Executive summary

1. **The audit's recommendations are already 70% executed.** `V1_0_33` recommended hardening the moat (Bug 114/118), killing the cost-lie, and fixing latent layout (Bug 78/60/117) *before* any matrix expansion. Verified at `file:line`, **Bug 114, 118, 78, 60, 117 are all closed** by commits `6d54675`→`51e9cf7`, and the per-template cost-lie is partially closed (`exportPdf.ts:749`). All 6 daily gates are GREEN at HEAD; Bayern SHA MATCH.

2. **"All 8 × all 16 architect-grade" is the wrong North Star — and the codebase's own "verified" content was not chamber-grade.** The Bayern *constitutional core* mislabels its procedure articles and cites **Art. 58a, which does not exist (HTTP 404 on gesetze-bayern.de)** (`V1_0_34_BAYERN_PROCEDURE_CORRECTION.md §1`). T-02/06/07/08 carried verified §-errors (now fixed, `3d086bd`). The honest target is **5 states × 3 templates, bulletproof against a chamber architect and a security buyer**, with breadth as the *roadmap*, not the *claim* (`V1_0_33 §9`).

3. **The real blocker is human, not engineering.** The Bayern procedure-article correction cannot be auto-applied — it needs a Bauvorlageberechtigte/r to decide whether München's default path is Genehmigungsfreistellung (Art. 58) or vereinfachtes Verfahren (Art. 59) (`…BAYERN_PROCEDURE_CORRECTION.md §4`). Per your decision this turn, it is **staged for your architect**; nothing is applied.

4. **The moat has never been used in production.** 0 `project_members`, 0 architect verifications, 0 file uploads (`FULL_GERMANY_AUDIT.md:13-24`, via `V1_0_33 §4`). Security holes are now closed, but the differentiation remains a hypothesis until one real architect verifies one real project end-to-end.

5. **Sprint count to a defensible Series-A slice: ~2–3 more sprints** (cost honesty + validate the 15 cells + one real architect). To literal 8×16 chamber-grade: **5–8 sprints** dominated by *legal authoring bottlenecked on a licensed reviewer*, not code (`V1_0_30_STRATEGIC_RESEARCH.md:155`, via `V1_0_34 §0`). Confidence: medium on the slice, low on the full matrix (every horizontal walk historically surfaced a new defect class: 12→19→22 bugs).

**Brutal-honesty line:** Your stated scope optimizes breadth. Your risk is depth. A technical buyer will not ask "how many states do you cover" — they will ask "how many architects have used this" (zero) and "can I break a shipped PDF" (today, the Bayern PDF cites a fabricated article). Fix what you sell before you sell more.

---

## 2. Current state — template × state matrix

**Legend:** 🟢**V** validated 12/12 PDF MUST (layout/text) · 🟢**A** PDF gate-permitted but never smoke-walked · 🟠**C** chat-only (persona is template-aware; PDF frozen by UI gate) · 🔴**S** stub state (MBO default + honest "in Vorbereitung" banner).

| Template | BY | NW | HE | BW | NI | BE BB HB HH MV RP SL SN ST SH TH (11 stubs) |
|---|---|---|---|---|---|---|
| **T-01** EFH | 🟢V¹ | 🟢A | 🟢A | 🟢A | 🟢A | 🔴S |
| **T-03** Sanierung | 🟢A | 🟢A | 🟢V | 🟢A | 🟢A | 🔴S |
| **T-05** Abbruch | 🟢A | 🟢V | 🟢A | 🟢A | 🟢A | 🔴S |
| **T-02** MFH | 🟠C | 🟠C | 🟠C | 🟠C | 🟠C | 🔴S + 🟠C |
| **T-04** Umnutzung | 🟠C | 🟠C | 🟠C | 🟠C | 🟠C | 🔴S + 🟠C |
| **T-06** Aufstockung | 🟠C | 🟠C | 🟠C | 🟠C | 🟠C | 🔴S + 🟠C |
| **T-07** Anbau | 🟠C | 🟠C | 🟠C | 🟠C | 🟠C | 🔴S + 🟠C |
| **T-08** Sonstiges | 🟠C | 🟠C | 🟠C | 🟠C | 🟠C | 🔴S + 🟠C |

¹ **T-01×BY is "validated" only in the layout/text sense.** It carries the staged Bayern procedure-article legal error (§3, §11). "Validated 12/12" meant the PDF passed internal-consistency + layout MUST checks — **not** primary-source legal correctness.

**Per-cell evidence:**

| Classification | Definition | Evidence | Count |
|---|---|---|---|
| 🟢V validated | T-01×BY, T-03×HE, T-05×NRW; 12/12 MUST | `V1_0_31_PDF_SLICE_DIAGNOSIS.md:10-16` | 3 cells |
| 🟢A gate-permitted, unwalked | other 12 of (T-01/T-03/T-05 × 5 substantive) | `demoCoverage.ts:39-46` gates on template + substantive state **only** — no city, no smoke record | 12 cells |
| 🟠C chat-only | T-02/04/06/07/08 × any state; persona template-aware via prompt, PDF blocked | `PDF_DEMO_TEMPLATE_IDS = ['T-01','T-03','T-05']` `demoCoverage.ts:20`; "Coming soon" = i18n `frozenTemplate` | bulk |
| 🔴S stub | 11 states emit MBO defaults + banner; `allowedCitations: []` | `V1_0_33 §2.3`; unknown bundesland **silently falls back to `BAYERN_DELTA`** `legalRegistry.ts:7,18,52` | 11 states |

**The uncomfortable cell:** the honesty gate ships **15 cells** but only **3 are validated**. A user can export a "demo-ready" PDF for T-01×NRW or T-03×BW that no one has ever checked against the 12 MUSTs — a **5× gap between ship-allowed and ship-verified**, invisible in the UI (`V1_0_33 §3`). This is the single highest-value cheap win remaining (see §10).

**Surface arithmetic (not "3,072"):** 8 templates × 16 states × 2 languages × (6 web tabs + 1 PDF) = **1,792 surfaces** (`V1_0_33 §3`, each factor cited). The prompt's "~3,072" conflates verified/unverified as a dimension; the real number is 1,792 and "every cell perfect" is the 5–8 sprint grind, not a Phase 2.

---

## 3. Current state — architect handoff flow

The 10-step flow, with current verdicts. **The two security holes the audit flagged are now closed; the moat's real weakness is that it has zero production usage.**

| # | Step | Verdict | Evidence |
|---|---|---|---|
| 1 | Owner generates invite link | WORKS | `share-project/index.ts` create path; modal `InviteArchitectModal.tsx` |
| 2 | Token routes to accept page | WORKS | `architectInviteApi.ts` |
| 3 | Architect lands on accept page (DE+EN) | WORKS | `architect.accept` keys, `verify:locales` GREEN (1459 keys parity) |
| 4 | Auto-promotion to designer on click | WORKS — **by deliberate design** | `share-project` handleAccept; v1.0.32.3 "token is authorization" UX |
| 5 | Architect opens project in Preview | WORKS | owner "Preview as architect" mode (`f535838`) |
| 6 | Verify a fact → identity modal | WORKS | Bug 112 one-time identity prompt (`7cea75b`) |
| 7 | Modal captures name + chamber once | WORKS — **self-attested, not chamber-audited** | migration `0036`; `verification.ts:57-58` |
| 8 | Verification persists to DB | WORKS, **now race-safe** | **Bug 118 CLOSED:** `verify-fact/index.ts:228,319` reads + CAS-writes on `state_version` → 409 on conflict |
| 8b | Invite token bound to invited email | **Bug 114 CLOSED** | `0037` adds `invited_email`; `share-project/index.ts:265,356,363` rejects a forwarded link (403) |
| 9 | Owner sees verified state realtime | WORKS | `0035` realtime publication (`V1_0_33 §2.3`) |
| 10 | PDF re-render: cover/footers/signature flip | WORKS, **layout now guarded** | **Bug 60 CLOSED in code:** `verification.ts:32,217` ellipsizes attested name to its column. **Visual confirm still owed** — smoke is text-only (`smoke-pdf-text.mts:358-374`, via `V1_0_34 §3`) |

**Manual-ops note:** migrations `0036`/`0037` + `verify-fact`/`share-project` Edge Functions are deployed by operator, not from repo. Repo code is verified; **deployed-version parity is UNVERIFIABLE-FROM-REPO** — confirm the live functions match HEAD before relying on Bug 114/118 closure in production.

**The meta-finding (`V1_0_33 §8`):** this moat is your entire B2B differentiation, was found *hollow* six weeks ago and emergency-rebuilt (`CHANGELOG.md:140-149`), and **has never been exercised in production** (0 `project_members`, `FULL_GERMANY_AUDIT.md:18-24`). Closing the security holes was necessary. Getting one real architect through it is the thing that converts the moat from hypothesis to fact.

---

## 4. Deferred-bug inventory — reconciled against the 9 in-flight commits

The `V1_0_33 §6` table is reproduced with a **STATUS-NOW** column proving what the in-flight commits closed (each closure re-verified at `file:line` this session).

| Bug | What it was | Audit severity | STATUS NOW | Closing evidence |
|---|---|---|---|---|
| **114** unbound invite token | Token auto-granted verification authority to anyone with the link | P1 (P0 for security DD) | ✅ **CLOSED** | `0037` `invited_email`; `share-project/index.ts:265,356,363` 403s forwarded link |
| **118** verify-fact race | Optimistic-lock infra existed but `verify-fact` didn't use it (dead code) | P1 | ✅ **CLOSED** | `verify-fact/index.ts:228,252,319` CAS on `state_version` → 409 |
| **78** Key Data overflow | Flat `forEach`, no `addPage`; broke ~17 rows | P1 (latent; blocks rich-fact unlocks) | ✅ **CLOSED** | `keyData.ts:144,155-160` `rowY`/`PAGE_FLOOR`/`addPage`/repeat-header |
| **60** signature collision | Self-attested name (size 12, no guard) could hit chamber column | P2 (P1 the day a long name signs) | ⚠️ **CLOSED IN CODE; visual-unconfirmed** | `verification.ts:32,217` `ellipsizeToWidth`; no PNG/PDF snapshot in repo |
| **117** erosion coverage | Owner-edit erosion downgraded facts only, not recs/procs/docs/roles | P2 | ✅ **CLOSED** | `projectStateHelpers.ts:140,175` extends erosion to the other 4 collections |
| **35** identical-cost smell | Cost engine had no template term → same € for every template | P1 | 🟡 **PARTIAL** | `exportPdf.ts:749-781` adds per-template **headline band** (`costBandFor`, `costNormsMuenchen.ts:435,495`); underlying `buildCostBreakdown:185` still has no template term, per-state factor uncalibrated |

**Remaining open (not bugs — scoped work):** validate the 12 unwalked cells; per-state cost calibration (no free source — §5); Bayern procedure correction (staged, §11); 11-state authoring + statute-XML rails (§7). **Net: the audit's entire P1/P2 deferred-bug list is closed or partially closed.** The deferred-bug loop the v1.0.30 research feared is, for now, broken.

---

## 5. Free-data sources — status as of 2026-05-27

**Honesty note:** these are inherited from the `V1_0_34_PHASE2_RESEARCH.md` smoke tests dated 2026-05-26/27 (one day old). I did **not** re-hit the endpoints this turn (the consolidation decision precludes a redundant network sweep). The ALKIS WFS claim was **not** re-verified by either recent doc.

| Source | v1.0.30 claim | Status now (verified date) | Correction / effort |
|---|---|---|---|
| **gesetze-im-internet.de XML** | "free corpus covers state BauO" | **PARTLY WRONG.** Federal law (BauGB §246e) is there `[VERIFIED V1_0_34 §1]`; **state BauO live on state portals** (Bayern→gesetze-bayern.de, NRW→recht.nrw.de) — the V1_0_34 fetches confirm this split. Corpus-download (not runtime fetch — live permalinks 404'd in Phase 12) | Federal corpus: ~1–2 eng-days ingest. State BauO: per-portal scraping, **not** one uniform XML feed. Belongs in **Phase 3** as the citation-validation backbone, paired with stub authoring (`V1_0_33 §5`) |
| **Destatis Baupreisindex (GENESIS 61261)** | "free REST/JSON, regionalizes cost" | **NATIONAL-ONLY.** No per-state index exists in free public data. GENESIS REST API real + guest-auth (`GAST/GAST`), was in scheduled maintenance at test time `[VERIFIED V1_0_34 §4]` | Cures "identical across regions" smell, **not** "identical across templates." Necessary-not-sufficient. ~2–3 eng-days |
| **ALKIS WFS** | "free in all 16 states (RLP+SL flipped 2024)" | **UNVERIFIED THIS CYCLE.** Neither V1_0_33 nor V1_0_34 re-checked it; last verified ~v1.0.30 (~6 mo old) | Re-verify before relying. Not on the Phase-2 critical path |
| **BKI Regionalfaktoren** | "paid, no API, do not touch" | **CONFIRMED.** Paywalled, Kreis-level, no per-state aggregate, no API `[VERIFIED V1_0_34 §4]` | Do not engage |

**The hard truth this surfaces (`V1_0_34 §0 Inversion 3`):** **no free primary source for per-state cost factors exists.** "Every cost figure has a BKI/HOAI source" is **not satisfiable by an LLM from free sources** — per-state calibration needs a human BKI purchase. Thinnest wedge that's honest: ship Destatis national index + Bayern baseline, label everything else "Regionalfaktor noch nicht kalibriert," and stop fabricating.

---

## 6. Template-parametric refactor — VERDICT: NO-GO as framed; registry is the real spine

`V1_0_33 §4` killed the "thread `templateProfile` → close 5 templates in one sprint" hypothesis on evidence:

- **The legal logic is not where a profile would thread it.** The §-chains live in **LLM prompt strings** (`templates/index.ts:41`) the PDF engines never import. The cost engine has **no template term to thread** (`costNormsMuenchen.ts:185`). Threading a profile produces *different-but-still-wrong* numbers — worse than an honest-empty stub, because a plausible wrong number reads as authoritative.
- **The deeper fact (`V1_0_33 §8`):** German building law is encoded **twice** — once as LLM prompt strings (rich, correct), once as deterministic export engines (template-blind, München-calibrated, hand-coded). Every template-blind bug is a *synchronization bug* between the two. A parametric refactor entrenches the dumb copy; it does not reconcile them.

**The real spine (`V1_0_34 §5`, the one GREEN premise):** a **per-state `LawEntry` registry** (`src/legal/registry/`), TypeScript interface, one entry per `BundeslandCode` (not per template×state). Both surfaces import it: LLM reads `prose` (SHA-locked strings, **referenced by import, never inlined** — inlining renames the `export const` and breaks the SHA regex), PDF reads structured `citations[]` with `role` + `layer` + `appliesTo: TemplateId[]` + `provenance`. `allowedCitations` becomes **derived** so the firewall and PDF cannot disagree.

**Migration (3 commits, SHA gate each):** (1) registry alongside, `compose.ts` emits byte-identical concatenation → SHA passes by construction; (2) repoint PDF engine to thin adapters, snapshot 3 demo cells byte-identical; (3) delete legacy `stateLocalization.ts`/`stateCitations.ts`, derive `allowedCitations`, extend `verify-citation-drift.mjs:31,77` to all 16 states. **Trap:** Bayern PDF procedure routes through `detectProcedure` in `costNormsMuenchen.ts`, not `resolveProcedure.ts` — unifying changes Bayern bytes; defer to post-migration. **Estimate:** spine ~2–3 days; defer until §10/§11 land.

---

## 7. Stub-state authoring plan

11 stub states emit MBO defaults + honest banner (`allowedCitations: []`). `V1_0_34 §1` built the law dossier but is explicit about the gating constraint:

- **Authorable to a draft** from the dossier (procedure-article maps `[VERIFIED]` per portal for most states). **Not closable to chamber grade autonomously** — PV-Pflicht norms unverified for 8 states, Bauvorlagenverordnung **not sourced for any of the 16**, several rest on authoritative-*secondary* sources (baunormenlexikon), not primary text read line-by-line (`V1_0_34 §1`).
- **Recommended order (`V1_0_33 §7`):** **RLP then SH** first — easiest, regulatory-family donors (BW/Hessen, Niedersachsen). **Defer the Stadtstaaten (Berlin, Bremen, Hamburg)** — `cityBlock: null` model mismatch, no geographic donor (`berlin.ts:6`, `bremen.ts:5`).
- **Hard dependency:** authoring is **bottlenecked on verification, not generation.** "I author, Claude validates" does not work without grounding. The honest model is **"Claude generates draft, statute-XML + a licensed human validate."** So this track is *blocked* on the XML rails (§5/§6) landing first, and on a reviewer in the loop.
- **Effort:** XML rails 2–3 days; **2–4 days per state**, dominated by reviewer turnaround, not code.

**Recommendation:** keep the 11 stubs gated and honest. Cutting them is *less* risky than half-building them — a gated stub fails as a *disclosed gap*; a half-built state fails as an *undisclosed wrong answer with an architect's name on it* (`V1_0_33 §9`).

---

## 8. Phase 2 sprint sequence

Dependency-aware. Ranges, not dates. Every sprint holds the 6 hard gates (`verify:locales`/`hardcoded-de`/`legal-config`/`pdfstrings`/`citation-drift`/`bayern-sha`) + `verify:bundle` ≤300 KB.

**✅ DONE (this branch, `6d54675`→`51e9cf7`):** Bug 114/118 (moat security), per-template cost bands (C2), citation-drift gate (C3), §246e date + SHA re-baseline (C4a), §-errors in T-02/06/07/08 (C4b), Bug 78/60/117. *This is the audit's v1.0.33 + v1.0.35 bug scope, already landed.*

**SPRINT A — Bayern procedure-article correction** *(blocked on human)*
- Goal: remove the fabricated Art. 58a and the one-shifted procedure map from the constitutional core.
- Scope: `…BAYERN_PROCEDURE_CORRECTION.md §3` (mechanical 95%) + §4 (the one substantive default-procedure call).
- Exit: corrected T-01 Bayern PDF visually confirmed by a licensed reviewer; intentional SHA re-baseline logged; `verify:citation-drift` no longer allows Art. 58a.
- Dependency: **a Bauvorlageberechtigte/r adjudicates §4.** Staged this turn; not applied.
- Estimate: 0.5 day code once adjudicated; wall-clock gated on reviewer.

**SPRINT B — Cost honesty** *(no human dependency)*
- Goal: stop shipping uncalibrated regional numbers as if sourced.
- Scope: Destatis national index ingest (build-time, table 61261); label uncalibrated per-state factors "noch nicht kalibriert"; hold the line — regionalize, do **not** fabricate per-template bases (§5).
- Exit: no two regions emit identical tables falsely labeled CALCULATED; provenance honest.
- Estimate: 3–5 days.

**SPRINT C — Validate the 15** *(no human dependency)*
- Goal: close the ship-allowed > ship-verified gap (§2).
- Scope: smoke-walk the 12 gate-permitted-but-unwalked cells to 12/12 MUST; add the visual/snapshot confirm Bug 60 still owes.
- Exit: 15/15 cells 12/12; a 25-fact synthetic project paginates cleanly (regression-guards Bug 78).
- Risk: history says each horizontal walk surfaces 1–3 new template-blind defects. Budget for it.
- Estimate: 4–7 days.

**SPRINT D+ — Registry spine, then RLP/SH authoring** *(blocked on reviewer)* — §6, §7. Optional; only if Series A demands breadth over depth.

---

## 9. Risks, unknowns, open questions

| Risk / unknown | Prob | Impact | Mitigation | Owner |
|---|---|---|---|---|
| Live Edge Functions drift from HEAD (Bug 114/118 only closed in repo) | Med | High | Confirm deployed version = HEAD before claiming closure in prod | Rutik (operator) |
| Bayern correction's §4 default-procedure call decided wrong | Med | High | License-reviewed adjudication; do not auto-apply | Licensed architect |
| 12 unwalked cells hide a new defect class | High | Med | Budget Sprint C for 1–3 defects/cell | Claude Code |
| No free per-state cost source ever appears | High | Med | Ship national + Bayern baseline, label honestly; revisit only with a human BKI pull | Rutik |
| Bug 60 long-name collision ships unconfirmed | Low | Med | Visual snapshot in Sprint C | Claude Code |
| Registry refactor perturbs Bayern bytes | Med | High | Reference prose by import; snapshot byte-identical per commit; SHA gate each | Claude Code |
| State BauO amended mid-sprint | Med | Med | Statute-XML rails detect drift at build | Claude Code |
| Moat stays at 0 production architects | High | High | Recruit one real architect through the live flow | Rutik |
| ALKIS WFS no longer free in all 16 | Low | Low | Re-verify before any geo feature; off critical path | Claude Code |

**Open questions I could not close in ~30 min:** (1) exact gzipped bundle size at HEAD — not derivable from source (no committed manifest; ceiling 300 / target 280, `verify-bundle-size.mjs`). (2) Whether the v1.0.32.3 auto-promote ("token is authorization") should survive now that Bug 114 binds the token to an email — a product-UX call, not an engineering one. (3) Live Destatis endpoint shape (was in maintenance at last test).

---

## 10. Recommended next sprint

**Sprint C — Validate the 15 cells.** It is the highest-value sprint with **no human dependency** (Sprint A is blocked on your architect; B is also fine but C de-risks the demo most).

- **Why:** it closes the only gap a buyer can *trip over today by clicking export* — a demo-ready PDF no one has checked. It needs no new data source and no legal adjudication.
- **Scope:** smoke-walk all 12 unwalked gate-permitted cells to 12/12 MUST; add the owed Bug 60 visual confirm; regression-guard Bug 78 with a 25-fact synthetic project.
- **Exit criterion a non-engineer can verify:** Rutik exports the PDF for any of the 15 green cells (e.g. T-01×NRW, T-03×BW) and sees a clean, complete, correctly-paginated brief with no overflow, no blank signature, no obviously-wrong number. A checklist of 15 "looks right / doesn't" — no code reading required.

---

## 11. Where I disagree with the prompt's scope

This section is mandatory and non-empty by design.

1. **Do not re-run the audit; it is one day old and file:line-grounded.** Re-running 7 fresh agents would be the *third* instance of the exact over-engineering the v1.0.30 research named twice. The prompt's own anti-over-engineering clause forbids it. (This is why this turn consolidates instead.)

2. **The prompt's anchors are stale, and one is actively harmful.** Holding Bayern SHA to `b18d3f7…` would revert the correct §246e Bau-Turbo date fix (`c887bf2`). Branching off `v1.0.32.3 main` would orphan 9 commits of executed work. Following the prompt literally would *undo* progress.

3. **"All 8 × all 16 architect-grade" is the wrong target — proven, not asserted.** Your own "verified" content failed primary-source review: the Bayern constitutional core cites a **fabricated Art. 58a (404)** and a one-shifted procedure map (`…BAYERN_PROCEDURE_CORRECTION.md §1`); T-02/06/07/08 had verified §-errors (now fixed). Internal-consistency gates (SHA, drift, smoke) certify the repo agrees with *itself*, **not** that it agrees with the *law*. Breadth before depth here means scaling a wrong-answer machine. The defensible Series-A claim is **5 states × 3 templates that survive a chamber read + a pen test**, with breadth as roadmap (`V1_0_33 §9`).

4. **The bottleneck is a licensed human, not the LLM.** Per-state cost factors (no free source) and 11-state legal authoring (PV/BauVorlV gaps, secondary sources) **cannot be closed to chamber grade autonomously** (`V1_0_34 §0`). The product's own reason to exist — the wrong-§ risk — is exactly what an LLM authoring 11 states would reintroduce. Plan around "Claude generates, human validates," not "Claude finishes."

5. **The question the prompt didn't ask:** the moat you're scaling has **zero production users** and was hollow six weeks ago. Before any matrix expansion, get **one real architect to verify one real project end-to-end.** Until then, the differentiation is a hypothesis, and that is the question that ends a due-diligence meeting (`V1_0_33 §8`).

---

## 12. Appendices

### A. Files read this session
`docs/V1_0_33_PHASE2_STRATEGIC_PLAN.md`, `docs/V1_0_34_PHASE2_RESEARCH.md`, `docs/V1_0_34_BAYERN_PROCEDURE_CORRECTION.md`; `package.json`; `scripts/verify-bayern-sha.mjs`, `scripts/lib/bayernSha.mjs`. Verified at file:line: `supabase/migrations/0037_project_members_invited_email.sql`, `supabase/functions/verify-fact/index.ts`, `supabase/functions/share-project/index.ts`, `src/features/chat/lib/exportPdf.ts`, `src/features/chat/lib/pdfSections/keyData.ts`, `src/features/chat/lib/pdfSections/verification.ts`, `src/lib/projectStateHelpers.ts`, `src/legal/demoCoverage.ts`, `src/features/result/lib/costNormsMuenchen.ts`, `src/legal/legalRegistry.ts`.

### B. Commits reviewed
`6d54675` (C1 Bug114/118 + `0037`) · `5f6dfba` (C2 cost bands) · `385aeb4` (C1-followup smoke) · `1032447` (C3 drift gate) · `c887bf2` (C4a §246e date + SHA re-baseline) · `3d086bd` (C4b §-errors T-02/06/07/08) · `c05c8d2` (Bug 78) · `f8b5a05` (Bug 60) · `51e9cf7` (Bug 117). Range walked: `v1.0.32.5`→HEAD.

### C. Gate outputs (2026-05-27, at HEAD `51e9cf7`)
```
verify:locales        OK — 1459 keys, parity ✓
verify:hardcoded-de   clean (0 hits)
verify:legal-config   OK — all 8 keys present, zero source leaks
verify:pdfstrings     OK — 167 keys, EN/DE parity ✓
verify:citation-drift OK — single source (bayernAllowedCitations.ts, 43 tokens); 5 Bayern PDF citations all in allowlist
verify:bayern-sha     ✓ MATCH — a2ffc7bb…f31a8 (47959 chars)
```
Data-source smokes inherited from `V1_0_34_PHASE2_RESEARCH.md §1,§4` (2026-05-26/27): §246e BauGB [VERIFIED gesetze-im-internet.de]; Destatis GENESIS 61261 national-only, guest-auth, in maintenance at test [VERIFIED]; BKI paywalled [VERIFIED]. ALKIS WFS NOT re-verified this cycle.

### D. Glossary (for Rutik)
- **Bauvorlageberechtigte/r** — person legally entitled to submit/sign building documents (the licensed architect the moat depends on).
- **Bauantrag** — the building permit application itself.
- **BayBO** — Bayerische Bauordnung (Bavaria's building code). Articles, not §§.
- **MBO** — Musterbauordnung, the federal model code states adapt; our stub fallback.
- **Genehmigungsfreistellung (Art. 58)** — permit-exempt path when a qualified development plan exists. **Art. 58a does not exist.**
- **Vereinfachtes Verfahren (Art. 59)** — simplified permit procedure.
- **Reguläres Baugenehmigungsverfahren (Art. 60)** — full permit procedure, incl. special buildings (Sonderbau).
- **Verfahrensfrei (Art. 57)** — needs no procedure at all.
- **§246e BauGB** — "Bau-Turbo" federal fast-track; in force 30.10.2025, sunsets 31.12.2030.
- **HOAI** — fee schedule for architects/engineers; cost-engine reference.
- **Genehmigungsfiktion** — deemed approval if the authority misses its deadline (confirmed BW §58 Abs.1a + SH §63).
- **Stadtstaaten** — city-states (Berlin, Bremen, Hamburg); no separate municipal layer, hence the `cityBlock: null` model mismatch.

---

*Bayern SHA re-confirmed MATCH at end of authoring. No constitutional file, no code, no migration touched. This turn writes documentation only.*
