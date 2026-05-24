# LAYER-C FIREWALL BUNDESLAND-RESOLUTION PROBE

**Repo:** `/Users/rutikerole/Planning_Matrix` · **HEAD:** `c374ef7` · **Date:** 2026-05-24 · **Mode:** READ-ONLY. Bayern SHA MATCH preserved.
**Trigger:** NON_BAYERN_PROD_FORENSICS.md §2b — a Hessen project (`24c8fb67-…`) whose `role-energieberater` qualifier carries the verbatim reason `citation not in allow-list: GEG 50 (active=bayern)`, while the persona content for the same project is Hessen-correct. Question: is this a **CODE BUG** (firewall reads a different Bundesland than the prompt composer) or a **DATA ARTIFACT**?

## VERDICT: 🟦 DATA ARTIFACT — not a code bug. The firewall is sound.

The two "non-Bayern" Hessen test projects were **created as `bundesland='bayern'`** and **manually relabeled to `'hessen'` afterward** (no app path updates the column). The `(active=bayern)` downgrade reflects the project's real Bundesland *at that turn* — `bayern` — read identically by the composer and the firewall. There is **no resolution split anywhere in the code**, at current HEAD or at the build live on 2026-05-11.

---

## 1. EMPIRICAL: the event(s) + the project's current state

**Project `24c8fb67-6445-4fea-acc5-dc461bdf5352` (Römerberg, Frankfurt), live row today:**
```
bundesland = "hessen"   city = "muenchen"   state_version = 10
created_at = 2026-05-11T07:38:57Z   updated_at = 2026-05-11T11:55:24Z
```
The `(active=bayern)` reason is stored in `state.roles[role-energieberater].qualifier.reason`, written `2026-05-11T07:50:08Z`.

**`event_log` for this project (read-only PostgREST):** 80 rows, **none are `citation.*` or `qualifier.*`** — only client-side `chat/result/wizard` events (`message_received`, `tab_opened`, `export_*`, etc.). A **global** query (`name like 'citation*' OR 'qualifier*'`) returns **0 rows** across the entire DB. So Layer-C's server-side events were never persisted (the inserts are best-effort/swallowed, or were not emitted on that build) — the only surviving trace of what Layer-C used is the **frozen qualifier reason string**, which states `bayern` explicitly. That string is built at `citationLint.ts:647` as `` ` (active=${code})` `` where `code = normalizeBundeslandCode(activeBundesland)`. So `activeBundesland` normalized to `bayern` at that turn — definitively.

---

## 2. CODE: every `enforceCitationAllowList` / `lintCitations` / composer callsite — same source

At **current HEAD**, the active Bundesland passed to the firewall and to the prompt composer is the **identical `project.bundesland`** (the loaded `projects` row column), at every callsite:

| Callsite | file:line | Bundesland source |
|---|---|---|
| Composer (JSON path) | `chat-turn/index.ts:358` | `buildSystemBlocks(…, project.bundesland)` |
| Composer (retry) | `chat-turn/index.ts:380` | `buildSystemBlocks(…, project.bundesland)` |
| Layer A/B linter | `chat-turn/index.ts:421` | `lintCitations(toolInput, project.bundesland)` |
| **Layer C allow-list** | `chat-turn/index.ts:459` | `enforceCitationAllowList(toolInput, project.bundesland)` |
| Composer (final commit) | `chat-turn/index.ts:588` | `buildSystemBlocks(…, project.bundesland)` |
| Streaming linter + Layer C | `streaming.ts:244,273` | `lintCitations/enforceCitationAllowList(toolInput, args.bundesland)` — `args.bundesland` doc'd as "the projects row's bundesland column" (`streaming.ts:76-79`) |

- `composeLegalContext(bundesland)` itself: `systemPrompt.ts:256` → `compose.ts:64`. Same `bundesland` arg threaded from `buildSystemBlocks`.
- **`project.bundesland` is never reassigned** between load and these callsites (grep: no `project.bundesland =` in `index.ts`; `persistence.ts:34` merely types `bundesland: string`).

**Because the composer and the firewall read the same variable, an in-code "composer says Hessen / firewall says Bayern" split for one turn is impossible.** If Layer-C saw `bayern`, the composer saw `bayern` too — the persona produced Hessen-leaning content by following the **live-state facts** (`plot.bundesland="Hessen"`, the Frankfurt address, `plot.outside_munich_acknowledged`) over the Bayern legal slab, which is the model doing the right thing despite a wrong column.

---

## 3. WAS THE 2026-05-11 BUILD DIFFERENT? — git archaeology says no

- `enforceCitationAllowList(toolInput, project.bundesland)` was introduced in **`c35e3fa` (2026-05-08)** — the *only* commit ever touching that callsite. `git show c35e3fa:…/index.ts` confirms lines 358/380/421/459/588 all already used `project.bundesland`. This is the code **live on 2026-05-11**.
- The **bundesland-aware composer** (`composeLegalContext(bundesland)` + the `buildSystemBlocks` bundesland arg) landed **`667bb44` (2026-05-07, Phase 11/1)**; the per-Bundesland firewall registry landed **`872f436` (2026-05-07, Phase 11/2)**.
- So by both 2026-05-08 (Marienplatz) and 2026-05-11 (Römerberg), the composer **and** Layer-C were already reading the same `project.bundesland`. No historical build with a split existed for these projects.

---

## 4. WHY THE COLUMN WAS `bayern` THEN, `hessen` NOW — the decisive corroboration

**The `city` column is the fingerprint.** `useCreateProject.ts:256` sets `city: input.bundesland === 'bayern' ? 'muenchen' : null`. Therefore:
- A project created with `bundesland='hessen'` (post-B04) **must** have `city=null`.
- Both Hessen rows have **`city='muenchen'`** → they were **not** created as Hessen.
- B04 (the `city = bayern?muenchen:null` logic + the dropdown) landed **`eb44b7e` (2026-05-11)**. **Before** B04 the wizard hardcoded `bundesland='bayern'` for *every* project. So whether created pre-B04 (forced bayern) or post-B04 (`city='muenchen'` ⟺ chosen bayern), **both Hessen rows were created as `bundesland='bayern'`.**

**No app path changes `bundesland` after creation:** grep of `supabase/functions/**` finds **no UPDATE of `projects.bundesland`** anywhere; the wizard writes it once at INSERT. So the transition `bayern → hessen` on these two rows could only have happened **out-of-band** (SQL editor / dashboard) — a manual relabel to exercise the non-Bayern path.

**Reconstructed timeline for `24c8fb67` (Römerberg):**
1. Created `bayern` (→ `city='muenchen'`), Frankfurt address typed.
2. Early turns 07:39–08:00 ran with column `bayern`: composer got `bayern` (but persona followed the Frankfurt/Hessen live-state facts → Hessen-leaning content), and Layer-C got `bayern` → checked `GEG § 50` against **Bayern's** allowlist (which has `GEG § 8`, not `§ 50`, per `citationLint.ts:96-144`) → **downgraded** the role to DESIGNER+ASSUMED with reason `(active=bayern)`.
3. The column was manually relabeled to `hessen` (no app path does this), leaving `city='muenchen'` and the `(active=bayern)` qualifier as **frozen bayern-era residue**.
4. The later turn at 11:55 (after the ~4 h gap) ran with column `hessen` → clean `§ 63 HBO` content.

The Marienplatz row (`3ac8ddb5`, created 2026-05-08, **pre-B04**, München address, `city='muenchen'`, `sv=0`) is the same story in stronger form: pre-B04 it could *only* have been created `bayern`, so its full BayBO/München content was **correct for its München address** — it is a genuine Bayern/München project later relabeled `hessen`, **not** a persona leak.

---

## 5. CORRECTION TO NON_BAYERN_PROD_FORENSICS.md

This probe **revises** two earlier interpretations (code/data win over the first read):
- **§1 (Marienplatz "total Bayern saturation of a hessen project")** — overstated. It was a *correctly-served Bayern/München project* (created bayern, München address) **manually retagged hessen**. Not a leak.
- **§2b (Römerberg "Layer-C resolved active=bayern while composer served Hessen" — possible new P1)** — **not a firewall bug.** The column was `bayern` at that turn; composer and firewall agreed; the persona overrode toward Hessen via live-state facts. New-P1 lead **withdrawn.**
- **Net:** of the 5 non-Bayern rows, the 2 "hessen" ones were Bayern-created-and-relabeled; the **3 genuinely-created non-Bayern projects (nrw×2, berlin — all `city=null`) show ZERO Bayern leak.** The real-data Bayern leak in genuinely-created non-Bayern projects is **nil** in this dataset.

---

## 6. WHAT IS GENUINELY EXPOSED (smaller, real)

Not a firewall bug — but the episode surfaces two real, minor data-integrity gaps:
1. **No UI to correct a project's `bundesland` after creation.** A mis-set dropdown (or the pre-B04 forced `bayern`) can only be fixed by an out-of-band SQL relabel — which leaves **stale `city='muenchen'`** and frozen qualifier residue. `city` is not recomputed on a `bundesland` change because nothing changes `bundesland` in-app. *(Relates to FULL_GERMANY_AUDIT Bug 42.)*
2. **Relabeled test projects are not faithful tests of the non-Bayern *creation* path.** Any future "is the non-Bayern path clean?" check must use genuinely-created non-Bayern projects (`city=null`), not relabeled ones, or it will see bayern-era residue and misread it as a live leak — exactly what almost happened here.

**No code change is implied for the firewall.** If anything is desired, it is (a) an owner/admin affordance to change `bundesland` that also resets `city`, and (b) a one-off data cleanup of the two relabeled rows (`city → null`). Both are data/UX, not firewall correctness.

*Bayern SHA verified MATCH. No production code or data modified. The `(active=bayern)` string and all timestamps are verbatim from prod `state`/`event_log`; commit SHAs/dates from `git log`.*
