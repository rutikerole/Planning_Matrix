# V1.0.33 Phase 2 Strategic Plan

> Author: strategic audit pass, branch `docs/phase-2-strategic-plan`, HEAD = **v1.0.32.5** (`14f9969`).
> Bayern composed-prefix SHA `b18d3f7f9a6fe238c18cec5361d30ea3a547e46b1ef2b16a1e74c533aacb3471` — **MATCH confirmed** before and intended to match after (this branch writes one docs file; no constitutional file touched).
> Evidence base: 5 parallel read-only agents (A strategic context, B pipeline root, C data layer, D deferred bugs, E surface area). Every architectural claim carries a `file:line`. Where a file could not be read or a number could not be derived, it says so explicitly.
> **This document is written to be uncomfortable. If you finish it feeling validated, it failed.**

---

## 0. Executive verdict

**The single highest-leverage next move is not new templates and not the parametric refactor — it is to make the three things you already sell actually survive scrutiny: close the live unbound-token verify exposure (Bug 114, made *worse* by v1.0.32.3), stop the cost engine from emitting identical München new-build numbers for every non-EFH project (`costNormsMuenchen.ts:185` has no template term at all), and get *one real architect* to verify *one real project* end-to-end (production count today: zero).** Everything in your prompt is framed around expanding the matrix (templates × states), but the matrix is not your risk — your risk is that the demo works and the technical/security due diligence in a Series A conversation does not. **Spend Phase 2 hardening the 15 cells the honesty gate already permits and the one feature you call a moat, not unlocking cells nobody has validated and templates that were never actually locked.**

---

## 1. What changed since `V1_0_30_STRATEGIC_RESEARCH.md`

Only the facts that materially move the recommended path are listed. The v1.0.30 doc recommended, in order: (1) vertical slice on 3 demo cells, (2) two cheap free-data integrations (statute XML + Destatis), (3) parametric refactor *only if the demo lands* (`V1_0_30_STRATEGIC_RESEARCH.md:176-200`; statute XML "single highest-leverage move" `:181`; parametric "once, only if the demo justifies expansion" `:184,197`).

1. **The slice shipped; the data integration did not.** v1.0.31 executed the vertical slice and went 12/12 on the MUST checks for the 3 demo cells (`V1_0_31_PDF_SLICE_DIAGNOSIS.md:10-16`, checks `:22-40`). But **every release since (v1.0.32 → v1.0.32.5) was architect-flow / UX / dashboard / styling** (`CHANGELOG.md:3-149`). The "single highest-leverage move" — statute XML grounding — **was never started.** It was displaced by an unplanned P0 sprint (next point).

2. **The moat was found hollow and had to be emergency-rebuilt.** The v1.0.30 doc treated the architect-verify shield as a strength "we got right" (`V1_0_30_STRATEGIC_RESEARCH.md:82,91`). An audit then found the *verified* PDF still printed VORLÄUFIG with a blank signature on every page — "the verified artifact is the hard 20% that is the entire point, and it's hollow" — forcing the entire v1.0.32 P0 sprint (Bugs 110-113/127/129-131, `CHANGELOG.md:140-149`). **That audit doc (`V1_0_31_ARCHITECT_HANDOFF_AUDIT.md`) does not exist on `main`** — it lives only on the unmerged branch `audit/v1.0.31-architect-handoff` (`823daad`); `main` references it but cannot show it (Agent D; `CHANGELOG.md:143`). The single source of truth for Bugs 114/116/117/118 + the E1-E24 matrix is off-tree.

3. **"Frozen templates need authoring" is false.** The v1.0.30 doc's root-cause framing — template-blind pipeline → parametric fix — is correct about the *engines*, but the common reading ("T-02/T-04/T-06/T-07/T-08 are unfinished") is wrong. All 8 template files are fully authored with distinct § chains (Agent E; §2.2 below). The data exists. What's missing is structured *numeric* parameters in the cost/timeline engines, not prose.

4. **The traction premise behind your prompt does not exist in evidence.** No "48 active projects" anywhere (Agent A). The real probe: 51 projects, 46 Bayern, and **0 architect verifications / 0 project_members / 0 file uploads** in production (`FULL_GERMANY_AUDIT.md:13-24`). The strategic claim "real user data now changes the sequencing" rests on data that has not been shown to exist.

5. **The wrong-§ risk is concentrated, not diffuse.** The v1.0.30 motivation for statute XML cited "5 wrong §§ in Hessen" (`V1_0_30_STRATEGIC_RESEARCH.md:98`), but the 5 substantive states now cite verified §§ with provenance (NRW header documents correcting 7 wrong stub §§ against recht.nrw.de — `nrw.ts:16-37`). The §-error risk lives almost entirely in the **11 stub states** (which emit *no* real §§ — `allowedCitations: []`, `brandenburg.ts:42`, `saarland.ts:42`). This **moves statute XML from "Phase 2, before the demo" to "Phase 3, paired with stub authoring"** (§5).

---

## 2. Architecture audit findings

### 2.1 The pipeline is template-blind in its numeric engines (VERDICT: confirmed, with nuance)

- `exportPdf.ts` is one linear synchronous pipeline (`exportPdf.ts:194`). `templateId` reaches it in **4 places, 2 cosmetic**: cover label string (`:261`), `intentFromTemplate` conversion (`:396`), area-fact key selection (`costNormsMuenchen.ts:335`), and one T-04 GK-row wording (`:1145`) (Agent B).
- **The templates carry no structured render data.** T-01..T-08 are **LLM system-prompt string constants** consumed only by the chat Edge Function (`getTemplateBlock`, `templates/index.ts:41`). They are **never imported by `exportPdf.ts` or any engine.** So `templateId` *cannot* structurally parametrize the PDF today — the rich legal content the persona uses in chat is invisible to the deterministic deliverable (Agent B). **This is the central architectural fact of the whole product** (see §8).
- **Correction to your prompt:** line `717` is a cost row (`range: formatEurRange(costBreakdown.energieberatung…)`); `isDemolition` is at `:731`, one of three intent branches: `:731` abbruch, `:739` umnutzung, `:747` sanierung. All three route to **honest empty cost stubs**; everything else (T-01 EFH, T-02 MFH, T-06 Aufstockung, T-07 Anbau, T-08 Sonstiges) falls through to the **identical HOAI new-build cost table** (`:781-788`).
- **The cost engine has no template/intent term at all.** `buildCostBreakdown` (`costNormsMuenchen.ts:185`) computes `BASE × PROCEDURE_MULT × KLASSE_MULT × ZONE_MULT × areaFactor × region` (`:216`) — no template variable anywhere. It is explicitly **heuristic, not a normative HOAI calculator** (`costNormsMuenchen.ts:11`; corroborated `PROD_READINESS_AUDIT_v1.0.3.md`). So T-01, T-02, T-06, T-07, T-08 produce the **same cost numbers for the same area** — the "identical-cost smell" (Bug 35).
- **The timeline is binary.** `verfahrensfrei-demolition` phase set vs a single hardcoded 24-week `DEFAULT_TIMELINE_PHASES` for everything else (`timeline.ts:79`, gated `exportPdf.ts:804,818-824`). The file header itself says per-template parameterization is "v1.0.17+ work" (`timeline.ts`, Agent B).
- **All 12 PDF sections are pure renderers** (`pdfSections/*.ts`); only the **costs** and **timeline** data *feeds* carry real divergence, and only for the 3 intent stubs + demolition timeline (Agent B). Risk and the `composeTimeline` engine are not even called by `exportPdf` (Agent B) — they feed the web result page only.

### 2.2 The templates are authored; the freeze is a UI gate

- Grep of `src/legal/templates/` returns **no** "TODO"/"Coming soon"/"stub"/"placeholder" — only the identical `// Reviewed by Bayern-zertifizierter Architekt: ☐ pending` sign-off comment on every file *including the 3 working ones* (Agent E).
- Distinct § chains, fully authored: T-02 adds Art. 2 Abs. 3/4, Art. 62, DIN 4109 (`t02-neubau-mfh.ts:161-176`); **T-04 is anchored on Art. 57 Abs. 4 + BauNVO §§1-11 + §31 Abs. 2** — none of which T-01 has (`t04-umnutzung.ts:179-196`); **T-06 on Art. 46 Abs. 6 + Art. 81 Abs. 1 Nr. 4b** (`t06-aufstockung.ts:196-219`); T-07 on Art. 57 Abs. 1 Nr. 1a (75 m³) (`t07-anbau.ts:176-200`); T-08 multi-anchor by sub-category (`t08-sonstiges.ts:184-207`).
- The freeze: `PDF_DEMO_TEMPLATE_IDS = ['T-01','T-03','T-05']` (`demoCoverage.ts:20`), gate `isPdfDemoReady(templateId, bundesland)` (`:39-48`), consumed in both `ExportMenu.tsx` (`result/...:61,92,211`; `chat/...:81,388-401`). `buildExportPdf` itself is untouched (`demoCoverage.ts:11-13`). The "Coming soon" pill is i18n key `frozenTemplate` (`locales/{de,en}.json:466`).

### 2.3 The data layer: 5 real states, 11 stubs, MBO fallback

- `StateDelta` (`states/_types.ts:47-92`): 7 required fields; `cityBlock` is non-null only for Bayern. **No `isStub`/`inPreparation` field on the interface** (Agent C). Substantiveness is flagged in three parallel places: `buildAntiBayernLeakBlock({isSubstantive})` (`_antiBayernLeak.ts:27-39`), `StateCitationPack.isSubstantive` (`stateCitations.ts:59-61`, the canonical flag), and `demoCoverage.isSubstantiveBundesland` (`:23-28`).
- Substantive: Bayern, NRW (374 lines, 26 citations `nrw.ts:336-364`), Hessen (461), BW (411), Niedersachsen (344). Stubs: the other 11, ~42 lines each, `allowedCitations: []`, citing only real LBO short-names and the "§ wie Bundesrecht" marker (Agent C). Each stub carries an explicit `MBO als Referenzrahmen … nicht belastbar` disclaimer (`brandenburg.ts:21-31`, `saarland.ts:21-31`).
- **Unknown/empty `bundesland` falls back to `BAYERN_DELTA` silently** (`legalRegistry.ts:106-109`). Combined with §2.1's München-calibrated cost engine, a misrouted project gets Bayern legal frame + München costs.
- Facts: `Fact { key: string; … }` — **`key` is a free-form string, not an enum** (`projectState.ts:69-75`; tool boundary `toolSchema.ts:140-149`). De-facto vocabulary ≈ 30 curated keys in `humanizeFact.ts`; unknown keys tokenize via `algorithmicLabel()`. Facts live in `projects.state` JSONB, **not** their own table (Agent C) — which is why the optimistic lock is project-level (§2.4).
- Migrations 0033-0036: `0033` adds `state_version` + bump trigger (the optimistic-lock infra); `0034` one-off München-city cleanup; `0035` realtime publication; `0036` adds self-attested `architect_name/chamber_no/chamber_state` to `project_members`, denormalized into `projects.state.verification` for the PDF — **self-attested, not chamber-audited** (`0036` header; Agent C).

### 2.4 What I could not read / could not derive (no fabrication)

- **`docs/V1_0_31_ARCHITECT_HANDOFF_AUDIT.md` is not on `main`** — recovered from branch `audit/v1.0.31-architect-handoff` (`823daad`) by Agent D. Bug 114/116/117/118 + E1-E24 definitions exist only there.
- **Current gzipped bundle size cannot be derived from source** — it is computed at build time from `dist/assets/index-*.js`, which is not committed. The only in-repo numbers are the **300 KB ceiling** and **280 KB target** (`verify-bundle-size.mjs:21,13`). MEMORY records ~284 KB at v1.0.30; I cannot confirm a current number (Agent B).
- `src/legal/states/index.ts` does not exist; the registry is `legalRegistry.ts` (Agent C).
- `verify-fact/index.ts` line numbers cited by the off-tree audit are stale; Agent D verified *behavior* against live code instead of trusting them.
- Agents read hessen/niedersachsen/bw bodies partially (headers + metric greps); line/citation counts are measured, structure inferred from full reads of nrw.ts/bw.ts.

---

## 3. The 500+ surface map

**Arithmetic (Agent E, each factor cited):** 8 templates (`templates/index.ts:24-33`) × 16 states (`_types.ts:29-45`) × 2 languages (`i18n.ts:13`) × (6 web tabs `ResultTabs.tsx:31-41` + 1 PDF) =

```
8 × 16 × 2 × 7 = 1,792 surfaces
```

"500+" is not just confirmed — it is a **3.5× undercount.** Web-only floor (no PDF): 1,536. The 7th "expert" tab (`useTabState.ts:13-19,43`) is owner-gated and excluded.

**Status of the PDF surface today:**

| Band | Definition | Count |
|---|---|---|
| 🟢 GREEN — gate-permitted PDF | template ∈ {T-01,T-03,T-05} **AND** substantive state (`demoCoverage.ts:39-48`) | 3 × 5 = **15 cells** (×2 lang = 30 surfaces) |
| 🟢 …of which **actually validated** (12/12 MUST) | T-01×Bayern München, T-05×NRW Köln, T-03×Hessen Frankfurt (`V1_0_31_PDF_SLICE_DIAGNOSIS.md:10-16`) | **3 cells** |
| 🟡 gate-permitted but **never smoke-walked** | the other 12 of the 15 (e.g. T-01×NRW, T-03×Bayern) | **12 cells** |
| 🟡 chat works, PDF gated off | 5 frozen templates × any state — persona is template-aware via prompt, PDF blocked | bulk of matrix |
| 🔴 stub legal content | 11 stub states emit MBO-default placeholders + honesty banner | 11 states × 8 templates |

**The uncomfortable cell here:** the honesty gate ships **15 cells** but only **3 are validated.** `isPdfDemoReady` keys on template + bundesland only — no city, no smoke-walk record. **A user can today export a "demo-ready" PDF for T-01×NRW or T-03×BW that no one has ever checked against the 12 MUST checks.** That is a 5× gap between *ship-allowed* and *ship-verified*, and it is invisible in the UI.

**Per-template × per-state complexity (PDF deliverable):**

| | Bayern | NRW | Hessen | BW | Nds | 11 stubs |
|---|---|---|---|---|---|---|
| **T-01** EFH | 🟢 validated | 🟡 allowed | 🟡 allowed | 🟡 allowed | 🟡 allowed | 🔴 MBO |
| **T-03** Sanierung | 🟡 allowed | 🟡 allowed | 🟢 validated | 🟡 allowed | 🟡 allowed | 🔴 MBO |
| **T-05** Abbruch | 🟡 allowed | 🟢 validated | 🟡 allowed | 🟡 allowed | 🟡 allowed | 🔴 MBO |
| **T-02/04/06/07/08** | 🟠 chat-only; cost=EFH-lie, timeline=24wk default | same | same | same | same | 🔴 MBO + cost-lie |

🟠 = template prose correct in chat, but PDF cost is the identical EFH number (`costNormsMuenchen.ts:185`) and timeline is the 24-week default (`timeline.ts:79`).

---

## 4. The parametric refactor: go or no-go

### VERDICT: **NO-GO as framed.** The hypothesis "thread `templateProfile` → close 5 templates in one sprint" is built on two false assumptions and one unmeasured risk.

**Assumption 1 (false): the 5 templates need unlocking.** They are authored (§2.2). Removing the `demoCoverage` gate alone would "unlock" them in chat instantly — at the cost of shipping PDFs with the EFH cost lie and default timeline.

**Assumption 2 (false): threading a param closes the legal logic.** `templateProfile` is not where the legal logic lives. The §-chains live in **LLM prompt strings** (`templates/index.ts:41`) that the PDF engines never read. The cost engine has **no template term to thread into** — it would need *new structured numeric parameters authored per template* (per-template BASE, multipliers, phase durations) that **do not exist anywhere structured today.** T-05 (demolition) is the proof you asked for: it could not reuse T-01's logic — it needed its own `VERFAHRENSFREI_DEMOLITION_PHASES` (`timeline.ts:114`) and its own honest-empty cost stub. T-04 (Art. 57 Abs. 4) and T-06 (Art. 46 Abs. 6 + Art. 81) have *different authority chains* (`t04-umnutzung.ts:179-196`, `t06-aufstockung.ts:196-219`); threading a profile would make the **cost number different while leaving the procedure/document logic keyed off `intent` only** (`resolveProcedure.ts` has real logic only for NRW-Sanierung `:454`; everything else → generic `'standard'` stub `:430`). You would ship *different-but-still-wrong* numbers — arguably worse than the honest-empty stub, because a plausible wrong number reads as authoritative.

**Unmeasured risk: the 12 MUST checks.** A parametric engine emits cells no one has smoke-walked. The honesty gate already permits 12 unvalidated cells (§3); parametric expansion multiplies that. The MUST checks are not automated against coordinates — the smoke harness asserts **text presence only** (`smoke-pdf-text.mts:358-374`), so a parametric template can pass the gate and still produce a broken layout (Bug 78, §6).

**Bundle impact: real but unmeasurable from source.** Lifting prose into structured client-side cost/timeline tables *adds* to the entry chunk. Ceiling 300 KB, target 280, last-known ~284 (`verify-bundle-size.mjs:21,13`; MEMORY). I cannot give a number — there is no committed size manifest (§2.4). A parametric refactor near a 284/300 ceiling is a live risk that must be gated by `verify:bundle`, not assumed away.

### What replaces it

A two-track replacement, neither of which is "one sprint":

- **Cheap track (ships honesty):** for the 4 fall-through templates, route the cost/timeline to **honest-empty stubs like T-03/T-05 already do** (`exportPdf.ts:739-747`). This removes the EFH cost *lie* without authoring numbers. Low effort, low value, but defensible.
- **Real track (ships value):** author **structured per-template cost bases + phase durations** as data (the prose to source them from exists in the template files; the *verified numeric* values do not and must be authored + sourced — see §5 Destatis). This is the genuine parametric work, and it is **the data-authoring grind the v1.0.30 doc estimated at 5-8 sprints for the full matrix** (`V1_0_30_STRATEGIC_RESEARCH.md:155`), not a refactor.

---

## 5. Data integration sequencing

### Statute XML grounding (gesetze-im-internet.de): **Phase 3, not Phase 2.**

Evidence, not preference:
- The 5 substantive states already cite **verified** §§ with provenance (`nrw.ts:16-37` documents correcting 7 wrong stub §§ against the official PDF). For the demo cells, XML grounding is **preventive, not corrective** — there is no evidence of wrong §§ in the production demo cells.
- The §-error exposure is concentrated in the **11 stub states** (`allowedCitations: []` — they emit no real §§ to be wrong). XML grounding's value is realized **at the moment you author a stub state**, not before.
- Therefore it belongs **with stub-state authoring (Phase 3)**, as the verification backbone for that work — exactly where its leverage is highest. Shipping it in Phase 2 (no stub authoring happening) would be infrastructure with no consumer.
- Realistic path (confirmed against history): **build-time corpus ingest + citation validation**, NOT runtime fetch — Phase 12 already found live permalinks 404 (`V1_0_30_STRATEGIC_RESEARCH.md:50,181` overturns the live-fetch decision but keeps the corpus-download path). Download official XML for BauGB/BauNVO/GEG + per-state LBO once, index, assert every authored citation resolves.

### Destatis Baupreisindex (GENESIS table 61261, free REST/JSON): **Phase 2 candidate — it fixes a live wrongness.**

- Unlike statute XML, this is **corrective today.** The cost engine emits identical München new-build numbers for every non-demolition template (`costNormsMuenchen.ts:185`, no template term) and is explicitly heuristic (`:11`). That wrong number ships on **every** PDF right now, including the 3 validated cells.
- Free, no registration, REST/JSON since the 2025-07-15 SOAP retirement (`V1_0_30_STRATEGIC_RESEARCH.md:182`). Low-medium effort.
- **But:** Destatis gives you a regional *index*, not per-template cost bases. It cures the "identical across regions" smell, not the "identical across templates" one. It is necessary-not-sufficient for §4's real track. Sequence it **alongside** the per-template cost-base authoring, not as a substitute.
- **Do not touch BKI / Architektenkammer tables** (paid, no API, copyright-encumbered — `V1_0_30_STRATEGIC_RESEARCH.md:65,196`). That verdict stands.

---

## 6. Deferred bugs: triage

Severities are my own evidence-based calls (Agent D). "Blocks Phase 2" = blocks the recommended hardening work, not the abandoned expansion framing.

| Bug | What it is | Severity | Blocks Phase 2? | Fix size |
|---|---|---|---|---|
| **114** unbound invite token | `project_members` has **no `invited_email` column** (`0026`); accept keys on `invite_token` only; v1.0.32.3 **removed** the designer-precondition and **auto-promotes any token-bearer to designer** (`share-project` handleAccept; `CHANGELOG.md:50-79`); modal email field is decorative (POST body = `{action,projectId}` only, `architectInviteApi.ts:147`). | **P1 — live security exposure** (should be P0 for any Series A security DD) | No — parallel, self-contained Edge Fn + 1 migration | **3-5 hrs** |
| **118** verify-fact race | The optimistic-lock infra **exists and is live** (`0033` `state_version` + bump trigger) but **verify-fact does not use it** — reads `id,state` only, writes blind `.update({state}).eq('id')`. The `0033` header *claims* verify-fact guards on `state_version`; the code does not. Last-write-wins between two architects / architect vs owner chat-turn (E11). | **P1** | No — parallel, Edge Fn only | **2-4 hrs** (design already spec'd in `0033` header) |
| **78** multi-page Key Data | `keyData.ts:138-233` is a flat `forEach` with no bottom-margin check / no `addPage`. Overflows ~17 rows. Demo cells fit (10/14/13). **Bites the moment any rich-fact template/state un-freezes.** | **P1 (latent)** | **Yes** — blocks any template/state expansion | **6-10 hrs** |
| **60** signature collision | Original Bauherr co-signature overlap is **code-fixed** (anchored at measured `bauherrField.endY-14`, `verification.ts:285-301`) but **never visually confirmed** — smoke checks text presence only (`smoke-pdf-text.mts:358-374`), no PNG/PDF snapshot in repo. **NEW unguarded class:** Bug 112 added an architect-name (size 12, no ellipsize) + chamber line at `sigStartY-50` (`verification.ts:216-238`) with **no geometric guard** — a long attested name can approach the chamber column. | **P2** (P1 the day a long-named architect signs) | No — parallel | **0.5-1 hr** visual confirm + **1-2 hrs** to guard the identity row |
| **117** erosion coverage | Owner-edit erosion downgrades **facts only**; editing a verified recommendation/procedure/document/role keeps its DESIGNER+VERIFIED badge (`projectStateHelpers.ts:352-372`). Also only fires if chat-turn is redeployed (`HANDOFF.md:556-557`). | **P2** | No — parallel | **3-4 hrs** (extend erosion loop to the other 4 collections) |
| **E8** project deleted after invite | 🟢 works — `ON DELETE CASCADE` cleans up; only caveat is the audit trail cascades away too. **Not an "architect-flow polish" bug** — it's a green edge case. | **P3** | No | **0 hrs** |
| **E17** network fail during invite | 🟡 acceptable — single INSERT, no partial state, manual retry. Also not "polish." | **P3** | No | **0-1 hr** (optional auto-retry) |

**On your "E8/E17 = architect-flow polish, blocking for B2B?" question:** the framing is off. E8/E17 are green/yellow edge cases in the off-tree audit, **not** the architect-flow polish cluster. The real polish cluster is Bugs 119-128 (Agent D). None of E8/E17/119-128 block B2B sales. **Bug 114 does** — it is the first thing a security-conscious buyer flags, because an unbound token that auto-grants verification authority directly undermines the "architect-verified legal shield" you are selling.

---

## 7. Phased roadmap: v1.0.33 → v1.1.0

Time ranges are honest (low = everything known, high = realistic with the verification/smoke-walk overhead this codebase always incurs). Each sprint holds the hard gates: `verify:locales`, `verify:hardcoded-de`, `verify:legal-config`, `verify:pdfstrings`, `verify:bundle` (≤300 KB), **Bayern SHA MATCH** (`verify:bayern-sha`).

### v1.0.33 — Moat integrity (security + the verified artifact)
- **Scope:**
  - Bug 114: add `invited_email` column (new migration ~`0037`), send email from modal, assert `caller.email === invited_email` in `share-project` handleAccept; reconsider the v1.0.32.3 auto-promote (`CHANGELOG.md:50-79`).
  - Bug 118: wire `state_version` into `verify-fact/index.ts` write (`.eq('state_version', expected)` → 409 → client refetch toast); design already in `0033` header.
  - Bug 60: operator visual-confirm of page-10 signature block + add a width guard / `ellipsizeToWidth` to the identity row (`verification.ts:216-238`).
- **Closes:** the two live integrity holes in the moat you sell (P1 security + P1 race) and the one unguarded PDF layout class.
- **Gate:** concurrent double-verify demonstrably 409s; forwarded token to a non-invited email is rejected; rendered PDF visually confirmed at the longest plausible architect name.
- **Estimate:** **1.5-2.5 days** (114: 3-5h, 118: 2-4h, 60: 1.5-3h, + smoke/regression).
- **Risk:** the auto-promote was a *deliberate* "Google-Docs-share" UX call (`CHANGELOG.md:66-70`). Email-binding it is a product-UX regression the owner may resist; pre-flight that decision before coding.

### v1.0.34 — Stop the cost lie
- **Scope:** Destatis Baupreisindex ingest (build-time, table 61261) to regionalize the cost engine (`costNormsMuenchen.ts:185-222`); for the 4 fall-through templates, replace the silent EFH cost table with **honest-empty stubs** (mirror `exportPdf.ts:739-747`) until per-template bases are authored.
- **Closes:** Bug 35 identical-cost smell; removes the "plausible wrong number" liability on every non-EFH PDF.
- **Gate:** no two different *regions* emit identical cost tables; no non-EFH template emits an EFH cost table; cost provenance no longer reads CALCULATED on unsourced numbers.
- **Estimate:** **3-5 days** (Destatis integration is low-med; the honest-empty refactor is small but touches the load-bearing cost section).
- **Risk:** Destatis gives a regional index, not template bases — scope creep into §4's real track. Hold the line: regionalize now, author per-template bases later.

### v1.0.35 — Validate the 15, fix pagination
- **Scope:** smoke-walk the 12 gate-permitted-but-unvalidated cells (§3) to 12/12 MUST; fix Bug 78 pagination in `keyData.ts:138-233` (track `rowY`, `addPage`, repeat header/footer, update TOC page-count `exportPdf.ts:1467`); Bug 117 erosion extension.
- **Closes:** the ship-allowed > ship-verified gap; the latent multi-page break before it bites.
- **Gate:** 15/15 cells 12/12; a 25-fact synthetic project paginates cleanly; verified rec/doc/role erodes on owner edit.
- **Estimate:** **4-7 days** (the smoke-walks dominate; this codebase's history says each cell surfaces 1-3 small defects).
- **Risk:** the 12 unwalked cells surface a *new* template-blind defect class (history: every horizontal walk did — T-05/T-02/T-04, bug counts 12→19→22, `V1_0_30_STRATEGIC_RESEARCH.md:149`). Budget for it.

### v1.0.36 → v1.1.0 — Stub-state authoring on statute-XML rails (optional / only if Series A wants breadth)
- **Scope:** build-time statute-XML corpus + citation validator (§5); author **RLP** then **SH** (easiest — regulatory-family donors BW/Hessen and Niedersachsen; Agent E) to substantive: ~300-420 lines + ~25 verified §§ each, flip `isSubstantive`, populate `stateCitations.ts` pack + `allowedCitations`.
- **Closes:** the §-error risk class for newly authored states; begins real geographic coverage.
- **Gate:** every authored §§ resolves against the XML corpus; anti-leak guard green; `verify:legal-config` green.
- **Estimate:** **2-3 days for the XML rails + 2-4 days per state** (RLP, SH). Stadtstaaten (Berlin, Bremen, Hamburg) are the *hardest* — the `cityBlock: null` Stadtstaat model mismatch with no geographic donor (`berlin.ts:6`, `bremen.ts:5`) — defer them.
- **Risk:** authoring is parallelizable but **bottlenecked on verification, not generation.** Claude can generate the structure; it **cannot validate §§ it cannot ground** — so this track is *blocked* on the XML rails landing first. "I author, Claude validates" does not work without grounding; "Claude generates, XML + human validate" does.

---

## 8. The question you didn't ask

**You asked how to unlock the matrix. The matrix is not your problem, and the way you framed the engines hides the real architectural decision.**

There are **two parallel representations of German building law in this codebase**, and they do not talk to each other:

1. The **LLM prompt strings** (`templates/index.ts`, `states/*.ts` system blocks) — rich, template-aware, state-aware, and by all evidence *correct* (the persona has been consistently state-correct across every diagnosis: `V1_0_30_T04_LEIPZIG_DIAGNOSIS.md:18`, `V1_0_29_T02_HAMBURG_DIAGNOSIS.md:11`).
2. The **deterministic export engines** (`costNormsMuenchen.ts`, `resolveProcedure.ts`, `timeline.ts`, `composeRisks.ts`) — a hand-coded, template-blind, München-calibrated *second* implementation of the same legal logic that the PDF actually renders from.

**Every template-blind bug you have ever filed is a synchronization bug between these two representations.** T-05, T-02, T-04 weren't 3 different bugs — they were the same bug found 3 times: the deterministic layer doesn't know what the prompt layer already knows. The v1.0.30 doc called this "a design smell, not a bug stream" (`V1_0_30_STRATEGIC_RESEARCH.md:158`) and was right, but stopped one step short. **The real question is not "how do we parametrize the second representation" — it is "why does the second representation exist at all?"** You already have a system (the LLM) that handles all 8 templates × 16 states correctly. The deterministic engines exist to make the *numbers* reproducible and auditable for the legal deliverable — a legitimate goal — but you are paying for it by **maintaining German building law twice, by hand, in two incompatible formats**, and the hand-coded copy is the one your customer sees. The parametric refactor doesn't fix this. It entrenches it — it makes the dumb copy slightly less dumb while guaranteeing it drifts from the smart copy forever.

**And the second uncomfortable thing:** you are planning Phase 2 around a moat that **has never been used in production** (0 `project_members`, 0 `qualifier_transitions`, `FULL_GERMANY_AUDIT.md:18-24`), was found **hollow six weeks ago** and emergency-rebuilt (`CHANGELOG.md:140-149`), has a **live security hole that auto-grants verification authority to anyone with a link** (Bug 114), and is **protected by an optimistic lock that is dead code** (Bug 118). The architect-verified PDF is your entire B2B differentiation, and it is the least-exercised, most-recently-broken part of the system. You are asking which cells to perfect. A technical buyer is going to ask "how many architects have actually used this," and right now the honest answer is **zero**.

---

## 9. The narrower defensible scope option

"Every cell perfect" across 1,792 surfaces is not a Phase 2 — it is the 5-8 sprints the v1.0.30 doc already costed (`V1_0_30_STRATEGIC_RESEARCH.md:155`), and it optimizes the wrong axis. For a **Series A conversation**, the defensible claim is not breadth — it is **a credible, secure, real-architect-validated slice that a technical buyer cannot break in due diligence.**

**Ship this. Cut everything else.**

**KEEP (and make bulletproof):**
- The **15 gate-permitted cells** (T-01/T-03/T-05 × 5 substantive states), all **validated to 12/12** — not just the 3 you've walked. This already covers the 5 largest Bundesländer by construction volume; quantify that % for the deck.
- The architect-verify shield, **with Bug 114 + 118 closed** and **at least one real external architect having verified one real project end-to-end.** A moat with one real user beats a moat with zero and a security hole.
- A **cost number that isn't a lie** (Destatis-regionalized; honest-empty for non-EFH).

**CUT (behind the existing honest gate, openly, in the pitch):**
- All 11 stub states — keep the "coverage in preparation" gate (`demoCoverage.ts`); it is honest and defensible. Cutting them is *less* risky than the parametric refactor: the failure mode of a gated stub is a disclosed gap; the failure mode of a half-built parametric template is an *undisclosed wrong answer* with an architect's name on it.
- The 5 frozen templates' PDF output — leave them chat-only. Do **not** ship T-02/T-06/T-07/T-08 PDFs until they have authored cost/timeline params. A plausible-wrong cost figure on an architect-signed PDF is a liability you cannot disclose your way out of.

**The trade-off, stated plainly:** you concede that Planning Matrix covers **5 states and 3 build types** at Series A, not 16 and 8. In exchange you get a product where **every shipped surface survives a chamber architect's professional read and a security buyer's pen test** — which is the only thing that matters in that room. The breadth story becomes the *roadmap* (statute-XML rails + parallel state authoring, §7), not the *claim*. Selling 5 states that work beats demoing 16 states where 11 say "in preparation" and the cost engine quietly lies in all 16.

**The one thing you cannot cut:** real architect usage. Until one exists, the moat is a hypothesis, and §8 is the question that ends the meeting.

---

*Bayern SHA re-confirmed MATCH at end of authoring — see write-up. No constitutional file, no migration, no code touched. This branch contains exactly one new file.*
