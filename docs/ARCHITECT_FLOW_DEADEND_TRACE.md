# ARCHITECT VERIFICATION FLOW — UI WALKTHROUGH / DEAD-END TRACE

**Repo:** `/Users/rutikerole/Planning_Matrix` · **HEAD:** `c374ef7` · **Date:** 2026-05-24
**Trigger:** FULL_GERMANY_AUDIT.md Bug 29 — the architect "legal shield" verification surface appears unreachable end-to-end through the shipped UI (prod `project_members` = 0 rows, `qualifier_transitions` = 0 rows).
**Mode:** READ-ONLY, no execution. Pure static click-path trace from owner Dashboard. Bayern SHA MATCH preserved.

> **RESOLVED 2026-05-24 in v1.0.27 (C7 + C8).** The owner-side invite path is
> now wired (`architectInviteApi.ts` + `InviteArchitectModal.tsx` + a
> result-page "Invite architect to verify" CTA), so the legal shield is
> reachable end-to-end through the shipped UI. Reactive owner footer (Bug 32),
> verification erosion on owner edit (Bug 32), aggregate rollup (Bug 33), and
> architect reject/un-verify (Bug 34) also landed. Validation pending Rutik's
> e2e smoke walk + the manual steps (apply migration 0035; redeploy
> verify-fact). The trace below is retained as the historical diagnosis.

## TL;DR

**Confirmed: there is no click-path from the owner UI that creates a `project_members` row or routes anyone to `/architect/accept`.** The product ships **two differently-named "share" mechanisms** that look interchangeable but are not:

1. **Read-only share token** (`create-share-token` → `project_share_tokens` → `/result/share/:token`, 30-day, read-only). **This is the only one the UI invokes.**
2. **Architect membership invite** (`share-project` CREATE → `project_members` row → `/architect/accept?token=…` → `verify-fact` write rights). **This has no UI caller anywhere in `src/`.**

The owner's "Send to architect" button triggers mechanism (1). Mechanism (2) — the one that actually unlocks the verification panel — can only be initiated by calling the `share-project` Edge Function in CREATE mode directly (curl / SQL editor / Postman). No component does this.

---

## The two share mechanisms (why they're confusable)

| | Read-only share token | Architect membership invite |
|---|---|---|
| Edge function | `create-share-token` | `share-project` (mode `create`) |
| Lib wrapper | `shareTokenApi.ts:49 createShareToken()` | **none** |
| Table written | `project_share_tokens` | `project_members` |
| TTL | 30 days (`0006`) | 7 days (`0030`) |
| Recipient lands on | `/result/share/:token` (read-only briefing) | `/architect/accept?token=…` → `/architect/projects/:id/verify` |
| Grants verification? | **No** — read-only | **Yes** — designer can flip qualifiers via `verify-fact` |
| Invoked by UI? | **Yes** (2 call sites) | **No** (0 call sites) |

The naming collision ("share-project" vs "share token") is itself a trap: a reader skimming the code sees `share-project` and assumes the architect flow is wired, when the wired path is the unrelated `create-share-token`.

---

## CLICK-PATH ENUMERATION (owner Dashboard → ?)

### Path A — Dashboard → Result → "Send to architect"
1. `/dashboard` → click a project → `/projects/:id` (chat) → "Stand up & look around" → `/projects/:id/result`.
2. Result page footer/menu exposes **"Send to architect"** → opens `SendToArchitectModal` (`SendToArchitectModal.tsx:35`).
3. Modal has two buttons: **"Copy link"** (`:177 handleCopyLink`) and **"Send"** (`:195 handleSend`). Both call `ensureShareLink()` (`:60`) → **`createShareToken(project.id)`** (`:64`) → `create-share-token` Edge Function → `project_share_tokens`.
4. "Send" builds a `mailto:` whose body carries the **30-day read-only** `/result/share/:token` link (`:88-95`). The modal's own privacy note states it verbatim: *"Recipients see a read-only view; you keep edit rights."* (`:209-215`).
5. **Terminates at a read-only link. No `project_members` row, no `/architect/accept`, no verification capability.** Dead-end for the legal shield.

### Path B — Dashboard → Result → Export menu → "Share link"
1. Same route to `/projects/:id/result`.
2. Export menu (`ExportMenu.tsx`) "share link" item → `createShareToken(project.id)` (`ExportMenu.tsx:138`) → identical read-only `project_share_tokens` link.
3. **Same dead-end as Path A** (it's literally the same token mechanism).

### Path C — direct `/architect/accept?token=…`
1. Route exists (`router.tsx:180`, outside `ArchitectGuard`) → `AcceptInvite` component.
2. `AcceptInvite` reads `?token=` (`AcceptInvite.tsx:34`), requires sign-in, validates UUID shape, and POSTs `{inviteToken}` to **`share-project` ACCEPT mode** (`:117-132`).
3. **But the token must already exist as a `project_members.invite_token`.** Nothing in the UI mints that token (see "missing component" below). So this route is only reachable if someone pasted a token that was created out-of-band.
4. **Terminates unless an out-of-band invite row exists.**

### Path D — `/architect` dashboard (designer view)
1. `ArchitectGuard` → `ArchitectDashboard` (`ArchitectDashboard.tsx`).
2. It **reads** `project_members` for the signed-in designer (`:45 .from('project_members')`) to list projects they may verify.
3. **It cannot create a membership** — read-only query. With `project_members` empty (prod), this dashboard is empty for everyone.
4. From here a designer could click into `/architect/projects/:id/verify` **only for a project they're already a member of** — which, with 0 memberships, never happens.

### Grep evidence (firsthand, this session)
- Callers of `share-project` in `src/`: **only** `AcceptInvite.tsx:123` (ACCEPT mode). Zero CREATE-mode callers.
- Callers of `createShareToken`: `SendToArchitectModal.tsx:64`, `ExportMenu.tsx:138` (both read-only token).
- `project_members` in `src/`: **only** `ArchitectDashboard.tsx:45` (SELECT). **Zero client-side INSERT.**
- `/architect/accept` linked from: only the route definition (`router.tsx:180`) — no in-app `<Link>`/`navigate` constructs an `/architect/accept?token=` URL.

---

## CONCLUSION — the genuine gap

**There is no path.** Every owner click-path that says "architect" leads to a 30-day read-only share link, not to the verification flow. The verification surface (`/architect/projects/:id/verify` → `verify-fact` → `qualifier.quality = VERIFIED` → the Bauherr's "Vorläufig" footer clears) is gated on a `project_members` row that **no UI can create**. This exactly explains the prod telemetry: `project_members = 0`, `qualifier_transitions = 0` — the entire Phase-13 legal shield has never run with real data because there's no button to start it.

### Missing component(s) to wire it (named)

The `share-project` Edge Function CREATE mode already exists and works (`share-project/index.ts:205-271` — owner ownership check → INSERT `project_members {role_in_project:'designer', invite_token}` → returns `acceptUrl = …/architect/accept?token=…`). What's missing is the **owner-facing client surface that calls it**:

1. **`src/features/result/lib/architectInviteApi.ts`** (new) — a `createArchitectInvite(projectId): Promise<{ acceptUrl, expiresAt }>` wrapper that POSTs `{ action: 'create', projectId }` to `share-project` (mirror of `shareTokenApi.ts:49`, but the membership function, not the read-only token).
2. **`src/features/result/components/InviteArchitectModal.tsx`** (new, or a mode added to `SendToArchitectModal`) — surfaces the `acceptUrl` (the `/architect/accept?token=…` link) for the owner to send, distinct from the read-only briefing link. Critically it must **not** reuse `createShareToken` — that's the bug today: the "Send to architect" modal calls the read-only token path instead of the membership-invite path.
3. **Wiring** — a result-page entry point ("Invite architect to verify") that opens (2), separate from / replacing the current read-only "Send to architect" CTA, so the owner can actually initiate verification.

Net: the backend (CREATE mode + ACCEPT mode + verify-fact + RLS) is fully built; the dead-end is purely the **absence of an owner-side caller for `share-project` CREATE**, compounded by the existing "Send to architect" button silently routing to the read-only token instead. One small lib + one modal + one CTA rewire closes it. (See FULL_GERMANY_AUDIT Bugs 32/33/34 for the *correctness* gaps that remain even once the flow is reachable: non-reactive owner footer, un-clearable aggregate footer, no reject/un-verify, verification erosion on owner edit.)

*Bayern SHA verified MATCH. No code modified.*
