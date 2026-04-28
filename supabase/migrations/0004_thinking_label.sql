-- ───────────────────────────────────────────────────────────────────────
-- 0004_thinking_label.sql
--
-- Phase 3.1 — persist the model's `thinking_label_de` per assistant
-- turn so the next turn's ThinkingIndicator can show the prior turn's
-- explicit hint (e.g. "Planungsrecht prüft den Bebauungsplan…")
-- instead of inferring from the previous message's body. Currently
-- the field is dropped server-side after each turn — this migration
-- gives it a home.
--
-- Apply path: Supabase Dashboard → SQL Editor → New query → paste →
-- Run. **Apply this migration BEFORE redeploying chat-turn**, otherwise
-- the function's INSERT into messages will fail with `column
-- "thinking_label_de" of relation "messages" does not exist`.
--
-- Idempotent? No. Safe to run on any project that has already
-- applied 0001 / 0002 / 0003 — `if not exists` makes the column
-- add forgiving on a re-run.
-- ───────────────────────────────────────────────────────────────────────

alter table public.messages
  add column if not exists thinking_label_de text;

-- No backfill — historical rows are fine without it. The
-- ThinkingIndicator falls back to the rotating-label loop in those
-- cases. RLS unchanged; existing select / insert policies cover the
-- new column transparently.
