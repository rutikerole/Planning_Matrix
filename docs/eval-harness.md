# Eval harness

> Phase 7 — operational accuracy gate.
> Sibling document to `docs/data-freshness.md` (Phase 6.5).

## What it does

Every Monday at 04:00 UTC (and on demand via `workflow_dispatch`), `.github/workflows/eval-harness.yml` runs `scripts/eval-harness/run.mjs`. The script:

1. Signs in as a persistent test user (`eval-harness@planning-matrix.test`) via the Supabase Auth admin API.
2. Iterates over the 7 München test projects in `data/muenchen/test-projects/`.
3. For each test, creates a fresh project owned by the test user with the test's `input` payload, runs the test's `eval_conversation_script` against the chat-turn Edge Function (sequential, 2 s spacing), captures the assistant transcript + final `projectState`.
4. Asserts the captured state against the test's `expected_output` using 5 contracts (see `scripts/eval-harness/lib/assertions.mjs`).
5. Deletes the project (cascade-deletes its messages and project_events).
6. Renders a markdown report at `eval-results/<ISO-date>.md`, committed back to main by the workflow.

The harness exits non-zero on any per-test failure; the workflow opens an `[eval] Accuracy regression detected — YYYY-MM-DD` GitHub issue automatically.

## Operational model — eval vs. freshness

These two pipelines are siblings; they answer different questions.

| Pipeline | Cron | Watches | Failure mode | Action on failure |
|---|---|---|---|---|
| **Freshness check** | Sundays 03:00 UTC | The 174 source URLs in `data/` for content drift | Source content has changed since the last verified snapshot | Open `[freshness] Source drift detected` issue. Human reviews and either updates the data slice + `dataFreshAsOf`, or re-baselines (cosmetic-only change). |
| **Eval harness** | Mondays 04:00 UTC | The chatbot's behaviour against the 7 München test projects' falsifiable assertions | Chatbot's output no longer satisfies one or more of `must_contain_facts`, `must_contain_recommendations_anchors`, `must_not_contain`, `expected_specialist_voices_at_least`, `completion_signal` | Open `[eval] Accuracy regression detected` issue. Human diagnoses root cause (prompt drift, model change, data slice change, unrelated bug) and fixes the cause — never the test or the prompt to game the measurement. |

Together they form the operational accuracy claim:

- Freshness verifies that the **inputs** (the source URLs grounding the data slice) haven't moved.
- Eval verifies that the **chatbot's outputs** still align with the falsifiable expected behaviour for each archetype.

The data slice itself sits between them: the freshness check confirms it stays grounded in real sources; the eval harness confirms the chatbot continues to reflect what's in the data slice.

## Why no auto-update on either pipeline

Both pipelines deliberately stop at "open an issue." Auto-updating either would silently re-baseline our ground truth — exactly the kind of drift these systems are designed to catch.

The data slice is the **falsifiable** truth. Falsifiable means a human writes down what's expected, the system measures reality against it, and disagreement requires human judgement. Robotic re-baselining would convert the system from a measurement instrument into a rubber-stamp.

## Adding a new test project

Out of scope for Phase 7. The 7 archetypes (Innenstadt, Außenbereich, Sanierung, Umnutzung, Sonderbau, Bauturbo eligibility, Denkmal) cover the v1 surface. Adding more is a separate decision; if you do:

1. Add `data/muenchen/test-projects/NN-<archetype>.json` with the same structure as the existing 7
2. Author its `eval_conversation_script` with 4–6 turns that surface its `must_contain_*` assertions
3. Re-run `npm run eval:run` locally to confirm the new test integrates cleanly
4. Note: each new test adds ~5 turns; total stays well under the 50/user/hour rate limit until you reach ~10 tests

## Setup checklist

Before the first run (cron or manual):

- [ ] Generate `EVAL_HARNESS_TEST_USER_PASSWORD` via `openssl rand -hex 24`
- [ ] Set the three GitHub Secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `EVAL_HARNESS_TEST_USER_PASSWORD`
- [ ] Trigger a manual run via Actions → "eval harness" → "Run workflow"
- [ ] Watch the run complete (~10–20 min)
- [ ] Review the committed report at `eval-results/<runId>.md`
- [ ] If the report shows N < 7 passed: that's the harness doing its job — diagnose, don't paper over

For local development, copy `scripts/eval-harness/.env.local.example` to `.env.local` and fill in the same three values.

## Cost

Per full run (7 tests × 5 turns × ~1 k tokens average, with prompt cache hot): ~50 k tokens / ~0.20 USD. Weekly cost: ~0.80 USD/month. Negligible.

GitHub Actions: ~25 minutes per run × 4 runs/month = 100 minutes/month. Free tier covers 2,000 minutes for private repos and is unlimited for public.
