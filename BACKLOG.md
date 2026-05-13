# Backlog — v1.0.23+

> v1.0.22 Data Integrity Sprint closed Bugs C, F, K, Q, B, I. The
> sections below reflect the remaining post-v1.0.20 findings.
> The v1.0.21 Bundesland Truth Sprint closed Bugs 23-PRIME, 23, 23b,
> 23c, 23d, E, M before this sprint.

# Backlog — v1.0.23+ (legacy section header retained for context)

Bugs identified during the v1.0.20 NRW × T-01 Königsallee 30 and
Berlin × T-01 Pariser Platz 1 test cells that are NOT closed by the
v1.0.21 Bundesland Truth Sprint. Logged here so v1.0.22+ can pick
them up with the same discipline (Bayern SHA invariant, 5 daily gates
per commit, fixture per bug).

Sprint anchor reminder:
- Bayern composeLegalContext SHA
  `b18d3f7f9a6fe238c18cec5361d30ea3a547e46b1ef2b16a1e74c533aacb3471`
  must MATCH at start AND end of every commit in any future sprint.

## v1.0.20 smoke walk — remaining 11 deferred bugs (after v1.0.21 + v1.0.22)

### Data correctness

- **Bug D** — Address parser accepts blob input. The wizard's
  Adress-Eingabe accepts "Pariser Platz 1, 10117 Berlin" as a single
  blob but does not split into street / Hausnummer / PLZ / Stadt
  components consistently; downstream PLZ-district resolution can
  silently fail. Tighten the input parser; require structured fields.
- **Bug G** — Karl-Marx-Allee vs Mathilde-Jacob-Platz inconsistency
  in Berlin. The Berlin address autocomplete suggested
  "Mathilde-Jacob-Platz" but the persona used "Karl-Marx-Allee" in
  one response. Persona prompt needs an address-consistency rule.
- **Bug H** — § 64 vs § 65 BauO Berlin internal inconsistency. The
  Berlin systemBlock cites both § 64 and § 65 as the standard
  Bauantrag § in different places. Verify against current BauO Bln
  text and pick one.
- **Bug L** — "0 m² Fassade" placeholder. When fassadenflaeche_m2
  is unset the Key Data row renders literal "0 m² Fassade" instead
  of a "—" placeholder. Fix the value formatter.
- **Bug N** — Outside-Munich Acknowledged flag leaking. Some
  Bayern-state-localization paths still emit an "outside Munich
  acknowledged" badge on non-München Bayern projects. Audit the
  flag's emission sites.

### UI / UX

- **Bug J** — Coverage banner gating. The "this PDF is valid for 30
  days" cover banner shows on every export, including for projects
  with verified DESIGNER signatures where the 30-day gate is moot.
  Gate the banner on qualifier mix.
- **Bug O** — Glossary page not state-aware. Cites BayBO / BLfD /
  StPlS 926 in the glossary entries regardless of project
  bundesland. Apply the same state-aware refactor pattern as
  v1.0.21 to `src/features/chat/lib/pdfSections/glossary.ts`.
- **Bug P** — Label width truncation. Long Bundesland labels
  ("Nordrhein-Westfalen", "Mecklenburg-Vorpommern") truncate in the
  cover meta line. Allow two-line wrap or shorter labels.
- **Bug R** — DESIGNER actor without designer in loop. The Top-3
  card on a project with no invited designer still occasionally
  shows a DESIGNER-source recommendation. v1.0.16 Bug 32 normalized
  DESIGNER+ASSUMED → LEGAL+CALCULATED, but other DESIGNER+quality
  combinations slip through.
- **Bug S** — Mixed EN/DE field labels in qualifier table. On the
  EN PDF, some Key Data field labels render in German
  ("Gebäudeklasse", "Energiestandard") because the label resolver
  has incomplete coverage in factLabels.en.ts.

### v1.0.22 follow-ups

- **Bug K root-cause** — the v1.0.22 runtime guard
  (`sanitizeGermanContentOnEnglish`) catches persona-emitted German
  content on EN export and renders an honest placeholder. The
  root-cause fix is a "respect lang context" instruction in the
  chat-turn persona prompt, which lives in
  `supabase/functions/chat-turn/*` outside the smoke-pdf-text scope.
  Land in v1.0.23 or a dedicated chat-side sprint, with empirical
  validation that no Bayern fixture is regressed.
- **Bug Q write-time gate extension** — v1.0.22 added a read-time
  normalization (in `getQualifierLabel`) so CLIENT+VERIFIED can never
  render. The write-time gate
  (`src/lib/projectStateHelpers.ts:gateQualifiersByRole`) currently
  catches only DESIGNER+VERIFIED — extend it to also block
  CLIENT/USER/BAUHERR + VERIFIED at chat-turn boundary, with
  empirical validation against the chat-turn fixtures.
- **Bug I Path A wire-up** — the v1.0.22 honest-baseline framing is
  Path B per the sprint spec recommendation. Path A (real
  state-keyed BKI factors) lands when authoritative source-cited
  per-state values + validation evidence against real architect
  quotes are available. Replace REGION_MULT with the populated
  table; revert pdfStrings + costFactorLabel + docs/cost-formula.md
  to "regional factor documented" content.

### Carry-forward from earlier sprints

- **Bug 17** [P2] team-tab Bayern hardcodes (chat-layer). Logged in
  v1.0.14 backlog; the chat-layer team-tab references still include
  Bayern hardcodes (the result-page Team tab is now state-aware as
  of v1.0.21 Bug 23, but the chat-layer suggestion chips are not).
- **Bug 20** [P2] procedure-tab caveat audit (chat-layer). Logged in
  v1.0.14 backlog; the procedure-tab caveat wording is not yet
  audited for state-awareness. v1.0.21 closed the PDF surface for
  this (Bug E), but the in-chat caveat copy is a separate surface.
- **Vorhabensbeschreibung section** — Logged in v1.0.20 backlog.
  Formal project description that mirrors the §-format Bauantrag
  uses.
- **Risk Register Section XII** — Logged in v1.0.20 backlog. PDF
  section that surfaces the composeRisks output as a dedicated page
  with mitigation columns. v1.0.21 closed the cross-state leak in
  the data; the rendering surface is still pending.
- **KfW BEG 458** — Logged in v1.0.20 backlog. Funding-program
  specifics for BEG-458 + § 35c EStG + iSFP-Bonus.
- **Bebauungsplan ID / Flurstück / Gebäudeklasse fields** — Logged
  in v1.0.20 backlog. Three first-class identity fields that move
  Area A's qualifier from ASSUMED → CALCULATED.

## Notes for the next sprint

- The runtime cross-state bleed guard
  (`src/legal/crossStateBleedGuard.ts`) is a belt-and-braces fallback.
  If a future commit introduces a new state-unique token leak, add
  the token to `TOKENS` AND fix the upstream source — do not rely on
  the guard alone.
- The `stateCitations.ts` substantive packs (Bayern / NRW / BW /
  Hessen / Niedersachsen) carry verified §§. The stub packs use
  honest-deferral phrases. When v1.0.22+ verifies a new state's
  citations, move the state from `makeStub` to a named
  substantive pack with `isSubstantive: true`.
- The Bayern SHA invariant (`b18d3f7f...3471`) must MATCH at start
  AND end of every commit. v1.0.21 was clean on this every commit.
