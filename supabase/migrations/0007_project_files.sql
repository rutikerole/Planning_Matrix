-- ───────────────────────────────────────────────────────────────────────
-- 0007_project_files.sql
--
-- Phase 3.6 #68 — file uploads (attachments) for the chat workspace.
--
-- Bauherren bring documents to the consultation: site plans, existing
-- drawings, B-Plan PDFs, Grundbuch entries, photos of the plot. Until
-- now we accepted none of them. This migration adds:
--
--   1. project_files table — one row per uploaded file. Tracks owner +
--      project + storage path + category + status. Optional linkage
--      back to a chat message (for inline display) and to a checklist
--      document (for the auto-link path on b_plan / plot_plan / etc.).
--
--   2. messages.attachment_ids uuid[] — IDs of project_files attached
--      to a given user message. Backed by the chat-turn flow: the SPA
--      uploads files first, then posts the chat-turn with the resulting
--      ids. The Edge Function records the array on the user message it
--      writes; afterwards the SPA updates each project_files.message_id
--      with the persisted message id (RLS allows the owner to update).
--
-- Apply path: Supabase Dashboard → SQL Editor → New query → paste → Run.
--
-- Idempotent? Mostly. CREATE TABLE / INDEX use IF NOT EXISTS where
-- supported; policies use CREATE POLICY which errors on re-run — drop
-- them manually if you need to replay.
--
-- Linkage strategy: messages have no UPDATE RLS, so we keep the
-- relationship one-way — `project_files.message_id` is set by the
-- SPA after a successful chat-turn (lookup user message by
-- client_request_id, UPDATE the file row). No `messages.attachment_ids`
-- column is needed; the result page joins project_files → messages
-- on demand for inline rendering.
-- ───────────────────────────────────────────────────────────────────────


-- ─── project_files table ───────────────────────────────────────────────
create table if not exists public.project_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,

  file_name text not null,
  file_type text not null,           -- mime type
  file_size bigint not null,
  storage_path text not null unique,
  storage_bucket text not null default 'project-files',

  -- Optional category hint from the user (default 'other'). Drives the
  -- auto-link path in src/features/chat/lib/documentLinkage.ts.
  category text check (category in (
    'plot_plan', 'building_plan', 'b_plan', 'photo',
    'grundbuch', 'energy_certificate', 'other'
  )),

  -- Who uploaded — DESIGNER / ENGINEER / AUTHORITY are reserved for
  -- future multi-actor flows (Phase 4+). v1 always 'client'.
  uploaded_by_role text not null default 'client'
    check (uploaded_by_role in ('client', 'designer', 'engineer', 'authority', 'system')),

  -- Linkage back to the message + checklist document (both optional).
  message_id uuid references public.messages(id) on delete set null,
  document_id text,

  status text not null default 'uploaded' check (status in (
    'uploading', 'uploaded', 'processing', 'ready', 'failed', 'deleted'
  )),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_files_project_idx
  on public.project_files (project_id, created_at desc);

create index if not exists project_files_message_idx
  on public.project_files (message_id) where message_id is not null;


-- ─── project_files RLS ─────────────────────────────────────────────────
alter table public.project_files enable row level security;

create policy "owner can select own project files"
  on public.project_files for select using (
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.owner_id = auth.uid()
    )
  );

create policy "owner can insert own project files"
  on public.project_files for insert with check (
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.owner_id = auth.uid()
    )
    and owner_id = auth.uid()
  );

create policy "owner can update own project files"
  on public.project_files for update using (
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.owner_id = auth.uid()
    )
  );

create policy "owner can delete own project files"
  on public.project_files for delete using (
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.owner_id = auth.uid()
    )
  );


-- ─── updated_at trigger ────────────────────────────────────────────────
create or replace trigger project_files_updated_at
  before update on public.project_files
  for each row execute function public.set_updated_at();


-- ───────────────────────────────────────────────────────────────────────
-- DASHBOARD STEPS Rutik must perform after running this migration:
--
-- 1. Storage → New bucket
--      Name:                project-files
--      Public:              OFF (private)
--      File size limit:     26214400 (25 MB in bytes)
--      Allowed MIME types:
--        application/pdf
--        image/png
--        image/jpeg
--        image/jpg
--        application/msword
--        application/vnd.openxmlformats-officedocument.wordprocessingml.document
--        image/vnd.dwg
--        application/acad
--
-- 2. Storage → Policies → New policy on project-files (3 of them):
--
--    Policy A — "owner can select own files"
--      Operation: SELECT
--      Using:
--        bucket_id = 'project-files'
--        AND auth.uid()::text = (storage.foldername(name))[1]
--
--    Policy B — "owner can insert own files"
--      Operation: INSERT
--      With check:
--        bucket_id = 'project-files'
--        AND auth.uid()::text = (storage.foldername(name))[1]
--
--    Policy C — "owner can delete own files"
--      Operation: DELETE
--      Using:
--        bucket_id = 'project-files'
--        AND auth.uid()::text = (storage.foldername(name))[1]
--
--    Path convention: <user-uuid>/<project-uuid>/<random>-<filename>.
--    foldername(name)[1] extracts the user-uuid segment.
--
-- 3. Edge Functions → Deploy:
--      supabase functions deploy signed-file-url
--      supabase functions deploy delete-file
--
-- 4. Smoke test:
--      a. Upload a 1MB PDF via the chat workspace paperclip → should
--         succeed, chip shows 'uploaded' status.
--      b. Click the chip → opens signed URL in new tab.
--      c. Remove the chip pre-send → row + storage object both gone.
-- ───────────────────────────────────────────────────────────────────────
