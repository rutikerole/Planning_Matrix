# NEXT_MOVE.md

> **Superseded — see `PHASE_ROADMAP.md`. Frame correction: client deliverable, AI-proxy testing only.**
>
> The recommendation below assumed Planning Matrix was a product seeking PMF and proposed end-to-end user testing. That framing was wrong: the project is a deliverable for the v1.5 architecture document's manager, validated via smokeWalk + audit + persona drift, never via end-user testing. Retained here as an archived reasoning trace; do not act on it.

## 1. Recommendation

**Run a 5-session end-to-end user test of the München product before
any further engineering (Candidate H).** Two-week time-box; first
deliverable is a written protocol, not code. We have shipped through
Phase 10.1 without one documented user session — every engineering
move from here is a guess about which audit finding actually bites
real Bauherren or Bauvorlageberechtigte.

## 2. Why this, not the others

- **The audit's user-visible correctness bugs are now closed.**
  B02 (VOID seed) and B01 + B03 (Bundesland firewall + deep scan)
  landed in the last batch. The remaining audit items are
  architectural or internal: B04 symbolic, B05/B06 internal qualifier
  propagation, B10 tracer observability, B11 effectively closed by the
  Task-1 full-state seed. Polishing them buys the product nothing if a
  real Bauherr abandons the wizard at I-02 or doesn't understand
  `completion_signal: needs_designer`.
- **Candidate A (Phase 11) scales an unvalidated product.** Per the
  audit's §14 honest read, the per-state slice is closer to 150–250 LOC
  than the 80 LOC the brief assumed. Investing 4–6 weeks before we
  know München is correct will produce a multi-Bundesland framework
  on top of primitives we may need to redesign post-tester-feedback.
  We will rebuild more than we built.
- **Candidate B (DESIGNER 13a) is defensive code without a UX.** The
  memo I just wrote called it "symbolic without an architect logging
  in" and explicitly said B's priority hinges on telemetry we don't
  have. User testing is the cheapest way to discover whether
  DESIGNER+VERIFIED is even a 2026-Q3 problem.
- **The §16 mediums (B12 rate-limit UX, dedup, plausibility-on-DECIDED,
  etc.) are real but mostly invisible.** Fixing them without user
  evidence is exactly the "perfection on architecture" trap the brief
  warns against. Three of those bugs were already silent for weeks
  before the audit found them; one more sprint is fine.
- **Candidate D (atelier-mode shadow cleanup + brief update)** is the
  one move worth doing in parallel — half a day, makes the product
  visually coherent before testers see it, no architectural risk.
  Treat it as polish-before-recording, not as the move.

## 3. Concrete first commit

`docs/USER_TEST_PROTOCOL.md` (new file). One page. Cohort target
(3 Bauherren laypeople + 2 bauvorlageberechtigte Architekt:innen, all
München projects), three template fixtures (T-03 Sanierung, T-01
Neubau EFH, T-06 Aufstockung — the three highest-shipped templates
that exercise the most prompt logic), 60–90-min talk-aloud format
with screen recording, and a per-session friction rubric covering
the four product surfaces in order: wizard → chat workspace → Spine
top-3 → result page briefing hand-off. The first session is the
hardest to schedule; the protocol de-risks every subsequent one and
makes "what we learned" comparable across testers.

## 4. What I'd avoid right now and why

Do not start Phase 11, do not start DESIGNER 13a, and do not sweep
the §16 medium bugs one by one. The pattern in all three is the same:
each one is rationally defensible in isolation but jointly assumes
the München product is already correct. We do not know that. The audit
was top-down spec-compliance; user testing is bottom-up "what actually
breaks." If a tester says the wizard's I-01 sketch grid is incoherent,
or that the Spine doesn't communicate progress, or that the briefing
PDF reads wrong — those findings dominate the audit's prioritisation
and would invalidate work in flight. The cheapest two weeks the project
can spend right now is the two it has not yet spent on a real user.

## 5. Open questions for Rutik before I start

- **Cohort recruiting.** Can you bring 3 Bauherren + 2 Architekt:innen
  with active München projects within 2 weeks, or do we need a
  recruiting partner / paid panel? This is the hardest dependency
  and the only one that can push the time-box.
- **Test fixtures — own project or seeded?** Real own-project gives
  authenticity but loses cross-tester comparability; seeded fixtures
  (we provide address + intent) give signal density. My default is
  seeded for the Bauherren, real for the Architekt:innen — but you
  may have a stronger view from prior demos.
- **Failure budget.** If testing surfaces a structural product issue
  (e.g., "the seven specialists confuse rather than reassure", or
  "the Spine reads as decorative not functional"), are you open to
  delaying Phase 11 by 4–6 weeks for a redesign, or does the roadmap
  stay regardless? The answer changes how aggressively I document
  observed issues.
