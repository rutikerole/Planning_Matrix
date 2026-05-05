-- ───────────────────────────────────────────────────────────────────────
-- 0016_project_events_trace_link.sql
--
-- Phase 9 — link project_events to logs.traces.
--
-- Adds a nullable `trace_id` column to public.project_events so each
-- audit row can be joined back to the trace that produced it. Old
-- rows stay null forever (no backfill — the trace data didn't exist
-- before Phase 9, so a synthesised trace_id would be misleading).
--
-- Also rewrites public.commit_chat_turn() to accept p_trace_id as
-- an 8th parameter with default null. The default-null is deliberate:
-- the SPA's existing 7-arg invocation continues to resolve to this
-- function and write null trace_id rows, so the migration can apply
-- BEFORE the Edge Function is redeployed in commit 5 without breaking
-- live turns. Once the function is redeployed (commit 5), it passes
-- the tracer's trace_id and the column starts populating.
--
-- Apply path: Supabase Dashboard → SQL Editor → paste → Run.
-- Idempotent: drop-then-create on the function, if-not-exists on the
-- column, if-not-exists on the index.
--
-- Rollback:
--   alter table public.project_events drop column if exists trace_id;
--   drop function if exists public.commit_chat_turn(uuid, jsonb, jsonb,
--     jsonb, text, jsonb, uuid, uuid);
--   -- then re-apply 0013 to restore the prior 7-arg signature.
-- ───────────────────────────────────────────────────────────────────────

-- ── Column add ──────────────────────────────────────────────────────────
alter table public.project_events
  add column if not exists trace_id uuid;

create index if not exists project_events_trace_idx
  on public.project_events (trace_id)
  where trace_id is not null;

-- ── RPC update ──────────────────────────────────────────────────────────
-- Drop the prior 7-arg signature. The new 8-arg version (with
-- p_trace_id defaulting to null) supersedes it. We DO NOT keep both
-- overloads — pg's overload resolution by named-arg call is fragile
-- and a dropped+recreated single signature is easier to reason about.
drop function if exists public.commit_chat_turn(uuid, jsonb, jsonb, jsonb, text, jsonb, uuid);
drop function if exists public.commit_chat_turn(uuid, jsonb, jsonb, jsonb, text, jsonb, uuid, uuid);

create or replace function public.commit_chat_turn(
  p_project_id        uuid,
  p_assistant_row     jsonb,
  p_new_state         jsonb,
  p_before_state      jsonb,
  p_event_reason      text,
  p_event_payload     jsonb,
  p_client_request_id uuid,
  p_trace_id          uuid default null      -- Phase 9 — joins audit to trace
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id    uuid;
  v_assistant_id uuid;
  v_existing_id uuid;
  v_caller      uuid := auth.uid();
begin
  -- Ownership check (security definer bypasses RLS, so we enforce here)
  if v_caller is null then
    raise exception 'unauthenticated' using errcode = 'P0001';
  end if;

  select owner_id into v_owner_id
  from public.projects
  where id = p_project_id;

  if v_owner_id is null then
    raise exception 'project_not_found' using errcode = 'P0002';
  end if;

  if v_owner_id <> v_caller then
    raise exception 'forbidden' using errcode = 'P0003';
  end if;

  -- Idempotency replay
  if p_client_request_id is not null then
    select id into v_existing_id
    from public.messages
    where project_id = p_project_id
      and role = 'assistant'
      and client_request_id = p_client_request_id
    limit 1;

    if v_existing_id is not null then
      return jsonb_build_object(
        'assistant_id', v_existing_id,
        'replayed',     true,
        'state',        (select state from public.projects where id = p_project_id)
      );
    end if;
  end if;

  -- Insert assistant message (unchanged from 0013)
  insert into public.messages (
    project_id,
    role,
    specialist,
    content_de,
    content_en,
    input_type,
    input_options,
    allow_idk,
    thinking_label_de,
    likely_user_replies,
    tool_input,
    client_request_id,
    model,
    input_tokens,
    output_tokens,
    cache_read_tokens,
    cache_write_tokens,
    latency_ms
  )
  values (
    p_project_id,
    'assistant',
    p_assistant_row ->> 'specialist',
    p_assistant_row ->> 'content_de',
    p_assistant_row ->> 'content_en',
    p_assistant_row ->> 'input_type',
    p_assistant_row -> 'input_options',
    coalesce(nullif(p_assistant_row ->> 'allow_idk', '')::boolean, true),
    p_assistant_row ->> 'thinking_label_de',
    p_assistant_row -> 'likely_user_replies',
    p_assistant_row -> 'tool_input',
    p_client_request_id,
    p_assistant_row ->> 'model',
    nullif(p_assistant_row ->> 'input_tokens', '')::int,
    nullif(p_assistant_row ->> 'output_tokens', '')::int,
    nullif(p_assistant_row ->> 'cache_read_tokens', '')::int,
    nullif(p_assistant_row ->> 'cache_write_tokens', '')::int,
    nullif(p_assistant_row ->> 'latency_ms', '')::int
  )
  returning id into v_assistant_id;

  update public.projects
     set state = p_new_state,
         updated_at = now()
   where id = p_project_id;

  -- Umbrella audit event — now carries trace_id
  insert into public.project_events (
    project_id,
    event_type,
    before_state,
    after_state,
    reason,
    triggered_by,
    trace_id
  )
  values (
    p_project_id,
    'turn_committed',
    p_before_state,
    p_new_state,
    coalesce(p_event_reason, 'continue'),
    'assistant',
    p_trace_id
  );

  -- Payload-driven events (plausibility warnings etc.) — also tagged
  if p_event_payload is not null and jsonb_typeof(p_event_payload) = 'array' then
    insert into public.project_events (
      project_id,
      event_type,
      before_state,
      after_state,
      reason,
      triggered_by,
      trace_id
    )
    select
      p_project_id,
      coalesce(elem ->> 'event_type', 'assistant.warning'),
      null,
      p_new_state,
      elem ->> 'reason',
      'assistant',
      p_trace_id
    from jsonb_array_elements(p_event_payload) as elem;
  end if;

  return jsonb_build_object(
    'assistant_id', v_assistant_id,
    'replayed',     false,
    'state',        p_new_state
  );
end;
$$;

grant execute on function public.commit_chat_turn(
  uuid, jsonb, jsonb, jsonb, text, jsonb, uuid, uuid
) to authenticated;

-- ───────────────────────────────────────────────────────────────────────
-- Verification queries (run post-apply):
--   1. \d public.project_events  -- trace_id should appear, type uuid, nullable
--   2. select pg_get_function_arguments('public.commit_chat_turn'::regproc);
--      -- should show 8 args ending in "p_trace_id uuid DEFAULT NULL"
--   3. The current Edge Function (still on 7-arg signature) should
--      keep working — calls resolve to this function with p_trace_id=null.
-- ───────────────────────────────────────────────────────────────────────
