-- ───────────────────────────────────────────────────────────────────────
-- 0026_project_members.sql
--
-- Phase 13 Week 1 — DESIGNER role + architect verification UX.
--
-- Per-project membership table. profiles.role (added in 0001) stays the
-- per-USER role (client | designer | engineer | authority); this table
-- tracks which architects (profiles.role = 'designer') are members of
-- which projects, with an invite_token for the copy-paste-link flow
-- (B1 default — no email vendor).
--
-- RLS pattern mirrors public.admin_users (migration 0018):
--   SELECT — caller is member OR caller is project owner OR caller is admin.
--   INSERT — caller is project owner.
--   UPDATE — caller is the affected member (e.g. setting accepted_at).
--   DELETE — caller is project owner OR caller is the affected member.
--
-- Apply path: Supabase Dashboard → SQL Editor → New query → paste → Run.
-- Idempotent: IF NOT EXISTS on table + indexes.
-- ───────────────────────────────────────────────────────────────────────

create table if not exists public.project_members (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references public.projects(id) on delete cascade,
  user_id         uuid references auth.users(id) on delete cascade,
  -- Phase 13 ships only 'designer' role-in-project. The check is
  -- intentionally extensible for post-v1 (engineer, authority etc.).
  role_in_project text not null check (role_in_project in ('designer')),
  -- Invite-token flow: row is created by project owner with user_id=NULL.
  -- The architect clicks the invite link, signs in, and the SPA fills
  -- user_id + accepted_at via the share-project Edge Function.
  invite_token    uuid not null default gen_random_uuid(),
  invited_at      timestamptz not null default now(),
  accepted_at     timestamptz,
  created_at      timestamptz not null default now()
);

-- A given (project, user) pair is unique once accepted. Pre-acceptance
-- (user_id NULL) the invite_token is the de-facto unique key.
create unique index if not exists project_members_project_user_idx
  on public.project_members (project_id, user_id)
  where user_id is not null;

create unique index if not exists project_members_invite_token_idx
  on public.project_members (invite_token);

create index if not exists project_members_user_idx
  on public.project_members (user_id, accepted_at desc)
  where user_id is not null;

alter table public.project_members enable row level security;

-- ── SELECT — member, owner, or admin ──────────────────────────────────
drop policy if exists "members read own membership" on public.project_members;
create policy "members read own membership"
  on public.project_members for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.projects p
      where p.id = project_id and p.owner_id = auth.uid()
    )
    or logs.is_admin()
  );

-- ── INSERT — project owner only (creates invite for an architect) ─────
drop policy if exists "owner inserts project members" on public.project_members;
create policy "owner inserts project members"
  on public.project_members for insert
  with check (
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.owner_id = auth.uid()
    )
    -- The architect who later claims via invite_token does so via the
    -- share-project Edge Function (SECURITY DEFINER). Direct INSERT
    -- by the architect is denied.
  );

-- ── UPDATE — affected member sets accepted_at via Edge Function ───────
-- (The Edge Function uses anon-key with the architect's bearer; this
-- policy is the application-level guard.)
drop policy if exists "member accepts invite" on public.project_members;
create policy "member accepts invite"
  on public.project_members for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ── DELETE — owner removes member, or member removes self ─────────────
drop policy if exists "owner or member delete" on public.project_members;
create policy "owner or member delete"
  on public.project_members for delete
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.projects p
      where p.id = project_id and p.owner_id = auth.uid()
    )
  );

grant select, insert, update, delete on public.project_members to authenticated;

-- ───────────────────────────────────────────────────────────────────────
-- DASHBOARD STEPS (post-apply):
--   1. Apply this migration.
--   2. Verify RLS:
--        select * from public.project_members where false; -- empty, ok
--   3. As a project owner, INSERT an invite row:
--        insert into public.project_members (project_id, role_in_project)
--        values ('<your-project-uuid>', 'designer')
--        returning invite_token;
--   4. Hand the invite_token to a profile with role='designer'; the SPA's
--      /architect/accept?token=... flow (Phase 13 Week 3) accepts.
-- ───────────────────────────────────────────────────────────────────────
