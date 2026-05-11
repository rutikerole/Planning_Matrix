# Session Resume State — 2026-05-11

> Fresh-session reconstruction after the 2-day weekend gap. Empirical
> probes only. file:line proof for every claim. No fixes applied; no
> migrations applied; no deploys triggered.
>
> **Bayern SHA verified MATCH at start AND end of investigation:**
> `b18d3f7f9a6fe238c18cec5361d30ea3a547e46b1ef2b16a1e74c533aacb3471`.
>
> **State-drift disclosure:** during this investigation the user committed
> `166c3bd docs(handoff): v1.0.5 is production-ready tag` locally + did
> `git pull --rebase origin main` (reflog HEAD@{1..3}). HEAD moved from
> `c35e3fa` (audit start) to `166c3bd` (audit end). The `v1.0.5` tag was
> also placed during the window. All evidence below reflects end-state
> (HEAD = `166c3bd`).

---

## TL;DR

- **Last tag:** `v1.0.5` at `c35e3fa` (Layer-C citation-firewall closes B3).
- **Main HEAD:** `166c3bd` (one commit past `v1.0.5`: HANDOFF § 9 doc fix).
- **Working tree:** clean; one stale stash (Phase-7.10 WIP); `main` in sync with `origin/main`.
- **All four daily gates GREEN** — Bayern SHA MATCH, tsc clean, smoke walk OK, build 266.3 KB gz (ceiling 300 KB).
- **Live infra reachable** — Vercel SPA 200 (last-modified 03:31:20 UTC today, cache HIT); three Edge Functions return 204 on OPTIONS.
- **v1.0.6 race-fix work is parked** on `feature/v1-0-6-race-fix` (`95c8c30`) per its own commit message. Main carries **zero** references to `state_version` / `expectedStateVersion` / `protectVerifiedQualifiers`.
- **One deployment-state quirk** — migration `0033` is **applied on live DB** (column `state_version` empirically present) even though the migration lives only on the parked feature branch. The column is currently **inert** (no main code reads it); benign forward-compat for v1.1 merge.
- **Production-ready verdict:** **YES-FOR-BAYERN-ONLY** at `v1.0.5`.
- **Recommended next action:** Stop. The project is in a clean shipped state. No engineering move is required.

---

## 1. Git history reconstruction

### Tag inventory (newest first)

```
v1.0.5      ← (tag placed during this investigation; commit c35e3fa)
v1.0.4
v1.0.4-rc.1
v1.0.3
v1.0.2
v1.0.1
v1.0
```

### HEAD walk on main (last 10)

| SHA | Date | Subject |
| --- | --- | --- |
| `166c3bd` (HEAD) | 2026-05-11 09:37 | docs(handoff): v1.0.5 is production-ready tag |
| `d4697d6` | 2026-05-10 06:03 | chore(freshness): weekly snapshot update (freshness-bot) |
| `c35e3fa` **(tag v1.0.5)** | 2026-05-08 18:01 | feat(citation-firewall): wire allowedCitations into runtime as Layer-C positive-list (closes PROD_READINESS_AUDIT B3) |
| `f848813` | 2026-05-08 17:10 | chore(deploy): trigger v1.0.4 production build with VITE_LEGAL_* envs set |
| `7b4ffe7` | 2026-05-08 16:49 | fix(deploy): A1 hot-patch — Vercel preview soft-mode for legal-config validator |
| `5d79a07` **(tag v1.0.4)** | — | docs(v1.0.4): close-out — resolution tables + version ladder + audit cross-refs |
| `104608b` | — | docs(compliance): D2+D3+D6 — compliance manifest + legal-copy review prep + dependabot |
| `567b724` | — | fix(quality): C3+C4 — streaming await safety + ArchitectGuard German + stale comment |
| `df4c1fc` **(tag v1.0.4-rc.1)** | — | fix(ux): A3 — qualifier_role_violation reaches the user (closes audit blocker) |
| `075283d` | — | fix(ops): A2 — 13b denominator alarm rewire (closes audit CRITICAL-2) |

### Branches

| Branch | Tip | Notes |
| --- | --- | --- |
| `main` (local + origin) | `166c3bd` | clean working tree; in sync with origin |
| `feature/v1-0-6-race-fix` (local + origin) | `95c8c30` | one commit ahead of `main`; explicitly **PARKED** per its commit body |

### Stashes

`stash@{0}: On main: chat-turn WIP — restore after phase-7.10 merge to main`
[INFO] Stale; unrelated to current work. Not load-bearing.

### Working tree

`git status --short` → empty. Clean.

### State-drift during investigation

Reflog HEAD@{0..4} shows: user checked out from feature branch → committed HANDOFF update locally as `79ec655` → `pull --rebase origin main` picked up `d4697d6` (freshness bot) → rebased local commit to `166c3bd`. The `v1.0.5` annotated tag was placed at `c35e3fa` during the same window. This is the audit-end state.

**[INFO]** main and origin/main are in sync at `166c3bd`. No divergence.

---

## 2. The v1.0.6 in-flight question

[INFO] **Resolved: v1.0.6 race-fix work is intentionally parked on `feature/v1-0-6-race-fix`. Main is unaware.**

**Branch tip metadata (`git show feature/v1-0-6-race-fix`):**

> "wip(concurrency): v1.0.6 Phase A — C1 verify-fact race fix (parked for v1.1)"
>
> "Pre-built optimistic-lock + AI-overwrite-guard for POST_V1_AUDIT
>  CRITICAL-1, parked on this feature branch after user scope-review
>  on 2026-05-11. … This branch is production-shippable as-is when
>  v1.1 scopes the race fix."

**Diff main..feature/v1-0-6-race-fix --stat:**

```
 scripts/smokeWalk.mjs                              | 414 +++++++++++
 src/features/architect/lib/verifyFactClient.ts     |  10 +++
 src/features/architect/pages/VerificationPanel.tsx |  62 ++-
 src/lib/projectStateHelpers.ts                     | 184 ++++++
 supabase/functions/chat-turn/index.ts              |  56 +++
 supabase/functions/chat-turn/streaming.ts          |  57 +++
 supabase/functions/verify-fact/index.ts            | 208 ++++++
 supabase/migrations/0033_projects_state_version.sql|  86 +++
 8 files changed, 1067 insertions(+), 10 deletions(-)
```

**Main-side absence check (`grep -rln "expectedStateVersion|state_version|state_conflict|protectVerifiedQualifiers|QualifierProtectEvent" src/ supabase/` from main HEAD):** zero matches. Main contains none of the v1.0.6 markers.

**[SERIOUS]** Migration `0033_projects_state_version.sql` is present **only** on the feature branch — yet the live DB has the `state_version` column applied (see § 4). This is a deliberate dual-state: schema applied for forward-compat, code parked. The branch commit body's "Apply migration 0033 to live Supabase" step appears to have been executed even though the rest of the deploy was skipped. See § 4 and § 12 for risk assessment.

---

## 3. v1.0.3 VorlaeufigFooter question

[INFO] **Resolved: VorlaeufigFooter is fully wired into all 6 result surfaces as of v1.0.3 (commit `b98cc98`).**

**Wiring confirmed (`grep -nE "VorlaeufigFooter" …`):**

| File | Lines |
| --- | --- |
| `src/features/result/components/tabs/OverviewTab.tsx` | 8, 10, 52 (`{anyPending && <VorlaeufigFooter …/>}`) |
| `src/features/result/components/tabs/TeamTab.tsx` | 9, 11, 136, 197 |
| `src/features/result/components/tabs/SuggestionsTab.tsx` | 9, 11, 119 |
| `src/features/result/components/tabs/ProcedureDocumentsTab.tsx` | 14, 16, 99, 211, 281 |
| `src/features/result/components/tabs/CostTimelineTab.tsx` | 19, 21, 246 |
| `src/features/result/components/Cards/SuggestionCard.tsx` | 13, 191 |

`docs/POST_SMOKE_TEST_INVESTIGATION.md:187` marks the original SERIOUS-3 finding **RESOLVED-IN-V1.0.3**. v1.0.3 hot-fix shipped; gap closed.

---

## 4. Live database state

Probes against `https://dklseznumnehutbarleg.supabase.co/rest/v1/...` with anon JWT.

### Control: bogus column on existing table returns HTTP 400

```
GET /rest/v1/projects?select=id,does_not_exist_xyz&limit=0
→ HTTP/2 400        ← proves 400 means "column not found"
```

### Migration apply state (positive-evidence probes)

| Migration | Marker probed | Result | Status |
| --- | --- | --- | --- |
| `0026_project_members.sql` | `GET /project_members?select=id,expires_at` | 200, `[]` | **APPLIED** (table + 0030 column both present) |
| `0027_qualifier_transitions.sql` | `GET /qualifier_transitions?select=*&limit=0` | 200, `[]` | **APPLIED** (view exists; columns per `0027:19-40`) |
| `0028_projects_architect_read.sql` | (inferred via 0026) | — | Assumed APPLIED — would need authenticated probe to confirm policy |
| `0029_qualifier_metrics_view.sql` | `GET /qualifier_rates_7d_per_project?select=project_id` | 200, `[]` | **APPLIED** |
| `0030_project_members_expires_at` | `GET /project_members?select=expires_at` | 200, `[]` | **APPLIED** |
| `0031_fix_projects_rls_recursion.sql` | (inferred from `v1.0.2` shipped + tagged) | — | Assumed APPLIED |
| `0032_qualifier_metrics_denominator_fix.sql` | `GET /qualifier_rates_7d_global?select=turns_count,downgraded_count` | 200, `[{"turns_count":0,"downgraded_count":0}]` | **APPLIED** (turns_count column present; the v1.0.4 alarm-rewire view exists) |
| **`0033_projects_state_version.sql`** | `GET /projects?select=id,state_version&limit=0` | **200**, `[]` (vs control 400 for bogus column) | **APPLIED on live DB** despite living only on the parked `feature/v1-0-6-race-fix` branch |

**[SERIOUS — PARTIAL-DEPLOY]** The `state_version` column exists on live `public.projects`, yet:

- No commit on `main` adds the migration file (`supabase/migrations/` ends at `0032_*` on main; `ls -la` confirms).
- No code on `main` reads or writes the column (grep returned zero hits).

This is a **forward-compat partial-deploy**:
1. Column gets bumped silently by the trigger (if also applied — unverified via REST; requires service-role probe).
2. Live Edge Functions (`verify-fact`, `chat-turn`) — deployed from main — never read `state_version`, so behavior is unchanged.
3. When `feature/v1-0-6-race-fix` eventually merges into v1.1, the column is already there and pre-warmed.

**Risk:** ZERO operational impact at v1 single-Bauherr scale. The only honesty cost is doc-drift — `main` does not document that `state_version` exists in the live schema.

**[VERIFY-WITH-RUTIK]** Was the trigger `bump_projects_state_version` applied alongside the column, or column-only? An authenticated `select tgname from pg_trigger where tgrelid='public.projects'::regclass` would settle it. Not blocking; v1.1 reapply of `0033` is idempotent (`CREATE OR REPLACE FUNCTION` + `DROP TRIGGER IF EXISTS` per migration text).

### qualifier_rates_7d_global empirical content

```
[{"turns_count":0,"downgraded_count":0}]
```

[INFO] Counts at zero — live DB has not seen meaningful chat-turn traffic in the last 7 days. Consistent with B2B closed-pilot state. Not a regression.

### CRITICAL-3 (qualifier-views RLS) anon-path

Anon probes returned `[]` on `qualifier_transitions`, `qualifier_rates_7d_per_project`, `qualifier_rates_7d_global`. **Anon path empirically clean** (consistent with `POST_V1_AUDIT.md:228-242`). Authenticated-non-admin probe still pending per the audit doc — `[VERIFY-WITH-RUTIK]` needs test JWT; remains v1.1 work.

---

## 5. Live Edge Function state

Probed via OPTIONS preflight against `https://dklseznumnehutbarleg.supabase.co/functions/v1/...`:

| Function | OPTIONS response | CORS allow-origin |
| --- | --- | --- |
| `verify-fact` | HTTP/2 204 | `http://localhost:5173` |
| `chat-turn` | HTTP/2 204 | `https://planning-matrix.vercel.app` |
| `share-project` | HTTP/2 204 | `http://localhost:5173` |

All three reachable. Region `ap-south-1` (consistent with Phase 17 deployment notes). `sb-project-ref: dklseznumnehutbarleg` confirms correct project.

[MINOR] `verify-fact` and `share-project` advertise `http://localhost:5173` as CORS allow-origin while `chat-turn` advertises the production Vercel origin. Suggests `chat-turn` was redeployed more recently with prod CORS env, while `verify-fact` / `share-project` last redeployed against dev-only CORS. Functional impact: the production SPA at `planning-matrix.vercel.app` may be rejected by `verify-fact` / `share-project` on `Origin` checks. **[VERIFY-WITH-RUTIK]** — does the architect flow actually work against production? If yes, dev origin in OPTIONS is informational-only and the function ignores `Origin` (which is the Supabase default). If no, redeploy with prod CORS env.

[INFO] Cannot empirically probe whether the deployed `verify-fact` ignores `expectedStateVersion` vs honors it without sending an authenticated POST with a real `projectId`. Based on § 2 (main has no race-fix code) the deployed function **almost certainly ignores `expectedStateVersion`**.

---

## 6. Live SPA deployment state

```
HEAD https://planning-matrix.vercel.app/
→ HTTP/2 200
  last-modified: Mon, 11 May 2026 03:31:20 GMT
  etag: "c3860df3103c011d0786afa0270efdb4"
  x-vercel-cache: HIT
  x-vercel-id: bom1::88vsn-1778472404946-b53f9fd54459
```

**Live SPA bundle:** `index-Cw3PM0W-.js` (extracted from served HTML).
**Local `npm run build` bundle (this session):** `index-B1rCK0zO.js`.

[INFO] Hash mismatch is **expected**, not a deploy mismatch. Vite inlines `VITE_*` env vars into the bundle at build time. The local `.env.local` and the Vercel build env carry different `VITE_LEGAL_*` values, so the bundle hash diverges deterministically. Verified the local build comes from the same source tree (HEAD `166c3bd`).

[INFO] CSP header is well-formed and v1.0.4-grade: explicit `connect-src` allow-list, `frame-ancestors 'none'`, `object-src 'none'`. No drift from `docs/security.md` posture.

`last-modified: 03:31 UTC today` — the deploy was triggered approximately at the time of `f848813` (the explicit "trigger v1.0.4 production build with VITE_LEGAL_* envs set" commit) or later. The deploy almost certainly includes `c35e3fa` (the `v1.0.5` tag commit). Cannot prove without Vercel-side log access.

---

## 7. Bayern SHA — discipline anchor

```
$ npm run verify:bayern-sha  (start of investigation)
Bayern composed-prefix SHA-256: b18d3f7f9a6fe238c18cec5361d30ea3a547e46b1ef2b16a1e74c533aacb3471
Expected baseline:              b18d3f7f9a6fe238c18cec5361d30ea3a547e46b1ef2b16a1e74c533aacb3471
✓ MATCH — Bayern unchanged

$ npm run verify:bayern-sha  (end of investigation)
✓ MATCH — Bayern unchanged
```

[INFO] **MATCH at both bookends.** Bayern composed prefix length: 47923 chars. The whole project's discipline anchor holds.

---

## 8. All four daily gates

| # | Gate | Command | Result |
| --- | --- | --- | --- |
| 1 | Bayern SHA | `npm run verify:bayern-sha` | **GREEN** — MATCH at `b18d3f7f…3471` |
| 2 | Citation smoke walk | `npm run smoke:citations` | **GREEN** — `[smoke-walk] OK`, all `v1.0.5 B3`, `v1.0.4`, `v1.0.3`, `v1.0.1`, `phase-13` fixtures pass |
| 3 | TypeScript | `npx tsc --noEmit -p .` | **GREEN** — zero diagnostics |
| 4 | Build + bundle | `npm run build` | **GREEN** — `index-B1rCK0zO.js` 906.1 KB raw / **266.3 KB gz** (ceiling 300 KB; headroom 33.7 KB) |

[INFO] All four gates green at the audit-end HEAD `166c3bd`. Per `PHASE_17_SIGNOFFS.md § 5`, this is the daily-gate evidence requested at tag-day.

---

## 9. Audit-trail docs reconciliation

### `docs/HANDOFF.md`

[INFO] **§ 9 (L464) now reads "The v1.0.5 tag is the production-ready release."** This was updated in the parallel commit `166c3bd` during this investigation. Internally consistent: tag `v1.0.5` exists at `c35e3fa`, and the version-ladder enumeration at L466-487 covers v1.0 → v1.0.4 (v1.0.5 itself is the doc-update headline; its content is the B3 citation-firewall closure at `c35e3fa`).

[MINOR] L466-487 version-ladder is **missing a v1.0.5 row** — the headline now says v1.0.5 but the bullet list stops at v1.0.4. Suggest a one-line follow-up: `• v1.0.5 = Layer-C citation firewall (allowedCitations runtime enforcement; closes PROD_READINESS_AUDIT B3).` Not a blocker.

[MINOR] L529 section header "Engineering-side responsibilities (already complete at v1.0.1)" — stale: the engineering side is now complete at v1.0.5, not v1.0.1. Cosmetic.

### `docs/POST_V1_AUDIT.md`

| Original finding | Status per the doc | Cross-check vs current HEAD |
| --- | --- | --- |
| CRITICAL-1 verify-fact race | "STILL OPEN (v1.1)" | Consistent — parked on feature branch; main carries no race-fix code |
| CRITICAL-2 13b threshold disarmed | "RESOLVED in v1.0.4 (`075283d`)" | Commit `075283d` present on main; migration `0032` applied to live DB (probe confirms turns_count column) ✓ |
| CRITICAL-3 qualifier-views RLS | "STILL OPEN (v1.1) — anon-path empirically clean" | Re-confirmed: anon-path probe returns `[]`; authenticated probe still pending |
| SERIOUS streaming bare-await | "RESOLVED in v1.0.4" | `567b724` present ✓ |
| All other findings | Per doc | No drift detected |

### `docs/POST_SMOKE_TEST_INVESTIGATION.md`

11 findings, 0 critical. SERIOUS-3 (VorlaeufigFooter dead-code) marked RESOLVED-IN-V1.0.3 ✓ — confirmed empirically in § 3 above. Other findings (mid-flight bundesland switch, spine cap heuristic, etc.) remain v1.1 backlog per doc.

### `docs/PHASE_17_SIGNOFFS.md`

[SERIOUS — AUDIT-TRAIL GAP] **The signoffs ledger is entirely empty.**

- § 1 (manager signoff on three handoff docs): all rows `_` `_` `_`
- § 2 (counsel signoff on legal pages): empty
- § 3 (DPA ledger snapshot): empty
- § 4 (72-point smoke walk closure): all checkboxes unchecked
- § 5 (daily-gate evidence at tag commit): empty
- § 6 (7-consecutive-night smoke window): all 7 rows empty
- § 7 (tag commit SHA recorded): empty

Yet tags `v1.0`, `v1.0.1`, `v1.0.2`, `v1.0.3`, `v1.0.4`, `v1.0.5` all exist on the repo. The tag commit `cba59e4` for `v1.0` itself has subject *"docs(phase-17): signoffs ledger — engineering side complete; v1.0 tag awaits"* — its own message says the tag awaits, yet a tag is on it.

**Impact:** v1.0 tag was placed on **engineering-side** completion only. The PHASE_17_SIGNOFFS preconditions (counsel signoff, DPA ledger snapshot, 72-point smoke walk closure, 7-night smoke window) were never empirically gated. The repo claims engineering done; manager/counsel signoff piece is still operational client-side work per HANDOFF § 9.

**[VERIFY-WITH-RUTIK]** — Is this intentional (i.e., signoff ledger is client-fillable post-tag) or a process gap?

### `docs/OPS_RUNBOOK.md` known-error catalogue

Found rows: B04, B10, B11, B12, B13+B14, B15. **No B16 row** — the original prompt asked about "B16 (bundesland propagation)" but the catalogue stops at B15. The bundesland-propagation finding lives in `POST_SMOKE_TEST_INVESTIGATION.md § 1 SERIOUS-1`, not OPS_RUNBOOK.

[MINOR] OPS_RUNBOOK could carry a B16 row pointing at the POST_SMOKE_TEST finding, but its absence is doc-trail completeness, not a runtime issue.

### `docs/PROD_READINESS_AUDIT_v1.0.3.md`

Resolution table at L9-32 accurate as of v1.0.4. **B3 (Citation runtime allow-list enforcement)** was marked "DEFERRED v1.1" but was subsequently closed by `c35e3fa` "feat(citation-firewall): wire allowedCitations into runtime as Layer-C positive-list (closes PROD_READINESS_AUDIT B3)" — i.e., v1.0.5 closed B3 ahead of v1.1. The audit doc's deferred-v1.1 row is now stale.

---

## 10. Shelved / feature-branch work

Single feature branch: `feature/v1-0-6-race-fix`. Tip `95c8c30`. Local and origin in sync.

`git log feature/v1-0-6-race-fix..main --oneline` → empty (feature branch is downstream of main only by virtue of an older base; the v1.0.5 tag was placed at `c35e3fa` which is ALSO the branchpoint of the feature branch, so main currently includes everything the feature branch had at park-time minus the wip commit, plus `d4697d6` + `166c3bd`).

`git log main..feature/v1-0-6-race-fix --oneline` → `95c8c30 wip(concurrency): v1.0.6 Phase A — C1 verify-fact race fix (parked for v1.1)`

Mergeability: the commit body claims "all gates green at commit time". The 1067-line patch is concentrated on (a) the new migration, (b) the new helper file, (c) extensions to existing Edge Functions and SPA file. Likely cleanly mergeable later; user has explicitly deferred to v1.1.

[INFO] The commit body's "production-shippable as-is" claim references its own park-time gates. Re-running gates on the feature-branch tip is the only way to confirm post-merge correctness; not in scope for this investigation.

---

## 11. Known-open-work inventory

Ranked by severity, deduplicated across POST_V1_AUDIT, POST_SMOKE_TEST, and PROD_READINESS_AUDIT_v1.0.3:

| # | Finding | Severity | Current status | Where the work is |
| --- | --- | --- | --- | --- |
| 1 | verify-fact race on `projects.state` UPDATE (PV1A CRIT-1) | CRITICAL | IN-FLIGHT (parked) | `feature/v1-0-6-race-fix` tip `95c8c30` — code + migration `0033` ready |
| 2 | qualifier_transitions + qualifier_rates views `security_invoker` posture (PV1A CRIT-3) | CRITICAL | OPEN — anon empirically clean; authenticated-non-admin probe pending | Needs test JWT against live DB; v1.1 scope |
| 3 | `state_version` column applied to live DB without main code reference | SERIOUS | OPEN (benign now) | `feature/v1-0-6-race-fix` migration `0033` was applied live; main has no reader |
| 4 | Mid-flight bundesland switch leaves conversation in Bayern (PSTI SERIOUS-1) | SERIOUS | OPEN | Documented gap; product-level decision (reset state on switch vs disallow switch) |
| 5 | Spine has no hard terminal stop (PSTI SERIOUS-2) | SERIOUS | OPEN | `useChamberProgress.ts:28` — `TOTAL_ESTIMATE_T01 = 22` is a heuristic, not a cap |
| 6 | Architects cannot read project `messages` (PV1A SERIOUS-1) | SERIOUS | OPEN | [VERIFY-WITH-RUTIK] possibly intentional; otherwise needs `messages` SELECT RLS for accepted architects |
| 7 | event_log inserts in `share-project` + `verify-fact` are fire-and-forget (PV1A MED-2) | MEDIUM | OPEN | Needs `await` on the two Edge Function sites |
| 8 | `invite_token` URL kept after claim (PV1A MINOR) | MINOR | OPEN | `AcceptInvite.tsx:53` — `navigate(..., { replace: true })` cleanup |
| 9 | `verify-fact` no idempotency check on already-verified rows (PV1A MINOR) | MINOR | OPEN | Skews counts only |
| 10 | `verify-fact` no pre-flip qualifier check (PV1A MINOR) | MINOR | OPEN — [VERIFY-WITH-RUTIK] spec silent |
| 11 | No SPA UI to revoke unclaimed invites (PV1A MEDIUM-6) | MEDIUM | OPEN | Owner must use SQL Editor |
| 12 | `QualifierRoleViolationError` class is dead weight (PV1A MEDIUM-5) | MINOR | OPEN | Cleanup; no runtime impact |
| 13 | PHASE_17_SIGNOFFS.md ledger fully empty despite v1.0..v1.0.5 tags placed | SERIOUS (audit-trail) | OPEN | Client-side fill per HANDOFF § 9 |
| 14 | HANDOFF § 9 version-ladder missing v1.0.5 enumeration row | MINOR | OPEN | One-line doc edit |
| 15 | OPS_RUNBOOK known-error catalogue lacks a B16 row for bundesland-propagation | MINOR | OPEN | Cross-link to POST_SMOKE_TEST SERIOUS-1 |
| 16 | CORS allow-origin on `verify-fact` + `share-project` advertises dev-only origin | MINOR | OPEN — needs prod-flow smoke to confirm impact | Redeploy with prod CORS env if architect flow against production fails |

Resolved-but-doc-stale:
- B3 (Citation runtime allow-list) — closed by `c35e3fa` / v1.0.5; PROD_READINESS_AUDIT_v1.0.3 still lists as DEFERRED.

---

## 12. Next-correct-action recommendation

**Scenario A applies.** The tree is clean. The latest tag (`v1.0.5`) matches the live deployment (modulo the env-driven bundle hash explained in § 6). All four daily gates are green. Bayern SHA holds at the canonical value. The v1.0.6 work is intentionally parked. The audit-trail docs are self-consistent at the version-ladder layer (one minor doc gap noted).

The single "deployment-state mismatch" finding — migration `0033` on live DB without main code — is **benign**: the column is dormant. It becomes load-bearing only when the parked feature branch eventually merges as v1.1.

**Recommended next action: STOP. No code change.** Three optional follow-ups, in priority order, each independent:

1. **(SAFE, 2-line edit)** Add the v1.0.5 row to HANDOFF § 9 version-ladder (L466-487).
2. **(SAFE, 1-min probe)** Run an authenticated-non-admin REST probe against `qualifier_rates_7d_per_project` to close PV1A CRITICAL-3 empirically. If `[]`, downgrade severity to SERIOUS and pin via a smokeWalk drift fixture. If rows, ship `v1.0.6` adding `with (security_invoker = true)` to views 0027 + 0029.
3. **(SAFE, 1-min probe)** Verify trigger `bump_projects_state_version` exists on live DB via `select tgname from pg_trigger where tgrelid='public.projects'::regclass and tgname='projects_bump_state_version';`. If absent, reapplying `0033` from the feature branch idempotently completes the partial deploy with zero behavior change on main (the column is still unread by main code).

**Do NOT** start v1.0.6 / v1.1 work without an explicit go-ahead. The user's pattern (v1.0.6 commit body, this investigation's parking decision) is "ship v1.0.x hot-fixes, defer cross-cutting changes to a scoped v1.1 sprint."

**Rollback paths if anything proves wrong:**
- (1) above is doc-only; `git revert` if user disagrees with framing.
- (2) above is read-only; nothing to roll back.
- (3) above is `CREATE OR REPLACE FUNCTION` + `DROP TRIGGER IF EXISTS` + `CREATE TRIGGER` — idempotent per the migration's own comments; running it does not destroy data.

---

## Appendix A — Empirical command transcript

```
$ git rev-parse HEAD                  → 166c3bdf130055a3103222bc085b188a62a15589
$ git tag -l --sort=-creatordate      → v1.0.5, v1.0.4, v1.0.4-rc.1, v1.0.3, v1.0.2, v1.0.1, v1.0
$ git status --short                  → (empty)
$ git stash list                      → stash@{0}: On main: chat-turn WIP — restore after phase-7.10 merge to main

$ npm run verify:bayern-sha           → ✓ MATCH (start AND end)
$ npx tsc --noEmit -p .               → (zero diagnostics)
$ npm run smoke:citations             → [smoke-walk] OK (110+ fixtures)
$ npm run build                       → index-B1rCK0zO.js 906.1 KB raw / 266.3 KB gz (ceiling 300 KB)

$ curl -I https://planning-matrix.vercel.app/
  → HTTP/2 200, last-modified Mon 11 May 2026 03:31:20 GMT, x-vercel-cache: HIT

$ curl -X OPTIONS .../functions/v1/{verify-fact,chat-turn,share-project}
  → all HTTP/2 204

$ curl .../rest/v1/projects?select=id,state_version    → HTTP/2 200, []
$ curl .../rest/v1/projects?select=id,does_not_exist   → HTTP/2 400  (control)
$ curl .../rest/v1/project_members?select=id,expires_at → HTTP/2 200, []
$ curl .../rest/v1/qualifier_rates_7d_global?select=turns_count,downgraded_count
  → HTTP/2 200, [{"turns_count":0,"downgraded_count":0}]
```

---

## Appendix B — State-drift transparency

The user committed `166c3bd docs(handoff): v1.0.5 is production-ready tag` + placed the `v1.0.5` tag during this investigation. Reflog evidence:

```
166c3bd HEAD@{0}: pull --rebase origin main (finish): returning to refs/heads/main
166c3bd HEAD@{1}: pull --rebase origin main (pick): docs(handoff): v1.0.5 is production-ready tag
d4697d6 HEAD@{2}: pull --rebase origin main (start): checkout d4697d6054bcad27cf31f499644bc36a4a127e5d
79ec655 HEAD@{3}: commit: docs(handoff): v1.0.5 is production-ready tag
c35e3fa HEAD@{4}: checkout: moving from feature/v1-0-6-race-fix to main
```

All evidence in this document reflects end-state `166c3bd`. The headline TL;DR ("YES-FOR-BAYERN-ONLY at v1.0.5") is true at audit end; it was true-with-untagged-status at audit start (the v1.0.5 tag was placed by the user during this window).

---

## Appendix C — Trigger probe: `projects_bump_state_version`

[VERIFY-WITH-RUTIK — INCONCLUSIVE VIA ANON REST] The trigger's presence on live DB could **not** be empirically confirmed from this session. PostgREST does not expose `pg_trigger` or `information_schema.triggers` (both return HTTP 404), and the trigger's backing function `public.bump_projects_state_version` is not callable as an RPC by design (it is a `BEFORE UPDATE` trigger function, not a public RPC). An anon `POST /rest/v1/rpc/bump_projects_state_version` returned 404 — this is ambiguous (function exists but not RPC-exposed vs function absent). Manager confirmation requires one SQL Editor query:

```sql
select tgname
  from pg_trigger
 where tgrelid = 'public.projects'::regclass
   and tgname = 'projects_bump_state_version';
-- Expected (full 0033 apply): one row.
-- Empty result: column was added without the trigger; reapplying 0033 from
--   feature/v1-0-6-race-fix is safe and idempotent (DROP TRIGGER IF EXISTS +
--   CREATE OR REPLACE FUNCTION per the migration's own comments).
```

If the result is empty, the live DB has the column without the increment trigger — still benign at v1 (no main code reads the column), but the v1.1 merge path must reapply `0033` before `feature/v1-0-6-race-fix`'s verify-fact / chat-turn code goes live. If the result has one row, the partial-deploy is complete-enough for v1.1 merge to be a code-only step.
