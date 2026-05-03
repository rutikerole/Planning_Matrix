-- Planning Matrix v3 — extend intent + template_id to support
-- Aufstockung (T-06), Anbau (T-07), and standalone Sonstiges (T-08).

alter table public.projects
  drop constraint if exists projects_intent_check,
  add  constraint projects_intent_check check (intent in (
    'neubau_einfamilienhaus',
    'neubau_mehrfamilienhaus',
    'sanierung',
    'umnutzung',
    'abbruch',
    'aufstockung',
    'anbau',
    'sonstige'
  ));

alter table public.projects
  drop constraint if exists projects_template_id_check,
  add  constraint projects_template_id_check check (template_id in (
    'T-01','T-02','T-03','T-04','T-05','T-06','T-07','T-08'
  ));
