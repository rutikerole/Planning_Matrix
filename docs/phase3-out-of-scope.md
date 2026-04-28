# Phase 3 — Explicitly out of scope

> What didn't ship in Phase 3 and lives in the Phase 4+ backlog. Sorted
> by how often we'll be tempted to slot them in early.

## Resolved in Phase 3.1

These shipped in the polish sweep — see `docs/phase3-1-polish.md`:

- ✅ **Mobile drawers** (vaul left + right rails, 85% width, peek-on-new-recommendation, reduced-motion badge fallback) — commit #31, D15.
- ✅ **completion_signal end-to-end** — Edge Function now exposes the model's signal in the response envelope; `useChatTurn.onSuccess` reads it; `CompletionInterstitial` renders model-driven flavours — commit #30.
- ✅ **Top-3 numbering bug** (1, 1, 2 → 1, 2, 3) — commit #29 fixed the visible numbering and added `normalizeRecommendations` to keep persisted ranks sequential — D14.
- ✅ **Recommendations cap** at 12 — commit #29/#30 share the same normalize/cap path — D14.
- ✅ **MAX_TOKENS tuning** (2048 → 1280) to bound worst-case latency — commit #33.
- ✅ **`thinking_label_de` persistence** so the indicator hint survives across turns — commit #33 + migration `0004_thinking_label.sql`.
- ✅ **View Transitions API** for the wizard → chat handoff (Polish Move 5) — commit #32, with Framer Motion fallback for non-Chromium.

## Real external integrations

- **B-Plan / F-Plan / Grundbuch** integration. The Edge Function honestly tells the user it can't run live lookups (system prompt §EHRLICHKEITSPFLICHT) and marks resulting facts as `LEGAL/ASSUMED`.
- **Geocoding / address autocomplete.** Wizard accepts free-text addresses with D8 validation only.
- **Bauamt / municipal authority APIs.** Out of scope — no real-time procedure status.

## Multi-role surface

- **DESIGNER role.** Architect-side review, sign-off, formal release flow. The right-rail "Vorläufig — bestätigt durch eine/n bauvorlageberechtigte/n Architekt/in" line is the v1 stand-in.
- **ENGINEER, AUTHORITY** roles. Even further out.
- **Multi-tenant project sharing.** Shareable links, invite flows, co-editing.
- **Real-time collaboration** between multiple browsers on the same project. Last-write wins for v1.

## Scope expansion

- **Other Bundesländer beyond Bayern.** v1 ships Bayern only; the system prompt cites BayBO articles directly.
- **Templates T-02 through T-05 in fully-fleshed form.** All five templates currently route into T-01 with annotations in the system prompt.
- **Mobile drawers (vaul) for left + right rails.** v1 hides the rails on `<lg` viewports; the chat workspace center column is fully mobile-functional.
- **Document upload, file storage, BIM integration.** No upload anywhere in v1.

## Technical follow-ups

- **Custom SMTP** (Resend / Postmark / SES) — Phase 3.1. The autoconfirm trigger from Phase 2 stays in place until then.
- **Audit-grade tamper-evident logs.** v1 has a basic `project_events` row per turn; cryptographic chaining is out of scope.
- **Designer's full Cockpit / Gate 99 view.** The architect-side workspace.
- **Stripe / billing / pricing surfaces.** No payment plumbing.
- **`completion_signal` wired through the chat-turn response.** The interstitial UI is in place but the field is currently approximated client-side; the Edge Function should expose it explicitly in the response envelope (a small follow-up).
- **Sonnet 4.6 evaluation** vs Sonnet 4.5 (D4 TODO) — same pricing, reportedly stronger reasoning. Eval needs real transcripts.
- **Cross-page View Transitions** for the wizard → chat handoff (Polish Move 5). Currently approximated via the match-cut hairline draw above the moderator's first nameplate; the true cross-page transition needs view-transitions API support across all browsers we ship to.
- **Pause / network-loss banners** for in-flight chat-turn failures beyond the offline banner. Implemented partially (`OfflineBanner`, retry-once on failed user message); the 3-failure escalation banner remains a v1.1 item.
- **Project list on the dashboard** (D2 — deferred). Currently the dashboard has the `Neues Projekt` CTA only.

## Audit / observability

- **Per-conversation analytics dashboard** (token cost over time, specialist mix, drop-off points).
- **Replay** a conversation from `messages` + `project_events` for debugging.
- **Soft-delete** projects + an "archived" view on the dashboard.

## Things we said we wouldn't do

- Realtime updates / WebSockets to the chat workspace. Polling on focus is fine for v1.
- An "AI" word anywhere in user-visible UI copy (specialist names are roles, not the engine).
- Marketing-tone copy. The team speaks formal German Sie throughout.
