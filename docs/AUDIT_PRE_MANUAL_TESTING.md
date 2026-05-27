# Full-Power Audit — Before Manual (Architect) Testing

**Branch:** `audit/full-power-pre-manual-testing`
**Date:** 2026-05-27
**HEAD audited:** `92b08a3` (merge phase-c item #2 architect-tone)
**Bayern SHA invariant:** `cdf3c625…f9daaf` (48475 chars) — verified MATCH before, during, and after this audit. No code changed this turn.
**Method:** 5 parallel read-only sub-agents (leak hunt · corpus integrity · architect handoff · regression-guard adversarial + deferred bugs · code-path coverage) + orchestrator-driven gate runs and **direct PDF render verification** of the non-default code paths. Every non-trivial claim carries `file:line` or a render result; unproven claims are labelled UNVERIFIED.

> **Honesty note on this report's own process.** Two sub-agents made confident claims that were **falsified by rendering** — the discipline "render beats code reading" earned its keep. Those corrections are kept in-line (§3, §13) rather than hidden, because they change the conclusion. The single scariest line in this report is not a citation leak — it is that the architect-handoff *security binding* and the *live verify→PDF round-trip* are unverified in production and uncovered by tests, and migration 0037 may not be applied (in which case invite creation hard-fails). That is §6.

---

## 1. Executive Summary

**What is working at architect-grade right now:**
- The cross-state **citation-leak class is genuinely well-defended.** The NBauO/München leak shapes that Phase B/C closed are dead on the rendered surfaces — proven by `smoke:pdf-matrix` 16/16, the static F1/F2/F3/F7 guards, **and** my own renders of the previously-uncovered denkmal / T-03 / T-05 / T-06-08 / verfahrensfrei paths (§3, §4). Denkmal authority names render correctly per state (Berlin → "Landesdenkmalamt Berlin", RLP → GDKE, Sachsen → "Landesamt für Denkmalpflege Sachsen").
- The **verified-PDF artifact (the moat's output) is real and render-tested**: the architect's name lands in the signature column (not the chamber column, Bug 60), "Vorläufig" clears everywhere, the cover banner gates correctly (`smoke:pdf-text` 386/0). The v1.0.31-era "the artifact is hollow" P0s are closed.
- Daily gates are green **except one** (see below): `prebuild` (7 sub-gates), `smoke:pdf-text`, `smoke:pdf-matrix`, `smoke:chat-ux`, `verify:citations:strict`, `verify:corpus-pack` all PASS.

**What is fragile or hiding a problem:**
- **The corpus is referentially clean but not legally correct.** Both citation gates only check "does this § exist in the corpus" and "is the generated file in sync" — neither checks the § means what we say it means, nor that it matches current law. Behind the green gates: **Thüringen ships stale pre-2024 section numbers** (§§ 67/72/74 where ThürBO-2024 renumbered to 64/65/67), and **Baden-Württemberg + Niedersachsen carry concept→§ mis-maps in hand-coded `stateCitations.ts`** that no gate can ever see. 13 of 16 states ride a single secondary mirror (`baunormenlexikon.de`); the Thüringen case proves that mirror can serve stale text under a current-looking label.
- **97 of 128 (state × template) cells have no fixture and have never been render-verified.** T-06/T-07/T-08 have zero fixtures in any state; only NRW exercises verfahrensfrei; only Berlin exercises denkmal=true. For the 11 substantive non-Bayern states only the plain T-01 path is render-verified.
- **The architect handoff is shipped-but-unverified-in-prod.** Migration 0037 is `UNVERIFIABLE-FROM-REPO` and is sitting as an uncommitted working-tree change; if it is not applied in production, creating an invite will hard-fail (the `invited_email` INSERT hits a missing column). The email-binding security gate and the full modal→verify-fact→PDF identity round-trip are covered by **no** automated test.
- A real but **latent** fragility: three different unknown-state fallbacks (`getStateLocalization`→Bayern, two `procedureCase.bundesland`→'nrw', one →'bayern'), masked only by the DB `not null default 'bayern'`.

**Honest next-sprint scope (one line):** Fix the legal-correctness blockers (Thüringen renumbering, BW/NI mis-maps) and verify+test the architect-handoff prod path — *not* another leak hunt, because that class is already defended.

**Ready for manual (architect) testing?** **CONDITIONAL — yes for tone/UX/flow, with two preconditions.** (1) Confirm migration 0037 is applied in prod (else invite creation 500s on first click). (2) Either fix or explicitly fence Thüringen/BW/NI before showing those states to a licensed architect — they will spot a wrong § instantly, and it undermines trust in the other 13. **What manual testing WILL catch:** wrong §§ in whatever states/templates the architect happens to open, tone/boilerplate, and obvious flow breaks. **What it will NOT catch:** the 97 unrendered cells (unless the architect picks those exact combos), the latent null-fallbacks, and the untested handoff security binding — those need code/data work, not a demo.

---

## 2. Current State — the 16 × 8 Matrix

**Classification approach (and why not 128 individual rows).** Citation *correctness* is a property of the **state**, not the cell: the 8 templates reuse the same per-state § pack (`stateCitations.ts` + `corpusCitations.generated.ts`); a template mostly changes *which* documents/procedures are listed, not whether "§ 14 BauO Bln" is right. So I classify by state (citation correctness) and annotate template/render coverage separately (§4 is the full coverage matrix). This is the honest unit of work; treating it as 128 independent cells overstates both the progress and the remaining effort.

Legend: **HARDENED** = real fixture + render-verified clean · **SUBSTANTIVE** = corpus/hand-coded citations present, no known leak, limited render coverage · **STUB** = an honest-deferral string renders somewhere · **BROKEN** = renders a demonstrably wrong citation.

| State | Tier | Render-verified templates | Evidence / why |
|---|---|---|---|
| Bayern | **HARDENED** | T-01 (×3 fixtures), T-03 | Primary-sourced (gesetze-bayern.de). `bayern-t03-verified.json` + matrix + pdf-text. Bayern SHA-locked. |
| NRW | **HARDENED** | T-01, T-03, T-05 (×2) | Primary-sourced (recht.nrw.de). Most-tested state (fixtures for neubau/renovation/abbruch/verfahrensfrei). |
| Hessen | **HARDENED→SUBSTANTIVE** | T-01, T-03 (rendered clean §3) | Corpus overlay auto-corrects the old §49/§66 mis-cites; `unverified.json:37-38` worth a post-overlay confirm. Mirror tier. |
| Niedersachsen | **SUBSTANTIVE w/ mis-map** | T-01 | Hand-coded. `permitSubmissionCitation:'§ 65 NBauO'` is wrong — Bauvorlageberechtigung is **§ 53**; § 65 is Bautechnische Nachweise (duplicates structuralCert). `stateCitations.ts:158`. |
| Baden-Württemberg | **SUBSTANTIVE w/ mis-map** | T-01 | Hand-coded. `structuralCertCitation:'§ 73a LBO BW'` = "Technische Baubestimmungen", not a structural cert (Standsicherheit = § 13); `§ 58` = the permit, not the form. `stateCitations.ts:121,123`; flagged in `unverified.json:39-40`. |
| Berlin, Hamburg, Bremen | **SUBSTANTIVE** | T-01 (Stadtstaat cityBlock=null path) | Corpus-backed BauO Bln / HBauO / BremLBO. Only plain T-01 rendered; non-T-01 Stadtstaat paths unrendered (§4). |
| Brandenburg, MV, Saarland, SH, Sachsen, Sachsen-Anhalt | **SUBSTANTIVE** | T-01 only | Corpus-backed, mirror tier. Sachsen-Anhalt + RLP + Sachsen spot-checked; SA clean. All non-T-01 templates unrendered. |
| **Rheinland-Pfalz** | **STUB (partial)** | T-01, +denkmal/T-04 rendered (§3) | Corpus lacks RLP `structuralCertCitation` **and** `regular` procedure → renders the deferral *"Detail-§ noch nicht hinterlegt — mit Bauamt oder Architektenkammer abklären"* inline as the Standsicherheitsnachweis citation on neubau. Render-confirmed (§3). Weakest state. |
| **Thüringen** | **BROKEN** | T-01 (matrix passes — but §§ are wrong) | `§ 67/§ 72/§ 74 ThürBO` (permitSubmission/structuralCert/permitForm) are **pre-2024 numbers**; ThürBO-2024 uses **§ 64/§ 65/§ 67**. The matrix passes because it checks *shape*, not *correctness*. `corpusCitations.generated.ts:122-127`. |

> The four-tier picture: **2 HARDENED-and-primary** (Bayern, NRW), **~11 SUBSTANTIVE** (corpus/hand-coded, mirror tier, mostly T-01-only render coverage, 2 with mis-maps), **1 STUB-partial** (RLP), **1 BROKEN** (Thüringen). "All 128 cells open / no Coming-soon badge" is true at the UI level and false at the architect-grade-correctness level for at least Thüringen/BW/NI/RLP.

---

## 3. Leak Classes — render-arbitrated

The lead hypothesis going in was "find the next NBauO-class cross-state citation leak." **Verdict: that class is genuinely defended — no new LIVE cross-state citation leak was found.** The leak-hunter agent's broad grep across `src/legal/`, `src/features/result/lib/`, `src/features/chat/lib/` + `pdfSections/`, `src/data/`, and the wizard/architect features found the historically-fixed shapes all closed. My renders of the previously-uncovered paths confirm it.

### 3.1 GAP-1 (cost-band München/BayBO) — claimed LIVE by an agent, **FALSIFIED by render → reclassified LATENT**
The regression-guard agent reported `COST_BANDS_BY_TEMPLATE` T-01/T-03/T-05 (`costNormsMuenchen.ts:439,455,474`, still containing "München"/"Munich"/"BayBO Art. 57") as a **live** leak rendering on every state's cost section. **This is wrong, and rendering proves it:**
- PDF routes T-03 → `costs.renovation.subtitle`, T-05 → `costs.demolition.subtitle`, T-04 → `costs.useConversion.subtitle`, T-01 → per-category BASE table (`exportPdf.ts:761-822`). The headline band (`headlineBand.basisDe`) renders **only** in the `else` arm = T-02/T-06/T-07/T-08.
- The web Cost tab mirrors this exactly (`CostTimelineTab.tsx:131-160`): T-03→renovationStub, T-05→demolitionStub, band only when `isHeadlineBand` (T-02/06/07/08).
- **Render evidence:** Hessen T-03, NRW T-05, Hamburg T-02, Berlin T-06/T-07/T-08 — all rendered de+en → **"no leak tokens found."** And the existing matrix renders all 16 T-01 with a `/München/` guard (`smoke-pdf-matrix.mts:201`) and passes — which alone disproves the T-01 claim.

**Correct classification: LATENT.** The München/BayBO strings in T-01/T-03/T-05 bands are dead-for-rendering but un-guarded (the band-leak guard at `smoke-pdf-matrix.mts:391` checks only T-02/06/07/08). If anyone ever changes the cost-routing gates, they leak. Fix shape: make the three strings state-neutral (as T-02/T-04/T-06 already are) so the data is clean regardless of gating; flip the guard loop to all 8 templates.

### 3.2 The real residual leak class: **inconsistent unknown-state fallbacks (LATENT, masked by NOT NULL)**
Three call sites disagree on what an unknown/empty bundesland resolves to:
- `stateLocalization.ts:479` → `REGISTRY[code] ?? BAYERN` — returns the **full substantive Bayern pack** (BayBO Art. 57/59/60/62, BLfD). This is the *exact* shape its sibling `getStateCitations` (`stateCitations.ts:384`) deliberately avoids by returning an honest stub.
- `exportPdf.ts:398` and `resolveDocuments.ts:83` → `?? 'nrw'` (procedure + documents resolve as NRW).
- `exportPdf.ts:665` (the bleed-guard "active state") → `?? 'bayern'`.

Reachability: `projects.bundesland` is `text not null default 'bayern'` (`0003_planning_matrix_core.sql:58`), so **null is unreachable for any real row → today this is LATENT, not LIVE.** The residual risk is a *non-null but non-canonical* string (a future code, a typo, a non-16 value): it is kept (not defaulted to null), misses `REGISTRY`, and falls through to **substantive Bayern** content on a non-Bayern brief. Fix: `getStateLocalization` should return an honest stub for unknown codes (mirror `getStateCitations`); thread the real bundesland with a stub fallback at the two `?? 'nrw'` sites.

### 3.3 Un-bleed-guarded render paths (LATENT)
`sanitizeCrossStateBleed` only wraps the A/C branches at `exportPdf.ts:663`. The **Area B body** procedure reason (`exportPdf.ts:574-588`) and the **entire `resolveDocuments` output** render without passing through it. So if the §3.2 fallback ever fired, the NRW/Bayern tokens would have an unfiltered route to the page. Runtime guard `crossStateBleedGuard.ts` also only has tokens for 5 of 16 states (no SächsBO/BbgBO/HBauO/etc.) — under-covering since Phase B made all 16 substantive.

### 3.4 State-blind citation→URL lookup (SAFE-BUT-FRAGILE)
`legalCitations.ts:116-124` `findCitation` takes no bundesland and maps `/baydschg|denkmalschutz/i` → hardcoded BayDSchG + `gesetze-bayern.de` URL (consumed at `LegalLandscapeTab.tsx:117`). Today the non-Bayern Domain-C labels are short tokens ("DSchG Bln", "ThürDSchG") that don't contain "denkmalschutz", so the matcher misses. It is one label-string change away from surfacing the Bavarian monument URL on every non-Bayern web brief. Fix: pass bundesland and gate the BayDSchG row to `bayern`.

**Ranked new suspected leak classes:** (1) inconsistent unknown-state fallbacks (§3.2) — top, because three sites disagree and one returns *substantive* foreign content; (2) un-bleed-guarded Area B + documents (§3.3); (3) state-blind `findCitation`→Bayern URL (§3.4); (4) `composeExecutiveRead` recognizing only BayBO/BayDSchG as the state token (`composeExecutiveRead.ts:366-395`) — a non-Bayern coverage gap + Bayern-normalization fragility.

---

## 4. Code-Path Coverage — what's actually been rendered

**Fixtures: 26 files; 24 PDF-rendered; 2 parsed-but-never-rendered** (`hamburg-t02-mfh.json`, `nrw-t05-bonn-verfahrensfrei.json` — consumed only by `smoke-architect-flow.mts` for text assertions). `smoke-walk-matrix.mjs` (Bayern T-04..T-08) asserts persona *legal-context text*, not a rendered PDF, so it does **not** count as render coverage.

### State × Template fixture coverage (✓ = fixture exists; cells with no fixture are unrendered)
| State | T-01 | T-02 | T-03 | T-04 | T-05 | T-06 | T-07 | T-08 |
|---|---|---|---|---|---|---|---|---|
| bayern | ✓×3 | — | ✓ | — | — | — | — | — |
| nrw | ✓ | — | ✓ | — | ✓×2 | — | — | — |
| hessen | ✓ | — | ✓ | — | — | — | — | — |
| sachsen | ✓ | — | — | ✓ | — | — | — | — |
| hamburg | ✓ | ✓(*not rendered*) | — | — | — | — | — | — |
| berlin | ✓×2 | — | — | — | — | — | — | — |
| bw, niedersachsen, brandenburg, thueringen, sachsen-anhalt, rlp, saarland, sh, mv, bremen | ✓ | — | — | — | — | — | — | — |

**31 of 128 cells fixtured; 97 EMPTY. T-06/T-07/T-08 have ZERO fixtures in every state, including Bayern.**

### Orthogonal-flag coverage
| Flag | Covered? | Fixture |
|---|---|---|
| verfahrensfrei | **NRW only** | nrw-t05-koeln/bonn |
| denkmalschutz=true | **Berlin only** (in fixtures) | berlin-t01-pariser-platz |
| eingriff_tragende_teile / eingriff_aussenhuelle | yes | berlin-pariser-platz, hessen-t03, nrw-t03, bayern-t03 |
| mk_gebietsart / bauvoranfrage_hard_blocker | **Berlin only** | berlin-t01-pariser-platz |
| ensembleschutz / grenzstaendig / sonderbau_scope | **ZERO** | none |

### Render-verification I added this turn (orchestrator harness, then deleted)
Rendered de+en and grepped for leak tokens / positives:
| Case | Result |
|---|---|
| Hessen T-03 renovation | ✓ no leak (renovation stub path) |
| Sachsen T-04 umnutzung | ✓ no cross-state leak ("Landesbauordnung Sachsen" present = Saxony's own law longhand, benign) |
| NRW T-05 abbruch / verfahrensfrei | ✓ no leak |
| Hamburg T-02 MFH (headline band) | ✓ no leak — band is state-neutral as rendered |
| Berlin / Sachsen / RLP **denkmal=true** | ✓ correct authority renders (LDA Berlin / LfD Sachsen / GDKE); no NBauO, no "§ 9" |
| Berlin T-06 / T-07 / T-08 (band) | ✓ no leak (state-neutral bands) |
| **RLP T-01 denkmal + RLP T-04** | ⚠ renders *"Detail-§ noch nicht hinterlegt…"* inline (corpus lacks RLP structural-cert/regular §) |

### Branch coverage gaps (resolveProcedure / requiredDocuments / cost routing)
- `resolveProcedure` **generic-standard STUB arm** (`:430-461`, `hasCitation=false`) is **dead under current fixtures** — all 16 states now have a non-empty regular citation, so the deferral-caveat path is never render-verified.
- `resolveNrwSanierung`: only the `eingriff_aussenhuelle`→§62 sub-branch is covered (nrw-t03). The denkmal/§65, eingriff_tragende/§64, aenderung_aeussere/§64, and §71-bauvoranfrage arms have **no fixture**.
- `requiredDocuments` abstandsflächen branch (`:277-302`) requires `grenzstaendig` (no fixture) or `fassadenflaeche>100` — the non-NRW `else` arm (`:287-290`) is likely **unrendered**.
- Cost headline-band arm (`exportPdf.ts:803-822`) is reached only by hamburg-t02, which is **not rendered** — and T-06/07/08 have no fixture, so this arm is essentially unverified end-to-end.

### Correction to a coverage-agent claim (render-arbitrated)
The coverage agent flagged `sachsen-t04`'s `denkmalschutz:"nicht bekannt an der Einheit"` as truthy → treated TRUE → would short-circuit to bauvoranfrage. **Wrong:** `factBool` (`exportPdf.ts:375-381`) is a strict allowlist (`true / 'true' / 'JA' / 'ja'`), so a free-text string → **false**. The render shows the intended umnutzung path, no bauvoranfrage. **Real residual:** the fixture sets a `sonderbau_trigger` key, but the resolver reads `sonderbau_scope` (`resolveProcedure.ts:120,168`) — so the intended Sonderbau short-circuit is silently bypassed (key-name mismatch). Worth a one-line check.

**Highest-risk uncovered paths to render before the demo:** (1) non-Bayern T-06/T-07/T-08 (zero fixtures, the only cost arm never rendered end-to-end); (2) non-Bayern/non-NRW denkmal=true for the *stub-ish* states (RLP especially — confirmed it renders a deferral string); (3) non-NRW verfahrensfrei; (4) Stadtstaat (cityBlock=null) under any non-T-01 template.

---

## 5. Corpus Integrity — drift & legal correctness

Both gates are **green and meaningless for correctness**: `verify:citations:strict` confirms every cited § *exists* in the corpus (19 laws, 229 distinct §§); `verify:corpus-pack` confirms the generated `.ts` matches the JSON (14 cit + 14 proc states). Neither validates concept→§ mapping or version currency.

**Source tiers (the systemic risk):** only **Bayern + NRW are primary-sourced**; Sachsen has 1 primary §; **13 of 16 states ride a single secondary mirror, `baunormenlexikon.de`** (`scripts/legal-corpus/_meta/unverified.json:28-32`). Every `fetched_at` is 2026-05-27 (one build session), so "freshness" by fetch-date is meaningless — the risk is the mirror's own `stand` and staleness.

**Confirmed defects behind the green gates (web-verified by the corpus agent; sources in appendix):**
| State | Defect | Location | Severity |
|---|---|---|---|
| **Thüringen** | §§ 67/72/74 are **pre-2024 numbering**; ThürBO-2024 renumbered to **64/65/67** (Bauvorlageberechtigung/Bautechn. Nachweise/Bauantrag). The mirror serves the old numbers under a "Fassung 2024-07" label. | `corpusCitations.generated.ts:124-126` | **BLOCKER** |
| **Niedersachsen** | `permitSubmissionCitation:'§ 65 NBauO'` — Bauvorlageberechtigung is **§ 53** (Entwurfsverfasser); § 65 is Bautechnische Nachweise (duplicates structuralCert). Hand-coded → no gate sees it. NEW finding (not in unverified.json). | `stateCitations.ts:158` | **HIGH** |
| **Baden-Württemberg** | `structuralCertCitation:'§ 73a'` = "Technische Baubestimmungen" not a structural cert (Standsicherheit = § 13); `§ 58` = the permit, not the form. | `stateCitations.ts:121,123` (flagged `unverified.json:39-40`) | **HIGH** |
| Hessen | `unverified.json:37-38` flags §49/§66 mis-maps; corpus overlay is supposed to auto-correct — confirm the **post-overlay** render for a Hessen demo. | overlay `stateCitations.ts:232-241` | MED |
| 13 mirror-only states | Single-mirror dependency; Thüringen proves it can be stale. RLP + Sachsen-Anhalt spot-checked **clean** despite mirror tier (reassuring). | `unverified.json:28-32` | MED (systemic) |

**Monument authorities (`stateCitations.ts:258-339`) spot-checked current and correct**, incl. Thüringen "Thüringer Landesamt… (TLDA)" (Sept-2025 rename landed). RLP `denkmalSchutzAct:'DSchG'` is **correct** (amtliche Abkürzung; DSchPflG is the legacy slug). BW + Niedersachsen are correctly absent from the corpus pack (hand-coded; `withCorpus` is a no-op for them).

**Re-verify before a licensed-architect demo, in order:** Thüringen (BLOCKER) → Niedersachsen § 53 → BW § 73a/§ 13 → Hessen post-overlay confirm → one primary-source pass for the remaining mirror states.

---

## 6. Architect Handoff Audit — the moat, traced

Verdicts reflect **current code** (HEAD), which is materially newer than `docs/V1_0_31_ARCHITECT_HANDOFF_AUDIT.md` / `docs/ARCHITECT_FLOW_DEADEND_TRACE.md` — several of those P0s are now closed in code (trust the code; the docs are stale).

| # | Step | Implementation (file:line) | Proof (file:line) | Verdict |
|---|---|---|---|---|
| 1 | Invite generation (owner mints token + `invited_email`) | `share-project/index.ts:198-295`; client `architectInviteApi.ts:131-160` | `smoke-architect-flow.mts:91-171`; `architect-e2e-smoke.mjs:270-292` | WORKS |
| 2 | Secure link delivery (copy-link, honest "no email") | `InviteArchitectModal.tsx:89-115`; CTA `ResultFooter.tsx:103-110` | none (UI-only) | WORKS |
| 3 | Architect lands on accept route | `AcceptInvite.tsx:34-150` | none | WORKS |
| 4 | Auto-promote to `designer` + **email-binding enforced** | promote `share-project/index.ts:458-468`; binding `:362-382` | `architect-e2e-smoke.mjs:294-321` — **binding path NOT exercised** | **PARTIAL** |
| 5 | Open project / owner "Preview as architect" | designer `VerificationPanel.tsx:65-78`; owner-preview `AcceptInvite.tsx:62-79` + `ArchitectGuard.tsx:41-50` | none | **PARTIAL** — no dedicated preview *button*; only via own invite link |
| 6 | Verify → one-time identity modal (name + chamber) | `VerificationPanel.tsx:128-161`, modal `:270-351` | none | WORKS |
| 7 | Persist name + chamber + verified state | verify-fact `index.ts:299-307`, mirror `:347-364` (cols `0036:28-30`) | `smoke-architect-flow.mts:222-236`; `architect-e2e-smoke.mjs:323-364` — **identity payload NOT sent** | **PARTIAL** |
| 8 | Optimistic lock (Bug 118) + erosion (Bug 117) | lock verify-fact `:248-252,315-341` (409); erosion `projectStateHelpers.ts:352-372,427+,519+,590+,658+` | erosion: facts only `smoke-architect-flow.mts:241-287`; lock: **none** | **PARTIAL** |
| 9 | Owner sees verified state ~real-time | `useVerificationReactivity.ts:27-69` (focus-poll + realtime); footer `VorlaeufigFooter.tsx:93-98` | none | WORKS (degraded to focus-poll unless 0035 applied) |
| 10 | PDF re-renders: Vorläufig clears + architect named in signature col | rollup `verificationRollup.ts:55-96`; footer `exportPdf.ts:1294-1310,1473-1478`; sig name `verification.ts:223-253` (clamped `:226`, Bug 60); cover gate `exportPdf.ts:1387,1395-1398` | `smoke-pdf-text.mts:971-1054,1062+` | WORKS |

**Migration 0037 — `UNVERIFIABLE-FROM-REPO`.** It is the *uncommitted working-tree change* in `git status`; its own header documents an apply-via-SQL-Editor + redeploy + replay procedure the repo cannot confirm ran; `MEMORY.md` flags "PENDING operator deploy." **To confirm:** run the `information_schema.columns` check at `0037:35-39`, then the Bug-114 replay at `0037:42-45` (bind to A; accept as B → expect 403; accept as A → 200; unbound legacy → accepts from anyone).

**Riskiest first-use gaps:**
1. **If 0037 is not applied in prod, invite creation HARD-FAILS.** The `invited_email` INSERT (`share-project/index.ts:265`) hits a missing column → persistence error → no invite can be created. This is the #1 demo-killer and it's a binary deploy-state question. **Verify before the demo.**
2. **The security binding (0037's whole purpose) is shipped-but-untested.** The prod UI now forces a bound email (`InviteArchitectModal.tsx:185`), but the 403-on-mismatch gate (`share-project/index.ts:369-382`) is exercised by **no** test (e2e sends an *unbound* invite).
3. **The live identity round-trip is unproven end-to-end.** The architect's name in the PDF (Bug 112) is tested only against a *hand-baked* `state.verification` fixture (`bayern-t01-muenchen-allverified.json:16-20`); the e2e verify-fact call sends **no identity** (`architect-e2e-smoke.mjs:341-345`). The chain modal→verify-fact stamp→rollup→PDF has never run end-to-end in any test.
4. **Owner "Preview as architect" has no button** (sole `?preview=1` producer is `AcceptInvite.tsx:76`).
5. **Invite CTA is hidden on mobile** (`ResultFooter.tsx:106` `hidden sm:inline-flex`; footer is `null` for shared recipients `:56`).
6. Optimistic lock + 4/5 erosion paths (recs/procedures/docs/roles) have **zero** test coverage; erosion only fires if **chat-turn is redeployed**, instant realtime only if **0035** is applied — both deploy-state the repo can't prove.

Net: the artifact is solid; the **exposure has shifted from "the PDF is hollow" to "the security binding + live stamp are unverified in prod, and 0037 may not be applied."**

---

## 7. Regression-Guard Coverage — adversarial

The matrix's *structural* checks (DE/EN parity, ligatures, page-count floor, stub framing) are sound. The *leak* guards are narrower than they read:

| Guard | file:line | What slips past (same bug class) |
|---|---|---|
| G3 — NBauO cross-state | `smoke-pdf-matrix.mts:295-298,433-441` | **NBauO is the ONLY state-code checked.** A future `else='§ 14 HBO'` / SächsBO / BbgBO leak into 15 states fires **no** guard. Highest-leverage hole. Fix: per-cell "no *other* state's LBO marker" check (the data exists in `stateCitations.ts`). |
| G4 — Bayern-leak tokens | `smoke-pdf-matrix.mts:186-204` | Misses `Nürnberg/Augsburg/Regensburg/Erlangen`, `Bayern/Bavaria/Freistaat`, adjectival `Münchner`, and `LHM`. **Four divergent copies** of this list exist (matrix:186, bleed:479, demoCells:1602, guard:32) and they disagree → false confidence. Fix: one shared constant. |
| G5 — cost-band leak | `smoke-pdf-matrix.mts:388-403` | Checks only T-02/06/07/08; T-01/T-03/T-05 bands still contain München/BayBO (dead today, §3.1). Flip the loop to all 8 templates → it goes red → forces the data clean. |
| G6 — DOUBLING_RX / dup-cite | `smoke-pdf-matrix.mts:416-446,306` | Anchored to two exact German phrasings + only `reasoning_de` + only neubau/umnutzung intents. EN doubling and other intents unchecked. |
| G7 — verify-citations | `verify-citations.mjs:148` | `if (!law) continue` — citations to laws not in the corpus (BayDSchG, HOAI, all adjacent acts) are silently skipped; only scans `src/legal/` (misses `src/data/`, `src/features/`). |
| G8 — citation-drift | `verify-citation-drift.mjs:96,30` | **Bayern-only**, and only scans `stateLocalization.ts` — misses `costNormsMuenchen.ts` (which literally contains BayBO), `resolveProcedure.ts`, etc. |
| G9 — crossStateBleedGuard (runtime) | `crossStateBleedGuard.ts:32-89` | Tokens for only 5 of 16 states; wired at **one** PDF site (`exportPdf.ts:663`) — never on the cost band, glossary, documents, or the **entire web surface**. |
| G10 — germanLeakGuard (runtime) | `germanLeakGuard.ts:25-93` | Threshold = 2 German tokens; a single-token German sentence on an EN export passes; denylist of ~30 words is inherently leaky. |

**Structural smell:** the **entire guard suite operates on `buildExportPdf` text — there is no test that renders or inspects the React web surface.** The web Cost tab, LegalLandscapeTab, and result tabs have neither a render-time sanitizer (G9 isn't wired there) nor a smoke gate. §3.4 and the F11 deferral both live in exactly that blind spot.

---

## 8. Build / Deploy Health

| Gate | Result (this session) |
|---|---|
| `prebuild` (verify:locales, hardcoded-de, legal-config, pdfstrings, citation-drift, corpus-pack, citations) | ✅ PASS |
| `verify:citations:strict` | ✅ PASS |
| `smoke:pdf-matrix` (16 states × 2 locales) | ✅ 16/16 PASS |
| `smoke:pdf-text` | ✅ 386 / 0 |
| `smoke:chat-ux` | ✅ 18 / 0 |
| `verify:bayern-sha` | ✅ MATCH `cdf3c625…f9daaf` (×3 during audit) |
| **`smoke:architect`** | ❌ **283 / 2 FAILED** |
| full `npm run build` (tsc + vite + bundle) | not run this turn (docs-only); CI runs it on push. Bundle per record ~287.7 KB gz vs 300 KB ceiling. |

**RED gate — `smoke:architect` (finding):** the 2 failures are `Sachsen T-01 de/en: Domain B honest stub label` (`smoke-architect-flow.mts:308-315`). The assertion expects Sachsen Domain B to carry a `/Landesbauordnung Sachsen/` **stub** label, but **Phase B made Sachsen substantive** (real SächsBO). The comment at `:308` still says "(stub)". It's a **stale assertion**, not a product regression.
**Why it went unnoticed:** `.github/workflows/test.yml` runs bayern-sha, build, pdf-text, pdf-matrix, citations, chat-ux — **but NOT `smoke:architect`.** So the architect-flow gate has been silently red since Phase B merged, and the architect-flow regression coverage **is not actually gating CI**. Two findings in one: update the assertion (Sachsen is substantive now) **and** wire `smoke:architect` into CI.

**Repo-vs-prod drift the repo cannot resolve (deploy-state):** migration 0037 (§6), migration 0035 (instant realtime), and chat-turn redeploy (erosion). All `UNVERIFIABLE-FROM-REPO`; `docs/HANDOFF.md` lists 0036 + verify-fact redeploy as pending and 0037 post-dates it.

---

## 9. Deferred-Bug Inventory — ranked at the architect-grade bar

Re-ranked for "an architect looks at this in a demo," not historical sprint priority. (Sources: `docs/phase-c-architect-tone/_FINDINGS.md`, per-state files, `HANDOFF.md`.) F1–F10/F16 verified closed in code; F4 (monument authorities) and F5 (denkmal authority city) confirmed closed by render (§3, §4).

| ID | Description | file:line | Severity (demo) | Closes by |
|---|---|---|---|---|
| **CORP-TH** | Thüringen §§ stale pre-2024 numbering (67/72/74 → 64/65/67) | `corpusCitations.generated.ts:124-126` | **BLOCKER** | Re-source ThürBO-2024 from primary (landesrecht.thueringen.de) + regen pack |
| **HANDOFF-0037** | If 0037 unapplied in prod → invite creation 500s | `share-project/index.ts:265` | **BLOCKER (prod)** | Apply 0037 + run replay (`0037:42-45`) |
| **CORP-NI** | NI permitSubmission § 65 → should be § 53 | `stateCitations.ts:158` | HIGH | Hand-fix + verify |
| **CORP-BW** | BW structuralCert § 73a (wrong concept); § 58 form | `stateCitations.ts:121,123` | HIGH | Hand-fix (§ 13 / correct form §) |
| **F11** | LegalLandscapeTab Brandschutz/Stellplatz/Baulasten/Denkmal snippets state-blind, web-only (no smoke) | `src/data/legalRuleSnippets.ts:206-237` | HIGH | Per-state text + web smoke |
| **RLP-STUB** | RLP renders "Detail-§ noch nicht hinterlegt…" inline (missing corpus structural/regular §) | `corpusCitations.generated.ts:88-93` | HIGH | Add RLP § 65/regular to corpus (item #3) |
| **HANDOFF-TEST** | Email-binding + live identity round-trip + optimistic lock + 4/5 erosion untested | §6 steps 4/7/8 | HIGH | Add e2e coverage with bound invite + identity payload |
| **F9** | Every state's procedure reason ends with the same stock hedge | `resolveProcedure.ts:440,443` | MED-HIGH | Tone re-author (item #3) |
| **F6** | Chamber name pure interpolation `Architektenkammer ${labelDe}` for 11 states | `stateLocalization.ts:360-361` | MED | Verified per-state names (ADJACENT_LAWS pattern) |
| **F12 / F15 / F14** | Templated role-qual phrasing / glossary header-vs-body mismatch / Stadtarchiv city mismatch | roleEffortLookup.ts:55; glossary.ts:155-162; stateCitations.ts:47 | MED–LOW | Tone pass / reconcile labels |
| **GAP-1** | T-01/T-03/T-05 cost bands carry München/BayBO (dead, unguarded) | `costNormsMuenchen.ts:439,455,474` | LOW (latent) | State-neutral strings + widen G5 loop |
| **NULL-FALLBACK** | 3 inconsistent unknown-state defaults (Bayern/nrw/bayern), masked by NOT NULL | stateLocalization.ts:479; exportPdf.ts:398,665; resolveDocuments.ts:83 | LOW (latent) | Honest-stub fallback everywhere |

---

## 10. Phase-by-Phase Path to All 16 × 8 Architect-Grade

Honest dependencies; no "we'll figure it out." Wall-clock assumes the established 3-commit-with-gates cadence.

**Sprint D1 — Legal-correctness blockers (do first; everything else trusts the corpus).**
- Goal: every rendered § is the *current, correct* §.
- Scope: re-source Thüringen ThürBO-2024 from primary → regen pack (CORP-TH); hand-fix NI § 53 (CORP-NI) and BW § 73a/§ 13 + form § (CORP-BW); confirm Hessen post-overlay render; one primary-source confirmation pass for the 13 mirror states (prioritize recently-reformed: RLP, Saarland, Hessen, BW, SH).
- Exit: a per-state "primary-source verified" ledger; `unverified.json` empty or each entry justified; a new **concept→§ correctness** check (even a manual checklist) added so this can't silently regress.
- Depends on: nothing. **Risk:** primary portals are JS shells / CAPTCHA-walled (Thüringen) — budget manual PDF fetches. **Est: 3–5 days.**

**Sprint D2 — Architect-handoff prod-verify + test coverage (the moat).**
- Goal: prove the moat works in prod and lock it with tests.
- Scope: apply + replay-test 0037 (HANDOFF-0037); add e2e coverage for the email-binding 403, the live identity round-trip (modal→verify-fact→rollup→PDF), the optimistic-lock 409, and recs/procedures/docs/roles erosion; add the owner "Preview as architect" button; unhide the mobile invite CTA; **wire `smoke:architect` into CI** and fix the stale Sachsen assertion.
- Exit: a real bound invite → accept-as-wrong-email → 403; accept-as-right → verified PDF names the architect, end-to-end, in CI.
- Depends on: operator access to prod Supabase. **Risk:** deploy-state (0035/chat-turn) confounds realtime/erosion testing. **Est: 3–4 days.**

**Sprint D3 — Coverage + guard hardening (close the blind spots that hid these bugs).**
- Goal: render-verify the 97 empty cells' representative paths; make the guards catch the classes they currently miss.
- Scope: fixtures for T-06/T-07/T-08 (zero today) × ≥3 states; non-NRW verfahrensfrei; non-Berlin denkmal; Stadtstaat non-T-01. Generalize G3 to all 16 LBO markers; unify the 4 Bayern-token lists; widen G5 to all templates; **add a web-surface render/smoke gate** (the entire suite is PDF-only today). RLP corpus fill (RLP-STUB).
- Exit: a coverage matrix with no high-risk EMPTY cell; guards that fail on a synthetic SächsBO-into-Berlin leak.
- Depends on: D1 (so fixtures assert correct §§). **Risk:** web-surface testing needs a React render harness that doesn't exist yet. **Est: 4–6 days.**

**Sprint D4 — Tone / boilerplate pass (item #3 + F9/F6/F12/F15/F14).**
- Goal: prose reads architect-authored, not machine-stamped, across all 16.
- Scope: the deferred F-items; per-state chamber names; reconcile glossary header/body.
- Exit: a German-speaking architect reads three random state briefs without flagging templated phrasing.
- Depends on: D1 (correct §§ to write around). **Est: 3–4 days.**

**Sprint D5 — Cost calibration (item #4, the biggest, deliberately last).**
- Goal: per-state cost realism (not München-tuned numbers for all 16).
- Scope: Destatis/BKI per-state factors into `REGION_MULT` (today only `bayern:1.0`); state-neutral T-01/T-03/T-05 band strings (GAP-1); per-template breakdowns to retire the headline-band stubs.
- Exit: a Berlin EFH and a München EFH show defensibly different ranges with sourced bases.
- Depends on: nothing technical, but it's a content/data-sourcing project. **Risk:** no sourced per-state BKI exists yet — this is research-bound. **Est: 1–2 weeks.**

---

## 11. Recommended Next Sprint

**Sprint D1 — Legal-correctness blockers** (above). It is small (≈4 state fixes + a verification pass), it unblocks everything downstream (every other sprint trusts the corpus), and its exit criterion is checkable by a non-engineer: *"For each of the 16 states, here is the official source URL and the matching § our PDF prints."* Pair it with the binary **"is 0037 applied in prod?"** check (one SQL query) because that's a same-cost demo-killer. Do **not** start with another leak hunt — that class is already defended (§3).

---

## 12. Risks, Unknowns, Open Questions

| Open question | Next action |
|---|---|
| Is migration 0037 applied in prod? (invite creation hard-fails if not) | Run `information_schema.columns` check (`0037:35-39`) in Supabase SQL Editor. |
| Are 0035 (realtime) + the chat-turn redeploy (erosion) live? | Operator confirms deploy-state; until then realtime = focus-poll, erosion may not fire. |
| Exact Thüringen ThürBO-2024 §§ for structuralCert/permitForm (§ 65/§ 67 headings) | Primary fetch from `landesrecht.thueringen.de/bsth/document/jlr-BauOTH2024pIVZ` (§ 64 anchor is HIGH-confidence; § 65/§ 67 need heading confirmation). |
| Do the 13 mirror-only states match current law? (RLP + SA spot-checked clean) | One primary-source pass each; prioritize recently-reformed states. |
| Does any code path write a non-canonical (non-16) bundesland string? | Audit the wizard write path; if guaranteed canonical, NULL-FALLBACK stays latent. |
| Full `vite build` + bundle size at HEAD | Run `npm run build` (not run this docs-only turn). |
| Web-surface correctness (LegalLandscapeTab/CostTab) | No render harness exists; F11 + §3.4 live here untested. |

---

## 13. Where I (Claude Code) Disagree With This Prompt

Zero disagreements would be suspicious. Here are the real ones:

1. **The prompt's central thesis — "find the next NBauO-class leak before production does" — pointed at the wrong target.** The cross-state citation-leak class is the *best-defended* part of this codebase (matrix + static F-guards + runtime sanitizers + my renders all agree). Optimizing the audit around it nearly produced a **false positive** (GAP-1, which a sub-agent confidently called "live" — render falsified it). The actual top risks are things grep can't find: **legal correctness** (Thüringen/BW/NI — needs source verification, not pattern-matching) and **the architect-handoff prod path** (needs a deploy check + e2e tests). The "leak pattern" framing is real history but it's fighting the last war.

2. **"All 16 × 8 production-ready" is a false-economy frame.** Citation correctness is per-**state** (the 8 templates reuse the same § pack), so the real unit is ~16 state legal-verifications + ~5 distinct template render paths — not 128 cells. Worse, the implicit equation "corpus-backed (substantive) = correct" is false: Thüringen is substantive *and wrong*; RLP is substantive *and renders a deferral string*. Counting open cells as a progress metric (31/128) flatters and misleads. Track **verified-correct states** and **render-verified paths** instead.

3. **"Render verification beats code reading" is exactly right — and the codebase under-applies its own principle.** It caught two sub-agent errors this turn (GAP-1; the sachsen-t04 truthiness claim). The implication the prompt doesn't draw: the *entire* guard suite is PDF-only, so the **web surface has no render verification at all** — which is precisely where F11 and the `findCitation`→Bayern-URL fragility hide. The fix isn't more grep; it's a web render gate.

4. **Scope nit:** the prompt forbids "code changes outside the report" yet demands render verification of uncovered paths. Rendering *requires* a throwaway runner. I wrote one in `scripts/`, used it, and deleted it; the working tree is clean (only the pre-existing 0037 whitespace change remains, which is **not mine** — flagging it rather than committing it). If a future audit wants reproducible renders, a committed `scripts/audit-render.mts` would be worth the one-time exception.

---

## 14. Appendices

### A. Files read (primary)
`src/legal/{requiredDocuments,resolveProcedure,stateCitations,stateLocalization,corpusCitations.generated,compose,crossStateBleedGuard,germanLeakGuard,legalCitations}.ts`; `src/features/result/lib/{costNormsMuenchen,resolveDocuments,deriveBaselineProcedure,humanizeFact,composeExecutiveRead,legalCitations}.ts` + `src/data/legalRuleSnippets.ts`; `src/features/result/components/tabs/{CostTimelineTab,LegalLandscapeTab}.tsx`; `src/features/chat/lib/exportPdf.ts` (cost routing, procedureCase, verification); architect: `AcceptInvite.tsx`, `VerificationPanel.tsx`, `InviteArchitectModal.tsx`, `ResultFooter.tsx`, `useVerificationReactivity.ts`, `verificationRollup.ts`, `supabase/functions/{share-project,verify-fact}/index.ts`; scripts: `smoke-pdf-matrix.mts`, `smoke-pdf-text.mts`, `smoke-architect-flow.mts`, `verify-citations.mjs`, `verify-citation-drift.mjs`, `lib/bayernSha.mjs`; `scripts/legal-corpus/_meta/{sources,unverified,coverage-matrix}.json`; `supabase/migrations/{0003,0037}…`; `.github/workflows/test.yml`; `docs/phase-c-architect-tone/_FINDINGS.md`.

### B. Commits reviewed
HEAD `92b08a3` and the phase-c chain `5cdee26 / d3f98f6 / 05c3547 / 1bdd9d3 / 60245f9`; phase-b `d360266 / 5d68e7f / 3b4d914 / e32f48d`; phase-a `a5135cf / 7eb7922`; phase-2 `7f681b3 / c887bf2` (Bayern SHA re-baselines); `1afaaec` (de-München T-02/T-06).

### C. Render outputs (orchestrator harness, summarized — raw scanner output in chat transcript)
12 render cases, de+en. All clean except: RLP T-01-denkmal + RLP T-04 render the honest deferral "Detail-§ noch nicht hinterlegt…" inline (expected given missing RLP corpus fields). Denkmal authority positives confirmed: Berlin "Landesdenkmalamt Berlin", Sachsen "Landesamt für Denkmalpflege Sachsen", RLP "Generaldirektion Kulturelles Erbe". No München/BayBO/NBauO/§9/doubling in any non-Bayern case. `smoke:pdf-matrix` 16/16; `smoke:pdf-text` 386/0.

### D. Glossary (German legal/technical terms used)
- **Bauantrag** — building-permit application. **BauO / LBO / BayBO / NBauO / SächsBO / ThürBO / HBO / BbgBO …** — the state building codes (Landesbauordnungen); each state's own short name.
- **Bauvorlageberechtigung** — entitlement to submit permit documents (who may sign). **Bauvorlagenverordnung (BauVorlVO)** — ordinance listing required submission documents.
- **Verfahrensfrei** — permit-free (no application). **Genehmigungsfreistellung** — notification-only. **Vereinfachtes / reguläres Baugenehmigungsverfahren** — simplified / standard permit procedure. **Bauvoranfrage / Vorbescheid** — preliminary inquiry.
- **Denkmalschutz / Denkmalschutzgesetz (DSchG)** — monument protection / its act. **Ensembleschutz** — protection of a building ensemble. Monument authorities: **BLfD** (Bayern), **GDKE** (RLP), **BLDAM** (Brandenburg), **LAKD M-V**, **TLDA** (Thüringen), **LDA** (Berlin).
- **Standsicherheitsnachweis** — structural-stability certificate. **Brandschutznachweis** — fire-protection certificate. **GEG** — Gebäudeenergiegesetz (building energy act); **Wärmeschutznachweis** — thermal-insulation cert. **Abstandsflächen** — setback areas. **Schallschutz (DIN 4109)** — sound insulation.
- **Sonderbau** — special building class with its own procedure. **Gebäudeklasse (GK 1–5)** — building class. **HOAI** — fee schedule for architects/engineers. **Honorarzone** — HOAI complexity zone. **Vorläufig** — provisional (the pre-verification PDF footer). **Stadtstaat** — city-state (Berlin/Hamburg/Bremen; `cityBlock=null` render path).
