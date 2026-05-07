# Phase 17 — Legal-Page Audit (Week 1)

> Read-pass over `src/features/legal/pages/{Impressum,AGB,Datenschutz,Cookies}Page.tsx`
> dated 2026-05-08. Lists every placeholder, every sub-processor reference,
> and every line that needs counsel-review attention before v1.0 tag.

## Summary

| Page         | Placeholders | Sub-processor refs | Counsel-review priority |
| ------------ | -----------: | -----------------: | ----------------------- |
| ImpressumPage  | 8            | 0                  | **HIGH** — placeholders block tag, real entity details required |
| AGBPage        | 0            | 0                  | MEDIUM — counsel must confirm Rechtsdienstleistungs framing |
| DatenschutzPage| 5            | 5 (all wired)      | **HIGH** — DPA references must match countersigned reality |
| CookiesPage    | 0            | 2 (Sentry, PostHog)| LOW — descriptive of consent banner; counsel cross-check |

**Action gate to clear before v1.0 tag:**
- All 8 Impressum placeholders filled with real values from the manager.
- All 5 Datenschutz placeholders filled (same `{{KONTAKT_EMAIL}}` etc.).
- DatenschutzPage references to "DPA" / "AVV" matched against the
  countersigned-DPA reality (or "in counter-signature" qualifier added).
- Counsel signoff on all four pages, stored in `docs/PHASE_17_SIGNOFFS.md`.

---

## Impressum — placeholders (block tag)

Per `src/features/legal/pages/ImpressumPage.tsx` (and its `{ImprintEn}`
twin), the manager must provide:

| Placeholder                       | What it is                              | Manager-supplied value |
| --------------------------------- | --------------------------------------- | ---------------------- |
| `{{ANBIETER_NAME}}`               | Legal name of provider (single founder OR registered entity) |  TODO  |
| `{{ANBIETER_STRASSE_HAUSNUMMER}}` | Street + house number of registered address | TODO |
| `{{ANBIETER_PLZ}}`                | Postcode                                | TODO |
| `{{ANBIETER_ORT}}`                | City                                    | TODO |
| `{{KONTAKT_TELEFON}}`             | Phone number — required by § 5 DDG; not mailto-only per BGH 2008 | TODO |
| `{{KONTAKT_EMAIL}}`               | Plain-text email (not protected behind a form) | TODO |
| `{{UST_ID_HINWEIS}}`              | Either VAT ID OR "nicht zutreffend" wording | TODO |
| `{{HANDELSREGISTER_HINWEIS}}`     | HRB number + Amtsgericht OR "nicht eingetragen" | TODO |

**Pre-counsel checklist for the manager:**
- If sole-proprietor (Einzelunternehmer): use legal name, no HRB,
  USt-IdNr. only if applied for / received.
- If GmbH / UG: full firm name + legal-form suffix, HRB-Nummer +
  registering Amtsgericht, USt-IdNr. mandatory if EU B2B.
- The plain-text email is a § 5 DDG requirement; using a contact
  form *in addition* is fine, but the email itself must be
  literally typed out on the page.

The English translation (`ImprintEn`) reuses the same placeholders;
filling them once propagates correctly.

---

## AGB — counsel-review priorities (no placeholders)

`AGBPage.tsx` has no `{{...}}` markers but does carry assertions
that counsel must confirm before tag:

1. **Rechtsdienstleistungs-Risk framing.** Planning Matrix is a
   research/orientation tool, not Rechtsberatung in the sense of
   the Rechtsdienstleistungsgesetz. The persona's
   "in Vorbereitung" / "Vorläufig — bestätigt durch eine/n
   bauvorlageberechtigte/n Architekt/in" framing is the v1.5
   §6.B.01 legal shield. Counsel must confirm the AGB language
   matches that posture and does not accidentally promise legal
   advice.
2. **B2B-only declaration** if applicable. If the manager intends
   v1 to ship invite-only / B2B-only, the AGB should declare
   exclusivity to Unternehmer per § 14 BGB.
3. **Gewährleistungsausschluss** for the persona's outputs. The
   "model-generated content; user verifies with authority" framing
   already lives in the persona prompts; the AGB should mirror it.

**No code change in this audit pass — counsel feedback drives the
edit during Week 2.**

---

## Datenschutz — placeholders + sub-processor reality check

### Placeholders (block tag)

Same set as Impressum (all in the "Verantwortlich" + "Kontakt" blocks):
`{{ANBIETER_NAME}}`, `{{ANBIETER_STRASSE_HAUSNUMMER}}`,
`{{ANBIETER_PLZ}}`, `{{ANBIETER_ORT}}`, `{{KONTAKT_EMAIL}}`. Filling
the Impressum values flows here.

### Sub-processor list — match against countersigned-DPA reality

Datenschutz § 3 enumerates all five wired sub-processors. Each
reference cites a specific DSGVO basis + DPA / AVV / SCC posture.
Before tag, the DPA-ledger `docs/PHASE_17_DPA_LEDGER.md` status
column must be cross-walked against this page:

| § in page | Sub-processor | DSGVO basis claimed | DPA-ledger status as of v1.0 must read |
| --------- | ------------- | ------------------- | --------------------------------------- |
| 3.3       | Anthropic API | Art. 6 (1)(b) + AVV | "signed" OR "expected by `<date>`" |
| 3.4       | Supabase      | Art. 6 (1)(b) + AVV | "signed" OR "expected by `<date>`" |
| 3.5       | Vercel        | Art. 6 (1)(f) hosting | "signed" OR "expected by `<date>`" |
| 3.6       | Sentry EU     | Art. 6 (1)(a) functional consent | "signed" OR "expected by `<date>`" |
| 3.7       | PostHog EU    | Art. 6 (1)(a) analytics consent | "signed" OR "expected by `<date>`" |

**If a DPA falls through during Week 1-2 negotiation**, options are:

- **(a)** Disable the sub-processor at deploy time AND remove its
  SDK from the bundle. The Datenschutz § for that vendor is
  removed from the page.
- **(b)** Document the lapse in HANDOFF.md as a known post-tag
  follow-up; counsel must explicitly bless ship-with-pending.

### Other Datenschutz audit points

- **Hosting-region narrative (§ 3.4 / § 3.5).** Page states
  Frankfurt for Supabase + Sentry-EU + PostHog-EU; Vercel claims
  US-with-SCCs. **Action:** confirm against
  `vercel.json` / Supabase project settings / Sentry org region.
  Document in `docs/DEPLOYMENT.md`.
- **Retention windows.** Page does not yet enumerate retention
  per data type. **Action:** counsel + manager decide retention
  policy; Datenschutz § 4 gets a new subsection in Week 2.
- **§ 13 (1)(f) sub-processor list at-a-glance.** Already shipped
  per the file's commit `ba7a3f8` reference. Cross-check the
  bullet list (lines ~330-340) names all five vendors with the
  same status the DPA ledger holds.

---

## Cookies — minor cross-check

`CookiesPage.tsx` describes the consent banner's three categories
(strictly necessary / functional / analytics). The page references:

- Sentry (Functional bucket) — must match Datenschutz § 3.6.
- PostHog (Analytics bucket) — must match Datenschutz § 3.7.
- No third sub-processor referenced.

**Action:** counsel cross-check that the three-category model
maps cleanly to TTDSG § 25 (functional) + GDPR Art. 6 (1)(a)
(analytics consent). Ship-as-is otherwise.

---

## Counsel-meeting prep — Week 1 close

Materials to send to counsel, in this order:

1. This audit doc (`docs/PHASE_17_LEGAL_AUDIT.md`).
2. The four legal page sources (`src/features/legal/pages/*.tsx`)
   — counsel reviews the rendered output, but the source is the
   authoritative copy with i18n branches.
3. The DPA ledger (`docs/PHASE_17_DPA_LEDGER.md`).
4. PHASE_13_REVIEW.md — the qualifier-gate / Rechtsdienstleistung-
   shield context counsel needs to evaluate AGB language.
5. v1.5 architecture document (manager hands directly to counsel).

**Calendar lead time per the scoping doc:** 12 days from request
to feedback. Schedule the counsel meeting on Day 1 of Week 1; aim
to deliver feedback in Week 2 so Week 3 has it incorporated by
v1.0 tag.
