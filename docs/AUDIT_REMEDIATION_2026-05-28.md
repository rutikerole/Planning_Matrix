# AUDIT REMEDIATION — 2026-05-28

Branch: `fix/audit-remediation` off `main` @ `453655c`.
Source of truth: `docs/FULL_AUDIT_2026-05-28.md` (commit `b09364f`).
Final HEAD: `2194ea7`.
**Not pushed, not merged — left for review.**

---

## VERDICT

**Ready for live browser test.** Every finding in the audit doc is
either fixed in code or surfaced as a deferred decision below. The
Brandenburg § 70/72 bug is repaired, the gate that missed it is now
archetype-aware (proven against re-injection), the cross-state bleed
guard covers all 16 states, and four other axes of audit findings
(prose tightening, stale comments, honest cost label, enforcement-§
discipline as a gate) are committed. Bayern composed-prefix SHA
`cdf3c625…23f9daaf` held across all 8 commits. tsc green, prebuild
green, bundle 298.1/300 KB gz.

What you must do BEFORE the live test: redeploy the Supabase chat-turn
edge function so Layer-C picks up the populated allowedCitations for
all 11 Bucket-C states. See "Operator step" below.

---

## COMMITS (in order)

| # | SHA       | Phase | What                                                                          |
|---|-----------|-------|-------------------------------------------------------------------------------|
| 1 | `a5f7ebb` | P1    | Brandenburg §§ 70→66 (Nachweise), 72→68 (Bauantrag), × 8 cells / 15 sites     |
| 2 | `8e6d43a` | P2    | scripts/audit-heading-match.mts — exhaustive 116-cell heading-match scan      |
| 3 | `40d8596` | P2    | "Bundes-Maß ergänzend" → "Bundesrecht ergänzend" × 15 T-04 cells              |
| 4 | `071a104` | P3    | M1 archetype-match + M2 chained-§ + M3 paragraph-scoped law inference        |
| 5 | `a8c58bb` | P3    | M4 — crossStateBleedGuard covers all 11 Bucket-C state shorts                |
| 6 | `c700d51` | P4    | smoke-walk-matrix.mjs: cells 13/14 fixed + 20 new T-01/T-05 cells (34 total) |
| 7 | `b1073d6` | P5    | M5 bayernSha scope caveat + M6 factlabels-leak widening                      |
| 8 | `2194ea7` | P5    | m1/W9 stale comments + m4/W10 forbidden-paragraphs gate + m2/W7 honest cost label |

All eight commits leave Bayern SHA `cdf3c625…23f9daaf` MATCH. None
touched Bayern legal paths, DESIGN_DNA, Phase-7.9, or `shared.ts:175`.
None bypass hooks; all signed by `Co-Authored-By: Claude Opus 4.7 (1M
context)`.

---

## PHASE-2 HEADING-MATCH REPORT (the big methodology pass)

`scripts/audit-heading-match.mts` ran against all 116 authored cells.
1644 cite-sites scanned. Coverage:

```
OK by archetype:                                 1265
OK by prose↔heading word-overlap:                 245
Skipped (meta-label / non-corpus law):             47
STRONG_FLAG (concept maps to slug, § lacks it):     0   ← after fixes
SOFT_FLAG  (vague-concept low overlap):            87
```

**STRONG_FLAG resolution trail:**

- **Before Phase 1:** Brandenburg × T-01..T-08, × 2 §§ each = 16 sites,
  all bauantrag_bauvorlagen / bautechnische_nachweise concepts pointing
  at `§ 70/§ 72 BbgBO` whose headings are `Beteiligung der Nachbarn` /
  `Baugenehmigung, Baubeginn`. Confirmed wrong-§-numbers — fixed.

- **After Phase 1, before P2 prose tightening:** 5 cells flagged
  `Bundes-Maß ergänzend — § 12 BauNVO`. The §-number was correct
  (§ 12 BauNVO IS Stellplätze und Garagen — the federal supplement for
  the state-level Stellplatz §§ cited beside it), but the prose label
  "Maß" misleadingly suggested § 12 was about Maß der baulichen Nutzung
  (which is §§ 16-23 BauNVO). Prose tightened across all 15 T-04 cells
  → 0 strong flags.

**Was Brandenburg the only wrong-§-number state?**

YES. Confirmed by:
- Exhaustive 116-cell × 1644 cite-site sweep — 0 remaining strong flags
- Manual SOFT_FLAG review (87 rows): all are concept-extraction
  artefacts on multi-line bullets, conditional triggers like
  "Bei Umnutzung zu …", or correctly-cited but loosely-labelled federal
  anchors (§ 10 GEG "Neubau-Teil des Anbaus", § 34 BauGB "Einfügen
  im Innenbereich", etc.). No remaining cite where the §-number is
  wrong relative to its prose claim.

So the entire surface area of 116 cells × ~14 cites each = ~1600 §-cites
is now corpus-verified at both the presence axis AND the heading-meaning
axis.

---

## GATES — NEW + CHANGED

| Gate                                  | Tier | Change                                                       |
|---------------------------------------|------|--------------------------------------------------------------|
| verify:template-tail-citations        | T1   | unchanged — presence-only check still runs                   |
| verify:template-tail-citations        | T2   | NEW — M1 archetype-match (Brandenburg-class catcher)         |
| verify:template-tail-citations        | T2   | NEW — M2 chained `§ A, § B LAW` shorthand resolution         |
| verify:template-tail-citations        | T2   | NEW — M3 paragraph-scoped LAW inference for bare § refs      |
| verify:factlabels-leak                | T1   | M6 — template-literal labels; +5 Bayern token vocab          |
| verify:forbidden-paragraphs           | NEW  | m4/W10 — per-state enforcement-§ allowlist, prebuild-wired   |
| crossStateBleedGuard.ts (runtime)     | rt   | M4 — 11 new state-LBO + DSchG token pairs                    |
| smoke-walk-matrix.mjs                 | live | P4 — 14 → 34 cells, cells 13/14 anchors fixed                |
| scripts/lib/bayernSha.mjs             | doc  | M5 — explicit "what SHA does and does NOT cover" preamble    |
| legalRegistry.ts / states/_types.ts   | doc  | m1/W9 — stale Phase-14 references replaced with bucket vocab |

**Prebuild order is now:**
locales → hardcoded-de → legal-config → pdfstrings → citation-drift →
factlabels-leak → template-tail-noop → template-tail-citations →
**forbidden-paragraphs** (new) → corpus-pack → citations.
11 gates total.

### Injection proofs (each new gate)

- M1: re-injecting `§ 70 BbgBO` / `§ 72 BbgBO` across the 8 BB cells →
  Tier-2 archetype check FAILS with concept + corpus heading +
  `expected: <slug>` dump. Revert → green.
- M2: `§ 14, § 999 BauO Bln` (chained shorthand) → § 999 attributed to
  BauO Bln via the chained-anchor path → presence check FAILS. Revert
  → green.
- M3: bare `§ 12b/§ 999 primär` injected into the Saarland T-01 PV
  paragraph → § 999 attributed to LBO Saarland via the
  standalone-law-mention anchor → FAIL. Revert → green.
- M4: `sanitizeCrossStateBleed('ThürBO § 14', 'bremen')` →
  `'state-LBO § 14'` + console.warn. Negative-lookahead on bare LBauO
  vs `LBauO M-V` validated explicitly.
- M6: template-literal `label: \`Grundstück vorhanden (BayBO Art. 1)\``
  in factLabels.de.ts → gate FAILS with `token: 'BayBO'`. Revert →
  green.
- forbidden-paragraphs: inject `§ 80 BauO Bln` into Berlin cells →
  gate FAILS across 3 T-04/T-06/T-07 cells with full context dump.
  Revert → green.

---

## OPERATOR STEPS REQUIRED (you, not me)

**1) Supabase edge function redeploy (W8 — Layer-C enforcement).**

The chat-turn edge function under `supabase/functions/chat-turn/`
imports `src/legal/legalRegistry.ts` → state deltas → each state's
`allowedCitations`. Bucket-C populated 11 thin states' allowlists in
the source files; the running edge function is a snapshot at last
deploy time. Until you redeploy, the live Layer-C firewall accepts
fabricated §§ for non-Bayern states unchecked (qualifier downgrade
doesn't fire).

```sh
supabase functions deploy chat-turn
```

The repo's commit history shows this is the standard step
(`docs/PHASE_10_REPORT.md:155`, `docs/launch-checklist.md:41`,
`docs/V1_0_27_BRUTAL_HONESTY_REPORT.md:102` etc.). Do this BEFORE the
live browser walk; otherwise the Layer-C side of the test is invalid.

**2) Branch cleanup (optional).**

`git branch --merged main` reports 44 local branches fully merged into
main. Examples: `feat/c1-stadtstaaten` … `feat/c11-sl`, `feat/b2-*`,
`audit/coverage-truth-table`, `phase-2/full-matrix`,
`phase-a/legal-spine`, `phase-b/wire-spine`. All safe to
`git branch -d <name>`. I did NOT delete any — that's a one-line
operator decision once you confirm nothing local is needed.

**3) Live smoke matrix sample (paid; operator-budget-gated).**

The matrix now spans 34 cells. A FULL live walk = $25-50 on Sonnet 4.6
per the comment block. A representative sample with
`--cells=14,17,19,22,24,28,33` (Bezirksamt-Stadtstaaten + a Flächenland
spread + a few T-05 abbruch cells) is 7 cells × 5 turns = 35 calls,
roughly $5-7, and exercises the M4 cross-state-bleed coverage on
PDF text + the M3 paragraph-scoped law inference where it matters.

---

## RE-VERIFIED INVARIANTS

- Bayern composed-prefix SHA `cdf3c625…23f9daaf` MATCH (also verified
  after every commit).
- 11 thin-state banners ON (`STATES_WITH_FULL_STATE_BLOCK` =
  `{bayern, nrw, bw, hessen, niedersachsen}`); Berlin / Hamburg /
  Bremen / Sachsen / SH / RLP / MV / LSA / TH / BB / Saarland banner
  stays ON; 5 substantive banners OFF — unchanged.
- `verify:template-tail-citations` reports 116 authored cells, 2463
  cites verified (up from 2442 pre-remediation; the +21 are bare /
  chained §§ now visible to the gate via M2/M3), 0 archetype mismatches.
- `verify:forbidden-paragraphs` reports 116 cells scanned across 14
  states (the 2 federal-only entries don't have BauO shorts), 0 leaks.
- `verify:factlabels-leak` reports 454 labels scanned, 0 Bayern-token
  hits in pan-German labels.
- tsc clean.
- Bundle 298.1/300 KB gz (was 298.0 KB; +0.1 KB from honest cost-label
  string addition in costNormsMuenchen.ts).
- `npx tsx scripts/audit-heading-match.mts` reports zero STRONG_FLAGs.
- All 8 commits sign with `Co-Authored-By: Claude Opus 4.7 (1M
  context)`.

---

## DEFERRALS — what I explicitly did NOT do

1. **DESTATIS WS1/2/4 regional cost calibration.** Today's the
   originally-scheduled date for this work, but doing it requires
   verifying the GENESIS API URL migration to `genesis.destatis.de`
   AND a real `DESTATIS_API_TOKEN` in `.env.local`. Out of scope for
   this audit-remediation branch; the W7 mitigation is the honest
   "Schätzung auf München-Richtwerte" label so users aren't misled.

2. **String-literal-wide scan for humanizeFact.ts + legalCitations.ts.**
   M6 considered extending the factlabels-leak gate to scan ANY string
   in those files. Rolled back because both files legitimately carry
   `BayBO Art. 58 / 59 / 60` strings inside `bundesland === 'bayern'`
   code branches. A proper widening needs either a key-level allowlist
   or a state-branch lint — bigger than this remediation. The
   documented future-refactor note is in `verify-factlabels-leak.mjs`.

3. **Pass-B systemBlock authoring for the 11 thin states.** The audit
   doc's W4 ("banner ON forever is a UX trap") is a strategic call,
   not a bug. Banner-flip needs licensed-counsel review of each state's
   systemBlock prose. Out of scope.

4. **Primary-source re-verification of 14 mirror-tier state corpora.**
   The audit's W1 strategic gap. Would require ~280 §-checks across
   `landesrecht.<state>.de` portals. Out of scope for the
   remediation pass; the audit doc lists it as the discipline-bar
   before public launch.

5. **Live smoke matrix run.** Operator-budget-gated, paid Anthropic
   calls. Matrix FIXTURES are now correct (34 cells, anchors fixed,
   stale stub assertions removed); running the live walk is your call.

6. **Branch deletion.** 44 merged branches listed for cleanup; I did
   not run `git branch -d`. Destructive action without explicit ask.

7. **edge function deploy.** Per global discipline ("don't push, don't
   merge — leave the branch for my review"), and because deploy is
   itself a one-line operator action.

---

## HONEST READ — is the remediation complete?

Yes for the audit doc's findings. The methodology that caught
Brandenburg (Phase 2 archetype scan) now lives both as a one-off
script AND as a hard gate (M1 archetype-match Tier 2); together with
M2/M3, the class of bug "right §-number, wrong heading meaning" is
caught structurally now. M4 closes the runtime PDF bleed for the 11
new states. m4/W10 locks down the enforcement-§ omission discipline
that previously lived only in comments.

What's NOT yet structurally caught and remains discipline-only:

- **Mirror-source author miscount** (the Brandenburg root cause):
  a single mis-read of the same mirror source by a future author
  could still ship wrong §-numbers IF they get the heading right too.
  Today the corpus, the cells, and the archetype-tag agree because
  Brandenburg's wrong §§ had EMPTY archetypes. If a hypothetical
  re-authoring slip cited a § that DOES carry the right archetype but
  is semantically the wrong §, neither gate catches it. Mitigation
  is the primary-source re-verify discipline (W1, deferred).

- **Cells citing concepts that legitimately span topics the corpus
  has no archetype for** (Standsicherheit, Entwurfsverfasser,
  Bauüberwachung … the corpus archetype list is 16 entries, not
  exhaustive). The CONCEPT_TO_ARCHETYPE map in
  verify-template-tail-citations.mts handles the common ones (we
  mapped Statik/Standsicherheit → bautechnische_nachweise to absorb
  the most common case). Future concepts may need new (rx, slug) rows.

Bayern is untouched; the 5 substantive non-Bayern states are
unaffected; the 11 thin states are now both fixed and gated against
recurrence. **Go ahead with the live browser test once you've
redeployed the edge function.**
