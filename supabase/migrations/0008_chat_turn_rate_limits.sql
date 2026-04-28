-- ───────────────────────────────────────────────────────────────────────
-- 0008_chat_turn_rate_limits.sql
--
-- Phase 4.1 #125 — application-level rate limit on chat-turn.
--
-- Supabase platform rate limits cover auth (sign-in / sign-up flood),
-- but a malicious authenticated user could still grind through the
-- Anthropic credit budget by hammering the chat-turn function. This
-- migration adds a per-user, per-hour counter table + an atomic
-- increment-and-check RPC. Default cap: 50 turns per user per hour.
--
-- Apply path: Supabase Dashboard → SQL Editor → New query → paste → Run.
-- **Apply BEFORE redeploying the chat-turn Edge Function**, otherwise
-- the function will 500 on its first rate-limit RPC call.
--
-- Idempotent? Mostly. CREATE TABLE / INDEX use IF NOT EXISTS where
-- supported; CREATE POLICY errors on re-run — drop + recreate
-- manually if replaying.
-- ───────────────────────────────────────────────────────────────────────


-- ─── chat_turn_rate_limits table ───────────────────────────────────────
create table if not exists public.chat_turn_rate_limits (
  user_id      uuid        not null references auth.users(id) on delete cascade,
  hour_bucket  timestamptz not null,  -- truncated to the hour
  count        int         not null default 0,
  primary key (user_id, hour_bucket)
);

create index if not exists chat_turn_rate_limits_lookup
  on public.chat_turn_rate_limits (user_id, hour_bucket desc);


-- ─── RLS — users see their own counts (transparency UI optional) ──────
alter table public.chat_turn_rate_limits enable row level security;

create policy "users see own rate limits"
  on public.chat_turn_rate_limits for select
  using (auth.uid() = user_id);

-- No INSERT / UPDATE / DELETE policies — those operations all go through
-- the SECURITY DEFINER RPC below, which bypasses RLS.


-- ─── Atomic increment-and-check RPC ───────────────────────────────────
-- Edge Function calls this AFTER auth.getUser() succeeds. The function
-- runs as security definer so it can write through RLS; the parameter
-- bindings prevent SQL injection.
--
-- Returns one row:
--   allowed       — boolean, true if `count <= max_count`
--   current_count — int, the new count after increment
--   max_count     — int, the configured cap (echoed back for the UI)
--   reset_at      — timestamptz, when the current bucket rolls over

create or replace function public.increment_chat_turn_rate_limit(
  p_user_id uuid,
  p_max_per_hour int default 50
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
  v_bucket timestamptz := date_trunc('hour', now());
  v_count  int;
begin
  insert into public.chat_turn_rate_limits as crl (user_id, hour_bucket, count)
  values (p_user_id, v_bucket, 1)
  on conflict (user_id, hour_bucket)
  do update set count = crl.count + 1
  returning crl.count into v_count;

  return query select
    (v_count <= p_max_per_hour)        as allowed,
    v_count                            as current_count,
    p_max_per_hour                     as max_count,
    (v_bucket + interval '1 hour')     as reset_at;
end;
$$;

revoke all on function public.increment_chat_turn_rate_limit(uuid, int) from public;
grant execute on function public.increment_chat_turn_rate_limit(uuid, int) to authenticated;


-- ─── Cleanup helper — delete buckets older than 24 hours ──────────────
-- Wired to Supabase Cron (Database → Cron Jobs) to run hourly. If no
-- cron is set up, the table grows by ~1 row per active user per hour;
-- still small enough to ignore for v1, but the helper is here so we
-- can wire it later in one click.
create or replace function public.cleanup_old_rate_limits()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.chat_turn_rate_limits
  where hour_bucket < now() - interval '24 hours';
$$;

revoke all on function public.cleanup_old_rate_limits() from public;
-- Intentionally not granted to authenticated — service role / cron only.


-- ───────────────────────────────────────────────────────────────────────
-- DASHBOARD STEPS Rutik must perform after running this migration:
--
-- 1. Apply this migration via Supabase SQL Editor.
-- 2. Redeploy the chat-turn Edge Function:
--      supabase functions deploy chat-turn
-- 3. (Optional) Database → Cron Jobs → New job:
--      Name:     cleanup_chat_turn_rate_limits
--      Schedule: 0 * * * *      (every hour at :00)
--      Command:  select public.cleanup_old_rate_limits();
-- 4. Smoke test: send 51 chat turns within an hour. The 51st should
--    return 429 with `error.code = 'rate_limit_exceeded'`.
-- ───────────────────────────────────────────────────────────────────────
