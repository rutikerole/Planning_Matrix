-- ───────────────────────────────────────────────────────────────────────
-- 0029_qualifier_metrics_view.sql
--
-- Phase 13 Week 4 — rolling-7-day qualifier-rate metrics.
--
-- The Week 1 view (0027_qualifier_transitions) flattens event_log
-- rows where source='system' and name in (qualifier.downgraded |
-- qualifier.verified | qualifier.rejected). This adds three derived
-- views layered on top of it:
--
--   * qualifier_rates_7d_global  — single row, last 7 days. Numerator
--     = downgraded+rejected, denominator = chat-turns in same window
--     (proxied by distinct project_id+session_id pairs in event_log
--     where source='chat-turn'). Powers the 13b conditional-trigger
--     threshold (>5% over 100 turns / 7d).
--
--   * qualifier_rates_7d_per_project — same numerator, partitioned
--     by project_id. Useful for spotting a single-project regression
--     (e.g. one Bauherr's session producing all the downgrades).
--
--   * qualifier_field_breakdown_7d — gate-event count grouped by
--     `field` (extracted_fact / recommendation / etc.) so a future
--     PR can spot whether a single qualifier surface is responsible
--     for the rate.
--
-- Numbering note: the user's roadmap originally cited
-- 0028_qualifier_metrics_view.sql; 0028 was taken by the Week 3
-- projects-architect-read RLS migration so this lands at 0029
-- without functional change. The PHASE_13_REVIEW.md audit trail
-- records the renumber.
--
-- Apply path: Supabase Dashboard → SQL Editor → paste → Run.
-- Idempotent via `create or replace view`.
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
  (select count(distinct (project_id, session_id)) from windowed
     where source = 'chat-turn') as turns_count;

create or replace view public.qualifier_rates_7d_per_project as
select
  project_id,
  count(*) filter (where name = 'qualifier.downgraded') as downgraded_count,
  count(*) filter (where name = 'qualifier.rejected')   as rejected_count,
  count(*) filter (where name = 'qualifier.verified')   as verified_count
from public.event_log
where server_ts >= now() - interval '7 days'
  and source = 'system'
  and name in ('qualifier.downgraded', 'qualifier.rejected', 'qualifier.verified')
group by project_id;

create or replace view public.qualifier_field_breakdown_7d as
select
  attributes ->> 'field' as field_kind,
  name as transition_kind,
  count(*) as event_count
from public.event_log
where server_ts >= now() - interval '7 days'
  and source = 'system'
  and name in ('qualifier.downgraded', 'qualifier.rejected', 'qualifier.verified')
group by 1, 2
order by 1, 2;

grant select on
  public.qualifier_rates_7d_global,
  public.qualifier_rates_7d_per_project,
  public.qualifier_field_breakdown_7d
to authenticated;

-- ───────────────────────────────────────────────────────────────────────
-- 13b CONDITIONAL TRIGGER (kept deferred; surface lives in
-- PHASE_13_REVIEW.md). Reading the threshold:
--
--   select * from public.qualifier_rates_7d_global;
--
-- If (downgraded_count + rejected_count) > 5 AND turns_count >= 100,
-- escalate per the v1.5 §6.B.01 rollback playbook (revert
-- QUALIFIER_GATE_REJECTS to false, surface findings, decide whether
-- the gate has a false-positive surface).
-- ───────────────────────────────────────────────────────────────────────
