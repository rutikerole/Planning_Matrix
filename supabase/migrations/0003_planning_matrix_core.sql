-- ───────────────────────────────────────────────────────────────────────
-- 0003_planning_matrix_core.sql
--
-- Phase 3 core schema. Three tables — projects, messages, project_events —
-- plus row-level security, indexes, and an updated_at trigger. Backs the
-- two-question wizard at /projects/new and the chat workspace at
-- /projects/:id, including the structured project state that crystallises
-- in the right rail during a conversation.
--
-- Apply path: Supabase Dashboard → SQL Editor → New query → paste → Run.
-- Same one-shot pattern as 0001_profiles.sql / 0002_autoconfirm.sql.
--
-- Idempotent? No. Replaying on a fresh project is safe; replaying on an
-- existing project will fail at the first `create table`.
--
-- Schema notes:
--   • RLS enforces auth.uid() = projects.owner_id directly on `projects`,
--     and via a parent sub-select on `messages` and `project_events`.
--     The Edge Function constructs its Supabase client with the user's
--     bearer token (anon key + Authorization header), so every query
--     runs as the user — these policies are the only enforcement
--     boundary. Service-role usage is deliberately avoided.
--
--   • `state` on projects is JSONB. Shape lives in
--     src/types/projectState.ts and is mutated only via
--     src/lib/projectStateHelpers.ts. Shape is intentionally *not*
--     enforced in Postgres — the type system + helpers do that.
--
--   • Messages are append-only. No update/delete policy is created;
--     RLS denies them by default, which is what we want for an audit-
--     friendly conversation log.
--
--   • Project events are append-only for the same reason.
--
--   • `client_request_id` on messages backs idempotent retries from
--     the SPA. The unique partial index makes a re-submission with
--     the same id a no-op insert; the Edge Function then short-
--     circuits to the previously persisted assistant reply.
-- ───────────────────────────────────────────────────────────────────────


-- ─── Projects table ────────────────────────────────────────────────────
create table public.projects (
  id           uuid        primary key default gen_random_uuid(),
  owner_id     uuid        not null references auth.users on delete cascade,

  -- Initialization answers (I-01, I-02 from the wizard).
  intent       text        not null check (intent in (
    'neubau_einfamilienhaus',
    'neubau_mehrfamilienhaus',
    'sanierung',
    'umnutzung',
    'abbruch',
    'sonstige'
  )),
  has_plot     boolean     not null,
  plot_address text,           -- nullable; only populated when has_plot = true
  bundesland   text        not null default 'bayern',

  -- Resolved template. T-01 (Einfamilienhaus Neubau) is the only fully
  -- fleshed template in v1; T-02..T-05 fall back to T-01 with annotation
  -- in the system prompt.
  template_id  text        not null check (template_id in (
    'T-01','T-02','T-03','T-04','T-05'
  )),

  -- Display + lifecycle.
  name         text        not null,
  status       text        not null default 'in_progress' check (status in (
    'in_progress','paused','archived','completed'
  )),

  -- Project state — single JSONB blob. Shape: src/types/projectState.ts.
  -- Houses facts (with Source × Quality qualifiers), procedures, documents,
  -- roles, top-3 recommendations, A/B/C area states, questionsAsked.
  state        jsonb       not null default '{}'::jsonb,

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index projects_owner_idx
  on public.projects (owner_id, updated_at desc);


-- ─── Projects RLS ──────────────────────────────────────────────────────
alter table public.projects enable row level security;

create policy "owner can select projects"
  on public.projects for select
  using (auth.uid() = owner_id);

create policy "owner can insert projects"
  on public.projects for insert
  with check (auth.uid() = owner_id);

create policy "owner can update projects"
  on public.projects for update
  using (auth.uid() = owner_id);

create policy "owner can delete projects"
  on public.projects for delete
  using (auth.uid() = owner_id);


-- ─── Messages table ────────────────────────────────────────────────────
create table public.messages (
  id           uuid        primary key default gen_random_uuid(),
  project_id   uuid        not null references public.projects on delete cascade,

  role         text        not null check (role in ('user','assistant','system')),

  -- Assistant rows carry a specialist tag identifying which voice spoke
  -- this turn. User and system rows leave this null.
  specialist   text        check (specialist in (
    'moderator','planungsrecht','bauordnungsrecht','sonstige_vorgaben',
    'verfahren','beteiligte','synthesizer'
  )),

  -- Canonical message text. Assistant rows mirror to content_en for the
  -- DE/EN switch; user/system rows store original-language text only.
  content_de   text        not null,
  content_en   text,

  -- Assistant-only: the input affordance offered alongside this message.
  input_type   text        check (input_type in (
    'text','yesno','single_select','multi_select','address','none'
  )),
  input_options jsonb,
  allow_idk    boolean     default true,

  -- User-only: structured answer payload (UserAnswer in src/types).
  user_answer  jsonb,

  -- Idempotency key — set on user rows only by the SPA. Backed by the
  -- unique partial index below so a duplicate retry no-ops cleanly.
  client_request_id uuid,

  -- Audit (set on assistant rows when we have data from Anthropic).
  model              text,
  input_tokens       int,
  output_tokens      int,
  cache_read_tokens  int,
  cache_write_tokens int,
  latency_ms         int,

  created_at   timestamptz not null default now()
);

create index messages_project_idx
  on public.messages (project_id, created_at);

-- Idempotent retries: same project + same client_request_id = no second row.
-- Partial index avoids a NULL collision and keeps the constraint scoped to
-- user rows (assistant rows always leave client_request_id null).
create unique index messages_idempotency_idx
  on public.messages (project_id, client_request_id)
  where client_request_id is not null;


-- ─── Messages RLS ──────────────────────────────────────────────────────
alter table public.messages enable row level security;

create policy "owner can select messages"
  on public.messages for select
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.owner_id = auth.uid()
    )
  );

create policy "owner can insert messages"
  on public.messages for insert
  with check (
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.owner_id = auth.uid()
    )
  );

-- No update or delete policies — messages are append-only.


-- ─── Project events table ──────────────────────────────────────────────
create table public.project_events (
  id           uuid        primary key default gen_random_uuid(),
  project_id   uuid        not null references public.projects on delete cascade,

  -- Open-ended on purpose — examples: 'fact_added', 'fact_updated',
  -- 'qualifier_changed', 'recommendation_upserted', 'recommendation_removed',
  -- 'area_state_changed', 'procedure_status_changed',
  -- 'document_status_changed', 'role_needed_changed'.
  event_type   text        not null,
  before_state jsonb,
  after_state  jsonb,
  reason       text,
  triggered_by text        not null check (triggered_by in (
    'user','assistant','system'
  )),

  created_at   timestamptz not null default now()
);

create index project_events_project_idx
  on public.project_events (project_id, created_at desc);


-- ─── Project events RLS ────────────────────────────────────────────────
alter table public.project_events enable row level security;

create policy "owner can select events"
  on public.project_events for select
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.owner_id = auth.uid()
    )
  );

create policy "owner can insert events"
  on public.project_events for insert
  with check (
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.owner_id = auth.uid()
    )
  );

-- No update or delete policies — audit log is append-only.


-- ─── updated_at trigger ────────────────────────────────────────────────
-- Keeps projects.updated_at fresh on any mutation (used as the dashboard
-- sort key and as a soft sync signal between browser tabs). Mirrors the
-- search-path hardening pattern from 0001_profiles.sql.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger projects_updated_at
  before update on public.projects
  for each row
  execute function public.set_updated_at();
