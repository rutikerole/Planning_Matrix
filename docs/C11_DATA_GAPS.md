# C11 — DATA GAPS (UNVERIFIED findings surfaced by the 16-state PDF matrix)

**Created:** 2026-05-24 · **Sprint:** v1.0.26 (C11) · **HEAD at creation:** `7c211a0`
**Gate:** `npm run smoke:pdf-matrix` (`scripts/smoke-pdf-matrix.mts`)
**Bayern SHA:** `b18d3f7f9a6fe238c18cec5361d30ea3a547e46b1ef2b16a1e74c533aacb3471` MATCH

---

## MATRIX VERDICT — 16/16 GREEN (no source fabrication found)

The 16-state matrix renders one plain-residential T-01 fixture per Bundesland
(+ `bayern-t03-verified.json` as the canonical Bayern cell) × DE/EN and asserts:
no fabricated `§ NN BauO {code}` citation, no Bayern-leak token in non-Bayern
PDFs, DE/EN section-header parity, no ligature corruption, a real §/Art. for
substantive states, and honest "in Vorbereitung" framing for stubs.

**All 16 states pass, both locales.** This empirically confirms the v1.0.25
Bug 26 fix (three render sources — `resolveProcedure` generic branch, the
Executive footer, the structural cost-item — all driven off
`getStateLocalization`) generalizes to the **13 states that previously had zero
automated PDF coverage**, not just Sachsen + Brandenburg.

### Guard teeth (proven, not vacuous)
The fabrication + leak regexes were unit-tested against known-bad and known-good
strings: they **fire** on `§ 65 BauO SACHSEN`, `§ 65 BauO Sachsen`, bare
`BauO BERLIN`, and `München`; they **do not fire** on the legitimate `§ 64 BauO
NRW`, `§ 58 LBO`, `§ 64 NBauO`, `BayBO`, nor the honest glossary term
`BauO Sachsen · Bauordnung`.

### One harness false-positive (resolved in C2, not a source bug)
The first matrix run flagged a proper-case `BauO {Land}` token in every stub
PDF. Root cause: `src/features/chat/lib/pdfSections/glossary.ts:114-128`
intentionally renders stub states as the glossary **term** `BauO {Land} ·
Bauordnung` with the definition *"Landesbauordnung {Land} — §§ noch nicht
hinterlegt … mit Architektenkammer abklären"* / *"… §§ not yet wired … verify
with the {Land} Architektenkammer"*. This is the **Bug O honest-disclosure
gloss** (no fabricated §), and `scripts/smoke-pdf-text.mts:834` already asserts
`BauO Berlin` *present* as a positive signal. The matrix assertion was narrowed
to the genuine Bug-26 fabrication class (`§ NN BauO {code}`, NRW carved out);
the honest glossary term is correctly allowed. **No source change.**

---

## DEFERRED DATA GAPS — consciously NOT gated by the matrix

The matrix gates the **deterministic PDF render surface** (citations, leaks,
parity, ligatures). The following are **data-completeness** gaps that cannot be
gated without authoritative sourced data, and that the established product
posture (no fabrication; honest "in Vorbereitung" framing) deliberately leaves
open. Recorded here as UNVERIFIED so they are not mistaken for closed.

### GAP-1 — Bug 27: München authority calendar applied to all 16 states
- **Where:** `src/features/result/lib/composeCalendar.ts:1-4,47` imports
  `MUENCHEN_AUTHORITY_CLOSURES` from `src/data/muenchenAuthorityCalendar.ts:27`
  and applies it for **every** Bundesland (no `bundesland` parameter).
- **Leak status:** **Not a Bayern brand-token leak.** The closure labels are
  generic — *"the Bauamt's Christmas closure (Dec 22 – Jan 8)"* /
  *"Weihnachtsschließung des Bauamts"* and *"summer staffing reduction"*
  (`muenchenAuthorityCalendar.ts:35-46`). They contain **no `München` token** at
  any date, so the matrix's München guard correctly does not fire. Verified by
  reading both closure windows (Christmas + summer).
- **Actual gap:** the closure **dates** are München-specific but presented as
  generic "Bauamt" timing on, e.g., a Kiel or Frankfurt project. This is
  **wrong/missing per-state data**, not a fabricated authority name.
- **Why deferred:** a correct fix needs per-state authority closure calendars
  (sourced data). Out of C11 scope (deterministic-render hardening). Tracked as
  **Bug 27** in `docs/FULL_GERMANY_AUDIT.md`. **No fabrication shipped.**
- **Per Decision 1(b):** documented + deferred. Decision 1(a) (stop-the-leak)
  does **not** apply — there is no Bayern token to stop.

### GAP-2 — stub-state legal codes are generic placeholders (11 states)
- **Where:** `src/legal/stateLocalization.ts:347-397` (`makeStub`) +
  `src/features/chat/lib/pdfSections/glossary.ts:114-128`.
- **Gap:** the 11 stub states render generic descriptors — `BauO {Land}`,
  `Architektenkammer {Land}`, `Landesamt für Denkmalpflege {Land}` — instead of
  the real short codes (SächsBO, BbgBO, ThürBO, BauO LSA, LBauO RLP, LBO
  Saarland, LBO SH, LBauO M-V, BauO Bln, HBauO, BremLBO) and the real chamber /
  monument-authority names.
- **Honesty:** **honest by disclosure.** Every stub surface explicitly states
  the §§ are *"noch nicht hinterlegt"* / *"not yet wired"* and routes the user to
  verify with the authority. No fabricated § numbers, articles, or specific
  acronyms — only generic, visibly-incomplete placeholders
  (`stateLocalization.ts:15-17,344-346`).
- **Why deferred:** promoting a stub to substantive needs source-cited per-state
  §§ + chamber names + validation evidence (the Phase-12 process used for NRW /
  BW / Hessen / Niedersachsen). See `BACKLOG.md` ("move the state from `makeStub`
  to a named substantive pack"). **No fabrication shipped.**
- **Matrix coverage:** the matrix **gates** that no stub ever upgrades the
  generic placeholder into a fabricated `§ NN BauO {Land}` citation.

### GAP-3 — Bug 35 / Bug I: cost multiplier not state-differentiated
- **Where:** `src/features/result/lib/costNormsMuenchen.ts` (`detectProcedure`
  is a Bayern-only regex → returns `unknown` for non-Bayern; `REGION_MULT` has
  no sourced per-state values).
- **Gap:** the cost **number** is not regionally differentiated for non-Bayern
  states.
- **Honesty:** the cost-basis label is already the honest baseline framing
  (*"German baseline (regional variance ±10%; state-specific BKI adjustment in
  preparation)"* — `stateLocalization.ts:111-112,388-391`, Bug I Path B), so the
  PDF makes **no false regional-precision claim**. The matrix verifies no
  fabricated token here; it does **not** assert cost-number correctness (needs
  sourced BKI data — Bug I Path A, `BACKLOG.md`).
- **Why deferred:** needs authoritative per-state BKI factors + validation
  against real architect quotes. **No fabrication shipped.**

---

## SUMMARY

| ID | Area | Leak? | Fabrication? | Status |
|----|------|-------|--------------|--------|
| — | Bug 26 fabrication (16 states) | no | no | **CLOSED — matrix-gated** |
| GAP-1 | Bug 27 München calendar | no | no (generic label) | deferred — needs sourced per-state calendars |
| GAP-2 | Stub legal codes (11 states) | no | no (honest placeholder) | deferred — needs sourced per-state §§ |
| GAP-3 | Bug 35/I cost multiplier | no | no (honest baseline label) | deferred — needs sourced BKI data |

**No fabrication ships in any of the 16 states.** The three open gaps are
data-completeness items, each honestly disclosed in-product, each requiring
sourced data to close — never invented content.
