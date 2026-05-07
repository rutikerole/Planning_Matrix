# Phase 17 Scope — Production Handoff

**Goal.** Hand the project to the v1.5 manager with everything
needed to operate it without the build engineer. After Phase 17
ships, the project is delivered.

**Frame.** Phase 17 is mostly NOT engineering. The load-bearing
risk is **DPA negotiation latency** — five sub-processor contracts
(Anthropic, Supabase, Vercel, Sentry, PostHog) that take calendar
time to countersign and live entirely outside engineering control.
The discipline pattern for Phase 17 is *kick off latency-bound work
Day 1, batch the in-house deliverables (legal-page audit, smoke
walk, three handoff docs) into a tight 2-week core, treat Week 3 as
DPA-chase + counsel-review buffer*. A clean phase surfaces the
calendar gap visibly rather than padding the engineering budget.

**Discipline.** Bayern SHA `b18d3f7f...3471` must MATCH every
commit. Phase 7.9 LOCKED surfaces untouched. Design DNA tokens
untouched. Phase 13 architect surface untouched (only its `/admin`
+ `/architect` ops sections are referenced from the new docs). The
verbatim-PDF discipline carries forward to legal-page review:
Datenschutz claims about sub-processor data flows must trace to the
signed DPA, not to general-practice guesses.

**Reuses (locked).** Existing legal pages
(`src/features/legal/pages/{Impressum,AGB,Datenschutz,Cookies}.tsx`),
existing `verify:locales` + `verify:hardcoded-de` + `verify:bundle`
prebuild gates, existing Playwright smoke baseline. New docs land
in `docs/`; signed DPAs in `docs/legal/dpas/` (new dir, gitignored
for the actual countersigned PDFs — only metadata committed).

**Scope-cut decisions carried in (locked Phase-13-close).**
Phase 14 (remaining 11 states) → post-v1. Phase 12.5 (async takt)
→ post-v1 architectural debt. The 11 minimum stubs honestly surface
*"werden in einer späteren Bearbeitungsphase ergänzt"* — that's the
defensible v1 minimum and the HANDOFF.md must say so explicitly so
post-v1 readers don't read it as a bug.

---

## Per-week budget — 3 weeks, ~600 LOC

The LOC is mostly Markdown. The calendar dimension is what blows up.

| Week | Deliverable | Key files | LOC | End-of-week criterion |
| --- | --- | --- | --- | --- |
| **1** | DPA requests sent **Day 1** to all five sub-processors (Anthropic, Supabase, Vercel, Sentry, PostHog). In parallel: legal-page audit. Replace the Impressum placeholder with real manager contact details; sync the AGB + Datenschutz sub-processor list against the deployed reality (`src/main.tsx` Sentry init + `src/lib/analytics.ts` PostHog init are the source of truth — no quietly-disabled vendors); cookie-consent surface review. Kick off counsel-review window for the three pages. | `src/features/legal/pages/{Impressum,AGB,Datenschutz}.tsx`, `src/locales/{de,en}.json`, `docs/legal/dpas/README.md` (tracker), DPA outbound emails | ~150 | All 5 DPA requests sent + acknowledged. Legal pages have zero placeholder copy. Counsel-review meeting scheduled. Daily gates green. |
| **2** | 72-point smoke walk (18 surfaces × 4 browsers — see expansion below). `docs/DEPLOYMENT.md` (env vars, secret rotation, migration apply order 0001…0029, Vercel rollback, Anthropic key swap, region-locked hosting note). `docs/OPS_RUNBOOK.md` (incident response triggers, rate-limit budget tuning, cost monitoring, qualifier-gate rollback playbook reference, Phase 13's 13b threshold, known-error catalogue). | `docs/DEPLOYMENT.md`, `docs/OPS_RUNBOOK.md`, smokeWalk extension if surface count drifted, screenshots in `docs/handoff/screenshots/` | ~300 | 72-point walk all green; both docs reviewed by manager; counsel feedback on legal pages incorporated. Daily gates green. |
| **3** | `docs/HANDOFF.md` (architecture overview anchored to v1.5 §6, where each concept lives by file path, how to extend StateDelta + add a template + read the audit, what's deferred to post-v1 with rationale). DPA chase. Final read-through. Tag `v1.0` (or whatever release tag the manager chooses). | `docs/HANDOFF.md`, `CHANGELOG.md` (final), git tag | ~150 | All 5 DPAs countersigned-OR-explicitly-tracked-as-pending. HANDOFF.md signed off by manager. v1.0 tag pushed. Daily gates green. Phase 17 close. |

**Total: ~600 LOC, 3 weeks, 1 engineer + counsel + manager
review windows.** Per-week commit count: 3-4 / 3-4 / 2-3.

**72-point smoke walk surfaces (Week 2):** landing, sign-up, sign-in,
forgot-password, reset-password, verify-email, dashboard, /projects/new
wizard (PLZ + template steps), chat workspace (Spine + MatchCut +
Astrolabe + Stand-up + CapturedToast), result tabs (Overview / Cost
& Timeline / Procedure & Documents / Team), shared-result anon view,
admin Logs drawer, architect dashboard, /architect/projects/:id/verify
panel, accept-invite flow, Impressum/AGB/Datenschutz/Cookies. **18
surfaces × 4 browsers (Desktop Chrome / Desktop Safari / iPhone 13 /
Pixel 5) = 72 checkpoints**, captured as a checklist in
`docs/PHASE_17_SMOKE_CHECKLIST.md` with date + browser + signoff per row.

---

## Per-day acceptance criteria — every working day

Each day ends green or **STOP and re-plan**. No pushing through red.

- `npm run verify:bayern-sha` → ✓ MATCH at `b18d3f7f...3471`.
- `npm run smoke:citations` → green (110+ fixtures — Phase 13 +
  any Phase 17 doc-shape drift checks).
- `npx tsc --noEmit -p .` → clean.
- `npm run build` → green (locales + hardcoded-de + bundle ≤ 300 KB gz).
- No edits to `:root` / `[data-mode='operating']` shadow tokens or
  font families.
- No edits to Phase 7.9 LOCKED surfaces. No re-opening Phase 13.
- No edits to wizard B04 — `projects.bundesland` stays
  hardcoded `'bayern'`.
- DPA tracker (`docs/legal/dpas/README.md`) reflects current state
  by close-of-day for any day a DPA email moved.

---

## Blockers surfaced before code — DPA latency leads

1. **B1 — DPA negotiation latency. THE load-bearing risk.**
   Anthropic / Supabase / Vercel publish standard DPAs and usually
   countersign in 1-3 weeks; Sentry and PostHog vary 2-6 weeks
   depending on region + plan. **Mitigation:** send all five
   requests Day 1 of Week 1 — the engineering work cannot start
   the latency clock retroactively. **Acceptance softener:** if a
   DPA is still in counter-signature at end of Week 3, HANDOFF.md
   flags it as "in counter-signature — expected by `<date>`",
   delivery proceeds, and the tracker carries it as the only known
   open item. The other four signed-or-not is the audit-trail
   minimum; "all five live" is the goal.

2. **B2 — Counsel review of Impressum / AGB / Datenschutz.**
   Calendar-bound. The legal pages exist in `src/features/legal/`
   but were drafted by the build engineer, not counsel. **Mitigation:**
   schedule the counsel meeting at start of Week 1; deliver the
   Week-1 audited drafts to counsel by end of Week 1; expect
   feedback during Week 2; incorporate before Week-3 sign-off.
   If counsel surfaces a substantive issue (e.g., "the persona
   prompt's legal-domain framing creates Rechtsdienstleistungs-
   risk"), **STOP and re-plan** — that's a v1.5 §6.B-class
   conversation, not a Phase 17 in-band fix.

3. **B3 — Real Impressum contact details.** Today's
   `src/features/legal/pages/ImpressumPage.tsx` is placeholder.
   Manager must supply: legal name, registered address,
   Handelsregister number + court, USt-IdNr if any, responsible
   person per § 18 MStV. **Mitigation:** request these Day 1; if
   the manager doesn't have a registered entity yet, frame as
   sole-proprietor compliant with TMG § 5 — counsel must confirm.

4. **B4 — Sub-processor list lock.** Five vendors are *currently*
   wired (Anthropic / Supabase / Vercel / Sentry / PostHog).
   **Mitigation:** before Week 2 Datenschutz update, confirm with
   the manager whether all five stay in v1 or whether (e.g.,
   PostHog) is being cut. Disabling a vendor at deploy time still
   requires the DPA if the SDK ships in the bundle and could fire.
   Cutting a vendor = removing the SDK + verifying via build.

5. **B5 — Hosting region.** Vercel + Supabase region locks
   determine the data-flow narrative in Datenschutz § "Verarbeitung
   außerhalb der EU". **Mitigation:** confirm in
   `vercel.json` / Supabase project settings on Day 1; document the
   chosen regions in DEPLOYMENT.md. EU-only is the safest narrative;
   US-region requires an SCC or DPF reference in Datenschutz.

6. **B6 — Retention windows.** What's the manager's retention
   policy on chat history (`messages`), project state (`projects`),
   event_log, persona snapshots? Default reading from current code
   is "indefinite". **Mitigation:** propose 12-month default in the
   Datenschutz update + a manual deletion playbook in OPS_RUNBOOK.md;
   manager confirms or amends Day-of-counsel-review.

7. **B7 — Browser matrix availability.** The 72-point smoke walk
   needs four browsers. **Mitigation:** Desktop Chrome + Safari
   from the build engineer's machine; iPhone 13 + Pixel 5 via
   BrowserStack (or physical devices if available). Lock the access
   in Week 1.

8. **B8 — 11 minimum-state-stub framing in HANDOFF.md.** The user-
   approved v1 minimum is "stubs honestly surface
   *werden in einer späteren Bearbeitungsphase ergänzt*". HANDOFF.md
   MUST surface this verbatim — not bury it as "limitations" or
   spin it as "incremental rollout". **Mitigation:** write the
   relevant HANDOFF.md section first, get manager review by mid-
   Week-3, before the doc reaches counsel for the legal-page sign-
   off package.

9. **Not a blocker, flag.** The Bayern SHA invariant has held across
   32+ commits through Phases 11, 12, 13. Phase 17 touches no
   persona content; the gate is automatic. The discipline reminder
   stays in this doc only because every Phase scoping doc has it.

---

## What this scoping doc does NOT decide

- DPA wording per vendor — vendor-supplied templates are the
  starting point; counsel adjusts only if substantively wrong.
- Ongoing maintenance contract (commercial) — out of v1 scope.
- New feature work post-handoff — anything not already shipped.
- Sentry sampling rates / PostHog event taxonomy — OPS_RUNBOOK
  content; manager decides.
- Specific on-call rotation / paging — manager's operational
  choice; OPS_RUNBOOK documents the *trigger*, not the rotation.
- Whether v1 ships with a public landing page or stays
  invite-only — outside Phase 17's scope.

---

**Awaiting manager signoff on this scoping doc before Phase 17
Week 1 (DPA outbound + legal-page audit) starts. Phase 17 close =
project delivered.**
