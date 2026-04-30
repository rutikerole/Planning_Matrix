# `scripts/eval-harness/`

> Phase 7 — operational eval harness for the 7 München test projects.
> Asserts every claim in their `expected_output` against the live deployed chat-turn Edge Function.

## What it does

For each of the 7 München test projects in `data/muenchen/test-projects/`:

1. Signs in as the persistent test user (`eval-harness@planning-matrix.test`).
2. Creates a fresh project owned by that test user with the test's `input` payload.
3. Runs the test's `eval_conversation_script` turn-by-turn against the chat-turn Edge Function (sequential, 2 s spacing).
4. Asserts the final `projectState` and the assistant transcript against the test's `expected_output` (`must_contain_facts`, `must_contain_recommendations_anchors`, `must_not_contain`, `expected_specialist_voices_at_least`, `completion_signal`).
5. Deletes the project (cascade-deletes its messages + project_events).
6. Aggregates results into a markdown report at `eval-results/<ISO-date>.md`.

The harness exits non-zero if any test failed; the GitHub Actions workflow at `.github/workflows/eval-harness.yml` opens an `[eval] Accuracy regression detected` issue on the next run.

## Local run

```bash
cp scripts/eval-harness/.env.local.example .env.local
# fill in the three values (see "Secrets" below)

npm run eval:run                                    # all 7 tests
npm run eval:run -- --single 01-maxvorstadt-innenstadt
npm run eval:dry-run                                # infra-only smoke; no chat-turn calls
```

The harness uses Node 20+ built-ins only — no `npm install` needed beyond the repo's existing dependencies.

## Secrets

Three environment variables are required. In CI they live in GitHub Repository Secrets; locally they live in `.env.local` (gitignored).

| Variable | Where to find it | Notes |
|---|---|---|
| `SUPABASE_URL` | Supabase Dashboard → Settings → API → Project URL | Production project, e.g. `https://abcdefgh.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Settings → API → service_role key | **POWERFUL — never log, never commit, never paste into chat.** Used only for Auth admin (test-user create / find) and as the `apikey` header. |
| `EVAL_HARNESS_TEST_USER_PASSWORD` | Generate with `openssl rand -hex 24`, store once | Locks the test user's password. Rotate by deleting the user via service-role and re-creating with a new password. |

**To set GitHub Secrets:** Repo → Settings → Secrets and variables → Actions → New repository secret. Add all three with the names above.

## Test user

- Email: `eval-harness@planning-matrix.test` (`.test` TLD per RFC 6761; cannot collide with real customer emails).
- Created automatically on first run via the Auth admin API.
- Reused across runs — we do not delete the auth user between runs.
- Owns its own RLS-isolated rows; per-run cleanup deletes its projects (which cascade to messages and project_events via FK).

## Production isolation

- The harness runs against the deployed Supabase + Edge Function in production. There is no separate eval environment.
- Every chat-turn call goes through the test user's JWT, so RLS gates everything just like a real user. Service-role is used only for Auth admin operations.
- The harness consumes real Anthropic tokens. With the prompt cache hot, a full 7-test run is ~50 k tokens / ~$0.20.
- Rate limit (50 turns/user/hour from migration 0008) bounds the harness: ~28–35 turns per run is comfortable; running twice within an hour will hit the limit.

## Interpreting a failed run

A test fails if **any** of its 5 assertion contracts fails. The markdown report records per-assertion outcomes, so you can tell whether the failure is:

- **Fact regression** — `must_contain_facts` mismatch on key/value/source/quality
- **Anchor regression** — `must_contain_recommendations_anchors` not surfaced in the recommendations
- **Forbidden contamination** — `must_not_contain` substring leaked (most often: cross-city or `ÖbVI` slip)
- **Voice regression** — `expected_specialist_voices_at_least` floor not met
- **Completion regression** — final `completion_signal` differs from expected

Do **not** modify the test or the system prompt to make the assertion pass. The brief locks this — the assertions are the falsifiable truth being measured. Diagnose the root cause first.

## Files

```
scripts/eval-harness/
├── README.md                   ← this file
├── .env.local.example          ← template for local dev
├── run.mjs                     ← entry point
└── lib/
    ├── config.mjs              ← env loading + validation
    ├── auth.mjs                ← Auth admin API + sign-in
    ├── project.mjs             ← create / delete projects
    ├── chat.mjs                ← chat-turn driver (Commit 2)
    ├── assertions.mjs          ← 5 §B contracts (Commit 3)
    └── report.mjs              ← markdown report (Commit 4)
```

## Files outside this directory

- `data/muenchen/test-projects/*.json` — the 7 test projects, including their `eval_conversation_script` arrays
- `data/erlangen/_meta/schema.json` — the schema additively extended to allow `eval_conversation_script`
- `eval-results/<ISO-date>.md` — committed reports, one per run
- `.github/workflows/eval-harness.yml` — weekly Monday cron + manual workflow_dispatch
