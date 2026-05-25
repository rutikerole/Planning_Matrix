# Changelog

## v1.0.31 — PDF vertical slice: 3 demo cells pass the 12 MUST checks (2026-05-25)

Pivot from the horizontal template-blind walk (see `docs/V1_0_30_STRATEGIC_RESEARCH.md`)
to a focused PDF-hardening slice. The finish line — defined for the first time in
7 sprints — is **12/12 PDF MUST checks GREEN on three demo cells**: T-01 × Bayern
(München), T-05 × NRW (Köln), T-03 × Hessen (Frankfurt). Everything else is frozen
behind an honest "coverage in preparation" UI. Diagnosis + resolution table:
`docs/V1_0_31_PDF_SLICE_DIAGNOSIS.md`.

- **C2** — 3 demo fixtures + pure-logic gates (runBayernT01 / runNrwT05Koeln /
  runHessenT03): procedure CALCULATED with the correct state § (BayBO Art. 58 /
  § 62 BauO NRW / § 65 HBO), no Bayern-leak, curated bilingual labels. §§ manually
  verified against the repo's Bayern localization + BauO NRW 2018 + HBO 2018
  (machine XML grounding = Phase 2 / v1.0.32). C4 (Genehmigungsfreistellung label)
  dropped — the repo models Bayern as Art.57/58/59, so T-01 uses the repo-consistent
  vereinfachtes Art.58 (no new procedure kind, no SHA risk). `1d81e56`
- **C3 (Check 3)** — T-03 renovation was cost-template-blind (new-build HOAI rows);
  added an `isRenovation` honest stub (request Fachplaner quotes, no fabricated
  renovation BKI) mirroring T-05/T-04. `b4f70bb`
- **C5 (Check 11, Bug 60)** — the signature-block collision deferred across
  v1.0.28→30: the Bauherr co-signature note sat at a fixed `bauherrY-80`, overlapping
  the label/sublabel. Measure-then-place — anchor below the field's returned `endY`.
  Affects every cell (shared verification page). `78a7969`
- **C6 (Check 4)** — Key Data fits one page on all 3 cells (10 / 14 / 13 rows < the
  ~17-row T-04 overflow, so Bug 78 stays deferred); fixed a Bug-103 recurrence for
  abbruch (NRW Köln rendered 11pp) with a T-05 demolition suggestions floor →
  Executive page restored, 12pp. `78a769d`
- **C7 (Check 7)** — web↔PDF Section 05 convergence gate: `resolveProcedures` (web
  AT A GLANCE) and `resolveProcedure` (PDF) classify to the same verdict on all 3
  cells. `efc768f`
- **C8 (Checks 5/9/10)** — Hessen T-03 (first substantive non-Bayern T-03 walk):
  no stub-state §-placeholder leak, renovation docs + GEG cert populated, bilingual
  labels. `c53b2e2`
- **C9** — freeze the architect PDF for non-demo cells (`src/legal/demoCoverage.ts`
  + both ExportMenus) behind an honest "In preparation" state; the renderer is
  untouched so every smoke fixture stays green. Wizard stub-state coverage already
  honest (Bug 55/72). `425cc39`
- **C10 (Checks 6/8/12)** — confidence 95 / 96 / 93 on the clean cells (no PENDING
  penalty); T-03 GEG-Sanierungspflicht risk fires + heritage suppressed; ß/ö/ü
  render (München / Köln / Schweizer Straße), no glyph corruption. `60f2613`

**Gates:** Bayern SHA MATCH every commit · 16-state matrix 16/16 · nrw-t05-bonn +
hamburg-t02 + sachsen-t04 fixtures green · smoke:pdf-text 276→359/0 · smoke:architect
237→281/0 · build 285 KB gz · lint net-zero · no migrations · no chat-turn redeploy.

**Still deferred:** Bug 78 multi-page Key Data table (bites T-04+, not the demo
cells) · T-02/T-04/T-06/T-07/T-08 + the 11 stub states (frozen behind "in
preparation" UI) · machine statute-XML citation grounding + Destatis Baupreisindex
(Phase 2 / v1.0.32) · template-parametric refactor (Phase 3 / v1.0.33+, only if the
demo lands). **Visual confirmation of the signature reflow + freeze UI = operator
smoke walk** (the repo's pattern for deep PDF layout / UI state).

## v1.0.30 — T-04 Use-conversion (Leipzig / Sachsen) template-blind pass (2026-05-25)

Rutik's first live T-04 (Umnutzung) smoke walk — retail → gastronomy, Karl-
Liebknecht-Straße 33, 04107 Leipzig — surfaced 17 bugs + 5 new, all in the
DETERMINISTIC pipeline (the persona's SächsBO / DIN 4109 / TA Lärm / § 33 SächsBO
reasoning was state-correct). T-04 confirms the template-blind pattern a third
time: v1.0.28 = T-05, v1.0.29 = T-02, v1.0.30 = T-04. See
`docs/V1_0_30_T04_LEIPZIG_DIAGNOSIS.md`. The matrix was T-01-only, so the whole
class was CI-invisible until the new sachsen-t04 fixture.

- **Bug 88 / 99 / 100 / ±** — T-04 cost section was the new-build HOAI engine
  (only T-05 branched). Added an `isUseConversion` honest stub (request Fachplaner
  quotes, no fabricated BKI), cleaned the Bayern-bled T-04 `COST_BANDS` text, fixed
  `±`→`²` (Instrument Serif glyph gap, NOT winAnsiSafe; `+/-` in caption), + a new
  **pdfStrings EN/DE parity gate**. `2cfb9d2`
- **Bug 89** — web Domain B gained TA Lärm + Rettungsweg matchers (DIN 4109 +
  Brandschutz already fired); PDF Domain B improves via the C4 procedure fix. `37e1206`
- **Bug 90 / 91 / 92** — T-04 fell to the generic `standard`/`(regulär)`/ASSUMED
  branch. Added an `umnutzung` branch → `vereinfachtes` + CALCULATED, converging
  the PDF resolver with the web baseline ("Simplified building permit"). `9041ccb`
- **Bug 94 / 95 / 103** — Suggestions tab + PDF recs + Executive page were empty
  (→ 11p not 12p). 4 state-neutral T-04 smart suggestions (Bauvoranfrage floor +
  Schallschutz / Brandschutz-Rettungsweg / TA-Lärm); aligned the TOC page-calc to
  the real exec-page render condition. `045f04e`
- **Bug 96** — Heritage risk fired on `denkmalschutz` ASSUMED "nicht bekannt";
  now suppressed on ASSUMED-negative (still fires on TRUE / genuine UNKNOWN). `e098d77`
- **Bug 104** — T-04 fact-key family (incl. the umlaut `nettogrundfläche_m2` the
  live persona emits) added to factLabels.{en,de}. `33f54b1`
- **Bug 97 / 98 / 101** — scrubbed the STUB_VERIFY deferral from the architect
  role; suppressed the per-row doc citation → ONE footer; fixed the broken
  "permit nach …" Key Data concatenation. `520f464` (role-scrub regex corrected `0467a99`)
- **Bug 106 / 107 / 108** — ellipsize over-long Key Data values, doc delivery,
  glossary terms (no more off-page overflow). `875da0b`
- **Bug 102** — ≥2 PENDING legal domains now knock the confidence down
  (Leipzig 87% → 71%); a single open domain (Königsallee) is unaffected. `6d3f5af`
- **Bug 93** — building class reads "Not re-classified · use conversion" for T-04
  instead of a bare "—" / "eaves height not recorded". `53380b1`
- **Bug 72** (deferred 3 sprints) — wizard map printed "Currently active: München
  … Other regions follow" on a Leipzig project. Honest non-München caption when
  the address is valid + non-München (no geocoder / pilot refactor). **App-run
  verified** via Playwright. `a7ab787`
- **C11** — `sachsen-t04-leipzig.json` fixture (real persona key shapes) +
  `runSaxonyT04` (smoke:architect +23) + T-04 PDF assertions (smoke:pdf-text +13)
  incl. the **Bug 92 cross-surface assertion**. The fixture-render gate caught a
  silent C7b regression (exact-match role scrub missed after `stripVersionTokens`
  ate the em-dash space) — fixed with a tolerant regex. `0467a99`

Deferred: 105 (multi-page Key Data table = Bug 78) + 109 (signature collision =
Bug 60) — deep PDF layout; persona-side Bug 63 (`recommendations_delta`); the 7
other München/BayBO-framed `COST_BANDS_BY_TEMPLATE` entries (web Cost tab). The
template-blind pattern will keep biting T-06/T-07/T-08 until each gets this pass.

Gates every commit: bayern-sha `b18d3f7f…3471` MATCH · 16-state matrix 16/16 ·
pdf-text 289/0 · citations · architect 237/0 · chat-ux 18/0 · bundle ~284 KB gz ·
lint net-zero (8/2 pre-existing). No chat-turn redeploy, no migrations, no
fabrication. v1.0.29.1 + v1.0.29.2 untouched.

## v1.0.29.2 — chat-UX overlap / auto-scroll / sidebar-desync hotfix (2026-05-25)

Rutik's T-02 Hamburg smoke walk (Round 10, mid-stream) exposed 4 chat-viewport
defects — all WIRING/BEHAVIOR in existing machinery, not missing features. See
`docs/V1_0_29_2_CHAT_UX_DIAGNOSIS.md`.

- **Bug 84** — auto-scroll didn't follow the persona STREAM. `useAutoScroll`
  fired only on the persisted turn; the streaming bubble had no `spec-tag`, so
  new sections crammed against the chips. Now scrolls the streaming anchor's top
  to topOffset on stream-start, gated by near-live-edge (no fighting a user
  reading history). `f367c65`
- **Bug 85** — fixed 200px input-zone reserve overflowed (stacked mobile chips +
  multi-line textarea ≈ 276px). ResizeObserver → `--chamber-input-h` → thread
  padding + zone margin track the real height +24px. `3723c06`
- **Bug 86** — stale previous-turn chips stayed visible (dimmed) while a new
  section composed. Now hidden entirely while thinking/streaming, re-rendered
  fresh on land. `5fde4a2`
- **Bug 87** — sidebar "speaking now" used a different source (state-based
  first-not-done) than the header (recentSpecialist), so they disagreed
  mid-stream. Single-sourced the spine live-marker to recentSpecialist. `4e1baf0`

Decision logic extracted to `chatUxDecisions.ts` + a new `smoke:chat-ux` gate
(18 assertions, CI-wired) `6651aad`. **Verification:** DOM/visual bugs — the
deterministic logic is gated; scroll/overlap/loading feel is confirmed by the
operator smoke walk (no browser runner; Playwright deferred to an infra sprint).

Gates every commit: bayern-sha MATCH · 16-state matrix 16/16 · pdf-text ·
citations · architect 200/0 · smoke:chat-ux 18/0 · bundle ~282 KB gz. No
chat-turn redeploy, no migrations, no PDF-surface change.

## v1.0.29.1 — Bug 83 verfahren fact-key alignment + Bug 52 re-audit (2026-05-25)

Post-ship validation pass (before the operator smoke-walk) caught that the
v1.0.28/29 procedure-conclusion fixes (Bug 52, 66, 73, 79) read only
`verfahren_indikation` / `PROCEDURE.TYPE`, but the real persona emits the
conclusion under the dotted `verfahren.typ` fact (PDF Key Data "Verfahren ·
Typ"). The hand-crafted fixtures used `verfahren_indikation`, masking the
mismatch — a real re-walk would have shown "Baugenehmigungsverfahren (regulär) ·
ASSUMED" + the "Landesbauordnung Hamburg" Domain B stub again.

- `exportPdf.ts` + `composeLegalDomains.ts` — read `verfahren_indikation ??
  PROCEDURE.TYPE ?? verfahren.typ ?? verfahren_typ`. NOT sourced from
  `state.procedures` (the Königsallee T-03 fixture proved `procedures[0]` can
  contradict the more-correct deterministic `resolveNrwSanierung` § 62 verdict —
  that must keep winning when no explicit procedure-type fact is present).
- Bug 52 re-audit: the `nrw-t05` fixture had the same masking. Both fixtures
  updated to the real shape (`verfahren.typ` + representative `state.procedures`).
- Deferred to v1.0.30: web Procedure-tab qualifier override (resolveProcedures
  returns the persona's ASSUMED verbatim — the PDF now re-derives CALCULATED).

Render-proven at the real key: T-02 PDF "§ 61 HBauO · ERFORDERLICH · BERECHNET"
(was regulär · ASSUMED); web Domain B "§ 61 HBauO"; T-05 "§ 62 verfahrensfrei"
(no § 65); Königsallee § 62 unchanged. Gates: SHA MATCH · matrix 16/16 ·
pdf-text · citations · architect 200/0 · bundle 281.5 KB gz. `5e92c14`

## v1.0.29 — T-02 MFH Hamburg pipeline alignment + Stadtstaat Bayern-bleed (2026-05-25)

Rutik's first live T-02 (New build MFH, Hamburg, Mönckebergstraße) smoke walk
proved the v1.0.28 fixes were T-05-scoped and exposed a NEW class: Bayern-
authored topic tables leaking München/BayBO into every non-Bayern web render.
19 bugs (64-82) diagnosed — 5 with root causes that CORRECTED the launch prompt
(read code over prompt). See `docs/V1_0_29_T02_HAMBURG_DIAGNOSIS.md`.

**CODE-COMPLETE (fixture/render-proven, gate-green every commit):**
- **Bug 65** — Stadtstaat/non-Bayern Bayern-snippet bleed (highest-impact,
  15-state). `legalRuleSnippets.ts` + `humanizeFact.ts` rendered "BayBO and
  BayTBest" / "Munich StPlS 926" for every state; now bundesland-gated →
  federal-neutral, Bayern byte-identical. `335f751`
- **Bug 64** — T-02 cost reads `wohnflaeche_gesamt_m2` (=720), no 180 m² default
  (was a missing fact key, not a missing branch). `58434dd`
- **Bug 66** — web Legal Landscape Domain B substantive for stub T-02 (DIN 4109
  matcher). `3648d02`
- **Bug 67** — MFH role floor via union (persona's thin 1-role emission no
  longer suppresses the baseline 5) + version-token scrub (`v1.0.21` leaked from
  stateCitations STUB_VERIFY). `03b73df`
- **Bug 68** — T-02 MFH deterministic suggestions (Bauvoranfrage + core team),
  no fabricated chamber URL/KfW. `095eeb8`
- **Bug 69 + 70** — progress floors on spine-stage completion + synthesis
  handoff fires the existing BriefingCTA to hero/ready (was 55%@round-12, no
  CTA). Pure SPA. `4adf8a3`
- **Bug 71 + 81** — DE+EN labels for all T-02 fact keys (no more "Okff Oberstes
  Geschoss M" raw-key leak, PDF + web). `2e6346b`
- **Bug 75** — PDF Data Quality reads "decided", not "verified" (matches web;
  was "54% verified" on 0 sign-offs). `2e6346b`
- **Bug 79 + 73** — `resolveProcedure` honors persona "vereinfacht" → § 61 HBauO
  + CALCULATED (was "regulär" + ASSUMED). `f68998e`
- **Bug 80** — killed the hardcoded "Gebäudeklasse 1–3" exec clause that
  contradicted the GK 4 MFH (condition on Sonderbau instead). `f68998e`
- **Bug 74** — neubau document baseline (Standsicherheit, Brandschutz, GEG,
  Schallschutz DIN 4109, Entwässerung, Stellplatz) + both surfaces show the
  canonical required list, not the persona's thin one (1 doc → 9).
- **Bug 82** — scrubbed `v1.0.23` + `docs/cost-formula.md` from the PDF glossary.
- **Bug 76 + 77** — cover template-field clamp + procedure-heading clamp
  (`ellipsizeToWidth`), render-verified no overflow.

**DEFERRED to v1.0.30 (flagged, with evidence):**
- **Bug 72** — wizard map shows München for non-Bayern. The map is München-
  locked at the geocoder + bounds layer (Phase-5 narrowing); recentering
  nationwide crosses the pilot product boundary — deep, not surgical.
- **Bug 60** — verification-page signature overlap (deep PDF layout; carried
  from v1.0.28).
- **Persona-side (no chat-turn redeploy this sprint):** thin role/suggestion/
  recommendations_delta emission; `wohnflaeche_gesamt_m2` vs `wohnflaeche` and
  the dotted-vs-snake fact-key naming inconsistency; the inline synthesis banner.
- **T-04 / T-06 / T-07 / T-08** — same template-blind pattern.
- Per-state `legalRuleSnippets` authoring (NRW / BW / Hessen / Niedersachsen).

Gates every commit: bayern-sha MATCH · 16-state T-01 matrix 16/16 · T-05 fixture
green · new Hamburg T-02 fixture + Bayern regression assertions · smoke:architect
200/0 · pdf-text · citations · build · bundle ~281 KB gz. No Edge Function
redeploy, no migrations. Net-zero lint.

## v1.0.28 — T-05 demolition pipeline alignment (NRW exemplar) (2026-05-24)

Rutik's first live smoke walk of a never-before-tested template (T-05 Abbruch,
NRW, Bonn) exposed that the deterministic result/PDF pipeline is TEMPLATE-BLIND:
the chat persona was state-correct (verfahrensfrei § 62 BauO NRW) but the
downstream resolvers / cost / risk / do-next / timeline / legal-domain composers
assumed T-01 shape and overrode it. 12 bugs (52-63) diagnosed; this sprint fixes
the T-05 NRW exemplar + documents the pattern. See `docs/V1_0_28_T05_DIAGNOSIS.md`.

**CODE-COMPLETE (fixture/render-proven, gate-green):**
- **Bug 52** — `resolveProcedure` honors the persona's `verfahren_indikation`
  fact; PDF emits verfahrensfrei § 62 BauO NRW (was § 65 "standard permit
  REQUIRED" — a chat-vs-PDF contradiction). `62dcca3`
- **Bug 53 + Bug 30** — T-05 cost = honest "request quotes" stub (PDF + web);
  removed the HOAI new-build rows + the Energy-consultation line + the 180 m²
  silent default. No invented BKI (C11_DATA_GAPS GAP-4). `aa98ee6`
- **Bug 54** — web Legal Landscape Domain B is state-aware for ALL 15 non-Bayern
  states (was gated `if (isBayern)` → empty). Not T-05-specific. `1db2955`
- **Bug 55** — wizard coverage warning is state-tier-aware (no "outside Munich"
  on supported NRW/BW/Hessen/Niedersachsen); honest copy. `934b82d`
- **Bug 56** — Do-Next demolition baseline (Schadstoffgutachten → contractor →
  confirm), not the generic "engage architect / pre-meeting Bauamt". `6d5e863`
- **Bug 57** — risk register template/fact-filtered: T-05 shows demolition risks;
  B-Plan/Heritage/Pre-decision/Bauamt-backlog suppressed (Heritage fact-gated on
  `denkmalschutz`). `4bcae1f`
- **Bug 58** (PDF) — T-05 verfahrensfrei timeline = survey/procurement/demolition
  (~5-10 wks), no Bauamt review cycle / "Baugenehmigung issued". `224e80c`
- **Bug 59** — cover footer clamps a long Bauherr name (no overlap with the
  centered PRELIMINARY cell). `a880c9b`
- **Bug 61** — Stadtarchiv caveat resolves the city from the project address
  ("Bonn"), not the hardcoded NRW default "Düsseldorf". `a880c9b`

**FLAGGED for v1.0.29 (persona-side / deep — out of this sprint's scope):**
- **Bug 60** — verification-page signature/note overlap (PDF layout; not a
  surgical fix — deferred to avoid layout regression). Evidence: PDF p10.
- **Bug 62** — team specialist staleness ("year unknown" vs Baujahr 1978;
  "neighbouring buildings" on a detached demo). PERSONA-emitted `state.roles`;
  the deterministic baseline (`deriveBaselineRoles` DEMOLITION_ROLES) is clean.
  No chat-turn redeploy this sprint.
- **Bug 63** — empty `state.recommendations` (→ empty Suggestions tab + PDF
  recommendations). Persona never emits a `recommendations_delta` (persistence
  path works). The Do-Next deterministic baseline (Bug 56) is the mitigation.
- **Bug 58 (web)** — CostTimelineTab "Procedure duration" sub-detail (Overview +
  PDF headline timeline are correct).

**Pattern + scope:** T-02/T-04/T-06/T-07/T-08 carry the same template-blind
shapes (cost 180-default, generic do-next, T-01 timeline/risks) — flagged for
v1.0.29+. Edge Functions: no redeploy. Migrations: none.

> **Verdict: 🟡 not-GREEN for full-Germany.** v1.0.28 closes the T-05 NRW
> exemplar (9 bugs code-complete + render-proven) + documents the pattern; 3
> bugs deferred (persona-side / deep) + 5 templates remain.

## v1.0.27 — C7 + C8: architect verification flow wired (2026-05-24)

Backend (share-project CREATE/ACCEPT + verify-fact + RLS + project_members)
was complete since Phase 13; the flow was unreachable because no owner-side
UI called share-project CREATE (docs/ARCHITECT_FLOW_DEADEND_TRACE.md). This
sprint wires the missing caller + reactive UI + lifecycle correctness — the
legal shield is now reachable end-to-end through the shipped UI.

**C7 — owner invite flow (closes Bug 29):**
- `architectInviteApi.ts` — share-project CREATE wrapper (raw-fetch mirror
  of shareTokenApi; typed errors; no fabricated 409).
- `InviteArchitectModal.tsx` — emerald verification-invite UI, deliberately
  distinct from the read-only briefing modal; generates the
  `/architect/accept?token=…` link via react-query (effect-free, no
  duplicate invite rows).
- result-footer "Invite architect to verify" CTA; "Send to architect"
  relabelled "Send read-only briefing"; share link relabelled read-only.

**C8 — verification lifecycle:**
- **Bug 32 (reactive footer)** — `useVerificationReactivity`: focus-poll
  PRIMARY (invalidates `['project',id]`) + best-effort projects-UPDATE
  realtime. Migration `0035_realtime_projects.sql` (manual SQL-Editor apply)
  enables the realtime half; focus-poll works without it.
- **Bug 32 (erosion half)** — `erodeVerificationOnEdit` at the fact-upsert
  seam: an owner edit changing a verified fact's value downgrades it to
  DESIGNER+ASSUMED + "re-verification required"; same-value re-write
  preserves it. Server-side (chat-turn pipes through the shared module).
- **Bug 33** — `computeVerificationRollup` + `VerificationProgress`
  ("X of N items verified"); per-page PDF footer flips to "Verified …" when
  all load-bearing items are DESIGNER+VERIFIED. (Scoped follow-up:
  editorial-page center footers in the all-verified end-state.)
- **Bug 34** — reject/un-verify via a `verify-fact` `action:'verify'|'reject'`
  overload (no new function/migration; `qualifier.rejected` already in the
  0027/0029 views). Reject → DESIGNER+ASSUMED + required reason; per-row
  "Ablehnen" affordance in VerificationPanel.

**UNVERIFIED (pending Rutik):** apply migration 0035 (SQL Editor) + redeploy
the verify-fact Edge Function (Deno; reject action) + the e2e legal-shield
smoke walk (owner invite → architect accept → verify → footer clears →
reject → reverts). Tests are mock-only (smoke:architect 29/0); no live
invites are run. No architect display name is fabricated (not in schema).

> **Verdict: 🟡 not-GREEN for full-Germany.** v1.0.27 closes the architect-
> flow surface; data-bearing sections (Bug 27 calendar, Bug 35 cost, stub
> states, Section XII) remain — see docs/C11_DATA_GAPS.md.

## v1.0.26 — C11: 16-state PDF matrix + CI hardening (2026-05-24)

Closes the deterministic-PDF-render coverage gap across all of Germany.
Bug 26 (`§ 65 BauO {CODE}` citation fabrication) is now FULLY CLOSED across
**all 16 Bundesländer**, not just the 2 stub states gated in v1.0.25.

**Closed (verified — Bayern SHA MATCH every commit; build green; matrix 16/16):**
- **Bug 11** — 16-state PDF smoke matrix. New `scripts/smoke-pdf-matrix.mts`
  renders one plain-residential T-01 fixture per Bundesland + the canonical
  `bayern-t03-verified` cell × DE/EN and asserts: no fabricated
  `§ NN BauO {code}` citation (NRW carved out — its real code IS "BauO NRW"),
  no Bayern-leak token in non-Bayern PDFs (BayBO/BLfD/Schwabing/München/…),
  DE/EN section-header parity, no ligature corruption, a real §/Art. for the
  5 substantive states, and honest "in Vorbereitung"/"being finalized" for
  the 11 stubs. 16/16 green, both locales. States covered: bayern, nrw, bw,
  hessen, niedersachsen (substantive); sachsen, brandenburg, thueringen,
  sachsen-anhalt, rlp, saarland, sh, mv (Flächenland stubs); berlin, hamburg,
  bremen (Stadtstaat stubs). 13 new fixtures authored; canonical slugs
  verified (rlp/mv/sh — NOT the long forms — per `states/_types.ts:29-45`).
- **Bug 48** — `verify:bayern-sha` wired into CI (`.github/workflows/test.yml`)
  alongside `smoke:pdf-matrix` + `smoke:citations`. The P0 Bayern-SHA
  invariant + 2 daily gates were manual-only; now CI-gated on every PR.
- **Bug 26 (full closure)** — the v1.0.25 three-source fix (resolveProcedure
  generic branch + Executive footer + structural cost-item, all driven off
  `getStateLocalization`) is now proven by render on the 13 previously-
  uncovered states. No source fabrication exists on the deterministic surface.

The matrix run found **no source bug to fix** — the one issue surfaced was a
harness false-positive (an overbroad proper-case "BauO {Land}" check colliding
with the intentional Bug-O honest glossary term, `glossary.ts:119`), resolved
in the harness, not source.

**Deferred (honest — needs sourced data, no fabrication; see `docs/C11_DATA_GAPS.md`):**
Bug 27 (München authority calendar on all states — generic label, not a brand
leak; needs per-state calendars), Bug 35 / Bug I (state cost multiplier —
honest baseline label shipped; needs sourced BKI), stub-state legal codes
(generic "BauO {Land}" placeholders; need sourced §§), and the UI / data-
bearing items (Bug 29 architect flow, Section XII / Vorhabensbeschreibung /
KfW BEG 458).

> **Verdict: full-Germany ship remains 🟡 not-GREEN.** v1.0.26 closes the
> deterministic-render surface across all 16 states + hardens CI. The
> legal-shield UI (Bug 29) and the data-bearing PDF sections remain open.

## v1.0.25 — Full-Germany Sprint (PARTIAL — deterministic-surface + schema tranche) (2026-05-24)

Driven by docs/FULL_GERMANY_AUDIT.md + the five probe docs. This sprint
landed the **bounded, fully-verifiable** subset of the 12-commit plan;
the large feature commits remain open (see "Not in this release").

**Closed (verified — tsc clean, smoke:pdf-text 276 passed, Bayern SHA
MATCH on every commit):**
- **Bug 39** — `0033_projects_state_version.sql` merged to main from
  branch `feature/v1-0-6-race-fix` (idempotent; reconciles the prod
  ghost deploy). *Apply via SQL Editor; not auto-applied.*
- **Bug 26** — `§ 65 BauO {CODE}` citation fabrication. The smoke guard
  surfaced **three** render sources (not one): `resolveProcedure`
  generic branch, the Executive footer (`§ 62/64 BauO {state}`, also
  wrong for Bayern), and the structural cost-item basis
  (`§ 68 BauO {state}`). All now driven by `getStateLocalization` —
  real §/Art. for substantive states, honest "Landesbauordnung {Land}"
  / "in Vorbereitung" for stubs. New stub-state fixtures + a CI-wired
  fabrication guard (`smoke:pdf-text`, Band 11's missing 5th gate).
- **Bug 42** — city hardcode killed; `resolveCityFromPLZ` (Bayern-only,
  PLZ-accurate) + `0034` cleanup migration for the frozen-`muenchen`
  rows.
- **Bug 28** — `REGION_MULT` lowercase-normalized; user-facing label
  fixed (was "Bundesland-Faktor bayern").
- **Bug 43** — corrected the false `winAnsiSafe` ligature rationale +
  added a `decomposeLigatures` regression guard.
- **Bug 50** — removed stale "wizard hardcodes 'bayern'" comments
  (`legalRegistry.ts`, `systemPrompt.ts`).

**NOT in this release (honestly deferred — large features / need
sourced data / runtime validation):** Bug 27 (per-state authority
calendar — needs sourced closure data), Bug 29/32/33/34 (architect
invite UI + reactive footer + reject — codeable but e2e-unvalidatable
here), Bug 31 (move leak guards into chat-turn + result UI), Bug 35/6b
(cost-engine fallback removal), Section XII / Vorhabensbeschreibung /
concrete KfW BEG 458 (need sourced legal/financial data — will not
fabricate), Bug 11 (16-state PDF matrix), Bug 48 (bayern-sha into CI).

> **Verdict: full-Germany ship remains 🟡 not-GREEN.** This tranche
> hardens the deterministic surfaces + schema; the legal-shield UI and
> the data-bearing sections are still open. No blanket "GREEN" is
> claimed — see the per-item status in the session report.

## v1.0.24 — Root-Cause Closure Sprint (2026-05-13)

Closes 4 of 5 v1.0.22/23 follow-up items from BACKLOG.md. Each fix is
upstream of an existing user-visible guard; the runtime guards stay
(belt-and-braces) while the upstream pipes get cleaned. Bug I (Path A
real BKI factors) honestly deferred — no authoritative source data
exists in the repo as of v1.0.24.

> **Empirical validation gap (acknowledged)**: v1.0.21 + v1.0.22 +
> v1.0.23 + v1.0.24 have shipped 28 bug closures across 25 commits
> without intervening end-to-end empirical validation against the
> rendered PDF. All closures are fixture-validated. The next human
> walk-through is the recommended trigger for any further sprint
> scope. v1.0.25 should not ship until the empirical gate is struck.

Sprint anchor:
- Bayern composeLegalContext SHA `b18d3f7f9a6fe238c18cec5361d30ea3a547e46b1ef2b16a1e74c533aacb3471`
  unchanged across all 4 commits.

### Bugs fixed (in commit order)

1. **Bug Q extension** — CLIENT/USER/BAUHERR+VERIFIED write-time gate.
   `gateQualifiersByRole` in `src/lib/projectStateHelpers.ts`
   extended. Client-side VERIFIED is downgraded to CLIENT+DECIDED at
   chat-turn boundary. Asymmetry with DESIGNER+VERIFIED (kept at
   +ASSUMED) is documented in the code — preserves Phase 13 §6.B.01
   v1.0.16 Bug 32 display path. JS port in smokeWalk.mjs + Deno tests
   in `qualifierGate.test.ts` updated in lock-step.
2. **Bug R extension** — DESIGNER source downgrade now fires at Top-3
   Executive + Section VIII Recommendations (in addition to v1.0.23's
   Key Data path). `normalizeDesignerWithoutInLoop` is now a top-level
   import in `exportPdf.ts`; `hasInvitedDesigner` computed once,
   threaded into every qualifier-emit site.
3. **Bug K root-cause** — chat-turn persona prompt's
   `buildLocaleBlock(en)` in
   `supabase/functions/chat-turn/systemPrompt.ts` leads with a
   prominent "OUTPUT LANGUAGE: ENGLISH" banner that enumerates every
   bilingual emit field + the legal-term-of-art exceptions (§
   citations, authority names, proper-noun anchors). The runtime
   guard (v1.0.22 `sanitizeGermanContentOnEnglish`) stays as
   belt-and-braces.
4. **Bug D wizard integration** — `parseAddressBlob` is now called on
   wizard submission in `useCreateProject.ts`. PLOT.ADDRESS.STREET /
   HOUSENUMBER / POSTALCODE / CITY facts are seeded as CLIENT/DECIDED
   (or CLIENT/ASSUMED on partial parse). PLZ-bundesland sanity check
   surfaces a LEGAL/ASSUMED mismatch fact when PLZ doesn't match
   selected bundesland. UI confirmation step + lazy migration parked
   for v1.0.25.

### Bug I — Path A deferred (honest)

Search of `src/features/result/lib/costNormsMuenchen.ts` + the
codebase produced no authoritative per-state BKI factor data. The
discipline anchor forbids fabricating cost multipliers for unverified
regions (mirror of v1.0.21's "never fabricate §§ for unverified
states"). Path A stays parked until source-cited per-state values +
validation evidence against real architect quotes land. v1.0.22's
Path B honest-baseline framing remains in effect.

### Non-regression verification (v1.0.21/22/23 fixtures)

Per sprint spec, before tagging:

| Check | Result |
|---|---|
| Bayern SHA b18d3f7f...3471 | ✓ MATCH |
| All 245 v1.0.23 pdf-text fixtures | ✓ pass (now 257 with sprint additions) |
| Bug 23-PRIME: Berlin no "Stadtarchiv Düsseldorf" / "Königsallee" | ✓ held |
| Bug 23: Berlin no "BayBO Art. 61" / "BayBO Art. 62" | ✓ held |
| Bug 23b: Berlin no "BauVorlVO NRW" | ✓ held |
| Bug 23c: Berlin no "Schwabing" / "BLfD" | ✓ held |
| Bug 23d: Berlin no "BayDSchG" | ✓ held |
| Bug E: Berlin "Procedure determination deferred" + BLOCKER, no "Simplified permit · REQUIRED" | ✓ held |
| Bug M: Berlin confidence ≤ 45 (got 34); NRW ≥ 60 (got 72) | ✓ held |
| Bug F: Berlin Documents → Bauvoranfrage placeholder | ✓ held |
| Bayern verified fixture: BayBO + BLfD present; DESIGNER + AUTHORITY+VERIFIED preserved | ✓ held |

### Gate status (final, on tag)

| Gate                        | Status                              |
| --------------------------- | ----------------------------------- |
| `npm run verify:bayern-sha` | ✓ MATCH                             |
| `npm run smoke:citations`   | ✓ static gate green (+15 new checks across Bug K + Bug D + Bug Q ext + Bug R ext drift) |
| `npm run smoke:pdf-text`    | ✓ 257 passed · 0 failed (+12 over v1.0.23's 245) |
| `npx tsc --noEmit`          | ✓ clean                             |
| `npm run build`             | ✓ 274.2 KB gz (ceiling 300 KB)      |

### Fixture growth this sprint

- `smoke:pdf-text`: +12 unit assertions (245 → 257). Distribution:
    - Bug Q ext: +6 (write-time gate matrix: CLIENT / BAUHERR / USER /
      AUTHORITY / LEGAL / DECIDED no-op)
    - Bug R ext: +6 (DESIGNER quality matrix with and without
      invitedDesigner)
    - Bug K: 0 pdf-text (no fixture impact — chat-turn not exercised)
    - Bug D: 0 pdf-text (wizard fixture not in smoke harness)
- `smoke:citations`: +15 new static checks (Bug Q ext JS-port + 2
  fixture updates; Bug R ext drift on Bug 32 + Bug 25 anchors; Bug K
  root drift on systemPrompt + germanLeakGuard; Bug D drift on
  useCreateProject).

### Autonomous decisions

- **Bug Q ext**: I preserved the DESIGNER+VERIFIED → DESIGNER+ASSUMED
  Phase 13 §6.B.01 invariant rather than switching DESIGNER to also
  go to DECIDED. The asymmetry is documented inline and load-bearing.
- **Bug R ext**: I changed the DESIGNER+ASSUMED display behavior
  slightly. Pre-v1.0.24: v1.0.16 Bug 32 mapped DESIGNER+ASSUMED →
  LEGAL+CALCULATED at render. Post-v1.0.24: `normalizeDesignerWithoutInLoop`
  fires FIRST (DESIGNER+ASSUMED → LEGAL+ASSUMED), then formatQualifier
  renders LEGAL+ASSUMED unchanged. User-facing change: clay ASSUMED
  pill instead of green CALCULATED pill on no-invitedDesigner
  projects.
- **Bug K root**: I added the OUTPUT LANGUAGE banner BEFORE the
  existing NUTZER-LOCALE German block rather than replacing it. The
  existing block carries detailed PFLICHT lists; replacing risks
  regression. The new lead is purely additive.
- **Bug D**: I shipped the minimal-integration path (programmatic
  parse + seed on submission) and parked the UI confirmation +
  lazy migration. Rationale documented in BACKLOG.md.
- **Bug I**: Honest deferral. No fabrication. Parked in BACKLOG.

## v1.0.23 — Cosmetic & Cleanup Sprint (2026-05-13)

Closes the 8 remaining P2 cleanup bugs from BACKLOG.md, all surfaced
by the v1.0.20 NRW × T-01 + Berlin × T-01 testing sweep. Combined
with v1.0.21 (7 bugs) and v1.0.22 (6 bugs), every one of the 24
originally-surfaced bugs from that sweep is now closed.

Sprint anchor:
- Bayern composeLegalContext SHA `b18d3f7f9a6fe238c18cec5361d30ea3a547e46b1ef2b16a1e74c533aacb3471`
  unchanged across every commit.

### Bugs fixed (in commit order)

1. **Bug L** — "0 m² Fassade" placeholder leak. PDF cost basis line
   renders "Computed from floor area only (façade area not captured)"
   / "Berechnet ausschließlich aus Wohnfläche (Fassade noch nicht
   erfasst)" when `fassadenflaeche_m2` is unset or zero. New
   `costs.basisTemplate.noArea` pdfStrings keys (EN + DE).
2. **Bug N** — system flag filter. New
   `src/legal/systemFlagFilter.ts` with explicit allowlist + prefix/
   suffix rules. PDF Key Data table filters keys matching
   `plot.outside_munich_acknowledged`, `system.*`, `_internal*`,
   `_system*`, `*_acknowledged`, `*.acknowledged` before rendering.
3. **Bug P** — label width truncation. Top-3 Executive + Section
   VIII Recommendations renderers measure pill width + wrap to a
   half-line below the title when overflow would clip. "HOHE
   PRIORITÄT" and "CONFIRM" now render in full.
4. **Bug J** — 30-day banner gating. Cover footer renders
   "ARCHITECT-VERIFIED" / "SUBMITTED · Bauamt confirmation on file"
   when an AUTHORITY+VERIFIED or DESIGNER+VERIFIED fact qualifier is
   present (or project.status is submitted/approved). The 30-day
   validity stamp is suppressed on verified projects.
5. **Bug R** — DESIGNER source downgrade when no designer in loop.
   New `normalizeDesignerWithoutInLoop` in
   `src/lib/qualifierNormalize.ts`. PDF Key Data renders
   `LEGAL · CALCULATED` instead of `DESIGNER · DECIDED` on projects
   without an `invitedDesigner` field set. Bayern verified fixture
   (with `invitedDesigner`) continues to render `DESIGNER ·`
   qualifiers — regression guard.
6. **Bug S** — i18n label coverage. 22 new entries each in
   `factLabels.de.ts` + `factLabels.en.ts` covering the v1.0.21/22
   snake_case fact keys. Cross-language fallback added to
   `factLabel.ts` — when the requested locale's table misses, fall
   back to the other locale's entry (with `[i18n]` prefix in dev) so
   no humanize-fallback labels surface in production rendered text.
7. **Bug O** — state-aware glossary entries. PDF page 12 now
   filters its 12-entry list by project bundesland. Federal entries
   (BauGB, GEG, HOAI, BKI, ÖbVI, LP, KfW, Bauamt,
   Bauvorlageberechtigte/r, Verfahrensfreiheit) always render;
   state-specific BauO + DSchG entries swap per state via
   `getStateCitations`. Stub states render honest-deferral phrasing.
   Bayern adds BayBO + BayDSchG + BLfD entries.
8. **Bug D** — deterministic address blob parser. New
   `src/lib/addressParser.ts` with `parseAddressBlob` returning
   `ParsedAddress { street, hausnummer, plz, stadt }` or
   `UnparsedAddress { fallbackToStructured: true }` on malformed
   input. `plzMatchesBundesland` cross-check for downstream
   sanity-warning UX. Parser shipped + tested; wizard wiring parked
   for v1.0.24.

### New files

- `src/legal/systemFlagFilter.ts` — user-facing-table filter rules.
- `src/lib/addressParser.ts` — deterministic address blob parser.
- `test/fixtures/bayern-t03-verified.json` — Bayern Sanierung
  fixture with AUTHORITY+VERIFIED qualifier + invitedDesigner.

### Gate status (final, on tag)

| Gate                        | Status                              |
| --------------------------- | ----------------------------------- |
| `npm run verify:bayern-sha` | ✓ MATCH                             |
| `npm run smoke:citations`   | ✓ static gate green                 |
| `npm run smoke:pdf-text`    | ✓ 245 passed · 0 failed (+64 over v1.0.22's 181) |
| `npx tsc --noEmit`          | ✓ clean                             |
| `npm run build`             | ✓ 273.4 KB gz (ceiling 300 KB)      |

### Fixture growth this sprint

- `smoke:pdf-text`: +64 assertions (181 → 245). Distribution by
  commit:
    - Bug L: +4 (honest no-area + no-0m² × langs)
    - Bug N: +12 (10 unit cases + 2 PDF render × langs)
    - Bug P: +2 (full priority label × langs)
    - Bug J: +4 (verified banner + no-30-day × langs)
    - Bug R: +6 (no-DESIGNER × 2 fixtures × langs + regression)
    - Bug S: +20 (factLabel coverage × 10 keys × 2 locales)
    - Bug O: +7 (NRW + Bayern + Berlin state-aware checks)
    - Bug D: +9 (4 parse cases + 5 PLZ-bundesland)
- `smoke:citations`: 0 new static checks (Bug O allowlist update
  preserves the existing gate).

### Autonomous decisions

- **Bug L**: Gated only on the cost-basis line. `factValueWithUnit`
  doesn't currently emit "0 X unit" for any rendered fact; wider
  audit parked for v1.0.24 if a future smoke walk surfaces another
  instance.
- **Bug N**: Extracted filter into `src/legal/systemFlagFilter.ts`
  module so future UI tables (LedgerPeek facts column, etc.) can
  adopt the same gate by import.
- **Bug P**: Wrap-below approach chosen over widen-pill — more
  robust to future label additions.
- **Bug J**: ARCHITEKT treated as alias of DESIGNER (canonical Source
  enum). Persona-emitted ARCHITEKT is chat-turn-normalized to
  DESIGNER before state persistence.
- **Bug R**: Gate applied at Key Data render path only; Top-3 +
  Section VIII rows don't currently carry DESIGNER source on the
  smoke fixtures. v1.0.24 can extend if a future smoke walk surfaces
  a leak there.
- **Bug S**: Registered snake_case fact keys directly instead of
  converting to DOMAIN.SUBKEY shape — chat-turn persona emits
  snake_case as the canonical key.
- **Bug O**: BKI glossary entry rolled the v1.0.22 Path B honesty
  notice into the definition itself, so the bauherr reading the
  glossary sees the same discipline as the cost-formula label.
- **Bug D**: Parser shipped + tested as a pure helper. Wizard
  integration parked for v1.0.24 — the wizard's current
  blob-verbatim flow needs empirical validation before swapping in
  the parsed shape.

## v1.0.22 — Data Integrity Sprint (2026-05-13)

Closes 6 P1 data-integrity defects deferred from the v1.0.21 BACKLOG:
Building class derivation (C), Documents UI/PDF unification (F),
i18n leak on persona output (K), VERIFIED qualifier authority guard
(Q), Donut/cover denominator unification (B), and Cost-formula
honesty (I).

Sprint anchor:
- Bayern composeLegalContext SHA `b18d3f7f9a6fe238c18cec5361d30ea3a547e46b1ef2b16a1e74c533aacb3471`
  unchanged across every commit.

### Bugs fixed (in commit order)

1. **Bug C** — Unified MBO § 2 Abs. 3 Gebäudeklasse derivation.
   `src/legal/deriveGebaeudeklasse.ts` (new) returns
   `{ klasse, qualifier, reasoning }`. Threaded through UI overview
   (AtAGlance) and PDF Key Data. Honest deferral when Höhe AND
   Geschosse are both missing — never a fabricated GK number.
2. **Bug F** — Documents UI/PDF unification via new
   `src/features/result/lib/resolveDocuments.ts`. Both surfaces
   consume the same envelope (required + on-file + blockedByVoranfrage).
   When v1.0.21 Bug E's hard blockers fire, both surfaces collapse
   to a single "pending Bauvoranfrage" placeholder.
3. **Bug K** — i18n leak on dynamic persona output.
   `src/legal/germanLeakGuard.ts` (new) runtime guard
   `sanitizeGermanContentOnEnglish` scans for ≥ 2 German morphology
   tokens on EN exports and renders an honest placeholder
   ("(German content; English translation pending)") rather than
   surfacing mixed-language strings. Applied to Top-3 + Recommendations
   surfaces.
4. **Bug Q** — VERIFIED qualifier authority guard.
   `src/lib/qualifierNormalize.ts` (new) + extended
   `getQualifierLabel` in pdfPrimitives. CLIENT / USER / BAUHERR +
   VERIFIED → CLIENT + DECIDED; DESIGNER + VERIFIED → DESIGNER +
   DECIDED (architect-loop verification ships post-v1.0.22).
   LEGAL/AUTHORITY + VERIFIED pass through. Read-time defense in
   depth on top of the write-time gate.
5. **Bug B** — Donut/cover denominator unification. PDF Verification
   page now sources from `aggregateQualifiers(state)` (all 5
   categories) instead of walking facts only. Donut + cover percent +
   verification page share the underlying counts.
6. **Bug I** — Honest BKI regional-factor framing (Path B). Cost-row
   labels in pdfStrings + stateLocalization rewritten to drop the
   misleading "regional BKI factor (X)" claim. New text: "HOAI Zone
   III · German baseline (regional variance ±10%)". `docs/cost-
   formula.md` documents the decision and the Path A trigger for
   v1.0.23+ once authoritative BKI data lands.

### New files

- `src/legal/deriveGebaeudeklasse.ts` — MBO § 2 Abs. 3 unified GK
  derivation.
- `src/legal/germanLeakGuard.ts` — runtime guard against German
  morphology on EN exports.
- `src/lib/qualifierNormalize.ts` — VERIFIED authority guard.
- `src/features/result/lib/resolveDocuments.ts` — unified UI/PDF
  document resolver.
- `docs/cost-formula.md` — Path A/B rationale for the cost-formula
  honest-framing decision.

### Gate status (final, on tag)

| Gate                        | Status                              |
| --------------------------- | ----------------------------------- |
| `npm run verify:bayern-sha` | ✓ MATCH                             |
| `npm run smoke:citations`   | ✓ static gate green                 |
| `npm run smoke:pdf-text`    | ✓ 181 passed · 0 failed (+37 over v1.0.21's 144) |
| `npx tsc --noEmit`          | ✓ clean                             |
| `npm run build`             | ✓ 272.7 KB gz (ceiling 300 KB)      |

### Fixture growth this sprint

- `smoke:pdf-text`: +37 assertions (144 → 181). Distribution by
  commit:
    - Bug C: +9 (5 unit cases + 4 PDF render: honest-deferral +
      no-fabricated-GK × langs)
    - Bug F: +4 (blocked placeholder + no auto-Lageplan × langs)
    - Bug K: +9 (4 unit cases + 4 EN-leak + 1 DE regression)
    - Bug Q: +7 (7 unit cases for normalization rules)
    - Bug B: +4 (denominator structural assertions × 2 fixtures × 2
      invariants)
    - Bug I: +4 (honest baseline phrase + no BKI factor × langs)
- `smoke:citations`: 2 static checks rewired to track v1.0.22
  behavior (basisTemplate honest framing + Bug 41+42 already done
  in v1.0.21).

### Autonomous decisions

- Bug K: persona-prompt fix (root-cause repair in chat-turn edge
  function) deferred to v1.0.23 or a chat-side sprint. Runtime guard
  is sufficient as a user-facing fix; full root-cause fix needs
  separate empirical validation that no Bayern fixture is regressed.
- Bug Q: read-time normalization applied (in getQualifierLabel)
  rather than extending the chat-turn write-time gate. Same surface
  covered; chat-turn gate extension parked for v1.0.23.
- Bug I: Path B chosen per sprint spec recommendation. REGION_MULT
  table preserved for Path A wiring once authoritative BKI data
  lands; only the user-facing label is honest about the current
  no-op state.
- Bug C fixtures: 5 unit-style assertions in the smoke harness instead
  of 4 extra PDF renders (would have added ~25 s per smoke run).
  End-to-end PDF integration still tested on the Berlin fixture.

## v1.0.21 — Bundesland Truth Sprint (2026-05-13)

Closes 7 P0/P1 defects surfaced by the v1.0.20 NRW × T-01 Königsallee
30 (11 bugs) and Berlin × T-01 Pariser Platz 1 (13 bugs) test cells.
Every fix is state-aware: Bayern continues to render verified BayBO §§
and BLfD references; non-Bayern projects render the state-correct
citation; the 11 minimum-content Bundesländer (Berlin / Hamburg /
Bremen / Brandenburg / MV / RLP / Saarland / Sachsen / Sachsen-Anhalt /
SH / Thüringen) render honest-deferral placeholders. No fabricated
citations on unverified states.

Sprint anchor:
- Bayern composeLegalContext SHA `b18d3f7f9a6fe238c18cec5361d30ea3a547e46b1ef2b16a1e74c533aacb3471`
  unchanged across every commit. Verified by `npm run verify:bayern-sha`.

### Bugs fixed (in commit order)

1. **Bug 23-PRIME** — Cross-project content bleed (Stadtarchiv
   Düsseldorf / Königsallee leaking onto every project regardless of
   bundesland).
2. **Bug 23** — State-aware Specialists § citations (BayBO Art. 61 /
   Art. 62 was leaking onto Berlin / NRW / Hessen / NS / BW PDFs).
3. **Bug 23b** — State-aware Documents BauVorlagen citations
   (BauVorlVO NRW / § 64 BauO NRW / § 68 BauO NRW / DSchG NRW were
   leaking onto every project).
4. **Bug 23c** — State-aware Risk Register filters
   (Schwabing-Ensemble / BLfD / StPlS 926 / München Bauamt rotation
   were leaking onto non-Bayern projects; one entry had a `'Bayern'`
   uppercase typo that broke the existing filter).
5. **Bug 23d** — State-aware Legal Landscape DSchG citation
   (BayDSchG was the Sonstige-Vorgaben Denkmalschutz row label for
   every project; BayBO Domain-B matchers fired regardless of
   bundesland).
6. **Bug E** — Hard Blocker propagation to Procedure tab + PDF
   (MK use-type + Denkmalschutz + Sonderbau + a generic catch-all
   flag now short-circuit `resolveProcedure` to `bauvoranfrage` with
   explicit blocker reasoning, surface a BLOCKER card in the Top-3,
   and re-title the procedure card "Procedure determination
   deferred").
7. **Bug M** — Confidence formula multiplicative hard-blocker penalty
   (0.70 per active blocker, floor at 25; design rationale in
   `docs/confidence-formula.md`). Berlin × T-01 with 2 blockers drops
   from 79% (v1.0.20) to 35% (v1.0.21); NRW Königsallee clean
   project unchanged at 72%.

### New files

- `src/legal/stateCitations.ts` — single state-aware citation pack
  (archivCity, bauVorlagenAct, permitFormCitation,
  permitSubmissionCitation, structuralCertCitation,
  abstandsFlaechenCitation, denkmalSchutzAct, denkmalAuthority).
- `src/legal/crossStateBleedGuard.ts` — runtime sanitizer for any
  rendered string; logs + replaces tokens from states other than
  `project.bundesland`.
- `test/fixtures/berlin-t01-pariser-platz.json` — Berlin Neubau-EFH
  smoke fixture with hard blockers set (mk_gebietsart + denkmalschutz
  + bauvoranfrage_hard_blocker).
- `docs/confidence-formula.md` — formula documentation including the
  0.70 / 25 design pivots.
- `BACKLOG.md` (top-level) — v1.0.22+ deferred bugs.

### Gate status (final, on tag)

| Gate                        | Status                          |
| --------------------------- | ------------------------------- |
| `npm run verify:bayern-sha` | ✓ MATCH                         |
| `npm run smoke:citations`   | ✓ static gate green             |
| `npm run smoke:pdf-text`    | ✓ 144 passed · 0 failed (+48 over v1.0.20's 96) |
| `npx tsc --noEmit`          | ✓ clean                         |
| `npm run build`             | ✓ 269.7 KB gz (ceiling 300 KB)  |

### Fixture growth this sprint

- `smoke:pdf-text`: +48 assertions over v1.0.20 (was 96, now 144).
  Distribution by commit:
    - Commit 1 (Bug 23-PRIME): +6 (Stadtarchiv + Königsallee absence +
      Stadtarchiv Berlin presence × EN + DE)
    - Commit 2 (Bug 23): +6 (3 Bayern-only specialist tokens × langs)
    - Commit 3 (Bug 23b): +10 (5 NRW-only document tokens × langs)
    - Commit 4 (Bug 23c): +12 (6 Bayern-only risk tokens × langs)
    - Commit 5 (Bug 23d): +4 (2 Bayern DSchG tokens × langs)
    - Commit 6 (Bug E): +6 (3 hard-blocker assertions × langs)
    - Commit 7 (Bug M): +4 (2 confidence bounds × langs)
- `smoke:citations`: 1 static-citation check rewired to verify the
  new state-aware indirection (requiredDocuments → stateCitations).

## v1.0.20 — Cosmetic Polish Sprint

See `docs/HANDOFF.md` §9 ladder.

## Earlier versions

See `docs/HANDOFF.md` §9 for the full v1.0.0 → v1.0.20 ladder.
