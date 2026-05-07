# Post-V1 Adversarial Audit

> Read-pass dated 2026-05-08, audit range = `4ce7640^..HEAD` (every
> commit since the Phase 11 baseline through `e6de29c` post-tag).
> All claims backed by `file:line`. Bayern SHA verified MATCH at start
> and end of the read pass. **Nothing was fixed during this audit;
> findings only.**
>
> **v1.0.1 hot-fix (2026-05-08, commit `468ecc3`) closed three
> CRITICAL invite-flow findings — see "§ V1.0.1 RESOLVED FINDINGS"
> at the end of this doc.** The three originally-flagged CRITICALs
> in this doc (verify-fact race, 13b threshold disarmed, qualifier
> views RLS) **REMAIN OPEN** — they belong to a different threat
> model than the v1.0.1 set and are deferred to v1.1 per the user's
> "three CRITICAL fixes only, no SERIOUS or MINOR" directive. The
> production-ready posture comes from v1.0.1 closing the invite-flow
> holes; the originally-flagged trio is residual operational-signal
> + concurrency risk that the v1.1 sprint scopes.

## TL;DR

24 findings: **3 CRITICAL, 5 SERIOUS, 6 MEDIUM, 10 MINOR, 3 INFO.**
Bayern SHA `b18d3f7f9a6fe238c18cec5361d30ea3a547e46b1ef2b16a1e74c533aacb3471` verified at audit time.
**Production-ready verdict: YES-WITH-CAVEATS.** The architect surface
ships functional but has a lost-update race in `verify-fact` that
will silently clobber concurrent chat-turn writes; the 13b
operational signal is permanently disarmed by a data-shape mismatch;
and the locked CTA copy is set in the Edge Function response but
silently dropped before the user sees it. Headline: **the legal
shield's user-facing message never reaches the user**
(`qualifier_role_violation` not in `KNOWN_ERROR_CODES`).

---

## 1. Code correctness

### [CRITICAL-1] verify-fact race on `projects.state` UPDATE — STILL OPEN (v1.1)

`supabase/functions/verify-fact/index.ts:184-238` reads
`projects.state` at line 184-188, computes `next` at line 225, writes
the full state at line 235-238 with `eq('id', body.projectId)` — no
version predicate, no atomic CTE. Between read and write, a
`chat-turn` `commit_chat_turn_atomic` RPC can land and mutate
`projects.state`; verify-fact then overwrites with stale state.

**Repro:** architect clicks Bestätigen at the same moment a chat
turn is in flight. Outcome: chat-turn's facts/recs/etc. are silently
discarded. Same race between two architects clicking Bestätigen on
different rows simultaneously.

**Impact:** silent data loss in concurrent flows. The qualifier flip
itself "succeeds" but other state mutations are dropped.

**Fix:** wrap the read+write in a Postgres function (CTE), OR add an
`updated_at` predicate to the UPDATE and retry-on-mismatch, OR use
`jsonb_set` with a path-targeted patch in a single statement.

### [SERIOUS] streaming.ts vs index.ts event_log error-handling divergence

`supabase/functions/chat-turn/index.ts:499` warn-logs an event_log
insert failure and continues to the gate-rejection branch.
`supabase/functions/chat-turn/streaming.ts:312` bare-`await`s the same
insert with no try/catch — a transient DB blip propagates up to the
SSE catch block, blowing the whole turn (the user sees an `internal`
error frame instead of the `qualifier_role_violation` frame the gate
intended). Symmetric paths should fail symmetrically.

**Fix:** wrap the insert in try/catch in streaming.ts, mirror JSON
path's warn-and-continue pattern.

### [MEDIUM-1] invite_token has no TTL

`supabase/migrations/0026_project_members.sql` has no `expires_at`
column. A leaked invite_token (screenshot, support ticket, browser
history) is forever-claimable by any role=designer profile.

**Fix:** add `expires_at timestamptz default now() + interval '14 days'`
+ filter on it in `share-project`. v1.1.

### [MINOR] AcceptInvite leaves token in URL after claim

`src/features/architect/pages/AcceptInvite.tsx:53` calls
`setStatus`, but the URL keeps `?token=<uuid>` until manual nav. A
post-success `navigate(..., { replace: true })` would clean up the
browser-history breadcrumb.

### [MINOR] verifyMutation error state not cleared on subsequent success

`src/features/architect/pages/VerificationPanel.tsx:36 + :70-72`:
the local `error` is set on mutation failure but never cleared on
the next mutate. Stale error can linger across successful
verifications until the user manually closes it.

### [INFO] Hook deps + cleanup are clean

ArchitectGuard's `useEffect` deps (`isLoading, user, location.pathname,
location.search, navigate`) are exhaustive. AcceptInvite's effect
short-circuits on `status.kind !== 'idle'` so retries don't fire.
No `@ts-ignore` / `@ts-expect-error` introduced in the audit range
(grep -r returns zero hits).

### Confirmed clean
- No new `as any` cast in any audit-range file.
- No missing `await` (other than the deliberate `void serviceClient...` event-log fan-outs in MED-2).
- React Query stale-times are explicit (30s for project, 5min for is-designer/is-admin).

---

## 2. RLS + auth security

### [CRITICAL-3] qualifier_transitions + qualifier_rates_*_per_project views may bypass RLS

`supabase/migrations/0027_qualifier_transitions.sql:19` and
`supabase/migrations/0029_qualifier_metrics_view.sql:36,51,63`
create views WITHOUT `with (security_invoker = true)`. In Postgres
defaults the view runs as the view owner (typically `postgres` from
the Dashboard SQL Editor); RLS on `event_log` is checked against
the owner's session, not the caller's — meaning an `authenticated`
caller querying `qualifier_rates_7d_per_project` gets back EVERY
project's counts.

**Repro:** sign in as a regular user. `select * from
public.qualifier_rates_7d_per_project;` — if the result includes
projects you don't own / aren't a member of, RLS is bypassed.

**Impact:** project_id enumeration + per-project verify/reject
counts leak. Severity contingent on actual Postgres + Supabase
config — this is "needs runtime verification before tag goes
public". Same exposure on `qualifier_transitions` (per-row data
including user_id, project_id, attributes JSON).

**Fix:** rebuild both views with explicit `with (security_invoker =
true)` (Postgres ≥ 15). The author's intent comment at 0027:42-43
("View inherits the underlying event_log RLS policies") matches
this fix.

### [SERIOUS-1] Architects cannot read project messages

`0028_projects_architect_read.sql` extends `projects` SELECT to
accepted architect members. `messages` RLS (migration 0003) is
unchanged — owner-only via the projects sub-select. An architect
opening `/architect/projects/:id/verify` reads facts/recs/etc but
NOT the chat history that produced them.

**Impact:** the architect blesses qualifiers with no way to audit
the conversation that generated them. v1.5 §6.B.01 legal-shield
posture is technically met (a designer signed off) but the auditing
discipline is incomplete.

**Fix:** v1.1 — add a `messages` SELECT policy mirroring 0028. OR
expose a read-only "conversation log" surface to architects via an
Edge Function that uses service-role with a membership check.
**[VERIFY-WITH-RUTIK]** — could be intentional (architects bless
the materialized state, not the conversation); user spec is silent.

### [MEDIUM-2] event_log inserts in share-project + verify-fact are fire-and-forget

`supabase/functions/share-project/index.ts:258` and
`supabase/functions/verify-fact/index.ts:248`: `void
serviceClient.from('event_log').insert(rows).then(...)`. Edge
Function returns the response BEFORE the insert resolves; on Deno
runtime cold-shutdown the insert may be lost. Affects `qualifier.verified`
and `project_member.accepted` events — both feed the 0027 + 0029
views and the 13b telemetry.

**Fix:** `await` the insert. Cost is one extra DB roundtrip per
verify/claim; well within latency budgets.

### [INFO-2] Phase 13 architect-membership SELECT correctly scopes

Verified by reading `0026_project_members.sql:55-64`: the SELECT
policy `user_id = auth.uid() OR owner OR admin` means a regular
architect querying `select * from project_members where project_id=X`
sees ONLY their own row. Other architects' invite_tokens are NOT
visible to peers.

### [MINOR] 0026 RLS comments are inaccurate

Lines 76 + 81: claim "share-project Edge Function (SECURITY DEFINER)"
+ "uses anon-key with the architect's bearer". Reality: Edge
Function uses `SUPABASE_SERVICE_ROLE_KEY` after the role check.
Same effect; doc drift.

### [MINOR] role_in_project CHECK = 'designer' only

`0026_project_members.sql:28` constrains role_in_project. Comment
says "intentionally extensible". If a future migration widens the
check to add 'engineer', `share-project/index.ts:188` and
`verify-fact/index.ts:163-167` (designer-only role check) need
updating in lockstep — flagged dependency.

### Confirmed clean
- `gateQualifiersByRole` exhaustive on the five callable roles
  (`client | designer | engineer | authority | system`); the
  index.ts cast at `:141` defaults to 'client' on missing role.
- Service-role usage is bounded: `share-project` uses it only after
  the user-scoped role check; `verify-fact` uses it only after BOTH
  role + membership checks.
- No anon-key-as-service-role anywhere in audit range.
- profiles RLS (migration 0001) self-read only; designer detection
  in `useIsDesigner.ts:30-44` correctly returns own row.

---

## 3. Bayern SHA invariant

### [INFO-1] Bayern SHA is RUNTIME-PROVABLE

End-to-end verification:

- **Verifier** (`scripts/lib/bayernSha.mjs:47-58`) extracts six
  named exports (`SHARED_BLOCK`, `FEDERAL_BLOCK`, `BAYERN_BLOCK`,
  `MUENCHEN_BLOCK`, `PERSONA_BEHAVIOURAL_RULES`,
  `TEMPLATE_SHARED_BLOCK`) and joins with `\n\n---\n\n` + tail.
- **Runtime** (`src/legal/compose.ts:64-71`): same six slices via
  `composeLegalContext('bayern')` — `BAYERN_BLOCK` via
  `BAYERN_DELTA.systemBlock`, `MUENCHEN_BLOCK` via
  `BAYERN_DELTA.cityBlock`, others via direct imports.
- **Cache wiring** (`supabase/functions/chat-turn/systemPrompt.ts
  :216-243`): `composeLegalContext(bundesland)` is the FIRST text
  block with `cache_control: ephemeral`. The locale block (Phase
  3.7 #79) sits AFTER, uncached. Per-template tail is a SEPARATE
  cache_control marker.
- **No runtime variability inside the prefix:** `grep -nE "\\\$\{|new
  Date|Math.random|crypto\." src/legal/{shared,federal,bayern,
  muenchen,personaBehaviour,templates/shared}.ts` returns
  **zero matches**. No interpolation, no clock injection, no
  randomness.
- **Verifier and `verify:bayern-sha` CLI share the same module**
  (`scripts/verify-bayern-sha.mjs:9` imports from
  `scripts/lib/bayernSha.mjs`).
- **smokeWalk runs the same hash** (`scripts/smokeWalk.mjs:39`
  imports from `bayernSha.mjs`).

The Bayern SHA cannot diverge between file-read time and runtime
unless one of the six source files changes. The daily gate catches
that change.

### Confirmed clean
- `EXPECTED_BAYERN_SHA` constant present in exactly one place
  (`scripts/lib/bayernSha.mjs:23-24`); CLI + smokeWalk both import.
- Runtime audit-range commits did not edit any of the six source
  files (verified by `git diff --stat 4ce7640^..HEAD --
  src/legal/{shared,federal,bayern,muenchen,personaBehaviour}.ts
  src/legal/templates/shared.ts` — only `personaBehaviour.ts` had
  `ZITATE-DISZIPLIN` rule edits, and the SHA gate held those by
  baseline freeze at `b5a8d79`).

---

## 4. StateDelta framework + legal firewall

### [MINOR-10] 11 minimum stubs are unreachable in production

`src/features/wizard/hooks/useCreateProject.ts:184` hardcodes
`bundesland: 'bayern'`. Every project ever inserted via the wizard
resolves to `BAYERN_DELTA`. The 11 minimum stubs (sachsen, berlin,
etc.) compile but the persona NEVER reads them at runtime in v1.

**Impact:** the "in Vorbereitung" framing claimed in HANDOFF.md § 7.2
is correct in code but never fires for actual users. Acceptable per
locked B04 decision, but the HANDOFF.md framing slightly oversells
("the persona reads the framing aloud").

**Fix:** documentation polish; OR widen the wizard. Post-v1.

### Confirmed clean
- `legalRegistry.ts:104` falls back to BAYERN_DELTA on unknown
  bundesland — fail-safe to known content rather than crashing.
- All 16 states present in `src/legal/states/*.ts` (16 files
  excluding `_types.ts`).
- citationLint Layer-B has 16 home-bundesland-tagged patterns
  (`citationLint.ts` :200-305 grep returns 16). Matches state
  count.
- `allowedCitations: []` empty for every minimum stub, asserted by
  smokeWalk's `MINIMUM_STUBS` loop in `scripts/smokeWalk.mjs:798-814`.
- All 11 stubs carry the verbatim "in einer späteren Bearbeitungs-
  phase ergänzt" hinweis — read sample (`states/sachsen.ts:14-15`,
  `states/berlin.ts:18-19`).
- 110/110 smokeWalk fixtures green at audit time (CHECK-CONSTRAINT-
  matching-source aside, the lint layer is fully exercised).

---

## 5. Phase 13 architect flow — end-to-end walk

### [SERIOUS-2] Locked CTA copy is silently dropped before the user sees it

`supabase/functions/chat-turn/index.ts:506-520` returns a 403 with
the locked German message: *"Diese Festlegung erfordert die Freigabe
durch eine/n bauvorlageberechtigte/n Architekt/in."*
The SPA's `useChatTurn.ts:418-424` calls `setLastError({code:
err.code})` — drops `err.message`. `ErrorBanner.tsx:7-18`'s
`KNOWN_ERROR_CODES` set does NOT include `'qualifier_role_violation'`.
`ErrorBanner.tsx:26` falls through to `'internal'`. The user sees
`t('chat.errors.internal.title')` + `.body`, neither of which
references the architect-invite CTA.

**Repro:** sign in as a `role=client`, send a chat turn that the
model emits as DESIGNER+VERIFIED (or hand-craft a tool input via
the model's tool use that does so). Expected: locked German CTA in
the banner. Actual: generic "internal error" copy.

**Impact:** v1.5 §6.B.01 user-facing message never lands. The
locked spec wording (`PHASE_17_SCOPE.md "Locked CTA text"`) is set
in the Edge Function but discarded by the SPA. The legal shield's
operational copy fails to reach its audience.

**Fix:**
1. Add `'qualifier_role_violation'` to `KNOWN_ERROR_CODES` in
   `ErrorBanner.tsx:7-18`.
2. Add `chat.errors.qualifier_role_violation.{title,body}` to
   `src/locales/de.json` + `en.json`. The body should carry the
   locked text verbatim.
3. (Optional) widen `setLastError` to carry `err.message` so the
   server's locked text is the source of truth.

### [MEDIUM-3] verify-fact's `lastTurnAt` overwrite is semantic misuse

`verify-fact/index.ts:307,314,321,328,335`: every `applyVerification`
branch sets `lastTurnAt: q.setAt`. But `lastTurnAt` is documented
as "the persona's last spoken turn"; a verification is not a turn.
Side-effect: dashboard "recent activity" surfaces verifications as
chat turns, which they aren't.

**Fix:** drop the `lastTurnAt` assignment. OR add a separate
`lastVerifiedAt` field if needed; current SPA doesn't read it.

### [SERIOUS-4] ArchitectGuard error surfaces are English

`src/features/architect/ArchitectGuard.tsx:49,60,62-63,65-69,75`:
"Verifying architect", "403 — Restricted", "The architect console
is for bauvorlageberechtigte/n only.", "Your account is not
registered as an architect for this environment.", "Back to
dashboard". All English, while ArchitectDashboard / VerificationPanel
/ AcceptInvite / chat-turn rejection envelope are German. Code-mixing
("bauvorlageberechtigte/n only") is jarring.

**Fix:** German copy, consistent with the locked CTA register.

### [MINOR] verify-fact has no idempotency check

Re-clicking Bestätigen on an already-verified row produces a
duplicate `qualifier.verified` event_log row. Skews the rolling
counts; no functional harm.

### [MINOR] verify-fact has no pre-flip qualifier check

If a fact is currently `LEGAL+CALCULATED` (statute-grounded) and
the architect clicks Bestätigen, it becomes `DESIGNER+VERIFIED` —
the source attribution flips from LEGAL to DESIGNER. The architect
can over-claim a statute-grounded fact as their own. Probably not
intended.

**Fix:** verify-fact should require current source to be DESIGNER
(or guard against flipping LEGAL/AUTHORITY → DESIGNER).
**[VERIFY-WITH-RUTIK]** — spec is silent on this edge case.

### [MEDIUM-6] No SPA UI to revoke unclaimed invites

`0026_project_members.sql:91-99` permits owner DELETE of unclaimed
rows, but no SPA surface exposes "list my outstanding invites + revoke".
Owner has to hit Supabase Dashboard SQL Editor.

### [MEDIUM-5] QualifierRoleViolationError class is dead weight

`src/lib/projectStateHelpers.ts:197-209` exports
`QualifierRoleViolationError`. Documentation in `:178-179` says it's
thrown by the Edge Function. **Reality:** grep returns zero throw
sites in production code; the class is only constructed in
`qualifierGate.test.ts:36`. The Edge Function uses
`return respond({code: 'qualifier_role_violation', ...}, 403)`
directly. Class + doc drift.

### Confirmed clean
- Idempotency on share-project: re-claim by same user returns
  `alreadyAccepted: true` (line 197-212).
- Race on share-project's UPDATE is guarded by `is('user_id', null)`
  (line 217-253).
- chat-turn outer `finally` catches both branches; no
  double-finalize.
- `useIsDesigner` cleanly handles RLS error, anonymous, and
  loading.

---

## 6. Error handling + user-facing resilience

### [SERIOUS] qualifier_role_violation hands generic copy to the user

(See SERIOUS-2 above; load-bearing for this dimension.)

### Confirmed clean
- chat-turn JSON path: every throw path produces a user-readable
  envelope with `requestId`.
- Streaming path: SSE error frames include code + requestId.
- Audit B12 (rate-limit user-facing 500) shipped as known per
  OPS_RUNBOOK.md § 7.
- AcceptInvite: explicit error → success → idle states; no
  "stuck spinner" path.
- Sentry consent gate (`src/features/cookies/SentryLifecycle.tsx`):
  init guarded on `state.functional`, decline path tested by
  Phase 9.2.

---

## 7. Build + bundle + dependency health

### [MEDIUM-4] .env.example missing two VITE_* vars

`.env.example` documents 2 vars; `DEPLOYMENT.md § 2.1` documents 4
(adds `VITE_SENTRY_DSN`, `VITE_POSTHOG_KEY`). New developers
copying `.env.example → .env.local` get no Sentry/PostHog wiring.
Code in `src/lib/{errorTracking,analytics}.ts` gates on key presence
+ PROD mode, so it degrades gracefully — but the inconsistency is
real.

**Fix:** add the two VITE_* vars to `.env.example` with placeholder
values + a "set in Vercel" comment.

### [INFO-3] Bundle headroom is comfortable

Main `index-*.js` chunk: **272.87 KB gz** per Vite reporter (or
264.7 KB KiB per `verify-bundle-size.mjs`'s 1024-byte computation
— same byte count, different unit convention). Ceiling 300 KB; ~28
KB gz headroom. Architect chunk (`ArchitectRoutes-*.js`)
**4.28 KB gz** — properly lazy-loaded. AdminRoutes chunk
**11.72 KB gz**. fontkit + exportPdf load only on PDF-export
intent.

### Confirmed clean
- TypeScript strict-mode preserved (`tsc --noEmit` clean at audit
  time).
- No new dependencies added during the audit range — `git diff
  4ce7640^..HEAD -- package.json` shows only ranges of existing
  packages bumped (Phase 11+).
- All four daily gates green at audit start AND end.
- Build deterministic-ish: re-running `npm run build` produces
  same chunk count; chunk hashes change because they include build
  timestamp / source-map references but the tree is structural.

---

## 8. Observability + telemetry coverage

### [CRITICAL-2] 13b conditional-trigger threshold is permanently disarmed

`supabase/migrations/0029_qualifier_metrics_view.sql:48-49`:
```sql
(select count(distinct (project_id, session_id)) from windowed
   where source = 'chat-turn') as turns_count;
```

But `event_log.source` has a CHECK constraint
(`migrations/0020_event_log.sql:52-54`):
```sql
source text not null check (source in (
  'wizard', 'chat', 'result', 'auth', 'dashboard', 'sentry', 'system'
))
```

`'chat-turn'` is **NOT** in the allowed values. **No row can have
source='chat-turn'** under the constraint. Independently, no code
path emits source='chat-turn' anywhere in the audit range (verified
by `grep -rn "source.*'chat-turn'"`). `EventSource` union in
`src/lib/eventBus.ts:46-52` matches the CHECK constraint exactly.

`turns_count` is therefore permanently `0`. The CLI's threshold
predicate (`scripts/qualifier-downgrade-rate.mjs:73`) is
`numerator > 5 && turns >= 100` — the right conjunct never holds.
`exceedsThreshold` is permanently `false`. `--fail-on-threshold`
never exits 2 even under a real false-positive surge.

**Repro:** open a fresh terminal with `SMOKE_SUPABASE_URL` +
`SMOKE_SUPABASE_SERVICE_KEY` set; run `node
scripts/qualifier-downgrade-rate.mjs --fail-on-threshold` after
fabricating 200 qualifier.rejected events in event_log. Expected
exit code: 2. Actual: 0.

**Impact:** the operational signal that `OPS_RUNBOOK.md § 4` and
`PHASE_13_REVIEW.md` rely on is dead. A real false-positive surge
in production would not trigger the rollback playbook because the
threshold structurally cannot fire.

**Fix options:**
- Replace `where source = 'chat-turn'` with
  `where source = 'chat' AND name = 'chat.turn_completed'` AFTER
  emitting that event in chat-turn (new code).
- OR query `count(*) from public.messages where role='assistant'
  and created_at >= now() - interval '7 days'` directly — more
  accurate denominator.
- Whichever path: add a `--phase=13b` smokeWalk drift fixture that
  fabricates 200 qualifier.rejected + 200 chat-turn-equivalent
  events and asserts the CLI exit code is 2.

### [MEDIUM-2] event_log fan-out is fire-and-forget in two Edge Functions

(Already enumerated under § 2.)

### Confirmed clean
- citation.violation events still flow per Phase 10.1
  (`citationLint.ts:523`).
- Tracer FK-ordering known issue (audit B10) shipped as-known per
  OPS_RUNBOOK.md.
- Sentry tags carry `requestId` from the chat-turn pipeline.
- `qualifier_transitions` view (0027) flatly maps event_log rows;
  attribute-key extraction (`field`, `item_id`, etc.) matches the
  three writer-sites' attribute schema.

---

## 9. Documentation integrity

### [SERIOUS-3] Stale comment in chat-turn/index.ts:131-135

> "Phase 13 Week 1 — fetch caller's profile role for the qualifier-
> write-gate. … the gate only downgrades DESIGNER+VERIFIED attempts
> in observability mode, **never rejects**."

The gate IS in rejection mode (Week 2 flip;
`QUALIFIER_GATE_REJECTS = true` at
`projectStateHelpers.ts:187`). Comment is stale.

### [MINOR-5] DEPLOYMENT.md mentions 0004 duplicate but not 0005

`docs/DEPLOYMENT.md § 3` flags two `0004_*.sql` files. The same
duplication exists at 0005 (`0005_likely_user_replies.sql` +
`0005_seed_dashboard_variety_OPTIONAL.sql`). Doc oversight.

### [MINOR] HANDOFF.md doesn't reach the v1.0 tag

`v1.0` annotated tag points to commit `cba59e4` per `git rev-parse
v1.0^{commit}`. The "Operational responsibilities — split between
engineering and client" § 9 in HANDOFF.md was added in `e6de29c`,
which is AFTER the tag. A `git checkout v1.0` doesn't see § 9.
User-directed order; flagging for awareness only.

### Confirmed clean
- Every commit hash referenced in HANDOFF.md exists in `git log`
  (spot-checked `024fbcd`, `80fc5ae`, `39d137b`, `ff87612`, `f1c0aae`,
  `c3860c6`, `575321f`, `7f4466f`, `3b28bf3`).
- Every npm script referenced in DEPLOYMENT.md / OPS_RUNBOOK.md
  exists in `package.json`: `verify:bayern-sha`, `smoke:citations`,
  `verify:locales`, `verify:hardcoded-de`, `verify:bundle`, `build`,
  `test:e2e`.
- Every file path referenced in HANDOFF.md spot-checks present
  (sampled `src/legal/states/_types.ts`, `src/legal/legalRegistry.ts`,
  `src/lib/projectStateHelpers.ts`, `supabase/functions/share-project/`,
  `supabase/functions/verify-fact/`).
- Every migration number referenced: 0001..0023, 0026..0029
  (and the documented gap at 0024+0025) — all present on disk.
- The known-error catalogue in OPS_RUNBOOK.md § 7 cross-walks
  cleanly to AUDIT_REPORT.md B-rows.

---

## 10. The four deferred phases — honest framing

### Confirmed clean

- **Phase 12.5 (async takt):** HANDOFF.md § 7.1 frames as
  architectural debt with rough rebuild estimate. Sync persona
  pipeline is what v1 actually exercises; no async takt in code
  (verified — no `participants` table, no per-message author scope
  beyond `user_id`).
- **Phase 14 (11 stubs):** all 11 carry verbatim "in Vorbereitung"
  framing in `systemBlock`; smokeWalk asserts (line 798-814). Stubs
  unreachable in production due to B04 (already flagged MIN-10).
- **Phase 15 (Geoportal):** München WMS in
  `src/features/wizard/components/PlotMap/...` still mounts; build
  green. Per-state Geoportals are explicitly post-v1.
- **Phase 16 (nightly regression):** manual smoke:citations gate
  is what v1 ships; OPS_RUNBOOK.md § 9 documents the cron-vs-manual
  trade-off.

### Confirmed honest framing

- HANDOFF.md § 7's per-phase entries say "what's missing", "why
  deferred", "rough rebuild estimate" — all three. No spin.
- PHASE_ROADMAP.md `[POST-V1]` banner pattern preserves original
  scope below for the post-v1 reader (verified by reading the
  Phase 14 / 15 / 16 sections).
- HANDOFF.md § 9.1 explicitly names "the 11 minimum stubs honestly
  surface 'in Vorbereitung' framing — that's the defensible v1
  minimum" verbatim per the locked spec.

---

## Final verdict

**Production-ready: YES-WITH-CAVEATS.**

The architect surface ships and works for the happy path. The
infrastructure (RLS, auth, gate, Edge Functions, three handoff
docs) is in place. Bayern SHA discipline held throughout 33+
commits. Deferred-phase framing is honest.

**Three CRITICAL findings need attention before public traffic
hits the system:**

1. **CRITICAL-1 (verify-fact race)** — silent data loss on
   concurrent flows. v1.0.1 hot-fix.
2. **CRITICAL-2 (13b threshold disarmed)** — the operational
   signal that the rollback playbook keys off is dead. v1.0.1
   hot-fix OR the manager accepts that early-rollout monitoring
   is "watch the event_log directly" instead of CLI-driven.
3. **CRITICAL-3 (qualifier views may bypass RLS)** — needs runtime
   verification (run `select * from public.qualifier_rates_7d_per_project;`
   as a non-admin authenticated user; if it returns rows from
   projects the user doesn't own, fix is `with (security_invoker
   = true)`). v1.0.1 hot-fix if it leaks.

**Five SERIOUS findings warrant scoped fixes before broad rollout:**

4. **SERIOUS — `qualifier_role_violation` not in `KNOWN_ERROR_CODES`
   + missing locale keys.** Locked CTA copy doesn't reach the
   user. Two-line fix; v1.0.1.
5. **SERIOUS-1 — Architects can't read messages.** [VERIFY-WITH-RUTIK]
   — could be intentional. v1.1 if not.
6. **SERIOUS-3 — Stale comment in chat-turn/index.ts:131-135.**
   Doc-only; v1.0.1.
7. **SERIOUS-4 — ArchitectGuard's English copy.** i18n consistency;
   v1.0.1.
8. **SERIOUS — Streaming path's bare-await on event_log.** Brittle
   in DB-trouble scenarios; v1.0.1.

**Six MEDIUM and ten MINOR findings can wait for v1.1 unless any
become impactful in early ops.**

## Recommended next actions in priority order

1. Fix **CRITICAL-2** (13b threshold) — one migration patch +
   one denominator query change. Low risk, high signal.
2. Fix **SERIOUS-2** (locked CTA copy reaches user) — three
   lines: ErrorBanner Set + 2 locale keys.
3. Run the runtime test for **CRITICAL-3** (view RLS) — five
   minutes against the dev DB. If it leaks, fix to
   `security_invoker = true` is one ALTER per view.
4. Fix **CRITICAL-1** (verify-fact race) — wrap in CTE or add
   `updated_at` predicate + retry.
5. Bundle the remaining v1.0.1 fixes into a single hot-fix tag
   (SERIOUS-3, SERIOUS-4, SERIOUS-5).
6. Track the rest as v1.1 backlog in HANDOFF.md § 7.

## Hot-fix vs v1.1 categorization

**v1.0.1 hot-fix (engineering responsibility, ~1 day):**
- CRITICAL-1, CRITICAL-2, CRITICAL-3 (after runtime test confirms)
- SERIOUS-2 (locked CTA), SERIOUS-3 (stale comment), SERIOUS-4 (i18n)
- SERIOUS streaming.ts bare-await
- MEDIUM-4 (.env.example)
- MINOR DEPLOYMENT.md 0005 doc

**v1.1 (post-tag, scope decision):**
- SERIOUS-1 (architect message access — needs spec decision)
- MEDIUM-1 (invite_token TTL)
- MEDIUM-2 (await event_log inserts)
- MEDIUM-3 (lastTurnAt semantics)
- MEDIUM-5 (QualifierRoleViolationError dead code)
- MEDIUM-6 (UI for invite revocation)
- All MINOR items not folded into v1.0.1

**Bayern SHA `b18d3f7f9a6fe238c18cec5361d30ea3a547e46b1ef2b16a1e74c533aacb3471` MATCH at end of audit.**

---

## V1.0.1 RESOLVED FINDINGS (commit `468ecc3`, tag `v1.0.1`)

A second-pass review of the architect-invite flow surfaced three
additional CRITICAL findings that the user authorised as the v1.0.1
hot-fix scope. All three RESOLVED in commit `468ecc3`:

### [v1.0.1 CRIT-1] share-project lacked explicit owner check on invite creation — RESOLVED

**Original posture (v1.0):** project_members INSERT was reachable
only via SQL or via an RLS-protected client; no Edge-Function
create path existed. RLS at `0026:67-78` enforced `owner_id =
auth.uid()` for INSERTs, but a code-level owner check + structured
403 didn't exist.

**Fix (v1.0.1, commit `468ecc3`):** `supabase/functions/share-project/
index.ts` gains a `{action:'create', projectId}` mode. Before the
INSERT, `handleCreate` reads `projects.owner_id` and compares
explicitly against `auth.uid()`; mismatch returns
`{code:'forbidden', message:'Only the project owner can create
architect invites.'}`. RLS is preserved as a second layer.

**Pinned by smokeWalk drift fixture** `v1.0.1 CRIT-1: non-owner-
cannot-share` (three source-asserts).

### [v1.0.1 CRIT-2] accept-side designer-role check unpinned — RESOLVED

**Original posture (v1.0):** `share-project/index.ts:142-156`
already required `profile.role === 'designer'` before claiming an
invite. Behaviour was correct but no drift gate fired if a future
refactor accidentally removed it.

**Fix (v1.0.1, commit `468ecc3`):** check pinned by smokeWalk drift
fixture `v1.0.1 CRIT-2: accept-rejects-non-designer` (two source-
asserts on `handleAccept`'s role-check branch + the locked 403
copy).

### [v1.0.1 CRIT-3] invite_token had no TTL — RESOLVED

**Original posture (v1.0, also doc'd as MEDIUM-1 in this audit):**
`project_members.invite_token` was generated by `gen_random_uuid()`
with no expiry column. A leaked token (screenshot, support ticket,
browser history) was forever-claimable.

**Fix (v1.0.1, commit `468ecc3`):**
- Migration `0030_project_members_expiry.sql` adds `expires_at
  timestamptz default now() + interval '7 days'` + backfills pre-
  existing rows from `invited_at + 7 days` + creates partial index
  `project_members_expires_at_idx` for stale-invite cleanup.
- `share-project/index.ts:handleAccept` rejects expired tokens
  with the locked German copy *"Diese Einladung ist abgelaufen.
  Bitte den Bauherrn um eine neue."*
- `OPS_RUNBOOK.md § 6` documents the v1.0.1 Edge-Function-based
  alternative to manual SQL provisioning + the stale-invite cleanup
  query.

**Pinned by smokeWalk drift fixtures** `v1.0.1 CRIT-3: accept-
rejects-expired-token` (three asserts on the Edge Function) +
`v1.0.1 CRIT-3: 0030_project_members_expiry.sql shape` (four
asserts on the migration).

### Daily gates at v1.0.1

- `verify:bayern-sha` — SHA `b18d3f7f…3471` unchanged across the
  hot-fix.
- `smoke:citations` — 110+ existing fixtures + 4 new v1.0.1 drift
  groups, all green.
- `tsc --noEmit` — clean.
- `npm run build` — green; bundle 264.7 KB gz / 300 KB ceiling.

### What v1.0.1 did NOT close

By user directive, the v1.0.1 hot-fix touched ONLY the three new
CRITICAL invite-flow findings. The three originally-flagged
CRITICALs in this doc (verify-fact race, 13b threshold disarmed,
qualifier views RLS) plus all SERIOUS / MEDIUM / MINOR items
remain documented above for v1.1 scoping.
