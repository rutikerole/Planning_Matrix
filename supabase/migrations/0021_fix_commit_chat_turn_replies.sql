-- ───────────────────────────────────────────────────────────────────────
-- 0021_fix_commit_chat_turn_replies.sql
--
-- Restores the 0014 cast on `likely_user_replies` that 0016 dropped.
--
-- 0014 fixed a JSONB → text[] mismatch: `messages.likely_user_replies`
-- is `text[]` (added in 0005). The bare `p_assistant_row -> 'likely_user_replies'`
-- expression returns JSONB, which Postgres will not implicitly cast,
-- so every assistant turn that emits replies fails with:
--
--   column "likely_user_replies" is of type text[] but
--   expression is of type jsonb (SQLSTATE 42804)
--
-- 0016 redefined `commit_chat_turn` to add `p_trace_id` and — per its
-- own comment "unchanged from 0013" — copy-pasted 0013's body, silently
-- reverting 0014's CASE-based unbox. The wizard's first-turn priming
-- and every subsequent question turn that includes suggestions has
-- been failing with HTTP 500 since 0016 was applied.
--
-- This migration drops and re-creates `commit_chat_turn` with the
-- 0014 fix preserved on top of 0016's 8-arg signature. The body is
-- otherwise byte-identical to 0016. No schema or contract change.
--
-- Apply path: Supabase Dashboard → SQL Editor → paste → Run.
--   Or locally: `supabase db push` (against your local stack).
-- Idempotent: drop-then-create on the function.
--
-- Rollback: re-apply 0016 (the broken version) — not recommended.
-- ───────────────────────────────────────────────────────────────────────

drop function if exists public.commit_chat_turn(
  uuid, jsonb, jsonb, jsonb, text, jsonb, uuid, uuid
);

create or replace function public.commit_chat_turn(
  p_project_id        uuid,
  p_assistant_row     jsonb,
  p_new_state         jsonb,
  p_before_state      jsonb,
  p_event_reason      text,
  p_event_payload     jsonb,
  p_client_request_id uuid,
  p_trace_id          uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id     uuid;
  v_assistant_id uuid;
  v_existing_id  uuid;
  v_caller       uuid := auth.uid();
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

  -- Insert assistant message
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
    -- 0021 (= 0014 fix re-applied): unbox JSONB array → text[].
    -- `messages.likely_user_replies` is text[]; the `->` operator
    -- returns jsonb, which Postgres will not implicitly cast. The
    -- CASE guards null/absent/non-array (e.g. address opener has
    -- no replies; the model omits the field there).
    case
      when jsonb_typeof(p_assistant_row -> 'likely_user_replies') = 'array'
        then array(
          select jsonb_array_elements_text(p_assistant_row -> 'likely_user_replies')
        )
      else null
    end,
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

  -- Umbrella audit event — carries trace_id (Phase 9, 0016)
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
-- Verification (post-apply):
--   1. select pg_get_functiondef('public.commit_chat_turn'::regproc);
--      -- the inserted `likely_user_replies` value should be the
--      --   case-when jsonb_typeof / jsonb_array_elements_text block.
--   2. Trigger any wizard turn that emits suggestions and confirm
--      the row commits without SQLSTATE 42804.
-- ───────────────────────────────────────────────────────────────────────
