# Planning Matrix — HANDOFF

> The single document that lets the next operator/engineer run and
> extend Planning Matrix v1 without the build engineer in the room.
> Reads end-to-end on first pass; subsequent visits use the table of
> contents. **This document IS the v1 deliverable's audit trail.**

## Contents

1. What Planning Matrix is
2. Architecture overview
3. v1.5 concept → code mapping
4. How to extend StateDelta (add a new state's content)
5. How to add a new template
6. How to read the audit + phase-review docs
7. Known post-v1 follow-up work (12.5 / 14 / 15 / 16)
8. Glossary of system-internal terms
9. Contact handoff

---

## 1. What Planning Matrix is

Planning Matrix is a **single-page web application** that helps a
*Bauherr* (private-sector building owner) prepare a German building-
permit ("Bauantrag") through a structured AI-assisted research
conversation. The app is in active use as the v1.5 architecture
document's flagship deliverable; it is **not a public-market product
seeking PMF**. The audience is the v1.5 manager + the architects /
engineers / authorities they invite onto a project.

What v1 does:

- Gathers project facts from the Bauherr through a guided wizard
  (PLZ + template type) plus a roundtable chat with seven specialist
  personas (moderator, Planungsrecht, Bauordnungsrecht, sonstige
  Vorgaben, Verfahren, Beteiligte, synthesizer).
- Persists all state in a typed JSONB document (`projects.state`)
  whose shape is `src/types/projectState.ts`.
- Surfaces the result as a tabbed Workspace (Overview / Cost &
  Timeline / Procedure & Documents / Team) with a per-card qualifier
  ("LEGAL+CALCULATED", "DESIGNER+ASSUMED", etc.) and a "Vorläufig"
  footer for entries that need architect verification (Phase 13).
- Lets a `role='designer'` architect be invited to a project to
  explicitly verify qualifiers — clients cannot mint
  DESIGNER+VERIFIED themselves (Phase 13 §6.B.01 legal shield).

What v1 deliberately does NOT do:

- Public landing-page sign-up / PMF marketing.
- Substantive content for 11 of 16 Bundesländer (those carry
  honest "in Vorbereitung" stubs — see § 7.2 below).
- Per-state Geoportals beyond München's WMS (§ 7.3).
- Automated nightly regression at scale (§ 7.4).
- An architect-onboarding self-service flow — designer role is
  manager-provisioned via SQL until post-v1.

---

## 2. Architecture overview

Planning Matrix is a typed three-layer document model wrapped in
a typed conversation pipeline.

### 2.1 The three document layers (v1.5 §3 — DECISION DECOMPOSITION)

| Layer            | Where it lives in code | Edited by | Cached |
| ---------------- | ---------------------- | --------- | ------ |
| **Constitutional** | `src/legal/{shared,federal,bayern,muenchen,personaBehaviour}.ts` + `src/legal/states/*.ts` + `src/legal/templates/*.ts` | Build engineer at PR time; never at runtime | Yes — Bayern prefix SHA `b18d3f7f9a6fe238c18cec5361d30ea3a547e46b1ef2b16a1e74c533aacb3471` is the byte-for-byte invariant |
| **Template**     | `src/legal/templates/{t01-neubau-efh, t02-neubau-mfh, t03-sanierung, t04-umnutzung, t05-abbruch, t06-aufstockung, t07-anbau, t08-sonstiges}.ts` | Build engineer | Inside the cached prefix when shared, after when template-specific |
| **Project instance** | `public.projects.state` JSONB column (shape: `src/types/projectState.ts`) | The persona's `respond` tool call (only) | Per-row |

The three layers are concatenated in this order at chat-turn time
to produce the Anthropic system prompt:

```
[CONSTITUTIONAL: shared + federal + (state delta = bayern + muenchen / NRW / BW / NS / HE / minimum-stub)] ← cached
[TEMPLATE: T-XX block]                                      ← cached when same T applies
[PROJECT INSTANCE: live state delta]                        ← never cached
```

The cache boundary is what makes the Bayern SHA invariant
load-bearing: any byte-level change to the constitutional Bayern
region would invalidate Anthropic's prompt cache, blow the cost
model, AND risk subtly altering persona behaviour. The
`scripts/lib/bayernSha.mjs` module is the authoritative computation;
`scripts/verify-bayern-sha.mjs` is the standalone CLI;
`scripts/smokeWalk.mjs` re-runs the same computation as a daily
gate.

### 2.2 The 16-state StateDelta framework (Phase 11)

`src/legal/legalRegistry.ts` is a typed
`Record<BundeslandCode, StateDelta>` that maps each of the 16
German Bundesländer to a `StateDelta`:

```ts
// src/legal/states/_types.ts
export interface StateDelta {
  systemBlock: string         // persona-grade legal/local content
  allowedCitations: string[]  // anchors the persona can cite
  homeBundesland: BundeslandCode
}
```

Currently:

- **bayern** carries the deepest content (the SHA-invariant block).
- **bw / hessen / niedersachsen / nrw** carry Phase-12 substantive
  content — verbatim §§-anchored for verfahrensfrei /
  vereinfachtes / reguläres Verfahren + Genehmigungsfreistellung +
  Bauvorlageberechtigung etc.
- **berlin / brandenburg / bremen / hamburg / mv / rlp / saarland /
  sachsen / sachsen-anhalt / sh / thueringen** carry minimum stubs
  with `allowedCitations: []` and a verbatim "in Vorbereitung"
  Hinweis the persona reads aloud when asked specifics. **This is
  the v1 minimum.** See § 7.2.

`src/legal/compose.ts` exposes `composeLegalContext(bundesland)`
that pulls the right StateDelta from the registry; `chat-turn`
calls this once per turn. The composition is order-stable and
SHA-checked when the bundesland is `'bayern'`.

### 2.3 The seven specialists

The persona is a roundtable. `src/legal/personaBehaviour.ts`
defines the seven specialists, the `respond` tool's `specialist`
discriminator, and the rules for when each speaks:

| Specialist | Domain |
| ---------- | ------ |
| moderator  | Front-of-house; opens; routes |
| planungsrecht | BauGB §§ 30/34/35 + BauNVO + Bebauungsplan |
| bauordnungsrecht | LBO/BayBO + GK + Abstandsflächen |
| sonstige_vorgaben | Denkmal / Naturschutz / Baulasten / kommunal |
| verfahren | Welches Verfahren ist nötig + Anforderungen |
| beteiligte | Welche Fachplaner:innen + welche Behörden |
| synthesizer | Synthese-Turn at the end of a thread |

Each persona's voice is constrained to a German-formal-Sie register;
the `personaBehaviour.ts` file enforces that constraint via the
ZITATE-DISZIPLIN rule (§ 8.4 below).

### 2.4 The qualifier system

Every fact / recommendation / procedure / document / role in
`projects.state` carries a qualifier:

```ts
// src/types/projectState.ts
export type Source  = 'LEGAL' | 'CLIENT' | 'DESIGNER' | 'AUTHORITY'
export type Quality = 'CALCULATED' | 'VERIFIED' | 'ASSUMED' | 'DECIDED'
export interface Qualifier {
  source: Source
  quality: Quality
  setAt: string          // ISO instant
  setBy: 'user' | 'assistant' | 'system'
  reason?: string
}
```

The four-by-four product is read as confidence + provenance. The
**v1.5 §6.B.01 legal shield** says only role='designer' callers
can mint `DESIGNER+VERIFIED` — a CLIENT-turn that emits this
combination is rejected at the Edge Function before
`applyToolInputToState` runs (Phase 13 Week 2 gate-flip). The gate's
constant lives at `src/lib/projectStateHelpers.ts` →
`QUALIFIER_GATE_REJECTS = true`.

### 2.5 The chat-turn pipeline

`supabase/functions/chat-turn/index.ts` is the per-turn entrypoint.
The flow:

  1. CORS + auth check (Bearer token).
  2. Load project + last 30 messages.
  3. Insert user message (idempotent on `client_request_id`).
  4. Build the system prompt (constitutional + template + state
     block) and call Anthropic with forced `tool_choice: respond`.
  5. Validate tool input (Zod, strict).
  6. Phase 8.6 fact-plausibility check.
  7. Phase 10.1 + 11 citation lint (Bundesland firewall).
  8. **Phase 13 qualifier-write gate** (rejects on CLIENT
     DESIGNER+VERIFIED attempts).
  9. `applyToolInputToState` reduces the deltas into the new
     state.
  10. `commit_chat_turn` RPC writes assistant message + project
      state UPDATE in a single transaction.
  11. Return JSON or stream as SSE (per Accept header).

Streaming variant lives in
`supabase/functions/chat-turn/streaming.ts`; both share helpers
under the same directory. See `docs/PHASE_3_BRIEF.md` for the
architectural rationale and `docs/PHASE_8_6_FINDINGS.md` for the
A/B/C/D decisions.

---

## 3. v1.5 concept → code mapping

| v1.5 §       | Concept | Where in code |
| ------------ | ------- | ------------- |
| §3           | Decision-decomposition document layers | `src/legal/` + `src/legal/templates/` + `src/types/projectState.ts` |
| §4           | Areas A/B/C (Planungsrecht / Bauordnung / Sonstige) | `src/types/projectState.ts:Areas` + `src/lib/projectStateHelpers.ts:applyAreasUpdate` |
| §4.B.03      | Qualifier system (Source × Quality) | `src/types/projectState.ts:Qualifier` + `src/lib/projectStateHelpers.ts` |
| §5           | Wizard I-01 (PLZ) + I-02 (no-plot) | `src/features/wizard/` + `src/features/wizard/hooks/useCreateProject.ts` |
| §6.B.01      | Designer-role legal shield | `src/lib/projectStateHelpers.ts:gateQualifiersByRole` + `supabase/functions/chat-turn/index.ts` + `supabase/functions/verify-fact/index.ts` |
| §6.C.02      | Citation firewall (Bundesland-Disziplin) | `supabase/functions/chat-turn/citationLint.ts` + `src/legal/states/*.ts` |
| §7.0.04      | I-02 → areas A+C VOID | `src/features/wizard/hooks/useCreateProject.ts` |
| §7.9         | LOCKED chat surfaces (Spine, MatchCut, Astrolabe, Stand-up, CapturedToast, magnetic focus) | `src/features/chat/components/Chamber/` |
| §8 Gate 99   | Architect cockpit (post-v1) | OQ1: simpler approve/reject shipped at `src/features/architect/pages/VerificationPanel.tsx` |
| §9           | Atelier Console (admin) | `src/features/admin/` |
| §10          | Citation lint (Phase 10.1) | `supabase/functions/chat-turn/citationLint.ts` |
| §11          | StateDelta + 16-state coverage | `src/legal/states/*.ts` + `src/legal/legalRegistry.ts` |

Cross-ref `docs/AUDIT_REPORT.md` § 2 for the original three-doc
disagreement table; the resolutions there are the source of truth
for the present mapping.

---

## 4. How to extend StateDelta (add a new state's content)

Phase 14 will follow this exact pattern. The Phase-12 commit
history (`f1c0aae`, `c3860c6`, `575321f`, `7f4466f`, `3b28bf3`)
is the authoritative example.

### Workflow

  1. **Lock primary sources.** Find the state's consolidated LBO
     text (e.g., `recht.nrw.de`, `landesrecht-bw.de`,
     `voris.niedersachsen.de`, `ingkh.de`). Do a fetch dry-run
     before content writing — see
     `docs/PHASE_12_HESSEN_FETCH_DRYRUN.md` for the template.
  2. **Run the visible-gap rule.** If the dry-run shows you can't
     reach a primary source for a section, the StateDelta MUST
     surface the gap explicitly in the persona text — not bury
     it as silent omission. Use the verbatim "in Vorbereitung"
     framing the 11 minimum stubs already use.
  3. **Expand the stub.** Open `src/legal/states/<code>.ts`. Add
     the same shape Bayern uses:
       * Bundesland-Disziplin block (✗ FALSCHE / ✓ KORREKTE
         anchors; mirror `src/legal/bayern.ts:12-105`).
       * Per-template TYPISCHE / VERBOTENE blocks (~25 LOC each
         × 8 templates).
       * Verfahrenstypen detail — Article-and-Absatz precision.
       * Architektenkammer + Vermessung detail.
  4. **Write `allowedCitations`.** Every TYPISCHE entry needs an
     anchor in the array.
  5. **Add smokeWalk fixtures.**
     `scripts/smokeWalk.mjs:BUNDESLAND_SWITCH_FIXTURES` already
     has positive + negative cases per state — extend with the
     state's own positives + a couple of cross-state negatives.
  6. **Verify Bayern SHA unchanged.** `npm run verify:bayern-sha`.
     Any edit to Bayern itself is a separate, scope-flagged change.
  7. **Run `npm run smoke:citations`** — fixtures must pass before
     commit.
  8. **Commit message:** list every primary source used (file path,
     paragraph, retrieval date). Format:
     `recht.nrw.de retrieved 2026-MM-DD: BauO NRW § 5
     (Abstandsflächen)`.

### Per-state realistic budget (from Phase 12 actuals)

  - **150–250 LOC** for the systemBlock (depending on the state's
    Verfahrenstypen surface area and Modernisierungsstand).
  - **+30 minutes verification** per state before content writing
    (the Hessen commit found 5 wrong §§ in the Phase 11 stub —
    assume similar density).
  - **One commit per state.** No batch merges. Manager review
    between states.

---

## 5. How to add a new template

Templates are decision-trees the persona walks. T-01..T-08 are the
v1 set (single-family neubau, MFH neubau, sanierung, umnutzung,
abbruch, aufstockung, anbau, sonstiges). To add T-09:

  1. Open `src/legal/templates/index.ts` and check the existing
     order. Templates are read in registration order during
     persona-prompt assembly.
  2. Create `src/legal/templates/t09-<slug>.ts` mirroring the
     shape of, say, `t01-neubau-efh.ts`:
       * TYPISCHE KORREKTE ZITATE block.
       * VERBOTENE ZITATE block.
       * Per-question framing (TEMPLATE-START, etc.).
       * Material-specific BayBO/state-LBO anchors.
  3. Register it in `src/legal/templates/index.ts`.
  4. Update `TemplateId` in `src/types/projectState.ts`.
  5. Update the wizard's template-step dropdown if you want it
     visible in the SPA: `src/features/wizard/...` (the wizard
     B04 hardcodes Bayern; T-09 visibility is independent).
  6. Add smokeWalk static-gate fixture: every template must
     contain both required blocks (TYPISCHE / VERBOTENE);
     smokeWalk's `templates` loop checks this automatically — the
     new template falls into the loop once registered.
  7. Bayern SHA: a new template extends the *post-Bayern* cached
     prefix (template blocks land after the Bayern region) so the
     Bayern SHA is unaffected. Verify.

### Realistic per-template budget

  - **~250 LOC** including all 8-template-pattern blocks.
  - **~1 day** to research + write the per-question framing for
     the new domain.

---

## 6. How to read the audit + phase-review docs

Three audit-trail artifacts the manager / future engineer should
know:

### 6.1 `docs/AUDIT_REPORT.md`

The 18-section paranoid audit run before Phase 11 started. Section
20 (the "B-rows table") enumerates every finding with severity,
file:line, and a one-line summary. **Read this first** when
investigating any unfamiliar surface — it's the truth-table of
known weirdness as of pre-Phase-11. Resolutions for B-rows that
were fixed during Phases 11–13 are tracked in the relevant phase
review doc; B-rows still open ship as-known into v1 and are listed
in `OPS_RUNBOOK.md` § 7.

### 6.2 Per-state Phase-12 review docs

`docs/PHASE_12_REVIEW_{hessen,niedersachsen,nrw,bw}.md` carry the
per-state research evidence: which §§ were verified verbatim,
which Phase-11-stub claims were wrong (and corrected), which
sections fell back to "in Vorbereitung" framing per the visible-
gap rule. Format is captured in `docs/PHASE_12_REVIEW_TEMPLATE.md`.

If you're touching a state's content and want to know WHY a
specific phrase is what it is, the review doc explains.

### 6.3 `docs/PHASE_13_REVIEW.md`

The Phase 13 audit trail: locked-scope decisions (B1 ship-without-
email, austere visual, locked CTA copy), commit list, migration
ordering (0026/0027/0028/0029 with the renumber explanation),
manual deploy checklist, daily-gates evidence, rollback playbook,
and the deliberately-not-shipped list. Read this when any
qualifier-gate / architect-surface question comes up.

---

## 7. Known post-v1 follow-up work

These four phases were in the original roadmap but were locked as
post-v1 by the manager during the v1 ship window. Each is
preserved in `docs/PHASE_ROADMAP.md` under a `[POST-V1]` banner so
the original scope is not lost.

### 7.1 Phase 12.5 — Async-takt rebuild [POST-V1]

**What's missing:** Multi-Bauherr / multi-architect collaboration
on a single project. Today the chat-turn pipeline is single-author
per project (the `messages` table doesn't carry a participant
discriminator beyond `role` and `user_id`).

**Why deferred:** Architectural debt, not v1-blocking. The Phase 13
DESIGNER role surfaces enough multi-role flow (one Bauherr + one
or more architects) to ship v1; full async takt is the
generalisation post-v1 will need.

**Rough rebuild estimate:** 3–4 weeks. Schema changes
(participants table; per-message author scope; presence pings) +
SPA work (multi-cursor Spine, Stand-up split per author) + Edge
Function adjustments (chat-turn participant gating). Dependencies:
none beyond v1.

### 7.2 Phase 14 — Remaining 11 states [POST-V1]

**What's stub-grade today:** Berlin, Brandenburg, Bremen, Hamburg,
Mecklenburg-Vorpommern, Rheinland-Pfalz, Saarland, Sachsen, Sachsen-
Anhalt, Schleswig-Holstein, Thüringen. Each carries a minimum stub
with `allowedCitations: []` and a verbatim "werden in einer
späteren Bearbeitungsphase ergänzt" Hinweis the persona reads
aloud when asked specifics.

**Why deferred:** v1 ships München-first; the manager's go-to-
market scope is not the long tail. The 11 stubs honestly surface
their gap rather than hallucinate state-specific content — that's
the defensible v1 minimum.

**The expansion pattern:** § 4 above. Per-state budget: **150–250
LOC + ~30 min stub-correction overhead** (Phase 12 found 4 of 4
top states had wrong §§ in their Phase-11 stubs).

**Stadtstaaten architecture flag:** Berlin / Hamburg / Bremen
LBO IS the municipal-level rule, unlike Flächenländer where city-
specific Satzungs ride on top of LBO. May warrant a
`StateDelta.kind: 'flaechenland' | 'stadtstaat'` discriminator
when the work lands.

### 7.3 Phase 15 — Per-state Geoportals [POST-V1]

**Current state:** München WMS shipped (the wizard's
`PlotMap.tsx` + the Bayern persona's geo-context). Address →
B-Plan polygon → Festsetzungen works for München PLZ codes.

**What's missing:** the same flow for NRW, Hessen, BW (conditional
on portal availability), Niedersachsen (conditional). OQ3 research
in `docs/PHASE_11_OQ3_GEOPORTAL_RESEARCH.md` enumerates which top-
5 states have a public WMS.

**Why deferred:** Blocked on Phase 14 anyway — no point fetching
B-Plan polygons for states with stub-grade persona content.

**Rough rebuild estimate:** 1 week per state once the state's
content is at Phase-12 depth. Mostly per-state WMS endpoint config
+ per-state coordinate-projection adapters.

### 7.4 Phase 16 — Nightly regression at scale [POST-V1]

**What manual `smoke:citations` covers today:** 110+ static
fixtures + Bayern SHA gate run before every commit. Caught the 4
states' wrong-§§ in their Phase-11 stubs during Phase 12.

**What nightly cron + drift detection would add:**
  - Live-mode smokeWalk (`--live`) running against a deployed
    instance, with persona-output capture and citation-lint
    re-check.
  - Persona drift detection (compute `b18d3f7f…3471` plus a
    rolling SHA over the broader prompt assembly; alert on any
    sub-region change).
  - Admin dashboard at `/admin/logs/quality` (the Phase 9.2
    placeholder lives at `_PagePlaceholder.tsx`).

**Why deferred:** v1 manual cadence is sufficient at v1 scale.
At ~10 active projects / week, the manual gate is a 5-minute
operation; nightly cron pays for itself only at 100x volume.

**Rough rebuild estimate:** 2 weeks. Most of the wiring is in
place (the `event_log` view + `qualifier-downgrade-rate.mjs` CLI
shipped in Phase 13 Week 4). What's missing is the cron harness
+ the admin dashboard charts.

---

## 8. Glossary of system-internal terms

| Term | What it means |
| ---- | ------------- |
| **Bundesland-Disziplin** | The persona-prompt rule that the model never cites another state's LBO when discussing a project in a different Bundesland. Implemented as a rule block in each state's `systemBlock` plus the citationLint Layer-B firewall. |
| **ZITATE-DISZIPLIN** | The rule in `src/legal/personaBehaviour.ts` that the persona prefers no citation over a wrong citation. Operationalised via the TYPISCHE KORREKTE / VERBOTENE blocks in every template. |
| **allowedCitations firewall** | Per-state array of citation anchors the persona is allowed to cite (`src/legal/states/*.ts`). The citationLint module's Layer-B regexes check the inverse — any reference to a non-active-state LBO fires a violation. |
| **Visible-gap rule** | When source-availability blocks substantive content for a section, the persona MUST surface the gap aloud rather than invent silently. Applied verbatim in the 11 minimum stubs. Phase 12 codified. |
| **Bayern SHA invariant** | `b18d3f7f9a6fe238c18cec5361d30ea3a547e46b1ef2b16a1e74c533aacb3471` — the SHA-256 of the canonical Bayern composed-prefix. Held across 33+ commits since Phase 11. Re-baseline only on intentional Bayern edits with explicit commit-message call-out. |
| **Phase 7.9 LOCKED** | The set of chat workspace surfaces (Spine, MatchCut, Astrolabe, Stand-up, CapturedToast, magnetic focus) that are visually + behaviourally frozen post-Phase 7.9. Edits land only via explicit unlock + scope decision. |
| **Atelier mode** | Design-DNA token bucket (`:root` selector) — paper / ink / clay palette, sharp corners, no shadows, mono-leaning labels. Used for every admin / architect surface. |
| **Operating mode** | Alternate token bucket (`[data-mode='operating']`) — softer shadows, rounded corners. Used for client-facing chat workspace. |
| **Qualifier-write gate** | The Phase-13 server-side check that rejects CLIENT-turn DESIGNER+VERIFIED attempts. Lives at `src/lib/projectStateHelpers.ts:gateQualifiersByRole`. |
| **Vorläufig footer** | The "bestätigt durch eine/n bauvorlageberechtigte/n Architekt/in noch ausstehend" footer that appears on result-page cards with DESIGNER+ASSUMED qualifiers. Helper at `src/features/architect/components/VorlaeufigFooter.tsx`. |
| **13b conditional trigger** | The Phase-13 telemetry threshold (>5 downgrade+rejected events / 7 days / ≥100 turns) that signals possible false-positive in the qualifier gate. Read via `node scripts/qualifier-downgrade-rate.mjs`. |
| **Visible-gap framing** | See "Visible-gap rule" — same idea, persona-surfacing variant. |

---

## 9. Operational responsibilities — split between engineering and client

**v1.0.23 IS THE NEW PRODUCTION-READY RELEASE.** Cosmetic & Cleanup
Sprint closes 8 P2 cleanup bugs (L "0 m² Fassade" / N system flag
filter / P label width / J 30-day banner gating / R DESIGNER
downgrade / S i18n label coverage / O state-aware glossary / D
address parser). Combined with v1.0.21 (7 bugs) and v1.0.22 (6
bugs), every one of the 24 bugs surfaced by the v1.0.20 testing
sweep is now CLOSED across 21 commits. New modules:
`src/legal/systemFlagFilter.ts`, `src/lib/addressParser.ts`.
Runtime smoke gate at 245/245 EN+DE (was 181; +64 sprint assertions).
Bayern SHA preserved across every commit. See `CHANGELOG.md` and
`BACKLOG.md` (now features-only) at the repo root.

**v1.0.22** (previous) — Data Integrity Sprint
closes 6 P1 defects deferred from v1.0.21 BACKLOG.md: Building class
derivation (C), Documents UI/PDF unification (F), i18n leak guard on
persona output (K), VERIFIED qualifier authority guard (Q),
Donut/cover denominator unification (B), and cost-formula honesty (I).
New modules: `src/legal/deriveGebaeudeklasse.ts` (MBO § 2 Abs. 3),
`src/legal/germanLeakGuard.ts`, `src/lib/qualifierNormalize.ts`,
`src/features/result/lib/resolveDocuments.ts`,
`docs/cost-formula.md`. Runtime smoke gate at 181/181 EN+DE (was 144;
+37 sprint assertions).

**v1.0.21** (previous) — Bundesland Truth Sprint closes 7 P0/P1
defects (5 cross-state bleed + Hard Blocker propagation + Confidence
formula penalty) surfaced by the v1.0.20 NRW × T-01 Königsallee 30
(11 bugs) and Berlin × T-01 Pariser Platz 1 (13 bugs) test cells.
Every PDF section that used to render hard-coded Bayern or NRW §
citations is now state-aware via the new `src/legal/stateCitations.ts`
pack; the BLOCKER card prepends the Top-3 when MK-Gebietsart /
Denkmalschutz / Sonderbau / catch-all hard-blocker flags fire;
confidence applies a 0.70-per-blocker multiplicative penalty (floor
25) to reflect structural unknown. Runtime smoke gate at 144/144
EN+DE (was 96; +48 sprint assertions).

**v1.0.20** (previous) — Cosmetic polish on
top of v1.0.19's legal correctness: paragraph breaks on Area A + C
bodies, DE qualifier pill i18n (every qualifier label now renders
in German on the DE PDF), and the Bauherr signature row on the
Verification page. Runtime smoke gate at 96/96 EN+DE. The version
ladder:
  • v1.0   = engineering milestone (complete feature scope).
  • v1.0.1 = invite-flow security hardening (owner-check on share,
             role-check on accept, 7-day TTL on invites).
  • v1.0.2 = RLS recursion fix (migration 0031 — SECURITY DEFINER
             helper functions break the projects ↔ project_members
             cycle Postgres `42P17`).
  • v1.0.3 = Phase 13 client-side UX gap closure
             (`VorlaeufigFooter` wired into every result-page tab
             + SuggestionCard; architect verification now has
             direct Bauherr-visible consequence).
  • v1.0.4 = remediation sweep against `PROD_READINESS_AUDIT_v1.0.3.md`:
             A1 Impressum § 5 DDG (env-driven config + build
             validator + fail-closed banner; 0 leaks), A2 13b
             denominator alarm rewire (migration 0032 + chat-turn
             emits chat.turn_completed), A3 qualifier_role_violation
             propagation (KNOWN_ERROR_CODES + locale keys; locked
             German CTA reaches user), C3 streaming await safety,
             C4 ArchitectGuard German + stale comment cleanup, D2
             COMPLIANCE.md, D3 LEGAL_COPY_REVIEW.md, D6 Dependabot.
             8 audit blockers closed; 7 items honestly deferred to
             v1.1 (see PROD_READINESS_AUDIT_v1.0.3.md resolution
             table).
  • v1.0.5 = Layer-C citation firewall (allowedCitations runtime
             positive-list enforcement; closes PROD_READINESS_AUDIT
             B3).
  • v1.0.14 = v1.0.13 regression closure (3 commits + docs). The
              empirical NRW × T-03 Königsallee re-export against
              v1.0.13 surfaced three P0/P1 regressions that v1.0.13
              introduced or failed to close:
              Bug 28 (P0 — cover/TOC footer duplication): v1.0.13's
              finalizePageFooters tried to mask a "1 / ?" placeholder
              with a PAPER-colored rectangle and redraw the
              resolved "1 / N" on top, but pdf-lib's drawText
              y-coordinate is the glyph BASELINE — ascender pixels
              extended above the mask rectangle, leaving visible
              residue ("1 / 10 1 / ?" double-text on page 1).
              Path A fix: split cover.ts + toc.ts each into body +
              footer render functions; body renders at addPage time
              without page-number copy; footer renders AFTER total
              page count is known. No placeholder is ever drawn.
              v1.0.13's mask-and-redraw helper retired.
              Bug 29 (P1 — "Owner" literal in cover footer):
              v1.0.13 hardcoded bauherrName = lang === 'de' ?
              'Bauherr' : 'Owner'. Fix: resolve display name in
              ExportMenu via auth profile fallback chain
              (profile.full_name → user_metadata.full_name →
              email local-part title-cased → localized fallback)
              and thread through new optional BuildArgs.bauherrName.
              PDF composer stays a pure renderer (no Supabase calls
              during build).
              Bug 30 (P0 — body-page ligature regression):
              v1.0.13's resolveEditorialFonts called loadBrandFonts
              AGAIN against the same PDFDocument, producing a
              second set of PDFFont instances for the same TTFs.
              pdf-lib treats each load as an independent embed
              with its own subset state; body pages' embed lost
              the v1.0.12 ligature guard guarantees. Fix: extend
              resolveEditorialFonts to accept an optional
              pre-loaded BrandFonts; assembly threads the single
              loadBrandFonts result through to both cover/TOC and
              body, unifying subset state.
              The 9 remaining Renaissance section renderers
              (executive · areas · costs · timeline · procedures
              · team · recommendations · keyData · verification
              · glossary) — originally scoped as v1.0.14 Part 2 —
              are deferred to v1.0.15+ as their own dedicated
              sprint. v1.0.14 ships the v1.0.13 regression closures
              cleanly; Rutik's PDF is shippable again with cover +
              TOC prototype-faithful and body in v1.0.12 plain-text
              state. The Renaissance section work requires
              substantial focused time (each renderer ~50-150 LOC
              + drift fixtures + careful styling against the
              prototype) that exceeds a regression-closure sprint.
              Plus runtime smoke:pdf-text via pdf-parse
              devDependency.
              v1.0.15+ backlog:
              - Renaissance Part 2A: executive + areas + costs
              - Renaissance Part 2B: timeline + procedures + team
              - Renaissance Part 2C: recommendations + keyData +
                verification + glossary
              - Runtime smoke:pdf-text (5th daily gate via pdf-parse)
              - Font subset script (if Inter rebuild needed)
              - Bug 17 [P2] team-tab Bayern hardcodes (chat-layer)
              - Bug 20 [P2] procedure-tab caveat audit (chat-layer)
              - Bug 23 [P1] persona-output Schwabing/BLfD scrub
              Bayern SHA preserved.
  • v1.0.15 = PDF Renaissance Part 2A — Executive + Areas pages
              only (~6 commits + docs). Scope was deliberately
              halved from the original "Part 2A executive + areas
              + costs" plan: the user requested a tightly scoped 2-
              page sprint after the v1.0.14 regression-closure cycle,
              banking the Costs page for v1.0.16 alongside its own
              Rutik checkpoint. Both pages render via the cover/TOC
              Path-A 2-pass split (body in first pass, page-numbered
              footer in second pass once total page count resolves).
              v1.0.15 primitives (pdfPrimitives.ts extensions):
              drawCard with left|full|none borderSide options;
              drawPriorityPill (returns consumed width for
              chaining); drawCircularBadge (filled circle + centered
              letter); drawWrappedText (word-break wrap with no
              hyphenation); drawStatusLegend (right-anchored dot+
              label legend). Accent colors live on the section
              renderers — primitives stay color-agnostic.
              Executive page (pdfSections/executive.ts): kicker +
              26pt italic-serif title + right-anchored template ·
              bundesland meta; three priority cards stacked at y ≈
              680 downward, each with a left-accent border in
              priority color (amber/clay/green), italic-serif numeral
              01/02/03, Inter Medium title, priority pill, 12pt
              wrapped body, optional ▸ source/timing chips; bottom
              italic CLAY footer note citing § 30 BauGB · § 62/64
              BauO {state} · § 48 GEG with {state} substitution from
              project.bundesland. Priority bucketing via inferPriority
              heuristic on title+detail keywords (GEG/energy → high,
              "before awarding"/KfW → beforeAward, Verfahrensfreiheit
              /confirm → confirm; default → high).
              Areas page (pdfSections/areas.ts): kicker + 26pt
              italic-serif title + right-anchored template ·
              bundesland meta; status legend (active green dot /
              pending amber dot / void red dot) anchored top-right;
              three full-bordered cards stacked, each with a filled
              circular badge in state color bearing the A/B/C
              letter, INK title from areas.{a,b,c}.title, status
              pill (ACTIVE/PENDING/VOID localized), italic-serif
              CLAY reason paragraph wrapped to card width. Card
              heights computed up-front via estimateLineCount
              mirroring drawWrappedText's word-break algorithm so
              the bordered rect always wraps its text.
              Assembly wire-up: drawTop3Page + drawBereichePage
              retired; cleanup cascade removed drawHatching,
              STATE_LABELS_EN, INK_MUTED/DRAFTING_BLUE/PAPER
              constants now-orphan. Footer-loop teaches itself to
              skip editorial pages via PDFPage-ref Set so the legacy
              y=28/y=44 footer stamp does not overwrite the v1.0.15
              renderers' MARGIN+14 footers.
              Strict scope guard observed: costs / timeline /
              procedures / team / recommendations / keyData /
              verification / glossary untouched. Those land in
              v1.0.16+. Bayern SHA preserved both ends of every
              commit. Bundle 269.1 KB gz (300 KB ceiling).
  • v1.0.16 = PDF Renaissance Part 2B — Costs + Timeline pages +
              architectural ligature-regression KILL (13 commits +
              docs). Empirical re-walk of v1.0.15 NRW × T-03
              Königsallee surfaced 4 P0 regressions: Bug 31
              (Executive renders 1 card not 3 — wrong data source),
              Bug 32 (DESIGNER · ASSUMED on Executive — bypassed
              formatRecommendationQualifier), Bug 33 (ligature
              corruption on new pages 3+4 — renderers called
              page.drawText raw, bypassing safe()), Bug 34 (ligature
              corruption ALSO on old pages 5-10 — same systemic
              flaw).
              ARCHITECTURAL FIX (the long-term defense):
              - SafeTextFn type + resolveSafeTextFn(usingFallback)
                factory in pdfPrimitives.ts — single source of truth
                for the sanitization pipeline.
              - EditorialFonts gains a REQUIRED safe: SafeTextFn
                field, populated by resolveEditorialFonts via the
                factory.
              - New drawSafeText primitive — section renderers'
                one-off draws route through this; the required safe
                field on opts means forgetting sanitization is a
                TypeScript compile error.
              - All existing text-drawing primitives (drawKicker /
                drawEditorialTitle / drawCoverTitle / drawMonoMeta /
                drawLabelValue / drawFooter / drawTocLine /
                drawWrappedText / drawPriorityPill /
                drawCircularBadge / drawStatusLegend) apply
                fonts.safe internally.
              - exportPdf.ts's local `safe` closure now sources from
                resolveSafeTextFn — same fn that EditorialFonts.safe
                carries to renderers, so body + editorial pages can
                never drift.
              - Drift fixture: filesystem scan asserts ZERO raw
                page.drawText calls in any *.ts file under
                pdfSections/. Future v1.0.17+ renderers physically
                cannot bypass safe().
              Bug 31 closed: Executive's "Top 3" now reads from the
              SAME merged source as body Section VIII —
              state.recommendations ++ pickSmartSuggestions, sliced
              to 3. ExecSource discriminated union maps each kind
              ('rec' | 'smart') to the unified ExecutiveRec shape.
              Smart picks get a static "LEGAL · CALCULATED"
              qualifier; persisted recs route through formatQualifier.
              Bug 32 closed: formatRecommendationQualifier moved
              from exportPdf.ts to pdfPrimitives.ts and renamed
              formatQualifier (shorter, generic). Executive + Section
              VIII + future v1.0.17+ renderers all consume the same
              DESIGNER+ASSUMED → LEGAL · CALCULATED normalization.
              Bug 33 + 34 closed permanently by the architectural
              fix above. No section renderer can ever call
              page.drawText raw again — fixture pins the invariant.
              v1.0.16 NEW primitives (pdfPrimitives.ts extensions):
              - drawSafeText (architectural enforcement primitive)
              - drawTable (header + body rows + optional basisRow
                sub-line + totalRow with INK divider + tabular
                right-aligned values)
              - drawNotesBlock (2pt CLAY border-left + 11pt CLAY
                kicker + 11pt INK body via drawWrappedText)
              - drawWeekRuler (monospace week-number labels at ticks
                + CLAY hairline, localized WEEK/WOCHE prefix)
              - drawGanttRow (header label/duration + paper-tinted
                track + work/wait kind-coded fill bar)
              - drawMilestoneCallout (2pt AMBER border-left + amber
                diamond via drawSvgPath + label + detail)
              - AMBER color constant (shared with executive's
                high-priority accent)
              - formatQualifier (moved from exportPdf.ts)
              - resolveSafeTextFn (single sanitizer factory)
              Costs page (pdfSections/costs.ts): kicker + 26pt
              italic-serif title + right-anchored template · state
              meta + 11pt CLAY italic-serif subtitle with {n}m²
              façade / {state} BKI substitution + drawTable with 3
              columns (ITEM 40% / BASIS 35% / EUR RANGE 25% right-
              aligned) where each main row carries an italic-serif
              CLAY basis sub-line (HOAI Zone / § citation) + total
              row with 1pt INK divider + right-aligned tabular
              value + drawNotesBlock NOTES caption. CostsData built
              from the existing v1.0.11 cost composer
              (buildCostBreakdown + resolveAreaSqmByTemplate +
              formatEurRange) — no engine duplication, no drift from
              the result-page tab.
              Timeline page (pdfSections/timeline.ts): kicker +
              title + subtitle + drawWeekRuler at y≈695 ticks every
              4 weeks + 4 stacked drawGanttRow rows (prep 0-12 work
              / submit 12-13 work / review 13-21 wait / fixes 21-23
              work) + drawMilestoneCallout for Baugenehmigung at
              week 22. DEFAULT_TIMELINE_PHASES / _TOTAL_WEEKS /
              _MILESTONE_WEEK exported as immutable T-03 schedule
              template (per-template parameterization is v1.0.17+
              scope).
              Assembly wire-up: drawCostsPage + drawTimelinePage
              retired alongside their orphan imports
              (describeCostInputs / resolveInputs / PROCEDURE_PHASES
              / totalPhaseWeight / findCostRationale). Footer-loop
              teaches itself to skip costs + timeline pages via the
              editorialPages PDFPage-ref Set.
              Strict scope guard observed: procedures / documents /
              team / recommendations / keyData / verification /
              glossary untouched (those land in v1.0.17+). Bayern
              SHA preserved both ends of every commit. Bundle
              269.1 KB gz.
              v1.0.17+ backlog (each its own 2-page sprint):
              - v1.0.17: Procedures + Documents + Team (Sections V-VII)
              - v1.0.18: Recommendations + Key Data (Sections VIII-IX)
              - v1.0.19: Verification + Glossary + audit log + runtime
                smoke:pdf-text
  • v1.0.20 = Cosmetic Polish Sprint — 3 finishes (~8 commits + docs).
              No legal logic changes, no new sections. Three small
              items that complete the "feels professional" look:
              POLISH 1 — Paragraph breaks on Area A + C bodies.
              v1.0.19 caveat (Stadtarchiv) + Abstandsflächen-Hinweis
              were inline-concatenated to original body text reading
              as one cramped paragraph. drawWrappedText now honors
              \\n\\n as paragraph separator with proportional gap
              (default lineHeight × 0.5). Area A + C bodies use the
              separator; estimateLineCount sizes cards accordingly.
              POLISH 2 — DE qualifier pill i18n. 8 new pdfStrings
              keys (qualifier.source.{CLIENT,LEGAL,DESIGNER,
              AUTHORITY} + qualifier.quality.{CALCULATED,ASSUMED,
              VERIFIED,DECIDED}) with DE translations (BAUHERR,
              RECHTLICH, ARCHITEKT:IN, BEHÖRDE / BERECHNET,
              ANGENOMMEN, VERIFIZIERT, ENTSCHIEDEN). New
              getQualifierLabel(source, quality, strings) helper +
              formatQualifier(q, strings?) overload route every
              qualifier display through locale resolution. v1.0.12
              Bug 25 DESIGNER+ASSUMED → LEGAL+CALCULATED normalization
              applied BEFORE locale lookup so the gate-downgrade case
              shows the right label in both locales. Every
              qualifier-pill call site (keyData/procedures/executive/
              recommendations + Area A caveat body) wires the
              strings table.
              POLISH 3 — Bauherr signature row on Verification page.
              The Bauantrag requires Bauherr co-signature per BauO
              NRW; v1.0.18 had Architect + Chamber stamp signatures
              but missed it. New full-width third signature row:
              13pt Inter Medium INK pre-printed Bauherr name (from
              v1.0.14 Bug 29 fallback chain), drawSignatureField,
              9pt italic-serif CLAY co-signature note. Two new
              pdfStrings keys (sig.bauherr + sig.bauherr.note)
              bilingual.
              Smoke gate: 96/96 EN+DE (was 82/82). 14 new asserts
              this sprint covering paragraph breaks, localized
              qualifiers, Bauherr signature presence, negative
              guards (DE PDF has ZERO English qualifier pill labels).
              Bayern SHA preserved. Bundle 269.1 KB gz unchanged.
              v1.0.21+ backlog (each its own sprint, none block
              client delivery):
              - v1.0.21: Vorhabensbeschreibung formal project
                description + Risikoregister Section XII + Bayern
                resolveProcedure migration
              - v1.0.22: KfW BEG 458 + § 35c EStG + iSFP-Bonus
                funding specifics + Bauvoranfrage on edge cases
              - v1.0.23: Bebauungsplan ID + Flurstück + Gebäudeklasse
                fields + Brandschutz implications
  • v1.0.19 = Legal Consistency Sprint — 5 bug closures (~8 commits
              + docs). Four-hat audit (architect + Tragwerksplaner +
              Bauamt + Architektenkammer) of v1.0.18 production PDF
              exposed legal-correctness defects that made the brief
              unshippable to a real NRW Bauaufsicht clerk:
              - Bug 40 [P0]: three pages contradicted each other on
                the same project's Verfahrensart (Areas B said
                verfahrensfrei, Procedures said § 64 ERFORDERLICH,
                Key Data said verfahrensfrei). Three renderers each
                derived the procedure independently from different
                state fields. Fix: new resolveProcedure(c) in
                src/legal/resolveProcedure.ts is the single source
                of truth. exportPdf computes ProcedureDecision once
                and overrides all three renderers' content so
                pages 4 / 7 / 10 ALWAYS agree.
              - Bug 41 [P0]: Wärmeschutznachweis was a soft "engage
                an energy consultant" suggestion. Now first-class
                'required' document with § 48 GEG citation.
              - Bug 42 [P0]: Documents page rendered "No documents
                recorded yet" for projects where the required list
                is deterministic. New requiredDocumentsForCase(c)
                resolver in src/legal/requiredDocuments.ts returns
                canonical Bauvorlagen per case. Documents page now
                auto-populates with checklist-style rows: status
                indicator + name + delivery sub-line + § citation.
                Königsallee fixture renders 7 docs (Lageplan,
                Bauzeichnungen, Baubeschreibung, Anzeige-Formular,
                Wärmeschutznachweis, Energieausweis, Asbest-
                Voruntersuchung).
              - Bug 43 [P1]: Abstandsflächen invisible for façade
                insulation. Now appended to Area C body with § 6
                Abs. 8 BauO NRW 25-cm Dämmungs-Privileg citation.
              - Bug 44 [P1]: Area A "planungsrechtlich keine
                Hindernisse" tagged LEGAL · CALCULATED was
                overconfident — the system has not verified the
                specific Bebauungsplan/Gestaltungssatzung for the
                Königsallee parcel. Downgraded to LEGAL · ASSUMED
                with explicit "Verify with Stadtarchiv Düsseldorf"
                caveat. v1.0.22+ will add bebauungsplan_id state
                + flip back to CALCULATED once verified.
              NEW CANONICAL RESOLVERS (src/legal/):
              - resolveProcedure.ts: ProcedureCase → ProcedureDecision
                { kind, citation, reasoning_de/_en, confidence,
                caveats }. NRW Sanierung fully encoded. Other
                Bundesländer + non-NRW intents return generic
                'standard' + bebauungsplan_specific caveat. Bayern
                detectProcedure path deliberately NOT migrated —
                BAYERN_DELTA + MUENCHEN_BLOCK locked, additive
                only. v1.0.20+ unifies.
              - requiredDocuments.ts: DocumentCase → RequiredDocument[]
                with status (required/conditional/recommended) +
                delivery_de/_en + § citation. NRW T-03 baseline.
              SMOKE GATE: cross-page consistency asserts (≥3
              occurrences of "permit-free"/"verfahrensfrei" + ≥3
              occurrences of "§ 62 BauO NRW" + NEGATIVE assert no
              "§ 64 ERFORDERLICH/REQUIRED" leak). Documents
              presence asserts (Lageplan, Wärmeschutznachweis,
              Energieausweis, no "No documents recorded yet").
              Abstandsflächen-Hinweis present. Area A
              Stadtarchiv + LEGAL · ASSUMED present. 82/82 EN+DE.
              Bayern SHA preserved. Bundle 269.1 KB gz.
              v1.0.20+ backlog (each its own sprint):
              - v1.0.20: Vorhabensbeschreibung section + Risk Register
                Section XII + Bayern resolveProcedure migration
              - v1.0.21: Funding specifics (KfW BEG 458 + NRW.BANK +
                § 35c EStG + iSFP-Bonus) + DE qualifier i18n +
                Bauherr signature block
              - v1.0.22: Bebauungsplan ID + Flurstück + Gebäudeklasse
                fields on Key Data
  • v1.0.18 = Bug fixes + Tier 1 client value adds (9 commits + docs).
              Empirical v1.0.17 Königsallee re-export confirmed the
              Renaissance landed but surfaced 4 bugs:
              - Bug 35 [P1]: "²" substitution leaked into timeline
                subtitle ("Total duration ² 4–6 months"), recommendation
                qualifier prefix, procedure qualifier prefix. Two
                distinct sources: (a) ▸ U+25B8 in recommendations.ts
                / procedures.ts / executive.ts chip rows round-tripped
                via pdf-parse as ²; (b) Instrument Serif Italic
                doesn't contain U+2248 (≈) so the timeline subtitle's
                ≈ glyph fell back to .notdef which extracted as ².
                Fix: ▸→· (U+00B7 middle dot, universally present),
                timeline.sub EN ≈→~ + DE ≈→"ca." (German "circa").
              - Bug 36 [P1]: Team specialists section filtered to
                r.needed === true, dropping NOT-NEEDED entries.
                Restored: full list, sorted needed-first, with green
                NEEDED / amber NOT NEEDED pills + rationale paragraph.
              - Bug 37 [P1]: Key Data qualifier pill collided with
                long value text ("verfahrensfrei nach § 62 BauO NRW"
                extracted as "NRWLEGAL · ASSUMED" no-space). Pill
                x-position now max(colQualX, colValueX + valueWidth +
                12pt). Overflow path: pill wraps to next line.
              - Bug 39 [P2]: costs.notes.b wording drift restored to
                "architect-specific fee agreement and the selected
                Leistungsphasen" (apostrophe avoided so the single-
                quoted pdfStrings literal parses cleanly).
              Plus 4 Tier 1 client value-adds:
              - Feature 4: 30-day validity stamp on cover footer
                ("VALID FOR 30 DAYS · expires 11 June 2026" / "GÜLTIG
                30 TAGE · läuft ab 11. Juni 2026") — sets stale-advice
                expectation, reduces "is this still current?" support.
              - Feature 2: Confidence score on cover (4th column in
                metadata grid: BUNDESLAND · TEMPLATE · CREATED ·
                CONFIDENCE). Sources computeConfidence(state) — same
                composite the result-page header renders.
              - Feature 1: QR code on cover (64×64pt, links to
                planning-matrix.app/project/{id} via qrcode npm dep
                + doc.embedPng). Architect scans phone, opens project,
                zero URL typing. Dynamic-imported with the export
                path so the dep stays out of the main bundle.
              - Feature 3: § citation hyperlinks. New pdfCitations.ts
                with citationToUrl + findCitations exports. Federal
                codes (BauGB/GEG/HOAI) map to gesetze-im-internet.de;
                state BauO codes map to per-state portals (16
                Bundesländer covered). New addLinkAnnotation primitive
                overlays Link annotations with URI actions on detected
                citation rects. Wired into Key Data value column;
                wrapped-text paths (executive/areas/procedures) defer
                to v1.0.19+ since drawWrappedText doesn't expose
                per-line substring positions.
              pdf-lib gotcha discovered + documented: URI in a Link
              annotation must be wrapped in PDFString.of(...); passing
              the raw string causes ctx.obj to coerce to PDFName,
              which PDF viewers silently reject (annotation present
              but inert).
              Runtime smoke gate gains a pdf-lib annotation-tree walk
              that counts URI annotations. 60/60 EN + DE assertions
              pass on HEAD.
              Bayern SHA preserved. Bundle 269.1 KB gz / 300 KB.
              v1.0.19+ backlog (chat-UI + Tier 2 PDF features):
              - Bug 17/20/23 (chat-UI, separate track)
              - Tier 2 PDF: cost stacked chart, next-3-milestones
                callout, state-comparison appendix, workflow status
                strip
              - Wrapped-text citation hyperlinks (executive footer,
                areas reasons, procedure rationales — requires
                drawWrappedText to expose per-line substring rects)
  • v1.0.17 = PDF Renaissance Part 3 FINAL + permanent ligature kill
              (~17 commits + docs). PDF is now 100% prototype-faithful.
              All 11 editorial sections shipped: Cover · TOC ·
              Executive · Areas · Costs · Timeline · Procedures ·
              Documents · Team & Stakeholders · Recommendations ·
              Key Data · Verification · Glossary. Audit log REMOVED
              from PDF (kept in in-app History only).
              ROOT CAUSE OF v1.0.11→v1.0.16 LIGATURE CYCLE: pdf-lib's
              CustomFontEmbedder calls fontkit's `font.layout(text,
              this.fontFeatures)` to encode every drawText call.
              fontkit's layout applies GSUB liga substitution by
              default — turning SOURCE BYTES "confirmation" into the
              GLYPH SEQUENCE with an fi-ligature glyph inside the PDF
              stream. Every JS-layer fix (v1.0.11 decomposeLigatures,
              v1.0.11 preventBrandLigatures ZWNJ injection, v1.0.16
              ctx.safe enforcement) passed SOURCE-LEVEL drift checks
              but the rendered PDF still had ċ/Č on every page.
              v1.0.17 FIX: one option pdf-lib already exposes —
              embedFont(buffer, { features: { liga: false, dlig:
              false, clig: false } }). The features object threads
              to fontkit's layout call, which then skips those
              OpenType lookups. kern stays on. Applied to all four
              brand embeds in fontLoader.ts. Single 12-line change
              supersedes the entire v1.0.11→v1.0.16 sanitizer
              pipeline at the encoding layer.
              RUNTIME SMOKE GATE (smoke:pdf-text, 5th daily gate):
              - tsx-compiled scripts/smoke-pdf-text.mts
              - Renders fixture PDF (NRW × T-03 Königsallee) via
                Node + pdf-lib + node fetch shim that maps
                /fonts/*.ttf → public/fonts/
              - Extracts text via pdf-parse 2.x (PDFParse class API)
              - Asserts ZERO U+200C / U+FB00..U+FB05 / ċ / Č / Ĉ in
                extracted text (BOTH locales)
              - Asserts presence of high-value fi/fl/ff words:
                EN "certified" / "certification" / "energy consultant"
                / "building permit"; DE "Verfahrensfreiheit" /
                "identifiziert" / "Pflicht" / "Energieausweis"
              - Asserts ≈ (U+2248) and m² (U+00B2) intact
              - 38 of 38 assertions pass on the v1.0.17 PDF
              SECTION RENDERERS shipped this sprint:
              - Section 05 Procedures + 06 Documents (one page):
                drawSectionHeader + procedure cards with required/
                optional/exempt status pill + § citation rationale +
                CLAY qualifier line. Documents always renders (Bug
                26 gap-free numbering preserved).
              - Section 07 Team & Stakeholders: specialists list +
                2×2 stakeholders grid (Owner/Architect/Engineers/
                Authority). team.role.* strings replace v1.0.6
                STAKEHOLDERS_PDF inline const.
              - Section 08 Recommendations: numbered list of ALL
                recs (state.recommendations ++ pickSmartSuggestions),
                priority pills via inferPriority, qualifier line via
                formatQualifier.
              - Section 09 Key Data: 3-column table FIELD/VALUE/
                QUALIFIER with color-coded drawQualifierPill (CLIENT
                blue / LEGAL VERIFIED deep green / LEGAL CALCULATED
                light green / LEGAL ASSUMED amber / DESIGNER outline
                / AUTHORITY deep blue).
              - Section 10 Verification: intro paragraph + 2-column
                status panel + Hamilton largest-remainder data-
                quality stacked bar (verified/calculated/assumed %)
                + 2× drawSignatureField (architect + chamber stamp).
              - Section 11 Glossary: 12 hardcoded German legal terms
                (BauGB / BauO {state} / GEG / LBO / HOAI / BKI /
                ÖbVI / LP / KfW / Verfahrensfreiheit / Bauamt /
                Bauvorlageberechtigte) in 2-column grid.
              NEW PRIMITIVES (pdfPrimitives.ts):
              - drawQualifierPill (key data color coding)
              - drawStackedBar (verification data quality)
              - drawSignatureField (verification signatures)
              CLEANUP CASCADE: drawScheduleEntry + ScheduleEntryArgs
              + wrapText + STAKEHOLDERS_PDF + STATE_LABELS_DE +
              startPage + ensureSpace + drawSectionHeader (local) +
              formatDateTime + AreaState import + BrandFonts type
              import + CLAY_DEEP + INK + PAGE_HEIGHT (local) all
              retired with the v1.0.6 schedule-block path.
              Audit log REMOVED from PDF (~70 lines deleted).
              `events: ProjectEventRow[]` parameter on BuildArgs
              retained for backward compat — assembly no longer
              consumes it.
              ≈ (U+2248) symbol corruption from v1.0.16 was a side-
              effect of the same GSUB layer; disabling liga at
              fontkit also cleaned the cmap fallback chain so ≈
              now resolves to its proper Inter glyph. Runtime
              smoke gate confirms.
              Strict scope guard observed: no Bug 17/20/23 work
              (chat-UI, NOT PDF, doesn't block delivery — those
              ship in v1.0.18+).
              Bayern SHA preserved both ends of every commit.
              Bundle 269.1 KB gz / 300 KB ceiling.
              v1.0.18+ backlog (chat-UI only, NOT PDF):
              - Bug 17 [P2] Team-tab Bayern hardcodes
              - Bug 20 [P2] Procedure-tab caveat audit
              - Bug 23 [P1] persona-output Schwabing/BLfD scrub
              - CI wire-up for smoke:pdf-text (currently a manual
                pre-tag verification)
  • v1.0.13 = PDF Renaissance Part 1 — foundations + cover + TOC +
              DE/EN export picker (7 commits + docs). Mixed-state
              PDF intentional this sprint: new cover + TOC are
              prototype-faithful, body sections (executive through
              audit) remain in v1.0.12 plain-text state and ship
              in v1.0.14+ (Parts 2-4) after Rutik's visual
              checkpoint on this Part 1.
              Layout primitives module (src/features/chat/lib/
              pdfPrimitives.ts): PAPER/INK/CLAY color constants
              matching design DNA tokens; A4 portrait page
              constants; drawPaperBackground/drawHairline (0.5pt)/
              drawDottedLeader (4pt spacing)/drawKicker (10pt
              letter-spaced CLAY)/drawEditorialTitle (26pt italic
              serif)/drawCoverTitle (36pt italic serif)/
              drawMonoMeta/drawLabelValue/drawSectionHeader/
              drawFooter/drawTocLine; resolveEditorialFonts facade
              over loadBrandFonts. Path A chosen for serif italic:
              Instrument Serif Italic already in public/fonts/,
              zero font budget impact.
              DE/EN string table (pdfStrings.ts): v1.0.13 keys for
              cover + TOC + footer + template-intent labels; both
              EN and DE tables required to declare matching key
              sets (drift fixture pins parity); pdfStr accessor
              surfaces missing keys as visible "[[MISSING: key]]"
              sentinel rather than silent empty draw; § citations
              stay German across locales per v1.0.6 anti-leak
              pattern. Hardcoded-DE allowlist extended for
              pdfStrings.ts (legal-domain DE half is canonical).
              Cover page (pdfSections/cover.ts): 28×28 logo +
              wordmark + tagline + right-aligned DOC NO / REVISION
              monospace meta; centered editorial title 36pt italic
              serif + address + 60pt INK hairline + 3-column
              metadata grid (BUNDESLAND / TEMPLATE / CREATED) via
              drawLabelValue; bottom CLAY hairline + 3-cell footer
              (BAUHERR / PRELIMINARY / page X / Y). Deterministic
              DOC NO via deriveDocNo (PM-YYYY-MMDD-XXX pattern);
              locale-aware formatCoverDate ("12 May 2026" / "12.
              Mai 2026").
              TOC page (pdfSections/toc.ts): standard section
              header (kicker + 26pt italic serif title) + 60pt INK
              hairline accent + 11 TOC lines via drawTocLine
              (monospace numeral + Inter Regular title + dotted
              leader + tabular page ref) + standard footer.
              Per-section page-number map approximated via
              computeTocPageNumbers heuristic; v1.0.14+ replaces
              with real per-section tracking.
              Assembly wire-up (exportPdf.ts): cover (page 1) +
              TOC (page 2) inserted ahead of body sections; body
              shifts to pages 3+ unchanged from v1.0.12; v1.0.6
              drawTitlePage + drawAxonometricGlyph removed
              (renderCoverPage supersedes); finalizePageFooters
              post-process masks placeholder "X / ?" footers with
              PAPER and redraws correct "1 / N" / "2 / N"; existing
              v1.0.6 footer loop skips pages 1+2 (cover + TOC
              have their own MARGIN+14 footers).
              DE/EN export picker (ExportMenu.tsx): single "PDF"
              menu item split into two locale-explicit options
              [PDF DE] and [PDF EN]; UI locale orders which appears
              first but both always available; exportLang resolved
              from action variant overrides i18n locale at export
              time; export_pdf_succeeded telemetry event gains
              `locale: exportLang` field. preferred_locale schema
              column persistence intentionally deferred to v1.0.14+
              (needs migration).
              v1.0.14+ backlog (continuation by sprint design):
              - Renaissance Part 2: executive + areas + costs pages
              - Renaissance Part 3: timeline + procedures + team
              - Renaissance Part 4: key data + verification + glossary
              - Runtime smoke:pdf-text via pdf-parse devDep
              - Font subset script if Inter rebuild needed
              - Bug 17 [P2] team-tab Bayern hardcodes
              - Bug 20 [P2] procedure-tab caveat audit
              - Bug 23 [P1] persona-output Schwabing/BLfD scrub
              Bayern SHA preserved.
  • v1.0.12 = PDF visible-space + numbering + qualifier-display
              cleanup (3 commits + docs). Empirical NRW × T-03
              Königsallee re-export against v1.0.11 surfaced that
              the v1.0.11 ZWNJ injection rendered as visible space
              in Inter's TTF subset ("conf irmed" / "Pf licht" /
              "f loor" / "Eingrif f"), worse than the original
              ligature corruption it tried to fix.
              Bug 22 regression closure: preventBrandLigatures is
              now a no-op (Path A). pdf-lib's font.encodeText path
              doesn't invoke fontkit's shaping layout, so no
              GSUB-driven ligature is placed in the content stream
              when plain ASCII is passed to drawText. ToUnicode CMap
              ensures text extraction works regardless of viewer-
              side display-time shaping. decomposeLigatures retained
              for literal U+FB0x in persona content.
              Bug 25: PDF rendering normalizes DESIGNER+ASSUMED
              (gate-downgraded) → "LEGAL · CALCULATED" display so
              the bauherr doesn't see a designer-touch claim when
              none has fired. DB row unchanged; §6.B.01 audit
              signal preserved.
              Bug 26: section VI (Documents) always renders with
              empty-state placeholder so I..X numbering is gap-free
              on projects with no documents emitted yet.
              Bug 27 (² superscript strip) hypothesis: incidentally
              closed by Bug 22 — v1.0.11's ZWNJ injection corrupted
              Inter's font subset integrity, breaking adjacent
              U+00B2 extraction. Path A restoration of subset
              integrity should self-resolve. If Bug 27 persists
              post-v1.0.12 deploy, escalate to v1.0.13.
              v1.0.13 backlog (intentionally deferred — these
              require multi-session work):
              - PDF Renaissance (11-section redesign per approved
                prototype: cover · TOC · executive · areas · costs
                · timeline · procedures · team · recommendations
                · key data · verification · glossary)
              - DE/EN export toggle in download UI
              - Per-locale string resolver (pdfStrings.ts) +
                section renderers (pdfSections/*.ts) + layout
                primitives (pdfPrimitives.ts)
              - Runtime smoke:pdf-text gate via pdf-parse
              - Font subset script (Inter Reg + Med + Serif Italic
                with GSUB liga stripped at subset time — Path B
                fallback if Path A regresses)
              - Bug 17 [P2] team-tab Bayern hardcodes audit
              - Bug 20 [P2] procedure-tab caveat audit
              - Bug 23 [P1] persona-output Schwabing/BLfD scrub
              Bayern SHA preserved.
  • v1.0.11 = PDF deliverable hardening (2 fix commits + docs).
              Production verification of v1.0.10 on NRW × T-03
              (Königsallee, project 5c610d71-…) surfaced two P0
              blockers in the PDF export pipeline.
              Bug 22: PDF text-extracted as "conċrmed" / "PČicht" /
              "Čoor" / "identiċziert" across every page. Root
              cause: the brand-TTF path (Inter from public/fonts/)
              bypassed sanitization entirely; fontkit's layout()
              applied OpenType `liga` GSUB at PDF embed time,
              substituting ﬁ/ﬂ ligature glyphs whose ToUnicode
              mapping resolved to substitute codepoints in PDF
              viewers. Fix: extracted `decomposeLigatures` (always
              runs, both font paths) + `preventBrandLigatures`
              (brand-TTF only — injects U+200C ZWNJ between f+i/l/f
              to break GSUB substitution).
              Bug 24: cost engine ignored user's fassadenflaeche_m2
              input on T-03 Sanierung (numeric value, unit in key)
              and silently fell back to BASE_AREA_SQM=180. Fix:
              `resolveAreaSqmByTemplate` + per-template field map;
              wired into both cost callers ahead of the corpus
              regex.
              v1.0.12 backlog (intentionally deferred, NOT touched
              in this sprint per discipline): Bug 17 [P2] team-tab
              Bayern audit, Bug 18 [P1] PDF full-section re-audit,
              Bug 20 [P2] procedure-tab caveat audit, Bug 23 [P1]
              persona-output Schwabing/BLfD leak, Bug 25 [P3]
              recommendation qualifier DESIGNER+ASSUMED edge case,
              Bug 26 [P3] PDF section numbering skips VI.
              Bayern SHA preserved.
  • v1.0.10 = state-parameterization sprint (6 commits). The
              Düsseldorf NRW × T-03 smoke walk on v1.0.9 surfaced
              that the persona-chat layer was state-correct
              (BauO NRW citations, anti-leak in force) but the
              deterministic computation layers stayed Bayern-
              hardcoded: cost rationales said "Bayern factor" /
              "BayBO Art. 62" / "new builds in Bayern"; the
              baseline procedure derivation cited BayBO Art. 58
              on NRW; locale caveats said "typical Bayern fee
              tables"; the DataQualityDonut summed slices to 101.
              Closures:
              Foundation: src/legal/stateLocalization.ts — central
              16-state registry exposing procedure/structuralCert/
              monumentAuthority/chamber/cost-factor strings per
              Bundesland. Substantive states (Bayern, NRW, BW,
              Hessen, NS) carry verified §§ from Phase-12
              ALLOWED_CITATIONS; 11 stubs fall back to a generic
              "your Land's LBO" framing — never a silent Bayern
              leak.
              Bug 14: cost rationales state-parameterized via
              getStateLocalization (structuralCert + surveying +
              cost-factor per state).
              Bug 15: deriveBaselineProcedure reads the registry;
              "void bundesland" sentinel removed; Bayern projects
              unchanged.
              Bug 16: smartSuggestions bundeslaender case-mismatch
              ('Bayern' → 'bayern') — filter was broken since
              v1.0.0; suggestions never fired on any project. Now
              Bayern projects receive Bayern-tagged suggestions
              correctly.
              Bug 19: VorlaeufigFooter respects i18n locale —
              EN parity added; DE keeps the locked Phase-13 wording
              verbatim.
              Bug 21: DataQualityDonut uses Hamilton largest-
              remainder rounding so the 3 legend percents sum to
              exactly 100.
              v1.0.11 backlog (deferred during sprint scope cut):
              PDF font ligature corruption (ċ in "conċrmed");
              persona-output Bayern-entity-name scrubbing (Schwabing/
              BLfD references appear from LLM-generated state, not
              from baseline composers).
              Bayern SHA preserved.
  • v1.0.9 = wizard Bundesland auto-detection (1 fix commit +
             docs). The Düsseldorf NRW smoke walk surfaced v1.0.8's
             dropdown defaulting to 'bayern' regardless of address,
             silently creating Bayern projects for non-Bayern
             addresses. Fix: deterministic first-two-digits-of-
             PLZ → Bundesland lookup (Deutsche Post postal-sector
             table). Wizard pre-selects the dropdown on every
             address change; hint copy switches to "Detected from
             postcode {{plz}}. Change if this is wrong." User
             remains free to override for border cases. Closes
             B04's residual UX gap. Bayern SHA preserved.
  • v1.0.8 = coverage-expansion sprint (4 commits, harnesses
             BUILT but not yet RUN against live production).
             W1: scripts/architect-e2e-smoke.mjs — 7-phase live
             smoke harness for the Phase 13 architect verification
             flow (promote → invite → accept → verify → footer-hide
             → teardown). First-ever automated end-to-end against
             production, closes the 0-architect-runs gap from
             DELIVERABLE_GAP_AUDIT. Defensive env-loading; exits
             with code 2 + clear hint when SUPABASE_SERVICE_ROLE_KEY
             / BAUHERR_TEST_JWT / DESIGNER_TEST_JWT missing.
             W2: smokeWalk drift fixture pinning per-state
             ALLOWED_CITATIONS depth at the Phase-12-verified
             counts (NRW: 27 · BW: 30 · NS: 24 · Hessen: 26).
             No content commits — empirical audit found all four
             substantive states already at peer depth from Phase 12;
             pin catches any future regression.
             W3: scripts/smoke-walk-matrix.mjs — programmatic
             14-cell (state × template) coverage harness. Each
             cell creates a test project, runs N chat-turns,
             asserts state-correct § citation appears + Bayern
             leak detector zero on non-Bayern cells. Per-run cost
             ~$10-20 in Anthropic spend; ANTHROPIC_BUDGET_ACKED
             env guard required. Operator-triggered:
                npm run smoke:architect-e2e
                npm run smoke:matrix
             Both gated on Rutik providing creds. v1.0.9 will close
             any findings the first runs surface.
             Bayern SHA preserved.
  • v1.0.7 = post-v1.0.6 visibility-gap closure (4 commits). Rutik's
             post-deploy observation showed v1.0.6 fixes shipped but
             not visible on existing project 24c8fb67-… Investigation
             confirmed no retroactive-apply gap; three root causes:
             Bug 8 (P0): computeConfidence walked only state.facts
             while DataQualityDonut walked all 5 qualifier-bearing
             categories — header showed 91% vs donut's implied 82%.
             Fix: aggregateQualifiers parity + donut-aligned grouping
             (DECIDED 1.0 / CALCULATED+VERIFIED 0.85 / ASSUMED+UNKNOWN
             0.4).
             Bug 9 (P0): v1.0.6's spine completion gated on
             final_synthesis.isDone (recommendations.length >= 3).
             Existing projects with material result content but
             < 3 recs still showed Round 9 · 41%. Fix: widened with
             a fallback path (procedures >= 1 AND areasActive AND
             recs >= 1 → spine 100%).
             Bug 10 (P0): existing project mislabeled by B04 wizard
             hardcode (bundesland='bayern' on Frankfurt address)
             correctly served Bayern content; anti-leak fix didn't
             apply because Bayern.ts is SHA-locked. Fix: Update
             Bundesland pill in SpineHeader lets bauherr retroactively
             correct mislabeled projects; mutation invalidates
             project + messages queries so next chat turn composes
             new state's systemBlock (including anti-leak override).
             Bug 11 (docs): OPS_RUNBOOK § 9 documents the
             deploy-verification probe so future tag verifications
             don't loop. Bayern SHA preserved.
  • v1.0.6 = Hessen × T-03 smoke-walk bug-fix sprint (6 commits).
             Bug 0 (P0, B04 surgical mitigation): wizard exposes
             explicit Bundesland dropdown; useCreateProject writes
             user selection through to projects.bundesland (legacy
             behaviour was hardcoded 'bayern' regardless of address).
             Full address-to-state inference deferred to v1.1.
             Bug 2 (P0): PDF export gains Costs / Timeline /
             Stakeholders / Recommendations sections + per-page
             Vorläufig footer + TOC renumber I..X.
             Bug 3 (P1): spine percent reaches 100% when
             final_synthesis isDone (state.recommendations.length ≥ 3),
             not just on the transient ready_for_review signal.
             Bug 4 (P1): header confidence becomes fact-quality mix
             only (FACT_WEIGHT 1.0 / SECTION_WEIGHT 0.0) so the
             value tracks DataQualityDonut.
             Bug 5+6 (P1): every non-Bayern state file prepends a
             `buildAntiBayernLeakBlock(...)` override that explicitly
             invalidates Bayern-specific examples from the
             SHA-anchored persona/template shared layers. Bayern SHA
             `b18d3f7f9a6fe238c18cec5361d30ea3a547e46b1ef2b16a1e74c533aacb3471`
             held across all six fixes.
             Bug 1 (P0 → downgraded): cost engine root cause was the
             B04 wizard hardcode; fixed via Bug 0. Engine code
             unchanged; residual Bayern wording in cost rationale
             strings is accepted v1.0.6 leakage (per-state rationale
             sets are v1.1 content scope).

A second tier of work is the **client's operational
responsibility** to action post-tag, before public traffic touches
the system. This split is deliberate and documented here so neither
side has to re-derive it.

**v1.1 sprint backlog (carried over from POST_V1_AUDIT.md +
POST_SMOKE_TEST_INVESTIGATION.md):**
  • verify-fact race condition (POST_V1_AUDIT CRITICAL-1).
  • 13b threshold disarmed (POST_V1_AUDIT CRITICAL-2).
  • Qualifier views RLS pin / `security_invoker` re-probe
    (POST_V1_AUDIT CRITICAL-3, deploy-then-probe pending).
  • Mid-flight bundesland propagation
    (POST_SMOKE_TEST SERIOUS-1).
  • Spine cap heuristic clarification
    (POST_SMOKE_TEST SERIOUS-2 — `TOTAL_ESTIMATE_T01 = 22`
    fallback for all templates).
  • Streaming-path event_log bare-await (POST_V1_AUDIT SERIOUS).
  • Stale `chat-turn/index.ts:131-135` comment + ArchitectGuard
    English copy (POST_V1_AUDIT SERIOUS).

All non-blocking for v1 Bayern-only B2B traffic. Schedule before
broader public exposure.

### Client-side operational work (post-tag)

Each item below is templated in this repo so the client only fills
values, doesn't author content.

| Item | Template / Tracker | What the client does |
| ---- | ------------------ | -------------------- |
| **DPAs (5 sub-processors)** | `docs/PHASE_17_DPA_LEDGER.md` | Sends the 5 vendor emails in the ledger (or claims via vendor dashboards), records sent/received dates, files countersigned PDFs in `docs/legal/dpas/<vendor>/`. |
| **Impressum entity details** | `docs/PHASE_17_LEGAL_AUDIT.md` § "Impressum — placeholders" | Supplies real values for the 8 `{{...}}` placeholders in `src/features/legal/pages/ImpressumPage.tsx` (legal name, registered address, phone, email, USt-IdNr, Handelsregister). |
| **Datenschutz placeholders** | `docs/PHASE_17_LEGAL_AUDIT.md` § "Datenschutz" | Same `{{...}}` set as Impressum — fills propagate. |
| **Counsel review** | `docs/PHASE_17_LEGAL_AUDIT.md` § "Counsel-meeting prep" | Schedules counsel meeting; ships the four legal pages + this handoff package; incorporates feedback into `src/features/legal/pages/*.tsx`. |
| **Sub-processor list lock** | `docs/PHASE_17_LEGAL_AUDIT.md` § "Datenschutz — Sub-processor list" | Confirms whether all 5 vendors stay in v1; if any is cut, removes the SDK from the bundle (not just disables) and removes the Datenschutz § for that vendor. |
| **Hosting region lock** | `docs/DEPLOYMENT.md` § 1 + § 7 | Confirms Vercel + Supabase regions in dashboards; updates Datenschutz § 3.4-3.5 if anything diverges from the EU-Frankfurt narrative. |
| **Retention windows** | `docs/OPS_RUNBOOK.md` § 1 (incident triggers) + Datenschutz § 4 | Decides retention policy on chat history / project state / event_log; counsel adds Datenschutz § 4 subsection. |
| **Real Impressum signoff** | `docs/PHASE_17_SIGNOFFS.md` § 2 (counsel) + § 3 (DPAs) | Fills the signoffs ledger as each piece lands. |
| **72-point smoke walk on production** | `docs/PHASE_17_SMOKE_CHECKLIST.md` | Runs the 18×4 cross-browser walk against the production deployment before public traffic. |

### Engineering-side responsibilities (already complete at v1.0.1)

| Item | Where it shipped |
| ---- | ---------------- |
| 16-state legal coverage (Bayern + 4 substantive + 11 honest stubs) | `src/legal/states/` + `src/legal/legalRegistry.ts` |
| Architect verification flow (qualifier-write gate, dashboard, verify-fact / share-project Edge Functions) | Phase 13 commits |
| Three handoff docs (DEPLOYMENT / OPS_RUNBOOK / HANDOFF) | `docs/` |
| Daily-gate set (verify-bayern-sha / smoke:citations / tsc / build) | `scripts/` + `package.json` |
| Bayern SHA invariant `b18d3f7f9a6fe238c18cec5361d30ea3a547e46b1ef2b16a1e74c533aacb3471` | `scripts/lib/bayernSha.mjs` (held across 34+ commits) |
| Templated client-side work (DPA emails, legal-page placeholder map, signoffs ledger, smoke checklist) | `docs/PHASE_17_*.md` set |
| **v1.0.1 invite-flow security hardening** (owner-check on share, role-check on accept, 7-day TTL) | commit `468ecc3` + migration 0030 |
| **v1.1 sprint scope — 3 audit findings open** per `POST_V1_AUDIT.md` (verify-fact race, 13b threshold disarmed, qualifier views RLS pin). All non-blocking for v1 B2B traffic. Schedule before public exposure. | `docs/POST_V1_AUDIT.md` § 1, § 8, § 2 — three CRITICAL items, one needs post-deploy empirical probe (see audit doc § 2 "Empirical RLS probe") |

### Order of operations the client should follow

  1. Day 1 — send the 5 DPA emails (or self-service via vendor
     dashboards). Update `PHASE_17_DPA_LEDGER.md` "Sent date".
  2. Day 1 — schedule counsel meeting; share the four legal page
     sources + `PHASE_17_LEGAL_AUDIT.md` + this doc.
  3. Day 1 — supply the 8 Impressum placeholder values; engineering
     of-record (or successor) replaces the `{{...}}` markers.
  4. Week 1–3 — vendor countersignature returns; ledger updated
     per row.
  5. Counsel feedback received — incorporated into legal pages.
     Re-deploy SPA.
  6. Production smoke walk — fill `PHASE_17_SMOKE_CHECKLIST.md`.
  7. `PHASE_17_SIGNOFFS.md` filled green — system ready for public
     traffic.

The split is final: no item above should slide back to engineering
unless a substantive issue (counsel finds a fundamental legal flaw,
a vendor refuses the standard DPA, the smoke walk uncovers a real
regression in shipped behaviour) reopens scope.

---

## 10. Contact handoff

| Topic | Who to reach | Where |
| ----- | ------------ | ----- |
| Build engineer's deliverable scope (this doc) | `<MANAGER_NAME>` | `<MANAGER_EMAIL>` |
| Anthropic billing / API key | Manager (DPA-signing identity) | Anthropic Console |
| Supabase project ownership | Manager | Supabase Dashboard |
| Vercel project ownership | Manager | Vercel Dashboard |
| Sentry org admin | Manager | Sentry EU instance |
| PostHog org admin | Manager | PostHog EU instance |
| Counsel signoff on legal pages | `<COUNSEL_NAME>` | `<COUNSEL_EMAIL>` |
| GitHub repo + this codebase | Manager (post-handoff write access) | (repo URL) |

For any post-v1 question that maps cleanly to one of the four
post-v1 phases (12.5 / 14 / 15 / 16): start with this doc § 7,
then `docs/PHASE_ROADMAP.md`'s preserved-original-scope sections.

For any in-codebase question that maps to a phase that DID ship
(11 / 12 / 13 / 17): the per-phase review doc + `git log` are the
authoritative trail. Every commit message is grounded; no
"miscellaneous tweaks" land in this repo's history.

---

**This document is the v1 deliverable's audit trail. It is
intentionally long; future readers should find every load-bearing
decision recorded somewhere in this file or one of its
cross-references.**
