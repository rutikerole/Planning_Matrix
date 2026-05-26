# v1.0.31.x — ARCHITECT HANDOFF DEEP-DIVE AUDIT

**Repo:** `/Users/rutikerole/Planning_Matrix` · **Branch:** `audit/v1.0.31-architect-handoff`
**Date:** 2026-05-26 · **Mode:** READ-ONLY forensic. No code modified, Bayern SHA untouched, v1.0.31 `main` untouched.
**Method:** 5 parallel exploration agents (Areas 1–10) + 4 first-hand confirmation reads of the load-bearing P0 claims. Every claim carries `file:line`. Verified = 🟢, uncertain/conditional = 🟡, broken/missing = 🔴.

> Discipline note: where a claim depends on **deployment/migration state that the repo cannot prove** (Edge-Function versions, applied migrations, Vercel secrets), it is marked 🟡 and called out as "not knowable from repo — confirm out-of-band." Those are not GREEN.

---

## 1. EXECUTIVE SUMMARY

**The architect-verify flow is *reachable* (v1.0.27 closed the Bug-29 dead-end) but it is NOT production-ready as a legal shield, and it cannot be honestly demoed as one today.** The owner can mint an invite and an architect can flip qualifiers, but the chain breaks at both ends and in the middle: (a) **no email is ever sent** — "Invite architect" is a `mailto:` handoff to the owner's own mail client (`InviteArchitectModal.tsx:107-111`); (b) the **invite link is an unbound bearer token** that any provisioned `designer` account can claim (`share-project/index.ts:372`); (c) **reject may silently invert to verify** if `verify-fact` was not redeployed (`HANDOFF.md:554-555`); and most damningly (d) the **"verified" PDF is hollow and self-contradicting** — it names no architect, carries no chamber number, has no cryptographic proof, its proof-QR is broken, and its own verification page is hardcoded to print "VORLÄUFIG" even at 100% verified (`pdfSections/verification.ts:267-279`). The backend mutation, RLS, single-use token, expiry, and erosion-on-edit are genuinely well-built; the failure is concentrated in **the email handoff, the identity binding, and the verified artifact itself** — exactly the parts a manager would scrutinize. **Verdict: 🔴 not production-ready. The verified PDF, not the wiring, is the blocker.**

---

## 2. FLOW TRACE (13 steps)

| # | Step | Status | Evidence |
|---|------|--------|----------|
| 1 | Consultation → result page | 🟢 | `ResultPage.tsx` renders; reactivity wired `ResultPage.tsx:43` |
| 2 | Click "Invite architect to verify" | 🟡 | CTA wired `ResultFooter.tsx:103-110`, modal mounted `:145-149`. **Desktop-only** — `hidden sm:inline-flex` (invisible <640px). Footer `null` for shared recipients `ResultFooter.tsx:56` |
| 3 | Modal: email + name + message | 🔴 | Only **email** collected `InviteArchitectModal.tsx:216-227`; **no name, no message**; expiry server-fixed read-only `:201-205`. Email is **decorative** (pre-fills mailto only, never sent to server) |
| 4 | System creates invitation record (DB) | 🟢 | `createArchitectInvite` → `share-project {action:create}` `architectInviteApi.ts:126-149` → INSERT `project_members{role:'designer'}` `share-project/index.ts:238-243` |
| 5 | Email sent to architect with link | 🔴 | **NO server email.** `mailto:` handoff `InviteArchitectModal.tsx:107-111`. No Resend/SendGrid/SES/SMTP anywhere. "B1 default — no email vendor" `0026_project_members.sql:10` |
| 6 | Architect clicks link → verification view | 🟡 | `/architect/accept?token=` → `share-project {accept}` `AcceptInvite.tsx:117-132`. **Requires provisioned `role=designer`** `share-project/index.ts:292` (manual SQL, `OPS_RUNBOOK.md:199-210`); cold architect → 403 |
| 7 | Architect sees PDF preview / facts / context | 🟡 | Context (name/bundesland/template) `VerificationPanel.tsx:114-119` + 5 fact sections `:239-245` ✓. **NO PDF preview, NO chat history** (grep clean; only `projects.state` queried `:45-49`) |
| 8 | Architect verifies / rejects each fact | 🟡→🔴 | Per-row verify `:323-330` + reject w/ reason `:334-364` exist in **source**. 🔴 **reject inverts to verify if `verify-fact` not redeployed** `HANDOFF.md:554-555` |
| 9 | Architect signs / confirms / submits | 🔴 | **No signature, no name capture, no chamber number, no final submit.** Per-row immediate commit; verify has no confirm step `:326`; `setBy:'user'` only `verify-fact/index.ts:250,257` |
| 10 | System updates project status | 🟢 | `applyVerification` writes qualifier `{source:DESIGNER,quality:VERIFIED}` into `projects.state` JSONB `verify-fact/index.ts:333-375,271-274` |
| 11 | User sees "Verified by [name] on [date]" | 🔴 | Date ✓ (`rollup.lastVerifiedAt`); **name ✗** — generic "Verifiziert durch eine/n bauvorlageberechtigte/n Architekt/in" `exportPdf.ts:1240-1241`, no name exists to show |
| 12 | PDF re-renders, Vorläufig cleared + sig block | 🔴 | **Manual re-download** (PDF built only at export click `ExportMenu.tsx:104-115`); per-page footer clears on `allVerified` `exportPdf.ts:1238` BUT **Section-10 verification-page footer hardcoded "VORLÄUFIG"** `verification.ts:267-279`; sig block blank `verification.ts:199-214` |
| 13 | User re-downloads / shares verified PDF | 🟡 | Shareable (plain file) but **same filename** draft vs verified `exportFilename.ts:8-19`; previously-downloaded copies stay stale |

**Red steps: 3, 5, 9, 11, 12 — i.e. every step that constitutes the *verified artifact* and its *delivery*.** The wiring (2,4,6,8,10) mostly works; the legal-shield substance does not.

---

## 3. EDGE-CASE MATRIX (E1–E24)

| # | Case | Status | Finding (file:line) |
|---|------|--------|---------------------|
| E1 | Architect never opens link | 🟡 | Row sits unclaimed, 7-day TTL `0030:26-28`; no reminder, no open-tracking |
| E2 | Opens but doesn't verify | 🟡 | Footer stays Vorläufig (binary); no nudge/escalation |
| E3 | Wrong email (typo) | 🔴 | No revoke path (Bug 116). Email is decorative so typo = owner mails wrong human; damage requires that human to be a provisioned designer |
| E4 | Multiple architects, same project | 🟡 | Allowed & **unbounded** — partial unique only on `(project_id,user_id) WHERE user_id NOT NULL` `0026:40-42`; CREATE always inserts fresh row (Bug 120) |
| E5 | Partial verify (some yes/no) | 🟢 | Supported; `allVerified` requires `pending===0` `verificationRollup.ts:80` → stays Vorläufig (no partial-credit, by design) |
| E6 | Verifies, then owner edits verified fact | 🟡→🔴 | Erosion clears **facts only** `projectStateHelpers.ts:352-372` (and only if `chat-turn` redeployed `HANDOFF.md:556-557`); recs/procedures/docs/roles **not eroded** (Bug 117); no user warning |
| E7 | Owner changes template/state mid-flow | 🔴 | No version pin; verify-fact reads current state at click time; stale verification possible (Bug 118 / no `state_version` guard) |
| E8 | Project deleted after invite | 🟢 | `ON DELETE CASCADE` removes `project_members` + `event_log` `0026:24`,`0020:50`; link 404s. (🟡 audit trail cascades away too) |
| E9 | Owner changes email | 🟢 | Invite is project-scoped, not owner-email-scoped; unaffected |
| E10 | Project data changed since invite | 🔴 | No data-version mismatch detection; verify applies to whatever state is current |
| E11 | Two architects, conflicting answers | 🔴 | Both may be members; **last-write-wins** on shared `state` JSONB `verify-fact/index.ts:271-274`; no conflict resolution (Bug 118) |
| E12 | Architect rejects entire project | 🟡 | No project-level reject / no bulk; must reject each row individually `VerificationPanel.tsx:334-364` |
| E13 | Link forwarded to 3rd party | 🔴 | Bearer token, no email binding — any signed-in designer claims it `share-project/index.ts:372` (Bug 114) |
| E14 | Email to spam | 🟡 | N/A (mailto, owner sends from own client); but zero delivery tracking |
| E15 | Architect on mobile can't complete | 🟡 | Inputs hardcode `min-w-[18rem]` `VerificationPanel.tsx:320,343` → overflow on narrow viewports; invite CTA itself hidden <640px |
| E16 | Rapid double-click invite | 🟡 | react-query per-session cache dedupes `InviteArchitectModal.tsx:47-54`; **does not survive reload** → dupes possible (Bug 120) |
| E17 | Network fail during invite create | 🟡 | `retry:false`; single INSERT so no partial DB state; user must hit explicit retry `:154` |
| E18 | Network fail during architect submit | 🟡 | Single live fetch `verifyFactClient.ts:57-64`; fails cleanly, no offline queue, single UPDATE so no partial |
| E19 | Architect screen-reader / a11y | 🟡 | Native inputs, no bespoke aria audit performed; **not verified this pass** |
| E20 | Architect doesn't speak German | 🟡 | App i18n DE+EN (`verify:locales` gate); legal/§ content is German by nature |
| E21 | Architect logged into different PM account | 🟡 | Accept binds to whoever is signed in (ties to E13); no identity check |
| E22 | Unsupported template (T-06/07/08 frozen) — invite visible? | 🟡 | **NOT verified this pass.** PDF was frozen for non-demo cells (C9) but whether the invite CTA is gated on demo-cells is unconfirmed — needs check |
| E23 | Project in stub state — invite gated? | 🟡 | **NOT verified this pass** — needs check |
| E24 | PDF generation fails on verify | 🟢 | Decoupled — PDF built only at export click; QR failure non-fatal try/catch `exportPdf.ts:306-307` |

---

## 4. PRODUCTION READINESS CHECKLIST

| Item | Status | Evidence |
|------|--------|----------|
| Owner invite CTA reachable in shipped UI | 🟢 | `ResultFooter.tsx:103-110` (desktop only) |
| `share-project` Edge Fn deployed (create+accept) | 🟡 | Source present; **deploy state not knowable from repo** |
| `verify-fact` Edge Fn deployed **with reject** | 🔴/🟡 | Source has reject `verify-fact/index.ts:139`; repo flags redeploy **pending** `HANDOFF.md:554-555` — reject inverts until done |
| `chat-turn` Edge Fn redeployed (erosion) | 🔴/🟡 | Repo flags pending `HANDOFF.md:556-557` — erosion won't fire until done |
| Migration `0035_realtime_projects.sql` applied | 🟡 | Pending per `CHANGELOG.md:298-299`; focus-poll fallback works `useVerificationReactivity.ts:31-38` |
| Client env: `VITE_SUPABASE_URL` / `_ANON_KEY` | 🟡 | Required `.env.example:11-12`; Vercel state not knowable |
| Server env: `SUPABASE_*` (auto) + `PUBLIC_SITE_URL` | 🟡 | `share-project/index.ts:64` falls back to canonical host; wrong on custom/preview domains |
| Server-side transactional email | 🔴 | Does not exist (Bug 110) |
| Self-service architect (designer) onboarding | 🔴 | Manual SQL only `OPS_RUNBOOK.md:199-210` (Bug 125) |
| Error tracking (Sentry) | 🟡 | Wired `errorTracking.ts:130`, PROD+consent gated; **no `captureException` in architect flow** |
| Server event logging | 🟡 | `qualifier.verified/rejected` `verify-fact/index.ts:285-300`, `project_member.accepted` `share-project/index.ts:408-414`; **invite-create emits nothing** |
| Metrics: sent / opened / verified | 🟡 | verified ✓, accepted ✓, **sent ✗ (no event), opened ✗ (no email tracking)** |
| CI coverage of the loop | 🔴 | Pure-logic smoke + mock-UI Playwright only; **no end-to-end loop test in CI** `.github/workflows/test.yml:28-69` |

---

## 5. BUG REGISTER (Bug 110+)

| Bug | Sev | Title | file:line |
|-----|-----|-------|-----------|
| **110** | **P0** | No server-side email — "Invite architect" is a `mailto:` handoff; system never sends the invite | `InviteArchitectModal.tsx:107-111`, `0026:10` |
| **111** | **P0** | Section-10 verification-page footer hardcoded "VORLÄUFIG"; never clears even at 100% verified → self-contradicting document | `pdfSections/verification.ts:267-279`, `exportPdf.ts:1393-1397` |
| **112** | **P0** | Verified PDF names no architect & no chamber registration number — signature block is blank generic text; legal shield carries no accountable identity | `exportPdf.ts:1240-1241`, `verification.ts:199-214`, `verify-fact/index.ts:242-243` |
| **113** | **P0** | Reject-inversion: if deployed `verify-fact` predates C8, "Ablehnen" silently verifies | `verify-fact/index.ts:139`, `HANDOFF.md:554-555` (deploy-state) |
| **114** | **P1** | Invite token is an unbound bearer secret — any provisioned designer who opens the link gains verify rights (link-forwarding / E13) | `architectInviteApi.ts:146`, `share-project/index.ts:372` |
| **115** | **P1** | Proof-QR points to wrong domain (`planning-matrix.app` vs `.vercel.app`), singular `/project/` path, and an auth-gated route → no public third-party verification | `exportPdf.ts:297`, `router.tsx:128-130` |
| **116** | **P1** | No revoke / resend for architect membership invite; owner cannot kill a mis-sent verify link before 7-day expiry (RLS allows DELETE `0026:90-99` but no UI/API) | grep clean in `src/features/result/` |
| **117** | **P1** | Owner-edit erosion covers **facts only**; editing a verified recommendation/procedure/document/role keeps its VERIFIED badge | `projectStateHelpers.ts:352-372,412+` |
| **118** | **P1** | No optimistic lock on `verify-fact` write — last-write-wins vs owner chat-turn; `0033` `state_version` not honored | `verify-fact/index.ts:271-274`, `0033` |
| **125** | **P1** | No self-service architect onboarding — `role='designer'` provisioned by manual SQL only | `OPS_RUNBOOK.md:199-210`, `HANDOFF.md:558` |
| **126** | **P1** | Dual confusing CTAs — "Invite architect" (verify) and "Send to architect" (read-only) side-by-side; labels don't disambiguate verification rights | `ResultFooter.tsx:103-117` |
| **119** | **P2** | No email validation in `InviteArchitectModal` (no `<form>`, no disabled guard); empty/garbage builds a broken mailto | `InviteArchitectModal.tsx:216-235` |
| **120** | **P2** | Unbounded duplicate unclaimed invites — no dedupe, no rate limit; partial unique index doesn't cover `user_id IS NULL` | `share-project/index.ts:238-243`, `0026:40-42` |
| **121** | **P2** | PDF doesn't auto re-render on verify; owner must manually re-download; old copies stay stale "Vorläufig" | `ExportMenu.tsx:104-115`, `useVerificationReactivity.ts:27-69` |
| **122** | **P2** | No verified-vs-draft filename distinction — recipient can't tell which copy is verified | `exportFilename.ts:8-19` |
| **123** | **P2** | Recommendation verify stores only `{source,quality}`, dropping `setAt/reason`; `rollup.lastVerifiedAt` misses recs | `verify-fact/index.ts:350` |
| **124** | **P2** | Audit trail records new value only (not prior); `event_log` insert is fire-and-forget (can silently drop) | `verify-fact/index.ts:294-308` |
| **127** | **P2** | Cover banner uses weaker `facts.some(VERIFIED)` gate vs per-page `allVerified`; 3 predicates can disagree in one PDF at partial state | `exportPdf.ts:1316-1320` vs `:1238` |
| **128** | **P2** | Mobile/a11y gaps — invite CTA hidden <640px; verify note/reason inputs `min-w-[18rem]` overflow narrow viewports | `ResultFooter.tsx:103`, `VerificationPanel.tsx:320,343` |

---

## 6. SEVERITY CLASSIFICATION

**P0 — legal-shield breaking, blocks any trustworthy demo (Bugs 110, 111, 112, 113)**
The flow can be *clicked through*, but the artifact it produces is not a credible verified document and the delivery mechanism doesn't deliver. 111+112 mean a "verified" PDF still says preliminary and names nobody. 113 means rejection can do the opposite of rejection. 110 means the system doesn't actually send anything.

**P1 — security / correctness / onboarding, blocks production self-service (Bugs 114, 115, 116, 117, 118, 125, 126)**
Acceptable to *defer* for a tightly-controlled, pre-provisioned demo, but each is a real production gap. 114 (bearer link) and 125 (manual provisioning) together mean there is no safe self-service path. 117/118 are silent-correctness erosion of verified state.

**P2 — polish / hygiene (Bugs 119, 120, 121, 122, 123, 124, 127, 128)**
Friction and inconsistency; none alone breaks the flow.

---

## 7. RECOMMENDED NEXT-SPRINT SCOPE (minimum to trust the demo)

Ordered by leverage. The first block is mandatory before *any* architect demo:

1. **Action the three flagged manual steps and confirm them in the Supabase dashboard** (Bug 113 + erosion + realtime). Until `verify-fact` is redeployed, reject inverts — this is non-negotiable. Verify the deployed function version, not the source. (`HANDOFF.md:552-558`)
2. **Fix the verified PDF (Bugs 111 + 112)** — the core deliverable:
   - Make `renderVerificationFooter` accept the rollup and flip "VORLÄUFIG" → "Verifiziert" like the per-page footer (`verification.ts:267-279`).
   - Decide and implement what "verified by" *means*: at minimum capture the architect's name (+ optional chamber/Eintragungs-Nr.) at accept or verify time and render it in the signature block. Today the block is structurally blank — a German Bauamt would reject it as evidence.
3. **Either send a real email or rename the CTA honestly (Bug 110).** A `mailto:` that may no-op while the UI implies "we invited the architect" is the kind of gap a manager finds in 30 seconds. Cheapest honest fix: relabel to "Copy invite link" + a copy confirmation; proper fix: a Resend/SES Edge Function.
4. **Bind the invite to the architect's email (Bug 114).** Add `invited_email` to `project_members`, send it from the modal, and assert `caller.email === invited_email` in `handleAccept` before the claim. Closes link-forwarding.
5. **Add a revoke control (Bug 116)** so a typo'd invite can be killed before its 7-day TTL.

Deferrable to a later sprint with eyes open: 117/118 (erosion coverage + optimistic lock), 115 (public proof-QR — only matters once 112 gives the PDF something real to prove), 125 (self-service onboarding), and all P2s.

---

## 8. HONEST VERDICT

**🔴 The architect handoff is NOT production-ready, and it is not safely demo-ready as a "legal shield" without work first.**

The v1.0.27 narrative — "wired end-to-end" — is true only in the narrow sense that there is now a click-path from owner CTA to a persisted qualifier flip. That was a real fix to a real dead-end. But "wired" is not "works as a legal shield." The shield *is* the verified PDF, and the verified PDF today: prints "VORLÄUFIG" on its own verification page even when fully verified (Bug 111), names no architect and shows no chamber number (Bug 112), carries a broken proof-QR (Bug 115), and is a client-side, tamperable, un-signed file. Around it, the system doesn't actually email anyone (Bug 110), can have its reject button do the opposite of reject depending on un-verifiable deploy state (Bug 113), and grants verify rights to anyone holding a forwarded link (Bug 114).

**Minimum to make it trustworthy for a controlled manager demo** (Rutik pre-provisions a test `designer` account and sends himself the link): do step 1 (confirm the three deploys/migration — especially `verify-fact`) **and** step 2 (the PDF: clear the Section-10 footer + put a real architect name in the signature block). Without step 2, the manager opens the "verified" PDF, sees "VORLÄUFIG" and a blank signature, and the positioning collapses on the spot. Steps 3–5 are needed before it can face a *real external architect* in production, but a scripted demo can survive without them.

**Bottom line: the wiring is the easy 80% that's done; the verified artifact is the hard 20% that is the entire point, and it's the part that's hollow.** Do not smoke-walk three PDFs and call it manager-ready until Bugs 111, 112, and 113 are closed.

---

*5 parallel agents (Areas 1–10) + 4 first-hand confirmation reads. No code modified; Bayern SHA and v1.0.31 `main` untouched. Uncertain items (E19, E22, E23, all deploy/migration/secret state) marked 🟡 — confirm out-of-band, do not treat as GREEN.*
