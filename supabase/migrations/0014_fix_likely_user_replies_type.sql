-- ───────────────────────────────────────────────────────────────────────
-- 0014_fix_likely_user_replies_type.sql
--
-- Phase 7.10f — fix `commit_chat_turn` so it casts the assistant
-- row's `likely_user_replies` JSONB array into a real Postgres
-- text[] before inserting into `messages.likely_user_replies`.
--
-- Why this exists
-- ────────────────
-- 0013 inserted likely_user_replies via:
--
--     p_assistant_row -> 'likely_user_replies'
--
-- The `->` operator returns `jsonb`. The destination column
-- `messages.likely_user_replies` is `text[]`. Postgres rejects the
-- implicit cast with:
--
--     column "likely_user_replies" is of type text[] but
--     expression is of type jsonb
--
-- Every wizard-→-chat priming call therefore raised SQLSTATE 42804,
-- the Edge Function returned HTTP 500, the spa landed on the chat
-- workspace with no first assistant message, and a downstream
-- React/i18n crash followed (caught by ErrorBoundary).
--
-- The fix is column-side: keep `likely_user_replies` as text[] (it
-- IS a list of suggested next user replies — that's the right
-- type), and convert the inbound JSONB array to text[] at insert
-- time. Edge Function does not need to change — it already passes
-- the right shape (an array of strings inside the assistant_row
-- JSONB blob), Postgres just has to be told to unbox it.
--
-- Apply path
-- ──────────
-- Supabase Dashboard → SQL Editor → New query → paste this entire
-- file → Run. The function is replaced atomically; existing live
-- traffic finishes against the old definition and new traffic
-- picks up the new one.
--
-- Idempotent? Yes. `create or replace function` is safe to re-run.
-- The function signature is unchanged — same 7 args, same return
-- type — so dependent grants are preserved. No need to re-grant.
--
-- Rollback
-- ────────
-- Re-apply 0013 (which has the buggy cast). Roll back the Edge
-- Function deploy to a commit prior to e1890cd ("B.3 — Edge
-- Function uses commit_chat_turn RPC + RecoveryBanner") at the
-- same time, otherwise live turns will hit the bug again.
-- ───────────────────────────────────────────────────────────────────────

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
  -- 0014 fix: likely_user_replies is text[] in the messages table.
  -- The `->` operator returns jsonb, which Postgres won't implicitly
  -- cast to text[]. We unbox the JSONB array into a real text[] using
  -- jsonb_array_elements_text. The CASE guards against the field
  -- being null/absent/non-array (e.g. the address opener has no
  -- replies; the model omits the field).
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

  -- ── Update project state ────────────────────────────────────────────
  update public.projects
     set state = p_new_state,
         updated_at = now()
   where id = p_project_id;

  -- ── Append audit event ──────────────────────────────────────────────
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

  -- ── Optional payload-driven events ──────────────────────────────────
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

-- Grants from 0013 carry over because we used create-or-replace
-- with the same signature. No re-grant needed.
