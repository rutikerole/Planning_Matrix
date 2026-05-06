-- ───────────────────────────────────────────────────────────────────────
-- 0020_event_log.sql
--
-- Phase 9.2 — first-party client event log.
--
-- Companion to logs.traces (Phase 9). Where logs.traces captures
-- server-side instrumentation of every Edge Function turn,
-- public.event_log captures client-side user interactions: wizard
-- choices, chat affordance clicks, result page tab navigation,
-- frontend errors bridged from Sentry, etc.
--
-- Two-table model (not one):
--   * logs.traces — server-side, admin-only RLS, joined to user
--     turns via client_request_id.
--   * public.event_log — client-side, user-and-admin RLS, joined
--     back to logs.traces via the optional trace_id column.
--
-- Why client_log is in `public` not `logs`:
--   * Users have a legitimate "give me my own data" expectation
--     (DSGVO Art 15 subject access). Owner-readable RLS satisfies
--     that today without an export feature.
--   * The Phase 9.1 inline drawer's Events tab will surface admin
--     reads via the same is_admin() gate as logs.* tables.
--
-- Privacy contract enforced by the client:
--   * Address strings → `length: N`, never the string itself.
--   * User-typed message bodies → length only.
--   * Geocoded coordinates → public spatial data, OK to store.
--   * Email addresses → user_id link only, never literal email.
--
-- Apply path: Supabase Dashboard → SQL Editor → paste → Run.
-- Idempotent.
-- ───────────────────────────────────────────────────────────────────────

create table if not exists public.event_log (
  event_id    uuid primary key default gen_random_uuid(),

  -- Per-tab session id (sessionStorage on the client). New tab =
  -- new session. Useful for "how many distinct sessions did this
  -- user have today" without persistent cross-tab tracking.
  session_id  uuid not null,

  -- Nullable because anonymous users on the landing page emit
  -- before sign-in (e.g. landing.viewed).
  user_id     uuid references auth.users(id) on delete set null,

  -- Nullable because wizard events fire BEFORE the project row
  -- exists. Once the project is created, subsequent emits attach
  -- the project_id.
  project_id  uuid references public.projects(id) on delete cascade,

  source      text not null check (source in (
    'wizard', 'chat', 'result', 'auth', 'dashboard', 'sentry', 'system'
  )),
  name        text not null,
  attributes  jsonb not null default '{}'::jsonb,

  -- Two clocks: trust client_ts loosely (clock skew, time travel),
  -- trust server_ts always.
  client_ts   timestamptz not null,
  server_ts   timestamptz not null default now(),

  -- Lightweight client context. Useful for "user reported issue on
  -- Safari mobile" → filter by user_agent + viewport.
  user_agent  text,
  viewport_w  int,
  viewport_h  int,
  url_path    text,

  -- Phase 9 correlation. When chat.message_received fires, it
  -- carries the trace_id from the streaming response so the admin
  -- drawer can join client events to server traces.
  trace_id    uuid references logs.traces(trace_id) on delete set null,

  created_at  timestamptz not null default now()
);

create index if not exists event_log_project_idx on public.event_log (project_id, server_ts desc);
create index if not exists event_log_user_idx    on public.event_log (user_id, server_ts desc);
create index if not exists event_log_session_idx on public.event_log (session_id, server_ts);
create index if not exists event_log_name_idx    on public.event_log (name, server_ts desc);
create index if not exists event_log_trace_idx   on public.event_log (trace_id) where trace_id is not null;
create index if not exists event_log_server_ts_idx on public.event_log (server_ts desc);

alter table public.event_log enable row level security;

-- Anyone authenticated can insert their own events. Anonymous
-- inserts allowed (user_id = null) so the landing page can emit
-- before sign-in. The user_id check guards against signed-in
-- users impersonating each other.
drop policy if exists "user inserts own events" on public.event_log;
create policy "user inserts own events"
  on public.event_log for insert
  with check (
    user_id is null
    or user_id = auth.uid()
  );

-- Users read their own events (DSGVO Art 15 friendly).
drop policy if exists "user reads own events" on public.event_log;
create policy "user reads own events"
  on public.event_log for select
  using (user_id = auth.uid());

-- Admins read every event regardless of user_id. Same gate as
-- logs.traces (logs.is_admin() — Phase 9 commit 2, updated in 0018
-- + 0019 to support the admin_users table + public.is_admin_check).
drop policy if exists "admin reads all events" on public.event_log;
create policy "admin reads all events"
  on public.event_log for select
  using (logs.is_admin());

grant select, insert on public.event_log to authenticated, anon;

-- ───────────────────────────────────────────────────────────────────────
-- Retention helper. Same 90-day window as logs.traces. Run manually
-- via SQL Editor or schedule via pg_cron when enabled:
--   select cron.schedule('event-log-prune', '0 4 * * *',
--     $$ select public.event_log_prune(); $$);
-- ───────────────────────────────────────────────────────────────────────
create or replace function public.event_log_prune() returns int
language sql
security definer
set search_path = public, pg_temp
as $$
  with deleted as (
    delete from public.event_log
     where server_ts < now() - interval '90 days'
     returning event_id
  )
  select count(*)::int from deleted;
$$;

grant execute on function public.event_log_prune() to service_role;

-- ───────────────────────────────────────────────────────────────────────
-- Verification:
--   1. As an authed user, INSERT one row:
--        insert into public.event_log
--          (session_id, user_id, source, name, client_ts, attributes)
--        values
--          (gen_random_uuid(), auth.uid(), 'system', 'test.ping',
--           now(), '{"hello": "world"}'::jsonb);
--      → expect success.
--
--   2. SELECT — should return only your own rows (or all if admin):
--        select count(*) from public.event_log;
--
--   3. Prune is a no-op on a fresh DB:
--        select public.event_log_prune();   -- expect 0
-- ───────────────────────────────────────────────────────────────────────
