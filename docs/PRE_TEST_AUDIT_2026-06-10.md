# Pre-Test Adversarial Code Audit — 2026-06-10

Branch `audit/pre-test-hardening` (off main `b40870d`). **NOT merged / NOT deployed.**
Bayern SHA `45aea17a` — MATCH start AND end (the one fix is frontend-only, not in the
persona prefix).

**Scope:** hunt in the gates' self-documented blind spots — concept-correctness,
cross-state bleed, honor-contradicting-verdict, quality tags, risk suppression,
edge-fn drift. This is a CODE-side hardening pass. It does NOT re-run green gates and
declare done.

## HARD BOUNDARY (read first)
**The CLASS-2 live-emission walk is NOT yet run.** No code audit can confirm the
persona emits the reader keys live. This audit hardens the code side; **only the walk
closes CLASS 2, and only per-template human walks close the rest.** CLASS 2 is NOT
done and the campaign is NOT complete. See "What still needs a walk".

## Result: 6 blind spots audited · 1 real finding (YELLOW) fixed · 0 RED · the rest clean with evidence

| # | Blind spot | Verdict | Action |
|---|---|---|---|
| 1 | Concept-correct vs corpus-correct (16 states) | **CLEAN** (verified vs corpus) | none — residual = corpus transcription (human review) |
| 2 | Cross-state bleed beyond the guard | **CLEAN** (state-gated) | none |
| 3 | Honor-contradicting-verdict beyond 3 branches | **1 YELLOW** — NRW-sanierung hole | **FIXED + pinned** |
| 4 | Quality-tag integrity | **CLEAN** | none (1 defensible note) |
| 5 | composeRisks suppression class | **CLEAN** (unique to Heritage) | none (backstop HELD) |
| 6 | Edge-fn vs frontend resolver drift | **CLEAN** (resolvers pure) | none |

---

## #1 — Concept-correctness (the highest-value hunt). CLEAN.
Audited all **11 thin states'** `permitSubmission` / `structuralCert` / `permitForm`
and procedure `free/freistellung/simplified/regular` §§ (`corpusCitations.generated.ts`)
against the **heading-verified corpus** (`scripts/legal-corpus/states/*.json`) — the
method that found Hessen § 49 = "Blitzschutzanlagen" and BW § 73a.

**Every cited § maps to a heading that governs its concept.** The MBO-offset families
are internally consistent (Berlin/Bremen/MV/SH/Sachsen MBO-aligned; NRW +2, Hessen +2,
LSA −1, Saarland +1). The three outliers all check out with the corpus heading as evidence:
- **RLP `permitSubmission` § 64 LBauO = "Bauvorlageberechtigung" ✓** — the dangerous
  wrong-neighbour is § 65 = "Behandlung des Bauantrags" (authority handling); the code
  correctly cites § 64, NOT § 65. (RLP also inverts the MBO order: permitForm § 63
  precedes permitSubmission § 64 — both still concept-correct.)
- **Thüringen § 72 = "Bautechnische Nachweise", § 74 = "Bauantrag, Bauvorlagen" ✓** —
  the 67→72→74 gaps are real ThürBO numbering, not a generator fallback.
- **Hamburg HBauO § 65/§ 66/§ 68 ✓** — confirmed it follows MBO numbering at these §§.
- Brandenburg correctly has NO `freistellung` (BbgBO lacks it); the absence is honest.

**Residual risk (only a human can close):** this verifies the generated citation ↔ the
corpus heading. If the CORPUS itself mis-transcribed a heading from the primary source,
this audit cannot see it. Closing that = the 16-state primary-source legal review
(out of scope for a code audit). The 5 deep-verified states (Bayern/NRW/BW/Hessen/NI)
are hand-checked; the 11 thin states are corpus-verified, not primary-verified.

## #2 — Cross-state bleed. CLEAN.
- `composeLegalDomains` BayBO rows (§§ 2/57/58/59/60/6) are gated by `if (isBayern)`
  (l.174); the non-Bayern `else` emits the state's OWN procedure §. No BayBO leak.
- `resolveProcedure` hardcoded §§ are all state-gated: NRW §§ behind `c.bundesland==='nrw'`,
  Bayern behind `==='bayern'`; the hard-blocker Voranfrage citation (l.372-376) is an
  honest generic `'state-specific Voranfrage/Vorbescheid §'` for every other state — no
  wrong § leaks.
- `sanitizeCrossStateBleed` (the bleed guard) is a SAFETY NET that scrubs every OTHER
  state's LBO/DSchG tokens; primary defense is that resolvers read `getStateLocalization(c.bundesland)`.
- **Residual (defense-in-depth, not exhaustively audited):** the bleed guard only helps
  on surfaces that CALL it; I did not enumerate every render call-site. Low risk given
  resolvers are state-parameterized, but a per-surface call-site sweep is a follow-up.

## #3 — Honor-contradicting-verdict. 1 YELLOW — FIXED.
**Finding (YELLOW, CLASS-1 default-masks-verdict, narrow):** `resolveNrwSanierung`
(`resolveProcedure.ts:760`) intercepts the `nrw && sanierung` branch (l.524) and decides
PURELY FROM FACTS (`eingriff_tragende_teile=true → vereinfachtes § 64`) — it never
receives `viRaw` and never honors the persona's cited §. Because it returns at l.525,
the general-sanierung `honorContradictingVerdict` (l.567) is **dead code for NRW**. So an
NRW renovation that cleared the hard-blocker + Sonderbau gates but whose persona verdict
cites the REGULAR § 65 / FREE § 62 BauO NRW was silently shown as **vereinfachtes § 64** —
the exact CLASS-1 class the Phase-1b fix closed for every OTHER state's sanierung. The
Phase-1b smoke loop literally omits `['nrw','sanierung']`.

**Fix (frontend, deterministic, zero-drift):** call `honorContradictingVerdict(viRaw,…)`
at the top of the `nrw && sanierung` branch, mirroring the other 3 branches. Symmetric —
only a FREE/REGULAR-§ verdict is honored; a simplified-§ or no verdict returns null →
`resolveNrwSanierung`'s existing fact-driven output is unchanged.

**Proven non-vacuous:** without the fix, `nrw/sanierung` REGULAR § 65 + eingriff=true →
vereinfachtes (2 smoke failures); with it → standard·CALCULATED. Pinned by 3 new
assertions in `smoke-thin-state-propagation.mts` (142 passed). No other hardcoded-kind
branch skips both honoring paths: neubau(non-NRW)/abbruch/aufstockung/anbau/sonstiges all
fall through to the symmetric §-comparison block (l.648-706); the keyword branches honor
explicit keywords.

## #4 — Quality-tag integrity. CLEAN (1 note).
`resolveProcedure` tags `ASSUMED` for the generic fallback + hard-blocker deferral, and
`CALCULATED` for computed branches (§-comparison where the persona cited a specific §,
intent+non-Sonderbau). `deriveGebaeudeklasse` correctly downgrades approximations to
ASSUMED (`heightApprox || freistehendApprox || neCount==null → ASSUMED`). No value was
found tagged CALCULATED that is actually a fabricated default.
- **Note (defensible, not a bug):** the sanierung/umnutzung branches tag CALCULATED for
  "intent + cleared gates" even when the persona cited no §. This is computed from the
  case (not assumed-from-nothing) and is the campaign's established semantics; flagging
  for transparency, not changing.

## #5 — composeRisks suppression class. CLEAN. (Backstop HELD per prior decision.)
Audited every entry in `RISK_CATALOG`: **only `risk-denkmal` has `suppressWhenFactFalse`**
(`'denkmalschutz'`). The "value===false suppresses regardless of quality (+ ASSUMED-negative
suppresses)" exposure is **UNIQUE to Heritage** — no other risk is silently suppressed by
an absent/false fact. The other filters (`intents`/`excludeIntents`/`bundeslaender`) are
VISIBLE scoping, not fact-driven silent suppression. So there is no second instance of the
over-emission exposure. Per your instruction, the reader-backstop (suppress Heritage only
at grounded quality) is **NOT built** — we decide it from the CLASS-2 walk.

## #6 — Edge-fn vs frontend resolver drift. CLEAN.
The shared edge-fn legal code (`src/legal/*`, bundled into chat-turn — confirmed by the
v14 deploy manifest) is **pure**: no `Date.now`/`new Date`/`import.meta.env`/`window`/
`navigator`. All `new Date()`/env usage is in **frontend-only result composers**
(`resolveProcedure`, `composeCalendar`, `deriveBaselineRoles`, … — NOT in the edge-fn
bundle) or in the **server-only reducer** (`applyExtractedFacts`'s `setAt`, which runs
once in the edge-fn, never re-run client-side). So no resolver produces different output
server-side vs client-side. (Note: procedure resolution is FRONTEND-only by design — the
persona emits `verfahren_indikation`; the frontend `resolveProcedure` renders it.)

---

## What this audit does NOT close — needs a walk / human
1. **CLASS-2 live emission (the open precondition).** chat-turn v14 carries the hardened
   directive; only a live MV walk confirms the persona EMITS the keys, correctly valued
   and qualified (denkmalschutz not false without grounding; procedure still §63 CALCULATED).
2. **Per-template human walks (T-01..T-08 × representative states).** The sweep + this
   audit are code-level. Live persona output (concept choices, prose↔fact agreement,
   rendering) is only verified by walking each template.
3. **Concept-correctness residual:** corpus transcription accuracy for the 11 thin states
   (primary-source 16-state legal review). Code↔corpus is verified; corpus↔reality is not.
4. **Bleed-guard call-site coverage:** every render surface actually invoking the guard
   (defense-in-depth).

## Gates (end of audit, branch `audit/pre-test-hardening`)
tsc -b ✓ · Bayern SHA **45aea17a MATCH** · audit:four-class:gate **0 RED · 2 YELLOW (held)** ·
smoke:thin-state 142/0 (incl. 3 new NRW-sanierung assertions, proven non-vacuous) ·
smoke:citations ✓ · smoke:class2-capture 10/0 · smoke:pdf-text 386/0 · smoke:pdf-matrix 16/16 ·
smoke:cost-procedure 9/0. Fix is frontend-only — no edge-fn redeploy, no SHA move.
