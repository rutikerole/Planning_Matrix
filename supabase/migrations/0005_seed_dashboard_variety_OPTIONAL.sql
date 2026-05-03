-- OPTIONAL — dev/staging only. Do NOT apply to production.
--
-- This replaces homogenous test projects with varied addresses
-- so the dashboard shows the deterministic site-plan variety the
-- design depends on.
--
-- To use: in the Supabase SQL editor, paste this whole file,
--   1. replace OWNER_UUID_HERE with your auth.uid() (run
--      `select auth.uid();` first to copy it),
--   2. change the trailing ROLLBACK to COMMIT,
--   3. run.
--
-- The default ROLLBACK at the bottom keeps the transaction
-- non-destructive when this file is run accidentally — no rows
-- are persisted unless you explicitly flip it to COMMIT.

begin;

-- Wipe the obvious duplicate seed rows (only the ones likely
-- created by the placeholder default-name path).
delete from public.projects
where name like 'Neubau Einfamilienhaus%'
  and plot_address = 'Türkenstraße 25, 80799 München';

-- Insert 6 varied test projects across the v3 template set.
-- Replace OWNER_UUID_HERE before running.
insert into public.projects
  (owner_id, intent, has_plot, plot_address, bundesland, template_id, name, status)
values
  ('OWNER_UUID_HERE', 'neubau_einfamilienhaus',  true, 'Türkenstraße 25, 80799 München',     'bayern', 'T-01', 'Einfamilienhaus Türkenstraße',     'in_progress'),
  ('OWNER_UUID_HERE', 'neubau_mehrfamilienhaus', true, 'Lindwurmstraße 88, 80337 München',   'bayern', 'T-02', 'Mehrfamilienhaus Lindwurmstraße',  'in_progress'),
  ('OWNER_UUID_HERE', 'sanierung',                true, 'Maximilianstraße 14, 80539 München', 'bayern', 'T-03', 'Sanierung Maximilianstraße',       'in_progress'),
  ('OWNER_UUID_HERE', 'aufstockung',              true, 'Goethestraße 20, 91054 Erlangen',    'bayern', 'T-06', 'Aufstockung Goethestraße',         'in_progress'),
  ('OWNER_UUID_HERE', 'anbau',                    true, 'Innstraße 23, 83022 Rosenheim',      'bayern', 'T-07', 'Anbau Innstraße',                  'in_progress'),
  ('OWNER_UUID_HERE', 'umnutzung',                true, 'Schellingstraße 41, 80799 München',  'bayern', 'T-04', 'Umnutzung Schellingstraße',        'in_progress');

-- IMPORTANT: change ROLLBACK to COMMIT manually after verifying
-- the inserts above land cleanly.
rollback;
