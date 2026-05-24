# v1.0.28 — T-05 NRW DIAGNOSIS + "TEMPLATE-BLIND PIPELINE" PATTERN

**Date:** 2026-05-24 · **HEAD:** `66df1ab` · **Bayern SHA:** `b18d3f7f…3471` MATCH
**Source of truth:** Rutik's live T-05 smoke walk — `demolition-hauptstra-e-2026-05-24.pdf` (11 pages) + 29 Desktop screenshots. Scenario: T-05 Abbruch, Hauptstraße 47, 53111 Bonn, NRW, detached GK 2, built 1978, no Denkmal/Erhaltungssatzung/Sanierungsgebiet/Baulast. Persona concluded **verfahrensfrei § 62 BauO NRW**.

---

## THE PATTERN (read this first)

The 16-state matrix (v1.0.26) only tested **T-01 EFH-Neubau**. The chat **persona** (LLM) handles every template correctly because it reasons from the template prompt. But the **deterministic downstream pipeline** (resolvers / cost engine / risk register / do-next / timeline / legal-domain composer) has **T-01/T-03-shaped assumptions** and silently overrides the persona for T-05. Two distinct failure modes:

1. **"Resolver wins over persona" + the resolver is T-01-shaped.** `exportPdf.ts:728-732` (v1.0.19 Bug 40) deliberately renders the singular `resolveProcedure` decision *instead of* the persona's `state.procedures`. For T-01 the resolver is right; for T-05 `resolveProcedure` has no abbruch branch → generic branch → §65 permit, overriding the persona's correct verfahrensfrei.
2. **"Regex/heuristic over corpus, Bayern-shaped."** `composeLegalDomains.ts:122` gates Domain B (Building law) to `if (isBayern)` — **all 15 non-Bayern states get zero B rows** (the v1.0.21 comment says "wired in v1.0.22+" — never done). The matrix missed it because the matrix asserts the **PDF**, never the web result tabs.

**Web vs PDF divergence is itself a finding:** several surfaces (procedure, legal areas) render through *different* code on the web vs the PDF, and the two disagree. Any fix must converge them.

**T-02 / T-04 / T-06 / T-07 / T-08 almost certainly carry the same shapes** (cost 180 m² default, generic do-next, T-01 timeline/risks). Flagged for v1.0.29+. This sprint fixes **T-05 NRW as the exemplar** + documents the pattern.

---

## BUG-BY-BUG (file:line + root cause + fix shape + regression risk)

### Bug 52 (P0) — Procedure contradiction (verfahrensfrei overridden by §65) — PDF-ONLY
- **Evidence:** PDF p3-B / p6 / p9 say "§ 65 standard permit REQUIRED"; PDF p9 Key-Data shows BOTH *Verfahrensart: verfahrensfrei § 62 (CALCULATED)* and *Procedure indication: standard permit § 65 (ASSUMED)*. **Web AtAGlance (screenshot 4.13.15) is CORRECT** ("Procedure-free full demolition").
- **Root:** `exportPdf.ts:374-396` builds `procedureCase` from intent+blockers (never reads the persona's `verfahren_indikation`/`PROCEDURE.TYPE` fact). `resolveProcedure` (`src/legal/resolveProcedure.ts`) has **no `abbruch` branch** → generic branch → `loc.procedure.regular.citation` = §65 BauO NRW. `exportPdf.ts:728-732,775` (Bug 40) renders this over `state.procedures`. The web is right because `AtAGlance.tsx:40-51` uses `resolveProcedures` (plural) → persona `state.procedures`.
- **Fix:** add `verfahren_indikation?: string` to `ProcedureCase`; in `exportPdf` read the `verfahren_indikation`/`PROCEDURE.TYPE` fact into it; in `resolveProcedure`, after hard-blockers, if it contains verfahrensfrei/permit-free → emit `kind:'verfahrensfrei'` + the persona's citation + CALCULATED. (Apply equally to T-03 sanierung verfahrensfrei.)
- **Regression risk:** T-01 (no verfahren_indikation fact → unchanged generic/neubau branch). 16-state matrix unaffected (fixtures have no verfahren_indikation). Bayern untouched.

### Bug 53 + Bug 30 (P0) — Cost engine template-blind + 180 m² silent default
- **Evidence:** PDF p4 + cost tab (4.13.45): "**Computed from: 180 m²** · HOAI Zone III · NRW factor", Architect €15-28k, **Energy consultation €2.5-4.5k (GEG thermal!)**, total €24.7-46.2k — new-build costs on a demolition.
- **Root:** `costNormsMuenchen.ts:139 BASE_AREA_SQM = 180` is the silent fallback when no area fact exists. `buildCostBreakdown` has no T-05 branch — emits the T-01/T-03 HOAI Zone III rows incl. Energy consultation. The user never gave 180 m².
- **Fix (Decision 2 — honest stub, NO fabricated BKI):** route T-05 cost to "Demolition cost ranges in preparation — request quotes from a licensed demolition contractor"; **remove** the Energy-consultation row for T-05; **kill** the 180 m² default for T-05 (UNKNOWN qualifier, not 180). Log `C11_DATA_GAPS` GAP-4. For verfahrensfrei T-05: authority fee €0, architect €0/minimal.
- **Regression risk:** T-01/T-03 cost path unchanged (branch on templateId/abbruch only).

### Bug 54 (P0) — Web Legal Landscape A+B empty — WEB-ONLY (PDF renders A/B/C)
- **Evidence:** web Legal tab (4.13.29): A + B "Not enough information yet". PDF p3 renders A/B/C (B wrongly via Bug 52).
- **Root:** `composeLegalDomains.ts` is **regex-over-corpus**. Domain A matches only literal `§ 30/34/35 BauGB` strings in fact values (T-05 facts don't contain them). Domain B is gated `if (isBayern)` (`:122`) → **non-Bayern never gets B rows** unless GEG/Brandschutz present (absent for demolition). Affects ALL non-Bayern states, not just T-05.
- **Fix:** Domain B reads the state procedure citations (`getStateCitations`/`getStateLocalization`) + the `verfahren_indikation` fact (e.g. "§ 62 BauO NRW · verfahrensfrei"); Domain A reads `bundesland` + the § 34 context + erhaltungssatzung/sanierungsgebiet facts. Empty fallback only when truly no facts.
- **Regression risk:** Bayern Domain B (BayBO matchers) must stay; T-01 matrix is PDF-only (unaffected).

### Bug 55 (P1) — Wizard "outside coverage (Munich)" warning on a supported NRW project
- **Evidence:** Rutik's report (Image 8). **Root confirmed:** `QuestionPlot.tsx:271,293-294,642` gates the warning on `isMunich` (PLZ 80331–81929) only; any non-Munich address (incl. fully-supported NRW/BW/Hessen/NDS) shows `wizard.q2.outsideMunich.warning` + requires `outsideMunichConfirmed`. Copy `en.json:835,855` is Munich-centric.
- **Fix:** gate on state TIER (substantive bayern/nrw/bw/hessen/niedersachsen → no warning; stubs → honest reduced-data note). Update copy DE+EN.
- **Regression risk:** the `outside_munich_acknowledged` system-flag write (`:293`) — keep it for Bayern-city logic; only change the *warning display* gating.

### Bug 56 + Bug 63 (P1) — Generic Do-Next + empty Recommendations/Suggestions
- **Evidence:** PDF p8 "No recommendations recorded yet"; Suggestions tab empty (4.14.01); Do-Next "engage architect / pre-meeting Bauamt" (4.13.15). Persona's correct next-steps (4.11.29: Schadstoffkataster / demolition contractor / architect-confirm) are **chat text, not `state.recommendations`** (empty array).
- **Root:** `state.recommendations` is empty (persona emits the synthesis as prose + facts, not a `recommendations_delta`). `composeDoNext` falls back to T-01 defaults. [COMMIT 1 finding to confirm: does the persona EVER emit `recommendations_delta`? `projectStateHelpers.ts:412 applyRecommendationsDelta` exists and is wired (`:718`), so the persistence path works — the persona simply didn't emit it for T-05. If it never does for any template, the deterministic-default pattern is the permanent fix.]
- **Fix (Decision 1):** deterministic template-default Do-Next + Suggestions for T-05 verfahrensfrei (Schadstoffgutachter:in → demolition contractor → AKNW confirmation) from the T-05 template definition. No chat-turn change.
- **Regression risk:** T-01 default do-next must stay; only add a T-05 branch.

### Bug 57 (P1) — Risk register not template/fact-aware
- **Evidence:** Overview (4.13.15) shows B-Plan / Heritage / Pre-decision on a verfahrensfrei no-Denkmal demo.
- **Root:** `riskCatalog.ts` entries carry optional `intent` + `bundesland` filters (`:28-30`) but **no `templateId` filter**; `composeRisks.ts:33` fires unfiltered risks "on every project". Heritage risk fires regardless of `denkmalschutz=false`.
- **Fix:** add `applicableTemplates` + fact-gates; Heritage only when `denkmalschutz` TRUE/UNKNOWN. T-05 demolition risks (Schadstoff overrun, disposal variance, permit-reclassification).
- **Regression risk:** universal risks must still fire on T-01.

### Bug 58 (P1) — Timeline shows Bauantrag cycle on verfahrensfrei
- **Evidence:** PDF p5 "4-6 months", Review·Bauamt 6-10 wks, "Baugenehmigung issued at week ≈22".
- **Root:** `exportPdf.ts:700-702` uses constant `DEFAULT_TIMELINE_PHASES` (Bauantrag 4-phase) regardless of procedure. (Web AtAGlance derives timeline from procedureType, `AtAGlance.tsx:89-94` — already procedure-aware.)
- **Fix:** PDF timeline reflects `procedureDecision.kind` — verfahrensfrei → survey/procurement/demolition (~5-10 wks), no Bauamt review.
- **Regression risk:** non-verfahrensfrei keeps the Bauantrag timeline.

### Bug 59 (P2) — PDF cover footer text overlap
- **Evidence:** PDF p1 — "Rutik gorakshanath Erole" (long Bauherr name) collides with the centered "PRELIMINARY — pending architect confirmation".
- **Root:** `cover.ts:238 bauherrText = "${label} · ${name}"` drawn in the left footer cell with no width clamp; long names overflow into the centre cell.
- **Fix:** truncate/ellipsize the bauherr name to the cell width (surgical). If it needs a 3-cell layout refactor → flag for v1.0.29.

### Bug 60 (P2) — PDF verification page signature overlap
- **Evidence:** PDF p10 — "Bauherr · Owner" signature row collides with the "…signature required for Bauantrag." note.
- **Root:** signature-block y-positions + the note overlap (verification page renderer). **Fix:** adjust y-offset; assess surgical vs refactor.

### Bug 61 (P2) — Stadtarchiv "Düsseldorf" hardcoded for a Bonn project
- **Evidence:** PDF p3-A caveat "Stadtarchiv Düsseldorf" — project is Bonn.
- **Root:** `stateCitations.ts:86 archivCity:'Düsseldorf'` (per-state default); `resolveProcedure.ts:384` (NRW caveat) uses `citations.archivCity`. The `crossStateBleedGuard:45` only rewrites it on NON-NRW projects.
- **Fix:** resolve archivCity from the project's `city`/`stadt` fact; fallback to the state default only when city unknown.

### Bug 62 (P2) — Team specialist text stale/template-blind
- **Evidence:** PDF p7 + Team tab (4.13.39): "Hazardous materials survey … year of construction **unknown**" (Baujahr **1978** is known, p9); "Structural stability of **neighbouring buildings**" (wrong for **detached**, `abbruch_freistehend=true`).
- **Root:** likely persona-emitted `state.roles` text (stale) OR a baseline role composer not reading `baujahr`/`abbruch_freistehend`/`standsicherheit_nachbar_erforderlich`. [Confirm in Commit 8 whether persona-emitted (→ chat-turn, out of scope, flag) or deterministic (→ fix).]
- **Fix (if deterministic):** read those facts before composing team needs. If persona-emitted → flag for v1.0.29 (no chat-turn this sprint).

### Bug 63 — see Bug 56 (same root: empty `state.recommendations`).

---

## REGRESSION GUARDRAILS (every commit)
- Bayern SHA `b18d3f7f…3471` MATCH before+after.
- 16-state **T-01** matrix stays 16/16 (T-05 fixtures are additive).
- T-01 + T-03 procedure/cost/timeline paths unchanged (branch on templateId/abbruch).
- No Edge-Function redeploy, no migrations.
- NO fabrication — honest "in Vorbereitung" for unsourced T-05 cost (BKI).

## DEFERRED → v1.0.29+
T-02/T-04/T-06/T-07/T-08 pipeline alignment (same pattern) · per-state BKI cost factors · 11 stub-state real §§/chamber/authority · Bug 27 München calendar · Section XII Risk Register + Vorhabensbeschreibung PDF sections.

---

## RESOLUTION (v1.0.28 — 2026-05-24)

| Bug | Status | Commit |
|-----|--------|--------|
| 52 procedure verfahrensfrei | RESOLVED (render-proven) | `62dcca3` |
| 53 + 30 cost honest stub | RESOLVED (render-proven) | `aa98ee6` |
| 54 web Legal B (15 states) | RESOLVED (smoke-proven) | `1db2955` |
| 55 coverage warning | RESOLVED | `934b82d` |
| 56 do-next demolition | RESOLVED (smoke-proven) | `6d5e863` |
| 57 risk template/fact filter | RESOLVED (smoke-proven) | `4bcae1f` |
| 58 timeline (PDF) | RESOLVED (render-proven) | `224e80c` |
| 59 cover footer overlap | RESOLVED (raster-confirmed) | `a880c9b` |
| 61 Stadtarchiv city | RESOLVED (render-proven) | `a880c9b` |
| 60 verification signature overlap | DEFERRED v1.0.29 (deep PDF layout) | — |
| 62 team staleness | DEFERRED v1.0.29 (persona-emitted; baseline clean) | — |
| 63 empty recommendations | DEFERRED v1.0.29 (persona never emits; do-next mitigated) | — |
| 58 web sub-detail | DEFERRED v1.0.29 (CostTimelineTab "Procedure duration") | — |

9 code-complete · 4 deferred (3 persona-side/deep + 1 web sub-detail). Bayern
SHA held across all commits. T-02/T-04/T-06/T-07/T-08 carry the same pattern.
