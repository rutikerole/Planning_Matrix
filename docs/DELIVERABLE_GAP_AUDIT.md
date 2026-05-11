# Deliverable-vs-Shipped Gap Audit — v1.0.5

## V1.0.8 PARTIAL CLOSURE — harnesses BUILT, awaiting first run

Three workstreams in v1.0.8 directly address the gap-audit's
headline findings:

- **W1 — architect E2E harness** (`scripts/architect-e2e-smoke.mjs`,
  commit `4939582`): 7-phase live-production harness for the Phase
  13 verification flow. Eliminates the "0 architect end-to-end runs
  observed" finding ONCE Rutik supplies SUPABASE_SERVICE_ROLE_KEY +
  BAUHERR_TEST_JWT + DESIGNER_TEST_JWT and runs
  `npm run smoke:architect-e2e`. Currently UNVALIDATED.
- **W2 — content depth pin** (commit `730317c`): smokeWalk drift
  fixture asserts NRW: 27 · BW: 30 · NS: 24 · Hessen: 26
  ALLOWED_CITATIONS entries + canonical Verfahrenstypen anchors
  present in each. Catches future content regression. Phase-12-
  delivered content confirmed sufficient.
- **W3 — smoke-matrix harness** (`scripts/smoke-walk-matrix.mjs`,
  commit `49be50e`): 14-cell programmatic coverage harness with
  Bayern-leak detector. Replaces 4-6 hours of manual cell
  walking with ~5-10 minutes of automated assertions. Eliminates
  the "0 / 128 cells empirically validated" finding ONCE Rutik
  supplies creds + ANTHROPIC_BUDGET_ACKED=yes and runs
  `npm run smoke:matrix`. Currently UNVALIDATED.

The gap audit's "ENGINEERING-COMPLETE — NOT CLIENT-READY" verdict
remains LITERALLY TRUE at v1.0.8 ship time, but it now upgrades
to a "credential-supply gap" rather than a "missing infrastructure
gap." The harnesses ARE the infrastructure; running them is what's
left.

v1.0.9 will close any findings the first runs surface.

---



> Adversarial read-pass dated **2026-05-11**, conducted at HEAD `6cfe4b7`
> (one commit past the `v1.0.5` tag at `c35e3fa`). Brutal honesty;
> empirical evidence only; no fixes applied; no commits made.
>
> **Bayern SHA verified MATCH at start AND end of investigation:**
> `b18d3f7f9a6fe238c18cec5361d30ea3a547e46b1ef2b16a1e74c533aacb3471`.
>
> All four daily gates green at audit time: `verify:bayern-sha` MATCH,
> `smoke:citations` OK, `tsc --noEmit` clean, `npm run build` 266.3 KB
> gz / 300 KB ceiling.
>
> This document refutes the framing that v1.0.5 is "delivered" against
> the v1.5 Konsolidierung scope. It is engineering-complete.
> It is **not deliverable-complete**.

---

## TL;DR

**Production-confirmed deliverable coverage: ~1.5% of the contracted
state × template surface (one cell of the 16 × 8 matrix is *reachable*
from the wizard; even that cell shows zero observable production
activity in the post-v1.0.5 window).**

- **0** chat-turn-completed events in the last 7 days
  (`qualifier_rates_7d_global.turns_count = 0` — empirical, anon-readable).
- **0** observable `qualifier.verified` events
  (`verified_count = 0`) → **0** architect verifications in production.
- **0** observable `qualifier.rejected` / `qualifier.downgraded` events
  → the v1.5 §6.B.01 legal shield has shipped without a single observed
  production firing.
- **0** observable `project_members` rows visible to anon
  (RLS-correct by design; therefore unverifiable that ANY invite was
  ever issued, claimed, or used in production).
- **15 of 16 Bundesländer are unreachable in production** — the wizard
  hardcodes `bundesland: 'bayern'` at
  `src/features/wizard/hooks/useCreateProject.ts:184`. The 4 substantive
  Phase-12 states (NRW / BW / Hessen / Niedersachsen) and the 11
  Phase-11 minimum stubs are dead code from the user's perspective.
- **PHASE_17_SIGNOFFS.md** is **entirely empty**: no manager signoff,
  no counsel signoff, no DPA ledger, no 72-point smoke walk closure,
  no 7-night smoke window, no tag-commit SHA recorded. Yet tags
  `v1.0` … `v1.0.5` exist on the repo.

**Honest verdict:** **ENGINEERING-COMPLETE — NOT CLIENT-READY.**
The contracted v1 surface (16 states × 8 templates + architect flow +
München cityBlock + Stadtstaaten handling + spine-to-Final-synthesis
completion) has **never been validated end-to-end against the
production deployment.** The "Bayern-only B2B traffic" framing
(HANDOFF.md line 510) is the *honest internal scope*. The contracted
deliverable scope is wider; the gap is real.

---

## 1. What is the product, really? (Scoped, not shipped)

**Source documents read** (file:line proof for every claim below):

- `docs/HANDOFF.md` (594 LOC; the canonical handoff doc).
- `docs/PHASE_ROADMAP.md` (skim).
- `docs/PHASE_13_REVIEW.md` (165 LOC; architect-flow audit trail).
- `src/legal/legalRegistry.ts` (115 LOC; the 16-state map).
- `src/legal/states/*.ts` (16 state files + `_types.ts`).
- `src/legal/templates/*.ts` (8 template files + `index.ts` + `shared.ts`).

### Per-document 5-line summary

**HANDOFF.md** (`docs/HANDOFF.md:1-594`):
> Defines v1 as a Bauherr-facing SPA producing a structured
> "matrix" via a 7-specialist roundtable persona, persisted in
> `projects.state` JSONB. Scope: 16 Bundesländer (Bayern + 4 substantive
> + 11 honest "in Vorbereitung" stubs), 8 templates (T-01..T-08),
> München cityBlock pilot, architect-verification flow with per-card
> "Vorläufig" footer hide. Line 32-46: *what v1 does*.
> Line 48-57: *what v1 deliberately does NOT do*.
> Line 510: "All non-blocking for v1 **Bayern-only B2B traffic**."
> The internal scope and the contracted scope diverge here — flagged.

**PHASE_13_REVIEW.md** (`docs/PHASE_13_REVIEW.md:1-165`):
> Phase 13 = DESIGNER role + architect verification surface. Sign-off
> at line 161-164 reads: *"the architect surface is functional
> end-to-end with **stubbed Playwright coverage**."* No empirical
> production end-to-end. Line 152-155 explicitly flags:
> *"Live integration test of the chat-turn rejection envelope … unit
> tests + drift checks plus the Playwright multi-context spec carry
> the regression weight in the meantime."*

**legalRegistry.ts** (`src/legal/legalRegistry.ts:51-68`):
> 16 of 16 states present in `REGISTRY: Record<BundeslandCode, StateDelta>`.
> Type-safe; unknown bundesland falls back to `BAYERN_DELTA`
> (line 102-105). Comment at line 38-50 acknowledges 11 minimum stubs
> have `allowedCitations: []` "until per-state content lands (Phase 14)."

**State files** (`src/legal/states/*.ts`):
> Bayern systemBlock (substantive, SHA-anchored, 47923 char composed
> prefix). bw / hessen / niedersachsen / nrw substantive at 20-26 KB
> each. 11 stubs at 1.8-2.3 KB each — minimum-grade.

**Template files** (`src/legal/templates/t01..t08.ts`):
> Eight templates, 11.8-16.9 KB each. All carry TYPISCHE / VERBOTENE
> Zitate blocks per `index.ts:1-30`.

### What the deliverable IS supposed to do (end-to-end, Bauherr + Architekt)

Per HANDOFF.md § 1-2 + § 3 (`docs/HANDOFF.md:22-217`):

1. Bauherr signs in → wizard collects PLZ + template intent →
   `useCreateProject.ts` writes a row to `projects` with
   `bundesland`, `template_id`, initial `state` JSONB.
2. Bauherr enters the chat workspace (the "Chamber") → the persona
   walks **~22 rounds across 8 spine sections** (Project intent →
   Plot & address → Zoning law → Building code → Other regulations →
   Procedure synthesis → Stakeholders & roles → Final synthesis).
3. The persona cites **only** law from the project's Bundesland
   (citation firewall, `supabase/functions/chat-turn/citationLint.ts`)
   and produces facts / recommendations / procedures / documents /
   roles tagged with `Qualifier{source, quality}`.
4. Bauherr's view of the matrix shows the
   **"Vorläufig — bestätigt durch eine/n bauvorlageberechtigte/n
   Architekt:in noch ausstehend"** footer per
   `src/features/architect/components/VorlaeufigFooter.tsx`.
5. Bauherr invites an architect via `share-project` Edge Function →
   architect signs in at `/architect` → opens
   `/architect/projects/:id/verify` → clicks **Bestätigen** on each
   qualifier → footer hides for that fact (per HANDOFF.md § 2.4 +
   PHASE_13_REVIEW.md § Acceptance line 99-117).

That's the contracted end-to-end. The remainder of this audit
measures how much of that has actually been validated against the
live production deployment.

---

## 2. 16-state coverage — coded vs tested

### State inventory (file:line)

All 16 states present per `ls -la src/legal/states/` and per
`src/legal/legalRegistry.ts:51-68`:

| Bundesland       | File                         | systemBlock size | allowedCitations | Class      |
| ---------------- | ---------------------------- | ---------------: | ---------------: | ---------- |
| bayern           | `bayern.ts` (2.9 KB shell + composed Bayern prefix) | 47923 char composed | populated       | SUBSTANTIVE |
| bw               | `bw.ts`                      | 23.4 KB         | populated        | SUBSTANTIVE |
| hessen           | `hessen.ts`                  | 26.1 KB         | populated        | SUBSTANTIVE |
| niedersachsen    | `niedersachsen.ts`           | 20.3 KB         | populated        | SUBSTANTIVE |
| nrw              | `nrw.ts`                     | 21.4 KB         | populated        | SUBSTANTIVE |
| berlin           | `berlin.ts`                  | 2.3 KB          | `[]`             | STUB        |
| brandenburg      | `brandenburg.ts`             | 1.9 KB          | `[]`             | STUB        |
| bremen           | `bremen.ts`                  | 2.1 KB          | `[]`             | STUB        |
| hamburg          | `hamburg.ts`                 | 2.1 KB          | `[]`             | STUB        |
| mv               | `mv.ts`                      | 2.0 KB          | `[]`             | STUB        |
| rlp              | `rlp.ts`                     | 2.0 KB          | `[]`             | STUB        |
| saarland         | `saarland.ts`                | 1.9 KB          | `[]`             | STUB        |
| sachsen          | `sachsen.ts`                 | 1.9 KB          | `[]`             | STUB        |
| sachsen-anhalt   | `sachsen-anhalt.ts`          | 1.9 KB          | `[]`             | STUB        |
| sh               | `sh.ts`                      | 2.0 KB          | `[]`             | STUB        |
| thueringen       | `thueringen.ts`              | 1.9 KB          | `[]`             | STUB        |

`allowedCitations: []` confirmed for all 11 stubs by direct grep.

### Production reachability — the first hard truth

**Wizard hardcodes Bayern** (file:line):
`src/features/wizard/hooks/useCreateProject.ts:184` →
`bundesland: 'bayern'`.

This means **every project ever created via the wizard resolves
to `BAYERN_DELTA`**. Cross-confirmed by `POST_V1_AUDIT.md:323-334`
([MINOR-10] flag) — the Phase-11 5-state surface is unreachable
from production traffic.

### Production observability — the second hard truth

Anon-readable empirical probes against
`https://dklseznumnehutbarleg.supabase.co/rest/v1/`:

```
GET /rest/v1/projects?select=bundesland           → 200, []   (RLS hides)
GET /rest/v1/projects (HEAD, count=exact)         → content-range: */0
GET /rest/v1/qualifier_rates_7d_per_project       → []         (no project activity)
GET /rest/v1/qualifier_rates_7d_global            → [{"downgraded_count":0,
                                                       "rejected_count":0,
                                                       "verified_count":0,
                                                       "turns_count":0}]
GET /rest/v1/qualifier_transitions (HEAD)         → content-range: */0
```

`qualifier_rates_7d_global` is the sentinel: per
`POST_V1_AUDIT.md:516-563`, it's likely RLS-bypassing
(no `security_invoker = true`) → the anon-visible zeros are credible
empirical evidence that **no chat-turn-completed events have hit the
live DB in the post-v1.0.5 window**. Even the v1.0.4 alarm-rewire
that this view depends on (commit `075283d`, migration `0032`) reports
zero traffic.

### Verdict per state

| Bundesland       | Coded? | Reachable from wizard? | Observable production usage? | Verdict                                  |
| ---------------- | :----: | :--------------------: | :--------------------------: | :--------------------------------------- |
| bayern           | ✓      | ✓                      | **0** events in last 7 days  | **CODED + UNTESTED in last 7 days**      |
| bw               | ✓      | ✗ (wizard hardcode)    | n/a (unreachable)            | **CODED + UNREACHABLE in production**    |
| hessen           | ✓      | ✗                      | n/a                          | **CODED + UNREACHABLE**                  |
| niedersachsen    | ✓      | ✗                      | n/a                          | **CODED + UNREACHABLE**                  |
| nrw              | ✓      | ✗                      | n/a                          | **CODED + UNREACHABLE**                  |
| berlin           | stub   | ✗                      | n/a                          | **STUB + UNREACHABLE**                   |
| brandenburg      | stub   | ✗                      | n/a                          | **STUB + UNREACHABLE**                   |
| bremen           | stub   | ✗                      | n/a                          | **STUB + UNREACHABLE**                   |
| hamburg          | stub   | ✗                      | n/a                          | **STUB + UNREACHABLE**                   |
| mv               | stub   | ✗                      | n/a                          | **STUB + UNREACHABLE**                   |
| rlp              | stub   | ✗                      | n/a                          | **STUB + UNREACHABLE**                   |
| saarland         | stub   | ✗                      | n/a                          | **STUB + UNREACHABLE**                   |
| sachsen          | stub   | ✗                      | n/a                          | **STUB + UNREACHABLE**                   |
| sachsen-anhalt   | stub   | ✗                      | n/a                          | **STUB + UNREACHABLE**                   |
| sh               | stub   | ✗                      | n/a                          | **STUB + UNREACHABLE**                   |
| thueringen       | stub   | ✗                      | n/a                          | **STUB + UNREACHABLE**                   |

**16 of 16 states have zero observable production usage in the
post-v1.0.5 window. 15 of 16 are unreachable from the wizard at all.**

[VERIFY-WITH-RUTIK] If a service-role probe against `projects.bundesland`
shows non-Bayern rows, those would have been seeded manually via SQL
or via a non-wizard code path. The audit's reachability claim is
based on the wizard being the only project-creation surface in the
SPA — confirmed by grep for `from('projects').insert`:

```
$ grep -rn "from('projects')\.insert" src/
src/features/wizard/hooks/useCreateProject.ts:182  // the only insert site
```

---

## 3. 8 templates — coded vs tested

### Template inventory (file:line)

`src/legal/templates/index.ts:1-30` registers all 8 templates:

| Template | File                          | Size    | TYPISCHE block | VERBOTENE block |
| -------- | ----------------------------- | ------: | :------------: | :-------------: |
| T-01 EFH-Neubau   | `t01-neubau-efh.ts`  | 11.8 KB | ✓ (verified)   | ✓               |
| T-02 MFH-Neubau   | `t02-neubau-mfh.ts`  | 13.3 KB | ✓              | ✓               |
| T-03 Sanierung    | `t03-sanierung.ts`   | 16.9 KB | ✓              | ✓               |
| T-04 Umnutzung    | `t04-umnutzung.ts`   | 14.3 KB | ✓              | ✓               |
| T-05 Abbruch      | `t05-abbruch.ts`     | 14.5 KB | ✓              | ✓               |
| T-06 Aufstockung  | `t06-aufstockung.ts` | 16.2 KB | ✓              | ✓               |
| T-07 Anbau        | `t07-anbau.ts`       | 16.0 KB | ✓              | ✓               |
| T-08 Sonstiges    | `t08-sonstiges.ts`   | 15.1 KB | ✓              | ✓               |

All 8 verified present + the smokeWalk's static-block loop
(`scripts/smokeWalk.mjs:798-814` per `POST_V1_AUDIT.md:344-345`)
asserts both blocks exist per template.

### Template selection in production

`src/features/wizard/hooks/useCreateProject.ts:119` →
`templateId = selectTemplate(input.intent)`.
`src/features/wizard/lib/selectTemplate.ts:94` → `selectTemplate`
maps Intent → TemplateId. Multiple templates ARE selectable; the
wizard's intent-selector branches into them.

### Production observability per template

Anon cannot see `projects.template_id` due to RLS. The
`qualifier_rates_7d_global` zero-counts mean **no chat-turn-completed
events for ANY template in the post-v1.0.5 window**.

[VERIFY-WITH-RUTIK] A service-role `select template_id, count(*) from
projects group by template_id` would expose actual coverage. From
public surface: undeterminable.

### Verdict per template

| Template          | Coded?         | Production observable activity?  | Verdict                              |
| ----------------- | :------------: | :------------------------------: | :----------------------------------- |
| T-01 EFH-Neubau   | ✓ (substantive) | **0** events in last 7 days     | **CODED + UNTESTED IN PRODUCTION**   |
| T-02 MFH-Neubau   | ✓              | 0                                | **CODED + UNTESTED**                 |
| T-03 Sanierung    | ✓              | 0                                | **CODED + UNTESTED**                 |
| T-04 Umnutzung    | ✓              | 0                                | **CODED + UNTESTED**                 |
| T-05 Abbruch      | ✓              | 0                                | **CODED + UNTESTED**                 |
| T-06 Aufstockung  | ✓              | 0                                | **CODED + UNTESTED**                 |
| T-07 Anbau        | ✓              | 0                                | **CODED + UNTESTED**                 |
| T-08 Sonstiges    | ✓              | 0                                | **CODED + UNTESTED**                 |

**All 8 templates: coded, but zero observable production traffic.**

---

## 4. State × Template Matrix — the real deliverable surface

128 cells (16 × 8). Cell legend:

- `✓` = end-to-end tested in production (chat-turn → matrix → architect verify observed)
- `~` = partial test (project created, conversation incomplete)
- `?` = reachable in code, never empirically observed in production
- `--` = unreachable from wizard / honest stub

```
                     T-01  T-02  T-03  T-04  T-05  T-06  T-07  T-08
bayern                ?     ?     ?     ?     ?     ?     ?     ?
bw                   --    --    --    --    --    --    --    --
hessen               --    --    --    --    --    --    --    --
niedersachsen        --    --    --    --    --    --    --    --
nrw                  --    --    --    --    --    --    --    --
berlin               --    --    --    --    --    --    --    --
brandenburg          --    --    --    --    --    --    --    --
bremen               --    --    --    --    --    --    --    --
hamburg              --    --    --    --    --    --    --    --
mv                   --    --    --    --    --    --    --    --
rlp                  --    --    --    --    --    --    --    --
saarland             --    --    --    --    --    --    --    --
sachsen              --    --    --    --    --    --    --    --
sachsen-anhalt       --    --    --    --    --    --    --    --
sh                   --    --    --    --    --    --    --    --
thueringen           --    --    --    --    --    --    --    --
```

### Counts

- **Cells tested end-to-end in production (`✓`):** **0** (zero — empirical;
  `qualifier_rates_7d_global` shows zero `verified_count`).
- **Cells with partial test (`~`):** **0** observable.
- **Cells reachable but never empirically observed (`?`):** **8**
  (Bayern × T-01..T-08).
- **Honest stubs / unreachable (`--`):** **120** of 128.

**v1 SCOPED surface (per HANDOFF.md § 7.2 — the defensible v1 minimum):**
- 5 substantive states × 8 templates = 40 cells expected to be deliverable-grade.
- 11 stub states × 8 templates = 88 cells acceptable as "in Vorbereitung".

Of those 40 deliverable-grade cells, **only 8 are reachable from the
wizard** (Bayern's row). The other 32 (BW/Hessen/NS/NRW × T-01..T-08)
have substantive content in code that **production traffic cannot reach**.

**Confirmed empirical production-coverage: 0 / 128 cells = 0% end-to-end
validated. ~0–8 / 128 cells potentially exercised historically (anon
cannot see; service-role probe required).**

---

## 5. Spine completion — does the conversation actually end?

The chat is structured for ~22 rounds across 8 spine sections
(Project intent → Plot & address → Zoning law → Building code →
Other regulations → Procedure synthesis → Stakeholders & roles →
**Final synthesis**). Source: HANDOFF.md § 1 + `useChamberProgress.ts`
constant `TOTAL_ESTIMATE_T01 = 22`
(`docs/POST_SMOKE_TEST_INVESTIGATION.md` SERIOUS-2 reference).

### Empirical observability

`qualifier_rates_7d_global.turns_count = 0` over the 7-day window.
Therefore: **zero chat-turn-completed events in the post-v1.0.5
window** (window opens 2026-05-04; `v1.0.5` tagged 2026-05-08;
audit at 2026-05-11).

`messages` table HEAD with `count=exact` returns `content-range: */0`
to anon — RLS-correct (anon cannot see other users' messages), but
also means the audit cannot empirically verify max round count or
distribution from public surface.

`POST_SMOKE_TEST_INVESTIGATION.md:1-100` (the prior investigation)
notes that mid-flight bundesland switching is unsupported and that
spine cap is heuristic — neither indicates that a Final-synthesis
turn was ever observed in production.

### Verdict

**No production conversation has been observed reaching Final synthesis
in the post-v1.0.5 window.** Whether the spine *can* terminate cleanly
to Final synthesis is unverified empirically. The smokeWalk does not
exercise this path; Playwright stubs all backend calls.

[VERIFY-WITH-RUTIK] Service-role probe:
```sql
select project_id, max(round_number) from messages
 where role='assistant' group by project_id;
```
would tell the truth. Out of scope for this audit (anon-only).

---

## 6. Architect verification flow — end-to-end production tested?

The Phase 13 deliverable: Bauherr creates project → invites architect
via copy-paste link (B1 ship-without-email per
`PHASE_13_REVIEW.md:13-15`) → architect signs in at `/architect` →
reviews matrix → clicks Bestätigen → footer hides for that fact.

### Empirical probe matrix

| Claim                                              | Probe                                                                                                  | Evidence                                                                                  |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| Designer signed in at least once?                  | `GET /rest/v1/profiles` (HEAD, count=exact)                                                            | `content-range: */0` (anon — but RLS-gated; cannot prove either way)                       |
| Share-project ever generated an `invite_token`?    | `GET /rest/v1/project_members` (HEAD, count=exact)                                                     | `content-range: */0` (RLS-gated for anon)                                                  |
| Anyone ever accepted an invite (`accepted_at`)?    | Same as above                                                                                          | Unverifiable from anon                                                                     |
| `verify-fact` ever called?                         | `qualifier_rates_7d_global.verified_count`                                                             | **`= 0`** — empirically zero in last 7 days                                                |
| `qualifier.verified` events written to event_log?  | `qualifier_transitions` view (RLS-bypassing per CRITICAL-3)                                            | `content-range: */0` — empirically zero rows                                              |
| Per-card footer ever hid after a verify?           | UI-side; would manifest as a Bauherr-visible state change                                              | No production observability path; never tested                                            |
| Phase 13 architect spec in Playwright ever ran live | `tests/smoke/architect.spec.ts:34-83` uses `page.route()` to intercept ALL backend (`/auth/v1/user`, `/rest/v1/profiles`, `/rest/v1/project_members`, `/rest/v1/projects`) | **Fully mocked**; explicit comment line 10-11: *"the goal is to assert the route + UI wiring stays green, not to test the Edge Functions live."* |
| `share-project` Edge Function reachable?           | `OPTIONS /functions/v1/share-project`                                                                  | `204` (CORS allow-origin: `http://localhost:5173` — **dev origin advertised, not prod**; per `SESSION_RESUME_STATE.md:200-202`) |
| `verify-fact` Edge Function reachable?             | `OPTIONS /functions/v1/verify-fact`                                                                    | `204` (also dev-only CORS)                                                                |

### Hard count

**Observed end-to-end architect-verification runs in production: 0**
(empirical via `qualifier_transitions` empty + `verified_count = 0`).

### Verdict

**The entire Phase 13 deliverable — the v1.5 §6.B.01 legal shield —
has shipped to v1.0.5 with zero empirically-observed production
end-to-end runs.** The architecture is in place; the migrations are
applied (per `SESSION_RESUME_STATE.md:152-159`); the Edge Functions
respond on OPTIONS preflight; but no production user has ever been
observed exercising the loop.

The Playwright `architect.spec.ts` is **not** an end-to-end test
of the production deployment. It is a **stubbed UI-wiring test** that
intercepts all network calls before they leave the browser. Per
`PHASE_13_REVIEW.md:152-155`, the engineering side is fully aware
of this limitation:
> *"Live integration test of the chat-turn rejection envelope. The
> smokeWalk's `--live` mode would need new SMOKE_T13_PROJECT_ID env
> wiring + a test architect account. The unit tests + drift checks
> plus the Playwright multi-context spec carry the regression weight
> in the meantime."*

→ "Carry the regression weight in the meantime" ≠ "validates the
deliverable." The legal shield ships untested in the live system.

---

## 7. Stadtstaaten handling

Berlin / Hamburg / Bremen are coded as `cityBlock=null` Stadtstaaten
per the locked Phase 11 decision. File:line evidence:

- `src/legal/states/berlin.ts:7` comment: *"lives entirely in
  systemBlock. No StateDelta.kind discriminator."*
- All three are present in REGISTRY (`legalRegistry.ts:65-67`).
- All three carry `allowedCitations: []` (verified by grep).

### Production reachability + observability

- **Reachability:** ✗ — wizard hardcodes `bayern`; no Stadtstaat
  is selectable from production traffic.
- **Observability:** zero — no projects with these bundeslands
  observable; persona has not been called against any of these
  states in production.

### Verdict

**Stadtstaaten handling: coded, unreachable in production, untested.**
The "city is the state" architectural decision exists in the type
system but has zero exercise.

---

## 8. Test infrastructure inventory

### smokeWalk

`scripts/smokeWalk.mjs` — 2205 LOC. Static fixture suite. `npm run
smoke:citations` exercises ~110+ static-grade fixtures (stub-content
shape checks, citation regex drift checks, Phase-13 qualifier-gate
unit-equivalent fixtures, Bayern SHA verification, v1.0.x drift-fix
fixtures). Output sample:
```
✓ phase-13 fixture: client + DESIGNER+VERIFIED extracted_fact → 1 downgrade event
✓ phase-13 fixture: designer caller passes DESIGNER+VERIFIED unchanged
…
[smoke-walk] OK
```
**These are unit-equivalent fixtures, not production end-to-end
tests.** They never cross the network boundary.

`smokeWalk.mjs --live` exists but per `PHASE_13_REVIEW.md:152-155`
requires environment provisioning that is not wired today. Confirmed:
no CI cron, no nightly run, no scheduled live execution observable.

### Playwright

`playwright.config.ts:1-77` defines 7 spec files in `tests/smoke/`:

| Spec                | LOC  | Backend reaching live? |
| ------------------- | ---: | :--------------------: |
| `architect.spec.ts` | 186  | **No** — fully mocked via `page.route()` (lines 34-83) |
| `auth.spec.ts`      | 53   | **No** — pattern matches architect.spec |
| `chamber.spec.ts`   | 77   | **No** — same                          |
| `i18n.spec.ts`      | 35   | **No** — same                          |
| `landing.spec.ts`   | 51   | **No** — same                          |
| `seo.spec.ts`       | 33   | **No** — same                          |
| `spine.spec.ts`     | 104  | **No** — same                          |

`playwright.config.ts:14-16` is explicit:
> *"Tests stub all backend calls at the network layer (Playwright's
> `route` API). **Production Supabase is never hit.** CI runs against
> a vite-preview server on port 4173."*

### Production observability

The "live system observability" claim reduces to:
- `event_log` (gated, RLS-bypassing views available),
- `qualifier_rates_7d_global` (zero counts → no traffic in 7 days),
- `projects.state` (RLS-gated; anon-blind).

Vercel + Supabase dashboards (per HANDOFF.md § 9) are
**operator-readable**, not codified into automated gates. The
freshness-bot weekly snapshot (`scripts/freshness-check.mjs`) is
content-only, not deliverable-validating.

### Verdict

**Zero automated production-validation infrastructure exists.** The
test pyramid is: unit-equivalent smokeWalk fixtures + stubbed
Playwright UI tests + manual operator dashboards. The deliverable
surface (16 × 8 + architect flow + Final-synthesis spine completion)
has no automated end-to-end coverage of any cell.

---

## 9. Gap between "engineering complete" and "client ready"

### Engineering complete claims that ARE true

- All 16 states present in code; substantive content for 5; honest
  stubs for 11. ✓
- All 8 templates present in code with TYPISCHE / VERBOTENE blocks. ✓
- Bayern SHA invariant `b18d3f7f9a6fe238c18cec5361d30ea3a547e46b1ef2b16a1e74c533aacb3471`
  held across 33+ commits. ✓
- All 4 daily gates green at audit time. ✓
- Phase 13 migrations 0026-0030 + 0031 + 0032 applied to live DB
  (per SESSION_RESUME_STATE.md § 4). ✓
- Architect flow is functional end-to-end **in unit + Playwright-
  stubbed terms** (gate logic correct; route wiring correct;
  rejection envelope correct). ✓
- Three handoff docs (HANDOFF / OPS_RUNBOOK / DEPLOYMENT) exist. ✓

### Engineering complete claims that are MISLEADING

These are claims that are TRUE at the code level but FALSE at the
deliverable level:

1. **"16-state coverage."** True in code; **false in production
   reachability** — 15 of 16 states unreachable from the wizard
   (`useCreateProject.ts:184` hardcodes `'bayern'`).
   `POST_V1_AUDIT.md:323-334` already flags this as MIN-10.
   HANDOFF.md § 7.2 frames the 11 stubs as "honestly surfacing 'in
   Vorbereitung'" — the persona never reaches these stubs in
   production.

2. **"v1.5 §6.B.01 legal shield ships."** True in code; **the user-
   facing locked CTA** ("Diese Festlegung erfordert die Freigabe…")
   reaches the user only after the v1.0.4 fix `df4c1fc` (per
   `POST_V1_AUDIT.md:356-386` — was originally dropped). And: **zero
   production firings observed** in the qualifier_transitions view.
   The shield "ships" but has never been seen to actually shield
   anything in production.

3. **"Architect verification flow is end-to-end functional."**
   True with Playwright-stubbed coverage; **false against the
   production deployment** — `verified_count = 0` in last 7 days.

4. **"Production-ready" tag annotation.** v1.0.5 tag annotation says
   so. The audit-trail document `PHASE_17_SIGNOFFS.md` is **entirely
   empty** — manager signoff, counsel signoff, DPA ledger,
   72-point smoke walk, 7-night smoke window, tag-commit SHA: all
   blank (per `SESSION_RESUME_STATE.md:285-299`). The "production-
   ready" claim is **engineering self-assessment, not the gated
   process the SIGNOFFS doc was designed to capture**.

5. **"Bayern-only B2B traffic" framing** (HANDOFF.md line 510).
   This is the *honest internal scope*, but it lives buried in
   doc § 9 and contradicts the 16-state-coverage framing in §§ 1-7.
   The contracted client deliverable does not get re-scoped by a
   sentence in § 9.

### Things the client paid for that have NOT been confirmed working

Per the v1.5 Konsolidierung scope as documented in HANDOFF.md +
PHASE_13_REVIEW.md + the 16 state files + 8 template files:

- ☐ A Bauherr in NRW completing a chat to Final synthesis.
- ☐ A Bauherr in Hessen completing a chat to Final synthesis.
- ☐ A Bauherr in BW completing a chat to Final synthesis.
- ☐ A Bauherr in Niedersachsen completing a chat to Final synthesis.
- ☐ A Bauherr in any of the 11 stub states getting the "in
  Vorbereitung" hinweis spoken aloud.
- ☐ Any project created with T-02 (MFH) reaching Final synthesis.
- ☐ Any project created with T-03 (Sanierung) reaching Final synthesis.
- ☐ T-04, T-05, T-06, T-07, T-08 — same.
- ☐ A Bauherr in Berlin / Hamburg / Bremen experiencing the
  Stadtstaat handling (cityBlock=null).
- ☐ A München project receiving a real cityBlock-grounded answer
  (in production end-to-end).
- ☐ Any architect signing in via the production share-project link.
- ☐ Any architect clicking Bestätigen and observing the per-card
  Vorläufig footer hide.
- ☐ Any project completing the spine to Final synthesis at all
  (independent of state/template).
- ☐ The 72-point cross-browser smoke walk
  (`docs/PHASE_17_SMOKE_CHECKLIST.md`).
- ☐ The 7-consecutive-night smoke window per
  `PHASE_17_SIGNOFFS.md § 6`.

**Every one of the above is empirically unconfirmed at v1.0.5.**

---

## 10. What a real smoke test plan would look like

The minimum testing plan to actually validate the contracted
deliverable. Not tooling — just the test surface.

### Phase A — Reachability remediation (BLOCKING; 0.5 day)

**Block:** Wizard hardcodes `bundesland: 'bayern'`. Fix
`src/features/wizard/hooks/useCreateProject.ts:184` to take the
PLZ → Bundesland map at face value, OR ship a manual override
selector for the smoke session.

Without this, no test of the 4 substantive Phase-12 states or 11
stubs is possible from the SPA.

### Phase B — State × Template smoke walk (4–6 hours)

Per cell, test:

1. Wizard project creation succeeds with the (state, template) pair.
2. First 2 chat turns complete; persona references state-specific
   law without firing citation-violation events.
3. Spine reaches at least round 5 (smoke depth, not full).
4. State-switch test: change `projects.bundesland` mid-conversation;
   confirm the bundesland-propagation gap (PSTI SERIOUS-1) behaves
   as documented.

**Recommended cell coverage** (not all 128 — risk-weighted):

- Bayern × all 8 templates (8 cells; full smoke including
  Final-synthesis attempt) → **~3 hours**.
- {NRW, BW, Hessen, NS} × {T-01, T-03} (8 cells; spot-check
  substantive states) → **~2 hours**.
- {Berlin, Hamburg, Bremen} × T-01 (3 cells; verify Stadtstaat
  "in Vorbereitung" framing reaches user) → **~30 min**.
- {Sachsen, Thüringen} × T-01 (2 cells; spot-check Flächenland
  stubs) → **~20 min**.

→ ~21 cells, ~6 hours single-operator. A pair (Bauherr + Architekt
roles) for the architect-flow row adds ~1 hour.

### Phase C — Architect end-to-end (1 hour)

1. Manager provisions a `role='designer'` profile via SQL
   (per `PHASE_13_REVIEW.md:67-72`).
2. Owner creates a Bayern × T-01 project; reaches matrix state
   with at least 5 qualifier-bearing facts.
3. Owner inserts `project_members` row via SQL → gets `invite_token`
   → builds `/architect/accept?token=...` link → opens in incognito
   as the designer profile.
4. Designer accepts → lands on `/architect` → opens
   `/architect/projects/<id>/verify` → clicks **Bestätigen** on a
   fact → switches back to Bauherr session → confirms the
   Vorläufig footer hides on that card.
5. Trigger a `qualifier_role_violation` (CLIENT-turn DESIGNER+
   VERIFIED attempt) → confirm the locked German CTA reaches the
   ErrorBanner (regression test for v1.0.4 fix `df4c1fc`).

### Phase D — Bug-finding template (per failed cell)

Capture in a per-cell `BUG_<cell-id>.md`:

```
## Cell: bundesland=<X>, template=<Y>
- Wizard outcome: PASS/FAIL + screenshot
- Turn 1 outcome: persona text + cited §§ + violation events
- Turn 5 outcome: same
- Final-synthesis attempt: reached YES/NO + which spine section stalled
- Citation lint events: count + sample
- Anthropic spend: cents per turn (event_log)
- Architect flow (if cell is the chosen designer cell): each step pass/fail
```

### Phase E — Production-only checks (out-of-band, ~1 hour)

- 72-point cross-browser walk per
  `docs/PHASE_17_SMOKE_CHECKLIST.md`.
- Fill `PHASE_17_SIGNOFFS.md § 4` (currently empty).
- Run `qualifier-downgrade-rate.mjs` against live DB; confirm
  `turns_count > 0` after the smoke session
  (validates v1.0.4 alarm rewire empirically).

### Total honest investment

**~7-9 hours** for a single operator to walk one round of the
matrix (21 cells + architect flow + production-only checks).
Excludes Phase A's wizard fix (~0.5 day) and bug-fix sweeps
discovered during the walk (variable).

This is not enormous. It is also not zero. It has **never been done
at v1.0.5**.

---

## 11. All daily gates + current findings

### Daily gates — final run at audit time

| Gate                  | Result                                                                  |
| --------------------- | ----------------------------------------------------------------------- |
| `verify:bayern-sha`   | **GREEN** — `b18d3f7f9a6fe238c18cec5361d30ea3a547e46b1ef2b16a1e74c533aacb3471` MATCH |
| `smoke:citations`     | **GREEN** — `[smoke-walk] OK` (110+ fixtures + Phase-13 + v1.0.x drift) |
| `npx tsc --noEmit -p` | **GREEN** — zero diagnostics                                            |
| `npm run build`       | **GREEN** — `index-B1rCK0zO.js` 906.1 KB raw / **266.3 KB gz** (300 KB ceiling; 33.7 KB headroom) |

**All four gates green. Bayern SHA MATCH at start AND end.**

### Open findings cross-walk

Per the existing audit docs (POST_V1_AUDIT.md, POST_SMOKE_TEST_INVESTIGATION.md,
SESSION_RESUME_STATE.md, OPS_RUNBOOK.md):

| # | Finding                                                          | Severity | Status at v1.0.5                                |
| - | ---------------------------------------------------------------- | -------- | ----------------------------------------------- |
| 1 | verify-fact race on `projects.state` UPDATE (PV1A CRIT-1)        | CRITICAL | OPEN (parked on `feature/v1-0-6-race-fix`)      |
| 2 | qualifier-views `security_invoker` posture (PV1A CRIT-3)         | CRITICAL | OPEN (anon clean; auth-non-admin probe pending) |
| 3 | `state_version` column applied to live DB w/o main code reader   | SERIOUS  | OPEN (benign now; trigger presence unverified)  |
| 4 | Mid-flight bundesland switch leaves Bayern dominant (PSTI SER-1) | SERIOUS  | OPEN                                            |
| 5 | Spine has no hard terminal stop (PSTI SERIOUS-2)                 | SERIOUS  | OPEN                                            |
| 6 | Architects cannot read project `messages` (PV1A SERIOUS-1)       | SERIOUS  | OPEN [VERIFY-WITH-RUTIK]                        |
| 7 | event_log inserts in 2 Edge Functions are fire-and-forget        | MEDIUM   | OPEN                                            |
| 8 | `invite_token` URL kept after claim                              | MINOR    | OPEN                                            |
| 9 | `verify-fact` no idempotency check                               | MINOR    | OPEN                                            |
| 10| `verify-fact` no pre-flip qualifier source check                 | MINOR    | OPEN [VERIFY-WITH-RUTIK]                        |
| 11| No SPA UI to revoke unclaimed invites                            | MEDIUM   | OPEN                                            |
| 12| `QualifierRoleViolationError` class is dead weight               | MINOR    | OPEN                                            |
| 13| `PHASE_17_SIGNOFFS.md` ledger fully empty across v1.0..v1.0.5    | SERIOUS  | OPEN (audit-trail gap)                          |
| 14| HANDOFF.md § 9 version-ladder missing v1.0.5 row                 | MINOR    | OPEN                                            |
| 15| OPS_RUNBOOK lacks B16 row for bundesland-propagation             | MINOR    | OPEN                                            |
| 16| CORS allow-origin on `verify-fact`+`share-project` is dev-only   | MINOR    | OPEN — could affect production architect flow   |
| **17** | **Wizard hardcodes Bayern (PV1A MIN-10)** — but the impact is **deliverable-grade**, not minor: 15 of 16 states unreachable | **SERIOUS (re-scored)** | **OPEN** |
| **18** | **No production end-to-end test exists for any cell of the 16×8 matrix** (this audit's headline finding) | **SERIOUS** | **OPEN — never attempted** |

OPS_RUNBOOK.md known-error catalogue (B04, B10, B11, B12, B13+B14,
B15) cross-checked: all shipped as-known per `OPS_RUNBOOK.md § 7`;
none load-bearing for v1.0.5 daily-gate behaviour. **B04 (wizard
Bayern hardcode) was de-prioritised** because it was originally
called "decorative" — Phase 11 made it load-bearing, and
POST_V1_AUDIT MIN-10 noted the de-priorisation but kept it MINOR.
**Re-scored above to SERIOUS for deliverable-grade impact.**

---

## 12. Recommended next move — honestly

### Empirical-evidence summary

- 1 of 16 Bundesländer is reachable from the SPA wizard (Bayern).
- 0 of 8 templates have observable production traffic in last 7 days.
- 0 of 128 state×template cells have empirical end-to-end production
  validation.
- 0 architect verifications observed in last 7 days.
- 0 spine completions to Final synthesis observed.
- All 4 daily gates green; Bayern SHA holds.
- All 18 known findings are documented; none have been disprove by
  this audit — most are corroborated.
- The PHASE_17_SIGNOFFS process gate is **entirely empty** despite
  6 tags placed (v1.0 → v1.0.5).

### Verdict

**The four candidate moves laid out in the prompt:**

- **(A)** Pause + write a real smoke test plan + execute it.
- **(B)** Re-scope v1 deliverable narrowly (Bayern-only,
  München-only, 1-template pilot) and **update HANDOFF.md and the
  v1.0.5 tag annotation to match**.
- **(C)** Continue v1.1 features (race-fix branch) on top of an
  untested v1.
- **(D)** Something else.

### Recommended: **(B), then (A) within the narrowed scope.**

**Why (B):** the gap is not a 16-state polishing problem; it is a
**scope-vs-validation mismatch**. The internal scope (HANDOFF.md
line 510: "Bayern-only B2B traffic") is honest; the contracted scope
implied by the 16 state files + 8 template files + the architect
flow + the Stadtstaat handling is wider. **Closing the gap by
testing 16×8 + architect end-to-end requires more than a smoke walk;
it requires re-scoping the contracted deliverable to match what was
actually built and tested**, then transparently re-scoping the v1.0.5
tag and the HANDOFF.md framing so the client knows what they have.
This is Rutik's pushback being correct: the deliverable hasn't been
delivered against the contracted surface.

**Why (A) second, within the narrower scope:** even at "Bayern-only,
München-only, 1-template pilot," **zero end-to-end production runs
have been observed**. Ship-without-validation is the gap to close
inside the narrowed scope.

**Why NOT (C):** continuing v1.1 features on top of an untested v1
is the move that the v1.0.6 race-fix branch already represents
(parked, per `SESSION_RESUME_STATE.md:88-115`). The branch is the
safe parking; merging it would compound the deliverable-vs-shipped
gap rather than close it.

**Why NOT (D):** the audit did not surface any other tractable next
move that wasn't already a sub-case of (A) or (B).

### Concrete (B) → (A) sequence proposal

1. **Update HANDOFF.md** to explicitly state the v1 deliverable
   scope as a **Bayern-only, München-only, T-01..T-08 single-state
   B2B closed pilot**. List the BW / Hessen / NS / NRW substantive
   content + the 11 stubs as **post-v1 scaffolding present in the
   codebase but not part of the v1.0.5 delivery**. Update PHASE_17
   docs in lockstep.
2. **Re-cut the v1.0.5 tag annotation** (or supersede with v1.0.5.1
   doc-only) to match the narrowed scope. The tag's "production-
   ready" claim is then defensible against what was actually built
   and tested.
3. **Walk the narrowed-scope smoke matrix** (Bayern × T-01..T-08 +
   architect end-to-end + Stadtstaaten Bayern's contractual analog
   = "PLZ-municipality" for the cityBlock pilot). Estimated ~4-6
   hours single-operator per Phase 10 of this doc.
4. **Fill `PHASE_17_SIGNOFFS.md`** as the smoke walk completes —
   each row, each section. The currently-empty ledger is the
   smoking gun that shipping happened without the gating process
   designed to validate it.
5. **Then** (and only then) decide whether to merge
   `feature/v1-0-6-race-fix` into a v1.1 sprint that ALSO
   re-introduces the 4 substantive states and the architect-flow
   smoke as part of widening the scope.

This sequence has no software change requirements (steps 1-2 + 4
are doc), one operator-time commitment (step 3), and one explicit
go/no-go after step 4 (step 5).

---

## Appendix A — Empirical command transcript

```
$ npm run verify:bayern-sha          → ✓ MATCH (start AND end)
$ npm run smoke:citations            → [smoke-walk] OK
$ npx tsc --noEmit -p .              → (zero diagnostics)
$ npm run build                      → 266.3 KB gz / 300 KB ceiling

$ ls src/legal/states/ | wc -l       → 17 (16 states + _types.ts)
$ ls src/legal/templates/t*.ts | wc -l → 8
$ wc -l scripts/smokeWalk.mjs        → 2205
$ wc -l tests/smoke/*.spec.ts        → 539 total

$ grep -nE "page\.route" tests/smoke/architect.spec.ts
  34, 46, 54, 83        ← all backend mocked
$ grep -n "bundesland" src/features/wizard/hooks/useCreateProject.ts
  184                   ← bundesland: 'bayern'  (HARDCODED)

REST anon probes (https://dklseznumnehutbarleg.supabase.co):
  /rest/v1/projects?select=bundesland     → []
  /rest/v1/projects HEAD count=exact      → content-range: */0
  /rest/v1/event_log HEAD count=exact     → content-range: */0
  /rest/v1/profiles HEAD count=exact      → content-range: */0
  /rest/v1/project_members HEAD           → content-range: */0
  /rest/v1/messages HEAD                  → content-range: */0
  /rest/v1/qualifier_transitions HEAD     → content-range: */0
  /rest/v1/qualifier_rates_7d_per_project → []
  /rest/v1/qualifier_rates_7d_global      → [{"downgraded_count":0,
                                              "rejected_count":0,
                                              "verified_count":0,
                                              "turns_count":0}]
```

## Appendix B — Files cited in this audit

`src/legal/legalRegistry.ts:51-68, 102-105`
`src/legal/states/{bayern,nrw,bw,hessen,niedersachsen,berlin,
  brandenburg,bremen,hamburg,mv,rlp,saarland,sachsen,sachsen-anhalt,
  sh,thueringen}.ts`
`src/legal/templates/{t01-neubau-efh,t02-neubau-mfh,t03-sanierung,
  t04-umnutzung,t05-abbruch,t06-aufstockung,t07-anbau,t08-sonstiges}.ts`
`src/features/wizard/hooks/useCreateProject.ts:119, 157, 184, 186`
`src/features/wizard/lib/selectTemplate.ts:94`
`src/lib/projectStateHelpers.ts:77, 187`
`tests/smoke/architect.spec.ts:10-11, 34-83, 139, 169, 182`
`playwright.config.ts:14-16`
`scripts/smokeWalk.mjs` (2205 LOC)
`scripts/lib/bayernSha.mjs:23-24`
`docs/HANDOFF.md:1-594` (esp. lines 32-46, 48-57, 510)
`docs/PHASE_13_REVIEW.md:13-15, 67-72, 99-117, 152-155, 161-164`
`docs/POST_V1_AUDIT.md:323-345, 356-386, 516-563`
`docs/POST_SMOKE_TEST_INVESTIGATION.md:1-100`
`docs/SESSION_RESUME_STATE.md:79-115, 152-159, 200-202, 285-299`
`docs/OPS_RUNBOOK.md:1-150`
`supabase/migrations/0026..0032`

---

**Bayern SHA `b18d3f7f9a6fe238c18cec5361d30ea3a547e46b1ef2b16a1e74c533aacb3471` MATCH at end of audit. No commits, no fixes, no migrations applied during this investigation.**
