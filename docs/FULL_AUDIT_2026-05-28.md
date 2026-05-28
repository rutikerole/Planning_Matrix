# FULL AUDIT — 2026-05-28

Branch: `audit/full-review` (off `main` @ `453655c`)
Reviewer: fresh-eyes pass after Bucket C Pass A+C completion.
Method: every claim verified against the corpus and the actual code; gates
re-run locally; legal §§ spot-checked across 10 of 16 states.

---

## VERDICT

**Not demo-ready as-is.** Build is green and the Bayern SHA matches, but the
Brandenburg cells across all eight templates contain a *systemic* legal-§ error
that the gates accept because the §§ exist in the corpus with different
headings (presence-only check, no heading-match). 8 cells × 2 wrong §§ each =
16 instances of "right number, wrong meaning" on a state that just shipped. The
rest of Bucket C looks solid — Berlin/Hamburg/Bremen/Sachsen/SH/RLP/MV/LSA/TH/
Saarland spot-checks all matched the corpus headings — but until Brandenburg is
fixed I would not put the live URL in front of a Brandenburg-located customer.
Fix is small (2 §-numbers per cell, regression already authored above) and the
audit doc is the only thing this branch needs to land.

---

## CRITICAL — must fix before demo

### C1. Brandenburg T-01..T-08: wrong §§ for "Bauantrag" and "Bautechnische Nachweise" (× 8 cells)

`src/legal/templates/stateOverrides.ts` lines 761, 770, 1682, 1689, 2524, 2530,
3319, 3322, 4065, 4818, 4839, 5507, 5518, 6131, 6138 (15 occurrences across the
8 Brandenburg cells).

The author labeled, in every Brandenburg cell:

- "Bauantrag und Bauvorlagen — **§ 72 BbgBO**"
- "Bautechnische Nachweise — **§ 70 BbgBO**"

The corpus headings (`scripts/legal-corpus/states/brandenburg.json`,
secondary-mirror via baunormenlexikon.de, BbgBO i.d.F. Gesetz v. 28.09.2023)
disagree:

| §        | Corpus heading                                            | What the cell claims it is |
|----------|-----------------------------------------------------------|----------------------------|
| § 66 BbgBO | Bautechnische Nachweise *(corpus archetype: `bautechnische_nachweise`)* | — |
| § 68 BbgBO | Bauantrag, Bauvorlagen *(corpus archetype: `bauantrag_bauvorlagen`)*    | — |
| § 70 BbgBO | Beteiligung der Nachbarn und der Öffentlichkeit            | "Bautechnische Nachweise" |
| § 72 BbgBO | Baugenehmigung, Baubeginn                                  | "Bauantrag und Bauvorlagen" |

The Brandenburg T-01 cell's setup comment (line 718–720) even documents the
mistake as a deliberate "Shifted: § 70 Nachweise, § 72 Bauantrag" — but BbgBO
does NOT shift those two §§; it uses the MBO-standard § 66 / § 68 ladder. The
author then propagated the wrong belief into all eight T-01..T-08 cells.

Why the gate missed it: `verify:template-tail-citations` only checks that the
cited § exists in the state's corpus. §§ 70 and 72 DO exist in BbgBO — they
just have different headings (`Beteiligung der Nachbarn` / `Baugenehmigung,
Baubeginn`). The gate has no semantic / heading-match check.

Why this is critical, not just minor: a Brandenburg user looking up "§ 72 BbgBO
Bauantrag" gets a totally unrelated § (the Baugenehmigung/Baubeginn §). The
preliminary banner stays on, but the cell still names the wrong §§ — exactly
the silent-wrong failure mode Bucket A killed for Bayern.

**Proposed fix** (not applied this turn; this is audit-only):

- Replace `§ 72 BbgBO` → `§ 68 BbgBO` in the 8 "Bauantrag und Bauvorlagen" /
  "Bauantrag-Vorlagen" cites above.
- Replace `§ 70 BbgBO` → `§ 66 BbgBO` in the 7 "Bautechnische Nachweise" cites.
- Update the T-01 setup comment (`stateOverrides.ts:718-720`) and the
  ACKNOWLEDGED_OVERRIDES preamble in `scripts/verify-template-tail-noop.mts:280-297`
  ("Shifted: § 70 Nachweise, § 72 Bauantrag" → drop, since BbgBO actually uses
  the standard §§ here).
- Re-run prebuild (still green — both §§ stay in corpus, just different
  numbers); Bayern SHA invariant unaffected.

Cross-check that prompted this finding: MV, LSA, TH, Sachsen, SH, Bremen,
Hamburg, Berlin, RLP, Saarland — all spot-checked, all match their corpus
headings for these two §§. Only Brandenburg is wrong.

---

## MAJOR — should fix soon

### M1. Citation gate is presence-only, no heading-match

`scripts/verify-template-tail-citations.mts:152-184`. The verifier resolves a
cited `§ N LAW` by checking `stateCorpus[code].paragraphs[N] != null`. It never
checks that the surrounding prose ("Bauantrag und Bauvorlagen") matches the
corpus heading or archetype. The Brandenburg bug above is the proof the gate
cannot catch this class.

The corpus already carries `archetypes: [...]` per §. A reasonable upgrade:
when the cell's bullet text matches a known archetype label
(`bauantrag_bauvorlagen`, `bautechnische_nachweise`, `verfahrensfrei`,
`brandschutz`, `abstandsflaeche`, etc.), require the cited § to carry that
archetype tag. Keep the loose presence-check as a fallback for prose that
doesn't match a known archetype.

### M2. Regex hole — chained `§ X, § Y LAW` shorthand

`scripts/verify-template-tail-citations.mts:113-117`. The forward regex requires
the law name *immediately* after the §-number. If a future author writes
`§ 14, § 15 BauO Bln` (shorthand for two cites), only `§ 15 BauO Bln` is
captured. The `§ 14` slips past the gate entirely — could be a typo or
fabrication and the gate stays green.

Today the shipped prose always repeats the law name per cite, so no live
content is affected. But the gate's surface area lies about its coverage. Fix:
extend the forward regex to chain `\s*,\s*(?:§|Art\.)\s*\d+[a-z]?` lookups
before the law name.

### M3. Regex hole — unattached §§ (e.g. `§ 12a einschlägig`) bypass the gate

`src/legal/templates/stateOverrides.ts:867-868`. The Saarland T-01 cell carries
`§ 12c einschlägig … § 12a/§ 12b primär bei …`. Because no law name follows the
§ immediately, the forward regex fails — the §§ are invisible to the gate.

Hand-verified: §§ 12a/12b/12c LBO Saarland are all real (corpus has the PV
trio). But a future author could land a fabricated `§ 999 einschlägig` and the
gate would say green. Fix: track the most recently captured law name within the
same paragraph and apply it to bare § references that immediately follow.

### M4. `crossStateBleedGuard` only covers 5 of 16 states

`src/legal/crossStateBleedGuard.ts:32-58`. The runtime PDF sanitizer knows
tokens for Bayern, NRW, BW, Hessen, Niedersachsen only. It does NOT know any of
the 11 Bucket C state-prefixes: `BauO Bln`, `HBauO`, `BremLBO`, `SächsBO`,
`LBO SH`, `LBauO` (RP), `LBauO M-V`, `BauO LSA`, `ThürBO`, `BbgBO`,
`LBO Saarland`.

Consequence: if the LLM bleeds, say, `ThürBO § 14` into a Bremen project's PDF
"reason" string, the guard does not redact it. The Bucket C allowedCitations
upgrade closes this at chat-turn time (qualifier downgrade to ASSUMED), but the
PDF render path still has no belt-and-braces. Fix: add 11 more state→token
entries to the TOKENS array, with empty-string or `state-LBO` replacements
matching the 5-state convention.

### M5. Bayern SHA scope is narrower than "Bayern unchanged"

`scripts/lib/bayernSha.mjs:64-83`. The SHA covers SHARED + FEDERAL + BAYERN +
MUENCHEN + PERSONA + TEMPLATE_SHARED string constants only. It does NOT cover:

- `BLOCKS[T-01..T-08]` — the per-template tail Bayern projects receive
  (`src/legal/templates/t01-neubau-efh.ts` etc., which already contain
  `BayBO Art. 58 / 59 / 60` etc.). The `verify:template-tail-noop` gate pins
  these via the `(no-bundesland) controls` step, so this is *covered* — but the
  pin is in a different gate. Worth stating in the bayernSha.mjs comment block.
- `src/legal/stateCitations.ts` (Bayern's `BAYERN_PACK`, `allowedCitations`,
  procedure labels). A change here can alter Bayern UI output (chip labels,
  Layer-C allowlist) without the SHA noticing.
- `src/legal/states/bayern.ts`'s StateDelta wiring (currently a thin wrapper —
  any pivot of `cityBlock`/`systemBlock` would still produce the same compose
  output today, but the SHA does not pin the wrapper file).
- `factLabels.de.ts` / `factLabels.en.ts` — locale strings that flow into UI
  cards for Bayern. Caught by `verify:factlabels-leak` for *non-Bayern* leaks,
  but a Bayern label change would not surface via SHA.

The SHA is a great trip-wire but the comment ("Bayern unchanged") oversells
its scope. Recommend a one-line caveat in `scripts/lib/bayernSha.mjs` listing
what the SHA does and does NOT cover, plus a `// Pinned elsewhere: …` cross-
reference.

### M6. `factlabels-leak` doesn't cover template-literal labels or other files

`scripts/verify-factlabels-leak.mjs:65-67`. Only scans
`src/locales/factLabels.{de,en}.ts`, only matches `label\s*:\s*['"]…['"]`
(single/double quotes, not backticks). If a label gets rewritten as a template
literal or a different file accumulates new pan-German labels (e.g.,
`humanizeFact.ts`), the gate is silent. The token list (`BayBO`, `BayDSchG`,
`BayNatSchG`, `Bayerisch*`, etc.) also misses `BayKlimaG`, `BayObBO`,
`BayAGBauGB`, `BAK Bayern`. Add as needed.

### M7. Smoke matrix only sample-tests 14 of 128 cells; 2 stub assertions are now stale

`scripts/smoke-walk-matrix.mjs:136-149`. Cells 13 (sachsen × T-01) and 14
(berlin × T-01) have `stub: true` and `expectedAnchor: /Vorbereitung|Sachsen-spezifisch/` /
`/Berlin|Stadtstaat|Vorbereitung/`. Those cells now have substantive Pass-A
content; the matrix would still pass because the anchor is permissive, but it
no longer pins what it claims to pin. The 88 newly-authored Bucket C cells
(11 thin states × 8 templates) are not sampled at all. Live matrix is
operator-triggered and not in CI — strategic gap (see W2 below).

---

## MINOR — polish / hygiene

### m1. Stale doc-comments in legalRegistry

`src/legal/legalRegistry.ts:42-49` still says: "`allowedCitations` is
deliberately empty so the firewall accepts only federal-law citations until
per-state content lands (Phase 14). … Phase 14 expands the 11 minimum stubs."
After Bucket C, all 16 states carry populated `allowedCitations`. The "Phase
14" wording also drifts from the current SPRINT_PLAN's "Bucket B/C/D" vocabulary.
`src/legal/states/_types.ts:17` carries the same drift.

### m2. Cost engine still hard-baked to Bayern

`src/features/result/lib/costNormsMuenchen.ts:135-137`. `REGION_MULT = { bayern:
1.0 }`. Every non-Bayern state falls through to `1.0` (Bayern baseline). The
displayed string says "Bundesland-Faktor Berlin" / "Bundesland-Faktor Sachsen",
which suggests a calibrated regional factor; the actual multiplier is identical
to München. Honest in code-comment, misleading in UI string. (DESTATIS
calibration is the deferred 2026-05-28 item per project memory.)

### m3. Cost-bands file name vs scope

`src/features/result/lib/costNormsMuenchen.ts:435-506` — `COST_BANDS_BY_TEMPLATE`
is now (correctly) state-neutral in its `basisDe`/`basisEn` labels, but lives
in a file called `costNormsMuenchen.ts` whose BASE numbers are documented as
"München-tuned (calibration debt)". File name → rename candidate.
`SiteFooter.tsx:68` hardcodes "München · v1.0" on marketing/auth surfaces;
that's brand-HQ not project context (acceptable, but worth a flag for users
in non-Bayern markets).

### m4. ACKNOWLEDGED_OVERRIDES comment-as-discipline

`scripts/verify-template-tail-noop.mts:30-329` carries multi-paragraph author
notes per state batch (RLP shift, BB shift, SS § 86 skip, etc.). These are the
*only* record that a § was deliberately omitted as enforcement / admin-meta.
A future "fill the gaps" author has no structural prevention against silently
re-introducing, e.g., `§ 80 BauO Bln` (enforcement) into T-05 Berlin. Consider
a per-state `FORBIDDEN_PARAGRAPHS` set the gate enforces, mirroring the
allowlist pattern.

### m5. Self-flagged §§ check

Corpus self-flagged: SH § 58a, LSA § 86, TH § 98. Verified absent from active
prose; the matches in `stateOverrides.ts` are all inside `//` comments
explaining the omission. Clean.

### m6. Branch hygiene

`git branch -a` shows 30+ Bucket-A/B/C/Phase-* feature branches still on local.
`feat/c1-stadtstaaten`, `feat/c2-hamburg`, … `feat/c11-sl` are all merged into
main; safe to delete. Not blocking.

---

## WHAT I VERIFIED AND FOUND CORRECT

So the founder knows this audit was a real read, not just negativity:

- **All prebuild gates green** (`verify:locales`, `verify:hardcoded-de`,
  `verify:legal-config`, `verify:pdfstrings`, `verify:citation-drift`,
  `verify:factlabels-leak`, `verify:template-tail-noop`,
  `verify:template-tail-citations`, `verify:corpus-pack`,
  `verify:citations`). `verify:template-tail-citations` reports 116 authored
  cells, 2442 citations all verified.
- **Bayern SHA matches** `cdf3c625…23f9daaf`, length 48475. The full build
  succeeds; bundle 1021.2 KB raw / **298.0 KB gzipped** (ceiling 300 KB, 2 KB
  headroom).
- **State citation spot-checks** — sampled 10 of 16 states across the
  §§ that the cells claim are Bauantrag / Nachweise / Sonderbau / Brandschutz
  / Abstand / Standsicherheit / verfahrensfrei / Freistellung / vereinfacht /
  regulär. All matched the corpus headings *except Brandenburg* (C1 above).
  Specifically:
  - **Saarland** § 7 / § 13 / § 15 / § 47 / § 61 / § 63 / § 64 / § 65 / § 66 /
    § 67 / § 69 / § 12a / § 12b / § 12c — all correct.
  - **Thüringen** § 6 / § 12 / § 52 / § 54 / § 57 / § 63 / § 64 / § 65 / § 66
    / § 67 / § 72 / § 74 — all correct (shifted-numbering ladder validated).
  - **Sachsen-Anhalt** § 53 / § 60 / § 61 / § 62 / § 63 / § 64 / § 65 / § 67 /
    § 29 / § 32 — all correct.
  - **MV / Sachsen / SH / Berlin / Hamburg / Bremen / RLP** Bauantrag/Nachweise/
    enforcement §§ — all correct.
  - **BW** § 50 / § 51 (Kenntnisgabe — the BW-unique institute) / § 52 / § 53 /
    § 5 / § 13 / § 15 — all correct.
- **Banner end-to-end trace** holds. `STATES_WITH_FULL_STATE_BLOCK` (`bayern,
  nrw, bw, hessen, niedersachsen`) drives `hasSubstantiveStateBlock` →
  banner OFF for the 5 substantive states, ON for the 11 thin states. Both
  mount points exist (`ChatWorkspacePage.tsx:315`, `ResultWorkspace.tsx:108`).
  Chat banner is conditional on `isWorkspaceReady`; result banner is
  unconditional. No state in contradictory "cells authored but banner off"
  state — Bucket C cells stay paired with banner ON, exactly as the Pass-B
  discipline requires.
- **Cross-state-leak detection** in `verify:template-tail-citations` (the
  named-other-state-BauO branch, `:172-181`) is sound — Saarland's
  `LBO Saarland` law-short doesn't truncate to "LBO Saar" because the regex
  state-suffix list orders "Saarland" before "Saar" (the gate-regex fix
  referenced in commit `3b81c77`). Verified by tracing the alternation order.
- **Self-flagged §§ (SH § 58a / LSA § 86 / TH § 98)** are absent from active
  prose; the only matches are in comments documenting the omission.
- **No `BUCKET-B-CONTENT` / TODO / FIXME markers** in shipped paths.
- **No `_meta` schema drift** — `data_current_as_of >= last_amendment_date`
  for all 16 state corpora (3 aging warnings, no stale).

---

## WHERE WE'RE LACKING — strategic gaps the founder should hear, not bugs

### W1. Single-source mirror dependence

14 of 16 state corpora are `secondary-mirror`-only (the exceptions: BayBO and
BauO NRW have `primary-source` coverage). All 14 mirror sources are
`baunormenlexikon.de`, sometimes with a `landesrecht.<state>.de` cross-check
documented in the `_meta.notes`. The Brandenburg legal bug (C1) is exactly the
class of failure this exposes — even if the mirror is right, ONE author-read
miscount cascades into 8 cells, and the gate (presence-only) cannot catch it.

The discipline you want before a public launch: a sampling primary-source
re-verify for the 14 mirror states — at minimum the procedure ladder
(verfahrensfrei / Freistellung / vereinfacht / regulär), Bauantrag, Nachweise,
Brandschutz, Stellplätze, Sonderbau, plus the §§ each cell actually cites
(maybe 20 §§ per state × 14 states = ~280 §-confirmations). Same volume that
killed Brandenburg today.

### W2. No live / browser / visual test

This audit is entirely static. The 88 Bucket C cells × Pass A+C are wired in
TypeScript and pass the static gates, but no harness:

- renders the chat banner and confirms it actually paints above the message
  stream (we can only confirm it mounts in JSX);
- renders the result banner above the tab strip and confirms layout (sticky
  positioning, `top-12` offset under `AppHeader`);
- exports a PDF for, say, Saarland × T-03 and confirms no Bayern token bleeds
  through the persona;
- runs even one Sonnet 4.6 turn against a Brandenburg project to see whether
  the model actually picks up the override addendum or still leans on
  `BayBO Art. 58` from the BLOCKS[T-01] tail.

`smoke-walk-matrix.mjs` is the harness for the last point — but it is operator-
triggered, costs $10-20 per run, and currently samples 14 of 128 cells.
`smoke-pdf-matrix.mts` exists for PDF render but its coverage of the new states
needs auditing.

### W3. Additive-addendum design is sound but model-dependent

The Bucket B0 design is: `getTemplateBlock(T, bundesland)` returns
`BLOCKS[T] + '\n\n' + override`. BLOCKS[T] is *Bayern-shaped*
(`src/legal/templates/t01-neubau-efh.ts:38`: "→ BayBO Art. 58 (Genehmigungs-
freistellung …)"). The override addendum says "die §§ der BauO Bln ersetzen
sämtliche oben genannten Bayern-Verweise". The model is *expected* to follow
the override and override the Bayern §§ in its output.

This is structurally fragile. The model sees both authorities in its prompt,
the more-recent token wins → today the override wins, but a Sonnet 4.6 prompt-
optimization downstream could shift that. The only protections you have:
- Layer-A persona rules ("ZITATE-DISZIPLIN")
- Layer-C `allowedCitations` qualifier downgrade
- `crossStateBleedGuard` sanitizer (5 states only — see M4)

For Pass B (lawyer-gated), the proper fix is: BLOCKS[T] should become
state-neutral and the addendum becomes the canonical content. That's a Bayern-
SHA-breaking change and explicitly out-of-scope today, but worth keeping on
the architectural roadmap.

### W4. "Banner ON forever until a lawyer" is a UX trap

Today 11 of 16 banners are permanently ON. A Berlin / Hamburg / Saarland / etc.
user sees "Vorläufige Bundesland-Inhalte" indefinitely. This is the honest
choice — the systemBlock IS preliminary — but it shapes the perception of the
product for ~80% of Germany's population (Bayern + the four big "substantive"
states cover ~58% of GDP but not 80% of head-counts). Two strategic options:

1. Pass-B every state to "substantive" with proper systemBlock prose and turn
   the banner off. Expensive (legal review per state) but clean.
2. Reframe the banner from "we don't know enough" to "scope notice — your
   architect verifies before submission" so the message lives gracefully even
   after Pass B. Cheaper, and aligns with how Bauantrag-Vorbereitung is
   actually consumed (architect-in-the-loop).

Not a bug — just naming that the current state has a trade-off.

### W5. EN/i18n parity for Bucket C prose

`src/legal/templates/stateOverrides.ts` is German-only. When a user toggles
the UI to English, the chat-banner copy translates via i18n, but the *prose*
in the addendum is unchanged German that the model is expected to render in
English on demand. No test pins that the Saarland T-03 override produces a
sensible English answer.

### W6. Smoke matrix doesn't reflect Bucket C

`scripts/smoke-walk-matrix.mjs` cells 13/14 (Sachsen / Berlin × T-01) still
expect `/Vorbereitung/`-anchored content — those cells now have substantive
Pass-A overrides. The matrix would still pass (anchor is permissive), but
"this cell is pinned to a stub state" is no longer true. Reframe these assertions
or extend the matrix to sample the 11 new states × at least T-01 and T-05
(EFH and demolition — the highest-traffic cells in user-research observation).

### W7. Cost engine still München-anchored

`costNormsMuenchen.ts:135-137` (M2 above as a code line; W7 as the strategic
read). For non-Bayern projects, the cost numbers are exactly München's. A
Brandenburg user typing "what does this cost" gets a München answer. The Cost
& Timeline tab notes the basis as "EFH-Neubau, ~150 m²" without naming
München in the band labels — the leak was closed in Phase D — but the
numerical estimate is still wrong-by-region for any state that's not Bayern.
DESTATIS calibration (WS1/2/4) was deferred to 2026-05-28; today's the date.

### W8. Layer-C edge-function redeploy stage

Per project memory: Phase C item 3 left a "PENDING operator step: chat-turn
edge-function redeploy so the live chat firewall picks up the new BW/NI
allowlist entries." Bucket C added 11 more states' allowlists to the same
file (`citationLint.ts` resolves via `src/legal/states/*.ts`). The Layer-C
firewall is only as up-to-date as the last edge-function deploy. Verify deploy
status (Supabase Functions dashboard) before assuming the new state allowlists
are live-enforced.

### W9. Stale Phase-N references in docs / comments

`legalRegistry.ts:42-49`, `_types.ts:17`. Drift from current bucket-vocabulary.
Cheap cleanup.

### W10. Comment-only "intentionally omitted" discipline

The ACKNOWLEDGED_OVERRIDES comment block (m4) is the only record of which §§
were *deliberately* omitted from each cell. A future author has no structural
prevention against re-introducing them. Consider a `FORBIDDEN_PARAGRAPHS` map
to encode the discipline.

---

## PRIORITIZED FIX LIST — for the next session

P0 (before any external demo):
1. **Fix Brandenburg §§ 70/72 → 66/68** across the 8 cells listed under C1.
   Update the T-01 comment + ACKNOWLEDGED_OVERRIDES preamble. Re-run prebuild.
   Bundle stays at 298.0 KB gz; Bayern SHA unaffected.
2. **Spot-audit the other "shifted-numbering" claims** in the same pass —
   author's other "Shifted: …" comments should each be cross-checked against
   the corpus heading_de_official, not just the §-number's existence (TH, LSA,
   Saarland, RLP, NRW already match; Brandenburg was the only outlier in this
   audit but the methodology should be re-applied as a discipline).

P1 (before broader rollout):
3. Upgrade `verify:template-tail-citations` to require an archetype match when
   the cell's bullet text matches a known archetype label (M1).
4. Extend the citation regex to chain `, § N` and to track the most-recent
   law name for bare § references (M2 + M3).
5. Add the 11 missing state tokens to `crossStateBleedGuard.ts` (M4).
6. Update `scripts/smoke-walk-matrix.mjs` cells 13/14 to expect substantive
   Pass-A content (M7 + W6).
7. Confirm Supabase chat-turn edge function is redeployed since the latest
   allowedCitations expansion (W8).

P2 (quality / hygiene):
8. Document the SHA scope caveat in `scripts/lib/bayernSha.mjs` (M5).
9. Extend `verify:factlabels-leak` to other locale-prose files + template-
   literal labels + the wider Bayern token vocabulary (M6).
10. Refresh the stale Phase-14 / "allowedCitations deliberately empty" comments
    in `legalRegistry.ts` + `_types.ts` (m1 + W9).
11. Consider a `FORBIDDEN_PARAGRAPHS` per-state set so the enforcement-§
    discipline is enforceable, not advisory (m4 + W10).
12. Decide on DESTATIS WS1/2/4 (today's the deferred date) or move the
    "Bundesland-Faktor" label to honest "estimate based on München rates" to
    avoid the calibration-implied-but-not-delivered UX trap (m2 + W7).
13. Plan the visual / live smoke pass (W2): manual walk of 2-3 thin states
    end-to-end (Saarland × T-03, Brandenburg × T-05, Berlin × T-01) once
    Brandenburg fix lands.

P3 (architectural):
14. Plan the Pass-B canonical-content swap (W3 + W4): state-neutral BLOCKS[T]
    with addendum as the source of truth, and a banner-off-by-default product
    framing.
