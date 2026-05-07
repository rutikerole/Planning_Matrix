-- ───────────────────────────────────────────────────────────────────────
-- 0027_qualifier_transitions.sql
--
-- Phase 13 Week 1 — derived view over event_log for qualifier-transition
-- telemetry. Powers:
--   - Phase 13 Week 4 metrics view (rolling 7-day rates).
--   - The 13b conditional-trigger threshold (>5 qualifier-downgrade
--     events / 100 turns / 7-day rolling window).
--   - Phase 16 quality dashboard (auto-picks-up since it lives in
--     event_log already).
--
-- The view filters event_log for qualifier-related events; no schema
-- duplication. Read-access mirrors event_log RLS (user reads own,
-- admin reads all). No new RLS needed — view inherits.
--
-- Idempotent: CREATE OR REPLACE VIEW.
-- ───────────────────────────────────────────────────────────────────────

create or replace view public.qualifier_transitions as
select
  event_id,
  session_id,
  user_id,
  project_id,
  name as transition_kind,        -- qualifier.downgraded / .verified / .rejected
  attributes,
  attributes ->> 'field' as field_kind,        -- extracted_fact | recommendation | procedure | document | role
  attributes ->> 'item_id' as item_id,
  attributes ->> 'attempted_source' as attempted_source,
  attributes ->> 'attempted_quality' as attempted_quality,
  attributes ->> 'enforced_source' as enforced_source,
  attributes ->> 'enforced_quality' as enforced_quality,
  attributes ->> 'caller_role' as caller_role,
  attributes ->> 'reason' as reason,
  trace_id,
  client_ts,
  server_ts
from public.event_log
where source = 'system'
  and name in ('qualifier.downgraded', 'qualifier.verified', 'qualifier.rejected');

-- View inherits the underlying event_log RLS policies; no separate grant
-- needed beyond the existing event_log access.
grant select on public.qualifier_transitions to authenticated, anon;

-- ───────────────────────────────────────────────────────────────────────
-- Verification (post-apply):
--   select transition_kind, count(*)
--     from public.qualifier_transitions
--     where server_ts > now() - interval '7 days'
--     group by 1;
-- ───────────────────────────────────────────────────────────────────────
