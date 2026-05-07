# Phase 13 Scope — DESIGNER Role + Architect Verification UX

**Goal.** Close the v1.5 §6.B.01 legal shield: certified architect
logs in, reviews the matrix, sets `DESIGNER + VERIFIED` per fact via
explicit button click; *"Vorläufig — bestätigt durch …"* footer
disappears for verified facts.

**Frame.** Phase 13 = (memo Option A tactical gate) + architect UX,
bundled. **NOT** Execution-Agent rebuild — that's 13b, conditional
on telemetry threshold (>5 qualifier-downgrade events / 100 turns
over 7-day rolling window). Phase 12.5 (async takt) deferred to
between 13 and 14.

**Discipline.** Bayern SHA `b18d3f7f...3471` must MATCH every commit.
Phase 7.9 LOCKED surfaces untouched. B04 wizard untouched. Design
DNA tokens untouched. The "surface blockers before code" principle
applies; the verbatim-PDF discipline does not (no legal sources).

**Reuses (locked).** Existing `profiles.role` enum (no new enum
migration); existing `event_log` for telemetry; existing
`commit_chat_turn` RPC pattern; existing Phase 9 tracer.

**OQs.** OQ1 simple approve/reject ✓; OQ2 existing `project_events`
view ✓. No new OQs.

---

## Per-week budget — 4 weeks, ~2,000 LOC

| Week | Deliverable | Key files | LOC | Daily-gate-end criterion |
| --- | --- | --- | --- | --- |
| **1** | Schema + observability-mode qualifier-write-gate. Migrations `0026_project_members.sql` + `0027_qualifier_transitions.sql` (view). `applyExtractedFacts/Recommendations/Procedures/Documents/Roles` in `projectStateHelpers.ts` gain a `callerRole` parameter; non-designer attempts to write `DESIGNER+VERIFIED` get **downgraded to `DESIGNER+ASSUMED` AND logged** (no rejection — observability-only, mirrors Phase-10.1 citationLint). | `supabase/migrations/0026_*.sql`, `supabase/migrations/0027_*.sql`, `src/lib/projectStateHelpers.ts`, `supabase/functions/chat-turn/index.ts`, tests | ~400 | hand-crafted CLIENT-turn `DESIGNER+VERIFIED` attempt → `qualifier.downgraded` event in `event_log`; Bayern unchanged. |
| **2** | Day-8 gate-flip from observability to gating (driven by Week-1 telemetry). Architect dashboard skeleton at `/architect`. `useIsDesigner` hook mirroring `useIsAdmin` (Phase 9.1). | `src/lib/projectStateHelpers.ts` (gate-flip), `src/features/architect/ArchitectDashboardPage.tsx`, `src/features/architect/hooks/useSharedProjects.ts`, `src/hooks/useIsDesigner.ts` | ~600 | designer logs in → `/architect` lists shared projects; non-designer 404s on `/architect`. |
| **3** | Verification UI + project sharing. New Edge Functions `verify-fact` (atomic qualifier upgrade, mirrors `commit_chat_turn`) and `share-project` (invite token + email or copy-paste link per B1). `VerificationPanel.tsx` per-fact approve/reject. "Vorläufig" footer hides per-card on `DESIGNER+VERIFIED`. | `supabase/functions/verify-fact/`, `supabase/functions/share-project/`, `src/features/architect/components/VerificationPanel.tsx`, footer rendering logic | ~700 | two-account integration test: client invites → architect accepts → verifies one fact → footer hides for that card only. |
| **4** | Telemetry derived view `qualifier_metrics`; smokeWalk `--phase=13` fixtures (designer-member succeeds, non-designer fails, non-member fails); Playwright multi-context E2E spec; `scripts/qualifier-downgrade-rate.mjs` (manual 13b-trigger probe; Phase 16 cron picks up); `docs/PHASE_13_REVIEW.md` audit-trail (RLS reasoning, telemetry event names). | `scripts/`, smokeWalk extension, `docs/PHASE_13_REVIEW.md` | ~300 | full client-side demo of verification flow <2 min end-to-end; Phase 17 handoff hook complete. |

**Total: ~2,000 LOC, 4 weeks, 1 engineer.** Top of the
PHASE_ROADMAP.md band (1,800–2,100). Per-week commit count:
2-3 / 2-3 / 3-4 / 2.

---

## Per-day acceptance criteria — every working day

Each day ends green or **STOP and re-plan**. No pushing through red.

- `npm run verify:bayern-sha` → ✓ MATCH at `b18d3f7f...3471`.
- `npm run smoke:citations` → green.
- `npx tsc -b` → clean.
- `npm run build` → green (locales + hardcoded-de + bundle).
- No edits to `:root` / `[data-mode='operating']` shadow tokens or
  font families.
- No edits to Phase 7.9 LOCKED surfaces. Verification UI is a NEW
  surface (likely `/architect/projects/:id/verify` side-panel),
  NOT an in-place edit of the chat workspace.
- No edits to wizard B04 — `projects.bundesland` stays
  hardcoded `'bayern'`.

---

## Blockers surfaced before code

- **B1 Email delivery.** Supabase Auth's `inviteUserByEmail` ties
  to user creation; we need invite-existing-user-to-existing-project.
  Decision needed before Week 3: (a) repurpose Auth invite hackily,
  (b) wire Resend / Postmark (clean but adds vendor + Phase 17 DPA),
  (c) **default — copy-paste invite link in SPA, no email vendor.**
  Ship-without-email is v1-shippable.
- **B2 Two-account integration test.** Existing Playwright is
  single-user. Mitigation: native Playwright `browserContext`
  multi-context, ~3 hours plumbing in Week 1.
- **B3 Qualifier-gate signature change.** Threading `callerRole`
  through five `apply*Delta` helpers. Mitigation: third arg with
  `'system'` default for backward-compat; existing `setBy` field
  on qualifiers carries the audit attribution.
- **B4 `project_members` RLS.** First per-project-membership table.
  Pattern mirrors `admin_users` RLS (migration 0018) — same shape,
  per-project instead of global. SELECT: member OR owner OR admin;
  INSERT: owner OR admin-creating-designer; DELETE: owner OR self.
- **B5 Verification UI vs Phase 7.9 lockdown.** Side-panel from
  architect dashboard at `/architect/projects/:id/verify`, NOT
  embedded in chat workspace. Existing footer reads qualifier;
  architect's edits happen on the new surface only.
- **B6 Bayern SHA invariant during schema changes.** Migrations
  don't touch cached prefix. `verify:bayern-sha` daily catches drift.
- **Not a blocker, flag.** The Week-1 observability-mode pattern
  is Phase-10.1 citationLint translated to qualifiers. Phase 16
  quality dashboard automatically picks up "qualifier-downgrade
  rate" since it lives in `event_log`.

---

## What this scoping doc does NOT decide

- Architect dashboard visual design (Week 2).
- 13b ship-in-Phase-13 question (telemetry-conditional, deferred).
- Email vendor choice (B1 default = copy-paste; flip on Rutik
  signoff).
- Exact CTA text for "request architect verification" SPA error
  path (Week 2).
- Async takt (Phase 12.5) — deferred to between 13 and 14 per
  Rutik's locked decision.

---

**Phase 13 starts after Rutik signs off this scoping doc. Phase 14
scope-cut option open; Phase 13's deployment telemetry informs the
cut/keep decision.**
