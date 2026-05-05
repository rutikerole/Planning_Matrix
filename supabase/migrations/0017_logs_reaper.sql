-- ───────────────────────────────────────────────────────────────────────
-- 0017_logs_reaper.sql
--
-- Phase 9 — reap stuck "in_progress" traces.
--
-- Background: when an Edge Function invocation hits the platform
-- 150-second wall clock, the JS runtime is killed without a chance
-- to run finally-blocks. The trace row stays at status='in_progress'
-- forever. This migration adds logs.reap_stuck() which flips any
-- such row older than 60 seconds to status='partial' with
-- error_class='timeout_no_finalize' and a derived ended_at +
-- duration_ms.
--
-- 60s threshold is generous — the function's own AbortController
-- timeout is 50s, and the platform wall clock is 150s. A trace
-- still 'in_progress' at 60s is either crashed or the slowest
-- streaming turn we'll ever see; either way, partial is correct.
--
-- Schedule with pg_cron:
--   create extension if not exists pg_cron;
--   select cron.schedule('logs-reaper', '* * * * *', $$ select logs.reap_stuck(); $$);
--   select cron.schedule('logs-prune',  '0 3 * * *', $$ select logs.prune_old(); $$);
-- (pg_cron is not enabled by default on this project — apply once in
-- the Supabase Dashboard if you want automatic reaping. Until then,
-- run the function manually or accept that crashed traces show as
-- in_progress in the console — the deep-dive view handles this case
-- gracefully per PHASE_9_FINDINGS.md §6 case 11.)
--
-- Idempotent: create-or-replace function. Safe to re-apply.
-- ───────────────────────────────────────────────────────────────────────

create or replace function logs.reap_stuck() returns int
language plpgsql
as $$
declare
  v_reaped int;
begin
  with reaped as (
    update logs.traces
       set status = 'partial',
           error_class = coalesce(error_class, 'timeout_no_finalize'),
           ended_at = now(),
           duration_ms = greatest(
             extract(epoch from (now() - started_at))::int * 1000,
             0
           )
     where status = 'in_progress'
       and started_at < now() - interval '60 seconds'
     returning trace_id
  )
  select count(*) into v_reaped from reaped;

  if v_reaped > 0 then
    raise notice 'logs.reap_stuck: flipped % stuck traces to partial', v_reaped;
  end if;

  return v_reaped;
end;
$$;

grant execute on function logs.reap_stuck() to service_role;

-- ───────────────────────────────────────────────────────────────────────
-- Verification:
--   select logs.reap_stuck();   -- returns 0 on a clean DB
--   -- after a real timeout:
--   select trace_id, status, error_class, duration_ms
--     from logs.traces where error_class = 'timeout_no_finalize';
-- ───────────────────────────────────────────────────────────────────────
