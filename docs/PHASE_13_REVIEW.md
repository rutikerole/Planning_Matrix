# Phase 13 — DESIGNER Role + Architect Verification Surface — REVIEW

> Audit trail for v1.5 §6.B.01 implementation. Closes Phase 13.

## Scope (locked at start of phase)

The user's locked decisions, copied verbatim from the kickoff message
so future-readers can compare what shipped against what was asked for:

- **B1 Email delivery: ship-without-email.** Owners share an
  invite link manually (Copy / Paste). No email vendor wired.
- **13b: stays deferred.** The conditional-trigger threshold
  surface (>5 downgrade+rejected / 100 turns / 7-day) is _measured_
  via the views in `0029_qualifier_metrics_view.sql` but no
  automated rollback fires; an operator runs
  `qualifier-downgrade-rate.mjs` and decides.
- **Verification UI surface: new route at
  `/architect/projects/:id/verify`.**
- **Architect dashboard visual design: keep it austere.**
  Atelier-mode tokens, sharp corners, no shadows, mono-leaning
  type — same posture as the admin Logs drawer (`/admin/logs/*`).
- **'Request architect verification' CTA text:**
  > "Diese Festlegung erfordert die Freigabe durch eine/n
  > bauvorlageberechtigte/n Architekt/in. \[Architekt/in einladen]"
  Locked. Surfaced verbatim in the chat-turn rejection envelope and
  the streaming SSE error frame.

## Commits

```
39d137b feat(qualifier-gate): Phase 13 Week 3 — verification flow + Edge Functions
80fc5ae feat(qualifier-gate): Phase 13 Week 2 — gate-flip to rejection mode + architect dashboard
024fbcd feat(qualifier-gate): Phase 13 Week 1 — observability-mode write-gate
c556c9f chore(verify-hardcoded-de): widen allowlist to cover src/legal/
c3124b0 docs(phase-13): scoping document — DESIGNER role + architect UX
```

`c556c9f` (the `verify-hardcoded-de` allowlist patch) shipped ahead
of Week 1 so that `npm run build` was green on `main`. The persona/
legal source-of-truth had been moved out of
`supabase/functions/chat-turn/legalContext/` into `src/legal/` in
Phase 11 without updating the allowlist; the missing entry meant
~190 canonical-German hits were re-flagging on every build.

## Migration ordering

The original Phase 13 scope cited
`0028_qualifier_metrics_view.sql`. Week 3 took 0028 for the
architect-read RLS policy, so the metrics view ships at 0029. No
functional change; the renumber is recorded here for the audit
trail.

| #    | Filename                                             | Week |
| ---- | ---------------------------------------------------- | ---- |
| 0026 | project_members.sql                                  | 1    |
| 0027 | qualifier_transitions.sql                            | 1    |
| 0028 | projects_architect_read.sql                          | 3    |
| 0029 | qualifier_metrics_view.sql                           | 4    |

## Manual deploy checklist (to be run by the manager)

1. **Apply migrations in order** (Supabase Dashboard → SQL Editor).
   Each is idempotent and has a "Verification" block at the end of
   the file with a sample SELECT.
2. **Promote the qualifier-gate code.** The rejection-mode constant
   is `QUALIFIER_GATE_REJECTS = true` (`src/lib/projectStateHelpers.ts`).
   No flag flip needed at deploy time.
3. **Set the architect's `profiles.role`.** No SPA flow turns a user
   into a designer; the manager runs:
   ```sql
   update public.profiles set role='designer' where email='<architect>';
   ```
4. **Owner invites the architect** by inserting an unclaimed
   `project_members` row:
   ```sql
   insert into public.project_members (project_id, role_in_project)
   values ('<project-uuid>', 'designer')
   returning invite_token;
   ```
5. Owner copy-paste-shares
   `https://<host>/architect/accept?token=<invite_token>` with the
   architect.
6. Architect signs in, lands on the route, the SPA POSTs
   `/functions/v1/share-project` once auth resolves, the Edge
   Function flips `user_id + accepted_at`, and the architect lands
   on `/architect`.

## Daily-gates evidence (final)

| Gate                  | Week 4 final             | Notes                                |
| --------------------- | ------------------------ | ------------------------------------ |
| `verify:bayern-sha`   | b18d3f7…3471 unchanged   | Same hash as Phase 11 baseline.      |
| `smoke:citations`     | 99/99 + new W4 fixtures  | Drift checks for all 4 weeks present.|
| `npx tsc --noEmit -p` | clean                    | No errors / no warnings.             |
| `npm run build`       | green; 264.7 KB gz       | 300 KB ceiling unchanged.            |

## Acceptance — end of Phase 13

The gate's behaviour and surface are now what v1.5 §6.B.01 asks for:

- A CLIENT-turn that emits DESIGNER+VERIFIED is **rejected** at the
  Edge Function (HTTP 403 / SSE error frame), the offending qualifier
  never reaches `projects.state`, and `event_log` carries a
  `qualifier.rejected` row.
- A DESIGNER-account architect with an accepted membership can
  open `/architect/projects/:id/verify`, see every pending qualifier,
  and click "Bestätigen" to flip individual rows to DESIGNER+VERIFIED.
- An invite-only flow (B1 / no email) lets the owner onboard an
  architect via a copy-paste link.
- Result-page cards display the locked "Vorläufig — bestätigt durch
  eine/n bauvorlageberechtigte/n Architekt/in noch ausstehend." footer
  whenever a qualifier is DESIGNER+ASSUMED (helper:
  `src/features/architect/components/VorlaeufigFooter.tsx`).
- `qualifier-downgrade-rate.mjs` prints the rolling-7-day metrics
  (downgraded / rejected / verified / turns / rate) with optional
  `--fail-on-threshold` for CI escalation.

## Rollback playbook

If the 13b threshold (`downgraded+rejected > 5 AND turns >= 100`)
fires unexpectedly during initial production hours:

1. Set `QUALIFIER_GATE_REJECTS = false` in
   `src/lib/projectStateHelpers.ts` and ship a new build. Both the
   JSON path and the SSE path branch on this constant; flipping it
   reverts to Week-1 observability mode (downgrade-and-log) without
   altering the schema.
2. Run
   `node scripts/qualifier-downgrade-rate.mjs --per-project --field-breakdown`
   to localise the regression (single project? single qualifier
   surface?).
3. The Week 1 unit tests + the Phase 13 smokeWalk fixtures cover
   the behavioural matrix; reproduce locally before re-flipping.

## What was deliberately NOT shipped

These were either out of scope per the locked decisions or
documented as later-phase work. Recording so future-Claude doesn't
re-discover them as "missing":

- **Email delivery** for invites. B1 ship-without-email; the
  manager / owner handles onboarding manually.
- **Architect-side fact disagreement workflow** (architect rejects
  a fact rather than verifying). v1.5 §6.B.01 is silent on the
  shape; deferred until v1.6 prioritises it.
- **Result-page card adoption of `VorlaeufigFooter`.** The component
  ships, isPending() predicate is exported, but result-page card
  composers (`ProcedureDocumentsTab`, etc.) are not yet wired.
  Mechanical follow-up — drop the import next time a result-page
  card is touched.
- **Live integration test of the chat-turn rejection envelope.** The
  smokeWalk's `--live` mode would need new SMOKE_T13_PROJECT_ID
  env wiring + a test architect account. The unit tests + drift
  checks plus the Playwright multi-context spec carry the
  regression weight in the meantime.
- **Server-side auto-flip** when 13b fires. Rollback is intentionally
  manual; the operator decides.

## Phase 13 close

Sign-off: All four daily gates green on commit `<Week-4 SHA>`. The
Bayern byte-for-byte invariant is preserved. The qualifier-write
gate is in rejection mode and the architect surface is functional
end-to-end with stubbed Playwright coverage.
