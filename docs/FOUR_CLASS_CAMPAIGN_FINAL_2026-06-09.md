# Four-Class Campaign — Final Report (2026-06-09)

Branches: `fix/four-class-campaign` (Phases 0/1/1b/2/4/3 — **merged + deployed**) and
`fix/campaign-final` (Phases 5a/5b + this report — **NOT merged, NOT deployed**).
Bayern SHA: re-baselined `ed6f109e…b9d746 → f9743ff3…0d75e` (full-prefix; see §SHA).

## Board: 83 RED · 16 YELLOW → **0 RED · 2 YELLOW**

```
ORIGINAL (Phase 0)                 FINAL
all states ~123·/1234         →    all states ··3·   (only CLASS 3 latent, ×2)
```
`audit:four-class`: **0 RED · 2 YELLOW** (CLASS 1:0 · 2:0-orphans+1-INFO · 3:2 · 4:0-RED).
The 2 residual YELLOW are CLASS-3 *inherent/low-priority*, documented below.

## Per-phase ledger

| Phase | Class | What | Side / redeploy | SHA |
|---|---|---|---|---|
| 0 | — | re-ground; confirmed 83 RED·16 YELLOW; corrected framing (CLASS 1 = 78 not 80; NRW-neubau already clean) | — | held |
| 1 `ef4c6ef` | 1+3 | **structural verdict honoring** in resolveProcedure (§-comparison vs the state's free/simplified/regular §§) — **CLASS 1 78→0** | frontend / no | held |
| 1b `ac17e14` | 1 | honor a *contradicting* (regular/free) verdict § over the simplified default (NRW-neubau/sanierung/umnutzung) — sweep blind-spot | frontend / no | held |
| 2 `84cfed5` | 3 | statute regex (`§30/34`, no-space), non-string fact coercion, English verdict variants — **CLASS 3 8→3** | frontend / no | held |
| 4 `e29d0be` | 4 | **acknowledged-out-of-corpus registry** + gate hardening (unregistered out-of-corpus now fails) — **CLASS 4 RED 5→0** | build-time / no | held |
| 3 `45377c3` | 2 | persona **write-directive** for the exact reader keys + **fixed the SHA-guard blind spot** | **EDGE-FN / YES (deployed v13)** | **re-baselined** |
| 5a `62b2d14` | 3 | detectProcedure reads the structured kind (title), not rationale text — **CLASS 3 3→2** | frontend / no | held (new) |
| 5b `075074e` | — | unify the timeline on one procedure-aware source (Executive Read was the flat-"6mo" outlier) | frontend / no | held (new) |

## 🔧 SHA-guard blind spot — discovered, fixed, re-baselined (Phase 3)

`bayernSha.mjs` `readBlock` used a **lazy** regex that terminated at the **first escaped
backtick**, so it hashed only each slice's prefix before its first `` \`inline-code\` ``:
`PERSONA_BEHAVIOURAL_RULES` = **5191 of 15382 chars (~34%)**; the full prefix is **91295**,
of which the old hash covered only **49612 (~54%)**. The guard was blind to the A.5/D.5
fact-persistence directive, B.1, and the tails of SHARED/BAYERN/MUENCHEN — which is why the
Phase-3 persona edit didn't move the old SHA, and why Sprint-2's A.5/D.5 addition didn't
either. Fixed `readBlock` to scan to the first *unescaped* backtick; re-baselined
`ed6f109e → f9743ff3` (49612 → 91295 chars), logged in `bayernSha.mjs`. The guard now pins
the **full** Bayern prompt.

## Phase 5c / 5d / 6b — recommendations (no code changed; your call)

- **5c — thin-state GK / building-class capture: RECOMMEND LEAVE AS-IS.** The honest "not
  recorded" behind the preliminary banner is *correct* — a guessed GK is worse than an
  explicit absence, and the architect-verification stage needs honesty over a fabricated
  class. Capturing it would be an **edge-fn persona-directive** change (redeploy + a live
  walk) for marginal gain. Not changed. (If you want it, I can add a GK-capture directive
  alongside the Phase-3 STRUKTUR-FAKTEN block — same redeploy.)
- **5d — edge-fn retry-budget-vs-wall (3×50s ≈ 158s > ~150s wall): STILL DEFERRED, pending
  telemetry.** No telemetry shows this recurring; per your gate I did **not** change it.
  If telemetry later shows timeouts hitting the wall, the fix is `MAX_ATTEMPTS=2` or a lower
  per-attempt timeout in `anthropic.ts`/`retryPolicy.ts` (edge-fn, redeploy).
- **6b — should the SHA hash the EVALUATED runtime string instead of raw source?** Trade-off:
  - *Raw source (today):* deterministic, simple, catches every source edit. But it hashes
    escape sequences (`\n`, `\``), not the bytes the model actually receives, and the
    "mirrors runtime byte-for-byte" comment is therefore aspirational.
    - *Evaluated runtime:* import the constants + run the real `composeLegalContext('bayern')`
    and hash THAT — a true fingerprint of the persona prompt. Costs a tsx/ESM import in the
    gate (heavier than a file read) and another one-time re-baseline.
  **Recommendation:** worth doing (it's the *correct* fingerprint and closes the readBlock
  class entirely), but it's a guard-infra change + re-baseline — your call. I did NOT auto-wire it.

## Phase 6a — NOT done (awaiting two confirmations)

Wiring `audit:four-class` into prebuild as a standing gate is **blocked on**:
1. **Your precondition:** confirm the **MV live walk** passed (persona emits the CLASS-2
   reader keys in the PDF Key Data). I do **not** have that confirmation — the offline sweep
   *cannot* observe live emission, so CLASS 2 = 0 means "no orphan reader-key", **not**
   "confirmed captured". I will not wire the gate over an unconfirmed CLASS 2.
2. Your explicit go.

When wired, the gate logic must: **fail on any new RED**, and **allow-list the 2 known-accepted
CLASS-3 YELLOW** (below) + the CLASS-2 INFO caveat so they don't block every build — a NEW
finding fails, a known-accepted one does not.

## What STILL needs a human walk (the sweep's permanent blind spots — be explicit)

- **CLASS 2 live emission.** The Phase-3 directive is deployed (chat-turn v13, verified in the
  live bundle), but only a live walk confirms the model *emits* `eingriff_tragende_teile` etc.
  in the PDF Key Data. **This is the open precondition for 6a.**
- **Corpus-correct ≠ concept-correct.** CLASS 4 confirms a § exists; it cannot judge whether
  it's the *right* § for the concept (that's `verify:concept-citations` + a human).
- **Out-of-corpus §§ are acknowledged, not checked.** BayDSchG/StPlS/BauuntPrüfVO/DSchG/LBOVVO
  are registered + justified but not existence-checkable until ingested (deferred).
- **PDF/React rendering** isn't pixel-tested by the sweep; `smoke:pdf-matrix` + a walk own that.

## Remaining deferred / accepted (with reasoning)

- **CLASS 3 ×2 (the 2 residual YELLOW):** (a) `extractProcedureCitation` no-space edge ("§62BauO")
  — rare; the §-comparison handles the common spaced forms. (b) `roleFunction` title-keyword
  classification — *inherent* to title-based dedup (an unrecognised synonym falls back to
  *distinct*, which is safe). Both accepted, not bugs.
- **PDF procedure-aware timeline** (5b follow-up) — the PDF duration string + Gantt are
  procedure-agnostic (common-case-consistent); a ~10-line threading of the helper figure.
- **Out-of-corpus ingestion** (CLASS 4) — own data sprint.
- **5c GK capture, 5d retry-budget, 6b evaluated-SHA** — above.

## Gates (every phase, all green; final on `fix/campaign-final`)
tsc --noEmit · tsc -b · npm run build (293.7/300) · verify:citations:strict · audit-heading-match ·
audit:allowlist · verify:concept-citations · smoke:citations 221/221 · smoke:pdf-matrix 16/16 ·
smoke:pdf-text 386/0 · smoke:thin-state · smoke:double-submit · smoke:cost-procedure 9/0 ·
audit:four-class 0 RED. **Bayern SHA `f9743ff3` MATCH start AND end of every phase.**
