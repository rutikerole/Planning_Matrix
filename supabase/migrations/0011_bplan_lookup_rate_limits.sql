-- ───────────────────────────────────────────────────────────────────────
-- 0011_bplan_lookup_rate_limits.sql
--
-- Phase 6a — per-user, per-minute rate limiter for the bplan-lookup
-- Edge Function (the WMS-GetFeatureInfo proxy that hides the München
-- Geoportal endpoint from the SPA).
--
-- Why a separate table from chat_turn_rate_limits (migration 0008)?
-- Different cadence (30/min vs 50/hour), different cost surface
-- (third-party WMS vs Anthropic), different operational concerns.
-- Sharing one counter would conflate the two.
--
-- Apply path: Supabase Dashboard → SQL Editor → New query → paste →
-- Run. Idempotent — table create uses IF NOT EXISTS; function
-- replaces atomically.
--
-- Sequencing: this migration ships ALONGSIDE the bplan-lookup Edge
-- Function (Phase 6a Commit 2). Apply BEFORE deploying the function
-- via `supabase functions deploy bplan-lookup`, otherwise the
-- function will 500 on its first RPC call.
-- ───────────────────────────────────────────────────────────────────────


-- ─── Counter table ──────────────────────────────────────────────────────
create table if not exists public.bplan_lookup_rate_limits (
  user_id      uuid        not null references auth.users(id) on delete cascade,
  minute_bucket timestamptz not null,
  count        int         not null default 0,
  primary key (user_id, minute_bucket)
);

create index if not exists bplan_lookup_rate_limits_lookup
  on public.bplan_lookup_rate_limits (user_id, minute_bucket desc);


-- ─── RLS — users can read their own counts (transparency / debug) ──────
alter table public.bplan_lookup_rate_limits enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
     where schemaname = 'public'
       and tablename = 'bplan_lookup_rate_limits'
       and policyname = 'users see own bplan rate limits'
  ) then
    create policy "users see own bplan rate limits"
      on public.bplan_lookup_rate_limits for select
      using (auth.uid() = user_id);
  end if;
end $$;

-- INSERT / UPDATE / DELETE flow only through the SECURITY DEFINER RPC.


-- ─── Atomic increment-and-check RPC ────────────────────────────────────
-- Edge Function calls this AFTER auth.getUser() succeeds. Returns one
-- row indicating whether the caller is within their per-minute cap.

create or replace function public.check_bplan_lookup_rate_limit(
  p_user_id uuid,
  p_max_per_minute int default 30
)
returns table (
  allowed boolean,
  current_count int,
  max_count int,
  reset_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_bucket timestamptz := date_trunc('minute', now());
  v_count  int;
begin
  insert into public.bplan_lookup_rate_limits as crl (user_id, minute_bucket, count)
  values (p_user_id, v_bucket, 1)
  on conflict (user_id, minute_bucket)
  do update set count = crl.count + 1
  returning crl.count into v_count;

  return query select
    (v_count <= p_max_per_minute)        as allowed,
    v_count                              as current_count,
    p_max_per_minute                     as max_count,
    (v_bucket + interval '1 minute')     as reset_at;
end;
$$;

revoke all on function public.check_bplan_lookup_rate_limit(uuid, int) from public;
grant execute on function public.check_bplan_lookup_rate_limit(uuid, int) to authenticated;


-- ─── Cleanup helper — delete buckets older than 1 hour ─────────────────
create or replace function public.cleanup_old_bplan_rate_limits()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.bplan_lookup_rate_limits
  where minute_bucket < now() - interval '1 hour';
$$;

revoke all on function public.cleanup_old_bplan_rate_limits() from public;


-- ───────────────────────────────────────────────────────────────────────
-- DASHBOARD STEPS Rutik must perform after running this migration:
--
-- 1. Apply this migration via Supabase SQL Editor.
-- 2. Deploy the new Edge Function:
--      supabase functions deploy bplan-lookup --project-ref <ref>
-- 3. (Optional) Database → Cron Jobs → New job:
--      Name:     cleanup_bplan_rate_limits
--      Schedule: 0 * * * *      (every hour at :00)
--      Command:  select public.cleanup_old_bplan_rate_limits();
-- 4. Smoke test (replace YOUR_JWT and YOUR_ANON_KEY):
--      curl -X POST 'https://<ref>.supabase.co/functions/v1/bplan-lookup' \
--           -H 'Content-Type: application/json' \
--           -H 'apikey: YOUR_ANON_KEY' \
--           -H 'Authorization: Bearer YOUR_JWT' \
--           -d '{"lat":48.1487,"lng":11.5704}'
--    (those coords are Maxvorstadt; expect status: "found".)
-- ───────────────────────────────────────────────────────────────────────
