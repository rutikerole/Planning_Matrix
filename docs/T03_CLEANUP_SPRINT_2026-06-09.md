# T-03 Cleanup Sprint — 2026-06-09

Branch: `fix/t03-cleanup` (off `main`). **NOT merged, NOT deployed** — awaiting your confirmation.
Bayern composed-prefix SHA `ed6f109e…b9d746` — **MATCHED at start AND end** (no re-baseline).

Triggered by the Sachsen/Dresden T-03 (Renovation Königstraße) walk.

**Redeploy summary: NO `supabase functions deploy chat-turn` needed this sprint.** P1 is frontend;
P2 is report-only (no code change); P3 is verify-only (no change). Nothing touched an edge-fn file.

---

## P1 — Specialist deduplication on Team tab + PDF · **fixed (frontend)**

**Symptom (Sachsen PDF p8 / At-a-Glance):** duplicate specialist cards — "Building-permit-authorised
architect (Saxony) · § 65 SächsBO" **and** "Architect · licensed under § 65 SächsBO"; "Energy
consultant (GEG)" **and** "Energy consultant". "Specialists needed: 6" was inflated; real distinct
roles ≈ 4.

**Root cause (`src/features/result/lib/resolveRoles.ts`):** the union floor deduped the baseline
against the persona by **exact normalized title**. The persona emits *richer* titles than the
baseline ("Building-permit-authorised architect (Saxony)" → `buildingpermitauthorisedarchitectsaxony`
vs baseline "Architect" → `architect`), so the title match missed and **both** the persona and the
baseline card for the same function rendered.

**Fix:** dedupe by **role-function**, not title. Added `roleFunction(r)` — classifies a role
(architect / structural / energy / authority / surveyor / fire / acoustics) by its canonical baseline
id, else by title keywords (specific functions tested before the generic "architect" catch), and
returns `null` for unrecognised roles. `dedupeByFunction([...persona, ...baseline])` keeps one card
per function (**persona-first wins** on content + its `needed` flag — the established "persona wins,
baseline fills gaps" rule, re-keyed from title to function); `null`-function roles are kept **distinct**
so a genuinely separate specialist (Schadstoffgutachter, Denkmalpflege, Prüfsachverständige) is never
dropped. The P2 structural-needed force from last sprint still runs after and is preserved.

**Specialist count** = `roles.filter(needed).length`, so it now reflects distinct roles.

**Regression-checked:** classifier verified safe on real titles (only the real Vermesser matches
"surveyor"; hazmat/heritage/Prüfsachverständige classify `null` and survive). The structural-engineer
NEEDED fix is preserved (forceStructural acts on the single deduped structural card).

**Test:** `smoke:thin-state` (+24 assertions, 80/80) — swept across {sachsen, mv, berlin, bw} ×
{sanierung, neubau}: no two cards share a role-function; architect + energy each render at most once;
a null-function specialist is not dropped.

---

## P2 — Streaming-retry failure ("Letzte Anfrage nicht abgeschlossen") · **investigated; NO fix applied (honest)**

**The failure PATH is real and code-verified. This specific instance is NOT reproduced and is most
likely transient. The system already recovers gracefully and idempotently. I deliberately did not
ship a speculative change — especially in this retry path, which is the same area as the
recently-fixed double-submit bug.**

Verified facts (quoted code):
- `anthropic.ts:47` `ABORT_TIMEOUT_MS = 50_000`; `:171` SDK `maxRetries: 0`. **But** the edge fn's
  own `callAnthropicWithRetry` (`:373`) retries `RETRYABLE_CODES` (incl. `timeout`) **3× server-side**
  (`retryPolicy.ts`: `MAX_ATTEMPTS=3`, backoff `0/2/6s`).
- Commit order (`index.ts`): user message committed at `:264` (idempotent on `client_request_id`) →
  Anthropic at `:378` → assistant + state committed atomically only on success at `:599`. So a failure
  **orphans** the user row by design — precisely so a retry with the same `client_request_id` is
  idempotent.
- Client auto-retries **only** `model_response_invalid` (`useChatTurn.ts:202`); a timeout / stream
  drop throws → the orphaned user row → `RecoveryBanner.tsx` renders "Letzte Anfrage nicht
  abgeschlossen" once the last message is `user` and ≥60s old. The retry reuses the same
  `client_request_id` → the server dedupes (no double-write).

**Conclusion:** the banner is the system **correctly** surfacing a genuine orphan, with an idempotent
one-click recovery. The one walk instance is consistent with transient Anthropic slowness/overload
(exhausting the 3 server-side retries) or a one-off stream drop — I cannot force a live 50s×3 timeout
from here, so I will not invent a fix for it.

**Why not the "obvious" fixes:**
- *Atomic transaction / roll back the user message on timeout* — **worse**: the eager user-commit is
  intentional; rolling it back removes the very row the idempotent recovery retries from.
- *Client auto-retry on timeout* — **redundant** (the edge fn already retried `timeout` 3×; a 4th
  client attempt hits the same unavailable upstream) **and risky** (it touches the double-submit
  retry path the brief says not to regress).

**Latent observation (flagged, not fixed):** 3 attempts × 50s + backoff (0+2+6) ≈ **158s** can exceed
the edge function's ~150s wall-clock budget — if all 3 attempts time out, the platform may kill the
function mid-flight (a hard drop) instead of returning a clean 504. If telemetry shows this recurs,
the targeted change is to fit the retry budget under the wall (e.g. `MAX_ATTEMPTS=2` or a lower
per-attempt timeout) — an **edge-fn** change (needs redeploy) that deserves its own commit + telemetry,
not a speculative bundle here.

**Side, if ever fixed:** edge-fn (`anthropic.ts`/`index.ts`) → would need redeploy. None applied.

---

## P3 — SächsBO citation corpus spot-check · **verified correct, no fix**

All §§ the Sachsen walk emitted exist in the corpus with exact matching headings:

| Citation | Corpus heading | OK |
|---|---|---|
| SächsBO § 12 | Standsicherheit | ✅ |
| SächsBO § 14 | Brandschutz | ✅ |
| SächsBO § 63 | Vereinfachtes Baugenehmigungsverfahren | ✅ |
| SächsBO § 65 | Bauvorlageberechtigung | ✅ |
| SächsBO § 66 | Bautechnische Nachweise | ✅ |
| SächsBO § 68 | Bauantrag, Bauvorlagen | ✅ |

`audit:allowlist` for Sachsen: **36 verified · 0 uncheckable · 0 blocking.** No fix needed.
(DVOSächsBO § 3, cited 3× on the walk, is **out-of-corpus** → unverifiable, deferred per the brief.)

---

## Gates (all green on `fix/t03-cleanup`)

- `tsc --noEmit` ✅ · `tsc -b` ✅ · `npm run build` ✅ (bundle 293.7/300 KB gz)
- `verify:citations:strict` ✅ · `audit:allowlist` ✅ (Sachsen 36·0, 0 blocking) · `verify:concept-citations` ✅
- `audit-heading-match.mts` ✅ (no semantic mismatches)
- `smoke:citations` ✅ 221/221 · `smoke:pdf-matrix` ✅ 16/16 · `smoke:pdf-text` ✅ 386/0
- `smoke:thin-state` ✅ **80/80** (incl. new specialist-dedup assertions + the Sachsen/MV procedure-propagation + BW § 52 pins)
- `smoke:double-submit` ✅ 8/8
- **Bayern SHA `ed6f109e…` — MATCH at start AND end**

---

## Confirmed wins NOT regressed (re-checked)

Thin-state procedure propagation (§ 63 CALCULATED — Sachsen + MV pinned), structural-engineer NEEDED,
P1 cost stub, P0 firewall, double-submit dedupe, § 48 GEG path, asbestos-on-pre-1995, GK-unchanged,
zero deep-state bleed, preliminary banner, substantive BW § 52 propagation.

---

## Explicitly deferred (not touched, per brief)

- Timeline divergence (executive "~6mo" vs Gantt ≈22wk vs header "4–6mo") — re-touches the
  386-assertion PDF smoke; own sprint.
- Thin-state GK / building-class capture — honest "not recorded" behind the banner; not a bug.
- Out-of-corpus existence-checking for procedure-ordinances / monument law (DVOSächsBO, SächsDSchG,
  BauVorlVO, DSchG, LBOVVO) — the structural gate gap from two sprints ago; own sprint. DVOSächsBO § 3
  (3× this walk) is unverifiable for the same reason.
- P2 edge-fn retry-budget-vs-wall (above) — flagged, telemetry-gated, own commit.

---

## Commits on `fix/t03-cleanup`

```
(P1)  fix(t03-cleanup): dedupe specialists by role-function (no duplicate cards, honest count)
(doc) docs(t03-cleanup): sprint report — P1 fix, P2 investigation (no fix), P3 SächsBO sweep
```
