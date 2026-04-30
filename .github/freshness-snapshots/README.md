# `.github/freshness-snapshots/`

Per-URL fingerprint snapshots produced by the Phase 6.5 data freshness pipeline (`.github/workflows/freshness-check.yml` + `scripts/freshness-check.mjs`).

Each file is named after the truncated SHA-256 of the source URL (16 hex chars) and contains:

```jsonc
{
  "url": "https://...",
  "fingerprint": "<sha-256 hex>",   // SHA-256 of the normalised page body
  "lastChecked": "YYYY-MM-DD",      // most recent run that fetched the URL
  "lastChanged": "YYYY-MM-DD",      // most recent run that observed a change
  "statusHistory": [                 // up to 12 recent checks, oldest first
    { "status": "UNCHANGED", "date": "YYYY-MM-DD" }
  ]
}
```

## Lifecycle

- **First run:** establishes baseline. New URLs are not flagged as drift — they have no prior fingerprint to compare against.
- **Weekly cron (Sundays 03:00 UTC):** runs the check, updates snapshots, opens a GitHub issue when any URL has changed (`exit 1`) or any URL is persistently unreachable (`exit 2`).
- **Drift response:** human review only. Auto-update of `data/**/*.json` files is intentionally not supported — silently re-baselining would erase the ground-truth signal.
- **Unreachable URLs:** the snapshot is **not** overwritten. The last-known-good fingerprint is preserved so a transient outage doesn't cause spurious change-detection on the next run.

## What lives here, what doesn't

This directory is committed to the repo so the cron job has a stable comparison point across runs. The files are tiny (≤ 1 KB each), so the overhead is negligible.

`AUDIT_REPORT.md`, the data slice itself, and the eval harness ground truth all live elsewhere — this directory is purely the freshness pipeline's working state.
