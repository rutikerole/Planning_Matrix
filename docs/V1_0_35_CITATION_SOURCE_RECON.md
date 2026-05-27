# V1.0.35 — Citation-Source Recon (no fixes; data-source landscape only)

> Sprint goal (re-scoped): before building a build-time § citation verifier, find out what official law is actually fetchable for the 4 substantive states + federal law, in what format. Verified 2026-05-27 against the official portals. **No code written, no fixes — recon only.**
>
> **Headline:** the original plan ("pull state BauO XML from gesetze-im-internet.de") is not buildable — gesetze-im-internet.de is **federal-only**, and **no German state publishes its Bauordnung as clean downloadable XML**. Federal §§ are trivially verifiable; state §§ need a different, lighter mechanism (official TOC snapshot per state), and Niedersachsen's official portal is now a **commercial** platform.

---

## 1. Demand — what the repo actually cites (the verifier's input)

Citations the 4 substantive states make, from `src/legal/states/*.ts` ALLOWED_CITATIONS:

| State | Statute | State §§ cited | File |
|---|---|---|---|
| NRW | BauO NRW 2018 | **22** (§§ 5,6,8,48,49,50,53,54,60,62–72,74,75) | `nrw.ts:337-358` |
| Hessen | HBO 2018 | **21** (§§ 2,6,8,52,53,56,57,63–74) | `hessen.ts:421-442` |
| BW | LBO | **24** (§§ 2,5,6,9,27f,37–43,49–56,58,58 Abs.1a,62,63,73a) | `bw.ts:371-394` |
| Niedersachsen | NBauO | **18** (§§ 2,5,7,52,53,60,62–74) | `niedersachsen.ts:310-327` |

Plus **federal §§** cited across all states (BauGB §§ 30/34/35, BauNVO § 19, GEG § 8 — single-sourced via `bayernAllowedCitations.ts` for Bayern; analogous in each state pack).

**Total: ~85 state §§ + a small fixed set of federal §§.** The verifier's job: confirm each cited § (a) **exists** in the current official law and (b) its **heading/scope matches** what the repo attaches to it — exactly the wrong-§→procedure class the Bayern correction (`V1_0_34_BAYERN_PROCEDURE_CORRECTION.md`) just proved is real.

---

## 2. Supply — what each official source serves (verified 2026-05-27)

| Source | Hosts | Per-§ stable URL | Bulk / XML | Machine-parse verdict |
|---|---|---|---|---|
| **gesetze-im-internet.de** | FEDERAL: BauGB, GEG, BauNVO | ✅ `bbaug/__30.html` | ✅ **`xml.zip`** + HTML + PDF + EPUB | 🟢 **CLEAN XML — official, free, ideal** |
| **recht.nrw.de** | BauO NRW 2018 | ✅ (`br_bes_text` owa + `/system/files/BH/*.htm`) | ❌ no XML; HTML only | 🟡 HTML scrape; TOC page parseable |
| **landesrecht-bw.de** | LBO | ✅ (juris `jlr-BauOBW2010V31IVZ`, `docFormat=xsl`) | ❌ no XML; XSL→HTML | 🟡 HTML scrape; official TOC parseable |
| **rv.hessenrecht.hessen.de** | HBO 2018 | ✅ (juris `jlr-BauOHE2018…`, `docFormat=xsl`) | ❌ no XML; XSL→HTML | 🟡 HTML scrape; official TOC parseable |
| **voris (Niedersachsen)** | NBauO | ✅ but on **`voris.wolterskluwer-online.de`** | ❌ no XML | 🔴 **COMMERCIAL platform (Wolters Kluwer)** — ToS/bulk-scrape risk; the free official PDF (`ms.niedersachsen.de/.../NBauO_vom_03.04.2012.pdf`) is the **outdated 2012** text (current amended 01.07.2025) |

**Two hard facts the original plan missed:**
1. **gesetze-im-internet.de carries no state law.** State Bauordnungen are state law on state portals. (Confirmed: the 4 states are on recht.nrw.de / landesrecht-bw.de / hessenrecht / voris — none on gesetze-im-internet.de.)
2. **No state offers clean downloadable XML.** Three of four are juris-powered HTML portals (stable per-document IDs, scrapeable); Niedersachsen migrated to a **commercial** Wolters Kluwer host.

---

## 3. Recommended verifier design (for your decision — not yet built)

A clean automated "diff every § against official XML" is only possible for **federal** law. State law needs a lighter, honest mechanism. Proposed two-tier verifier:

**Tier 1 — Federal §§ (automatable now, low risk):** at build time (or a refresh script) pull the gesetze-im-internet.de **XML** for BauGB / GEG / BauNVO, extract the §→heading map, and assert every federal citation in the repo (a) resolves and (b) its heading matches the repo's gloss. ~1 eng-day. This is the thin wedge that catches the federal-law class of the Bayern bug (e.g. the §246e date/scope).

**Tier 2 — State §§ (semi-automated, the realistic path):** for each of the 4 states, fetch the **official Table-of-Contents page once** (recht.nrw.de / landesrecht-bw / hessenrecht TOC pages give the full §→heading list in one request — no per-§ scraping, no commercial platform for 3 of 4), snapshot it into the repo as `legal-corpus/<state>-toc.json`, and assert every cited state § exists in that snapshot and its heading aligns. Refresh the snapshot when the law amends (each state shows an "in force since" date). ~1–2 eng-days for the 3 juris states; **Niedersachsen flagged** — its official current text is on a commercial host, so its snapshot needs a manual/licensed pull (or use the official Nds. ministry PDF when it's the current version).

**Why a snapshot, not live build-time scraping:** Phase 12 already found live state permalinks unreliable (404s), and build-time network calls to a commercial host (Niedersachsen) are a ToS + flakiness risk. A checked-in, dated TOC snapshot is reproducible, offline, reviewable, and refreshable on amendment — same philosophy as the existing gates.

**What it would catch (the point):** §§ the repo cites that don't exist or are mis-mapped to the wrong heading/procedure — i.e. the Bayern-class error, now guarded at build time across the 4 substantive states. It is **consistency-against-primary-source**, the missing third leg next to the SHA/drift/smoke gates (which only prove internal self-consistency).

---

## 3b. Live verification findings (2026-05-27) — the recon already caught a broken §

Probing the readable sources during recon surfaced two things that decide the build:

**🔴 BLOCKER — official STATE portals are not machine-fetchable here.** Verified by direct fetch:
- `rv.hessenrecht.hessen.de` (HBO) and `landesrecht-bw.de` (LBO) are **juris XSL/JS apps** — a plain fetch returns only the page header, **zero statute text**. No server-rendered content to parse.
- `recht.nrw.de` static HTML (`/system/files/BH/…htm`) **truncates** — it returned correct headings for the early §§ (e.g. **§ 50 — Sonderbauten**, § 48 — Stellplätze…, § 6 — Abstandsflächen) then false "does-not-exist" for everything past the cut. Unusable as-is.
- ⇒ A build-time auto-fetch of official state text is **not viable**. State §→heading must come from a **curated/reviewed snapshot** (or a clean secondary mirror, flagged non-primary). This confirms §3's caution, harder.

**🟢 Federal tier is clean AND already found a broken citation.** Via gesetze-im-internet.de (reliable):

| Citation | Official heading | Repo's gloss | Verdict |
|---|---|---|---|
| BauGB § 30 | Zulässigkeit … Geltungsbereich eines Bebauungsplans | qualifizierter B-Plan | ✅ |
| BauGB § 34 | … im Zusammenhang bebauten Ortsteile | Innenbereich | ✅ |
| BauGB § 35 | Bauen im Außenbereich | Außenbereich | ✅ |
| BauGB § 31 | Ausnahmen und Befreiungen | Befreiung | ✅ |
| BauGB § 246e | Befristete Sonderregelung für den Wohnungsbau | Bau-Turbo | ✅ (matches C4a) |
| BauNVO § 19 | Grundflächenzahl, zulässige Grundfläche | GRZ | ✅ |
| **GEG § 8** | **Verantwortliche** (responsible parties) | **Wärmeschutznachweis** | **🔴 BROKEN — wrong §** |

**GEG § 8** is cited (e.g. `t01-neubau-efh.ts:147`, `legalCitations.ts`, the Bayern allowlist) glossed as the thermal-insulation certificate, but § 8 GEG is "Verantwortliche." The repo even contradicts itself — `t01-neubau-efh.ts:14` marker says "GEG § 10 Wärmeschutznachweis." This is the Bayern-class wrong-§ error in **federal** law, riding on the validated Bayern demo cell. **NO FIX this sprint (per scope) — logged as a finding.**

## 4. Open questions for the design decision

1. **Niedersachsen sourcing:** accept the commercial-host limitation (manual snapshot), or drop NI from Tier 2 until a free official source exists?
2. **Heading-match strictness:** exact-string match (brittle to wording) vs. §-exists + fuzzy heading check (catches the real errors without false alarms)?
3. **Refresh trigger:** manual on known amendments, or a periodic freshness check (mirrors `freshness:check`)?

---

*Recon only. No code, no fixes, no SHA touched. Awaiting design decision before building (per the chosen "recon first" scope).*
