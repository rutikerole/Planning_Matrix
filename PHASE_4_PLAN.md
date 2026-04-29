# Phase 4 — PLAN.md

> **Disposition (per Phase-3 instructions A + B, applied to Phase 4):** This file is **not** thrown away. It moves to `docs/phase4-plan.md` and is committed in the final commit of Phase 4. A thin companion `docs/phase4-decisions.md` (Q1–Qn, three-line entries) ships alongside.

> **Status:** Research complete. Repo surveyed. Awaiting Rutik's manager-walkthrough confirmation on **§0 Q1–Q16** before commit #1. Phase 3.1 reactivation runbook (apply migration 0004 + redeploy `chat-turn`) should also land before Phase 4 starts so we're not stacking activations.

---

## 0 · Confirmation table — manager + Rutik must walk through before commit #1

The brief flagged A1–A7. Research surfaced eight more (Q8–Q15). I've also folded one repo-state observation (Q16). All sixteen need a yes/no/override before I touch a file in `src/` or `supabase/`.

### Brief-original — A1–A7

| ID | Question (one line) | Default (per brief) | Manager call |
|---|---|---|---|
| **Q1** (A1) | Architect joins per-project via Bauherr invite — not as a separate signup tier? | ✅ Per-project invite | ☐ confirmed ☐ override → architect-led |
| **Q2** (A2) | Bayern stays the only Bundesland in v2; NRW + 14 others deferred? | ✅ Bayern only | ☐ confirmed ☐ override → +NRW |
| **Q3** (A3) | B-Plan integration stays simulated (EHRLICHKEITSPFLICHT continues to honour "no live lookup"); no real municipal API in Phase 4? | ✅ Simulated | ☐ confirmed ☐ override → 1-municipality spike |
| **Q4** (A4) | DESIGNER cockpit lives inline in the existing chat workspace + overview modal (Verify buttons, workshop notes, Gate 99 tab)? Not a separate `/architect-cockpit` route. | ✅ Inline | ☐ confirmed ☐ override → separate route |
| **Q5** (A5) | No pricing / Stripe in Phase 4 (free for invited beta)? | ✅ No pricing | ☐ confirmed ☐ override → placeholder Stripe |
| **Q6** (A6) | ENGINEER + AUTHORITY remain stubs; Phase 4 ships only CLIENT + DESIGNER? | ✅ CLIENT + DESIGNER only | ☐ confirmed ☐ override → minimal ENGINEER stub |
| **Q7** (A7) | Project sharing via email-bound, single-use signed invite — not via shareable URLs? | ✅ Email-only invites | ☐ confirmed ☐ override → shareable links |

### Surfaced from research / repo survey — Q8–Q16

| ID | Question | Recommendation | Manager call |
|---|---|---|---|
| **Q8** | SMTP provider for invite + auth emails. Research recommends **Resend (EU region)** at ~$20/mo Pro tier; Postmark is the conservative fallback (better web.de/gmx.net deliverability but US-processed). | Resend | ☐ Resend ☐ Postmark ☐ AWS SES ☐ other |
| **Q9** | Sender domain. Current `planning-matrix.vercel.app` cannot host SPF/DKIM/DMARC TXT records — Vercel manages that subdomain's DNS. Pre-register `planning-matrix.app` (or a manager-chosen domain) before SMTP can ship. | Buy `planning-matrix.app` | ☐ confirmed ☐ different domain → ____________ |
| **Q10** | `project_members.role` enum values. Research suggests `('owner', 'designer', 'viewer')`; brief uses `('client', 'designer', 'engineer', 'authority')`. Aligning with brief preserves the existing `profiles.role` enum. **Recommendation: align with brief — `('client', 'designer', 'engineer', 'authority')`**. The "owner" concept stays as a denormalised `projects.owner_id` pointer for "who created this." | Use `client / designer / engineer / authority` | ☐ confirmed ☐ different shape |
| **Q11** | When a DESIGNER joins mid-conversation, do they see the full conversation history including prior CLIENT turns, or only from the join point onward? Privacy implication: the Bauherr may have shared intimate details (budget, family situation) before. **Recommendation: full history visible to DESIGNER.** The architect needs context. We surface a small in-thread system row at the join point — *"Architekt:in [Name] dem Projekt am [Datum] hinzugefügt."* — so the Bauherr knows their architect can see prior content. | Full history | ☐ full history ☐ from-join-point only |
| **Q12** | Invite token expiry. Research default: **7 days**. Long enough for a working week + weekend. Resend reminder option also available. | 7 days | ☐ 7 days ☐ 24h ☐ 30 days ☐ ____________ |
| **Q13** | Cap on how many non-CLIENT members per project. **Recommendation: cap at 5 non-CLIENT members for v2.** Prevents a Bauherr from spamming invitations; loosens later. | Max 5 non-CLIENT | ☐ 5 ☐ 1 (single architect only) ☐ no cap |
| **Q14** | Can DESIGNER **unverify** a fact they previously verified? E.g. they signed off, then realised the assumption was wrong. **Recommendation: yes, with a `DESIGNER · REJECTED` qualifier.** Adds a 5th `Quality` value. Audit row written. UI shows the timeline. | Allow unverify → REJECTED | ☐ confirmed ☐ different policy |
| **Q15** | "Workshop notes" right-rail section scope. Brief says markdown-lite + DESIGNER-edit + CLIENT-read. **Recommendation: confirm scope but ship plain text in v2.** Markdown is a feature creep risk; plain-text paragraphs are enough. Keep markdown for Phase 5. | Plain text v2 | ☐ plain text ☐ ship markdown |
| **Q16** | Behaviour when a Bauherr **removes** an architect from a project. Workshop notes from that architect — keep, anonymise to "former architect", or scrub? Audit row in `project_events` regardless. **Recommendation: keep + anonymise.** Notes have project value; the architect's name and email are personal data. | Keep + anonymise | ☐ confirmed ☐ scrub ☐ keep with name preserved |

---

## 1 · Research takeaways

### SMTP — Resend (EU region)

Compared Resend / Postmark / AWS SES across DSGVO posture, Supabase integration, Deno DX, German-TLD deliverability, and EU data residency.

- **Resend** wins on integration friction. EU region (`eu-west-1`) selectable per domain; AVV/DPA self-serve. Supabase Custom SMTP path: paste `smtp.resend.com:465` + API key into Dashboard → Auth → SMTP Settings. Edge Function send is a 2-line `fetch` against `https://api.resend.com/emails`. ~$20/mo Pro tier covers up to 50k emails/month.
- **Postmark** wins on pure deliverability to German web mail (web.de, gmx.net). US-processed though — DSGVO review noisier.
- **SES** wins on cost at scale (>50k/month) but loses on Deno DX (heavy SDK or hand-rolled SigV4) and warm-up complexity.

**Recommendation: Resend, EU region, sender `noreply@planning-matrix.app`** (after Q9 domain decision). Pre-buy the domain; configure SPF + 3 DKIM CNAMEs + DMARC `p=none` for two weeks → upgrade to `p=quarantine`.

### Membership-based RLS rewrite

Canonical pattern from Supabase 2025 docs + the team's "Multi-tenant SaaS" reference:

- Schema: `project_members(project_id, user_id, role, invited_at, accepted_at, invited_by)` with composite primary key `(project_id, user_id)`. Indexes on `(user_id)` and `(project_id, user_id)`.
- RLS performance — wrap `auth.uid()` in `(select auth.uid())` so Postgres treats it as `initPlan` and evaluates once per query. Use a `SECURITY DEFINER` helper function `is_project_member(pid)` that returns `boolean` — bypasses RLS recursion on `project_members` itself and lets the planner cache.
- `projects.owner_id` stays as a denormalised "creator" pointer. Backfilled into `project_members` once on migration. All future ACL goes through `project_members`.

### Invite flow — hybrid (Supabase's recommended pattern)

Combines our own `project_invites` table with Supabase's built-in `auth.admin.inviteUserByEmail`:

1. `create-invite` Edge Function (called by SPA) inserts a row into `project_invites` with a UUID token, then calls `supabase.auth.admin.inviteUserByEmail(email, { redirectTo: \`${SITE_URL}/invite/${token}\`, data: { project_id, role } })`. Supabase ships the magic-link email via our custom SMTP.
2. New user clicks → Supabase confirms email → redirects to `/invite/:token`.
3. SPA at that route awaits `supabase.auth.getSession()`, calls `accept-invite` Edge Function which re-checks the invitee email matches the JWT-bound user, inserts `project_members` row, marks `project_invites.accepted_at`, returns `project_id`.
4. SPA navigates to `/projects/:id` (the actual chat workspace).

**Why hybrid wins over pure self-signed-JWT:** we don't manage another secret; Supabase handles the auth round-trip; our token row is the audit trail.

### Constitutional Layer split

Inspecting `supabase/functions/chat-turn/systemPrompt.ts`:

| Section in current persona | Federal vs Bayern |
|---|---|
| FACHPERSONEN list | Both — domain mappings cite federal + Bayern statutes |
| GRUNDREGELN | Both — voice rules are universal |
| QUALIFIER-DISZIPLIN | Both |
| BEREICHE A · B · C | Both — but Bayern-specific examples cited |
| EMPFEHLUNGEN + TOP-3-DISZIPLIN | Both |
| TEMPLATE — T-01 NEUBAU EINFAMILIENHAUS BAYERN | **Bayern-only** — full BayBO Art-by-Art breakdown |
| ANTWORTFORMAT + DEDUPLIKATION | Both |

**Split strategy:**

```
supabase/functions/chat-turn/legalContext/
├── federal.md      ~ BauGB §§ 30/34/35, BauNVO, GEG framework, MBO concepts
├── bayern.md       ~ BayBO Art 2/6/47/57/58/59/61/44a, BayDSchG,
│                     BayNatSchG, GaStellV, kommunale Stellplatzsatzung,
│                     T-01 example bundle
└── _shared.md      ~ persona / grundregeln / qualifier / areas / empfehlungen /
                      antwortformat — i.e. everything that's locale-agnostic
```

`buildSystemBlocks` composes `_shared.md` + `federal.md` + `<bundesland>.md` + the live state block. Cache marker stays on the composed federal+bundesland slice — same cache hit semantics.

---

## 2 · Architecture overview

```
┌────────────────────────────────────────────────────────────────────────┐
│  Supabase Postgres                                                      │
│                                                                         │
│  + project_members (project_id, user_id, role, accepted_at, invited_by)│
│  + project_invites (token, project_id, email, role, expires_at,        │
│                     accepted_at, invited_by)                            │
│  ✱ projects.owner_id stays (denormalised creator pointer)              │
│  ✱ messages.role enum gains 'system_member_added' visibility           │
│                                                                         │
│  RLS rewrite — projects / messages / project_events / project_members  │
│  / project_invites all gate via is_project_member(pid) SECURITY        │
│  DEFINER helper function. Owner-only operations (delete project,       │
│  invite users) gate via a stricter is_project_owner() helper.          │
└────────────────────────────────────────────────────────────────────────┘
              ▲                                          ▲
              │                                          │
   ┌──────────┴───────────┐                   ┌──────────┴───────────┐
   │  chat-turn (UPDATED) │                   │  create-invite (NEW) │
   │  + reads caller's    │                   │  + insert            │
   │    role from         │                   │    project_invites   │
   │    project_members   │                   │  + auth.admin        │
   │  + system prompt     │                   │      .inviteUserBy   │
   │    composes          │                   │      Email(...)      │
   │    legalContext/     │                   │                      │
   │    federal +         │                   ├──────────────────────┤
   │    <bundesland>      │                   │  accept-invite (NEW) │
   │  + ROLLEN-AWARENESS  │                   │  + verify token      │
   │    clause            │                   │  + insert            │
   │  + verify-fact RPC   │                   │    project_members   │
   │    triggered by      │                   │  + mark              │
   │    DESIGNER click    │                   │    accepted_at       │
   └──────────────────────┘                   └──────────────────────┘
              ▲                                          ▲
              │                                          │
              │            ┌───────────────────┐         │
              └────────────┤  React SPA        ├─────────┘
                           │                   │
                           │  + /projects/:id  │ ← chat workspace gains
                           │    /invite modal  │   inline Verify buttons
                           │  + /invite/:token │   for DESIGNER role
                           │  + dashboard list │ ← scope by membership
                           │    by membership  │
                           │  + role chip in   │
                           │    top bar        │
                           │  + Workshop notes │
                           │    rail section   │
                           │  + Gate 99 tab on │
                           │    overview       │
                           └───────────────────┘
```

---

## 3 · Database schema

### Migration 0005 — `project_members` + `project_invites` + RLS rewrite

```sql
-- 0005_designer_role.sql
-- Apply via Supabase SQL Editor.

-- ─── project_members ──────────────────────────────────────────────────
create table public.project_members (
  project_id   uuid not null references public.projects(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  role         text not null check (role in ('client','designer','engineer','authority')),
  invited_at   timestamptz not null default now(),
  accepted_at  timestamptz,
  invited_by   uuid references auth.users(id),
  primary key (project_id, user_id)
);

create index project_members_user_idx on public.project_members(user_id);

-- ─── project_invites ──────────────────────────────────────────────────
create table public.project_invites (
  token        uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects(id) on delete cascade,
  email        citext not null,
  role         text not null check (role in ('designer','engineer','authority')),
  invited_by   uuid not null references auth.users(id),
  expires_at   timestamptz not null default (now() + interval '7 days'),  -- Q12
  accepted_at  timestamptz,
  created_at   timestamptz not null default now()
);

create index project_invites_email_idx on public.project_invites(email);
create unique index project_invites_active_idx
  on public.project_invites(project_id, email)
  where accepted_at is null;

-- ─── Backfill: every existing project gets one project_members row ───
insert into public.project_members (project_id, user_id, role, accepted_at, invited_by)
select id, owner_id, 'client', now(), owner_id from public.projects
on conflict do nothing;

-- ─── SECURITY DEFINER helpers ─────────────────────────────────────────
create or replace function public.is_project_member(pid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.project_members
    where project_id = pid
      and user_id = (select auth.uid())
      and accepted_at is not null
  );
$$;

create or replace function public.is_project_owner(pid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.projects p
    where p.id = pid
      and p.owner_id = (select auth.uid())
  );
$$;

revoke all on function public.is_project_member(uuid) from public;
revoke all on function public.is_project_owner(uuid) from public;
grant execute on function public.is_project_member(uuid) to authenticated;
grant execute on function public.is_project_owner(uuid) to authenticated;

-- ─── RLS rewrite ──────────────────────────────────────────────────────
-- Drop old owner-only policies and replace with membership-based ones.

drop policy if exists "owner can select projects" on public.projects;
drop policy if exists "owner can insert projects" on public.projects;
drop policy if exists "owner can update projects" on public.projects;
drop policy if exists "owner can delete projects" on public.projects;

create policy "members read projects"
  on public.projects for select using (is_project_member(id));
create policy "owners insert projects"
  on public.projects for insert with check (auth.uid() = owner_id);
create policy "members update projects"
  on public.projects for update using (is_project_member(id));
create policy "owners delete projects"
  on public.projects for delete using (is_project_owner(id));

drop policy if exists "owner can select messages" on public.messages;
drop policy if exists "owner can insert messages" on public.messages;

create policy "members read messages"
  on public.messages for select using (is_project_member(project_id));
create policy "members insert messages"
  on public.messages for insert with check (is_project_member(project_id));

drop policy if exists "owner can select events" on public.project_events;
drop policy if exists "owner can insert events" on public.project_events;

create policy "members read events"
  on public.project_events for select using (is_project_member(project_id));
create policy "members insert events"
  on public.project_events for insert with check (is_project_member(project_id));

-- project_members RLS — members can see their own membership row,
-- owners can see/manage all rows for their project.
alter table public.project_members enable row level security;

create policy "self read membership"
  on public.project_members for select
  using (user_id = (select auth.uid()) or is_project_owner(project_id));

create policy "owner insert membership"
  on public.project_members for insert
  with check (is_project_owner(project_id));

create policy "owner delete membership"
  on public.project_members for delete
  using (is_project_owner(project_id));

-- project_invites RLS — owners read/write their project's invites;
-- invitees can't query (the invite is delivered via email).
alter table public.project_invites enable row level security;

create policy "owner read invites"
  on public.project_invites for select
  using (is_project_owner(project_id));

create policy "owner insert invites"
  on public.project_invites for insert
  with check (is_project_owner(project_id));

create policy "owner update invites"
  on public.project_invites for update
  using (is_project_owner(project_id));

-- citext extension (case-insensitive email matching).
create extension if not exists citext;
```

### Migration 0006 — `Quality.REJECTED` (Q14, if confirmed)

If Q14 confirmed: extend the application-layer `Quality` enum in `projectState.ts` to include `'REJECTED'`. No SQL change — the JSONB field doesn't enforce shape. The Edge Function tool schema gets the new enum value too.

### Migration 0007 — `messages.role = 'system_member_added'` (Q11)

If Q11 keeps "full history visible," we still want to mark in-thread when a DESIGNER joins. New event type `member_added` in `project_events` + a synthetic system message rendered client-side at the join point (matches the existing Sonstiges SYSTEM row pattern). No schema change needed.

---

## 4 · Edge Function changes

### `chat-turn` — role-aware

- On request, read the calling user's role from `project_members` for the active project. Reject (403) if no membership row.
- Pass `caller.role` into `buildSystemBlocks` so the assembled prompt includes a `ROLLEN-AWARENESS` clause (see §7).
- Compose system prompt via `legalContext/_shared.md` + `legalContext/federal.md` + `legalContext/<bundesland>.md`. Cache marker stays after federal+bundesland; live state block uncached as today.

### `create-invite` (NEW)

- Method: POST. Auth-gated.
- Body: `{ projectId: uuid, email: string, role: 'designer' | 'engineer' | 'authority', message?: string }`.
- Verifies caller is project owner via `is_project_owner` helper.
- Inserts `project_invites` row with `gen_random_uuid()` token.
- Calls `supabase.auth.admin.inviteUserByEmail(email, { redirectTo: \`${SITE_URL}/invite/${token}\`, data: { project_id, role } })` — Supabase delivers the magic-link via our custom SMTP.
- Response: `{ ok: true, token }` (token is the row PK; SPA uses it for "resend" / "revoke" UI later).

### `accept-invite` (NEW)

- Method: POST. Auth-gated.
- Body: `{ token: uuid }`.
- Loads invite row by token. Returns 404 if not found or `accepted_at IS NOT NULL` or `expires_at < now()`.
- Verifies invitee email matches `auth.user().email` (case-insensitive via citext). Reject 403 if mismatch.
- Inserts `project_members` row with `accepted_at = now()`. Marks `project_invites.accepted_at = now()`.
- Inserts `project_events` row `event_type='member_added'`.
- Response: `{ ok: true, projectId }` so SPA can `navigate(\`/projects/${projectId}\`)`.

### `verify-fact` RPC (NEW — RPC, not Edge Function)

Implemented as a Postgres function for atomicity, called via `supabase.rpc('verify_fact', { ... })`:

```sql
create or replace function public.verify_fact(
  p_project_id uuid,
  p_kind text,           -- 'fact' | 'procedure' | 'document' | 'role'
  p_item_key text,       -- key for facts; id for the others
  p_promote_to text      -- 'VERIFIED' | 'REJECTED'
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_state jsonb;
  v_role text;
begin
  -- Verify caller is a designer/engineer/authority on this project.
  select role into v_role from project_members
   where project_id = p_project_id and user_id = (select auth.uid())
     and accepted_at is not null;
  if v_role not in ('designer','engineer','authority') then
    raise exception 'forbidden';
  end if;

  -- ... mutate state (fact / procedure / etc.) qualifier to v_role/promotion
  -- ... insert project_events row
end;
$$;
```

Architectural note: this could equally live in `chat-turn` — but RPC is cleaner because verifying isn't a model-mediated turn. The user clicks a button; the qualifier flips; no Anthropic call. RPC keeps it cheap and atomic.

---

## 5 · SPA changes

### New routes

- `/projects/:id/invite` — modal-style overlay over the chat workspace. Bauherr enters architect's email + optional message; on submit, calls `create-invite` Edge Function, shows success/error.
- `/invite/:token` — public route that runs the accept-invite flow. Renders calm intermediate state ("Wir prüfen Ihre Einladung…") while exchanging.

### Chat workspace additions

For users with `role: 'designer'` on this project (read from `project_members` via a new `useProjectMember(projectId)` hook):

- **Inline Verify chevrons.** Every Fact in Eckdaten, every Procedure / Document / Role in their respective rail panels, gets a tiny ink chevron icon (`›`) on hover. Click → opens an inline action menu: `✓ Verifizieren · ✗ Ablehnen · Hinweis hinzufügen`. Verifying calls the `verify_fact` RPC; promotes qualifier from `*/ASSUMED` or `*/CALCULATED` → `DESIGNER/VERIFIED`.
- **Workshop notes** — new collapsible section in the right rail below `Fachplaner`. DESIGNER edits, CLIENT reads. Plain-text textarea (Q15). Auto-save on blur. Inline timestamp `Zuletzt bearbeitet vor 3 Minuten · M. Müller`.
- **Role chip** in the top bar near the project name: `Bauherr` (CLIENT), `Architekt:in` (DESIGNER), `Tragwerksplaner:in` (ENGINEER), `Behörde` (AUTHORITY). Inter 11 tracking-`[0.16em]` uppercase clay, hairline-bordered.

### Visual treatment for verification qualifier

- Card / row qualifier badge for `DESIGNER/VERIFIED` gets a custom hairline ink filled-checkmark glyph drawn in CSS (NOT a `lucide-react` icon — we keep our restraint). Inter 9 italic clay → Inter 9 ink for VERIFIED, prefixed by the glyph. Other qualifiers stay text-only.
- Top-3 cards lose the *Vorläufig — bestätigt durch eine/n bauvorlageberechtigte/n Architekt/in.* footer when their qualifier flips to `DESIGNER/VERIFIED` and gain *Bestätigt durch [Architektenname], am [Datum].*

### Dashboard

- Project list scope is now membership-based (was owner-based). A user sees every project where they have an accepted `project_members` row.
- Each row shows the user's role on that project as a small chip — `Bauherr` / `Architekt:in` etc.

### Gate 99 tab on overview

For DESIGNER role, `/projects/:id/overview` gains a `Gate 99` tab next to the existing sections. Renders a complete checklist view: every Fact, Procedure, Document, Role with current qualifier, every Verify action timestamp + verifier name. Print-stylesheet for export.

### useProjectMember hook

```ts
useProjectMember(projectId) → { role: 'client' | 'designer' | … | null, isLoading }
```

Reads `project_members` for the active user + project. RLS scopes to self automatically.

---

## 6 · Email templates (DE drafts)

Two new templates ship via Supabase's email-template system, plus we wire our existing Phase 2 templates through the new SMTP transport.

### Invite email (NEW)

**Subject (DE):**

```
{{ if eq .Data.locale "de" }}{{ .Data.inviter_full_name }} lädt Sie zur Mitarbeit am Projekt „{{ .Data.project_name }}" ein{{ else }}{{ .Data.inviter_full_name }} invites you to collaborate on the project "{{ .Data.project_name }}"{{ end }}
```

**Body (DE excerpt — use the inline-CSS HTML pattern from `SUPABASE_SETUP.md` Step 5):**

```html
{{ if eq .Data.locale "de" }}
<!-- Header / wordmark -->
<p>Guten Tag,</p>
<p>{{ .Data.inviter_full_name }} hat Sie als {{ .Data.role_label_de }} zum Projekt
   <strong>{{ .Data.project_name }}</strong> auf Planning Matrix eingeladen.</p>
{{ if .Data.invitation_message }}
<blockquote style="border-left: 2px solid #7a5232; padding-left: 12px; color: #5a5e6b;">
  {{ .Data.invitation_message }}
</blockquote>
{{ end }}
<p>Über den folgenden Link gelangen Sie zum Projekt — ggf. werden Sie zur einmaligen
   Registrierung gebeten:</p>
<a href="{{ .ConfirmationURL }}" style="…">Einladung annehmen</a>
<p style="font-size: 13px; color: #5a5e6b;">
  Der Link ist 7 Tage gültig. Wenn Sie diese Einladung nicht erwartet haben,
  können Sie diese E-Mail ignorieren.
</p>
{{ else }}
<!-- EN mirror — same shape, English copy -->
{{ end }}
```

`role_label_de` resolves at send time:
- `designer` → `Architekt:in`
- `engineer` → `Tragwerksplaner:in`
- `authority` → `Vertretung der Genehmigungsbehörde`

### Confirm signup, Reset password — re-paste existing DE/EN templates from `SUPABASE_SETUP.md` Step 5 so they ship via Resend instead of Supabase's default sender. No copy changes.

---

## 7 · `ROLLEN-AWARENESS` system-prompt clause (DE draft)

Goes in `legalContext/_shared.md` in the `ANTWORTFORMAT` section. Composed into every `chat-turn` request after the live-state block tells the model the caller's role.

```
══════════════════════════════════════════════════════════════════════════
ROLLEN-AWARENESS
══════════════════════════════════════════════════════════════════════════

Im PROJEKTKONTEXT erfahren Sie, in welcher Rolle der oder die aktuelle
Sprechende mit dem Team interagiert:

  • CLIENT     — Bauherr:in. Standardregister wie bisher (formelles Sie,
                 keine Insider-Kürzel, geduldig erklärend).

  • DESIGNER   — Architekt:in mit Bauvorlageberechtigung nach Art. 61 BayBO.
                 Sie können fachsprachlich antworten, Aktenzeichen und
                 GFZ/GRZ ohne Erklärung verwenden, und voraussetzen, dass
                 die Person die BauNVO-Gebietstypen kennt. Wenn der oder die
                 Architekt:in eine Annahme verifiziert, qualifizieren Sie
                 nachfolgende Aussagen offen mit „verifiziert durch
                 Architekt:in [Name]".

  • ENGINEER   — Fachplaner:in (Tragwerk, Brandschutz, Energie, Vermessung).
                 Domänenspezifisch antworten; an deren Fachsprache
                 anknüpfen.

  • AUTHORITY  — Bauamt-Vertretung. Formell, prozedural, keine
                 Marketing-Sprache. Anfragen ggf. an die zuständige
                 Architekt:in zurückspiegeln.

Wenn die Rolle nicht eindeutig im Kontext steht, gehen Sie von CLIENT aus.

Sie wechseln die Anrede, NICHT den Inhalt — fachliche Aussagen bleiben
identisch zwischen den Rollen, die rechtliche Architektur Ihrer Antwort
ändert sich nicht. Die DESIGNER-Rolle ist die einzige, die Empfehlungen
formell freigeben darf — auch wenn ein/e ENGINEER eine Zahl bestätigt,
wird sie in der Top-3 erst dann „verifiziert", wenn die DESIGNER-Rolle
bestätigt.
```

---

## 8 · Multi-Bundesland scaffolding (per Q2 default — Bayern only lit)

Even with Q2 confirming Bayern-only, we ship the architecture so adding NRW becomes a 1-file PR + manager's legal review.

**`supabase/functions/chat-turn/legalContext/`**

```
_shared.md      — persona / grundregeln / qualifier / areas / empfehlungen /
                  antwortformat (locale-agnostic — current text minus
                  Bayern-specific content)
federal.md      — BauGB §§ 30/34/35, BauNVO Gebietstypen, GEG framework,
                  MBO concepts (apply everywhere)
bayern.md       — BayBO Art-by-Art breakdown, BayDSchG, BayNatSchG,
                  GaStellV, kommunale Stellplatzsatzung note,
                  T-01 Einfamilienhaus example bundle
nrw.md          — placeholder file with `// TODO(phase-5)` — exists in
                  the tree so adding NRW is just filling this in
```

**`buildSystemBlocks(locale, liveState)`:**

```ts
const persona = sharedMd + federalMd + legalContextFor(bundesland)
return [
  { type: 'text', text: persona, cache_control: { type: 'ephemeral' } },
  { type: 'text', text: liveState },
]
```

Cache hit semantics unchanged — composed prefix is identical for every Bayern project.

**Wizard:**

- Detect Bundesland from plot postcode if available (`91054` → Bayern, `40213` → NRW, etc.). Use `de-de-postal-codes` heuristic (`8XXXX`/`9XXXX` → Bayern; `4XXXX`/`5XXXX` → NRW).
- For projects without plot, default to Bayern with a SYSTEM message.
- NRW Bundesland chip in the wizard rendered **disabled with tooltip "Folgt in Phase 5"**. Visible but inert.

---

## 9 · B-Plan slide-over UX (per Q3 default — stay simulated)

Two surface additions:

**For CLIENT:** when the model proposes a `LEGAL/ASSUMED` B-Plan-related fact, the chat thread renders an inline `Wie verifiziere ich das?` link below the assistant message. Click → opens a slide-over from the right edge with:

- Plain-language explanation: "Den vollständigen Bebauungsplan erhalten Sie beim Bauamt der Gemeinde, in der Ihr Grundstück liegt."
- Per-municipality entry for Bayern: Erlangen, München, Nürnberg, Augsburg with online portal URL + opening hours + a phone-call-script template.
- "Wir markieren die zugehörigen Annahmen als verifiziert, sobald Ihre Architekt:in den Plan geprüft hat."

**For DESIGNER:** the verify-fact menu on B-Plan-derived assumptions gains an extra option: `B-Plan abgleichen → Aktenzeichen eingeben`. Architect pastes the B-Plan reference (e.g. `B-Plan Nr. 542 'Östliches Stadtgebiet'`), optionally uploads a PDF (deferred to Phase 5; v2 just stores the reference text). The reference appears in the qualifier's `evidence` field. Verify promotes the qualifier with this extra context.

**`docs/phase4-bplan-strategy.md`** documents the deferred decisions (real API integration, partnerships with Rulemapping Group / Geoportal Bayern / commercial providers, cost models) so when a buyer asks "but how do you actually integrate with the Bauamt?" we have a written stance.

---

## 10 · Six-batch commit sequence

Each batch ends with a live test on the deployed preview. Batch reports include the same proof bar as Phase 3.

### Batch 1 — Foundations and infrastructure

1. `chore(infra): pre-register planning-matrix.app domain + DNS records` — Rutik task, but the docs land here
2. `feat(infra): custom SMTP via Resend (EU region) + drop autoconfirm trigger`
3. `feat(db): project_members + project_invites tables, RLS rewrite, SECURITY DEFINER helpers (migration 0005)`
4. `feat(types): ProjectMember, ProjectInvite, MemberRole — across @/types/db.ts`
5. `feat(edge): chat-turn reads caller role from project_members; gates non-member 403`
6. `feat(spa): useProjectMember hook + role chip in top bar`
7. `chore(docs): re-paste existing DE/EN email templates through new SMTP transport`

### Batch 2 — Invite flow + DESIGNER signup

1. `feat(edge): create-invite Edge Function (auth.admin.inviteUserByEmail with redirectTo)`
2. `feat(edge): accept-invite Edge Function (token validate + members insert + audit event)`
3. `feat(spa): /projects/:id/invite modal — Bauherr enters architect email`
4. `feat(spa): /invite/:token public route — accept flow + redirect to /projects/:id`
5. `feat(spa): RequireAuth ferries ?next= through signup so invitees land on the project`
6. `feat(spa): dashboard project list scope changes from owner_id to membership; role chip per row`
7. `feat(i18n): invite-flow DE + EN locale strings (chat.invite.*, chat.member.*)`

### Batch 3 — DESIGNER cockpit primary surface

1. `feat(db): verify_fact RPC + Quality REJECTED enum (per Q14)`
2. `feat(spa): inline Verify chevrons on facts/procedures/documents/roles`
3. `feat(spa): qualifier badge gets ink-checkmark glyph for DESIGNER/VERIFIED`
4. `feat(spa): Top-3 footer swap on verified — Vorläufig… → Bestätigt durch [Name]…`
5. `feat(spa): Workshop notes right-rail section (DESIGNER edit, CLIENT read)`
6. `feat(edge): chat-turn ROLLEN-AWARENESS system-prompt clause`
7. `feat(spa): system-message rendered at architect's join point (Q11)`

### Batch 4 — Gate 99 + B-Plan slide-over UX

1. `feat(spa): Gate 99 tab on /projects/:id/overview for DESIGNER role`
2. `feat(spa): B-Plan slide-over for CLIENT — Wie verifiziere ich das? + per-municipality guide`
3. `feat(spa): DESIGNER's B-Plan abgleichen verify variant — paste reference, store evidence`
4. `chore(docs): phase4-bplan-strategy.md`
5. `feat(i18n): Gate 99 + B-Plan EN parity sweep`

### Batch 5 — Multi-Bundesland scaffolding (Bayern only lit)

1. `refactor(edge): split systemPrompt.ts into legalContext/ (_shared, federal, bayern, nrw stub)`
2. `feat(edge): buildSystemBlocks composes federal + bundesland slice`
3. `feat(wizard): postcode → Bundesland inference; default Bayern; NRW chip disabled with tooltip`
4. `feat(types): bundesland enum widened to include NRW (still rejected at runtime)`
5. `chore(docs): Phase 5 NRW expansion runbook`

### Batch 6 — Hardening and polish

1. `perf(edge): streaming evaluation — A/B against current non-streaming path; ship if measurably better perceived latency`
2. `perf(edge): Sonnet 4.6 evaluation against ~50 real transcripts; ship if measurably better quality/latency`
3. `feat(spa): pause/network-loss banner escalation completed`
4. `feat(spa): thinking_label_de architectural cleanup completed (Phase 3.1 carry-over)`
5. `chore(i18n): Phase 4 EN parity sweep`
6. `chore(docs): move PHASE_4_PLAN.md → docs/phase4-plan.md, create phase4-decisions.md (Q1–Q16), update README`

---

## 11 · Live test plan per batch

Same proof bar as Phase 3:

- **Batch 1**: signup + reset-password emails arrive via Resend; verify SPF/DKIM pass on `mail-tester.com`; chat-turn 403s for non-members.
- **Batch 2**: full Bauherr-invites-architect flow on the live preview. Bauherr sends invite → architect (different account / browser) clicks email link → signs up → lands on the project. Capture screenshot of architect's first-render of the chat workspace.
- **Batch 3**: architect verifies 3+ items; qualifier badges flip; Top-3 footer changes; workshop notes round-trip survives refresh; ROLLEN-AWARENESS system-prompt clause causes the model to use technical register for DESIGNER.
- **Batch 4**: Gate 99 tab renders the audit trail; B-Plan slide-over opens from a real assistant message; DESIGNER's B-Plan abgleichen flow records evidence text.
- **Batch 5**: postcode `91054` → Bayern path works as today; postcode `40213` (Düsseldorf NRW) routes via NRW chip → disabled with tooltip.
- **Batch 6**: streaming perceived latency captured (if shipped); Sonnet 4.6 A/B captured.

Each batch report follows the same shape as Phase 3 batch reports.

---

## 12 · File / folder additions

```
supabase/migrations/
├── 0005_designer_role.sql                  (Batch 1)
└── 0006_quality_rejected.sql               (Batch 3, only if Q14 confirmed)

supabase/functions/
├── chat-turn/                              (UPDATED — see §4)
│   ├── legalContext/                       (NEW — Batch 5)
│   │   ├── _shared.md
│   │   ├── federal.md
│   │   ├── bayern.md
│   │   └── nrw.md (placeholder)
│   ├── systemPrompt.ts                     (UPDATED to compose from legalContext/)
│   └── toolSchema.ts                       (UPDATED — Quality.REJECTED if Q14)
├── create-invite/                          (NEW — Batch 2)
│   ├── index.ts
│   ├── cors.ts
│   ├── deno.json
│   └── resend.ts                           (Resend HTTP client)
└── accept-invite/                          (NEW — Batch 2)
    ├── index.ts
    ├── cors.ts
    └── deno.json

src/features/chat/
├── components/
│   ├── InviteModal.tsx                     (NEW — Batch 2)
│   ├── RoleChip.tsx                        (NEW — Batch 1)
│   ├── VerifyMenu.tsx                      (NEW — Batch 3)
│   ├── WorkshopNotes.tsx                   (NEW — Batch 3)
│   ├── BPlanSlideOver.tsx                  (NEW — Batch 4)
│   └── Gate99Tab.tsx                       (NEW — Batch 4)
├── hooks/
│   ├── useProjectMember.ts                 (NEW — Batch 1)
│   └── useVerifyFact.ts                    (NEW — Batch 3)
└── pages/
    └── AcceptInvitePage.tsx                (NEW — Batch 2)

src/features/dashboard/
└── DashboardPage.tsx                       (Batch 2 — was DashboardPlaceholder; project list)

docs/
├── phase4-plan.md                          (Final commit — moved from PHASE_4_PLAN.md)
├── phase4-decisions.md                     (Final commit — Q1–Q16 record)
├── phase4-bplan-strategy.md                (Batch 4)
└── phase5-nrw-runbook.md                   (Batch 5 — sets up Phase 5 NRW expansion)
```

---

## 13 · What I will NOT do without confirmation

- Touch any production migration before Q1–Q16 are signed off.
- Buy `planning-matrix.app` (or any domain) — Rutik registers it after Q9 confirmation.
- Configure Resend / DNS records — that's Rutik's manual step, gated on Q8 + Q9.
- Modify Phase 1 / Phase 2 / Phase 3 surface area unless Phase 4 explicitly calls for it.
- Change the system prompt's existing Bayern legal grounding before the legalContext/ split (Batch 5) — risk of breaking active conversations.
- Add Stripe / pricing / paywall (gated on Q5).
- Add real B-Plan API integration (gated on Q3).
- Add ENGINEER or AUTHORITY full workflows (gated on Q6).

---

## 14 · Manager walkthrough — concrete asks

When you (Rutik) sit down with the manager:

1. **Walk them through Q1–Q7** verbatim. These are strategic; their answers shape weeks of work.
2. **Show them the Q8–Q16 list briefly** — these are tactical, but a few (Q9 domain, Q10 enum shape, Q14 unverify policy) have lock-in implications worth a five-minute discussion.
3. **Confirm the Phase 3.1 reactivation has already happened** (migration 0004 applied + chat-turn redeployed). If not, do that before Phase 4 starts.
4. **Confirm timeline** — 4–6 weeks for Phase 4 at the pace we ran Phase 3. Manager should know upfront.

Once Q1–Q16 are answered, paste the answers into a follow-up message to me. I will then update this PHASE_4_PLAN.md with the locked decisions and start Batch 1.

---

## 15 · Carry-overs from Phase 3.1 that block Phase 4

These need to land before Phase 4 Batch 1 makes sense:

- ✅ Migration 0004 applied (Phase 3.1 carry — Rutik to confirm in writing)
- ✅ chat-turn redeployed (Phase 3.1 carry)
- ☐ Custom SMTP shipped (Phase 4 Batch 1 itself)
- ☐ planning-matrix.app domain registered (Q9)
- ☐ Q1–Q16 manager-confirmed

— End of PHASE_4_PLAN.md.
