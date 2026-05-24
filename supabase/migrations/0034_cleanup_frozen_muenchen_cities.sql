-- ───────────────────────────────────────────────────────────────────────
-- 0034_cleanup_frozen_muenchen_cities.sql
--
-- v1.0.25 Bug 42 data cleanup. NON_BAYERN_PROD_FORENSICS.md found that
-- the pre-B04 wizard (before commit eb44b7e, 2026-05-11) hardcoded
-- city='muenchen' for every project, and the v1.0.6 B04 mitigation only
-- set city=null for newly-created non-Bayern projects. Rows that were
-- created as Bayern and later relabeled to another Bundesland (the two
-- "hessen" test projects in the forensics dump) still carry a stale
-- city='muenchen' that does not match their bundesland.
--
-- This one-off statement nulls the city on any project whose bundesland
-- is NOT bayern — those can never legitimately carry a Bayern cityBlock
-- city. Bayern projects are untouched. Idempotent + safe to re-run.
--
-- ⚠ APPLY VIA SUPABASE SQL EDITOR ONLY (Bug 41: do not `supabase db
-- push`). Application in prod is a manual step; this file only lands the
-- source.
-- ───────────────────────────────────────────────────────────────────────

update public.projects
   set city = null
 where bundesland is distinct from 'bayern'
   and city is not null;

-- Verification (post-apply):
--   select bundesland, city, count(*) from public.projects
--     group by bundesland, city order by bundesland;
--   Expected: no non-'bayern' bundesland with a non-null city.
