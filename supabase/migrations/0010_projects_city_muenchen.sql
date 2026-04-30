-- ───────────────────────────────────────────────────────────────────────
-- 0010_projects_city_muenchen.sql
--
-- Phase 5 — pivot the active city from Erlangen → München.
--
-- Builds on 0009_projects_city.sql, which introduced the first-class
-- `city` column with CHECK ('erlangen') and DEFAULT 'erlangen'. This
-- migration:
--
--   a) WIDENS the CHECK constraint to accept BOTH 'erlangen' and
--      'muenchen'. Existing erlangen rows remain valid; we do NOT
--      rewrite history. Phase 5 keeps `data/erlangen/` and the
--      Erlangen prompt slice as a sleeping reference, so legacy
--      city='erlangen' rows continue to be queryable even though
--      the wizard no longer admits Erlangen PLZs.
--
--   b) FLIPS the DEFAULT to 'muenchen' so newly-inserted rows pick up
--      the active city without the application having to write it.
--      (The wizard hook re-introduces an explicit `city: 'muenchen'`
--      write in the same Phase-5 batch — the default is a
--      belt-and-suspenders guard for any insert path that omits it.)
--
--   c) BACKFILLS legacy NULL rows whose plot_address contains a
--      München PLZ. The 70 PLZs are derived from
--      data/muenchen/stadtbezirke.json (the canonical stadtbezirke
--      slice harvested in Phase 4 from the WFS endpoint
--      gsm_wfs:vablock_stadtbezirk). PLZs are listed inline rather
--      than referenced through a function so the migration stays
--      self-contained and idempotent.
--
-- Apply path: Supabase Dashboard → SQL Editor → New query → paste →
-- Run. Idempotent — drop-and-add of the constraint is guarded by a
-- catalog check; the UPDATE re-running mutates zero rows.
--
-- Sequencing: ships ALONGSIDE the wizard PLZ swap (same Phase-5 batch).
-- Apply BEFORE the next deploy of the wizard so that new München
-- inserts pick up the widened CHECK; otherwise inserts with
-- city='muenchen' would error against the 0009 constraint.
-- ───────────────────────────────────────────────────────────────────────


-- ─── Drop the old (erlangen-only) CHECK and add the widened one ───────
do $$
begin
  if exists (
    select 1 from pg_constraint
     where conname = 'projects_city_check'
       and conrelid = 'public.projects'::regclass
  ) then
    alter table public.projects
      drop constraint projects_city_check;
  end if;

  alter table public.projects
    add constraint projects_city_check
    check (city is null or city in ('erlangen', 'muenchen'));
end $$;


-- ─── Flip the default for new rows from erlangen → muenchen ───────────
alter table public.projects
  alter column city set default 'muenchen';


-- ─── Backfill legacy NULL rows whose plot_address has a München PLZ ──
-- München PLZ inventory (70 entries, 80331-81929) sourced from
-- data/muenchen/stadtbezirke.json (Phase 4 WFS harvest). Rows where
-- city is already non-null are left alone — we do not overwrite an
-- explicit prior choice.
update public.projects
   set city = 'muenchen'
 where city is null
   and plot_address ~ '\m(80331|80333|80335|80336|80337|80339|80538|80539|80636|80637|80638|80639|80686|80687|80689|80796|80797|80798|80799|80801|80802|80803|80804|80805|80807|80809|80937|80939|80992|80993|80995|80997|80999|81241|81243|81245|81247|81249|81369|81371|81373|81375|81377|81379|81475|81476|81477|81479|81539|81541|81543|81545|81547|81549|81667|81669|81671|81673|81675|81677|81679|81735|81737|81739|81825|81827|81829|81925|81927|81929)\M';


-- ───────────────────────────────────────────────────────────────────────
-- DASHBOARD STEPS Rutik must perform after running this migration:
--
-- 1. Apply this migration via Supabase SQL Editor.
-- 2. (Optional) Verify the constraint and backfill:
--      select count(*) filter (where city = 'muenchen')          as muenchen,
--             count(*) filter (where city = 'erlangen')          as erlangen_legacy,
--             count(*) filter (where city is null)               as legacy_null,
--             count(*) filter (where city is not null
--                                and city not in ('erlangen',
--                                                 'muenchen'))   as drift
--        from public.projects;
--    `drift` MUST be 0 — the CHECK constraint enforces it.
-- 3. Confirm the default flipped:
--      select column_default
--        from information_schema.columns
--       where table_schema = 'public'
--         and table_name   = 'projects'
--         and column_name  = 'city';
--    Expected: 'muenchen'::text.
-- 4. After applying the migration, redeploy the wizard build (Phase-5
--    Commit 4 — PLZ swap) so new inserts go in as muenchen end-to-end.
-- ───────────────────────────────────────────────────────────────────────
