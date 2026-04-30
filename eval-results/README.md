# `eval-results/`

> Phase 7 — committed eval-harness reports, one per run.

Each file is named by ISO timestamp (`YYYY-MM-DDTHHMMSS.md`) and contains the markdown output of `scripts/eval-harness/run.mjs`.

## Lifecycle

- **Cron runs (Monday 04:00 UTC):** `eval-harness.yml` workflow runs the harness, commits the report here, and pushes to main.
- **Manual runs (workflow_dispatch):** same as cron — committed for the audit trail.
- **Local runs:** also write to this directory by default. If you don't want to commit a local exploratory report, delete the file before staging or add `eval-results/2026-*-local-*.md` to your local-only ignore via `.git/info/exclude`.

The directory is intentionally NOT gitignored — committed reports give the project a longitudinal accuracy record useful for future audits and for diagnosing regressions ("did this start after commit X?").

## What a report contains

- Run metadata: timestamp, commit SHA, target Supabase URL, total tokens + USD
- Summary table: N / 7 passed
- Per-test section: ID, archetype, verdict, per-assertion outcomes, conversation transcript link
- Footer: how to reproduce locally
