# Phase 3 — Decisions

> Companion to `docs/phase3-plan.md`. One section per decision (D1–D13)
> with the question, the answer, and the reasoning in 1–2 lines. Six
> minutes of reading; ten years of value when the next person asks
> "why is `*_delta` a discriminated union?"

---

## D1 · Migration filename

**Question:** Brief §4.1 proposed `0002_planning_matrix_core.sql`. We had `0002_autoconfirm.sql` from Phase 2. Should we use `0003_…`?

**Answer:** Yes — `supabase/migrations/0003_planning_matrix_core.sql`.

**Reasoning:** Filename collision avoidance. Sequential numbering preserved; the brief's intent (a single migration file applied via Supabase SQL Editor) survives unchanged.

## D2 · Dashboard scope

**Question:** Make the dashboard CTA real, or build the full project list?

**Answer:** Build the real dashboard CTA inline; defer the project list to a follow-up phase.

**Reasoning:** Manual test #16 implied a list, but a thin CTA-only dashboard was enough for batch 3 to ship the full chat experience without rebuilding `DashboardPlaceholder.tsx`. The list is queued for Phase 3.5.

## D3 · Cost-ticker admin allowlist

**Question:** What email(s) should see the right-rail cost ticker?

**Answer:** Both `erolerutik9@gmail.com` and `vibecoders786@gmail.com` in `src/lib/cn-feature-flags.ts` `ADMIN_EMAILS`.

**Reasoning:** Two working accounts in active use. Hardcoded allowlist with `// TODO(phase-4)` comment to swap to a role check when admin role lands.

## D4 · Sonnet 4.5 vs 4.6

**Question:** Use `claude-sonnet-4-5` per the brief or upgrade to 4.6?

**Answer:** Stay on 4.5 for v1; leave a `// TODO(model-upgrade)` comment near the `MODEL` constant.

**Reasoning:** Brief locks 4.5. Sonnet 4.6 is same pricing and reportedly stronger reasoning, but the eval needs real transcripts to A/B against — that comes after Phase 3 ships, not before.

## D5 · `*_delta` schema strictness

**Question:** Loose `Array<object>` (per brief) or strict discriminated unions?

**Answer:** Strict discriminated unions on every `recommendations_delta` / `procedures_delta` / `documents_delta` / `roles_delta`. Each entry must declare `op: 'upsert' | 'remove'`.

**Reasoning:** Forces the model to be explicit about intent — a missing field never silently means "remove". Top-level `.strict()` on the Zod input schema rejects unknown fields entirely; inner objects accept extras for forward-compat. JSON-schema mirror in `supabase/functions/chat-turn/toolSchema.ts` uses `oneOf` discriminators.

## D6 · `questionsAsked` shape

**Question:** Brief had `string[]`. Worth upgrading?

**Answer:** Upgraded to `{ fingerprint: string; askedAt: string }[]`.

**Reasoning:** Audit-friendly — we keep dedup-by-fingerprint while preserving when each question was asked. Loss-less change. `appendQuestionAsked` deduplicates on fingerprint (last-write-wins on `askedAt`).

## D7 · First-turn priming retry

**Question:** Auto-retry once silently or show manual CTA on first failure?

**Answer:** **One** silent auto-retry at 1.5 s; if that fails, surface manual `Erneut versuchen`. At ≥ 10 s of failure, expand the empty state with the "Sie können dieses Projekt jetzt verlassen — es ist gespeichert" honesty copy.

**Reasoning:** Two silent retries hide too much when the network is genuinely down. The 10-s honest copy reassures the user that the project row already exists and they can come back later.

## D8 · Address validation

**Question:** What's the bar for accepting a free-text address?

**Answer:** trim, length ≥ 6, contains a digit, AND (contains a comma OR matches `\b\d{5}\b`). No geocoding, no autocomplete, no Maps embed.

**Reasoning:** Minimal evidence the input is a real postal address rather than a stray phrase. Bayern postcodes start with 8 or 9 — the model uses that as a sanity signal but the wizard doesn't gate on it. Real geocoding is Phase 4.

## D9 · Email verification

**Question:** Custom SMTP now or later?

**Answer:** Leave the `0002_autoconfirm.sql` trigger in place; defer SMTP migration to a separate Phase 3.1 slice.

**Reasoning:** Auth concerns shouldn't bleed into the chat ship. The autoconfirm trigger gives instant signup → instant dashboard, which is the right UX for early pilots.

## D10 · Idempotency uniqueness scope

**Question:** Unique-per-project or unique-per-user on `client_request_id`?

**Answer:** `UNIQUE (project_id, client_request_id) WHERE client_request_id IS NOT NULL`.

**Reasoning:** Project-scoped is enough — RLS handles cross-tenant isolation, the partial index avoids NULL collisions, and per-project is the right grain for the SPA's retry logic.

## D11 · Per-project OG tags

**Question:** Update OG tags dynamically on `/projects/:id`?

**Answer:** No — keep OG tags static (existing landing OG). `<title>` updates dynamically to `<project name> · Planning Matrix`.

**Reasoning:** Project pages are private behind auth, so social cards never render dynamic OG. Dynamic project names could leak into history/share-to-X flows in unexpected ways. Document title alone is enough for browser-tab UX.

## D12 · "Sonstiges" notice

**Question:** When the wizard's intent is `sonstige`, surface it in-thread?

**Answer:** Yes — render as a calm in-thread **system row** (distinct visual register from assistant messages). Hairline-bordered top + bottom, uppercase `SYSTEM` tag without leading dot, Inter 13 clay body. Copy: *"Sie haben „Sonstiges" gewählt. Wir arbeiten zunächst mit dem Standard-Template für Einfamilienhaus und passen das im Gespräch an."*

**Reasoning:** Transparency builds trust; hiding the template fallback does not. Client-side only (synthetic id, never persisted).

## D13 · DEV-mode cache-write logging

**Question:** How does Rutik verify the prompt cache pattern from the live UI without parsing Edge Function logs?

**Answer:** In `chatApi.postChatTurn`, gated behind `import.meta.env.DEV`, log the full request/response/costInfo to `console.group('chat-turn ← HTTP …')` — including `cacheWriteTokens` and `cacheReadTokens`.

**Reasoning:** Real-time DevTools visibility into the cache pattern (cold first call writes 6.3k tokens; warm second call reads them). Closes the loop between the architecture decision and the runtime evidence.

---

**Carried forward — instructions A and B (added 2026-04-27 mid-conversation):**

- **A** — `PLAN.md` is **not** deleted after the chat ships. It moves to `docs/phase3-plan.md` and is committed in the final commit of this phase. Future-Rutik and future-Claude need the decision archaeology.
- **B** — `docs/phase3-decisions.md` (this file) ships alongside the moved plan, one section per D1–D13.
