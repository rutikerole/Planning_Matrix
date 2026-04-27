-- ───────────────────────────────────────────────────────────────────────
-- 0002_autoconfirm.sql
--
-- Phase 2 v1 strategy: instant signup → instant dashboard, no email-
-- verification friction. The Supabase dashboard toggle for
-- "Confirm email" wouldn't save reliably on free tier; this trigger
-- bypasses it from inside the database.
--
-- Phase 3 will:
--   1. Swap to custom SMTP (Resend / Postmark / SES)
--   2. Drop this trigger
--   3. Restore real email confirmation
--
-- Run once in the Supabase SQL editor (Dashboard → SQL Editor → New
-- query → paste → Run).
-- ───────────────────────────────────────────────────────────────────────

create or replace function public.handle_new_user_autoconfirm()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update auth.users
  set email_confirmed_at = now()
  where id = new.id and email_confirmed_at is null;
  return new;
end;
$$;

create trigger on_auth_user_created_autoconfirm
  after insert on auth.users
  for each row
  execute function public.handle_new_user_autoconfirm();
