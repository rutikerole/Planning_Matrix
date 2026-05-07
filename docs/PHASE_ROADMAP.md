# PHASE_ROADMAP.md

**Status.** Authoritative roadmap for Phases 11–17. Supersedes
`docs/NEXT_MOVE.md` (which assumed a PMF-seeking product — wrong frame).

**Frame.** Planning Matrix is a **client deliverable** for the v1.5
architecture document's manager. Validation is **AI-proxy only via
`scripts/smokeWalk.mjs`** plus the audit trail. No end-user testing.

**Total.** 7 phases, ~12–18 weeks (1 engineer). Order is load-bearing:
12 needs 11; 13 reads 11's qualifier surface; 15 piggybacks on 11's
bundesland resolver. **LOC honesty:** the audit's "80 LOC/state" was
too low — realistic band is 150–250 LOC per state for full content
(Phase 12), 50–100 LOC for delta stubs (Phase 11).

---

## Open questions (resolve before / during the relevant phase)

- **OQ1 — Phase 13 architect UX.** Full v1.5 §8 Gate 99 cockpit
  (matrix + qualifier detail + audit + tickets + dependency graph)
  or simpler approve/reject for v1? **Default:** simpler approve/
  reject; Gate 99 = post-v1.
- **OQ2 — 13b telemetry source.** Existing `project_events` with a
  derived view, or new `qualifier_transitions` table? Existing is
  cheaper, new is cleaner. **Default:** existing `project_events`.
- **OQ3 — Geoportal coverage (Phase 15).** Which top-5 states have
  a public WMS today? Needs a 30-min research pass. **Default:**
  assume München-only and defer per-state to Phase 15 kickoff.
- **OQ4 — State-stub depth.** Functional MBO defaults for all 16
  from day 1, or honest "Detail-Spezifika für [state] werden
  ergänzt" framing for the 11 deferred states? **Default:** MBO
  defaults functional + the "in Vorbereitung" surfacing.
- **OQ5 — `legalContext` location (Phase 11).** Today
  `bayern.ts` / `muenchen.ts` live in
  `supabase/functions/chat-turn/legalContext/`. Stay or move to
  `src/legal/`? **Default:** move to `src/legal/` so SPA-side lint
  + the architect dashboard share one source of truth.

---

## Phase 11 — State Delta Framework

**Goal.** Unlock all 16 Bundesländer at the structural level — Bayern
flow byte-for-byte unchanged, every other state resolves to a stub.

**In scope.**
- Extract `src/legal/federal.ts` from current `bayern.ts` /
  `muenchen.ts` (BauGB / BauNVO / GEG / HOAI / MBO).
- `src/legal/states/_types.ts` — `StateDelta` interface using the
  `AUDIT_REPORT.md` §14 sketch as starting shape.
- `src/legal/states/bayern.ts` — refactored to fit StateDelta
  (~250–300 LOC after federal extraction).
- 4 top-state delta stubs (`nrw`, `bw`, `niedersachsen`, `hessen`):
  article numbers + Verfahrenstypen + Architektenkammer + key
  Modernisierungsdaten only. **No persona content yet.**
- 11 minimum-viable stubs for the rest (MBO-default per OQ4).
- `src/legal/legalRegistry.ts` — composes federal + state at runtime
  from `projects.bundesland`.
- Wizard reverse-geocode — read Bundesland from address, replace
  the `useCreateProject.ts:152` hardcoded `'bayern'`.
- Edge Function reads `projects.bundesland` → resolves StateDelta
  → injects into the per-template tail (federal stays cached).
- `citationLint.ts`: `BAYERN_ALLOWED_CITATIONS` →
  `resolveAllowedCitations(bundesland)`. Firewall stays narrow.

**Out of scope.** Full content for top-5 (Phase 12). Substantive
TYPISCHE / VERBOTENE per template per state (Phase 12). Real
Geoportal for non-München (Phase 15). DESIGNER (Phase 13).

**Files affected.** `src/legal/` (new); `compose.ts`; `citationLint.ts`;
`useCreateProject.ts`; `scripts/smokeWalk.mjs` (extend with
`--bundesland`).

**Acceptance criteria.**
- Switching `projects.bundesland` from `'bayern'` to `'nrw'` makes
  the persona cite BauO NRW articles, not BayBO.
- Bayern flow byte-for-byte unchanged (diff vs pre-Phase-11
  fixtures over a fixed 5-turn scenario).
- smokeWalk regression must pass — for all 16 states the static
  gate stays green; substantive citation assertions only required
  for Bayern + the four top-state stubs.
- Bundesland firewall stays caught for 14 non-Bayern wrong-state
  citations (existing deep-fixture suite from Task 2).

**Budget.**
- LOC: ~2200 net new (framework + Bayern refactor ~800; 4 stubs
  × ~100 = 400; 11 minimum stubs × ~50 = 550; registry / compose
  / lint ~250; wizard reverse-geocode ~80; smokeWalk extension
  ~150; tests ~300).
- Time: 3–4 weeks. 1.5w framework + Bayern refactor; 1w top-4
  delta stubs (article numbers + Verfahrenstypen, **no full
  content**); 0.5w smokeWalk extension; 0.5w 11 minimum stubs.

**Risks / open questions.**
- OQ5 is load-bearing for this phase.
- Reverse-geocoding may need a manual Bundesland-select fallback
  on geocoder failure (audit B04 / §9).
- Cache economics — federal + StateDelta should combine to one
  cache block per state to stay under the 4-marker ceiling.

---

## Phase 12 — Top-5 States Content

**Goal.** Substantive legal coverage for ~64 % of the German
population — Bayern (already done) + NRW + BW + Niedersachsen + Hessen.

**In scope.**
- Full StateDelta content for NRW, BW, Niedersachsen, Hessen.
- Per-template TYPISCHE / VERBOTENE Zitate per state (8 × 4 = 32
  new blocks).
- State-specific Verfahrenstypen, Gebäudeklassen-Schwellen,
  Architektenkammer + Vermessungsstellen (NRW = ÖbVI; BW = AKBW; …).
- State-specific Modernisierungs-Stände — verify each before
  encoding (BW LBO 2023, NRW BauO 2018+, HBO 2020+, NBauO).
- Per-state citation-lint allowlist.

**Out of scope.** Stadtstaaten (Phase 14). Remaining 7
Flächenländer (Phase 14). Real Geoportal (Phase 15).

**Files affected.** `src/legal/states/{nrw,bw,niedersachsen,hessen}.ts`
(expanded). Per-template per-state composition in `src/legal/templates/`
or inline in `StateDelta.templateOverrides`. smokeWalk fixtures.

**Acceptance criteria.**
- smokeWalk passes substantive assertions for all 5 top states
  (forbidden-citation negatives + expected-citation positives per
  state per template).
- Persona output for a fixed scenario in NRW reads as fluent legal
  German with correct BauO NRW citations.
- smokeWalk regression must pass — 16-state matrix stays green;
  substantive assertions added for top-4.

**Budget.**
- LOC: ~1000–1200 (200–250 × 4 = 800–1000 content + ~200
  composition / fixtures).
- Time: 2–3 weeks.

**Risks / open questions.**
- BW's `§ N LBO` vs Bayern's `Art. N BayBO` creates prompt-content
  asymmetry; verify the firewall handles both without false positives.
- Modernisierungs-Stände research is the slowest dependency.

---

## Phase 13 — DESIGNER Role (13a tactical + architect UX)

**Goal.** Certified architect logs in, reviews the matrix, sets
`DESIGNER + VERIFIED` via explicit button. Closes the v1.5 §6.B.01
legal shield.

**In scope.**
- **Reuse existing `profiles.role` enum** (`client | designer |
  engineer | authority`, defined `0001_profiles.sql:21`).
  **NO new enum migration.** Architect = `role = 'designer'`.
- New `public.project_members` table (per-project membership —
  `profiles.role` is per-user).
- Architect dashboard route (`/architect`).
- Project sharing: client invites architect via email; architect
  becomes a member with read access to the matrix and write access
  only to qualifier transitions.
- Verification UI: line-by-line approve/reject for facts /
  recommendations / procedures / documents / roles.
- `DESIGNER + VERIFIED` set ONLY via explicit button click — never
  via session flag (per the DESIGNER memo's recommendation).
- RLS + application-level recheck: only a `role = 'designer'` user
  who is a member of the project can write `DESIGNER + VERIFIED`.
- "Vorläufig" footer disappears once a fact is VERIFIED.
- Email notifications: client → architect on invite; architect →
  client on first batch verified.
- Telemetry into `event_log` (existing): verify count, reject count,
  time-to-verify, qualifier-downgrade events.

**Out of scope.** 13b Execution-Agent rebuild — conditional on the
trigger below. Multi-architect-per-project, cross-project pattern
hoist, full Gate 99 cockpit (all post-v1; OQ1 default).

**Files affected.** `0024_project_members.sql` (new);
`src/features/architect/` (new); `src/features/chat/` —
verification UI bolt-on, **do NOT touch Phase 7.9 locked surfaces
(Spine, MatchCut, Astrolabe, CapturedToast, magnetic focus,
Stand-up)**; `share-project` + `verify-fact` Edge Functions (new);
`src/lib/projectStateHelpers.ts` — qualifier-write gate.

**Acceptance criteria.**
- Two-account integration test: client creates project → invites
  architect → architect verifies a fact → fact's qualifier becomes
  `DESIGNER + VERIFIED` → "Vorläufig" footer disappears.
- RLS test: a non-designer cannot write VERIFIED via direct
  Supabase call (403). A non-member designer is also rejected.
- smokeWalk regression must pass — 16-state matrix green; new
  fixture: unverified fact carries Vorläufig, verified fact does not.

**Budget.**
- LOC: ~1800–2100 (architect dashboard ~700; verification UI ~500;
  Edge Functions + RLS ~300; migration + tests ~400).
- Time: 3–4 weeks.

**13b trigger.** > 5 qualifier-downgrade events per 100 turns over
a 7-day rolling window across active projects → triggers structural
Execution-Agent rebuild (telemetry from `project_events`, OQ2
default). Until trigger, 13a holds.

**Risks / open questions.** OQ1 binds the dashboard scope. Email
delivery is the most fragile dependency — budget conservatively.

---

## Phase 14 — Remaining 11 States

**Goal.** Full 16-state coverage at minimum-viable depth.

**In scope.**
- 8 Flächenländer at Phase 12 depth: Sachsen, Sachsen-Anhalt,
  Thüringen, Rheinland-Pfalz, Saarland, Schleswig-Holstein,
  Mecklenburg-Vorpommern, Brandenburg.
- 3 Stadtstaaten with explicit state-vs-municipal blur handling:
  Berlin, Hamburg, Bremen. Their LBO IS the municipal-level rule;
  B-Plan / Satzungs handling differs from Flächenländer.

**Out of scope.** Cross-state harmonisation tooling (post-v1). Real
Geoportal for these states (Phase 15).

**Files affected.** `src/legal/states/{remaining}.ts` (expanded
from Phase 11 stubs); `src/legal/states/stadtstaaten/` — new subdir
if architecture warrants (flag during the phase); smokeWalk fixtures.

**Acceptance criteria.**
- smokeWalk passes substantive assertions for all 16 states.
- Stadtstaaten fixtures verify state-vs-municipal disambiguation
  (e.g., "BauO Bln" never confused with a Berliner B-Plan-
  Festsetzung in the persona's prose).
- smokeWalk regression must pass — full 16 × 8 matrix on
  `npm run smoke:citations`.

**Budget.**
- LOC: ~2400–2750 (8 Flächenländer × ~200 + 3 Stadtstaaten × ~250
  + ~100 composition layer).
- Time: 2–3 weeks.

**Risks / open questions.** Stadtstaaten architecture — may need a
`StateDelta.kind: 'flaechenland' | 'stadtstaat'` discriminator.

---

## Phase 15 — Geoportal Integration

**Goal.** Address → B-Plan polygon → Festsetzungen for top-5 states
where a public WMS exists.

**In scope (post-OQ3 research, see `docs/PHASE_11_OQ3_GEOPORTAL_RESEARCH.md`).**
- München (refactor) + Hessen + NRW ship cleanly — most likely path.
- BW conditional on the **2026-02-05 LGL-BW service cutover**;
  verify post-cutover endpoints before any per-state code lands.
- Niedersachsen B-Plan conditional on a positive Phase-15-kickoff
  catalog scan finding state-level B-Plan aggregation. Cadastral
  WMS confirmed usable today (`opendata.lgln.niedersachsen.de/
  doorman/noauth/`); state-level B-Plan layer not yet confirmed.
- Honest "kein öffentlicher WMS verfügbar" fallback elsewhere —
  surfaces in the wizard as a soft note, never as a hard error.
- Per-state WMS proxy Edge Function with the existing rate-limit
  pattern (mirror of `bplan_lookup_rate_limits`).

**Out of scope.** Paid / keyed Geodata services. Cadastral / parcel-
level data beyond B-Plan polygons. Stadtstaaten Geoportals (flag if
research finds a usable service for Berlin / Hamburg / Bremen).

**Files affected.** `supabase/functions/bplan-lookup-{state}/` per
state with public WMS; `src/features/wizard/components/PlotMap/` —
per-state layer config; `vercel.json` — CSP additions per WMS host.

**Acceptance criteria.**
- smokeWalk integration test — address in each top-5 state with a
  WMS resolves to either a B-Plan polygon or an honest no-data
  response.
- No silent failures — every WMS error logs to `event_log` with
  the per-state proxy identifier.
- smokeWalk regression must pass — München flow unchanged; new
  per-state fixtures green.

**Budget.**
- LOC: ~800 (4 proxies × ~150 + UI integration ~200).
- Time: 2 weeks. Heavily dependent on OQ3 — if only München has a
  public WMS, the phase shrinks to refactor + 0.5w.

**Risks / open questions.** OQ3 is load-bearing.

---

## Phase 16 — Quality Dashboard + AI Regression Harness

**Goal.** Nightly 16 × 8 × N persona regression. Drift detection.
Cache-hit ratios. Citation-violation rate per state per template.

**In scope.**
- `scripts/smokeWalk.mjs` extended to nightly cron via GitHub
  Actions.
- Regression matrix: 16 states × 8 templates × ~5 synthetic
  Bauherr personas (well-prepared / minimal-info / contradictory /
  multilingual / power-user) = ~640 fixtures per night.
- Persona drift detection: hash-and-diff a structure-extracted
  summary (specialist sequence + citation set + areas) against a
  baseline; alert on threshold drift.
- Citation-violation rate per state per template, surfaced in an
  admin dashboard.
- Cache-hit ratio per request type.
- Cost-per-turn trajectory chart.
- Weekly digest email to project owner.

**Out of scope.** Production traffic monitoring (Sentry + PostHog
already cover that). Auto-correction of drift — manual review only.

**Files affected.** `.github/workflows/nightly-regression.yml` (new);
`scripts/smokeWalk.mjs` (extend); `scripts/personaDrift.mjs` (new);
`src/features/admin/QualityDashboard.tsx` (new; admin-RLS-gated per
existing `logs.is_admin()` pattern); `0025_regression_runs.sql` (new).

**Acceptance criteria.**
- Nightly run produces a structured report committed to
  `eval-results/`.
- **First nightly run establishes the baseline** for citation-
  violation rate, cache-hit ratio, and persona-drift hash. Alert
  fires on a regression of **> 10 %** from the established baseline
  for any per-state-per-template metric (threshold tunable post-
  baseline; the absolute number is meaningless before we have one).
- Persona drift alert fires within 24 h of a regression.
- QualityDashboard renders for admin role only.
- smokeWalk regression must pass — the harness's static gate
  unchanged; the nightly cron runs the matrix and produces the
  regression report.

**Budget.**
- LOC: ~2000 (harness ~800; dashboard ~600; migration + cron ~200;
  drift detection ~300; tests ~100).
- Time: 2 weeks.

**Risks / open questions.** Baseline establishment is fragile if
the matrix is non-deterministic. Mitigation: hash on a structure-
extracted summary, not raw prose.

---

## Phase 17 — Production Handoff

**Goal.** Hand the project to the client with everything they need
to operate it without the build engineer.

**In scope.**
- DPAs (Data Processing Agreements) executed with each
  subprocessor: Anthropic, Supabase, Vercel, Sentry, PostHog.
  Track signed copies in `docs/legal/dpas/`.
- Impressum updated with real client contact details (today's copy
  in `src/features/legal/pages/` is placeholder — verify).
- AGB + Datenschutz updated with subprocessor list (DSGVO § 13(1)f
  partially shipped per commit `ba7a3f8`).
- Final 72-point smoke walk: rerun `npm run smoke:citations` plus
  manual UI walkthrough across landing / wizard / chat / result on
  Desktop Chrome + Desktop Safari + iPhone 13 + Pixel 5.
- `docs/DEPLOYMENT.md` (new) — env vars, secret rotation, Supabase
  migration apply order, Vercel rollback, Anthropic key swap.
- `docs/OPS_RUNBOOK.md` (new) — incident response, rate-limit
  budget tuning, cost monitoring, known-error catalogue (B10 / B12
  / etc. with mitigation).
- `docs/HANDOFF.md` (new) — architecture overview, where each v1.5
  concept lives, how to extend StateDelta, how to add a template,
  how to read the audit.

**Out of scope.** Ongoing maintenance contract (commercial). New
feature work — anything not already shipped is post-handoff.

**Files affected.** `src/features/legal/pages/` (Impressum / AGB /
Datenschutz copy); `docs/legal/dpas/` (new dir); `docs/DEPLOYMENT.md`
(new); `docs/OPS_RUNBOOK.md` (new); `docs/HANDOFF.md` (new).

**Acceptance criteria.**
- All 5 DPAs executed and stored.
- Impressum + AGB + Datenschutz reviewed by counsel; no
  placeholder copy remains.
- 72-point smoke walk green across the 4-browser matrix.
- smokeWalk regression must pass — full Phase 16 nightly green for
  7 consecutive nights immediately before handoff.
- Client signs off on the three handoff docs.

**Budget.**
- LOC: ~50 SPA edits (legal pages); ~600 LOC across the new docs +
  DPA records.
- Time: ~1 week, assuming DPAs countersigned without negotiation.
  If subprocessors push back, slip realistically by another week.

**Risks / open questions.** DPA negotiation latency is the slowest
dependency and entirely outside engineering control. Counsel review
of legal pages — schedule in advance.
