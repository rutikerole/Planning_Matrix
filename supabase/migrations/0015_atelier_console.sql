-- ───────────────────────────────────────────────────────────────────────
-- 0015_atelier_console.sql
--
-- Phase 9 — observability foundation for the Atelier Console.
--
-- This migration creates a separate `logs` schema with three tables —
-- traces, spans, persona_snapshots — modelled on OpenTelemetry's
-- trace/span/event hierarchy adapted for a single Edge Function
-- context. It also creates `public.model_pricing` (token-cost rates)
-- and the retention helper `logs.prune_old()`.
--
-- The Edge Function writes via the service role and bypasses RLS.
-- All read access is gated by `logs.is_admin()` against the Postgres
-- setting `app.admin_emails` (comma-separated list, set per env via:
--   alter database postgres set app.admin_emails = 'a@b.com,c@d.com';
-- ). If the setting is unset, the function returns false and no row
-- is readable — friendly empty state, not a crash. See §8 case 10
-- in PHASE_9_FINDINGS.md.
--
-- Migration number bumped from the brief's 0014 because
-- 0014_fix_likely_user_replies_type.sql already exists in the repo.
--
-- Apply path: Supabase Dashboard → SQL Editor → New query → paste → Run.
-- After applying, set `app.admin_emails` (above) and re-deploy the
-- chat-turn function in commit 5.
--
-- Idempotent? Yes. `if not exists` and `on conflict do nothing` used
-- throughout. Safe to re-apply during development.
--
-- Rollback:
--   drop schema if exists logs cascade;
--   drop table if exists public.model_pricing;
-- (Drops all observability data — confirm before running in prod.)
-- ───────────────────────────────────────────────────────────────────────

create schema if not exists logs;

-- ── traces ──────────────────────────────────────────────────────────────
-- One row per Edge Function invocation. status='in_progress' rows that
-- exceed 60s are flipped to 'partial' by the reaper (migration 0017).
create table if not exists logs.traces (
  trace_id                       uuid primary key,
  project_id                     uuid references public.projects(id) on delete cascade,
  user_id                        uuid references auth.users(id) on delete set null,
  client_request_id              uuid,
  kind                           text not null
    check (kind in ('chat_turn_streaming', 'chat_turn_json', 'chat_turn_priming')),
  started_at                     timestamptz not null,
  ended_at                       timestamptz,
  duration_ms                    int,
  status                         text not null default 'in_progress'
    check (status in ('in_progress', 'ok', 'error', 'partial', 'idempotent_replay')),
  error_class                    text,
  error_message                  text,
  total_input_tokens             int default 0,
  total_output_tokens            int default 0,
  total_cache_read_tokens        int default 0,
  total_cache_creation_tokens    int default 0,
  total_cost_cents               int default 0,
  model                          text,
  function_version               text,
  region                         text,
  request_size_bytes             int,
  response_size_bytes            int,
  created_at                     timestamptz not null default now()
);

create index if not exists traces_project_idx on logs.traces (project_id, started_at desc);
create index if not exists traces_status_idx  on logs.traces (status, started_at desc);
create index if not exists traces_user_idx    on logs.traces (user_id, started_at desc);
create index if not exists traces_error_idx   on logs.traces (error_class, started_at desc)
  where error_class is not null;
create index if not exists traces_started_idx on logs.traces (started_at desc);

-- ── spans ───────────────────────────────────────────────────────────────
-- Many per trace. parent_span_id supports nested timing (e.g. an
-- anthropic.attempt_2 span as child of anthropic.call). attributes
-- is a structured key-value bag per OTel; events is an array of
-- inline mini-events that occurred during the span.
create table if not exists logs.spans (
  span_id          uuid primary key,
  trace_id         uuid not null references logs.traces(trace_id) on delete cascade,
  parent_span_id   uuid references logs.spans(span_id) on delete cascade,
  name             text not null,
  started_at       timestamptz not null,
  ended_at         timestamptz,
  duration_ms      int,
  status           text not null default 'ok'
    check (status in ('ok', 'error', 'cancelled')),
  attributes       jsonb not null default '{}'::jsonb,
  events           jsonb not null default '[]'::jsonb,
  created_at       timestamptz not null default now()
);

create index if not exists spans_trace_idx on logs.spans (trace_id, started_at);
create index if not exists spans_name_idx  on logs.spans (name, started_at desc);

-- ── persona_snapshots ───────────────────────────────────────────────────
-- The replay artifact. Captures exactly what the model saw and what
-- it returned, so any turn can be fully reconstructed. system_prompt_full
-- is sampled (1-in-50 on success, always on error) to cap row size;
-- the hash is always present so cache-hit analysis still works.
create table if not exists logs.persona_snapshots (
  snapshot_id                   uuid primary key,
  trace_id                      uuid not null references logs.traces(trace_id) on delete cascade,
  system_prompt_hash            text not null,
  system_prompt_full            text,
  state_block_full              text not null,
  messages_full                 jsonb not null,
  tool_use_response_raw         jsonb,
  tool_use_response_validated   jsonb,
  created_at                    timestamptz not null default now()
);

create index if not exists persona_snapshots_trace_idx on logs.persona_snapshots (trace_id);
create index if not exists persona_snapshots_hash_idx  on logs.persona_snapshots (system_prompt_hash);

-- ── model_pricing ───────────────────────────────────────────────────────
-- Per-million-tokens cost in cents. Cost is computed at trace-write
-- time and stored on the trace row, so historical cost is fixed.
-- Effective_from + composite primary key would let us version pricing,
-- but for v1 we keep one row per model and update via a new INSERT
-- with a different effective_from when ratios change. The cost calc
-- in the Edge Function reads the latest row for the model.
create table if not exists public.model_pricing (
  model                          text primary key,
  input_per_1m_cents             int not null,
  output_per_1m_cents            int not null,
  cache_read_per_1m_cents        int not null,
  cache_creation_per_1m_cents    int not null,
  effective_from                 timestamptz not null default now()
);

-- Seed: claude-sonnet-4-6 (current) + claude-sonnet-4-5 (rollback path).
-- Same per-token rates: $3 / $15 / $0.30 / $3.75 per million tokens.
insert into public.model_pricing
  (model, input_per_1m_cents, output_per_1m_cents, cache_read_per_1m_cents, cache_creation_per_1m_cents)
values
  ('claude-sonnet-4-6', 300, 1500, 30, 375),
  ('claude-sonnet-4-5', 300, 1500, 30, 375)
on conflict (model) do nothing;

-- ── is_admin() helper ───────────────────────────────────────────────────
-- security definer so it can read auth.users.email and current_setting
-- regardless of the caller's role. Fixed search_path prevents an
-- attacker from shadowing 'auth' or 'public' in their session.
create or replace function logs.is_admin() returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select coalesce(
    (
      select email
      from auth.users
      where id = auth.uid()
    ) = any(string_to_array(current_setting('app.admin_emails', true), ',')),
    false
  );
$$;

-- Grant execute so authenticated users can call it (the body itself
-- is the gate — non-admin gets `false`, anon gets `false` because
-- auth.uid() returns null).
grant execute on function logs.is_admin() to authenticated, anon;

-- ── RLS ─────────────────────────────────────────────────────────────────
alter table logs.traces            enable row level security;
alter table logs.spans             enable row level security;
alter table logs.persona_snapshots enable row level security;
alter table public.model_pricing   enable row level security;

-- Drop any existing policies to keep the migration idempotent
drop policy if exists "admins read traces"            on logs.traces;
drop policy if exists "admins read spans"             on logs.spans;
drop policy if exists "admins read persona_snapshots" on logs.persona_snapshots;
drop policy if exists "everyone reads model_pricing"  on public.model_pricing;

create policy "admins read traces"
  on logs.traces for select
  using (logs.is_admin());

create policy "admins read spans"
  on logs.spans for select
  using (logs.is_admin());

create policy "admins read persona_snapshots"
  on logs.persona_snapshots for select
  using (logs.is_admin());

-- model_pricing is non-sensitive (publicly visible token rates) and the
-- Edge Function reads it at trace-write time. Authenticated read; only
-- service role can write.
create policy "everyone reads model_pricing"
  on public.model_pricing for select
  using (true);

-- The Edge Function writes via service_role which bypasses RLS, so
-- no INSERT/UPDATE policies are defined for the logs.* tables.

-- Permit the Atelier Console (authenticated SPA) to query the schema.
grant usage on schema logs to authenticated;
grant select on logs.traces, logs.spans, logs.persona_snapshots to authenticated;

-- Service role for the Edge Function — full access to logs.*.
grant all on schema logs to service_role;
grant all on logs.traces, logs.spans, logs.persona_snapshots to service_role;
grant all on public.model_pricing to service_role;

-- ── Retention ───────────────────────────────────────────────────────────
-- Two-tier retention:
--   * traces (and cascade-linked spans + snapshots) older than 90 days
--   * persona_snapshots.system_prompt_full older than 30 days — null it
--     out to free space without losing the metadata. The hash, state
--     block, and tool response stay.
--
-- These functions are intended to be scheduled via pg_cron once the
-- extension is enabled in this project. Until then, they can be run
-- manually via `select logs.prune_old();`. See PHASE_9_FINDINGS.md §2.5.
create or replace function logs.prune_old() returns int
language plpgsql
as $$
declare
  v_traces_deleted int;
  v_prompts_nulled int;
begin
  -- Tier 1: drop traces (and cascading spans/snapshots) older than 90 days.
  with deleted as (
    delete from logs.traces
     where started_at < now() - interval '90 days'
     returning trace_id
  )
  select count(*) into v_traces_deleted from deleted;

  -- Tier 2: null out large system_prompt_full fields older than 30 days
  -- but keep the row so cache-hit analysis still works.
  with nulled as (
    update logs.persona_snapshots
       set system_prompt_full = null
     where system_prompt_full is not null
       and created_at < now() - interval '30 days'
     returning snapshot_id
  )
  select count(*) into v_prompts_nulled from nulled;

  -- Telemetry on the telemetry — emit a single notice per run.
  raise notice 'logs.prune_old: deleted % traces, nulled % system_prompts',
    v_traces_deleted, v_prompts_nulled;

  return v_traces_deleted + v_prompts_nulled;
end;
$$;

grant execute on function logs.prune_old() to service_role;

-- ───────────────────────────────────────────────────────────────────────
-- After-apply checklist:
--   1. select logs.is_admin();    -- should return false until app.admin_emails is set
--   2. alter database postgres set app.admin_emails = 'your@email.com';
--      (then reconnect — current_setting reads on connect)
--   3. select count(*) from public.model_pricing;  -- should return 2
--   4. select logs.prune_old();   -- should return 0 on a fresh DB
-- ───────────────────────────────────────────────────────────────────────
