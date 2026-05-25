# V1 Smoke Walk Execution Plan

> Execution-ready plan to hand-walk the v1 deliverable surface against
> the production deployment. Successor to `docs/DELIVERABLE_GAP_AUDIT.md`.
> **Operator: Rutik (Bauherr account: vibecoders786@gmail.com).**
>
> **Bayern SHA pin:** `b18d3f7f9a6fe238c18cec5361d30ea3a547e46b1ef2b16a1e74c533aacb3471`
> Run `npm run verify:bayern-sha` before starting AND after finishing.
> Both must MATCH or the walk is invalidated.
>
> This document is **fillable**. Edit it as you walk — pass/fail per
> cell, screenshot paths, bug refs. Leave it in the working tree
> (uncommitted) until the walk concludes.
>
> No tooling automation here. No post-v1 work. No tag updates. Just
> the steps to hand-walk + capture evidence.

## Contents

1. Pre-flight setup
2. State × Template matrix execution (14 cells, ordered)
3. Architect end-to-end flow (1 test case)
4. Bug-finding template
5. Rollup table
6. Exit criteria

---

## 1. Pre-flight setup

### 1.1 Confirm Vercel deploy matches the post-v1.0.5 HEAD

The v1.0.5 tag is at commit `c35e3fa`; current main HEAD is `6cfe4b7`
(three doc-only commits past the tag — `d4697d6` freshness +
`166c3bd` HANDOFF + `6cfe4b7` resume snapshot).

**Step 1 — Check the live bundle's last-modified header:**

```sh
curl -sI https://planning-matrix.vercel.app/ | grep -iE "last-modified|x-vercel-id"
```

Expected: `last-modified` should be ≥ 2026-05-08 17:10 UTC (the
`f848813` "trigger v1.0.4 production build with VITE_LEGAL_* envs
set" commit). Anything older means the deploy predates v1.0.5.

**Step 2 — Open the Vercel dashboard:**

`https://vercel.com/<team>/planning-matrix/deployments` — confirm
the most recent **Production** deployment's "Source" is at or after
`c35e3fa` (the v1.0.5 tag commit). If the dashboard shows an older
SHA, redeploy from main HEAD before walking.

**Step 3 — Sanity-probe a v1.0.5 feature** (B3 firewall — Layer-C
positive-list runtime enforcement):

```sh
curl -s https://planning-matrix.vercel.app/ | grep -oE 'index-[A-Za-z0-9_-]+\.js' | head -1
```

Note the bundle hash for the rollup table § 5 below. The local
`npm run build` will produce a different hash (env-driven, expected;
documented in `SESSION_RESUME_STATE.md` § 6).

**Pass criterion:** Vercel dashboard shows source ≥ `c35e3fa`.

### 1.2 Verify all four daily gates locally

Run from repo root in a single sweep:

```sh
npm run verify:bayern-sha
npm run smoke:citations
npx tsc --noEmit -p .
npm run build
```

**Pass criterion:** all four exit zero. Specifically:
- `verify:bayern-sha` prints `✓ MATCH — Bayern unchanged`.
- `smoke:citations` ends with `[smoke-walk] OK`.
- `tsc` is silent (no diagnostics).
- `build` ends with `[verify:bundle] OK — index-…js <X> KB raw / <Y> KB gzipped (ceiling 300 KB)`.

If any gate fails, **STOP** — the walk is meaningless against an
unstable head.

### 1.3 Identify the test Bauherr + Architekt accounts

The architect end-to-end test (§ 3) requires **two distinct
authenticated identities** because `auth.uid()` gates the
ownership + designer membership checks (per
`supabase/functions/share-project/index.ts:handleAccept` per
POST_V1_AUDIT v1.0.1 CRIT-1/2/3).

Recommended assignment:

| Role        | Account email                          | Notes                                                                |
| ----------- | -------------------------------------- | -------------------------------------------------------------------- |
| **Bauherr** | `vibecoders786@gmail.com` (yours)      | Project owner. `profiles.role = 'client'` (default).                 |
| **Architekt** | `<second-account>` (e.g. codervibe60@gmail.com OR a fresh sign-up) | Will be promoted to `role='designer'` in § 1.4 below.                |

If you don't already have a second account: sign up through
`https://planning-matrix.vercel.app/sign-up`, confirm the email,
note the resulting `auth.users.id` (Supabase Dashboard → Authentication
→ Users).

**Pass criterion:** two distinct `auth.users.id` UUIDs noted below.

```
Bauherr  (vibecoders786@gmail.com)  user_id = ____________________________________
Architekt (<email>)                user_id = ____________________________________
```

### 1.4 Promote the Architekt account to `role='designer'`

Run in **Supabase Dashboard → SQL Editor** (the only role-promotion
path; no SPA flow exists per HANDOFF.md § 7.2):

```sql
update public.profiles
   set role = 'designer'
 where email = '<architekt-email>'
returning id, email, role, updated_at;
```

**Pass criterion:** one row returned, `role` column reads `designer`.

Re-confirm via SPA: sign in as the architect, navigate to
`/architect`. The `useIsDesigner` hook should resolve true and
the dashboard should render (instead of the ArchitectGuard 403).

### 1.5 Database baseline — work alongside vs reset

**Recommendation: WORK ALONGSIDE EXISTING ROWS.** Reasoning:

- Production has zero observable activity in the last 7 days
  (`qualifier_rates_7d_global.turns_count = 0`). Effectively, the
  alongside-vs-reset distinction is moot — there is nothing to
  preserve OR clear from an activity perspective.
- Even at zero traffic, `projects` may carry rows from past testing
  (RLS-gated; anon-blind). Truncating them risks losing context the
  manager may want for v1.1 retrospective.
- A naming convention isolates smoke rows post-hoc:

```sql
-- Naming convention for every smoke project's projects.name:
-- "[SMOKE-2026-05-11] cell <N>: <bundesland> × <T-XX>"
-- Examples:
--   "[SMOKE-2026-05-11] cell 1: bayern × T-01"
--   "[SMOKE-2026-05-11] cell 5: niedersachsen × T-01"
```

After the walk, all smoke rows are filterable:

```sql
select id, name, bundesland, template_id, state->>'createdAt' as created_at
  from public.projects
 where name like '[SMOKE-2026-05-11]%'
 order by name;
```

**Do NOT** `delete from public.projects` or `truncate`. If a smoke
row needs removing, delete it by id only.

### 1.6 SQL helper kit (re-used per cell)

Save these in a sticky tab — you'll re-run them per cell.

```sql
-- A. Override bundesland on a freshly-created project (BEFORE the
--    first chat turn — mid-flight switching is broken per
--    POST_SMOKE_TEST_INVESTIGATION.md SERIOUS-1).
update public.projects
   set bundesland = '<code>'
 where id = '<project-uuid>'
returning id, bundesland, template_id, name;
-- Valid <code> values: bayern, nrw, bw, niedersachsen, hessen,
--   sachsen, sachsen-anhalt, thueringen, rlp, saarland, sh, mv,
--   brandenburg, berlin, hamburg, bremen.

-- B. Inspect the persona's last 5 messages for a project.
select role, created_at, length(content) as len, left(content, 200) as preview
  from public.messages
 where project_id = '<project-uuid>'
 order by created_at desc
 limit 5;

-- C. Pull citation-violation events for a project (last 1 hour).
select server_ts, attributes
  from public.event_log
 where project_id = '<project-uuid>'
   and source     = 'system'
   and name       = 'citation.violation'
   and server_ts  > now() - interval '1 hour'
 order by server_ts desc;

-- D. Pull all chat-turn events for a project (last 1 hour).
select server_ts, name, attributes
  from public.event_log
 where project_id = '<project-uuid>'
   and source     = 'chat'
   and server_ts  > now() - interval '1 hour'
 order by server_ts desc;

-- E. Pull qualifier-gate events (downgrade / rejected / verified)
--    for a project.
select server_ts, name, attributes
  from public.event_log
 where project_id = '<project-uuid>'
   and name in ('qualifier.downgraded',
                'qualifier.rejected',
                'qualifier.verified')
 order by server_ts desc;

-- F. Live counts (RLS-bypassing view; sanity check that traffic is
--    actually being recorded).
select * from public.qualifier_rates_7d_global;
-- Expected after first real chat turn: turns_count > 0 within seconds.
```

### 1.7 CORS sanity check (potential blocker for the architect flow)

Per `SESSION_RESUME_STATE.md` § 5, `verify-fact` and `share-project`
advertise `http://localhost:5173` as their CORS allow-origin in
OPTIONS preflight. If Supabase enforces `Origin` strictly (it normally
doesn't), the architect flow against `https://planning-matrix.vercel.app`
will fail.

**Probe this BEFORE attempting the architect flow:**

```sh
curl -s -X OPTIONS \
  -H "Origin: https://planning-matrix.vercel.app" \
  -H "Access-Control-Request-Method: POST" \
  -I https://dklseznumnehutbarleg.supabase.co/functions/v1/share-project \
  | grep -iE "access-control-allow-origin|status"
```

**Three outcomes:**

1. `access-control-allow-origin: https://planning-matrix.vercel.app`
   → CORS is configured for prod. Proceed with architect flow against
   live URL.
2. `access-control-allow-origin: *`
   → Supabase default echo. Browser will accept. Proceed.
3. `access-control-allow-origin: http://localhost:5173`
   → Strict dev-only CORS. **Architect flow against production will
   be browser-rejected.** Two paths:
   - Run the architect flow against `npm run dev` locally (CORS will
     match), with the same live Supabase project.
   - Capture this as **finding P0 — CORS misconfiguration on
     `verify-fact` + `share-project`** in § 4 and proceed with the
     state×template matrix only, deferring architect E2E until the
     fix lands.

**Document the outcome in the rollup table § 5 below.**

---

## 2. State × Template matrix execution

14 cells, ordered for incremental confidence. **Work cell-by-cell;
don't batch.** Capture screenshots into `~/Desktop/smoke-2026-05-11/`
named `cell<N>-<step>.png`.

### Cell 1 — Bayern × T-01 EFH-Neubau (golden path, full Final-synthesis attempt)

This is the only cell that gets the full ~22-round walk. Every
subsequent cell does a 5-turn smoke depth.

**Setup (wizard inputs):**

| Field      | Value                                                            |
| ---------- | ---------------------------------------------------------------- |
| Intent     | "Einfamilienhaus" → maps to `T-01` per `selectTemplate.ts:96-97` |
| PLZ        | `80331` (München central — known-good, cityBlock active)          |
| Address    | `Marienplatz 8, 80331 München` (or any plausible München address) |
| Project name | `[SMOKE-2026-05-11] cell 1: bayern × T-01`                      |
| Bundesland override SQL | None — Bayern is wizard default                       |

**Execution:**

1. Sign in as Bauherr → `/dashboard` → "Neues Projekt" → wizard.
2. Fill the wizard. Confirm wizard creates the project; note the
   project UUID from the URL `/projects/<uuid>`.
3. Capture `cell1-wizard-success.png`.
4. Run helper SQL **A** (read-back), confirm:
   `bundesland=bayern, template_id=T-01, name=[SMOKE-…] cell 1`.
5. Walk the chat. **Goal: drive the spine to "Final synthesis"
   (~22 rounds).** Reasonable user replies; don't trick the persona.
   The 8 spine sections (per HANDOFF.md § 1):
   - Project intent
   - Plot & address
   - Zoning law (Planungsrecht)
   - Building code (Bauordnungsrecht)
   - Other regulations (sonstige Vorgaben)
   - Procedure synthesis
   - Stakeholders & roles
   - **Final synthesis** ← the goal
6. After every ~5 turns: capture screenshot
   `cell1-round<N>-spine.png` showing the spine progress UI.
7. After Round 10 and after Round 20 (or when you reach Final
   synthesis, whichever first): run helper SQL **B**, **C**, **D**.

**Expected persona behaviour:**

- Cites **BayBO** (Bayerische Bauordnung) using `Art.` not `§` —
  e.g., `Art. 6 BayBO` (Abstandsflächen), `Art. 57 BayBO` (Verfahrenstypen).
- Cites federal **BauGB §§** (esp. 30/34/35), **BauNVO §§**.
- For München cells: leverages the `MUENCHEN_BLOCK` cityBlock
  (Festsetzungen, B-Plan references).
- **NEVER** cites BauO NRW, LBO BW, HBO, NBauO, BauO Bln, etc.
- Specialists rotate per the 7-persona roundtable (HANDOFF.md § 2.3).

**Pass criterion (cell 1):**

| Check                                                                 | Pass means                                                |
| --------------------------------------------------------------------- | --------------------------------------------------------- |
| Wizard created project; chat session opened                           | Project UUID returned, chat first-turn rendered           |
| Helper SQL **A** reads back `bayern / T-01`                           | One row returned, fields match                            |
| Persona's first 5 turns cite at least one `Art. ___ BayBO`            | grep persona text or visual confirmation                  |
| Helper SQL **C** returns 0 rows after 10 turns                        | No `citation.violation` events fired                      |
| Helper SQL **D** shows ≥10 `chat.turn_completed` events (post-v1.0.4) | Alarm rewire empirically validated                        |
| Spine UI shows progress through ≥4 sections by round 15               | Chamber spine widget advances through sections            |
| Final synthesis spine section reached and persona renders Synthese    | This has NEVER been observed in production — capture it!  |
| `qualifier_rates_7d_global.turns_count` advances after the chat       | RLS-bypassing view confirms traffic is recorded           |

**Fail patterns to capture (any of these → bug entry per § 4):**

- Persona cites non-Bayern law (e.g., `§ 5 BauO NRW`) → P1 citation
  firewall regression.
- Persona uses `§` instead of `Art.` for BayBO (e.g., `§ 57 BayBO`)
  → P2 persona-prompt regression (smokeWalk fixture should have
  caught this; if not, smokeWalk drifted).
- Spine stalls before round 10 with no spec-justified reason → P1.
- Final synthesis is unreachable (round count exceeds 22 with no
  Synthese turn rendered) → P1 spine-completion gap (PSTI SERIOUS-2
  empirically confirmed).
- Helper SQL **D** shows 0 events after first turn → CRITICAL alarm
  regression (v1.0.4 fix `075283d` did not stick).

**Capture:** persona output excerpt for at least one Synthese turn
into `cell1-final-synthesis.txt` (paste from chat).

---

### Cells 2-5 — Substantive non-Bayern states × T-01 (smoke depth ~5 turns)

| Cell | Bundesland     | PLZ    | Address                         | Override SQL `<code>` |
| ---- | -------------- | ------ | ------------------------------- | --------------------- |
| 2    | NRW            | 40213  | Marktplatz 2, 40213 Düsseldorf  | `nrw`                 |
| 3    | Baden-Württemberg | 70173 | Marktplatz 1, 70173 Stuttgart  | `bw`                  |
| 4    | Hessen         | 60311  | Römerberg 27, 60311 Frankfurt   | `hessen`              |
| 5    | Niedersachsen  | 30159  | Trammplatz 2, 30159 Hannover    | `niedersachsen`       |

**Execution per cell (15-25 minutes each):**

1. Wizard with the cell's PLZ + address. Intent: "Einfamilienhaus".
   Project name: `[SMOKE-2026-05-11] cell <N>: <bundesland> × T-01`.
2. **BEFORE the first chat turn**, run helper SQL **A**:
   ```sql
   update public.projects set bundesland = '<code>'
    where id = '<project-uuid>' returning bundesland;
   ```
3. Confirm read-back shows the override took. If not — STOP, this
   cell is invalid until override succeeds.
4. Open chat. Send first user message (e.g., "Hallo, bitte Beratung").
5. Walk 5 turns. Per turn: confirm the persona's law citations match
   the cell's Bundesland.
6. After turn 5: helper SQL **C** (citation violations) and **D**
   (chat events).
7. Capture `cell<N>-round5-persona.png` showing the persona's last
   reply with §§ visible.

**Expected persona behaviour per cell:**

| Cell | Expected primary anchors                                                                            |
| ---- | --------------------------------------------------------------------------------------------------- |
| 2 (NRW) | `BauO NRW § ___` (e.g., `§ 6 BauO NRW` Abstandsflächen, `§ 64 BauO NRW` Verfahren). Federal BauGB §§ 30/34/35.  |
| 3 (BW)  | `LBO BW § ___` (e.g., `§ 5 LBO` Abstandsflächen). Federal BauGB §§.                              |
| 4 (Hessen) | `HBO § ___` (e.g., `§ 6 HBO` Abstandsflächen). Federal BauGB §§.                              |
| 5 (NS)  | `NBauO § ___` (e.g., `§ 5 NBauO` Abstandsflächen). Federal BauGB §§.                            |

**Pass criterion per cell:**

- Override SQL succeeded (read-back confirms).
- First persona turn cites the **expected state's LBO** (not BayBO,
  not any other state's LBO).
- Helper SQL **C** returns 0 rows (no citation violations).
- Helper SQL **D** shows ≥5 `chat.turn_completed` events.

**Fail patterns:**

- Persona cites BayBO despite override → P1 citation firewall
  regression OR mid-flight switch contamination (re-create the
  project, override BEFORE first turn).
- Persona cites a third state's LBO (e.g., BW project gets HBO
  citations) → P0 citation firewall failure.
- Override SQL succeeds but persona STILL cites BayBO → P1 — confirms
  that even at-creation override may carry contamination from earlier
  Bayern-default initial state. Capture `state` JSONB at creation
  time vs after override.
- Helper SQL **C** returns rows → list each violation in § 4 with
  `pattern`, `match`, `severity`, `field`.

---

### Cells 6-12 — Bayern × T-02..T-08 (template breadth in well-tested state)

For each cell, same approach as cells 2-5 but with Bayern (no
override needed — wizard defaults to Bayern).

| Cell | Template | Wizard intent          | PLZ   | Project name pattern                              |
| ---- | -------- | ---------------------- | ----- | ------------------------------------------------- |
| 6    | T-02     | Mehrfamilienhaus       | 80331 | `[SMOKE-…] cell 6: bayern × T-02`                 |
| 7    | T-03     | Sanierung              | 80331 | `[SMOKE-…] cell 7: bayern × T-03`                 |
| 8    | T-04     | Umnutzung              | 80331 | `[SMOKE-…] cell 8: bayern × T-04`                 |
| 9    | T-05     | Abbruch                | 80331 | `[SMOKE-…] cell 9: bayern × T-05`                 |
| 10   | T-06     | Aufstockung            | 80331 | `[SMOKE-…] cell 10: bayern × T-06`                |
| 11   | T-07     | Anbau                  | 80331 | `[SMOKE-…] cell 11: bayern × T-07`                |
| 12   | T-08     | Sonstiges              | 80331 | `[SMOKE-…] cell 12: bayern × T-08`                |

**Execution per cell (15-20 minutes each):**

1. Wizard. Pick the template's intent. Confirm the wizard maps to
   the right T-XX (per `selectTemplate.ts:94-112`).
2. Helper SQL **A** read-back: `template_id = T-XX`.
3. Walk 5 turns. The persona's content should **shift per template**
   — T-03 Sanierung should foreground existing-building law (BayBO
   Art. 60 sanierungsbezogen, Bestandsschutz), T-05 Abbruch should
   foreground Abbruchanzeige + Statiknachweis, etc.
4. Helper SQL **C** + **D** as usual.

**Expected per-template signal (the persona's TYPISCHE block from
`src/legal/templates/t<NN>-*.ts` should drive these):**

| Template          | Signal in persona's first 3 turns                                  |
| ----------------- | ------------------------------------------------------------------ |
| T-02 MFH-Neubau   | More than one Wohneinheit considered; brandschutz / statics depth  |
| T-03 Sanierung    | Bestandsschutz, BayBO Art. 60 (Bestand), energetische Anforderung  |
| T-04 Umnutzung    | Nutzungsänderung, BauNVO §§ 8/9 (Nutzungsart)                       |
| T-05 Abbruch      | Abbruchanzeige, Standsicherheit Nachbargebäude                     |
| T-06 Aufstockung  | Statik, Brandschutz wegen GK-Hochstufung, Abstandsflächen           |
| T-07 Anbau        | Abstandsflächen, GFZ/GRZ ab Anbau, Bestandsverbindung               |
| T-08 Sonstiges    | Persona acknowledges scope-ambiguity; routes via clarifying questions |

**Pass criterion per cell (cells 6-12):**

- `template_id` in DB matches the intent → T-XX mapping per
  `selectTemplate.ts`.
- Persona's first 3 turns reference template-specific concepts (per
  the table above).
- Helper SQL **C** returns 0 rows.
- Helper SQL **D** shows ≥5 events.

**Fail patterns:**

- Wrong template assigned (e.g., picked Sanierung but `template_id`
  shows T-01) → P1 wizard mapping bug.
- Persona content is identical across templates (T-01 and T-05
  produce indistinguishable first 3 turns) → P1 template content
  not reaching system prompt; suspect `systemPrompt.ts` template
  injection.

---

### Cell 13 — Sachsen × T-01 (Flächenland stub)

Stub state. Goal: confirm the persona honestly surfaces "in
Vorbereitung" framing per the visible-gap rule (HANDOFF.md § 7.2),
falling back to federal BauGB / BauNVO citations only.

| Field            | Value                                                       |
| ---------------- | ----------------------------------------------------------- |
| Intent           | "Einfamilienhaus" → T-01                                    |
| PLZ              | `01067` (Dresden central)                                   |
| Address          | `Theaterplatz 1, 01067 Dresden`                             |
| Project name     | `[SMOKE-2026-05-11] cell 13: sachsen × T-01`                |
| Bundesland override | `sachsen`                                                |

**Pass criterion (cell 13):**

- Override SQL succeeds.
- Persona's first 1-2 turns include verbatim or paraphrased "in
  Vorbereitung" framing — wording from `src/legal/states/sachsen.ts`
  acknowledging that state-specific content is pending.
- Persona DOES NOT invent SächsBO citations (since
  `allowedCitations: []` for Sachsen — the firewall would catch it).
- Persona may cite federal BauGB / BauNVO §§ (these aren't gated by
  state).
- Helper SQL **C** returns 0 rows OR returns rows but each marks a
  drift from the empty allowedCitations (if so, log as informational).

**Fail patterns:**

- Persona invents SächsBO §§ → P1 firewall failure (Layer-C should
  block — v1.0.5 B3 closure).
- Persona claims Sachsen content is fully ready → P1 honesty regression.

---

### Cell 14 — Berlin × T-01 (Stadtstaat, cityBlock=null)

Stadtstaat. Per `src/legal/states/berlin.ts:7` comment: *"lives
entirely in systemBlock. No StateDelta.kind discriminator."* Goal:
confirm the persona handles "city is the state" without trying to
reach for a sub-municipal Satzung.

| Field            | Value                                                       |
| ---------------- | ----------------------------------------------------------- |
| Intent           | "Einfamilienhaus" → T-01                                    |
| PLZ              | `10115` (Berlin Mitte)                                      |
| Address          | `Schönhauser Allee 36, 10115 Berlin` (or any Berlin address) |
| Project name     | `[SMOKE-2026-05-11] cell 14: berlin × T-01`                 |
| Bundesland override | `berlin`                                                 |

**Pass criterion (cell 14):**

- Override SQL succeeds.
- Persona acknowledges Berlin is a Stadtstaat OR surfaces the
  "in Vorbereitung" framing for stub-grade content (per
  `berlin.ts:18-19` per POST_V1_AUDIT MIN-10 reference).
- Persona does NOT request "kommunale Satzungen" separately from
  Land-level law (since Berlin has no separate municipal layer).
- Persona does NOT invent BauO Bln §§ (firewall: Berlin has
  `allowedCitations: []`).

**Fail patterns:**

- Persona requests a separate München-style cityBlock → P2 framing
  bug (the persona is not honoring `cityBlock=null` semantics).
- Persona invents BauO Bln §§ → P1 firewall failure.

---

### Optional broader coverage (only if time permits after the 14 above)

These are NOT mandatory for v1 honest-delivery — they fill the
matrix toward a fuller picture but each one has diminishing return:

| Cell | Bundesland   | Template | Rationale                                 |
| ---- | ------------ | -------- | ----------------------------------------- |
| 15   | NRW          | T-03     | Confirm substantive state × non-T-01      |
| 16   | Hessen       | T-04     | Confirm substantive state × non-T-01      |
| 17   | Hamburg      | T-01     | Second Stadtstaat (cityBlock=null variant)|
| 18   | Bremen       | T-01     | Third Stadtstaat                          |
| 19   | Thüringen    | T-01     | Second Flächenland stub                   |
| 20   | Schleswig-H. | T-01     | Third Flächenland stub                    |

Each cell follows the substantive (cells 2-5) or stub (cell 13) /
Stadtstaat (cell 14) pattern.

---

## 3. Architect end-to-end flow (1 test case)

**Pre-requisite:** Cell 1 (Bayern × T-01) has completed at least
through round 10, producing ≥5 qualifier-bearing facts in the
matrix. **Use cell 1's project UUID below.**

The Phase 13 deliverable end-to-end (per
`docs/PHASE_13_REVIEW.md:99-117`):

> Bauherr creates project → invites architect → architect logs in
> at /architect → reviews matrix → clicks Bestätigen on each
> qualifier → footer hides for that fact.

### Step-by-step

**Step A — Bauherr generates the invite token (SQL path; simplest):**

In Supabase Dashboard SQL Editor, signed in as Bauherr is NOT
required (Dashboard runs as `postgres` admin):

```sql
-- Use cell 1's project UUID:
insert into public.project_members (
    project_id,
    role_in_project,
    expires_at
)
values (
    '<cell-1-project-uuid>',
    'designer',
    now() + interval '7 days'
)
returning id, project_id, role_in_project, invite_token, expires_at;
```

Note the `invite_token` UUID. Construct the accept URL:
`https://planning-matrix.vercel.app/architect/accept?token=<invite_token>`

**Alternative — Edge Function path (v1.0.1 hardened):** signed in
as Bauherr in browser, open DevTools console:

```js
const r = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/share-project`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${(await window.supabase.auth.getSession()).data.session.access_token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ action: 'create', projectId: '<cell-1-project-uuid>' }),
})
const j = await r.json()
console.log(j) // { inviteToken, expiresAt, acceptUrl }
```

Note the returned `acceptUrl`.

**Step B — Architect signs in and accepts:**

1. Sign out as Bauherr (or use a separate browser profile / incognito).
2. Sign in as Architekt (the account promoted in § 1.4).
3. Open the accept URL: `/architect/accept?token=<invite_token>`.
4. The SPA auto-POSTs to `share-project`. Per
   `PHASE_13_REVIEW.md:80-86`: Edge Function flips `user_id +
   accepted_at` on the row. Capture `arch-1-accept-success.png`.
5. SPA redirects to `/architect`. Capture `arch-2-dashboard.png`.

**Pass criterion (Step B):** SPA lands on `/architect` showing the
project in the architect's list. SQL probe to confirm:

```sql
select project_id, user_id, role_in_project, accepted_at
  from public.project_members
 where invite_token = '<invite_token>';
-- Expected: user_id is now the Architekt's auth.users.id;
--          accepted_at is non-null and recent.
```

**Step C — Architect opens the verification panel:**

1. From `/architect`, click into the cell-1 project.
2. Navigate (or click) to `/architect/projects/<cell-1-uuid>/verify`.
3. Capture `arch-3-verify-panel.png`. The panel should list every
   qualifier-bearing entry from the matrix (facts, recs, etc.) with
   a **Bestätigen** button per row.

**Pass criterion (Step C):** Panel renders ≥5 rows; each row's
qualifier text reads `DESIGNER+ASSUMED` (or similar pre-verify
state) per `src/types/projectState.ts:Qualifier`.

**Step D — Architect clicks Bestätigen on ONE fact:**

1. Pick the topmost fact. Click **Bestätigen**.
2. Capture `arch-4-after-verify.png`. The row should re-render
   showing `DESIGNER+VERIFIED` (or the verified state's visual
   treatment).
3. SQL probe — helper SQL **E** for cell 1's project:
   ```sql
   select server_ts, name, attributes
     from public.event_log
    where project_id = '<cell-1-uuid>'
      and name in ('qualifier.verified', 'qualifier.rejected', 'qualifier.downgraded')
    order by server_ts desc limit 5;
   ```
   **Expected:** one new row with `name = 'qualifier.verified'`,
   recent `server_ts`, attributes naming the verified field.

**Pass criterion (Step D):** UI re-renders to verified state AND
event_log carries the `qualifier.verified` event. **This is the
first observed production firing of the v1.5 §6.B.01 legal shield.**

**Step E — Bauherr-side footer hide confirmation:**

1. In a separate browser session (or after signing back in as
   Bauherr), open `/projects/<cell-1-uuid>/result`.
2. Find the verified fact in the result tabs (Overview / Procedure
   & Documents / etc., per `src/features/result/components/tabs/`).
3. **Expected:** the **Vorläufig** footer ("bestätigt durch eine/n
   bauvorlageberechtigte/n Architekt:in noch ausstehend") is
   ABSENT under the verified card. All other still-pending cards
   continue to show the footer.
4. Capture `arch-5-bauherr-footer-hidden.png`.
5. The aggregate tab-level footer (per `OverviewTab.tsx:52`,
   `TeamTab.tsx:136`, etc.) should remain visible if any other
   facts on the same tab are still pending.

**Pass criterion (Step E):** Per-card footer absent on the verified
card. Other-card footers present. Aggregate footer present iff any
unverified card remains.

**Fail patterns to capture:**

- Step A INSERT fails → `project_members` RLS blocked the path
  (unlikely; Dashboard is admin). If using the Edge Function path:
  capture the response body — likely the v1.0.1 owner-check failure.
- Step B `share-project` returns 401/403 → CORS issue (re-do § 1.7
  probe) OR auth token problem.
- Step C `verify-fact` Edge Function returns 401/403 → CORS or
  designer-role check failure.
- Step D click does nothing visible → verify-fact mutation failed
  silently. Check `verifyMutation.error` in DevTools → React Query
  cache. Capture event_log probe — if no row inserted, the function
  failed before reaching event_log emit.
- Step D event_log shows `qualifier.rejected` instead of
  `qualifier.verified` → CRITICAL — the gate rejected the architect's
  own verify call. Capture full request/response from DevTools.
- Step E footer still shows → SPA cache issue (refresh) OR
  `VorlaeufigFooter` is reading stale `isPending()` predicate
  (per v1.0.3 fix `b98cc98`). Capture both `projects.state` JSONB
  before/after for diff.

---

## 4. Bug-finding template (per failed cell or step)

For every fail, append a section to **this document** (under § 4)
with this template:

```markdown
### Bug B-<NN> — Cell <X> / Step <Y>: <one-line symptom>

- **Cell / step:** Cell <X> (<bundesland> × <template>) OR Architect Step <Y>
- **Symptom:** <what broke; one paragraph>
- **Screenshot:** `~/Desktop/smoke-2026-05-11/cell<X>-<step>.png`
- **Persona excerpt (if relevant):**
    > <verbatim persona text>
- **Event_log probe output:**
    ```
    <SQL output of helper C/D/E showing the relevant rows>
    ```
- **Expected:** <what should have happened>
- **Actual:** <what did happen>
- **Severity:** P0 / P1 / P2 (criteria below)
- **Where to fix:** v1.0.6 hot-fix vs v1.1 sprint
- **Suggested triage notes:** <one paragraph>
```

**Severity rubric:**

- **P0** = blocks v1 client-readiness even at narrowed scope. Examples:
  citation firewall failure on Bayern (the cell that *must* work),
  architect verify silently fails, locked CTA copy never reaches user
  for `qualifier_role_violation`.
- **P1** = blocks v1 honest-delivery at the broader scope (16×8 +
  architect). Examples: bundesland override doesn't propagate, spine
  cannot reach Final synthesis, template content not loading.
- **P2** = scope-degrade only (operator workaround possible).
  Examples: Vorläufig footer cosmetic glitch, verify-fact idempotency,
  Stadtstaat framing slightly off.

**Fix routing:**

- **v1.0.6 hot-fix** = anything P0 + small-blast-radius P1
  (single-file fix, no schema migration).
- **v1.1 sprint** = larger-scope P1 (e.g., race-fix already on
  `feature/v1-0-6-race-fix`), all P2.

---

## 5. Rollup table (fill as you execute)

| #  | Cell                                  | Wizard | Override | Persona | Lint (C) | Events (D) | Spine     | Pass / Fail | Bugs       |
| -- | ------------------------------------- | :----: | :------: | :-----: | :------: | :--------: | :-------: | :---------: | ---------- |
| 1  | bayern × T-01 (full Final-synthesis)  | ☐      | n/a      | ☐       | ☐        | ☐          | ☐ FS?     | ☐           |            |
| 2  | nrw × T-01                            | ☐      | ☐        | ☐       | ☐        | ☐          | round 5   | ☐           |            |
| 3  | bw × T-01                             | ☐      | ☐        | ☐       | ☐        | ☐          | round 5   | ☐           |            |
| 4  | hessen × T-01                         | ☐      | ☐        | ☐       | ☐        | ☐          | round 5   | ☐           |            |
| 5  | niedersachsen × T-01                  | ☐      | ☐        | ☐       | ☐        | ☐          | round 5   | ☐           |            |
| 6  | bayern × T-02 (MFH)                   | ☐      | n/a      | ☐       | ☐        | ☐          | round 5   | ☐           |            |
| 7  | bayern × T-03 (Sanierung)             | ☐      | n/a      | ☐       | ☐        | ☐          | round 5   | ☐           |            |
| 8  | bayern × T-04 (Umnutzung)             | ☐      | n/a      | ☐       | ☐        | ☐          | round 5   | ☐           |            |
| 9  | bayern × T-05 (Abbruch)               | ☐      | n/a      | ☐       | ☐        | ☐          | round 5   | ☐           |            |
| 10 | bayern × T-06 (Aufstockung)           | ☐      | n/a      | ☐       | ☐        | ☐          | round 5   | ☐           |            |
| 11 | bayern × T-07 (Anbau)                 | ☐      | n/a      | ☐       | ☐        | ☐          | round 5   | ☐           |            |
| 12 | bayern × T-08 (Sonstiges)             | ☐      | n/a      | ☐       | ☐        | ☐          | round 5   | ☐           |            |
| 13 | sachsen × T-01 (stub)                 | ☐      | ☐        | ☐ "in V"| ☐        | ☐          | n/a       | ☐           |            |
| 14 | berlin × T-01 (Stadtstaat)            | ☐      | ☐        | ☐ "in V"| ☐        | ☐          | n/a       | ☐           |            |
| 15-20 | optional broader cells             | ☐      | ☐        | ☐       | ☐        | ☐          |           | ☐           |            |

| Item                                 | Pass / Fail | Notes                              |
| ------------------------------------ | :---------: | ---------------------------------- |
| Architect Step A (invite token)      | ☐           |                                    |
| Architect Step B (accept lands)      | ☐           |                                    |
| Architect Step C (verify panel renders) | ☐        |                                    |
| Architect Step D (Bestätigen + event_log) | ☐      | First production firing of §6.B.01 |
| Architect Step E (Bauherr-side hide) | ☐           |                                    |
| § 1.7 CORS sanity probe              | ☐           |                                    |
| Pre-walk Bayern SHA                  | ☐           |                                    |
| Post-walk Bayern SHA                 | ☐           |                                    |

| Free-text                                       | Value          |
| ----------------------------------------------- | -------------- |
| Vercel deployed source SHA (from § 1.1)         |                |
| Live bundle hash (from `index-<HASH>.js`)       |                |
| Walk start time (UTC)                           |                |
| Walk end time (UTC)                             |                |
| Total cells attempted                           |                |
| Total cells PASSED                              |                |
| Bugs filed (count)                              |                |
| `qualifier_rates_7d_global.turns_count` after walk |             |

---

## 6. Exit criteria — what does "v1 actually delivered" look like?

The walk is **complete and v1 is honestly delivered** when ALL of:

### 6.1 Hard floor (cannot ship without these)

- [ ] **Cell 1 (Bayern × T-01) PASSES end-to-end including
  Final-synthesis.** This is the minimum proof that the contracted
  pipeline (wizard → chat → matrix → spine → Final synthesis) works
  in production.
- [ ] **Cells 6-12 (Bayern × T-02..T-08) PASS at smoke depth.** All
  8 templates exercised in the well-tested state. No template
  produces identical content to another in the first 3 turns.
- [ ] **Architect end-to-end Steps A→E PASS** for cell 1's project.
  This is the first observable production firing of the v1.5 §6.B.01
  legal shield. Without it, Phase 13 ships untested.
- [ ] **Bayern SHA `b18d3f7f...3471` MATCH** at start AND end of the
  walk.
- [ ] **`qualifier_rates_7d_global.turns_count > 0`** after the walk
  (the v1.0.4 alarm rewire is empirically validated).

### 6.2 Honest-scope floor (deliver against the wider contracted surface)

- [ ] **Cells 2-5 (NRW, BW, Hessen, NS × T-01) PASS at smoke depth.**
  Each substantive Phase-12 state cites its own LBO correctly. If
  ANY of these fails, the wizard's hardcoded-Bayern is concealing
  a broken citation firewall that cannot ship without an empirical
  test.
- [ ] **Cell 13 (Sachsen) shows the "in Vorbereitung" framing.** The
  visible-gap rule is honestly enforced for at least one Flächenland
  stub.
- [ ] **Cell 14 (Berlin) handles the cityBlock=null case** without
  inventing BauO Bln citations. The Stadtstaat architecture
  decision is honestly enforced.

### 6.3 Process gate (the audit-trail evidence)

- [ ] **`docs/PHASE_17_SIGNOFFS.md § 4` (72-point smoke walk closure)**
  is filled per the rollup table § 5 above. The 14 cell rows + 5
  architect-step rows constitute the smoke evidence — paste them in
  by section, with screenshot references intact.
- [ ] **`docs/PHASE_17_SIGNOFFS.md § 5` (daily-gate evidence at tag
  commit)** is filled with the pre-walk + post-walk gate output
  (Bayern SHA, smokeWalk, tsc, build).
- [ ] **`docs/PHASE_17_SIGNOFFS.md § 7` (tag commit SHA recorded)**
  is filled with `c35e3fa` (v1.0.5) + the live deploy's source SHA.

### 6.4 Bug-disposition gate

- [ ] **All P0 bugs filed in § 4 are RESOLVED** (either fixed in a
  v1.0.6 hot-fix tag OR explicitly marked WONTFIX with a documented
  scope-narrow rationale that the user signs).
- [ ] **All P1 bugs are TRIAGED** (each one explicitly assigned to
  v1.0.6 or v1.1 with a recorded decision; no P1 may remain
  un-triaged).
- [ ] **P2 bugs may be deferred** to v1.1 backlog (no triage gate).

### 6.5 Honesty floor (what makes this NOT just engineering theater)

- [ ] **Every cell's pass/fail is supported by empirical evidence**:
  screenshot path + helper SQL output snippet + persona excerpt. No
  pass marked without those three artifacts.
- [ ] **The rollup table § 5 is fully filled** — no `☐` left empty
  on any attempted row. Skipped cells are explicitly so-marked.
- [ ] **Bug template § 4 is filled for every fail** — symptoms,
  expected vs actual, severity, fix routing. No fail left as
  oral history.

---

## Appendix A — The Bayern SHA bookend

**Before starting the walk, run:**

```sh
npm run verify:bayern-sha
```

Paste the output here:

```
<paste here>
```

**After finishing the walk (after § 5 rollup is filled), run again:**

```sh
npm run verify:bayern-sha
```

Paste the output here:

```
<paste here>
```

If the SHA changed during the walk, **STOP and investigate** —
something edited `src/legal/{shared,federal,bayern,muenchen,personaBehaviour,
templates/shared}.ts`. The walk is invalidated until the change is
understood.

---

## Appendix B — File:line references for the operator

Quick-reference if you need to read the implementation behind a step:

- Wizard project insert: `src/features/wizard/hooks/useCreateProject.ts:182-194`
- Bayern hardcode: `src/features/wizard/hooks/useCreateProject.ts:184`
- Intent → template map: `src/features/wizard/lib/selectTemplate.ts:94-112`
- StateDelta registry: `src/legal/legalRegistry.ts:51-67`
- Bayern SHA computation: `scripts/lib/bayernSha.mjs`
- Citation lint: `supabase/functions/chat-turn/citationLint.ts`
- Qualifier-write gate constant: `src/lib/projectStateHelpers.ts:187` (`QUALIFIER_GATE_REJECTS = true`)
- gateQualifiersByRole: `src/lib/projectStateHelpers.ts:77`
- VorlaeufigFooter: `src/features/architect/components/VorlaeufigFooter.tsx`
- Result tabs (Bauherr-side): `src/features/result/components/tabs/{Overview,CostTimeline,ProcedureDocuments,Suggestions,Team}Tab.tsx`
- Architect verification panel: `src/features/architect/pages/VerificationPanel.tsx`
- Accept-invite landing: `src/features/architect/pages/AcceptInvite.tsx`
- share-project Edge Function: `supabase/functions/share-project/index.ts`
- verify-fact Edge Function: `supabase/functions/verify-fact/index.ts`
- chat-turn Edge Function: `supabase/functions/chat-turn/index.ts`
- chat-turn streaming variant: `supabase/functions/chat-turn/streaming.ts`

DO NOT edit any of the above during the walk. Edits invalidate the
walk's empirical evidence. If a fix is needed, file it as a bug per
§ 4 and address in a separate session.
