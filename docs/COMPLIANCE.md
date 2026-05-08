# Compliance Posture — DSGVO / GDPR / German Building-Law Domain

> Audit-trail companion to `docs/HANDOFF.md`. Lists every data-flow
> across vendor boundaries, the legal basis, the responsible party,
> and the verification status. Lights are honest:
> ✅ done · ⚠️ partial / awaiting external action · ❌ open
> · ❓ documented but not empirically tested.
>
> This file is the single page a DSGVO supervisory authority or a
> client's Datenschutzbeauftragter can read to understand the
> system's posture. It is NOT a substitute for the
> Datenschutzerklärung in-product (`/datenschutz` route).

## 1. Sub-processors

| # | Sub-processor | Region | DPA / AVV | SCCs / DPF | Owner | Status |
| - | ------------- | ------ | --------- | ---------- | ----- | ------ |
| 1 | Anthropic, PBC | US | DPA Art. 28 DSGVO | EU-US DPF + 2021 SCCs | client signs | ⚠️ pending |
| 2 | Supabase Inc. | EU-Frankfurt (eu-central-1) | DPA via Dashboard | 2021 SCCs (US legs) | client signs | ⚠️ pending |
| 3 | Vercel Inc. | configurable; document the actual region in DEPLOYMENT.md | DPA via Dashboard | 2021 SCCs | client signs | ⚠️ pending |
| 4 | Functional Software (Sentry) | EU-Frankfurt | DPA via support | n/a — EU-only path | client signs | ⚠️ pending |
| 5 | PostHog Inc. | EU-Frankfurt (eu.i.posthog.com) | DPA + EU SCCs | 2021 SCCs | client signs | ⚠️ pending |

DPA tracking ledger: `docs/PHASE_17_DPA_LEDGER.md` — outbound email
templates per vendor; client fills sent / countersigned dates.

## 2. Data flows across vendor boundaries

| What | Source | Destination | Region leg | Lawful basis | PII? | Retention |
| ---- | ------ | ----------- | ---------- | ------------ | ---- | --------- |
| Auth credentials (email, hashed password) | SPA | Supabase Auth | EU | Art. 6 (1)(b) GDPR | yes | account lifetime |
| Project state (chat history, qualifiers) | SPA / Edge Fn | Supabase DB (`public.messages`, `public.projects.state`) | EU | Art. 6 (1)(b) | indirect (project may carry plot address) | account lifetime |
| Chat-turn prompts | Edge Fn | Anthropic API | EU → US | Art. 6 (1)(b) | indirect (state JSONB embedded) | as Anthropic retains |
| Citation + qualifier events | Edge Fn | Supabase `event_log` | EU | Art. 6 (1)(b) | user_id only | reaper after 90d (migration 0017) |
| Error events | SPA | Sentry EU | EU | Art. 6 (1)(a) consent | scrubbed (regex EMAIL + PLZ) | 30d default; configurable |
| Product analytics | SPA | PostHog EU | EU | Art. 6 (1)(a) consent | anonymous user id | 12m default; configurable |
| Basemap tiles | SPA | OpenFreeMap CDN | EU | Art. 6 (1)(f) | none (request URL only) | n/a |
| Address geocoding | SPA | Nominatim | EU | Art. 6 (1)(f) | the address typed | not retained client-side |
| B-Plan WMS | Edge Fn | München Geoportal | EU-only | Art. 6 (1)(f) | the requested polygon | not retained client-side |

**Anthropic outbound contains the following indirect PII:**
plot address (when set), free-text user messages, accumulated state
JSONB (qualifier reasons, fact values). Consent posture is "necessary
for performance of contract" (Art. 6 (1)(b)) since the AI is the
product. **Documented in Datenschutzerklärung § 3.3.** Client must
ensure end-user consent at signup is Art. 6 (1)(b)-aligned.

## 3. User rights (DSGVO Articles 15–22)

| Right | Surface | Status |
| ----- | ------- | ------ |
| Access (Art. 15) | Manual SQL via DB owner — `select state from public.projects where owner_id = auth.uid()` returns the full project JSONB; messages query gives history | ⚠️ no self-service UI; client honours by ticket |
| Rectification (Art. 16) | Chat-turn corrects facts within the persona dialog; admin can SQL-amend `projects.state` | ⚠️ partial |
| Erasure (Art. 17) | DELETE on `auth.users` cascades to profiles → projects → messages → event_log via FKs (migrations 0001 / 0003 / 0007 / 0020 / 0026 ON DELETE CASCADE) | ✅ structurally; ⚠️ no self-service "delete my account" button |
| Restriction (Art. 18) | None today | ❌ post-v1 |
| Portability (Art. 20) | `src/lib/export/` produces a JSON / PDF dump | ✅ JSON dump path; PDF in `exportPdf` |
| Objection (Art. 21) | Cookie banner consent withdrawal (Functional / Analytics) | ⚠️ technical-cookies only; no opt-out of base processing because Art. 6 (1)(b) governs |
| Withdrawal of consent (Art. 7 (3)) | Cookie banner re-prompt | ✅ |
| Complaint (Art. 77) | Datenschutzerklärung names BayLDA (Bayerisches Landesamt für Datenschutzaufsicht) | ✅ |

## 4. Hosting region

- **Supabase project:** EU-Frankfurt confirmed via Dashboard
  (linked project `dklseznumnehutbarleg`, region South Asia (Mumbai)
  per `supabase projects list` snapshot 2026-05-08 — **⚠️ MISMATCH:**
  the production project must be re-provisioned in EU-Frankfurt OR
  the Datenschutz § 3.4 ("EU-Frankfurt") must be corrected to match
  reality before public traffic. **Client decision required.**
- **Vercel:** `vercel.json` regions field is the source of truth.
  Document the actual choice in DEPLOYMENT.md at first deploy.
- **Anthropic:** US-only. EU-US Data Privacy Framework participant
  (`https://www.dataprivacyframework.gov/list`) — verify continued
  participation at each annual review cycle.
- **Sentry:** EU instance (`sentry.io/organizations/<slug>` with
  `region: 'eu'` configured in `errorTracking.ts`).
- **PostHog:** EU instance (`eu.i.posthog.com`).

## 5. Retention windows (server-side)

| Table / store | Default | Notes |
| ------------- | ------- | ----- |
| `public.messages` | indefinite (account lifetime) | Subject to Art. 17 erasure on account delete |
| `public.projects.state` | indefinite | Same |
| `public.event_log` | 90 days, reaped by `event_log_prune()` (migration 0017) | Hard-coded; tune via SQL |
| `logs.traces` / `logs.spans` | 90 days, reaper migration 0017 | Same |
| `public.project_files` | account lifetime; signed-URL access logs in event_log | `delete-file` Edge Fn supports per-file delete |
| `public.project_members` | account lifetime; expires_at=7d on UNCLAIMED rows (0030) | Stale-invite cleanup query in OPS_RUNBOOK § 6 |

## 6. Disclaimers in-product

- "Vorläufig — bestätigt durch eine/n bauvorlageberechtigte/n
  Architekt/in noch ausstehend." — surfaces on every result-page
  card whose qualifier is not DESIGNER+VERIFIED (v1.0.3 wired
  into 6 surfaces; v1.0.4 broadens).
- "Das ist keine Rechtsberatung."  ❌ **NOT YET surfaced
  in-product.** AGB carries the standard Gewährleistungsausschluss
  but no in-flow "this is not legal advice" hint. Counsel-review
  candidate; tracked in `docs/LEGAL_COPY_REVIEW.md`.

## 7. Audit-trail surfaces

- `docs/PHASE_13_REVIEW.md` — qualifier-gate rollout discipline.
- `docs/POST_V1_AUDIT.md` — first paranoid 18-section audit.
- `docs/POST_SMOKE_TEST_INVESTIGATION.md` — empirical post-deploy
  read-pass.
- `docs/PROD_READINESS_AUDIT_v1.0.3.md` — God-mode 11-dimension
  audit.
- `docs/COMPLIANCE.md` (this file).
- `docs/LEGAL_COPY_REVIEW.md` — every German legal string in one
  place, ready for Anwalt red-pen.

## 8. Open compliance items (client-side, post-v1.0.4)

1. **All 5 DPAs countersigned** (currently outbound).
2. **Counsel review of all 4 legal pages** (Impressum / Datenschutz /
   AGB / Cookies). Schedule before public traffic.
3. **Bayerisches Anwalt sign-off on the "Vorläufig" wording** as a
   §6.B.01 legal-shield clause. v1.0.4 captures it under
   `docs/LEGAL_COPY_REVIEW.md` for review.
4. **Supabase region confirmation.** If the production project is
   not EU-Frankfurt, EITHER migrate OR amend Datenschutz § 3.4.
5. **Production retention policy decision.** Defaults documented;
   client may want shorter / longer.
6. **Anwalt sign-off OR an explicit "this is not legal advice"
   disclaimer in the chat surface.**
7. **Self-service erasure button.** Today's posture is honour-by-
   ticket; post-v1 adds a "delete my account" UI.
