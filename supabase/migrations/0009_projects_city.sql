-- ───────────────────────────────────────────────────────────────────────
-- 0009_projects_city.sql
--
-- Phase 1 (post-audit) — first-class `city` dimension on projects.
--
-- v1 narrows scope from "Bayern" to **Erlangen-only** per the
-- AUDIT_REPORT.md §6 pivot. The wizard now blocks non-Erlangen
-- postcodes; this migration backs the decision in the data model so
-- a) the dashboard can later filter by city without reaching into
-- JSONB, b) future cities are added by widening the CHECK
-- constraint in a follow-up migration (no schema rewrite), and
-- c) existing rows with an Erlangen postcode in plot_address are
-- backfilled honestly.
--
-- Apply path: Supabase Dashboard → SQL Editor → New query → paste →
-- Run. Idempotent — `add column if not exists`, an UPDATE that
-- re-running a second time mutates no rows, and a constraint guarded
-- against duplicate adds via the catalog check below.
--
-- Sequencing note: this migration ships ALONGSIDE the wizard
-- postcode gate (same Phase-1 commit batch). Apply it BEFORE the
-- next chat-turn redeploy so newly-inserted rows pick up the
-- default cleanly. The Edge Function does not yet read `city` —
-- consumption is deferred to Phase 2's data slice and Phase 3's
-- system-prompt city block.
-- ───────────────────────────────────────────────────────────────────────


-- ─── Add the column ───────────────────────────────────────────────────
alter table public.projects
  add column if not exists city text;


-- ─── Backfill from plot_address PLZ ───────────────────────────────────
-- Any existing project whose plot_address contains an Erlangen PLZ
-- (Erlangen Stadtgebiet: 91052, 91054, 91056, 91058) gets city='erlangen'.
-- Everything else stays NULL — those rows were created when the wizard
-- accepted any Bayern address; we don't second-guess them retroactively.
update public.projects
   set city = 'erlangen'
 where city is null
   and plot_address ~ '\m(91052|91054|91056|91058)\M';


-- ─── Default for new rows ─────────────────────────────────────────────
alter table public.projects
  alter column city set default 'erlangen';


-- ─── CHECK constraint enumerating supported cities ────────────────────
-- Initially just 'erlangen'. Future cities are added by altering this
-- constraint in a later migration. NULL is permitted so the backfill
-- above doesn't have to retroactively fabricate a value for older rows
-- whose plot_address didn't carry an Erlangen PLZ.
do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'projects_city_check'
       and conrelid = 'public.projects'::regclass
  ) then
    alter table public.projects
      add constraint projects_city_check
      check (city is null or city in ('erlangen'));
  end if;
end $$;


-- ───────────────────────────────────────────────────────────────────────
-- DASHBOARD STEPS Rutik must perform after running this migration:
--
-- 1. Apply this migration via Supabase SQL Editor.
-- 2. (Optional) Verify the backfill:
--      select count(*) filter (where city = 'erlangen')         as erlangen,
--             count(*) filter (where city is null)              as legacy,
--             count(*) filter (where city is not null
--                                and city <> 'erlangen')        as drift
--        from public.projects;
--    `drift` MUST be 0 — the CHECK constraint enforces it, but the
--    query is the cheapest sanity check on a populated DB.
-- 3. No Edge Function redeploy is required for THIS migration alone;
--    the chat-turn function does not yet read `city`.
-- ───────────────────────────────────────────────────────────────────────
