# Thin-State Propagation Sprint — 2026-06-09

Branch: `fix/thin-state-propagation` (off `main`). **NOT merged, NOT deployed** — awaiting your confirmation.
Bayern composed-prefix SHA `ed6f109e…b9d746` — **MATCHED at start AND end** (no re-baseline).

Triggered by the MV/Rostock T-03 (renovation, load-bearing wall + Unterzug) thin-state walk.

---

## P0 — Root cause (investigated before any fix)

**The persona's verdict reached the resolver; the resolver overwrote it.** This is a
**frontend resolver gap**, not a persona-emission gap.

The "Standard building permit · § 64 LBauO M-V · LEGAL·ASSUMED" the deliverable showed
matches exactly **one** code path: the generic fallback in `src/legal/resolveProcedure.ts`
(lines 559-594) — `kind:'standard'`, `citation: reg.citation` (=§64), `confidence:'ASSUMED'`.
No other path produces that triple (`deriveBaselineProcedure(sanierung)` → simplified §63·CALCULATED;
`procedureFromDecision` → CALCULATED). So the walk fell through to that generic branch.

Why it fell through: **`resolveProcedure` has a real renovation decision tree for NRW only**
(`resolveNrwSanierung`, gated at line 482). Every *other* state's `sanierung` is handled only by
the keyword branches — which honor a verdict **only when its free text literally contains**
"vereinfacht" / "verfahrensfrei" / "regulär". A verdict captured as a **citation** ("§ 63 LBauO M-V")
or implied by `eingriff_tragende_teile=true` with no keyword matches **none** of them, so it skips
to the generic fallback → regular §64 · ASSUMED, silently overwriting the persona's §63. The
substantive BW walk worked only because its verdict text happened to contain the keyword "vereinfacht"
(§ 52). `eingriff_tragende_teile=true` is read only by the NRW tree, so it never drove the procedure
(or the specialist) for any other state.

**Verdict: resolver-side (frontend). `resolveProcedure` is not imported by any edge function.**
So **all three fixes below are frontend — no `supabase functions deploy chat-turn` needed.**

---

## Fixes

### P1 — state-agnostic `sanierung` branch in `resolveProcedure` (procedure propagation)

`src/legal/resolveProcedure.ts` — added a `sanierung` branch (mirroring the existing `umnutzung`
branch / `deriveBaselineProcedure(sanierung→simplified)`), placed **after** the hard-blocker,
Sonderbau, verfahrensfrei/vereinfacht/regular keyword, and NRW branches, and **before** the generic
standard-§64-ASSUMED fallback. A non-NRW renovation that cleared the blocker + Sonderbau gates now
resolves to the **simplified** procedure (§ 63 LBauO M-V etc.) at **CALCULATED**, with the
structural-intervention fact reflected in the rationale when present. Covers **all 11 thin states in
one pass** (no MV special-case). Explicit verdicts still win (the keyword branches run first), so a
persona that *did* state verfahrensfrei / regular is never downgraded.

Functionally proven (`smoke:thin-state`): all 11 thin states' sanierung → `vereinfachtes`·CALCULATED
citing the simplified § (was `standard`·ASSUMED §64); BW § 52 keyword verdict still propagates; the
Sonderbau gate (→ standard), hard blocker (→ bauvoranfrage), and verfahrensfrei verdict still win.

### P2 — structural engineer NEEDED from the captured fact (`resolveRoles`)

`src/features/result/lib/resolveRoles.ts` — `resolveRoles` never read facts, so a thin-state persona
role emitted with `needed:false` ("Required only if load-bearing elements are affected") silently
overrode the captured `eingriff_tragende_teile=true`. Now it reads the **same** canonical fact the
procedure resolver uses (`buildProcedureCase(...).eingriff_tragende_teile`) — so procedure and
specialist can never disagree — and when set, restores the baseline structural role (`needed:true`,
intervention-correct rationale), replacing a contradicting `needed:false` role or appending it if
absent. Covers all states. No over-force when the fact is absent/false.

### Cleanup — Legal-landscape "permit procedure" row cited the form §

`src/features/result/lib/composeLegalDomains.ts` — the procedure row used `permitFormCitation`, which
for MV/SH/Sachsen/Berlin is **§ 68 ("Bauantrag, Bauvorlagen" — the application form)** and for RLP
§ 63 (also the form), labelling the form § as "permit procedure". It now cites the **procedure** § from
the localization pack (simplified, then regular), so MV shows **§ 63** (consistent with the Procedure
tab + P1), not § 68. Verified across MV/SH/Sachsen/Berlin/RLP.

Concept-mapping check for the other thin states: `verify:concept-citations` (now covering the
corpus-backed thin states, all `isSubstantive`) passes — § 65 LBauO M-V = Bauvorlageberechtigung,
§ 68 = the form, §§ 63/64 = the procedures, all correctly distinguished.

---

## Edge-function redeploy

| Fix | File | In edge-fn graph? | Redeploy |
|---|---|---|---|
| P1 procedure | `src/legal/resolveProcedure.ts` | **No** (verified — result-layer only) | No |
| P2 specialist | `src/features/result/lib/resolveRoles.ts` | No | No |
| Cleanup label | `src/features/result/lib/composeLegalDomains.ts` | No | No |

**No `supabase functions deploy chat-turn` required this sprint.** All three fixes ride the Vercel
frontend deploy on merge. (The persona-emission contract — SHARED Rule 12 — was reviewed and is
correct/universal; the deterministic resolver fixes make the result correct regardless of whether the
thin-state persona emits a structured `procedures_delta` or just the verdict fact, so no persona
change is needed.)

---

## Gates (all green on `fix/thin-state-propagation`)

- `tsc --noEmit` ✅ · `tsc -b` ✅ · full `prebuild` chain ✅
- `verify:citations:strict` ✅ · `audit:allowlist` ✅ (540, 0 blocking) · `verify:concept-citations` ✅
- `audit-heading-match.mts` ✅ (no semantic mismatches)
- `smoke:citations` ✅ 221/221 · `smoke:pdf-matrix` ✅ 16/16 · `smoke:pdf-text` ✅ 386/0
- **`smoke:thin-state` ✅ 56/56** (new — procedure propagation × 11 thin states, substantive § 52 pin, specialist force, label cleanup)
- **Bayern SHA `ed6f109e…` — MATCH at start AND end**

---

## Confirmed wins NOT regressed (re-checked)

P1 cost agreement, P3 double-submit, P0 firewall suffix-canonicalization, § 48 GEG renovation path,
asbestos-on-pre-1995, GK-unchanged framing, zero deep-state bleed, thin-state preliminary banner, and
**substantive-state procedure propagation (BW § 52)** — pinned in `smoke:thin-state`.

---

## Explicitly deferred (out of scope this sprint — separate commits later)

- **Timeline divergence** (executive "~6 months" vs Gantt ≈22 weeks vs header "4–6 months") — re-touches
  the 386-assertion `smoke:pdf-text`; its own sprint.
- **GK / Building-class capture for thin states** — MV showed honest "not recorded" behind the
  preliminary banner; acceptable, not a bug this sprint.
- **Out-of-corpus existence-checking for procedure-ordinances / monument law** (BauVorlVO, DSchG,
  LBOVVO) — last sprint's documented gap (e.g. RLP `§ 5 BauuntPrüfVO` remains heading-unverifiable);
  its own sprint.

These are confirmed-real and intentionally not bundled.

---

## Commits on `fix/thin-state-propagation`

```
(P1)  fix(thin-state): state-agnostic sanierung branch in resolveProcedure — §63 propagates to all 11 thin states
(P2)  fix(thin-state): force structural engineer NEEDED from captured eingriff_tragende_teile
(cleanup+test) fix(thin-state): Legal-landscape procedure row cites the procedure § (not the form §68) + smoke + doc
```
