# Bayern-Only v1.0.3 Production Readiness Audit

> Adversarial read-pass. No cheerleading. file:line cited or claim
> dropped. Probes are empirical (live Supabase REST + grep + build
> + tsc + npm audit). Bayern SHA `b18d3f7f9a6fe238c18cec5361d30ea3a547e46b1ef2b16a1e74c533aacb3471`
> **MATCH** at start AND end of audit (no drift during probe). Scope
> is single-state (Bayern); multi-state is explicitly v1.1.
>
> ### v1.0.4 RESOLUTION STATUS (this audit's findings)
>
> | Finding | Status | Commit |
> | ------- | ------ | ------ |
> | A1 — Impressum § 5 DDG (14 placeholders) | ✅ RESOLVED | `549b48b` |
> | A2 — 13b denominator alarm rewire (CRIT-2) | ✅ RESOLVED in code; ⚠️ requires migration 0032 apply | `075283d` |
> | A3 — `qualifier_role_violation` propagation | ✅ RESOLVED | `df4c1fc` |
> | C3 — streaming-path bare-await | ✅ RESOLVED | `567b724` |
> | C4 — ArchitectGuard English copy + stale chat-turn comment | ✅ RESOLVED | `567b724` |
> | D2 — `docs/COMPLIANCE.md` | ✅ SHIPPED | `104608b` |
> | D3 — `docs/LEGAL_COPY_REVIEW.md` (Anwalt prep) | ✅ SHIPPED | `104608b` |
> | D6 — Dependabot config | ✅ SHIPPED | `104608b` |
> | B1 — Real DOM test harness (Vitest/RTL) | ⏭ DEFERRED v1.1 | — |
> | B2 — VorlaeufigFooter render assertions | ⏭ DEFERRED v1.1 (depends on B1) | — |
> | B3 — Citation runtime allow-list enforcement | ⏭ DEFERRED v1.1 (touches the chat-turn pipeline; high blast radius for a hot-fix) | — |
> | C1 — verify-fact race (POST_V1_AUDIT CRIT-1) | ⏭ DEFERRED v1.1 (needs schema column + retry path; bigger than a hot-fix) | — |
> | C2 — qualifier-views security_invoker probe | ⏭ DEFERRED v1.1 (needs service-role probe against authenticated-non-admin; live probe of anon path was clean) | — |
> | D1 — Sentry runtime smoke | ✅ already wired (audit confirmed); no v1.0.4 change needed | — |
> | D4 — Load-test script + execution | ⏭ DEFERRED v1.1 (no execution capacity in this pass) | — |
> | D5 — Mobile render Playwright pass | ⏭ DEFERRED v1.1 (depends on B1) | — |
>
> 8 findings RESOLVED in v1.0.4. 7 findings honestly deferred to v1.1
> with the reason named per row. Bayern SHA `b18d3f7f…3471` MATCH at
> end of v1.0.4 commit cycle.

---

## 1. BAYERN KNOWLEDGE BASE COMPLETENESS

**VERDICT:** ⚠️ thin (deeper than smoke-test depth, shallower than
Anwalt depth)

**EVIDENCE:**
- `src/legal/bayern.ts` (500 LOC) carries Art. 57 / Art. 58 / Art.
  59 / Art. 60 / Art. 61 / Art. 2 Abs. 4 / Art. 6 (Abstandsflächen)
  with verbatim §§ headers + the BUNDESLAND-DISZIPLIN block. All
  three procedure types named: Genehmigungsfreistellung (`bayern.ts`
  references), vereinfachtes Verfahren (Art. 58),
  Baugenehmigungsverfahren (Art. 59). Sonderbau path via Art. 60.
- `src/legal/muenchen.ts` (397 LOC) — München-specific Bauamt
  routing, ÖbVI Vermessung, plan.ha2-24b@muenchen.de.
- `src/legal/templates/{t01..t08}.ts` — eight templates × ~200-260
  LOC each. Spot-check confirms TYPISCHE / VERBOTENE blocks.
- `src/features/result/lib/costNormsMuenchen.ts:11` — *"ORIENTATION
  DRAWN FROM HOAI 2021 § 35-39 + practitioner Bayern" — the cost
  engine is HEURISTIC, not a normative HOAI calculator.* 11 cost
  refs total in the file; München-narrowed.
- 23 HOAI / Gebühr references across `src/`. None are a fee table —
  all are heuristic narratives.
- `src/features/chat/hooks/useChamberProgress.ts:28` —
  `const TOTAL_ESTIMATE_T01 = 22` is **hardcoded** for T-01 and
  used as fallback for ALL templates (line 63). T-03 / T-07 / T-08
  display "Round X of ~22" regardless of true template-typical
  length. **Documented hardcoded fallback papering over missing
  per-template data.**
- `allowedCitations: ALLOWED_CITATIONS` defined per top-state
  (`states/bayern.ts` line via BAYERN_DELTA, `states/nrw.ts:365`,
  etc.). **Empty `[]` for 11 minimum stubs.**
- **CRITICAL BAYERN-RUNTIME GAP:** `grep -rE "allowedCitations" src/
  supabase/` returns the array DECLARATIONS only. **No code
  consumes them.** The "allowed citations firewall" is shape-
  present-but-inert. The model is free to cite e.g. "BayBO Art. 99"
  (which doesn't exist) and the lint would NOT catch it — the lint
  enforces NEGATIVE patterns (`citationLint.ts:156` forbidden list,
  22 patterns) and home-Bundesland scoping, but never validates
  emitted citations against a known-good positive list.
- Citation-quality on user's smoke test (per
  `POST_SMOKE_TEST_INVESTIGATION.md`): persona cited BayBO Art.
  57/58, BayDSchG Art. 6, BauGB § 172 with München-routed
  authorities. **Empirically passing — but on a 10-turn happy
  path, not under adversarial probe.**

**THE BRUTAL TAKE:** Bayern coverage is real-content, not stub-
grade. Three procedure types wired, München authorities routed,
heuristic cost engine HOAI-anchored. But the "allowed citations"
positive-list firewall is shape-only — a negative-pattern lint plus
a 12k-token persona prompt are the only barriers between the model
and a fabricated "BayBO Art. 99". The 22-round hardcoded estimate
papers over per-template data the product never gathered. **Demo-
ready, NOT exhaustive-citation-grade.**

**OPEN QUESTIONS:**
- Has a Bayern Anwalt or AKBay member ever read `bayern.ts` end-to-
  end? Source attestation present but no review signoff in repo.
- HOAI 2021 § 35-39 wires the heuristic; HOAI revisions since 2021
  unaccounted for in `costNormsMuenchen.ts`.
- BayBO 2024 / 2025 amendments — is the file current?

---

## 2. DATA EXTRACTION + INPUT PIPELINE

**VERDICT:** ⚠️ thin — happy-path works; partial / contradictory
input handling unspecified.

**EVIDENCE:**
- Wizard captures: `intent` (free text), `hasPlot` (yes/no),
  `plotAddress` (string when hasPlot), `template` (T-01..T-08).
  `bundesland` HARDCODED `'bayern'` (`useCreateProject.ts:184`).
  No parcel size, no GFZ, no Nutzung input.
- Address → Bebauungsplan: `supabase/functions/bplan-lookup/`
  exists (`index.ts` + `wmsClient.ts` + `normalize.ts`). Hits
  München WMS only. 30/min/user rate-limit per RPC. **Real for
  München, stub-tier for outside Bayern (Phase 15 deferral).**
- File upload: `supabase/functions/{signed-file-url,delete-file}/`
  Edge Functions exist. RLS-scoped per project (per the migration
  comments).
- **NO OCR, NO PDF schema validation.** A user uploading a
  Lageplan PDF: it's stored, given a signed URL, but never
  parsed by the persona pipeline.
- Multi-turn correction: `applyExtractedFacts`
  (`src/lib/projectStateHelpers.ts:270-295`) deduplicates by
  `f.key` — later turns overwrite earlier values for the same
  key. **Correction works IF the model emits the same key.** If
  the model emits `site.stories` once then `site.story_count`
  later, both persist as conflicting facts; no reconciliation.
- Out-of-scope input (e.g., commercial industrial use,
  Sondergebiet) — no explicit guard. The persona is supposed to
  ask clarifying questions, but there's no programmatic refusal.

**THE BRUTAL TAKE:** Extraction works for the constrained wizard
shape. The fact-merge model trusts the persona's key discipline —
which is OK while Bayern + 8 templates is the only surface, but
brittle the moment input shape widens. PDF upload is a black hole
(stored, never read).

**OPEN QUESTIONS:**
- What happens when a user pastes contradictory facts ("3 stories"
  / "actually 2") rapidly across turns? No formal test.
- Has anyone tested out-of-scope intent (factory, Stadtsanierung,
  Spezialbau) on the live model?
- Does PDF upload have a size limit? File-type whitelist?

---

## 3. QUALIFIER + VERIFY-FACT FLOW (Phase 13 core)

**VERDICT:** ❌ broken — three known issues open, two from prior
audits, one this audit confirms empirically.

**EVIDENCE:**
- **POST_V1_AUDIT CRITICAL-1 (verify-fact race) STILL OPEN.**
  `supabase/functions/verify-fact/index.ts:184-238` — read-modify-
  write of `projects.state` with `eq('id', body.projectId)` and
  no `updated_at` predicate, no CTE, no jsonb_set patch. Two
  concurrent verifies (or a verify + a chat-turn write) clobber
  each other. **Confirmed unfixed by reading the live file just
  now.**
- **POST_V1_AUDIT CRITICAL-2 (13b threshold disarmed) EMPIRICALLY
  CONFIRMED IN PRODUCTION.** Live REST probe just ran:
  ```
  GET /rest/v1/qualifier_rates_7d_global
  → [{"downgraded_count":0,"rejected_count":0,"verified_count":0,
     "turns_count":0}]
  ```
  `turns_count: 0` is the smoking gun. The view's
  `where source = 'chat-turn'` predicate (migration `0029:48-49`)
  matches **zero rows** because the `event_log.source` CHECK
  constraint forbids the value. The CLI's threshold predicate
  (`scripts/qualifier-downgrade-rate.mjs:73` —
  `numerator > 5 && turns >= 100`) **can never fire**, even
  under a real false-positive surge. The OPS_RUNBOOK § 4
  rollback playbook references a signal that is structurally
  dead.
- **CRITICAL-3 (qualifier views RLS) APPEARS CLEAN for anon.**
  Live probe: `GET /rest/v1/qualifier_transitions` returned `[]`
  HTTP 200 (not the all-rows leak). Same for
  `qualifier_rates_7d_per_project`. Modern Supabase Postgres
  appears to honor `security_invoker` defaults OR the underlying
  `event_log` RLS is being respected through the view. **NOT
  verified for authenticated-non-admin** (no test JWT available).
  Status: anon-clean; non-admin-authenticated unverified.
- **`qualifier_role_violation` STILL DROPPED BEFORE THE USER.**
  `src/features/chat/components/Chamber/ErrorBanner.tsx:7-18`
  — `KNOWN_ERROR_CODES` set has 10 entries; `qualifier_role_
  violation` is NOT among them. Locale grep:
  `grep -nE "qualifier_role_violation" src/locales/*.json` →
  **zero matches**. The Edge Function's locked German CTA copy
  ("Diese Festlegung erfordert die Freigabe…") is set in the
  response body but the SPA falls through to generic
  `chat.errors.internal.{title,body}`. **The §6.B.01 user-facing
  message reaches the network but never the eyeballs.**
- Per-card footer (v1.0.3): `VorlaeufigFooter` imported by 6
  surfaces (verified by grep). **Render is REGEX-CONFIRMED ONLY**
  — no DOM-render test, no Playwright assertion that the footer
  actually paints in a real browser. Trust hangs on TS types +
  smokeWalk fixture matching strings.

**THE BRUTAL TAKE:** Phase 13 is half-shipped. Server-side it
catches CLIENT DESIGNER+VERIFIED writes (qualifier gate), and
verify-fact flips qualifiers correctly in the happy-path. But:
(a) a concurrent verify silently loses a chat-turn's parallel
write; (b) the operational signal that's supposed to detect this
class of issue is a literal dead-end query; (c) the locked German
CTA the user sees in spec docs is never displayed in the SPA;
(d) the "ship it" fixture for the v1.0.3 UX gap is regex on
import + render text — it never proves the footer actually
appears in the rendered DOM. The legal shield is plumbing
without an end-cap.

**OPEN QUESTIONS:**
- Run `EXPLAIN` on a SELECT against projects as a non-admin
  authenticated user — does the plan use the helper function or
  fall through? Service-role key needed.
- Manual Playwright assertion: `await expect(page.getByText(
  'Vorläufig')).toBeVisible()` post-load. Not in the test suite.
- A two-architect Playwright multi-context test that simulates
  simultaneous verify-fact calls — would it expose the race?

---

## 4. RLS + AUTH + MULTI-TENANCY

**VERDICT:** ✅ solid for the empirically-tested surfaces, ❓ for
authenticated cross-tenant.

**EVIDENCE:**
- **Migration 0031 deployed AND working.** Live probes (just
  ran):
  ```
  GET /rest/v1/projects        → [] HTTP 200
  GET /rest/v1/project_members → [] HTTP 200
  GET /rest/v1/messages        → [] HTTP 200
  ```
  No more 42P17. SECURITY DEFINER helpers
  (`is_project_owner`, `is_accepted_architect`) hold per
  `0031_fix_projects_rls_recursion.sql:38-72`.
- Invite flow v1.0.1 hardening intact:
  `share-project/index.ts:147` — `if (profile?.role !==
  'designer')` (designer-role check). `share-project/index.ts`
  handleCreate — owner-check. `share-project/index.ts:243-256` —
  `expires_at` TTL check.
- File upload RLS: signed-file-url + delete-file Edge Functions
  use bearer-scoped client (RLS-implicit). No bypass that I see.
- **Cross-tenant probe NOT EXECUTED:** I don't have a test
  JWT, so I can't simulate "user A reads user B's project."
  Anon returned `[]` for projects (correct), but two
  authenticated users with overlapping projects would need a
  manual test.

**THE BRUTAL TAKE:** The plumbing is correct on paper and the
anon path holds. Authenticated cross-tenant isolation is the
single gap where I have no empirical test — but the policy
shapes (`auth.uid() = owner_id` + helper-function membership
check) are correct by construction. Reasonable confidence; not
proven.

**OPEN QUESTIONS:**
- Run a two-real-user manual test against the live DB: User A
  creates project; User B with no membership runs `GET
  /rest/v1/projects?id=eq.<A's id>`. Expected: 200 with [].
- File upload: can User A upload to User B's project_id via the
  signed-file-url path?
- `verify-fact` called by a non-architect user (role=client) —
  guard returns 403, but is the membership check ALSO scoped
  per-project (so an architect on project X can't verify on
  project Y)? Code at `verify-fact/index.ts:161-167` looks
  correct — `eq('project_id', body.projectId).eq('user_id',
  userData.user.id)`. **Single-call per-project scoped. ✓**

---

## 5. AI / LLM PIPELINE INTEGRITY

**VERDICT:** ⚠️ thin — single-state Bayern works in happy-path,
hallucination guard is shape-only, error paths under-tested.

**EVIDENCE:**
- **Bundesland injection per-turn:** confirmed
  `chat-turn/persistence.ts:75-83` (fresh DB read per request) +
  `chat-turn/index.ts:351` (passed to buildSystemBlocks). No
  caching.
- **Context window:** 30 most-recent messages
  (`persistence.ts:103-110`); `MAX_TOKENS = 1280`
  (`anthropic.ts:46`); `ABORT_TIMEOUT_MS = 50000`. No explicit
  truncation strategy beyond the 30-row window — relies on
  Anthropic's prompt-cache to keep cost bounded.
- **Streaming bare-await STILL OPEN.**
  `streaming.ts:312` — `await args.supabase.from('event_log').
  insert(rows)` with no try/catch. A transient DB blip throws,
  propagates to the SSE catch block, returns generic `internal`
  error frame. JSON path
  (`chat-turn/index.ts:499`) wraps the same insert in
  warn-and-continue. **Asymmetric error-handling.**
- **HALLUCINATION GUARD: SHAPE-ONLY.** `citationLint.ts` has
  22 forbidden patterns (5 Layer-A structural + 16 Layer-B
  per-Bundesland + 1 placeholder warning). It catches:
  Anlage-1-BayBO mistakes, § N BayBO (should be Art. N), MBO
  references, wrong-state LBOs.  
  It does NOT catch:
  - **Fabricated paragraph numbers** (e.g. "BayBO Art. 99").
    `allowedCitations: ALLOWED_CITATIONS` is defined per state
    but **NO RUNTIME CONSUMER** (`grep -rE "allowedCitations" src
    supabase` returns declarations only). The positive-list
    firewall is dead code.
  - **Fabricated Behörden** ("plan.ha2-99@muenchen.de" — no
    structural pattern catches this).
  - **Fabricated case-law / Drucksachen.** Persona prompt
    constrains via TYPISCHE / VERBOTENE blocks — not
    programmatically.
- **fact-plausibility downgrade**:
  `chat-turn/factPlausibility.ts:46-64` carries 6 numeric +
  3 categorical bounds. Out-of-bounds values get downgraded to
  ASSUMED. **Audit-flagged that this also downgrades DECIDED**
  which is a semantic error (POST_V1_AUDIT B15 known-as-shipped).
- **Retry / failure:** Anthropic call has `MODEL_INVALID_AUTO_
  RETRIES = 2` and a single retry-on-malformed-tool-input. Beyond
  that, `model_response_invalid` returns a structured envelope.
  Streaming has its own SSE error frames. **No tested fallback
  for "Anthropic responds 200 with a partially-usable tool
  call."**

**THE BRUTAL TAKE:** The pipeline is correctly shaped for the
happy path and works empirically. Hallucination is held back by
a 12k-token persona prompt and a structural pattern lint — there's
nothing programmatic that says "this paragraph number is real."
On a real Bauantrag, a fabricated paragraph reaching the
result page is a real legal-shield failure mode. The Vorläufig
footer mitigates by signaling "preliminary" — that's the v1.5
§6.B.01 design — but a Bauherr who skips the footer and acts
on a hallucinated paragraph has no programmatic recourse.

**OPEN QUESTIONS:**
- Has the model been red-teamed to attempt fabricated citations?
- What's the actual fabrication rate on a 50-turn corpus? No
  data in repo.
- Anthropic responding with `stop_reason: "max_tokens"` in the
  middle of a JSON delta — does the partial JSON parse cleanly,
  or does the SPA show a half-card?

---

## 6. SMOKE TEST / DRIFT FIXTURE QUALITY

**VERDICT:** ❌ broken — fixtures test SHAPE, not BEHAVIOR.

**EVIDENCE:**
- `scripts/smokeWalk.mjs` runs ~120 fixtures. The MAJORITY are
  **regex match on file content**, not behavior assertions.
  Examples:
  - `v1.0.3 UX: every result tab imports VorlaeufigFooter` — a
    grep for `from '@/features/architect/components/
    VorlaeufigFooter'`. Proves the import line exists.
  - `v1.0.3 UX: every result tab renders <VorlaeufigFooter ...>`
    — a grep for the JSX tag. Proves a `<VorlaeufigFooter`
    string is in the file. **Does NOT prove the component
    renders.**
  - `phase-13 week 3: VorlaeufigFooter copy locked` — grep for
    `Vorläufig` literal. Proves the string is in the source.
- **The `bundesland-switch` and `toolInput-fixture` blocks ARE
  behavioral** — they run the JS-port of citationLint over
  fabricated input + assert pass/fail. These are REAL.
- **REAL behavior tests:**
  - `qualifierGate.test.ts` (Deno) — 10 cases × the gate logic.
    Real. **CANNOT RUN locally** (no `deno` binary in the dev
    env per earlier check).
  - `tracer.test.ts` (Deno) — 7 cases × cost helpers. Same
    runtime gap.
  - 7 Playwright smoke specs covering auth / chamber / i18n /
    landing / seo / spine / architect. Architect spec uses
    mocked-network fixtures. **None render-assert the
    Vorläufig footer.** None hit the real DB.
- **Bayern SHA gate:** hashes the COMPOSED CONTENT of 6 files
  (`scripts/lib/bayernSha.mjs:48-54`). It proves the cached
  prefix is byte-stable. It does NOT prove the persona behaves
  correctly — only that the bytes haven't drifted. **A correct
  invariant that's frequently mistaken for a behavior test.**
- **Coverage gaps with zero test:**
  - Wizard insert flow (no Playwright assertion on the wizard
    submitting + landing on workspace).
  - Real chat-turn round-trip (Anthropic stubbed at network in
    the closest test).
  - Mobile viewport rendering (no `viewport: { width: 390 }`
    fixture in any spec).
  - PDF upload path.
  - Verify-fact concurrent calls.
  - VorlaeufigFooter render in real DOM.

**THE BRUTAL TAKE:** The 120-fixture smokeWalk is GREP. It catches
text-level regressions (someone deletes the `Vorläufig` string)
and structural drift (a migration loses a check constraint).
It does not catch BEHAVIORAL regressions. The "v1.0.3 UX gap
closed" claim is supported by 5 grep fixtures and zero render
tests. The CI surface area looks 120 fixtures big from
`smoke:citations` output, but at least 70+ of those are
"file contains string X" — file-presence checks, not behavior.

**OPEN QUESTIONS:**
- Add a Playwright test: load a project with a DESIGNER+ASSUMED
  procedure, expect "Vorläufig" visible. After mock verify-fact,
  expect "Vorläufig" gone. **This test does not exist.**
- Add a Deno-CI runner for `qualifierGate.test.ts` and
  `tracer.test.ts` — currently never run locally, possibly never
  in CI either.
- Add a coverage-report step to `npm run build` and surface what's
  actually exercised.

---

## 7. UX / I18N / COPY

**VERDICT:** ⚠️ thin — German is mostly correct; English bleeds
through in 2 architect surfaces; Impressum has 14 unfilled
placeholders.

**EVIDENCE:**
- Bauherr / Bauvorlageberechtigt / Entwurfsverfasser usage
  consistent in `src/legal/bayern.ts` (6 mentions) +
  `personaBehaviour.ts` (4 mentions).
- **Vorläufig footer copy** locked verbatim per locked spec.
  `VorlaeufigFooter.tsx:46` — *"Vorläufig — bestätigt durch
  eine/n bauvorlageberechtigte/n Architekt/in noch ausstehend."*
  Native-speaker review status: **unknown — no review attestation
  in repo.**
- **POST_V1_AUDIT SERIOUS-4 (ArchitectGuard English) STILL
  OPEN.** `ArchitectGuard.tsx:60` — "403 — Restricted",
  `:62-63` — "The architect console is for bauvorlageberechtigte/n
  only." (code-mixed!), `:65-69` — "Your account is not
  registered…", `:75` — "Back to dashboard". All English on
  what is otherwise a German-only product.
- **POST_V1_AUDIT SERIOUS-3 (stale chat-turn comment) STILL
  OPEN.** `chat-turn/index.ts:131-135` still says
  "the gate only downgrades DESIGNER+VERIFIED attempts in
  observability mode, never rejects" — but `QUALIFIER_GATE_
  REJECTS = true` since v1.0.2 Week 2 flip. **Comment lies
  about runtime behavior.**
- **Impressum (DDG § 5 mandatory fields) NOT FILLED.**
  `ImpressumPage.tsx` has **14 occurrences of `{{...}}`
  placeholders**: `{{ANBIETER_NAME}}`, `{{KONTAKT_EMAIL}}`,
  `{{HANDELSREGISTER_HINWEIS}}`, etc. § 5 DDG / § 18 MStV
  REQUIRES real values for any commercial German website.
  **Shipping public traffic with this is a legal liability.**
- Lint reports 8 problems (7 errors, 1 warning) — non-blocking
  (lint exits 0) but flags `react-refresh/only-export-components`
  on `VorlaeufigFooter.tsx:82` (mixed exports of component +
  predicate).
- Mobile responsiveness: 8 Tailwind responsive classes
  (`sm:` / `lg:`) in ProcedureDocumentsTab. Pattern repeats per
  tab. **No probe of viewport <380px** — no Playwright fixture.
- Cookie banner exists with consent buckets
  (`features/cookies/CookieBanner.tsx` + `AnalyticsLifecycle.tsx`
  + `SentryLifecycle.tsx`).

**THE BRUTAL TAKE:** German is largely correct in the persona +
result-page copy. The architect console is leaking English ("Back
to dashboard") in a German product. The Impressum's 14 unfilled
`{{ANBIETER_NAME}}`-style placeholders make the legal-page tab
visibly broken — § 5 DDG mandates these values, and if a Bayern
building authority inspector clicked /impressum they'd find a
§ 5 DDG violation in v1.0.3. Documented as client-side
responsibility in HANDOFF.md § 9, but the placeholders stare back.

**OPEN QUESTIONS:**
- Has a German native speaker (preferably with legal-domain
  experience) reviewed the Vorläufig copy and the architect
  console German strings (mixed in ArchitectGuard)?
- Mobile viewport: does ProcedureDocumentsTab's `lg:grid-cols-3`
  documents grid actually break at 320px?

---

## 8. OBSERVABILITY + INCIDENT READINESS

**VERDICT:** ⚠️ thin — Sentry+PostHog wired with consent gating,
but no on-call runbook, no DB-backup-tested attestation.

**EVIDENCE:**
- Sentry: `errorTracking.ts:133` — `Sentry.init(...)`.
  `:27-28` — `shouldRun = SENTRY_DSN.length > 0 && import.meta.env.PROD`. **Dev
  builds explicitly skip Sentry.** PII scrubbing at `:52`
  (email + postcode regex). Functional consent gate via
  `SentryLifecycle.tsx`.
- PostHog: `analytics.ts:34` — `posthog.init(PUBLIC_KEY, ...)`.
  `:24` — same `PROD && KEY` gate. Analytics consent gate via
  `AnalyticsLifecycle.tsx`.
- **Structured logging:** chat-turn uses `console.log` with a
  `[chat-turn] [${requestId}]` prefix at every important branch.
  Tracer also writes to `logs.traces`. No JSON-structured logs;
  parse-friendly only via the prefix convention.
- `event_log` table for application events — RLS gated to
  per-user reads, admin reads all.
- **OPS_RUNBOOK.md exists** with incident triggers + cost
  monitoring + qualifier-gate rollback. **But:**
  - Real on-call rotation NOT defined (HANDOFF.md § 9 marks it
    as client-side responsibility).
  - DB backup + restore: NEVER TESTED. `DEPLOYMENT.md` § 5.3
    says "Migrations are forward-only in v1. There is no down
    migration." **Restore from a snapshot has not been rehearsed.**
- Can you tell, right now, how many verify-fact calls succeeded
  vs failed in the last 24h? Theoretically yes via:
  `select name, count(*) from public.event_log where server_ts >
  now() - interval '24 hours' group by name` — but there's NO
  dashboard. Would require manual SQL.

**THE BRUTAL TAKE:** Telemetry is wired correctly with consent
gating, but operations is mostly on the client. There's no
"someone gets paged" plumbing because there's no team. A real
incident at 3am — the build engineer is the SLO. DB backup is
documented but never rehearsed; restore is an unknown.

**OPEN QUESTIONS:**
- Has a backup-restore drill ever happened?
- Is there a Slack / PagerDuty integration for prod errors? No
  evidence in repo.
- Sentry sample rate / spend cap configured?

---

## 9. LEGAL / COMPLIANCE

**VERDICT:** ❌ broken — Impressum violates § 5 DDG by shipping
14 unfilled mandatory-field placeholders.

**EVIDENCE:**
- Public legal pages exist: Impressum / Datenschutz / AGB /
  Cookies (4 files, 927 LOC total).
- **Impressum (203 LOC) — 14 `{{...}}` UNFILLED PLACEHOLDERS**
  for mandatory § 5 DDG fields (Anbieter name, address, phone,
  email, USt-IdNr, Handelsregister). **Shipping the public
  Impressum without filling these is a § 5 DDG violation**, full
  stop. Liability lands on the operator.
- **Datenschutz (358 LOC) — 28 sub-processor mentions:**
  Anthropic, Supabase, Vercel, Sentry, PostHog. AVV/SCC posture
  named per § 3.3-3.7. Hosting region narrative present.
  Same 5 unfilled `{{ANBIETER_*}}` placeholders.
- AGB (215 LOC) — no placeholders (counsel review required per
  PHASE_17_LEGAL_AUDIT.md).
- Cookies (151 LOC) — three-category consent (strictly necessary
  / functional / analytics).
- **DPAs (Phase 17 deliverable):** `PHASE_17_DPA_LEDGER.md`
  documents 5 outbound email templates. **Status of all 5 DPAs
  unknown** — ledger has not been updated with sent/signed dates
  (placeholders).
- LLM provider (Anthropic): user prompts + persona + state JSONB
  ALL go in the request body. PII scrubbing happens for Sentry
  (errorTracking.ts:52) but **NOT for Anthropic** — chat-turn
  sends full state. Address strings, project names, plot
  details all reach Anthropic's US infrastructure. SCC/DPF
  posture documented in Datenschutz § 3.3 but the actual DPA
  countersignature status: pending.
- "Not legal advice" disclaimer: spot-checked landing page (no
  marketing copy in repo for explicit disclaimer search) +
  workspace UI — `Vorläufig` footer is the closest thing. **No
  "this is not legal advice" disclaimer surfaces in the chat
  UI.**
- Vorläufig footer wording: passes the smell test, but **no
  Anwalt has reviewed** it as a legal-shield clause.

**THE BRUTAL TAKE:** Compliance posture is documented but not
executed. Impressum fails § 5 DDG out of the box. Datenschutz
names sub-processors but DPA signatures are pending. No legal
advice disclaimer in-product. The VorlaeufigFooter wording is
copy-pasted from the v1.5 §6.B.01 spec but no German lawyer has
attested it actually shields. **A pen-tester or competitor's
lawyer who clicks /impressum gets a freebie violation.**

**OPEN QUESTIONS:**
- Status of all 5 DPAs (Anthropic, Supabase, Vercel, Sentry,
  PostHog)?
- Has counsel reviewed the four legal pages?
- Is there an Anwalt sign-off on Vorläufig wording?
- What does Anthropic actually see in the request body? Has a
  privacy review confirmed it's acceptable for Bauherr PII?

---

## 10. DEPENDENCY + SUPPLY CHAIN

**VERDICT:** ✅ solid for now (2026-05-08 snapshot).

**EVIDENCE:**
- `npm audit --audit-level=moderate` → **0 vulnerabilities**.
- `package-lock.json` committed at repo root.
- **NO Renovate / Dependabot config** (`.github/dependabot.yml`
  + `renovate.json` both absent). Dependency updates are manual.
- Bundle composition (top chunks):
  - `index-*.js` 902.8 KB raw / 265.2 KB gz (main).
  - `fontkit.es-*.js` 711 KB raw / 330 KB gz — **only loaded for
    PDF export.** Lazy.
  - `exportPdf-*.js` 385 KB raw / 165 KB gz — same lazy path.
  - `react-vendor-*.js` 296 KB raw / 96 KB gz.
  - `ArchitectRoutes-*.js` 15 KB raw / 4.3 KB gz — lazy.
  - `AdminRoutes-*.js` 50 KB raw / 12 KB gz — lazy.
- Source maps NOT in production build by default (Vite
  default).
- TypeScript strict (`tsconfig.json` not re-read; `tsc --noEmit`
  is part of build chain and passes).

**THE BRUTAL TAKE:** Audit-clean today. No automated dependency
freshness — when something CVEs in 6 months, the build engineer
needs to manually `npm audit fix`. Bundle is reasonable; lazy
loading correct.

**OPEN QUESTIONS:**
- Wire Dependabot or Renovate before public exposure.
- Pin Anthropic SDK / Supabase JS SDK versions explicitly to
  caret-major; check whether semver-minor updates trigger.

---

## 11. THE "WE SHIPPED IT" SMELLS — falsified one by one

| Claim | Falsified by | Reality |
| --- | --- | --- |
| "Phase 13 UX gap closed" | grep-only fixture; no DOM render test | Wired into 6 surfaces by import + JSX tag presence; visual rendering NOT tested |
| "Migration 0031 holds" | Live REST probe just succeeded — anon `[]` HTTP 200 on projects/project_members/messages | ✅ holds for anon |
| "Bauherr now sees Vorläufig footer per-card" | No Playwright `.toBeVisible()` assertion exists | Inferred from imports + render; not visually verified |
| "Production-ready for Bayern-only B2B" | Zero load test, zero CCU number, zero error-rate baseline | Aspirational; "B2B" is unsubstantiated by any metric |
| "Repo ready for client handoff" | HANDOFF.md is 489 LOC + cross-refs to 9 other docs; new engineer onboarding never tested | Documented; not validated |
| "v1.0.1 closes 3 CRITICAL findings" | The 3 v1.0.1 findings are different from POST_V1_AUDIT's 3 CRITICALs (which remain open) | Two threat models conflated; the audit's 3 CRITICALs (verify-fact race, 13b threshold, qualifier RLS) are STILL OPEN |
| "13b threshold powers operational signal" | Live `qualifier_rates_7d_global` returns `turns_count: 0` | Threshold is **structurally inert**; cannot fire |
| "Locked CTA copy reaches user" | `KNOWN_ERROR_CODES` lacks the code; locale keys absent | The locked German copy lands in the response body and dies there |

**THE BRUTAL TAKE:** Most "we shipped it" claims survive a weak
test. The two strongest survivals are RLS recursion (real probe
clean) and bundle size (real build green). The two strongest
falsifications are 13b threshold (`turns_count: 0` in
production) and locked CTA copy (dead drop into a fallback
generic). The remaining claims fall in the middle: shape is
right, behavior unverified.

---

## TL;DR

### Top 5 things that are actually solid
1. **Bayern SHA invariant.** Held across 35+ commits. Gate is
   simple, correct, and runs as part of every build. ✅
2. **RLS recursion fix (migration 0031).** Empirically clean
   for anon on three tables. SECURITY DEFINER helpers correct.
3. **Bundle hygiene.** 265 KB gz / 300 KB ceiling; lazy-loaded
   architect + admin chunks; npm audit clean.
4. **citationLint Bundesland firewall (negative patterns).** 22
   patterns. Smoke fixtures exercise them with real fabricated
   input. The lint catches wrong-state citations correctly.
5. **Cookie consent + functional/analytics gate.** Sentry + PostHog
   gated on consent + PROD; PII scrubbed for Sentry.

### Top 5 things that are duct tape
1. **VorlaeufigFooter render verified by REGEX, not DOM.** `v1.0.3`
   ships on import + JSX-tag presence; no Playwright
   `.toBeVisible()` for the actual footer.
2. **`TOTAL_ESTIMATE_T01 = 22` is the round-counter for ALL
   templates** (`useChamberProgress.ts:63`). Hardcoded fallback
   that papers over missing per-template data.
3. **`allowedCitations` is dead data.** Defined per state but
   never read by any code. The "positive list firewall" is
   shape-only.
4. **Streaming-path bare-await on event_log insert.** A transient
   DB blip → generic `internal` error to the user, not a
   structured retry.
5. **8 lint problems shipped as "exits 0 = green."** Two stem
   from this audit cycle (AcceptInvite setState-in-effect;
   VorlaeufigFooter mixed exports).

### Top 5 things that are unknown and dangerous
1. **Impressum has 14 unfilled placeholders.** § 5 DDG
   violation if any traffic hits `/impressum`. Documented as
   client responsibility but BLOCKING for any public-facing
   deploy.
2. **DPA status for all 5 sub-processors unknown.** Ledger
   exists; sent/signed dates blank.
3. **No Anwalt sign-off on Vorläufig wording.** The legal-shield
   clause is verbatim from the spec; nobody with German legal
   credentials has reviewed.
4. **No load test, ever.** "Bayern-only B2B" claim is
   unsubstantiated. We don't know if 10 concurrent users break
   anything.
5. **`qualifier_role_violation` user-facing message dropped.**
   Edge Function returns the locked CTA in the body, SPA
   discards it, generic "internal error" displayed. The §6.B.01
   user-facing hand-off to the architect-invite flow is
   structurally non-functional.

---

## ONE-SENTENCE ANSWER

**Is Bayern-only really ready for paying customers, yes/no, and
what's the single biggest risk?**

**No** — the system is *demo-ready*, not *paying-customer-ready*:
the Impressum's 14 unfilled § 5 DDG placeholders make the public
deployment legally noncompliant the moment a real Bauherr lands
on `/impressum`, AND the legal shield's user-facing CTA
(`qualifier_role_violation`) is silently dropped before the user
sees it — so the system claims architect-verification is the
shield while never showing the user how to invite an architect.
Single biggest risk: **a Bayern Bauherr clicks /impressum, sees
`{{ANBIETER_NAME}}` literally rendered in the page, and the legal
exposure that was supposed to be a v1.5 §6.B.01 shield becomes a
publicly-visible compliance failure.**

**Bayern SHA `b18d3f7f9a6fe238c18cec5361d30ea3a547e46b1ef2b16a1e74c533aacb3471` MATCH at end of audit. No drift.**
