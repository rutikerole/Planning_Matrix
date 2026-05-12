# Planning Matrix — OPS_RUNBOOK

> Operations playbook. Audience: the manager + future on-call engineer.
> Reads as a reference, not a tutorial. Use the table of contents to
> jump.

## Contents

1. Incident response triggers
2. Rate-limit budget tuning
3. Cost monitoring
4. Qualifier-gate rollback (Phase 13 §6.B.01)
5. Citation-violation triage
6. DESIGNER role provisioning
7. Known-error catalogue (audit findings deferred to v1)
8. Post-v1 follow-up summary

---

## 1. Incident response triggers

| Severity | Trigger | First action | Escalation |
| -------- | ------- | ------------ | ---------- |
| **P0** | SPA returns 5xx to all users for > 2 min | Vercel rollback (DEPLOYMENT.md § 5.1) | Manager paged immediately |
| **P0** | `npm run verify:bayern-sha` red on `main` | DO NOT push; investigate the diff against `src/legal/{shared,federal,bayern,muenchen,personaBehaviour}.ts` | Manager + build-engineer-of-record |
| **P0** | Anthropic 429 spike + chat-turn returning `upstream_overloaded` to all users | Increase rate-limit cap (§ 2 below) AND verify Anthropic spend hasn't tripped the budget cap | Manager |
| **P1** | Single project's chat returning `qualifier_role_violation` repeatedly | Run `qualifier-downgrade-rate.mjs --per-project` to localise; see § 4 below | Build-engineer if pattern repeats |
| **P1** | `event_log` table growth > 100k rows/day | Investigate `logs.reaper` (migration 0017) — should be retiring rows; check the reaper cron | Build-engineer next business day |
| **P1** | Sentry-EU instance down OR PostHog-EU instance down | Telemetry blackout, NOT a customer outage. Document in incident channel; resume normal ops | None unless > 24h |
| **P2** | Single user reporting a wrong citation in a chat turn | `event_log` query for `citation.violation` events for that user/project; if the citationLint fired, that's expected; if not, capture the verbatim citation + escalate | Build-engineer |
| **P2** | Bundle size grew above 280 KB gz | Investigate next deploy's diff; cap is 300 KB hard but headroom is the leading indicator | Build-engineer |

The baseline triggers above sit on top of the daily-gate set
(`verify:bayern-sha`, `smoke:citations`, `tsc`, `npm run build`).
Daily gates are not an incident in themselves — they are the
*pre-flight* that prevents most incidents.

---

## 2. Rate-limit budget tuning

The chat-turn rate limit is configured in
`supabase/migrations/0008_chat_turn_rate_limits.sql` and enforced
by the function at `supabase/functions/chat-turn/index.ts`. Default:
**50 requests / hour per (project, user)** pair.

To inspect the current limit (Supabase Dashboard SQL Editor):

```sql
select * from public.chat_turn_rate_limits;
```

To raise the cap temporarily (e.g., for a demo session):

```sql
-- Replace <user> + <project> with the real UUIDs:
update public.chat_turn_rate_limits
   set max_requests = 200
 where user_id    = '<user>'
   and project_id = '<project>';
```

Resetting the bucket for a single user (clears their counter):

```sql
delete from public.chat_turn_rate_limits
 where user_id = '<user>';
```

**Avoid the global default change.** Most rate-limit hits are
local to a single demo / smoke walk session. Per-row tuning beats
a global increase.

---

## 3. Cost monitoring

Three vendor dashboards carry the spend signal; check weekly during
ramp, monthly steady-state.

| Vendor | Dashboard URL pattern | What to watch |
| ------ | --------------------- | ------------- |
| Anthropic | `console.anthropic.com/usage` | Daily spend trend; 429 rate; per-model split |
| Supabase | `supabase.com/dashboard/project/<ref>/reports` | Database egress, Edge Function invocations, Storage |
| Vercel | `vercel.com/<team>/<project>/usage` | Function invocations, bandwidth, build minutes |

The Phase 9.2 cost-tracking surface (`/admin/logs/cost`) carries
per-turn USD estimates. Sanity-check the dashboard total against
Anthropic's once per week — divergence signals a token-counting
bug or an unaccounted retry loop.

The `MAX_TOKENS = 1280` cap in
`supabase/functions/chat-turn/anthropic.ts:46` and
`supabase/functions/chat-turn/streaming.ts:50` is what bounds the
worst-case spend per turn. **Audit B14:** the constant is
duplicated; if you change one, change both.

---

## 4. Qualifier-gate rollback (Phase 13 §6.B.01)

> **v1.0.4 alarm rewire** — the 13b denominator was structurally
> inert in v1.0.0..v1.0.3 (the 0029 view's
> `where source = 'chat-turn'` was rejected by the event_log CHECK
> constraint, so `turns_count` sat at 0 forever). Migration 0032
> (applied in v1.0.4) aligns the predicate to
> `(source='chat', name='chat.turn_completed')`; the chat-turn
> Edge Function emits that event per non-replay turn. Verify
> post-apply:
>
> ```sql
> select * from public.qualifier_rates_7d_global;
> -- turns_count > 0 within minutes of any traffic.
> ```
>
> If `turns_count` stays at 0 after a real chat turn, the alarm
> wiring regressed — escalate.


The gate constant lives at
`src/lib/projectStateHelpers.ts` → `QUALIFIER_GATE_REJECTS`.

  - **Current:** `true` (rejection mode shipped in `80fc5ae`).
  - **Rollback to observability mode:** flip to `false`, build,
    deploy. Mirror change in `supabase/functions/chat-turn/index.ts`
    is automatic — both the JSON path and the SSE path branch on the
    constant.

**When to rollback:**

  1. The 13b conditional-trigger threshold fires
     (`numerator > 5 events AND turns >= 100` over a 7-day window).
     Inspect the rolling counts:
     ```sh
     node scripts/qualifier-downgrade-rate.mjs --per-project --field-breakdown
     ```
     If the rate is concentrated on a single qualifier surface OR
     a single project, that's a localised regression — rollback may
     be unnecessary, surface-specific fix preferred.

  2. A legitimate use-case is hitting `qualifier_role_violation`
     where the architect role flow is correctly configured. This
     is a false-positive in the gate's logic — rollback first,
     reproduce in `qualifierGate.test.ts`, fix, re-flip.

**After rollback:** the gate logs `qualifier.downgraded` events
instead of `qualifier.rejected`. The state still mutates safely
(in-place downgrade to DESIGNER+ASSUMED) — no qualifier escapes
to projects.state as DESIGNER+VERIFIED. Telemetry is preserved.

See `docs/PHASE_13_REVIEW.md` § "Rollback playbook" for the full
rollback flow.

---

## 5. Citation-violation triage

The citation linter (`supabase/functions/chat-turn/citationLint.ts`)
fires `citation.violation` events into `public.event_log` whenever
the persona's text references a forbidden pattern (Anlage 1 BayBO,
wrong-Bundesland LBO, MBO placeholder, etc.).

**To inspect recent violations** (Supabase Dashboard SQL Editor):

```sql
select project_id, attributes
  from public.event_log
 where source = 'system'
   and name   = 'citation.violation'
   and server_ts > now() - interval '24 hours'
 order by server_ts desc
 limit 50;
```

The attributes blob carries `{ pattern, match, severity, field }`.
Triage:

- **`pattern = 'baybo'` AND `severity = 'error'` on a Bayern project:**
  shouldn't happen — the home-Bundesland filter should suppress this.
  If you see it, the active-Bundesland threading is broken; check
  `supabase/functions/chat-turn/citationLint.ts:lintCitations` is
  passed `project.bundesland`.
- **`pattern` matches a non-active-Bundesland LBO:** persona drift —
  the home-state guard worked. The model emitted wrong-state language
  for a different state. Useful as a regression alert; not a bug in
  the lint.
- **`pattern = 'paragraph_baybo'`:** the model used `§` instead of
  `Art.` for BayBO. Persona-prompt regression; smokeWalk's
  `bundesland-switch: active=bayern, "§ 57 BayBO"` fixture must catch
  this in the static gate. If a real call slipped past, smokeWalk
  drifted from the Edge function's regex.

For a deeper dive, see `docs/PHASE_10_1_REPORT.md`.

---

## 6. DESIGNER role provisioning

Until the v1.5 §6.B.01 self-service architect-onboarding flow ships
post-v1, designer role is provisioned manually. Two paths to
generate the invite: SQL (always works) or Edge Function call
(v1.0.1 hardened path with explicit owner check).

```sql
-- 1. Sign up the architect's email through the SPA's normal /sign-up.
--    They receive role='client' by default.
-- 2. After they confirm their email, promote them:
update public.profiles
   set role = 'designer'
 where email = '<architect-email>';
-- 3. The owner inserts an unclaimed project_members row.
--    v1.0.1 — set expires_at explicitly so the row gets a non-null
--    TTL even if a future schema migration drops the default.
insert into public.project_members (
    project_id,
    role_in_project,
    expires_at
)
values (
    '<project-uuid>',
    'designer',
    now() + interval '7 days'
)
returning invite_token, expires_at;
-- 4. Owner copy-paste-shares the URL:
--    https://<host>/architect/accept?token=<invite_token>
--    (NB the token is now valid for 7 days from `expires_at`.)
```

**v1.0.1 alternative — generate via Edge Function** (no DB-level
SQL needed; cleaner audit trail):

```sh
curl -X POST "$SUPABASE_URL/functions/v1/share-project" \
  -H "Authorization: Bearer <owner-session-jwt>" \
  -H "Content-Type: application/json" \
  -d '{"action":"create","projectId":"<project-uuid>"}'
```

Returns `{ inviteToken, expiresAt, acceptUrl }`. The Edge Function
explicitly checks the caller is the project's owner before INSERT
(POST_V1_AUDIT CRIT-1 fix) and the architect's role check fires on
accept (POST_V1_AUDIT CRIT-2). The 7-day TTL is enforced on accept
(POST_V1_AUDIT CRIT-3); expired tokens are rejected with the locked
"Diese Einladung ist abgelaufen" copy.

**Stale-invite cleanup** (run weekly during ramp; daily once
production traffic ramps). Removes unclaimed invites that have
expired:

```sql
delete from public.project_members
 where accepted_at is null
   and expires_at  is not null
   and expires_at  < now();
```

The partial index `project_members_expires_at_idx` (added in
migration 0030) makes this query fast even at scale.

The architect signs in, lands on `/architect/accept?token=…`, the
SPA POSTs `/functions/v1/share-project` with `{inviteToken}`, the
Edge Function flips `user_id + accepted_at`, and the architect
lands on `/architect` with the new mandate visible.

**Cross-ref:** `docs/PHASE_13_REVIEW.md` § "Manual deploy checklist".
**Cross-ref:** `docs/POST_V1_AUDIT.md` § 5 (Phase 13 architect flow).

---

## 7. Known-error catalogue (audit findings deferred to v1)

These are AUDIT_REPORT.md findings that did NOT get fixed during
Phases 11–13 and ship as-known into v1. Each row says what the
issue is, what its real-world impact is, and what the fix path
looks like post-v1.

### B04 — `projects.bundesland` partly decorative — CLOSED in v1.0.9

- **Where:** previously `src/features/wizard/hooks/useCreateProject.ts:184`,
  hardcoded to `'bayern'`.
- **v1.0.6 surgical mitigation (Bug 0):** wizard exposes a 16-option
  explicit Bundesland dropdown in Q2 (`src/features/wizard/components/
  QuestionPlot.tsx`); `useCreateProject` writes the user's selection
  through to `projects.bundesland`. Hessen × T-03 walk confirmed it
  worked when the user manually changed the dropdown.
- **v1.0.9 closure (Bug 13):** dropdown now auto-pre-selects from
  the address's German PLZ first-two-digits (Deutsche Post sector
  table). The hint below the dropdown reads "Detected from postcode
  {{plz}}. Change if this is wrong." for non-empty addresses. Users
  entering "Marktplatz 2, 40213 Düsseldorf" now get bundesland=nrw
  in DB by default; manual override still available for border
  cases. Inference helper: `src/features/wizard/lib/
  inferBundeslandFromPostcode.ts`. 9 known-PLZ resolution samples
  pinned via smokeWalk drift fixture.
- **Historical impact (now fully closed):** non-Bayern projects
  couldn't be created via the wizard. Every project resolved to
  BAYERN_DELTA. Hessen × T-03 walk caught the symptom; v1.0.6
  Bug 0 provided manual control; v1.0.9 Bug 13 closed the UX gap
  with auto-detection.

### B10 — Tracer FK ordering chronic

- **Where:** `supabase/functions/chat-turn/persistence.ts:407-418` +
  `tracer.ts`.
- **Status as of v1:** migration 0022 dropped the FK that 0018
  added; `project_events.trace_id` is a dangling pointer at the
  DB level.
- **Impact:** referential-integrity gap on a single column. Admin
  tooling at `/admin/logs/projects/:id/turns/:traceId` resolves
  the link in code; no broken UI surface.
- **Post-v1 fix path:** the "trace stub on creation, UPDATE at
  finalize" pattern noted in 0022's comment. Restore the FK in a
  later migration.

### B11 — Wizard cache shape sometimes missing `areas`

- **Where:** `src/features/wizard/hooks/useCreateProject.ts:174-188` +
  the defensive `?.` in `src/lib/projectStateHelpers.ts:534`.
- **Status as of v1:** defensive read works. The seed should always
  include the canonical shape.
- **Impact:** none in practice; the Phase 7.10g defensive-read
  catches every edge case.
- **Post-v1 fix path:** make `useCreateProject` set the canonical
  `{A: PENDING, B: PENDING, C: PENDING}` (or VOIDs for no-plot)
  in the cache seed, then drop the `?.`.

### B12 — Rate-limit failures are user-facing 500

- **Where:** `supabase/functions/chat-turn/index.ts:163-203`.
- **Status as of v1:** transient Supabase RPC failure on the rate-
  limit check returns `internal` to the SPA; the user sees
  "Storage error".
- **Impact:** rare; the transient-failure window is narrow.
  Manageable in operations because the user can simply retry.
- **Post-v1 fix path:** "fail-closed-with-retry" or "warn-and-
  continue with sentry tag". **AUDIT NOTE:** verify product
  intent first (the audit explicitly flagged this as
  "verify before fixing").

### B13 + B14 — `MAX_TOKENS = 1280` constant duplication

- **Where:** `supabase/functions/chat-turn/anthropic.ts:46-47`,
  `supabase/functions/chat-turn/streaming.ts:50-51`.
- **Status as of v1:** the constant is duplicated. Stale TODO
  in `anthropic.ts` referencing pre-4.6 evaluation removed during
  Phase 9.2; the cap itself is right-sized for the persona's
  ≤1500-char `message_de` envelope.
- **Impact:** none functionally; the duplication is a maintainability
  concern.
- **Post-v1 fix path:** hoist to a shared constants module.

### B15 — `factPlausibility` downgrades DECIDED

- **Where:** `supabase/functions/chat-turn/factPlausibility.ts:101-106`.
- **Status as of v1:** plausibility helper downgrades both VERIFIED
  and DECIDED on a numeric range disagreement.
- **Impact:** semantically incorrect for DECIDED — that's the
  "the user said this" qualifier. Real-world hit rate is low because
  numeric DECIDED entries are rare; the persona is constrained to
  Bauherr-stated values.
- **Post-v1 fix path:** DECIDED stays DECIDED with a warning event,
  not a downgrade. Discuss with manager before changing semantics.

### B17-B22 — Deterministic-computation Bayern hardcodes (v1.0.10 closures)

The v1.0.6 anti-leak fix patched the persona-prompt layer for
non-Bayern projects. v1.0.10 closes the parallel set of bugs in
the deterministic computation layers (cost engine, baseline
procedure derivation, locale caveats, donut rounding) that were
NOT covered by the anti-leak gate. Foundation: central per-state
registry at `src/legal/stateLocalization.ts`.

- B17/B14 (closed in v1.0.10 commit `831fa87`): cost-row rationales
  state-parameterized via `findCostRationale(key, bundesland)`.
- B18/B15 (closed in v1.0.10 commit `f6c4df8`): baseline procedure
  derivation reads `getStateLocalization`; previously hardcoded
  BayBO Art. 58/57/59.
- B19 (closed in v1.0.10 commit `edabad3`): VorlaeufigFooter uses
  i18n; EN parity added.
- B20 / B22 (deferred to v1.0.11): PDF font ligature corruption
  + remaining locale-caveat audit on the Procedure tab.
- B21 (closed in v1.0.10 commit `5641bf5`): DataQualityDonut
  Hamilton largest-remainder rounding.

### B16 — Bayern leakage in non-Bayern persona output

- **Where:** Bayern-SHA-locked layers `src/legal/personaBehaviour.ts`,
  `src/legal/shared.ts`, `src/legal/federal.ts`,
  `src/legal/templates/shared.ts`, plus all per-template files
  (`src/legal/templates/t01..t08-*.ts`) embed Bayern-specific
  examples (BayBO Art./Abs., München cityBlock references).
- **Status as of v1.0.5:** Hessen × T-03 smoke walk against live
  surfaced the persona reaching for `BayBO Art. 57 Abs. 3 Nr. 3`
  as a "comparable" anchor on a Hessen project, even when active
  Bundesland was correctly hessen at the prompt-prefix layer.
- **v1.0.6 mitigation (CLOSED):** every non-Bayern state file
  (`src/legal/states/*.ts`, 15 files) prepends a
  `buildAntiBayernLeakBlock(...)` override that explicitly
  invalidates Bayern examples for the active state. Per-state
  systemBlocks load AFTER the cached Bayern prefix, so "later
  instruction wins" semantics push the override in front of the
  upstream Bayern examples. `bayern.ts` is intentionally untouched
  (Bayern SHA `b18d3f7f9a6fe238c18cec5361d30ea3a547e46b1ef2b16a1e74c533aacb3471`
  preserved). Helper: `src/legal/states/_antiBayernLeak.ts`.
- **Residual gap (v1.1):** per-state T-01..T-08 supplements remain
  unwritten — when persona drift recurs against a state with a
  Bayern-only template, the supplement is the proper fix. Tracked
  separately from B16's closure.

### Phase deferrals (12.5 / 14 / 15 / 16) — see HANDOFF.md

Documented as known follow-up work in HANDOFF.md per the
2026-05-08 scope-cut decisions.

---

## 8. Post-v1 follow-up summary (HANDOFF.md cross-ref)

| Phase | What it adds | When the manager would prioritise it |
| ----- | ------------ | ------------------------------------- |
| 12.5 | Async-takt rebuild — multi-Bauherr / multi-architect collaboration | When > 1 architect needs to share workload on a project |
| 14   | Remaining 11 states' substantive content | When a project ships outside Bayern + the top-4 states |
| 15   | Per-state Geoportals | When a project ships outside München AND state has a public WMS |
| 16   | Nightly regression at scale + persona drift detection | When usage volume requires monitoring beyond manual smokeWalk |

---

## 9. Post-tag deploy verification (added v1.0.7)

Vercel auto-deploys on push to `main`. The deploy typically lands
within 1-2 minutes of the push. Before declaring a tag "live", run
the deploy-verification probe and clear browser cache.

### 9.1 Probe the live SPA

```sh
# 1. Confirm the SPA is responding + capture the bundle hash.
curl -sSI https://planning-matrix.vercel.app/ \
  | grep -iE "(last-modified|x-vercel-id|etag)"
LIVE_BUNDLE=$(curl -sS https://planning-matrix.vercel.app/ \
  | grep -oE 'index-[A-Za-z0-9_-]+\.js' | head -1)
echo "live bundle: $LIVE_BUNDLE"
```

### 9.2 Compare against local build

```sh
# 2. Run a local build; note the bundle filename.
npm run build 2>&1 | grep -oE 'index-[A-Za-z0-9_-]+\.js' | head -1
```

The local + live hashes will differ because Vite inlines
`VITE_LEGAL_*` env vars at build time and the local `.env.local`
typically has different values than Vercel's project env. The
hash difference is expected — what matters is that the LIVE bundle
filename changed compared to the previous tag's live bundle.

### 9.3 Confirm a tag-introduced marker is present

For features that introduce greppable strings (new translation
keys, new event names, new HTML element ids), grep the live bundle
for at least one such marker:

```sh
curl -sS "https://planning-matrix.vercel.app/assets/$LIVE_BUNDLE" \
  > /tmp/live_index.js
grep -oE 'plot-bundesland' /tmp/live_index.js   # v1.0.6 marker
grep -oE 'bundesland_changed' /tmp/live_index.js # v1.0.6 telemetry
```

Server-side fixes (Edge Function code in
`supabase/functions/chat-turn/*`, persona/template content in
`src/legal/*`) do NOT appear in the SPA bundle — those deploy via
Supabase, not Vercel. Verify Supabase-side fixes by running a
chat turn against the live Edge Function and inspecting the
response.

### 9.4 Browser cache guidance

After every tag's deploy, the bauherr should hard-refresh
(`Cmd+Shift+R` on macOS, `Ctrl+Shift+R` on Windows/Linux) on the
first page-load post-deploy. Vercel sets long cache lifetimes on
hashed asset filenames, so the stale-bundle window is bounded by
the user's last visit + the index.html cache lifetime
(typically short).

### 9.5 When to escalate

If the live bundle hash has NOT changed > 5 minutes after the
push:
1. Check Vercel dashboard → Deployments → latest. Is the deploy
   in "Building", "Ready", or "Error"?
2. If "Error", click into the deploy and read the build log.
   Common causes: prebuild gate failure (locale parity,
   hardcoded-DE, legal-config validator), tsc error, bundle
   ceiling.
3. If "Building" > 5 min, allow up to 10 min total.
4. If "Ready" but live bundle hash unchanged → CDN cache; wait
   2-3 min, retry.

---

## 10. Live-production smoke harnesses (added v1.0.8)

Two operator-triggered harnesses extend the static daily-gate set
with empirical live-production assertions. **Neither runs as part
of `npm run build` or `smoke:citations`** — both mutate live DB
rows and (the matrix harness) consume Anthropic tokens.

### 10.1 `npm run smoke:architect-e2e`

Script: `scripts/architect-e2e-smoke.mjs`. Runs the 7-phase Phase 13
architect verification flow against live production. First-ever
automated end-to-end against the deliverable that
DELIVERABLE_GAP_AUDIT.md flagged as "0 architect end-to-end runs
observed."

Required env (in `.env.local` or shell):
```
SUPABASE_SERVICE_ROLE_KEY   — Supabase Dashboard → Settings → API
BAUHERR_TEST_EMAIL          — owner of the test Hessen project
BAUHERR_TEST_JWT            — fresh access_token; copy from DevTools
DESIGNER_TEST_EMAIL         — designer account (profile must exist)
DESIGNER_TEST_JWT           — fresh access_token for the designer
```

Pre-flight: a non-Bayern test project must exist
(`projects WHERE bundesland='hessen' AND owner_id=<bauherr>`). Use
the SPA's wizard with the v1.0.6 Bundesland dropdown to create one.

When to run:
- Before tagging any v1.x with architect-surface changes.
- Monthly during ramp (smoke validation of Phase 13 surface).
- After Supabase Edge Function deploys touching share-project or
  verify-fact.

Cost: zero Anthropic tokens (no chat-turn invocations). Live DB
side-effects revert via Phase 8 TEARDOWN unless `--keep-side-effects`.

### 10.2 `npm run smoke:matrix`

Script: `scripts/smoke-walk-matrix.mjs`. Runs the 14-cell state ×
template smoke matrix from `V1_SMOKE_WALK_EXECUTION_PLAN.md`
programmatically.

Required env:
```
SUPABASE_SERVICE_ROLE_KEY   — same key as above
BAUHERR_TEST_JWT            — same as above
BAUHERR_TEST_USER_ID        — auth.users.id matching the JWT
ANTHROPIC_BUDGET_ACKED=yes  — explicit budget acknowledgement
```

Cost: ~14 cells × 5 turns = 70 Anthropic chat-turn calls per run.
Sonnet 4.6 / MAX_TOKENS=1280: rough order-of-magnitude $10-20.
Test projects deleted via service-role on teardown (default).

Flags:
- `--turns=N` — chat turns per cell (default 5)
- `--cells=A,B,C` — pin a subset of cell indices (default all 14)
- `--keep-projects` — skip teardown for debugging

When to run:
- Before tagging any v1.x with content edits to `src/legal/states/*`
  or `src/legal/templates/*`.
- Quarterly during ramp (full multi-state regression).
- After legal-content authoring rounds for new Bundesländer.

Both harnesses write `/tmp/architect-e2e-report.json` and
`/tmp/smoke-walk-matrix-report.json` respectively, with structured
per-phase / per-cell evidence.

---

## 11. Where to find more

- **AUDIT_REPORT.md** — the original 18-section audit; the source for
  every B-row referenced above.
- **PHASE_10_1_REPORT.md** — citationLint design + smokeWalk pattern.
- **PHASE_13_REVIEW.md** — qualifier-gate ship + rollback playbook.
- **HANDOFF.md** — architecture overview + post-v1 follow-up details.
- **DEPLOYMENT.md** — env vars, deploy/rollback, secret rotation,
  domain swap.
