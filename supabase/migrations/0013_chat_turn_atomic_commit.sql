-- ───────────────────────────────────────────────────────────────────────
-- 0013_chat_turn_atomic_commit.sql
--
-- Phase 8.6 (B.3) — atomic commit for chat-turn assistant write +
-- project state update + audit event.
--
-- Background: prior to this migration, the Edge Function
-- (`supabase/functions/chat-turn/index.ts`) executed three sequential
-- writes after the Anthropic call:
--   1. insertAssistantMessage  → INSERT INTO messages
--   2. updateProjectState      → UPDATE projects SET state = ...
--   3. logTurnEvent            → INSERT INTO project_events
-- Each ran as its own REST round-trip via supabase-js. A network
-- failure between steps 1 and 2 left the database with an assistant
-- message but stale project state — the result page would render
-- inconsistent data.
--
-- This migration adds `commit_chat_turn(...)` which performs all three
-- writes inside a single PostgreSQL transaction. The Edge Function
-- (commit 5 of this sweep) replaces the sequential block with a
-- single supabase.rpc('commit_chat_turn', { ... }) call.
--
-- Idempotency: the user-message insert (step 0 in the Edge Function,
-- happens BEFORE Anthropic) keeps its existing partial-unique-index
-- idempotency on `messages(project_id, client_request_id)`. This
-- function adds a parallel check: if an assistant message already
-- exists for the given p_client_request_id, return the existing
-- assistant id + current project state without writing anything. So
-- a retry with the same client_request_id after a partial commit
-- becomes a no-op + read.
--
-- Apply path: Supabase Dashboard → SQL Editor → New query → paste → Run.
-- After applying, deploy the chat-turn function (commit 5).
--
-- Idempotent? Yes. The DROP FUNCTION + CREATE OR REPLACE FUNCTION
-- pattern lets you re-run safely. Re-applying on a clean DB is safe;
-- re-applying after a partial apply is also safe.
--
-- Rollback: drop function public.commit_chat_turn(uuid, jsonb, jsonb,
-- jsonb, text, jsonb, uuid). The Edge Function's pre-RPC implementation
-- still works — but you must also revert the Edge Function commit
-- (commit 5) before dropping the function, otherwise live turns will
-- error.
-- ───────────────────────────────────────────────────────────────────────

-- Drop the prior function signature if it exists, so this migration
-- can be re-applied during development. Production runs once.
drop function if exists public.commit_chat_turn(uuid, jsonb, jsonb, jsonb, text, jsonb, uuid);

create or replace function public.commit_chat_turn(
  p_project_id        uuid,
  p_assistant_row     jsonb,
  p_new_state         jsonb,
  p_before_state      jsonb,
  p_event_reason      text,
  p_event_payload     jsonb,
  p_client_request_id uuid
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
  -- ── Authentication + ownership check ────────────────────────────────
  -- security definer means this function runs with elevated privileges,
  -- so we MUST check ownership manually. RLS on the underlying tables
  -- doesn't apply within a security-definer function body.
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

  -- ── Idempotency replay ──────────────────────────────────────────────
  -- If an assistant message for this client_request_id already exists,
  -- return its id + the current state without writing. This handles
  -- the rare case where the previous attempt's network failed AFTER
  -- the transaction committed but BEFORE the SPA got the response.
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

  -- ── Insert assistant message ────────────────────────────────────────
  -- Mirrors the columns insertAssistantMessage (persistence.ts) wrote
  -- pre-RPC: full message-row shape including thinking_label_de and
  -- likely_user_replies (added Phase 3.1 + 3.4 respectively).
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

  -- ── Update project state (single column on a single row — atomic) ───
  update public.projects
     set state = p_new_state,
         updated_at = now()
   where id = p_project_id;

  -- ── Append audit event ──────────────────────────────────────────────
  -- Every turn appends one audit row with the before/after state so
  -- the Inspect Data Flow modal (Phase 8.3) can show the diff.
  insert into public.project_events (
    project_id,
    event_type,
    before_state,
    after_state,
    reason,
    triggered_by
  )
  values (
    p_project_id,
    'turn_committed',
    p_before_state,
    p_new_state,
    coalesce(p_event_reason, 'continue'),
    'assistant'
  );

  -- ── Optional payload-driven events (D.4 plausibility warnings etc.) ─
  -- p_event_payload is an array of { event_type, reason } objects. The
  -- Edge Function passes plausibility warnings here; this loop appends
  -- them inside the same transaction so warnings can't be lost on a
  -- partial commit.
  if p_event_payload is not null and jsonb_typeof(p_event_payload) = 'array' then
    insert into public.project_events (
      project_id, event_type, before_state, after_state, reason, triggered_by
    )
    select
      p_project_id,
      coalesce(elem ->> 'event_type', 'assistant.warning'),
      null,
      p_new_state,
      elem ->> 'reason',
      'assistant'
    from jsonb_array_elements(p_event_payload) as elem;
  end if;

  return jsonb_build_object(
    'assistant_id', v_assistant_id,
    'replayed',     false,
    'state',        p_new_state
  );
end;
$$;

-- Allow authenticated users to call the function. The body's own
-- ownership check (auth.uid() vs projects.owner_id) is the gate.
grant execute on function public.commit_chat_turn(
  uuid, jsonb, jsonb, jsonb, text, jsonb, uuid
) to authenticated;
