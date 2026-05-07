# Phase 17 — DPA Ledger

> Tracks the five sub-processor Data Processing Agreements (Auftrags-
> verarbeitungsverträge per DSGVO Art. 28). Engineer prepares; manager
> sends + countersigns; ledger updated on every status change. The DPA
> column in this ledger is the single source of truth referenced by
> `docs/HANDOFF.md` and `src/features/legal/pages/DatenschutzPage.tsx`.

## Status snapshot

| # | Sub-processor          | Region                | DSGVO basis             | Sent date | Countersigned | Status |
| - | ---------------------- | --------------------- | ----------------------- | --------- | ------------- | ------ |
| 1 | Anthropic, PBC         | US (SCCs + DPF)       | Art. 6(1)(b) + AVV      | TODO      | TODO          | **outbound pending** |
| 2 | Supabase Inc.          | EU-Frankfurt (primary)| Art. 6(1)(b) + AVV      | TODO      | TODO          | **outbound pending** |
| 3 | Vercel Inc.            | US (SCCs)             | Art. 6(1)(f)            | TODO      | TODO          | **outbound pending** |
| 4 | Functional Software (Sentry) | EU-Frankfurt    | Art. 6(1)(a) + AVV      | TODO      | TODO          | **outbound pending** |
| 5 | PostHog Inc.           | EU-Frankfurt          | Art. 6(1)(a) + AVV+SCCs | TODO      | TODO          | **outbound pending** |

**v1.0 tag precondition:** every row's "Status" column reads either
**signed** OR **expected by `<date>`** (with the expected date in
HANDOFF.md as a known post-tag follow-up). No row may sit at
"outbound pending" or "no response" at tag.

## Owner-side action checklist (manager)

- [ ] Day 1 of Week 1 — send all 5 emails (templates below).
      Use the manager's signing identity; copy the build engineer.
- [ ] Day 1 of Week 1 — fill the **Sent date** column for each row.
- [ ] Each follow-up — record date + outcome in this ledger.
- [ ] On countersignature receipt — file the PDF in
      `docs/legal/dpas/<vendor>/<YYYY-MM-DD>-DPA.pdf` (gitignored
      directory; only filename + hash recorded in this ledger),
      flip the Status column to **signed**.

## Email templates

The five templates below are drafts. They use the same shape:
identification of caller + product + processing purpose + request
for the vendor's standard DPA / AVV. Use the manager's contact
identity when sending.

> **Important:** vendors' standard DPAs are usually self-service
> via dashboard (Anthropic, Supabase, Vercel, PostHog) or
> support-ticket signup (Sentry). Outbound email is the courtesy
> path that asks where their self-service flow lives. If a
> vendor's dashboard already exposes a one-click "Sign DPA"
> button, use that — countersignature is instant in those cases
> and the email is unnecessary.

---

### Template 1 — Anthropic, PBC

> **To:** privacy@anthropic.com
> **Subject:** Data Processing Agreement request — Planning Matrix (Anthropic API customer)
>
> Hi Anthropic Privacy Team,
>
> I'm reaching out on behalf of *Planning Matrix*, a German B2B
> research tool that uses the Anthropic Messages API
> (claude-sonnet-4-6) for legally-grounded persona conversations.
> We are preparing for v1 production launch and need to put a
> Data Processing Agreement in place per DSGVO Art. 28 / GDPR.
>
> Could you point me at Anthropic's standard DPA + the
> countersignature flow? I noticed the Anthropic Console has a
> Privacy section; I'd like to confirm whether the DPA there is
> the right form for a German B2B SaaS, or whether you have a
> standard signable PDF for non-Enterprise customers.
>
> Background:
>   - Customer: `<MANAGER_NAME / ENTITY>`
>   - Product: Planning Matrix (German Bauantrag research SPA)
>   - Anthropic account: `<ANTHROPIC_ORG_ID>`
>   - Use case: forced-tool-use Messages API; per-turn user
>     prompts persisted in our DB (Supabase EU-Frankfurt) for
>     audit; Anthropic processes those prompts under the
>     Customer Data definition.
>   - Legal basis on our side: Art. 6 (1)(b) DSGVO + AVV.
>   - SCC posture: Anthropic = US recipient; we rely on the
>     2023 EU-US Data Privacy Framework + supplementary
>     measures (no PII fields in the persona prompts; the
>     model never sees user real names beyond the chat surface).
>
> Thanks for the pointer.
>
> Best,
> `<MANAGER_NAME>`
> `<MANAGER_EMAIL>` · `<MANAGER_PHONE>`

---

### Template 2 — Supabase Inc.

> **To:** privacy@supabase.com (CC: support@supabase.com)
> **Subject:** Data Processing Agreement — Planning Matrix (Supabase customer)
>
> Hi Supabase Privacy Team,
>
> Planning Matrix runs its primary database, Auth, Edge Functions,
> and Storage on Supabase, EU-Frankfurt region. We are preparing
> for v1 launch and want to put a DPA in place under DSGVO Art. 28.
>
> I see Supabase's standard DPA self-service is available from the
> Dashboard → Settings → Privacy. Could you confirm:
>   - That the standard DPA covers EU-Frankfurt-region projects
>     without an additional region addendum.
>   - That the DPA covers Auth (with PII), Database (with chat
>     history), Edge Functions, and Storage (uploaded files).
>   - That the SCC posture is current (2021 SCCs).
>
> Background:
>   - Project ref: `<SUPABASE_PROJECT_REF>`
>   - Plan: Pro
>   - Region: eu-central-1 (Frankfurt)
>   - PII footprint: end-user emails (Auth) + chat history
>     attached to those emails.
>
> Best,
> `<MANAGER_NAME>`

---

### Template 3 — Vercel Inc.

> **To:** privacy@vercel.com
> **Subject:** Data Processing Agreement — Planning Matrix (Vercel customer)
>
> Hi Vercel Privacy Team,
>
> Planning Matrix hosts its SPA front-end on Vercel. We are
> preparing for German B2B v1 launch and need a DPA under
> DSGVO Art. 28 with the standard EU-US SCC clauses.
>
> Could you point me at Vercel's standard DPA self-service flow
> + confirm the current SCC version. I see the Privacy section
> in the Vercel Dashboard mentions a DPA download — I want to
> confirm that's the production-ready form for German customers
> on the Pro plan.
>
> Background:
>   - Team / project: `<VERCEL_TEAM>` / `<VERCEL_PROJECT>`
>   - Plan: Pro
>   - Region(s): `<vercel.json regions field>`
>   - PII footprint: minimal — Vercel hosts static assets and
>     proxies API requests; PII flows through Supabase, not
>     through Vercel-stored data.
>
> Best,
> `<MANAGER_NAME>`

---

### Template 4 — Functional Software (Sentry)

> **To:** privacy@sentry.io
> **Subject:** Data Processing Agreement — Planning Matrix (Sentry customer)
>
> Hi Sentry Privacy Team,
>
> Planning Matrix uses Sentry's EU instance for error tracking,
> initialized only on user *Functional* consent (TTDSG § 25(2) +
> DSGVO Art. 6 (1)(a)). We are preparing for v1 launch and want
> to put a DPA in place per Art. 28.
>
> Could you confirm:
>   - Sentry's standard DPA is the form to sign for the EU
>     instance (sentry.io EU-region, Frankfurt).
>   - The DPA covers Functional Software, Inc. as the data
>     processor.
>   - Where in the org dashboard the countersignature flow lives.
>
> Background:
>   - Org: `<SENTRY_ORG_SLUG>`
>   - Plan: `<TEAM/BUSINESS>`
>   - Region: EU (sentry.io / EU instance)
>   - PII footprint: errors are PII-scrubbed in our SDK config
>     (no breadcrumbs touch the chat surface) — see
>     `src/lib/errorTracking.ts` and
>     `src/features/cookies/SentryLifecycle.tsx`.
>   - Consent posture: Sentry init gated on a Functional cookie
>     consent; users who decline never trigger SDK load.
>
> Best,
> `<MANAGER_NAME>`

---

### Template 5 — PostHog Inc.

> **To:** privacy@posthog.com
> **Subject:** Data Processing Agreement — Planning Matrix (PostHog customer)
>
> Hi PostHog Privacy Team,
>
> Planning Matrix uses PostHog's EU instance (eu.i.posthog.com) for
> product analytics, initialized only on user *Analytics* consent
> (DSGVO Art. 6 (1)(a)). We are preparing for v1 launch and want
> to put a DPA in place per Art. 28.
>
> Could you confirm:
>   - PostHog's standard DPA is the right form for the EU
>     instance.
>   - The DPA covers PostHog Inc. as data processor with EU SCCs
>     for any sub-processor leg.
>   - Where the countersignature flow lives (org settings → ?).
>
> Background:
>   - Org: `<POSTHOG_ORG_NAME>`
>   - Project: `<POSTHOG_PROJECT_ID>`
>   - Region: EU (eu.i.posthog.com)
>   - PII footprint: cookieless analytics, no session recording,
>     no autocapture of chat content. Identification is at the
>     anonymous user level — see `src/lib/analytics.ts`.
>
> Best,
> `<MANAGER_NAME>`

---

## Operational notes

- **All five vendors offer self-service DPAs** through their dashboards
  for non-Enterprise plans. The emails above are the courtesy + audit-
  trail companion to clicking the dashboard button. In practice the
  countersignature is dashboard-instant for Anthropic / Supabase / Vercel
  / PostHog; Sentry is the most likely to need a support ticket.
- **If a vendor refuses the standard DPA** (rare): escalate per
  `docs/PHASE_17_SCOPE.md` B1 — may force a vendor swap or v1
  ship-without (with the SDK removed, not just disabled).
- **The Sentry + PostHog DPAs only matter if the user gives consent.**
  But the SDK ships in the bundle regardless of consent state — the DPA
  is required for the *capability* to process data, not just the
  realised processing. Don't skip them.
