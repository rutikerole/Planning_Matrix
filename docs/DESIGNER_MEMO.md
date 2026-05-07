# DESIGNER+VERIFIED enforcement — decision memo

## 1. Question

Does Phase 13's `DESIGNER+VERIFIED` enforcement (audit §8, v1.5 §6.B.01)
require resurrecting the dropped Execution-Agent, or can it be handled
with RLS + application-level role-gating? Today **any assistant turn
can stamp `DESIGNER+VERIFIED` on any fact** — `applyExtractedFacts`
(`src/lib/projectStateHelpers.ts:113-138`) writes whatever
`source/quality` the model emits, with no role check. The choice below
is between a tactical gate and a structural rebuild.

## 2. Option A — RLS + application-level role-gating

**What it means in practice.**
- `public.profiles.role` already exists (`0001_profiles.sql:21`,
  enum `'client'|'designer'|'engineer'|'authority'`). Reuse it.
- Add a SECURITY-DEFINER RPC `assert_designer_role(uid uuid)` that
  returns boolean.
- In `chat-turn/index.ts`, after `supabase.auth.getUser()`, fetch
  the caller's `profiles.role`. Pass it to `applyToolInputToState`.
- In `applyExtractedFacts` (and the four delta helpers), if
  `source === 'DESIGNER' && quality === 'VERIFIED'` AND
  `caller.role !== 'designer'` ⇒ **downgrade to `DESIGNER/ASSUMED`**
  (or `LEGAL/CALCULATED`, depending on the originating context) and
  emit a `qualifier_downgraded` event into `project_events`.
- Add an RLS policy on `messages` that denies any client-side write
  carrying a `DESIGNER+VERIFIED` qualifier in `tool_input` from a
  non-designer profile. Defence in depth — the Edge Function is the
  only writer today, but the policy guards future SPA-direct writes.

**What it gives us.**
- Closes the audit's B05 gap. v1.5 §6.B.01 ("nur DESIGNER setzt
  VERIFIED") becomes enforced at runtime.
- Audit-log gains qualifier-downgrade events for free (one row per
  rejected attempt — visible in the Atelier Console).
- Existing Phase 9 tracer captures the downgrade in span attributes
  with no new infra.

**What it does NOT give us.**
- **No cascade rückstufung when Stammdaten change** (audit B06,
  CL-4.C-02). A change to `bplan.coverage_status` still doesn't
  downgrade dependent facts to ASSUMED. The dependency graph the
  Consistency-Keeper would need (CL-5.B.02-01) is unmodelled.
- **No per-transition audit log** (CL-4.C-03). `commit_chat_turn`
  still writes one row per turn with a whole-state before/after diff;
  fact-level transitions remain reconstructable but not first-class.
- **No EXEC_PLN canonical handbook** (CL-3.C-01, CL-3.C-02). The
  Execution-Agent's other half — the human-readable Projekthandbuch
  with its machine-readable Spiegelung — stays unimplemented.
- **No HOAI Phasenstand derivation** (CL-5.C.02-02).
- **No designer-side UX.** Today a real architect cannot log in and
  click "verify". The role-gate exists, but the surface that would
  set the qualifier intentionally does not. Without UX, A is
  defensive only.

**Estimate.** 2–3 weeks (1 dev). Schema: zero new tables, one RPC,
two RLS policies. Code: ~150 LOC across `chat-turn/index.ts`,
`projectStateHelpers.ts`, and a new `chat-turn/roleGate.ts` helper.
One migration. ~10 unit tests for the downgrade logic.

## 3. Option B — Resurrect the Execution-Agent

**What it means.**
- A real code path that *owns* qualifier transitions — every
  source/quality change flows through it, not through ad-hoc
  `applyExtractedFacts` mutations.
- New tables:
  - `public.qualifier_transitions` (per-fact change log:
    `project_id, fact_key, before_qual, after_qual, by_role,
    reason, transition_type, created_at`).
  - `constitutional.dependency_graph` (CL-5.B.02-01: which fact
    keys are derived from which others; populated as part of CL
    pflege, not at runtime).
  - `projects.exec_plan_handbook JSONB` (CL-3.C-01: the canonical
    six-bereich handbook structure).
- Refactor `applyToolInputToState` into a queue: deltas land in a
  staging area, the Execution-Agent applies them under a
  transactions-with-rückstufung discipline, and the result writes
  through a single typed gateway.
- Add a designer sign-off surface (Phase 13 UX) that flips facts
  from `DESIGNER/ASSUMED` to `DESIGNER/VERIFIED` with a per-row
  audit and an explicit user action.

**What it gives us beyond A.**
- Cascade rückstufung enforced (CL-4.C-02 → DONE).
- Per-transition audit log (CL-4.C-03 → DONE).
- EXEC_PLN handbook + machine-readable Spiegelung
  (CL-3.C-01, CL-3.C-02 → DONE).
- HOAI Phasenstand derivation (CL-5.C.02-02 → feasible because
  the dependency graph + transition log carry the inputs).
- Removes the "v1.5 was 13 agents but we shipped 7" gap — v1.5
  §5.C.01 stops being aspirational.

**Cost.** Schema: 2 new tables + 1 column. Code: ~600–900 LOC
(staging queue, dependency-graph reader, transition writer,
gateway, designer sign-off UI). Migration discipline: dependency
graph needs to be hand-curated for the existing fact keys before
the cascade can fire (this is a CL pflege exercise, not a code
exercise — and it grows with every new template).

**Estimate.** 4–5 weeks (1 dev) with a hand-curated v1
dependency-graph for the ~30 fact keys currently emitted by the
templates. Designer-sign-off UX is a separate Phase-13 estimate.

## 4. Recommendation

**Ship Option A in Phase 13a; commit to Option B as Phase 13b.**
The role-gate is genuinely tactical: it closes the audit's B05 gap
in 2–3 weeks and makes the LBO BW screenshot story (Bauherr can't
launder a wrong-Bundesland fact into DESIGNER+VERIFIED) defensible.
But A alone is a half-truth — without the dependency graph, the
*meaning* of VERIFIED stays soft because a Stammdaten change
doesn't ripple. Land A first so Phase 13a has a credible
shippable, then start B as the Phase 13b structural rebuild while
A's telemetry tells us how often the gate actually fires. If A's
gate fires fewer than ~5 times across 100 production turns, B's
priority drops behind the Phase 11 State-Delta work; if it fires
more, B moves up.

## 5. Open questions for Rutik

- **Is a real DESIGNER user even in v1 scope?** The role-gate is
  symbolic without an architect logging in. Without the UX, A's
  enforcement is defensive only — does that still earn the 2–3
  weeks?
- **Should DESIGNER+VERIFIED be writable only by an explicit
  user action** (button click, audit signature) **or also by the
  model** when the architect has flagged "trust my outputs as
  VERIFIED in this session"? The first is safer; the second
  matches how the persona currently behaves.
- **Dependency graph in Option B — hand-curated or derived from
  `extracted_facts.evidence`?** Today every fact carries an
  evidence string naming its source; mining that is cheaper than
  curating a constitutional table, but less reliable.
