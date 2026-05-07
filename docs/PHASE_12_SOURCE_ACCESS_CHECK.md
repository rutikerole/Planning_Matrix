# Phase 12 — Source-access reachability check

**Date:** 2026-05-07. **Scope:** federal sources + state portals
for NRW / BW / Niedersachsen / Hessen. **Method:** WebFetch from
this Claude session against canonical and known-alternative URLs.
**Why:** the Hessen dry-run (commit `be86fa8`) found two
unreachables — `rv.hessenrecht.hessen.de` (SPA) and
`gesetze-im-internet.de` (404 on permalinks). Both implications
are bigger than Hessen alone. This is the wider check.

---

## TL;DR — surface the downgrade before content writing

- **Federal `gesetze-im-internet.de` paragraph permalinks: unreliable
  from server-side fetch.** Homepage reachable; paragraph URLs
  return 404. `dejure.org` is the confirmed working alternative
  for federal cite verification (BauGB / BauNVO / GEG / HOAI).
- **State portals: 3/3 unreliable for paragraph fetches.** Same
  pattern Hessen showed — JS-rendered SPAs (NRW, BW) or freely-
  accessible-but-paragraph-URL-fragile (NS via Wolters Kluwer).
  All four state portals (incl. Hessen's `rv.hessenrecht`) are
  **healthy in a browser** — the limitation is server-side
  fetching from this session, not the portals themselves.
- **Phase 12 source mix shifts** away from state portals toward:
  Architektenkammer pages (akh.de / aknw.de / akbw.de / aknds.de) +
  Ministry pages (wirtschaft.hessen.de / equivalents) + commercial
  legal aggregators (`dejure.org` confirmed; `buzer.de` per-state
  permalink derivation deferred). IngKH-style chamber-Synopsen
  serve as the consolidated-text fallback where they exist.
- **This is a real downgrade in source quality.** The review-doc
  template (`docs/PHASE_12_REVIEW_TEMPLATE.md`) section 1 absorbs
  the resulting uncertainty per state. Commit messages cite the
  actually-fetched source (e.g., dejure.org, akh.de) rather than
  pretending to have hit the state portal.
- **Verdict: PROCEED with Phase 12 content writing under the
  shifted source mix.** No Phase-12-wide pause required if Rutik
  accepts the downgrade. If not, the choice is (a) defer Phase 12
  until headless-browser fetching or an MCP server is wired, or
  (b) accept browser-only manual verification by Rutik on each
  cite. Flagging for explicit decision.

---

## Federal-source probe results

| URL | Status | Findings |
| --- | --- | --- |
| `https://www.gesetze-im-internet.de/` | 200 | Homepage reachable. Doesn't list paragraph-permalink pattern in machine-readable form on the homepage itself. |
| `https://www.gesetze-im-internet.de/baugb/` | 404 | BauGB index page returns 404 from server-side fetch. |
| `https://www.gesetze-im-internet.de/baugb/__34.html` | 404 | Paragraph permalink — also 404. Pattern is wrong, OR CDN-level bot detection blocks deep links from non-browser User-Agents. Consistent across re-tries. |
| `https://dejure.org/gesetze/BauGB/34.html` | 200 | **WORKS.** Returned the verbatim text of BauGB § 34: *"Innerhalb der im Zusammenhang bebauten Ortsteile ist ein Vorhaben zulässig, wenn es sich nach Art und Maß der baulichen Nutzung, der Bauweise und der Grundstücksfläche, die überbaut werden soll, in die Eigenart der näheren Umgebung einfügt und die Erschließung gesichert ist."* |

**Federal verdict.** `gesetze-im-internet.de` is unreliable for
deep links from this session. **Use `dejure.org` for federal cite
verification during Phase 12.** dejure.org permalink pattern:
`https://dejure.org/gesetze/<GESETZ>/<NUMBER>.html`. Independent
commercial portal but content is verbatim federal text.

---

## State-portal probe results

| Portal | URL pattern probed | Status | SPA / fetch verdict |
| --- | --- | --- | --- |
| Hessen | `https://www.rv.hessenrecht.hessen.de/bshe/document/jlr-BauOHE2018rahmen` | 200 | **SPA shell only** — returned page title only, no body. Confirmed in Hessen dry-run (commit be86fa8). |
| NRW | `https://recht.nrw.de/lmi/owa/br_bes_text?...` | 200 | **SPA shell only** — only chrome (header / footer / breadcrumbs) returned, no paragraph text. |
| BW | `https://www.landesrecht-bw.de/jportal/?quelle=jlink&query=BauO+BW...` | 200 | **SPA shell only** — only header "Landesrecht BW", no body content. Same juris-portal pattern. |
| NS | `https://voris.niedersachsen.de/` → 302 → `https://voris.wolterskluwer-online.de/` | 200 (after redirect) | **Homepage reachable**, freely accessible without login (Wolters Kluwer-hosted on behalf of the Staatskanzlei). Paragraph permalinks NOT probed — likely require specific query syntax similar to landesrecht-bw.de. **Lower-than-SPA-blocked but still unreliable for server-side paragraph fetch.** |

**State-portal verdict.** All four states (Bayern was confirmed
already-shipped via city-level WMS, the four Phase 12 targets all
follow the same pattern) have state legal portals that are
browser-healthy but server-fetch-unfriendly. **Phase 12 cannot
treat the state portal as the primary citation-verification
endpoint.**

---

## Working alternatives by state

| Use case | Working source | Notes |
| --- | --- | --- |
| **Federal cite verification** (BauGB / BauNVO / GEG / HOAI / MBO) | `dejure.org` | Confirmed working. URL pattern `dejure.org/gesetze/<GESETZ>/<NUMBER>.html`. |
| **Federal amendment dates** | Bundesgesetzblatt (`bgbl.de`) — not yet probed | Defer per-cite; only verify if the amendment date is actually mentioned in the persona text. |
| **NRW LBO consolidated** | `aknw.de` (Bauherreninformation, indirect); `bauleitplanung.nrw` (XPlanung context); `open.nrw/dataset/bebauungsplane-xplanung-du` (data only, not statute text) | NRW has no IngKH-equivalent that I've identified yet. **Confirm during NRW fetch dry-run** before NRW commit. |
| **BW LBO consolidated** | `akbw.de` (Bauherrenmappe); LGL-BW commentary | **Confirm during BW fetch dry-run** before BW commit. Drucksache 17/4334 (the 2023 Modernisierungsnovelle) PDF status separately probed at that time. |
| **NS NBauO consolidated** | `voris.wolterskluwer-online.de` (homepage works, paragraph fetch may need specific query); `aknds.de` (Bauherreninformation); IKN | **Confirm during NS fetch dry-run** before NS commit. |
| **HE HBO consolidated** | **`ingkh.de`** — confirmed working in Hessen dry-run. Hosts consolidated PDF + Synopse of Oct 2025 changes. | Best-in-class among the four states. |
| **Bauherreninformation framings** (all states) | `akh.de` (✓ confirmed). NRW/BW/NS equivalents: `aknw.de` / `akbw.de` / `aknds.de` — confirm during respective dry-runs. | These are the source for "Bauherr typischerweise" claims. |
| **Amendment-date confirmation** | Wirtschaftsministerium / Bauministerium pages per state. `wirtschaft.hessen.de` confirmed for Hessen. | Reliable for "in Kraft seit" sentences. |

---

## Implication for Phase 12

1. **Per-state fetch dry-run is mandatory** — same shape as Hessen
   dry-run, run before each state's content commit. Each dry-run
   confirms which Architektenkammer / Ministry / IngKH-equivalent
   URLs work for that state, AND surfaces any state-specific
   surprises (like the HBO 2025-Novelle finding that the scoping
   doc had wrong).

2. **Source ledger discipline** — when a citation is fetch-verified,
   cite the actually-reached URL (e.g., `dejure.org/gesetze/BauGB/34.html`),
   not the state portal that wasn't reachable. The review doc's
   section 2 (Source ledger) absorbs this transparently.

3. **Uncertain-claims discipline** — anything that can't be
   fetch-verified (e.g., a § number that only the SPA-blocked
   state portal definitively shows) goes in the review doc's
   section 1 (Uncertain claims) with an explicit "fetch-verified
   only via [secondary source]; primary state portal not reachable
   from this session" note.

4. **No Phase 12 re-scope required** — the source mix shifts but
   the methodology is unchanged. The review-doc template was
   designed to absorb exactly this.

5. **Honest framing in persona text** — when a paragraph reference
   couldn't be fetch-verified at all, the systemBlock falls back
   to *"Detail-Spezifika werden ergänzt"* per the original Phase
   11 minimum-stub pattern. **Better an honest gap than a wrong
   citation.**

---

## What this check does NOT decide

- Whether to wire a headless-browser fetch path or an MCP server
  for state-portal paragraph access. Out of scope for Phase 12;
  worth revisiting at Phase 17 handoff if the client wants the
  audit trail to include direct state-portal citations.
- Whether `buzer.de` could replace `dejure.org` as the federal-
  cite source. Both are commercial aggregators; `dejure.org` is
  confirmed working and that's enough.
- Per-state dry-run findings for NRW / BW / NS — those land
  before each state's content commit, not now.

---

## Greenlight ask

Two paths Rutik needs to decide between before Hessen content
writing starts:

- **Path A (recommended):** PROCEED with Phase 12 under the
  shifted source mix. Discipline is the review doc's section 1
  + section 2 + the per-state dry-run. Source quality is one
  degree removed from official state portals; the audit trail
  reflects this honestly.

- **Path B:** PAUSE Phase 12 until a stronger fetch path is wired
  (headless browser, MCP fetch server, or Rutik-side manual
  browser verification per cite). This is a quality-floor argument
  if "one degree removed" is unacceptable for the client deliverable.

**Awaiting decision before Hessen content commit starts.**

---

## Update — voris paragraph permalink probe (post-Rutik Path A+B hybrid decision)

Rutik's decision: **hybrid** — Path A for statutory-text §-citations,
Path B (manual browser verification by Rutik) for
Verwaltungsvorschriften only. Before locking the hybrid scope, one
follow-up probe: can the Wolters Kluwer-hosted voris portal serve
NBauO §-permalinks via server-side fetch? If yes, NS drops back to
Path A statutory-text-pure (no manual VV verification needed for
NS § references — only for DVO-NBauO).

### Probe

| URL | Status | Result |
| --- | --- | --- |
| `https://voris.wolterskluwer-online.de/browse/document/f3470ad0-4ca5-3275-9be2-a1a1c1bbf75c` (§ 5 NBauO Grenzabstände) | 200 | **READABLE.** Returns the verbatim text: *"Gebäude müssen mit allen auf ihren Außenflächen oberhalb der Geländeoberfläche gelegenen Punkten von den Grenzen des Baugrundstücks Abstand halten. Satz 1 gilt entsprechend für andere bauliche Anlagen, von denen Wirkungen wie von Gebäuden ausgehen, und Terrassen, soweit sie jeweils höher als 1 m über der Geländeoberfläche sind."* |

URL pattern: `https://voris.wolterskluwer-online.de/browse/document/<uuid>`.
UUIDs are search-derivable (e.g., the § 5 NBauO UUID surfaced via
`site:voris.wolterskluwer-online.de` search). Free access, no login.

### Verdict

**NS NBauO §-citations: Path A pure.** Source-ledger entries cite
the Wolters Kluwer voris permalink directly; same posture as
`dejure.org` for federal cites. Per-state dry-run before NS commit
still mandatory — the dry-run's job becomes UUID-derivation for the
specific paragraphs the systemBlock will cite.

**NS DVO-NBauO + AVV-NBauO citations: Path B (manual browser
verification by Rutik) per the hybrid rule.** Verwaltungsvorschriften
were not probed — assume the same SPA limitation applies until
proven otherwise.

### Side finding (pre-flag for the NS dry-run)

The search surfaced a 2024-Novelle change to § 5 NBauO Abstands­
flächen: **0.5 H → 0.4 H** (commercial/industrial: 0.25 H → 0.2 H).
The current NS Phase 11 stub doesn't mention this; the NS Phase 12
content commit must verify the current numerical thresholds via the
Wolters Kluwer portal before writing. **Pre-flag for Niedersachsen
fetch dry-run when its turn comes.** Same surprise pattern as the
Hessen 2025-Novelle finding — the dry-run-first discipline pays for
itself.

### Per-state hybrid scope (locked)

| State | Statutory text (LBO §) | Verwaltungsvorschriften |
| --- | --- | --- |
| HE | Path A (ingkh.de + akh.de + wirtschaft.hessen.de) | **Path B manual** for HBauVwV when needed; recommended omission per dry-run findings |
| NS | **Path A pure** (voris.wolterskluwer-online.de permalinks) | **Path B manual** for DVO-NBauO + AVV-NBauO |
| NRW | Path A (aknw.de + ministry; per-state dry-run will confirm) | **Path B manual** for VV TB NRW |
| BW | Path A (akbw.de + ministry; per-state dry-run will confirm) | **Path B manual** for LBOAVO + LBOVVO |

`PHASE_12_<state>_VV_REQUESTS.md` and the matching
`PHASE_12_<state>_VV_VERIFIED.md` flow lands per state at the
start of each commit, per Rutik's hybrid spec.

**Hessen content commit cleared to start under hybrid mode.**
