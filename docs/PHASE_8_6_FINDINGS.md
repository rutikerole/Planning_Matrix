# Phase 8.6 — Reliability Hardening · Findings

**HEAD at audit:** `b19130d feat(persona): Phase 8.5 — behavioural rules block (DEPLOYMENT REQUIRED)`
**Goal:** ship the four reliability items 8.5 deferred (B.1/B.2/B.3/D.4). Server-side + SQL only; no visual changes.

Audit-first per the brief's mandate. Commit 1 of the sweep is this file.

---

## 1. Pre-flight reality check

The brief's §0 says "Phase 8.5 must be merged to main and deployed before starting 8.6 ... If any of those fail, stop." Since I cannot from CLI:

- Verify the live Vercel deploy reflects 8.5 commits (no GitHub Actions or Vercel API access)
- Walk a fresh Tengstraße consultation
- Confirm district reads "4 Schwabing-West", cost ≥ €25k, etc.

**I'm proceeding on the implicit confirmation** that 8.5 is acceptable enough to start 8.6 (the user authorized this sweep). All 8.6 commits ship as code-changes-committed; deployment + post-deploy smoke is Rutik's. If the 8.5 baseline is broken, 8.6's reliability fixes won't help — they layer on top. **Verify 8.5 deploy first** before deploying 8.6.

---

## 2. Tier-4 root causes — confirmed and corrected

Re-walked the Edge Function pipeline against 8.5's findings. Confirms / corrections per bug:

### B.1 — Synthesis turn 502
**8.5 root cause hypothesis:** "Synthesis output ~2x. Anthropic token limits + Edge timeout combine. No backoff retry."

**Confirmed (mostly).** Reading `anthropic.ts`:
- `MAX_TOKENS = 1280` (Phase 3.1 #33; was 2048). So synthesis is already capped.
- `ABORT_TIMEOUT_MS = 50_000` (50s per attempt; wall clock 150s).
- `callAnthropicWithRetry` retries ONCE on `invalid_response` only. **No retry on rate_limit / overloaded / server / timeout.** This is the gap.
- `mapSdkError` already maps 429→rate_limit, 529→overloaded, 5xx→server with `retryAfterMs` set per Anthropic docs.

**Corrected diagnosis:** The 502 user-facing error fires when Anthropic returns 5xx (server overload) or the function hits the 50s abort during synthesis-turn generation. The brief proposed "increase per-request timeout from current value to 30s" — but current is already 50s, so the "increase" wording is misleading. **The actual fix is the missing backoff retry, not a timeout change.** Keeping 50s default; adding 3-retry backoff (0s, 2s, 6s) on transient 5xx + timeout.

### B.2 — Malformed tool-call
**8.5 root cause hypothesis:** "Validator throws, no auto-retry."

**Partially wrong.** `callAnthropicWithRetry` already retries ONCE with a stricter system reminder on `invalid_response` (anthropic.ts:250-272). The DE reminder text reads:
> "KORREKTUR: Ihre vorherige Antwort hat das Werkzeug `respond` nicht im erwarteten Format aufgerufen. Pflichtfelder sind: ..."

So the schema-reminder retry is already done server-side. **The brief's missing piece is client-side:** when the second-attempt also fails, return a softer envelope (`auto_retry_in_ms: 3000`); client should auto-retry up to 2 more times before showing the user a toast. **All B.2 work is in `useChatTurn.ts` + the error envelope shape.**

### B.3 — Non-atomic state writes
**8.5 root cause hypothesis:** "Multiple sequential writes not in a transaction."

**Confirmed.** `index.ts` writes:
1. `insertUserMessageOrFetchExisting` (with idempotency on `client_request_id`)
2. → call Anthropic
3. → `applyToolInputToState` (in-memory)
4. → `insertAssistantMessage`
5. → `updateProjectState`
6. → `logTurnEvent` (best-effort)

`persistence.ts:8` documents this explicitly: "supabase-js doesn't offer multi-statement transactions over the REST API. We sequence the writes carefully — user message first (with its idempotency key), then the Anthropic call, then assistant message + project state UPDATE."

So the partial-state risk is real: between steps 4 and 5, a network failure leaves the DB with assistant message but stale project state. Idempotency at user-message level prevents duplicate user messages on retry, but the assistant + state pair are still non-atomic.

**Fix:** RPC function `commit_chat_turn()` runs steps 4 + 5 + 6 in a single transaction. Step 1 (user message insert) keeps its existing idempotency-key path. Client passes a stable `clientRequestId` per turn (already does — see `useChatTurn.ts:91`).

### D.4 — Runtime fact-extraction validation
**8.5 fix:** persona prompt rubric. **Still missing:** runtime check.

**Confirmed.** Persona may emit `bruttogrundflaeche_m2: 50000` and the code commits it as-is. No bounds check, no enum check on categoricals.

---

## 3. What this saves us — reuse-existing-infra

| Need | Existing infra | Saves |
|---|---|---|
| B.1 retry plumbing | `callAnthropicWithRetry` already exists; `mapSdkError` already classifies retryable status | A new wrapper. Just extends the retry list and adds backoff timing. |
| B.2 schema-reminder retry | Already implemented (anthropic.ts:250-272) | All server-side B.2 work skipped. Just client-side auto-retry needed. |
| B.3 idempotency | `client_request_id` partial unique index + `insertUserMessageOrFetchExisting` already in place | RPC reuses the same key for assistant-side dedup. |
| Recovery banner data source | `useMessages` already returns ordered messages; orphan detection is just "last role==='user' and no role==='assistant' within 60s of created_at" | No new query needed. |

Pattern reinforcement: every Phase 8.x audit surfaces 1-2 brief items partially or fully done. **B.2 server-side is fully done; client work only.**

---

## 4. File plan

### Create
| Path | Purpose |
|---|---|
| `supabase/migrations/0013_chat_turn_atomic_commit.sql` | B.3 RPC + transaction wrapper |
| `supabase/functions/chat-turn/retryPolicy.ts` | B.1 backoff timing + retryable-status classifier |
| `supabase/functions/chat-turn/factPlausibility.ts` | D.4 bounds + categorical sets |
| `src/features/chat/components/Chamber/RecoveryBanner.tsx` | B.3 client recovery affordance |

### Modify
| Path | Change |
|---|---|
| `supabase/functions/chat-turn/anthropic.ts` | B.1 — extend `callAnthropicWithRetry` with backoff retry on retryable errors |
| `supabase/functions/chat-turn/index.ts` | B.1 (no behavioural change; retry already in wrapper), B.3 (RPC replaces sequential writes for assistant + state + events), D.4 (plausibility pass before applyToolInputToState) |
| `src/features/chat/hooks/useChatTurn.ts` | B.2 (auto-retry on `model_response_invalid` with `auto_retry_in_ms`), B.3 (recovery banner mount-check) |
| `src/types/chatTurn.ts` | B.2 — add `autoRetryInMs?: number` to ChatTurnError envelope |
| `src/locales/de.json` + `en.json` | reformulating message + recovery banner strings |

### Don't touch (per §2 locks)
- Persona prompts (Phase 8.5 set them — stable)
- humanizeFact / resolve* / cost norms (Phase 8.5 shipped)
- Frontend visual structure (Phase 7.10 + 8.5 shipped)
- Edge Function endpoint contract (request/response shape stays)

---

## 5. Commit sequence

| # | Commit | Tier |
|---|---|---|
| 1 | docs(phase-8.6): findings | doc |
| 2 | feat(chat-turn): B.1 — backoff retry on retryable upstream errors | server, deploy required |
| 3 | feat(chat): B.2 — client auto-retry on malformed + reformulating UX | client + server-envelope |
| 4 | feat(db): B.3 — atomic commit_chat_turn RPC migration | SQL, deploy required |
| 5 | feat(chat-turn): B.3 — Edge Function uses RPC + recovery banner | server + client, deploy required |
| 6 | feat(chat-turn): D.4 — fact plausibility validation | server, deploy required |

All commits 2-6 land code-changes-committed. Deployment is Rutik's per the brief's "Claude Code authors, Rutik deploys" framing. Each commit body includes deployment notes + verifier checklist.

---

## 6. Out of scope (acknowledged)

Per brief §8:
- Edit-fact-after-extraction UX (deferred to v1.5)
- Real-time architect verification flow (mailto + share-link in v1)
- Multi-Bundesland expansion
- Pre-launch compliance ops
- Anything that re-touches Phase 8.5 work

---

## 7. Risks I'm flagging

1. **Cannot test from CLI.** The fixes live entirely in the deploy path. tsc + eslint pass means TypeScript is right; doesn't mean runtime behaviour is. The smoke walkthrough (brief §5) is mandatory post-deploy.
2. **SQL migration risks deployment failure.** Postgres function syntax is finicky. I'll use a `create or replace function` pattern + idempotent grants, but Rutik should run on a staging DB first if possible.
3. **B.3 RPC + idempotency interaction.** Existing user-message idempotency is at the partial-unique-index level. The new RPC adds a check on `client_request_id` to short-circuit the assistant + state writes when the assistant already exists. If this check is wrong, retries could duplicate state. Code-reviewed inline; Rutik should re-read the RPC body before deploying.
4. **D.4 plausibility bounds are heuristic.** Real-world München projects can have legitimate edge cases (e.g., a 6000 m² Sonderbau lot). I'll set bounds wide enough to allow these but flag them as ASSUMED. If false positives are common in practice, loosen the bounds in a follow-up.
5. **Recovery banner UX trades off vs. spam.** If a user reloads quickly during normal turn-in-flight, the banner could appear briefly. Mitigated by 60s threshold; further mitigated by checking that no streaming bubble is in flight. Some edge case still possible.

---

End of findings.
