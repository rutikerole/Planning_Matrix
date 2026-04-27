-- ───────────────────────────────────────────────────────────────────────
-- 0001_profiles.sql
--
-- Creates the `public.profiles` table, RLS policies, and the
-- auto-create-on-signup trigger. Run once in the Supabase SQL editor:
--   Dashboard → SQL Editor → New query → paste → Run.
--
-- Idempotent? No — this is a one-shot migration. If you need to re-run
-- on a fresh project, that's safe; running on an existing project will
-- fail at `create table` because the table already exists.
-- ───────────────────────────────────────────────────────────────────────


-- ─── Profiles table ───────────────────────────────────────────────────
create table public.profiles (
  id          uuid        references auth.users on delete cascade primary key,
  email       text        not null,
  full_name   text,
  locale      text        default 'de'     check (locale in ('de', 'en')),
  role        text        default 'client' check (role in ('client', 'designer', 'engineer', 'authority')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);


-- ─── Row Level Security ───────────────────────────────────────────────
alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles
  for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles
  for update
  using (auth.uid() = id);

-- Note: no INSERT policy on purpose. Profile rows are created by the
-- trigger below (running as SECURITY DEFINER, so RLS bypassed). Users
-- never insert their own profile row directly.


-- ─── Auto-create profile row on signup ────────────────────────────────
-- Fires on INSERT to auth.users (managed by Supabase Auth itself).
-- Copies full_name + locale from the user's raw_user_meta_data
-- (which we populate via options.data on supabase.auth.signUp).
--
-- `set search_path = ''` is the 2026-recommended hardening for
-- SECURITY DEFINER functions — protects against search-path hijacking.
-- This is non-optional in current Supabase docs.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, locale)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    coalesce(new.raw_user_meta_data ->> 'locale', 'de')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
