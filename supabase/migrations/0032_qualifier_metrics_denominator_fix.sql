-- ───────────────────────────────────────────────────────────────────────
-- 0032_qualifier_metrics_denominator_fix.sql
--
-- v1.0.4 A2 — close POST_V1_AUDIT.md CRITICAL-2 / PROD_READINESS audit
-- A2: the 13b conditional-trigger threshold was structurally inert.
--
-- Root cause: 0029_qualifier_metrics_view.sql declared
--
--   (select count(distinct (project_id, session_id)) from windowed
--      where source = 'chat-turn') as turns_count;
--
-- but `event_log.source` carries a CHECK constraint (migration 0020:52)
-- that ONLY accepts the values:
--   ('wizard', 'chat', 'result', 'auth', 'dashboard', 'sentry', 'system').
-- The literal 'chat-turn' is rejected, so NO row can ever match the
-- WHERE predicate and `turns_count` is permanently 0.  The audit's
-- live REST probe confirmed: turns_count = 0 in production.
--
-- Fix (chosen path: align the view to the constraint, not vice-versa).
-- The Edge Function's chat-turn handler (v1.0.4) now emits
--   { source: 'chat', name: 'chat.turn_completed' }
-- per successful (non-idempotent-replay) turn. This view aligns its
-- WHERE to that pair so the denominator counts real turns.
--
-- The other two views (per_project / field_breakdown) are unchanged.
--
-- Apply path: Supabase Dashboard → SQL Editor → New query → Run.
-- Idempotent: CREATE OR REPLACE VIEW.
-- ───────────────────────────────────────────────────────────────────────

create or replace view public.qualifier_rates_7d_global as
with windowed as (
  select * from public.event_log
  where server_ts >= now() - interval '7 days'
)
select
  (select count(*) from windowed
     where source = 'system' and name = 'qualifier.downgraded') as downgraded_count,
  (select count(*) from windowed
     where source = 'system' and name = 'qualifier.rejected') as rejected_count,
  (select count(*) from windowed
     where source = 'system' and name = 'qualifier.verified') as verified_count,
  -- v1.0.4 — was `where source = 'chat-turn'` (rejected by CHECK
  -- constraint; permanently 0). Now counts the chat.turn_completed
  -- events the Edge Function emits per successful turn.
  (select count(*) from windowed
     where source = 'chat' and name = 'chat.turn_completed') as turns_count;

grant select on public.qualifier_rates_7d_global to authenticated;

-- ───────────────────────────────────────────────────────────────────────
-- Verification (post-apply):
--   1. Send one chat-turn through the SPA on a real project.
--   2. select * from public.qualifier_rates_7d_global;
--      Expected: turns_count >= 1 within seconds.
--   3. The 13b CLI (`node scripts/qualifier-downgrade-rate.mjs`) now
--      shows a live denominator. The threshold predicate
--      (numerator > 5 AND turns >= 100) can finally fire.
-- ───────────────────────────────────────────────────────────────────────
