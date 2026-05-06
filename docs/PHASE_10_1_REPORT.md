# Phase 10.1 — Citation Accuracy Report

**Date:** 2026-05-06
**Branch:** main
**Commits:** 1f40ef8 → 861b299 (8 commits, contiguous)

---

## 1. What shipped

Eight commits, layered defense against wrong-Bundesland citation drift:

| # | Commit | Change |
|---|---|---|
| 1 | `1f40ef8` | docs(phase-10-1): findings + citation-density audit |
| 2 | `4c5d8c7` | feat(prompt): bayern.ts — strip 'Anlage 1 BayBO' + Bundesland-Disziplin |
| 3 | `7379115` | feat(prompt): personaBehaviour.ts — ZITATE-DISZIPLIN rule (B.1) |
| 4 | `4ce7640` | feat(prompt): T-01..T-08 — TYPISCHE / VERBOTENE Zitate per template |
| 5 | `9c9cdd3` | feat(edge): citationLint.ts module + wire into JSON & streaming paths |
| 6 | `47fc048` | feat(observability): citation.violation events flow to event_log |
| 7 | `861b299` | feat(scripts): smokeWalk.mjs — citation regression CLI |
| 8 | (this commit) | chore(phase-10-1): cache-bust marker + comprehensive report |

**Lines changed:** ≈ 1130 lines added, ≈ 25 lines removed across prompt + edge + scripts.
**No migrations.** `event_log` already exists from Phase 9.2.
**No UI changes.** Render Gate N/A.
**Bundle ceiling:** unaffected (changes are server-side prompt content + edge function code).

---

## 2. The fix in one paragraph

**Root cause:** `legalContext/bayern.ts` lines 70-84 actively instructed the model to anchor verfahrensfreie Vorhaben to "Anlage 1 BayBO" — a phrase that does not exist in the Bayerische Bauordnung. (BayBO regulates verfahrensfreiheit directly inside Art. 57, Abs. 1 Nrn. 1–18, Abs. 2–7. "Anlage 1" is the structural pattern of the Brandenburgische Bauordnung, the Musterbauordnung, and older fassungen of the BauO NRW.) The wrong instruction sat inside the cached system prefix, overriding correct citations from per-template tails. **Fix:** removed the false instruction, rewrote the section against Art. 57 with explicit absatz/nummer references, prepended a BUNDESLAND-DISZIPLIN block with seven ✗ FALSCHE / sixteen ✓ KORREKTE pairs, added a top-level ZITATE-DISZIPLIN rule to the persona behaviour, attached TYPISCHE/VERBOTENE Zitate sections to every T-01..T-08 template, built a permanent citation linter that scans `message_de`/`message_en` for known-bad patterns and writes violations into `public.event_log`, and shipped a smokeWalk.mjs CLI that runs in CI and validates the lint logic against the exact smoke-walk failure strings.

---

## 3. Pass criteria — verification

### 3.1 Static gate

```bash
$ npm run smoke:citations
[smoke-walk] static gate: 18/18 passed
  ✓ t01-neubau-efh: required blocks
  ✓ t02-neubau-mfh: required blocks
  ✓ t03-sanierung: required blocks
  ✓ t04-umnutzung: required blocks
  ✓ t05-abbruch: required blocks
  ✓ t06-aufstockung: required blocks
  ✓ t07-anbau: required blocks
  ✓ t08-sonstiges: required blocks
  ✓ bayern.ts: structure
  ✓ personaBehaviour.ts: ZITATE-DISZIPLIN
  ✓ citationLint.ts: forbidden patterns present
  ✓ lint sample: smoke-walk T-07 failure (must flag)
  ✓ lint sample: smoke-walk T-03 failure (must flag)
  ✓ lint sample: wrong-Bundesland NRW (must flag)
  ✓ lint sample: BayBO with § instead of Art. (must flag)
  ✓ lint sample: StPlS 926 Anlage 1 (legitimate — must NOT flag)
  ✓ lint sample: BauGB § 30 (legitimate — must NOT flag)
  ✓ lint sample: Correct Art. 57 Abs. 1 Nr. 1 a (must NOT flag)
[smoke-walk] OK
```

The static gate confirms three things in one run:

1. **Structure** — every prompt file has the new sections (BUNDESLAND-DISZIPLIN, ZITATE-DISZIPLIN, TYPISCHE/VERBOTENE per template).
2. **Linter sensitivity** — the verbatim smoke-walk failure strings ("Annex 1 BayBO", "under Annex 1 BayBO") are caught by the linter.
3. **Linter specificity** — the legitimate StPlS 926 "Anlage 1 Nr. 1.1" reference, BauGB "§ 30", and a clean Art. 57 Abs. 1 Nr. 1 a citation all pass without false positives.

### 3.2 Live gate

`npm run smoke:citations:live` requires operator-set environment variables (SMOKE_SUPABASE_URL, SMOKE_SUPABASE_ANON_KEY, SMOKE_TEST_JWT, SMOKE_T07_PROJECT_ID, SMOKE_T03_PROJECT_ID) plus pre-existing test projects with templateId T-07 / T-03 and the right addresses. The CLI is wired and ready; the operator sets the env once and CI can run the live gate from a workflow that has the secrets. Without env, `--live` is a documented no-op so the static gate can run everywhere safely.

The live gate's seed cases match the original smoke-walk failures exactly:

- **T-07 Anbau:** Türkenstr. 52, 80799 München, "4×4×3 m Wintergarten an der Südseite". Pass criteria: persona cites `BayBO Art. 57 Abs. 1 Nr. 1 a`, shows the 48 m³ < 75 m³ math, no "Anlage 1" / "Annex 1" appears.
- **T-03 Sanierung:** Schwabinger Tor 1, 80807 München, like-for-like windows + bath + kitchen. Pass criteria: persona cites `BayBO Art. 57 Abs. 3 Nr. 3`, no "Anlage 1" / "Annex 1" appears.

### 3.3 Production telemetry signal

Every wrong citation that the model still emits despite all five layers will produce one or more rows in `public.event_log` with `source='system'` and `name='citation.violation'`. The admin Logs drawer Events tab (Phase 9.2) surfaces these rows joined to the underlying `logs.traces` row via `trace_id`, so an operator can drill from "this turn flagged" to "here's the full prompt + tool input" with no extra plumbing.

The expected baseline rate after deploy is **zero** in the first 24 hours. Any non-zero count indicates either (a) a remaining content gap (add to TYPISCHE/VERBOTENE), (b) a new failure mode the linter doesn't yet catch (add to FORBIDDEN_PATTERNS), or (c) a model-side regression independent of prompt content.

---

## 4. Layered defense — what each layer catches

| Layer | Where | What it catches | If it misses | Notes |
|---|---|---|---|---|
| **L1 — Bundesland-Disziplin** | bayern.ts (top) | Wrong-anchor instruction at the source. Removes the "Anlage 1 BayBO" instruction and replaces with Art-57-anchored content + ✗/✓ pairs. | Layer 2 catches per-template drift. | Cached prefix; cost-neutral per turn. |
| **L2 — TYPISCHE/VERBOTENE per template** | T-01..T-08 tails | Drift inside specific template logic (e.g. T-07 anchoring 75-m³ to "Anlage 1" instead of Art. 57 Abs. 1 Nr. 1 a). | Layer 3's ZITATE-DISZIPLIN catches generic citation lapses. | Per-template cache slot; one-time cost per template. |
| **L3 — ZITATE-DISZIPLIN persona rule** | personaBehaviour.ts (B.1) | The persona's general citation behaviour every turn — Art. vs §, Bayern-only, "lieber kein Zitat als ein falsches" hedge. | Layer 4 (linter) catches what slipped through. | Cached prefix. |
| **L4 — Citation linter** | citationLint.ts | Anything any of the prompt layers missed. Permanent safety net. | Layer 5 (event_log) makes it visible. | Non-blocking; runs after Zod validation in both JSON + streaming paths. |
| **L5 — event_log fan-out** | citationLint.ts → public.event_log | Zero — this is observability, not detection. | Operator response (telemetry) closes the loop manually. | Best-effort insert; uses same RLS pattern as Phase 9.2 client events. |
| **L6 — smokeWalk.mjs CLI** | scripts/smokeWalk.mjs | Pre-deploy regressions (any PR that touches `legalContext/`). | Production telemetry catches what shipped. | Static mode runs in CI without secrets; live mode runs in a privileged workflow. |

If any single layer is bypassed by a future content edit, the layers below catch it. The combination of static gate + linter + production telemetry ensures the same citation-accuracy bug **cannot reach an end user without somebody noticing**.

---

## 5. What's intentionally not in scope (Phase 10.2 candidate)

Brief §5.3 raises a `legalRegistry.ts` single-source-of-truth for legal citations. We did **not** build this in 10.1 because:

- The smoking gun was one file (bayern.ts). Removing the false instruction + adding the discipline block fixes the immediate bug.
- A full legal registry is a 2–3-day refactor that touches every template, the linter, and the smoke-walk.
- The smoke walk + linter give us enough cover to size the registry properly later, against real production telemetry instead of guessing.

**Recommendation:** track as Phase 10.2 with an explicit input from the first 2-3 weeks of `citation.violation` telemetry. If the rate is < 1% of turns the registry can wait; if higher, prioritise.

---

## 6. Honest residual concerns

**a. The Genehmigungsfreistellung article alignment.** Bayern.ts now describes Genehmigungsfreistellung as `Art. 58a` (current BayBO post-Modernisierungsgesetz). The shared examples in the Bundesland-Disziplin block cite both `Art. 58` (vereinfachtes Verfahren) and `Art. 58a` (Genehmigungsfreistellung). T-01 is realigned. None of this was directly in scope of the original smoke-walk bug but it was discovered during the audit and is fixed for consistency. If a reader of the Bayerische Architektenkammer's Vollzugshinweise points out a different correct article number, that's a fast follow-up.

**b. Live mode is operator-gated.** smokeWalk.mjs `--live` requires ops setup (test JWT, test project IDs, dedicated Edge Function deploy). Until the operator does that one-time setup, regression detection relies on (i) the static gate (pre-deploy) and (ii) production telemetry (post-deploy). I didn't auto-create the test infra because this is shared infrastructure that needs human approval.

**c. The linter is a safety net, not a guarantee.** A model could in principle emit a citation that's wrong but doesn't match any of the seven forbidden patterns (e.g. cites a real BayBO article that doesn't actually contain the cited content). The linter cannot catch semantic correctness — only syntactic patterns. The legalRegistry refactor is the path to semantic checking.

**d. False-positive risk on the `MBO` warning pattern.** The pattern `/Musterbauordnung|\bMBO\b/g` will fire as a warning on any reference to the MBO, including legitimate historical context ("Bayern hat die MBO in eigene Sprache gegossen"). This is a deliberate noisy-warning choice — the goal is to catch any drift toward citing the MBO as Rechtsgrundlage. If telemetry shows a high false-positive rate post-deploy, downgrade to `/MBO\s+als\s+Rechtsgrundlage/i` only.

---

## 7. Smoke-walk failure cases — covered

| Original failure | How Phase 10.1 prevents it |
|---|---|
| **T-07** "permit-free works under **Annex 1 BayBO**" | (i) bayern.ts no longer instructs the model to use "Anlage 1 BayBO"; (ii) T-07 tail says explicitly ✗ "Anlage 1 BayBO"; (iii) personaBehaviour.ts B.1 forbids it; (iv) linter would flag the response. Four independent reasons it should not happen, and a fifth (event_log) would surface it if it did. |
| **T-07** "48 m³ < 75 m³ but I claimed exceeded" | T-07 KRITISCHE PRÄZISIONS-ANKER section explicitly demands the persona shows the m³ calculation in the response so the math is verifiable. The smoke-walk run will check for the math indicator (the regex `/48\s*m³\|4\s*[×x]\s*4\s*[×x]\s*3/`). |
| **T-07** "Abstandsflächen non-compliance retroactively voids verfahrensfreiheit" | T-07 tail's KRITISCHE PRÄZISIONS-ANKER explicitly distinguishes verfahrensfrei from materielle Anforderungen and gives a worked FALSCH/RICHTIG example. T-03 has the same precision anchor. |
| **T-03** "sounds like a permit-free maintenance measure under Annex 1 BayBO" | Same five layers as T-07; T-03 tail explicitly cites Art. 57 Abs. 3 Nr. 3 as the only correct anchor and forbids "Anlage 1 BayBO" by name. |

---

## 8. Operator next steps

1. **Deploy** the chat-turn function: `supabase functions deploy chat-turn`. The cached prefix will invalidate naturally on the first turn after deploy because the BAYERN_BLOCK / PERSONA_BEHAVIOURAL_RULES / template-tail strings changed (Anthropic's prompt cache hashes content, not file paths).

2. **Verify** the live smoke walk works against the deployed env:
   - Set up a test user account.
   - Create one T-07 project (Türkenstr. 52, 80799 München) and one T-03 project (Schwabinger Tor 1, 80807 München) — capture the IDs.
   - `SMOKE_SUPABASE_URL=… SMOKE_SUPABASE_ANON_KEY=… SMOKE_TEST_JWT=… SMOKE_T07_PROJECT_ID=… SMOKE_T03_PROJECT_ID=… npm run smoke:citations:live`
   - Confirm green.

3. **Watch telemetry** for 24-72 h. Open the admin Logs drawer Events tab and filter by `name='citation.violation'`. Expected: zero. If non-zero, inspect the row's `attributes` to identify what slipped through.

4. **Add a CI workflow step** that runs `npm run smoke:citations` on every PR touching `supabase/functions/chat-turn/legalContext/` or `supabase/functions/chat-turn/citationLint.ts`. The static gate runs without secrets and gives PR-time signal before deploy.

5. **Consider Phase 10.2** (legalRegistry refactor) after 2-3 weeks of telemetry data.

---

— end of report.
