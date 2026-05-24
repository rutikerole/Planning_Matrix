# SCHEMA DRIFT RECONCILIATION — prod vs `main` migrations

**Repo:** `/Users/rutikerole/Planning_Matrix` · **HEAD:** `c374ef7` (branch `main`) · **Date:** 2026-05-24
**Trigger:** FULL_GERMANY_AUDIT.md Bug 39 — migration `0033_projects_state_version.sql` exists only on parked branch `feature/v1-0-6-race-fix`, never merged, yet the `state_version` column was reported live in prod. This doc closes the question empirically.
**Mode:** READ-ONLY. No schema mutated. Bayern SHA MATCH preserved.

## Method & its hard boundary

I have the PostgREST **service-role key** but **no direct Postgres connection string + DB password** — so I cannot query `information_schema`/`pg_catalog` directly. What I *can* read read-only:

- **Columns + types + defaults + nullability** for every exposed table, from the PostgREST **OpenAPI spec** (`GET /rest/v1/`) — works even for empty tables.
- **Targeted column-presence probes** (`?select=<col>&limit=0` → 200 present / 400 absent), with a deliberate bogus-column control.
- **Row counts** (`Prefer: count=exact`).

**What PostgREST CANNOT expose, and is therefore flagged UNVERIFIED here:** triggers and RLS policies. Those are reconstructed from `main`'s migrations and listed with the exact SQL to confirm them in the Supabase SQL Editor (§5). This is the honest boundary of the available creds — do not read this doc as a full `pg_dump` equivalent for triggers/policies.

---

## 1. LIVE PROD SCHEMA (columns, from OpenAPI + targeted probes)

Empirically dumped 2026-05-24 via the service-role OpenAPI spec. Format: `col: type|format|default|nullable[|PK/FK note]`.

### `projects` (14 columns)
```
id            uuid    default gen_random_uuid()  NOT NULL  PK
owner_id      uuid                               NOT NULL
intent        text                               NOT NULL
has_plot      boolean                            NOT NULL
plot_address  text                               nullable
bundesland    text    default 'bayern'           NOT NULL      ← no CHECK (Bug 40)
template_id   text                               NOT NULL
name          text                               NOT NULL
status        text    default 'in_progress'      NOT NULL
state         jsonb                              NOT NULL
created_at    timestamptz default now()          NOT NULL
updated_at    timestamptz default now()          NOT NULL
city          text    default 'muenchen'         nullable
state_version bigint  default 0                  NOT NULL      ← PROD-ONLY (see §3)
```
Targeted probes: `projects.state_version` → **200 (present)**; `projects.city` → 200; control `projects.bogus_control_col` → **400 (absent)**. The 200/400 split confirms `state_version` is a real live column, not a PostgREST artifact.

### `project_members` (9 columns, 0 rows)
```
id              uuid default gen_random_uuid() NOT NULL PK
project_id      uuid                           NOT NULL FK→projects.id
user_id         uuid                           nullable
role_in_project text                           NOT NULL
invite_token    uuid default gen_random_uuid() NOT NULL
invited_at      timestamptz default now()      NOT NULL
accepted_at     timestamptz                    nullable
created_at      timestamptz default now()      NOT NULL
expires_at      timestamptz default (now() + '7 days'::interval) nullable
```
Probes: `expires_at` → 200, `invite_token` → 200.

### `qualifier_transitions` (VIEW, 0 rows)
```
event_id, session_id, user_id, project_id(FK→projects.id), transition_kind,
attributes(jsonb), field_kind, item_id, attempted_source, attempted_quality,
enforced_source, enforced_quality, caller_role, reason, trace_id, client_ts, server_ts
```
All nullable (it is a view over `event_log`).

### `project_events` (9 columns, 210 rows)
```
id          uuid default gen_random_uuid() NOT NULL PK
project_id  uuid                           NOT NULL FK→projects.id
event_type  text                           NOT NULL
before_state jsonb                         nullable
after_state  jsonb                         nullable
reason      text                           nullable
triggered_by text                          NOT NULL
created_at  timestamptz default now()      NOT NULL
trace_id    uuid                           nullable      ← FK was dropped in 0022 (now soft pointer)
```
Probe: `trace_id` → 200.

### `project_files` (15 columns, 0 rows)
```
id, project_id(FK→projects.id), owner_id, file_name, file_type, file_size(bigint),
storage_path, storage_bucket(default 'project-files'), category(nullable),
uploaded_by_role(default 'client'), message_id(nullable, FK→messages.id),
document_id(nullable), status(default 'uploaded'), created_at, updated_at
```

### `project_share_tokens` (7 columns, 0 rows)
```
id, project_id(FK→projects.id), token, created_by, created_at,
expires_at(default now() + '30 days'::interval), revoked_at(nullable)
```
> Note: the FULL_GERMANY_AUDIT probe of a table named `share_tokens` returned 404 — that was a wrong-name artifact. The real table is `project_share_tokens` and is present and correctly shaped.

### Row counts (all 6)
`projects 51 · project_members 0 · qualifier_transitions 0 · project_events 210 · project_files 0 · project_share_tokens 0`.

---

## 2. EXPECTED SCHEMA FROM `main` (clean apply 0001 → 0032)

Reconstructed from `supabase/migrations/0001..0032` (FULL_GERMANY_AUDIT Band 10 catalog). For `projects`, a clean apply produces exactly **13 columns**: id, owner_id, intent, has_plot, plot_address, bundesland, template_id, name, status, state, created_at, updated_at (`0003`) + city (added `0009`, default flipped to `'muenchen'` in `0010`). **No `state_version`** — that column is introduced only by `0033`, which is not on `main`.

For the other 5 tables, `main`'s migrations produce column sets **identical** to the live prod dump above (project_members incl. `expires_at` from `0030`; project_events incl. `trace_id` from `0016` with the FK dropped by `0022`; qualifier_transitions view from `0027`/`0032`).

---

## 3. DIFF — prod vs main

### Columns
| Table | Prod-only (exists in prod, NOT produced by main 0001→0032) | Main-only (would be produced by main, MISSING in prod) |
|---|---|---|
| **projects** | **`state_version bigint NOT NULL default 0`** ← the single real drift | none |
| project_members | none | none |
| qualifier_transitions | none | none |
| project_events | none | none |
| project_files | none | none |
| project_share_tokens | none | none |

**Result: exactly ONE column-level drift across all six tables — `projects.state_version`, present in prod, absent from `main`.** This is the empirical confirmation of Bug 39: the 0033 column was applied to production but its source migration was never merged to `main`. A teammate rebuilding the DB from `main` today would produce a schema **missing `state_version`**.

### Triggers (UNVERIFIED via PostgREST — reasoned from migrations)
| Object | On `main`? | In prod? | Note |
|---|---|---|---|
| `set_updated_at` triggers (projects, project_files) | Yes (`0003:248`, `0007:118`) | assume yes (UNVERIFIED) | `updated_at` advances in observed rows → consistent with trigger live |
| `handle_new_user` / `_autoconfirm` (auth.users) | Yes (`0001`, `0002`) | assume yes (UNVERIFIED) | signups work |
| **`projects_bump_state_version` (BEFORE UPDATE → `bump_projects_state_version()`)** | **NO (branch-only, 0033)** | **UNVERIFIED — the critical unknown** | column is live; whether the trigger that increments it is live cannot be read via PostgREST |

**Empirical hint on the trigger:** in the non-Bayern forensics dump, observed `state_version` values are `0, 10, 7, 6, 5` across the 5 projects — i.e. **non-zero and varying with turn count**. A column defaulting to 0 that shows values up to 10 means **something is incrementing it** → strong (but not conclusive) evidence the `bump_projects_state_version` trigger **is** live in prod alongside the column. This raises, not lowers, the drift severity: prod has both the column *and* (apparently) the trigger from an unmerged migration. **Confirm with the SQL in §5 before relying on it.**

### RLS policies (UNVERIFIED via PostgREST)
All policies defined by `main`'s migrations (`0003` owner CRUD, `0018` admin-read, `0028`/`0031` architect-read with the recursion fix, `0026`/`0030` project_members, etc.) are assumed live because the app functions, but **cannot be enumerated through PostgREST**. No policy drift is *expected* (no policy migration is branch-only), but it is **unconfirmed**. SQL to confirm in §5.

---

## 4. THE RECONCILIATION MIGRATION TO AUTHOR

**Goal:** bring `main` and prod into sync **without re-applying anything destructive**. Since the column (and apparently the trigger) are already live, the reconciliation is additive + idempotent — its job is to make `main` reproduce what prod already has, and to *guarantee* the trigger exists.

**Action:** author `supabase/migrations/0033_projects_state_version.sql` on `main` by cherry-picking the existing parked file — branch `feature/v1-0-6-race-fix`, commit `95c8c30` (`git show feature/v1-0-6-race-fix:supabase/migrations/0033_projects_state_version.sql`). It is already written idempotently:

```sql
-- 1. column (no-op in prod — already present)
alter table public.projects
  add column if not exists state_version bigint not null default 0;

-- 2. increment function (CREATE OR REPLACE — safe to re-run)
create or replace function public.bump_projects_state_version() ...
  -- new.state_version := old.state_version + 1, only WHEN new.state IS DISTINCT FROM old.state

-- 3. trigger (DROP IF EXISTS + CREATE — guarantees presence)
drop trigger if exists projects_bump_state_version on public.projects;
create trigger projects_bump_state_version
  before update on public.projects
  for each row execute function public.bump_projects_state_version();
```

**Why this is non-destructive:**
- `add column if not exists` → no-op against the already-live prod column; adds it to a clean rebuild from `main`.
- `create or replace function` → safe to re-run.
- `drop trigger if exists ... create trigger` → idempotent; **this is the line that closes the dangerous unknown** — if prod has the column but *not* the trigger (so `state_version` silently never increments), running this once installs it; if the trigger is already there, it's harmlessly recreated.

**Commit to author (after this probe round):**
`feat(schema): merge parked 0033 state_version column+trigger to main (reconcile prod ghost deploy)` — one migration file, cherry-picked from `95c8c30`, plus a one-line note in the migration header that the column was already live in prod as of 2026-05-24 (forensic provenance).

**Sequencing caveat:** because `main` has the duplicate-prefix anomaly at `0004_*`/`0005_*` (Bug 41) and missing `0024/0025`, confirm the new file sorts last (it does — `0033` > `0032`) and that the manual SQL-Editor apply model (per `SUPABASE_SETUP.md`) is used, not `supabase db push` (which would choke on the duplicate prefixes). Do **not** attempt a CLI `db push` to apply this until Bug 41 is resolved.

---

## 5. SQL TO CLOSE THE UNVERIFIED GAPS (run in Supabase SQL Editor, read-only)

```sql
-- (a) Is the state_version trigger actually live? (the critical unknown)
select tgname, tgrelid::regclass as tbl, tgenabled
from pg_trigger
where not tgisinternal and tgrelid = 'public.projects'::regclass;
-- expect: projects_updated_at, projects_bump_state_version

select proname from pg_proc where proname = 'bump_projects_state_version';
-- expect: 1 row if the function is live

-- (b) Full column dump for the 6 tables (types, defaults, nullable)
select table_name, column_name, data_type, column_default, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name in ('projects','project_members','qualifier_transitions',
                     'project_events','project_files','project_share_tokens')
order by table_name, ordinal_position;

-- (c) RLS policy inventory (confirm no drift)
select schemaname, tablename, policyname, cmd, qual
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

-- (d) All non-internal triggers in public
select tgname, tgrelid::regclass as tbl
from pg_trigger where not tgisinternal
  and tgrelid::regclass::text like 'public.%' order by 2,1;
```

---

## 6. VERDICT

- **Column drift is confined to one column** — `projects.state_version` — present in prod, absent from `main` (Bug 39 confirmed empirically: 200 vs 400 probe, plus the column appears in every dumped row).
- **The `state_version` value is non-zero and varies** (0→10 across projects), which strongly suggests the `bump_projects_state_version` **trigger is also live in prod** — i.e. *both* the column and trigger from an unmerged migration are running in production. This is a governance hazard: a behavior exists in prod with **no source on `main`**.
- **No main-only columns are missing from prod** — a clean rebuild from `main` would be missing `state_version` (and its trigger), diverging from prod, but prod is not missing anything `main` defines.
- **Triggers and RLS policies could not be read via PostgREST** and are flagged UNVERIFIED; §5 gives the exact SQL to confirm them.
- **The fix is low-risk and already written:** cherry-pick the idempotent `0033` from `95c8c30` onto `main` and run it once in prod to guarantee the trigger. No destructive operation is required. **Do this before any v1.0.25 work that touches `projects` updates or optimistic locking**, since downstream code (verify-fact ↔ chat-turn race handling) is the reason `state_version` exists.

*Bayern SHA verified MATCH. No production code or schema modified by this probe.*
