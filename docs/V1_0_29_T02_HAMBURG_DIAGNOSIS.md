# v1.0.29 — T-02 MFH Hamburg smoke-walk diagnosis

**Date:** 2026-05-25
**Baseline:** v1.0.28 (HEAD `f112937`)
**Smoke walk:** Mönckebergstraße 11, 20095 Hamburg · T-02 New build (MFH) ·
5 storeys · 8 units × 90 m² = 720 m² Wohnfläche · GK 4 · pure residential ·
OK Fertigfußboden 13 m.
**Evidence:** 11 Desktop screenshots (2026-05-25 10:34–11:04) +
`multi-family-home-monckebergstra-e-2026-05-25.pdf` (12 pp).

> Persona quality across the 12-round walk was EXCELLENT — HBauO § 61
> vereinfachtes Verfahren, GK 4, DIN 4109, GEG 2024, akhh.de all correctly
> cited. **Every bug below is in the DETERMINISTIC pipeline, not the persona.**
> The persona was state-correct; the downstream resolvers/composers/labels
> assumed T-01 (EFH) shape and/or Bayern.

---

## Two cross-cutting patterns

**(A) Template-blind pattern propagation (the v1.0.28 T-05 finding, now
manifest on T-02).** The v1.0.28 fixes were T-05-(Abbruch)-scoped. T-02 hits
the same class on *different* surfaces: cost area-reader, required-documents,
procedure qualifier, suggestions, executive read. The deterministic pipeline
still defaults to EFH/new-build-EFH assumptions.

**(B) Stadtstaat / non-Bayern Bayern-snippet bleed (NEW class).** Bayern-
authored *topic* tables — `legalRuleSnippets.ts` and `humanizeFact.ts` — render
München/BayBO content for **every** non-Bayern state because the lookup is
keyed by topic, not gated by Bundesland. This is a 15-state class bug that the
T-05 NRW walk could not surface (NRW's Legal Landscape happened not to hit the
bleeding topics). **The PDF Legal Areas (composeLegalDomains) is CLEAN — this
bleed is WEB-only**, which is why it was invisible until the Hamburg walk
inspected the Legal Landscape tab.

---

## Root-cause corrections vs the launch prompt

Five bugs had a materially different root than the prompt assumed. Reading the
code before trusting the prompt is the reason this sprint isn't scaffolding.

| Bug | Prompt's stated root | **Actual root (file:line)** |
|---|---|---|
| 64 | "no branch to read Wohnfläche" | Branch exists. `costNormsMuenchen.ts:306-307` reads `['wohnflaeche','wohnflaeche_m2']`; persona emits **`wohnflaeche_gesamt_m2`** → key miss → `BASE_AREA_SQM=180` (`:139`,`:212`). |
| 65 | `stateCitations.ts`/`stateLocalization.ts`/`composeLegalDomains.ts` | **None of those.** `legalRuleSnippets.ts:138-143` (Brandschutz→"BayBO and BayTBest") + `:83-88` (Stellplatz→"Munich…StPlS 926"); `humanizeFact.ts:133-152` hardcodes `BayBO Art.`/`(StPlS 926)`. Web-only. |
| 67 | "`deriveBaselineRoles` is T-01-shaped (Architect only); version string in i18n" | `deriveBaselineRoles.ts:170-174` already returns **5 roles** for MFH — it's a fallback the persona's thin `state.roles` (1) overrides. The `v1.0.21 noch nicht verifiziert` string is **persona-emitted, not in code** (grep clean). |
| 69 | "round/22 hardcoded; build spine/8" | Spine system already exists (`useSpineStages`, `spineStageDefinitions.ts`, `progressEstimate.ts`). 55%@round-12 = `12/22` because the specialist anchor (`SPECIALIST_PROGRESS.synthesizer=0.98`) wasn't applied. |
| 70 | "no handoff UX; build `deriveSynthesisComplete()`" | `BriefingCTA.tsx` already has `whisper→…→hero→ready` + `useCompletionGate` + `ready_for_review`. The gate isn't firing at synthesis. |

---

## Bug register (64–82)

Legend — surface: **PDF** / **WEB** / **BOTH**. Class: **A** template-blind,
**B** Bayern-bleed, **L** layout, **K** key/label leak, **P** persona-side
(mitigate render-side, no chat-turn redeploy).

### Bug 64 — cost defaults to 180 m² (Class A) · BOTH
- **Evidence:** web Cost tab "Computed from: 180 m² · HOAI Zone III · Hamburg
  factor" (11.03.51); PDF p.5 €24,700–46,200 (numbers consistent with 180 m²,
  not 720 m²). User gave 720 m².
- **Root:** `src/features/result/lib/costNormsMuenchen.ts:306-307` —
  `FACT_KEY_BY_TEMPLATE['T-02'] = ['wohnflaeche','wohnflaeche_m2']`. Persona
  emits `wohnflaeche_gesamt_m2` (PDF p.10 Key Data row). Key not in list →
  area-reader returns `undefined` → falls back to `BASE_AREA_SQM=180` (`:139`,
  `:212`).
- **Fix (C3):** add `wohnflaeche_gesamt_m2` (and the EFH analogue for T-01) to
  the T-01/T-02 key list. Optionally derive from `wohneinheiten_anzahl ×
  wohneinheit_flaeche_m2` when total absent. NO 180 fallback when any of these
  resolve. Flag persona key-naming inconsistency for v1.0.30 (chat-turn) — do
  NOT fix persona-side this sprint.

### Bug 65 — Bayern/München bleed into non-Bayern web (Class B) · WEB · HIGHEST IMPACT
- **Evidence:** web Legal Landscape (11.03.30) — Brandschutz row "fire-protection
  requirements from BayBO and BayTBest"; Stellplatzsatzung row "Munich parking
  ordinance (StPlS 926, amended 10/2025): 1 space per dwelling; public-transit
  reduction down to 0.5 … § 5.085 suspended since 1 Oct 2025". **PDF p.4
  Domain C is clean Hamburg** (§ 48 HBauO, DIN 4109, GEG 2024).
- **Root:** `src/data/legalRuleSnippets.ts:138-143` (topic `Brandschutz` →
  hardcoded BayBO/BayTBest, DE+EN) + `:83-88` (`BayBO Art. 47` Stellplatz →
  Munich StPlS 926 text). Shown by `LegalLandscapeTab` via `findRuleSnippet`
  **regardless of `bundesland`**. Second vector: `humanizeFact.ts:133-152`
  hardcodes `BayBO Art. 58/57`, `Art. 44a BayBO`, and `(StPlS 926)` onto
  procedure/PV/Stellplatz fact labels.
- **Fix (C2):** gate Bayern-only snippets by `bundesland` — non-Bayern states
  resolve to federal MBO / honest "in Vorbereitung" framing, never Bayern.
  `humanizeFact` strips/gates the StPlS-926 and BayBO suffixes for non-Bayern.
  **Bayern path byte-identical** + render-regression assertion (Bayern T-01/T-03
  still cite BayBO/StPlS). Per-state snippet *authoring* (NRW/BW/Hessen/Nds)
  deferred to v1.0.30.

### Bug 66 — Domain B underfilled for stub state + T-02 (Class A) · BOTH
- **Evidence:** PDF p.4 Domain B = single row "Landesbauordnung Hamburg …
  details in preparation"; web (11.03.30) Domain B = Landesbauordnung Hamburg +
  GEG 2024 + Brandschutz(bleed). PDF under-produces more than web.
- **Root:** `composeLegalDomains.ts` non-Bayern Domain B row-builder produces a
  near-empty single row for stub states; it doesn't read `templateId`/facts to
  build the substantive-but-honest rows a T-02 GK 4 MFH warrants.
- **Fix (C4):** read templateId + facts honestly. Hamburg T-02 GK 4 Domain B =
  HBauO § 61 procedure + DIN 4109 Schallschutz + GEG 2024 + GK 4 Brandschutz,
  each with honest "detail rules in preparation" framing — NO Bayern bleed.

### Bug 67 — Team underscoped + version-string leak (Class A + P) · BOTH
- **Evidence:** PDF p.8 SPECIALISTS = 1 ("Acoustic consultant (DIN 4109)"); web
  Team (11.03.49) = 1 ("Architect" card carrying acoustic text) + the leak
  `Detail-§ in v1.0.21 noch nicht verifiziert — mit Bauamt oder
  Architektenkammer abklären`. Persona named 5: Architekt:in,
  Tragwerksplaner:in, Brandschutzplaner:in, GEG-Energieberater:in,
  Schallschutzgutachter:in.
- **Root:** `deriveBaselineRoles.ts:170-174` returns 5 `NEW_BUILD_ROLES` for
  `neubau_mehrfamilienhaus` — but this is a fallback used only when the persona
  emits no roles. The persona emitted 1 role → it wins (same class as v1.0.28
  Bug 62). The `v1.0.21` string is **persona-emitted** (not in code).
- **Fix (C5):** union persona `state.roles` with the deterministic baseline
  floor (baseline roles missing from persona output are added back). Strip
  `/v\d+\.\d+\.\d+/` version tokens from any user-visible persona string (a
  render-side defense, like `sanitizeGermanContentOnEnglish`). Persona role-emit
  thinness itself → v1.0.30 chat-turn.

### Bug 68 — Suggestions are generic T-01 boilerplate (Class A) · BOTH
- **Evidence:** Suggestions tab (11.03.58) + PDF Executive p.3 + Recommendations
  p.9 — all show "Plan energy certificate / Check KfW / Compare insurance".
- **Root:** no T-02 deterministic suggestion baseline; falls through to generic
  energy/KfW/insurance set.
- **Fix (C6):** T-02 MFH baseline — Bauvoranfrage (Bezirksamt, B-Plan/overlay) →
  Architekt:in shortlist via state chamber (akhh.de for Hamburg) with GK +
  template criterion → commission core team (5 roles) → KfW BEG **only if the
  persona emitted it as a fact** (no fabrication).

### Bug 69 — progress bar desynced (Class A) · WEB
- **Evidence:** round 12 "synthesis · speaking now" but bar at **55%** (=12/22)
  (11.03.17).
- **Root:** `src/features/chat/lib/progressEstimate.ts:TYPICAL_TURN_COUNT=22`;
  `estimateProgress = max(specialistAnchor, turns/22)`. At synthesis the
  specialist anchor (`synthesizer:0.98`) was not applied → fell to the turn
  fraction. Specialist detection is fragile.
- **Fix (C7):** drive progress off **spine-stage completion** (`useSpineStages`/
  `spineStageDefinitions`) rather than `currentSpecialist` detection — more
  honest signal. Synthesis stage → ~88–100%.

### Bug 70 — no synthesis completion handoff fired (Class A) · WEB
- **Evidence:** persona asks "Ready to wrap up — is the structured matrix output
  / PDF export ready…?" (11.03.17) — confusing; no dominant "Open briefing"
  signal.
- **Root:** the machinery exists — `BriefingCTA.tsx` prominence
  `whisper→badge→outlined→hero→ready` + `useCompletionGate` + `ready_for_review`
  signal — but the gate isn't reaching `ready_for_review`/`hero` at synthesis.
- **Fix (C7):** fire `ready_for_review` when the spine reaches the synthesis/
  final stage (trace the signal source in `useCompletionGate` — candidates:
  `state.facts['synthesis_complete']`, spine final stage, or
  `next_steps_top3`/`recommendations`). BriefingCTA reaches hero/ready. Pure SPA,
  no chat-turn redeploy.

### Bug 71 / 81 — internal fact keys leak in EN (and DE) (Class K) · BOTH
- **Evidence:** PDF p.10 Key Data FIELD column — "Vorhaben · Typ", "Gebaeudeklasse",
  "Wohnflaeche Gesamt M2", **"Okff Oberstes Geschoss M"** (raw variable),
  "Sonderbau Tatbestand", "Verfahren · Typ", "Geg · Pflicht", etc. Web Overview
  (11.03.25) leaks dotted keys too — "Planungsrecht.bebauungsplan Status",
  "Planungsrecht.erhaltungssatzung Moeglich" (Bug 81 = same gap on web).
- **Root:** `src/locales/factLabels.en.ts` has **0 entries** for all 13 T-02
  keys verified; `src/lib/factLabel.ts:66` falls back to `humanize(key)` which
  splits on `.`/`_` and title-cases → raw-key leak.
- **Fix (C8):** add EN (+ DE) labels for every T-02 fact key. Add a render gate:
  EN/DE export must not emit humanizer output that still contains
  snake_case/dotted residue (skip + dev-log instead).

### Bug 72 — wizard map shows München for Hamburg (Class A) · WEB
- **Evidence:** Hamburg address, map centered on München (10.35.10).
- **Root:** `PlotMap.tsx:36` `MUENCHEN_CENTER=[48.1374,11.5755]` default; `:295`
  `initialCenter = coords ?? MUENCHEN_CENTER`; `:119` `isInMuenchenBounds` gates
  clicks; geocoder is München-bounded. The map is **deliberately München-locked
  (Phase 5 narrowing)**, so a Hamburg address yields no flyTarget → stays at
  München.
- **Fix (C9, surgical-or-flag):** surgical honest fix = when the project's
  Bundesland ≠ Bayern (or address out of München bounds), suppress the
  misleading München view / show an honest "interactive map is part of the
  München pilot; address recorded from text above" state. Full nationwide
  recenter (unbound geocoder + bounds) crosses the München-pilot product
  boundary → **DEFER to v1.0.30**.

### Bug 73 — procedure qualifier ASSUMED, should be CALCULATED (Class A) · BOTH
- **Evidence:** web Procedure (11.03.43) "§ 61 HBauO … REQUIRED · LEGAL ·
  ASSUMED"; PDF p.7 "· LEGAL · ASSUMED".
- **Root:** `resolveProcedure`/`deriveBaselineProcedure` qualifier downgrade — it
  emits ASSUMED even when intent + Gebäudeklasse + non-Sonderbau are all known.
- **Fix (C9):** CALCULATED when intent + building class + non-Sonderbau resolved;
  ASSUMED only when inputs missing.

### Bug 74 — documents underscoped for neubau (Class A) · BOTH
- **Evidence:** PDF p.7 + web Procedure (11.03.43) show only "Energy performance
  calculation (GEG 2024)".
- **Root:** `src/legal/requiredDocuments.ts` is **eingriff-flag-gated (T-03
  Sanierung-shaped)**: Standsicherheit (`:190` behind `eingriff_tragende_teile`),
  Brandschutz (`:200` same gate), GEG (`:168` behind `geg_trigger =
  eingriff_aussenhuelle && fassadenflaeche_m2>0`). A **neubau never sets**
  `eingriff_tragende_teile`/`fassadenflaeche_m2` (those are renovation keys), so
  the structural/fire/sound docs never emit. No Stellplatz/Schallschutz/
  Entwässerung docs exist at all.
- **Fix (C10):** add a neubau branch to `requiredDocumentsForCase` — for
  `neubau_*` always require Standsicherheitsnachweis + Brandschutznachweis
  (GK-dependent) + (MFH/GK3+) Schallschutznachweis DIN 4109 + Stellplatznachweis;
  GK 4 promotes Brandschutz from conditional to required. Verify which surface
  consumes `required` vs persona `onFile` during implementation.

### Bug 75 — PDF Data Quality says "verified" not "Decided" (Class K) · PDF
- **Evidence:** PDF p.11 "54% verified" with 0 architect verifications; web uses
  "Decided 64%" correctly (11.03.25).
- **Root:** PDF copy conflates qualifier strength (Decided) with architect
  sign-off (Verified).
- **Fix (C8):** PDF uses "Decided / Calculated / Assumed" matching web; "Verified"
  reserved for the per-fact architect-verification gate only.

### Bug 76 — PDF cover template-field overlap (Class L) · PDF
- **Evidence:** PDF p.1 "T-02 · New build (MFH)" collides with "25 May 2026".
- **Fix (C10):** surgical — clamp/measure the TEMPLATE column like the Bug 59
  Bauherr clamp.

### Bug 77 — PDF Procedure heading overflows right margin (Class L) · PDF
- **Evidence:** PDF p.7 §05 heading clipped "…landesrechtliche Det…".
- **Fix (C10):** surgical — wrap or shorten the procedure heading.

### Bug 78 — PDF Key Data table overflow + footer collision, no pagination (Class L) · PDF
- **Evidence:** PDF p.10 ~30 rows overflow the page; rows collide with footer;
  value "true" overlaps "Erhaltungssatzung Mo…".
- **Decision:** SURGICAL ONLY this sprint. Multi-page table refactor → **DEFER to
  v1.0.30** with this screenshot evidence. Don't grind.

### Bug 79 — PDF procedure says "regulär", persona said "vereinfacht" (Class A) · PDF
- **Evidence:** PDF p.4 Domain B + p.7 §05 "Baugenehmigungsverfahren (regulär)";
  persona + web say § 61 vereinfacht.
- **Root:** PDF procedure resolver doesn't honor the persona `verfahren_typ`
  fact — same shape as v1.0.28 Bug 52 (resolver overrides persona) but for the
  simplified-permit kind.
- **Fix (C9):** mirror the Bug 52 pattern — `resolveProcedure` reads
  `verfahren_typ`/`verfahren_indikation` and honors "vereinfacht" → simplified
  kind + cited § 61.

### Bug 80 — persona exec text contradicts GK (Class P) · WEB
- **Evidence:** web Overview (11.03.25) "§ 61 HBauO if … Gebäudeklasse 1-3" while
  the project is GK 4.
- **Root:** persona-emitted executive read carries a generic GK 1-3 conditional.
- **Fix (C9, render-side):** strip the contradictory conditional clause OR document
  as v1.0.30 chat-turn fix. Do NOT redeploy persona this sprint. (Decision at
  implementation: prefer a minimal render-side guard that drops a GK-conditional
  clause that contradicts the decided `gebaeudeklasse` fact; defer if not clean.)

### Bug 82 — PDF glossary leaks version + doc path (Class K) · PDF
- **Evidence:** PDF p.12 "regional BKI factors not yet wired in v1.0.23 — see
  docs/cost-formula.md" (BKI) + "§§ not yet wired in v1.0.23. Verify with the
  {state} Architektenkammer." (stub-state BauO).
- **Root:** `src/features/chat/lib/pdfSections/glossary.ts:76-77` (BKI) + `:120`
  (stub-state BauO).
- **Fix (C10):** scrub `v1.0.23` + `docs/cost-formula.md` from user-facing strings;
  audit ALL glossary entries for similar internal leaks.

---

## Proven green (do not touch)
- Persona quality across 12 rounds (EXCELLENT).
- Bug 52 verfahrensfrei branch did NOT misfire for T-02 Neubau.
- Bug 61 Stadtarchiv → "Stadtarchiv Hamburg" correct (PDF p.4).
- Bug 59 cover footer name clamp → "Rutik goraks…" no overlap (PDF p.1).
- German typography ß/ä/ö/ü clean; DE/EN toggle; T-02 wizard selection.

---

## Commit plan (10) — gate-green every commit, SHA MATCH, no chat-turn redeploy
- **C1** this diagnosis doc.
- **C2** Bug 65 Bayern bleed gate-by-bundesland (+ Bayern regression fixtures +
  Hamburg/Berlin anti-bleed fixtures). HIGHEST IMPACT.
- **C3** Bug 64 cost area-key fix.
- **C4** Bug 66 Domain B honest substantive build (stub + T-02).
- **C5** Bug 67 roles union-floor + version-token strip.
- **C6** Bug 68 T-02 suggestions baseline.
- **C7** Bug 69+70 progress off spine-stage + fire ready_for_review.
- **C8** Bug 71+75+81 EN/DE labels + PDF "Decided" + key-leak gate.
- **C9** Bug 72+73+79+80 map honest-state + procedure CALCULATED + verfahren_typ
  honored + exec contradiction guard.
- **C10** Bug 74 docs neubau branch + Bug 82 glossary scrub + Bug 76/77 surgical
  layout + CHANGELOG/BACKLOG/HANDOFF + tag v1.0.29 + push.

## Deferred to v1.0.30+ (explicitly named)
- Bug 78 Key Data multi-page table refactor.
- Bug 60 verification-page signature overlap (still open from v1.0.28).
- Bug 72 full nationwide map recenter (München-pilot boundary).
- T-04 / T-06 / T-07 / T-08 — same template-blind propagation.
- Persona-side (chat-turn redeploy): GK-1-3 exec line (Bug 80), `verfahren_typ`
  / `wohnflaeche_gesamt_m2` key-emit consistency, thin role/suggestion emission,
  `recommendations_delta`.
- Per-state `legalRuleSnippets` authoring (NRW / BW / Hessen / Niedersachsen).

## New gates added this sprint
- `test/fixtures/hamburg-t02-mfh.json` — mirrors this walk; anti-bleed +
  cost-area + roles-floor + docs assertions.
- Bayern T-01 + T-03 render-regression assertions (Bug 65 insurance — Bayern
  still cites BayBO/StPlS).

---

## RESOLUTION (commit hashes + corrections found during implementation)

| Bug | Status | Commit |
|---|---|---|
| 65 Bayern bleed | CODE-COMPLETE | `335f751` (C2) |
| 64 cost key | CODE-COMPLETE | `58434dd` (C3) |
| 66 Domain B (web) | CODE-COMPLETE | `3648d02` (C4) |
| 67 roles floor + version scrub | CODE-COMPLETE | `03b73df` (C5) |
| 68 suggestions | CODE-COMPLETE | `095eeb8` (C6) |
| 69 + 70 progress + handoff | CODE-COMPLETE | `4adf8a3` (C7) |
| 71 + 81 labels · 75 "decided" | CODE-COMPLETE | `2e6346b` (C8) |
| 79 + 73 procedure · 80 exec GK | CODE-COMPLETE | `f68998e` (C9) |
| 74 docs · 82 glossary · 76 + 77 layout | CODE-COMPLETE | C10 |
| 72 map · 60 signature | DEFERRED v1.0.30 | — |

**Corrections discovered during implementation (beyond the 5 Turn-1 ones):**
- **Bug 67 version leak is NOT persona-emitted.** Turn 1 (grep) suggested the
  `v1.0.21` string was persona-side; the runBayernBleed render surfaced it in
  the Domain C denkmal label → traced to `stateCitations.ts:148` `STUB_VERIFY`
  (a citation-pack data string feeding the baseline architect role + the denkmal
  label + the PDF). Fixed at the data root + a render-side `stripVersionTokens`
  defense. Deterministic, not chat-turn.
- **Bug 80 is deterministic, NOT persona-emitted.** Turn 1 assumed the GK-1-3
  exec clause was persona text; it's hardcoded in `composeExecutiveRead.ts:318`
  + `deriveBaselineProcedure.ts:82` (a Bayern-ism). Fixed in code.
- **Bug 74 has a render-suppression aspect beyond the resolver.** Both
  `ProcedureDocumentsTab.tsx:147` and `exportPdf.ts:862` showed the canonical
  `required` list ONLY when the persona emitted no docs — so the walk's single
  persona doc suppressed the full set (same class as Bug 67 roles). Fixed the
  suppression + added the neubau branch to `requiredDocuments.ts`.
- **Fact-key naming is inconsistent** (dotted `vorhaben.typ` vs flat
  `wohnflaeche_gesamt_m2`); labels registered for both forms, alignment flagged
  for v1.0.30 chat-turn.
