-- ───────────────────────────────────────────────────────────────────────
-- 0005_likely_user_replies.sql
--
-- Phase 3.4 #54 — persist the model's `likely_user_replies` per
-- assistant turn so suggested-reply chips render above the input bar
-- on free-text questions. The field is optional in the respond tool
-- schema; rows where the model omits it stay NULL.
--
-- Apply path: Supabase Dashboard → SQL Editor → New query → paste →
-- Run. **Apply this migration BEFORE redeploying chat-turn**, otherwise
-- the function's INSERT into messages will fail with `column
-- "likely_user_replies" of relation "messages" does not exist`.
--
-- Idempotent? Yes — `if not exists` makes the column add forgiving on
-- a re-run.
-- ───────────────────────────────────────────────────────────────────────

alter table public.messages
  add column if not exists likely_user_replies text[];

-- No backfill — historical rows stay NULL. SuggestedReplies component
-- renders nothing when the field is null/empty, identical to today's
-- behaviour. RLS unchanged; existing select / insert policies cover
-- the new column transparently.
