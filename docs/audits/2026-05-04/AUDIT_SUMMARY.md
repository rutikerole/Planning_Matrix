# Audit Summary
> Date: 2026-05-04 · SHA `4ac4333` · Auditor: Claude Code (ultrathink, read-only)
> **Verdict:** chat-turn pipeline + prompt + DB are unusually solid for v1, but the **landing page still lives in Erlangen**, **BayBO Art. 59 is missing from the system prompt**, and the **wizard accepts non-München addresses** — three concrete blockers to the Munich-narrowed v1.

## What's working

- **System prompt is rigorous.** ~10.9k tokens, formal Sie throughout, all 7 specialists named consistently across `shared.ts`, Zod schema, JSON schema. Qualifier discipline (Source × Quality), IDK 3-branches (Recherche/Annahme/Zurückstellen), "Vorbehaltlich der Prüfung" legal-shield clause, deduplication via `questionsAsked` fingerprints, honesty discipline about no live B-Plan access — all present and explicit.
- **Architecture is honest.** Single state-mutation funnel (`projectStateHelpers.applyToolInputToState`); append-only `messages` and `project_events` tables (RLS denies UPDATE/DELETE by default); legal context cleanly split into 4 slices with the active city changeable in one composer file.
- **Edge function is production-grade.** JWT-scoped Supabase client (RLS the only gate), idempotency partial unique index + replay short-circuit, 50 s AbortController timeout, typed UpstreamError → translated to `upstream_overloaded` / `upstream_timeout` / `model_response_invalid` envelopes, structured per-turn log line, `event=audit_drop` greppable for failed audit writes, tight CORS allowlist.
- **Munich legal grounding is meaningful, not cosmetic.** Sub-Bauamt routing Mitte/Ost/West with real emails + phone numbers, StPlS 926 (with the 2025 novellation values), BaumschutzV 60 cm threshold, GBS § 3 administrative suspension, Erhaltungssatzungen catalogue, ÖbVI-vs-ADBV correction, BAYAK-vs-BAYIKA Brandschutz correction — these are the kind of fine-grained corrections that take a domain expert to catch.
- **UX register holds.** Atelier illustration as empty state (not a spinner); clay-on-paper specialist tag with italic Instrument Serif role label below; "ink-blot pause" thinking choreography; Top-3 cards with drafting-blue left rule + serif drop-cap. The match-cut handoff between specialists (320 ms hairline + 240 ms nameplate scale) is exactly what the brief asked for.
- **Hygiene gates are real.** TS strict on, ESLint clean, **0** raw `any`, locale parity green at 882 keys, gzipped main bundle 242 KB (under the 300 KB ceiling), 5 phase-tagged TODOs, no `console.log` outside error paths.

## What's weak

- **System prompt skips BayBO Art. 59** between Art. 58 and Art. 60 even though it's referenced as part of the procedure-list at `shared.ts:35`. For a non-Sonderbau case where Art. 58 doesn't apply, the model has to invent the procedure name or fall back to Art. 60 wrongly. (`legalContext/bayern.ts:66-68`)
- **Two phrasings of the legal-shield clause** coexist: prompt says "Vorbehaltlich der Prüfung durch eine/n bauvorlageberechtigte/n Architekt/in", UI footer says "Vorläufig — bestätigt durch …". Pick one canonical.
- **Offline queue-and-flush absent.** OfflineBanner shows; `useChatTurn.mutate` still tries the network and fails. The brief expected queue-and-flush.
- **Auto-memory is stale** (`reference_build_gates.md`) — says 250 KB ceiling; reality is 300. Says "139 kB bundle"; reality is 242 KB gz.
- **No second-account RLS smoke-test snippet** in migrations or `SUPABASE_SETUP.md` — the policies look right but they're untested in writing.
- **Stale slice-list comment** in `shared.ts:7` still names "(federal / bayern / erlangen)".

## What's broken

- **Landing demo is Erlangen.** `chatScript.ts` opens with "Sie planen ein Einfamilienhaus auf der Hauptstraße 12 in Erlangen", recommends "Vorabstimmung Bauamt Erlangen", names "Erlanger Stellplatzsatzung". Same in EN. This is the marketing-grade demo; first thing a visitor sees. (P0)
- **Landing analyzer leads with the Erlangen card.** `addresses.ts:25` `id: 'erlangen'` is the first array entry; `id: 'rosenheim'` is the third — both outside the v1 narrowing. (P0)
- **Wizard does not gate non-München PLZ at submit.** `QuestionPlot.tsx:62` accepts any structurally-valid address; a Berlin user can create a project today, then watch the system prompt awkwardly say "die spezifische kommunale Satzung … liegt nicht im Datensatz vor". The `isMuenchenAddress` helper exists at `plotValidation.ts:57` but is unused by the gate. (P0)
- **Locale title still says "Erlangen"** at `de.json:60` and `en.json:60` ("Bauamt-Akte · 2026-04 · Erlangen"). Renders inside the landing's chat-card header. (P1)
- **Trust-section audit-log fixture** has "C → ACTIVE Erlangen StPS" as its closing line. (P1)
- **Authoritative reference docs absent.** Both `PLANNING_MATRIX_MASTER_DOC.md` and `PHASE_3_PROMPT.md` are referenced by the audit prompt but missing from the repo. The next senior engineer can't anchor to the original spec. (P1 — process not code)

## Top 3 priorities

1. **(P0) Replace the Erlangen demo on the landing page.** Three locations — `src/features/landing/lib/chatScript.ts`, `src/features/landing/lib/addresses.ts`, `src/locales/{de,en}.json:60`. Use the system prompt's München anchors (Sub-Bauamt Mitte, Maxvorstadt PLZ, StPlS 926). Without this fix, every marketing visit contradicts the v1 narrowing.
2. **(P0) Gate the wizard on `isMuenchenAddress`.** Either a hard block or a confirmable warning at `QuestionPlot.tsx:62`. The helper already exists; this is a one-condition change. Without it, the product makes promises it can't keep.
3. **(P1) Add a BayBO Art. 59 definition block to `legalContext/bayern.ts`** between the existing Art. 58 (line 66) and Art. 60 (line 68). 4–6 lines defining regulärer Prüfungsumfang, Frist, Anwendungsfälle. The factLabels and locales already cite Art. 59 — the prompt is the only artefact that doesn't know what it means.

## Munich narrowing status

The Munich pivot is **~85% complete** in functional code (legal context, data slice, fact bank, smart suggestions, cost norms, postal-code helper, DB schema) but **~10% complete in the public-facing surfaces** (landing demo, analyzer cards, locale titles, audit-log fixtures). The wizard's submission gate accepts the world. Sleeping Erlangen artifacts (`legalContext/erlangen.ts`, `data/erlangen/`, parked test projects) are deliberate and well-documented, and shouldn't be deleted. Total Erlangen-leakage to fix in code: **6 files**, all in `src/features/landing/` plus the two locale title strings. Total Munich-narrowing P0 work: ~half a day.
