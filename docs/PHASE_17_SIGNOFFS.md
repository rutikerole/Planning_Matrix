# Phase 17 — Signoffs Ledger

> Single source of truth for v1.0 tag preconditions. Filled by the
> manager during Week 3. Tag command runs only when every row in
> sections 1–4 is green; section 5 records the tag itself.

## 1. Manager signoff on the three handoff docs

| Doc                              | Reviewer | Date | Initial |
| -------------------------------- | -------- | ---- | ------- |
| `docs/DEPLOYMENT.md`             | `<MANAGER_NAME>` | _ | _ |
| `docs/OPS_RUNBOOK.md`            | `<MANAGER_NAME>` | _ | _ |
| `docs/HANDOFF.md`                | `<MANAGER_NAME>` | _ | _ |

## 2. Counsel signoff on legal pages

| Page                              | Reviewer | Date | Initial | Substantive change required? |
| --------------------------------- | -------- | ---- | ------- | ----------------------------- |
| `src/features/legal/pages/ImpressumPage.tsx`   | `<COUNSEL_NAME>` | _ | _ | _ |
| `src/features/legal/pages/AgbPage.tsx`         | `<COUNSEL_NAME>` | _ | _ | _ |
| `src/features/legal/pages/DatenschutzPage.tsx` | `<COUNSEL_NAME>` | _ | _ | _ |
| `src/features/legal/pages/CookiesPage.tsx`     | `<COUNSEL_NAME>` | _ | _ | _ |

If "substantive change required" reads YES on any row: file an
engineering ticket; counsel feedback drives the edit; re-circulate
for signoff. Tag waits.

## 3. DPA ledger snapshot at tag

Cross-walk against `docs/PHASE_17_DPA_LEDGER.md` — every row's
Status column must read **signed** OR **expected by `<date>`**.
Both are acceptable for tag per the v1.0 precondition rules.

| Sub-processor | Status at tag | Expected by (if pending) |
| ------------- | ------------- | ------------------------ |
| Anthropic, PBC                | _ | _ |
| Supabase Inc.                 | _ | _ |
| Vercel Inc.                   | _ | _ |
| Functional Software (Sentry)  | _ | _ |
| PostHog Inc.                  | _ | _ |

## 4. 72-point smoke walk closure

Cross-walk against `docs/PHASE_17_SMOKE_CHECKLIST.md`:

- [ ] Desktop Chrome 18/18 ✓
- [ ] Desktop Safari 18/18 ✓
- [ ] iPhone 13 ≥ 17/18 ✓ (NA documented for any failed cells)
- [ ] Pixel 5 ≥ 17/18 ✓ (NA documented for any failed cells)

| Reviewer | Date | Initial |
| -------- | ---- | ------- |
| `<MANAGER_NAME>` | _ | _ |

## 5. Daily-gate evidence at the tag commit

Run on tag day, paste outputs verbatim:

```
$ npm run verify:bayern-sha
<output>
```

```
$ npm run smoke:citations
<output>
```

```
$ npx tsc --noEmit -p .
<output>
```

```
$ npm run build
<output>
```

## 6. 7-consecutive-night smoke window

Per the locked precondition: `npm run smoke:citations` green for
seven consecutive nights immediately before the tag commit. If
any night fires red, the window resets. Track here:

| Night # | Date | Result | Initial |
| ------- | ---- | ------ | ------- |
| 1 | _ | _ | _ |
| 2 | _ | _ | _ |
| 3 | _ | _ | _ |
| 4 | _ | _ | _ |
| 5 | _ | _ | _ |
| 6 | _ | _ | _ |
| 7 | _ | _ | _ |

## 7. Tag itself

Once every row above is green:

```sh
# Confirm one last time:
git status                 # clean working tree
git log -1                 # tag commit's SHA noted below

# Tag (full annotation in PHASE_17_SCOPE.md § "v1.0 tag — THE delivery event"):
git tag -a v1.0 -m "Planning Matrix v1.0 — delivered to client. ..."
git push --tags
```

| Tag commit SHA | Tagged by | Date | Initial |
| -------------- | --------- | ---- | ------- |
| _              | _         | _    | _       |

After this row is filled, **the project is delivered.** Phase 17
closes; the contract scope is complete. No v2 work is proposed.
