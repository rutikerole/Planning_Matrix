# Data freshness pipeline

> Phase 6.5 — automated drift detection across the data slice's source URLs.
> Self-contained. Weekly. Zero-maintenance unless drift is detected.

## What it does

Every Sunday at 03:00 UTC (and on demand via `workflow_dispatch`), `.github/workflows/freshness-check.yml` runs `scripts/freshness-check.mjs`. The script:

1. Walks `data/` recursively and recursively collects every string value matching `^https?://`. Deduplicates.
2. For each unique URL, fetches the page (30 s timeout, 3 retries with exponential backoff on 5xx + network errors), normalises the body (strip HTML comments, `<script>`, `<style>`; lowercase; collapse whitespace), and SHA-256-hashes the result.
3. Compares the new fingerprint against the previous snapshot at `.github/freshness-snapshots/<sha-of-url>.json`. First-time URLs establish a baseline silently.
4. Emits one line per URL — `[CHANGED|UNCHANGED|UNREACHABLE] <url>` — plus a final summary.
5. Exits **0** if no drift, **1** if any URL changed (workflow opens a "drift" issue), **2** if any URL is persistently unreachable (workflow opens an "unreachable" issue).

Snapshot files committed back to `main` by the workflow. The freshness pipeline never modifies `data/**/*.json` — that gate is held by humans.

## Running locally

```bash
npm run freshness:report   # checks every URL, does NOT write snapshots
npm run freshness:check    # checks AND updates .github/freshness-snapshots/
```

`freshness:report` is the right tool for spot-checking what would change without committing anything.

## How `dataFreshAsOf` interacts

Every JSON instance under `data/` carries a `dataFreshAsOf` field — the date a human last verified its content. The system prompt's `AKTUALITÄT DER QUELLEN` clause (`legalContext/shared.ts`) instructs the model to surface a freshness disclosure when:

- a fact is materially load-bearing (concrete numbers, § citations, addresses), AND
- its `dataFreshAsOf` is more than 90 days old.

The disclosure is conditional, not a blanket disclaimer. Stammdaten (email, phone) doesn't trigger it unless the Bauherr is about to act on it.

The pipeline does **not** auto-update `dataFreshAsOf`. When you respond to a drift issue and verify the change is benign (or update the data slice to reflect a real change), bump `dataFreshAsOf` to today's date in the affected file(s).

## Interpreting a drift issue

The workflow opens an issue titled `[freshness] Source drift detected — YYYY-MM-DD` containing the script's full output. For each `[CHANGED]` URL:

1. **Open the URL in a browser.** Compare against the prior version (Wayback Machine, your own memory, or a `git log` of when the data slice was last updated for this source).
2. **Classify the change:**
   - **Meaningful** — numbers, dates, scope changed. Update the affected `data/**/*.json` file's content AND its `dataFreshAsOf`. If a Satzung novellation, also update the system prompt slice (`legalContext/{city}.ts`).
   - **Cosmetic** — page layout, footer link, unrelated banner. Just re-run `npm run freshness:check` so the new fingerprint becomes the baseline; no data change needed.
3. **Close the issue** with a short note on which class the change was and what you updated.

## Interpreting an unreachable issue

`[freshness] Sources unreachable — YYYY-MM-DD` lists URLs the script couldn't fetch after 3 retries. Two common cases:

- **Transient outage** — server was down at 03:00 UTC Sunday. Close the issue without action; next week's run will retest. The previous snapshot is preserved, so a transient outage doesn't trigger spurious change-detection.
- **Permanent move** — the URL has moved (HTTP 301 chain that times out, or 404). Update the URL in the source-of-truth file (typically `_meta/sources.json`) and re-run the check.

## Adding a new source URL

Just put it in any `data/**/*.json` file with any key — the script's recursive walker picks up every string starting with `http://` or `https://` automatically. No registration step. The first cron run after the URL appears will baseline it silently.

## False positives — handling cosmetic noise

The fingerprint is conservative on purpose. We strip `<script>`, `<style>`, and HTML comments, and we lowercase + collapse whitespace, but the body still includes:

- Any visible "last updated" timestamps the page itself renders
- ASP.NET viewstate hidden inputs
- Server-rendered CSRF tokens

Pages that render any of these in the visible body will trigger `CHANGED` even though nothing material changed. When you encounter one, the right response is **case-by-case**:

1. Open the URL, confirm the change is cosmetic.
2. Re-run `npm run freshness:check` — the new fingerprint becomes the baseline.
3. If the same URL keeps spuriously triggering week after week, consider extending the `normalise` rule in `scripts/freshness-check.mjs` to strip the offending element. Don't generalise prematurely — Phase 6.5 deliberately keeps the rule simple, and resists over-engineering.

## Why the pipeline opens issues, not auto-updates

The data slice is the **falsifiable ground truth** that grounds the product's accuracy claim. If we silently re-baselined every drift, we'd never know when a Satzung novellation happened, when an authority email changed, when a Bauamt URL moved. Drift is a signal that humans must read.

The system prompt's `AKTUALITÄT DER QUELLEN` clause is the user-facing surface; the GitHub issue is the operator-facing surface. Together they make staleness loud.

## Cost

Zero. GitHub Actions free tier covers 2,000 minutes/month for private repos and is unlimited for public repos. A weekly run takes ~10–25 minutes against ~170 URLs.

## Sibling pipeline

Phase 7 added the eval harness — a sibling pipeline that watches the **chatbot's behaviour** against the falsifiable test projects, complementing this pipeline's watch over **source URLs**. See `docs/eval-harness.md` for the operational model.
