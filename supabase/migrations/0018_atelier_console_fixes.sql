-- ───────────────────────────────────────────────────────────────────────
-- 0018_atelier_console_fixes.sql
--
-- Phase 9 — pre-deploy audit hot-fixes.
--
-- The audit (docs/PHASE_9_AUDIT.md) found three deploy blockers:
--
--   1. The Atelier Console reads public.projects / public.messages /
--      public.project_events from the admin frontend, but those tables
--      have owner-only RLS (added in 0003). Result: an admin can only
--      see their own projects and their own audit rows — the whole
--      "console shows everyone's traces" promise is broken.
--      Fix: admin-bypass select policies on each table, gated by
--      logs.is_admin().
--
--   2. The original logs.is_admin() (in 0015) reads a Postgres GUC,
--      `app.admin_emails`, set via ALTER DATABASE postgres SET ...
--      Supabase Cloud restricts that statement on the supabase_admin
--      role's catalog, so the GUC may silently never apply. Without
--      it, is_admin() always returns false → console renders 403
--      forever even with a "valid" admin email.
--      Fix: a public.admin_users table replaces the GUC. Adding/
--      removing admins is a single INSERT or DELETE, no DB-level
--      privileges required. The GUC path is kept as a fallback so
--      anyone who already configured it doesn't have to migrate.
--
--   3. project_events.trace_id needs a clearer relationship semantic
--      when traces age out (90-day retention). Adding ON DELETE SET
--      NULL via FK so audit rows survive trace pruning with the
--      pointer cleared instead of left dangling.
--
-- Apply path: same as the others. Idempotent.
-- ───────────────────────────────────────────────────────────────────────

-- ── 1. Admin allowlist table ────────────────────────────────────────────
create table if not exists public.admin_users (
  email      text primary key,
  added_at   timestamptz not null default now(),
  added_by   text
);

-- Only admins (or the service role) can read the table; nobody but
-- the service role can write to it. Manage via SQL Editor or the
-- Supabase Dashboard's authenticated-as-postgres view.
alter table public.admin_users enable row level security;

drop policy if exists "admins read admin_users"  on public.admin_users;
drop policy if exists "service writes admin_users" on public.admin_users;

-- (We can't reference logs.is_admin() inside its own dependency loop
-- safely — admins only need to know if they themselves are admin,
-- which logs.is_admin() answers without reading this table directly.
-- For now, restrict reads to service role.)
grant select on public.admin_users to service_role;
grant all    on public.admin_users to service_role;

-- ── 2. Replace is_admin() to read both the table AND the GUC ────────────
-- Either source is sufficient. The table is the recommended path on
-- Supabase Cloud; the GUC is the path for self-hosted setups where
-- ALTER DATABASE works.
create or replace function logs.is_admin() returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  with caller as (
    select email from auth.users where id = auth.uid()
  )
  select coalesce(
    -- table-driven allowlist (preferred)
    (select exists (
       select 1
         from public.admin_users a, caller c
        where a.email = c.email
    )),
    false
  ) or coalesce(
    -- GUC fallback (legacy / self-hosted)
    (select email from caller)
      = any(string_to_array(current_setting('app.admin_emails', true), ',')),
    false
  );
$$;

grant execute on function logs.is_admin() to authenticated, anon;

-- ── 3. Admin-bypass RLS for the three user-facing tables ────────────────
-- We add SELECT-only policies. Admins still cannot insert/update/
-- delete on any user-facing table — the chat-turn function writes
-- via the per-user RLS path, and admin "read everything" is a
-- separate concern from "write anything".

-- Projects
drop policy if exists "admins read all projects" on public.projects;
create policy "admins read all projects"
  on public.projects for select
  using (logs.is_admin());

-- Messages
drop policy if exists "admins read all messages" on public.messages;
create policy "admins read all messages"
  on public.messages for select
  using (logs.is_admin());

-- Project events (the audit log — admins join logs.traces against
-- this via the trace_id added in 0016).
drop policy if exists "admins read all events" on public.project_events;
create policy "admins read all events"
  on public.project_events for select
  using (logs.is_admin());

-- ── 4. project_events.trace_id FK with ON DELETE SET NULL ───────────────
-- 90-day retention deletes traces. Without an FK, the column would
-- silently keep dangling pointers. ON DELETE SET NULL is the right
-- semantic: the event row stays (audit-friendly), but the trace
-- pointer becomes null when the trace is pruned.
do $$
begin
  if not exists (
    select 1
      from pg_constraint
     where conname = 'project_events_trace_id_fkey'
       and conrelid = 'public.project_events'::regclass
  ) then
    alter table public.project_events
      add constraint project_events_trace_id_fkey
      foreign key (trace_id)
      references logs.traces(trace_id)
      on delete set null;
  end if;
end $$;

-- ───────────────────────────────────────────────────────────────────────
-- Verification queries:
--   1. Add yourself as admin:
--      insert into public.admin_users (email) values ('you@example.com');
--   2. Reconnect (or use a new SQL Editor query):
--      select logs.is_admin();   -- expect true
--   3. From the admin user's session, the SPA's
--      `select * from public.projects` should now return all rows,
--      not just your own.
-- ───────────────────────────────────────────────────────────────────────
