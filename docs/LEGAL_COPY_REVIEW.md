# Legal-Copy Review Manifest

> Every German legal string in the product, in one file, ready for a
> Bayerischer Anwalt to red-pen. Each entry: file:line, the verbatim
> string, and the legal context that decides whether it is correctly
> worded.
>
> This is a static manifest, not active code. Updating these strings
> requires editing the cited file:line and re-running daily gates.
> When counsel signs off, record the date + reviewer at the bottom of
> this file.

## 1. The §6.B.01 legal-shield clause (load-bearing)

**Surface:** `src/features/architect/components/VorlaeufigFooter.tsx:46`
**Verbatim DE:**

> *"Vorläufig — bestätigt durch eine/n bauvorlageberechtigte/n
> Architekt/in noch ausstehend."*

**Verbatim EN (courtesy translation):**

> *"Preliminary — to be confirmed by a certified architect
> (Bauvorlageberechtigte/r)."*

**Legal context:** v1.5 §6.B.01 specifies this clause as the
liability-shielding marker on result-page cards whose qualifier
is not yet DESIGNER+VERIFIED. The clause must:
- Make clear that the entry is **not** authoritative legal advice.
- Name the role with statutory authority (`bauvorlageberechtigt`
  per Art. 65 BayBO + AKBay).
- Communicate that the architect's sign-off is **outstanding**
  (not "available" or "optional").

**Anwalt review questions:**
1. Is "Vorläufig" the right register, or is "Unverbindlich" /
   "Hinweis ohne Gewähr" stronger?
2. Does naming "bauvorlageberechtigte/n Architekt/in" trigger any
   AKBay-specific phrasing requirements?
3. Does the clause need a § 675 BGB-style limitation reference?

## 2. The architect-invite CTA (post-v1.0.4 visible)

**Surface:** `src/locales/de.json` →
`chat.errors.qualifier_role_violation.body` (rendered by
`ErrorBanner.tsx`).
**Verbatim DE:**

> *"Diese Festlegung erfordert die Freigabe durch eine/n
> bauvorlageberechtigte/n Architekt/in. Bitte laden Sie eine/n
> Architekt/in ein, um die Eintragung zu bestätigen."*

**Title:** *"Architekt-Freigabe erforderlich."*

**Legal context:** This is the chat-turn 403 envelope's
user-facing render — fires when the qualifier-write gate rejects
a CLIENT attempt to set DESIGNER+VERIFIED. v1.0.0–v1.0.3 dropped
this string before display; v1.0.4 closes that gap.

## 3. Persona prompt — Bauherr/Architekt/Behörde framing

**Surface:** `src/legal/personaBehaviour.ts` (PERSONA_BEHAVIOURAL_RULES)
+ `src/legal/bayern.ts` (BAYERN_BLOCK).
**Sample strings (read full files for context):**
- "Sie sind kein Anwalt und keine Behörde. …"
- Vorläufig-Hinweis-discipline rules.
- Wrong-citation discipline (no MBO references in Bayern persona).

**Legal context:** persona prompt directly shapes model output. A
single misframing (e.g., promising "verbindliche Beratung")
nullifies the §6.B.01 shield posture. The persona prompt's
framing is therefore part of the legal surface, not just product
copy.

## 4. AGB (Allgemeine Geschäftsbedingungen)

**Surface:** `src/features/legal/pages/AgbPage.tsx` (215 LOC).

**Legal-review priorities:**
- **Rechtsdienstleistungs-Risk:** does the AGB clearly position
  Planning Matrix as a research/orientation tool (not
  Rechtsberatung im Sinne RDG)? Phase 17 audit flagged this.
- **B2B-only declaration** under § 14 BGB if applicable.
- **Gewährleistungsausschluss** for model-generated content +
  the Vorläufig-discipline shield.

## 5. Datenschutzerklärung

**Surface:** `src/features/legal/pages/DatenschutzPage.tsx` (358
LOC). Sub-processor list per Art. 13 (1)(f) DSGVO.

**Legal-review priorities:**
- Sub-processor list 1:1 match against actual deployment.
- Anthropic § 3.3 SCC + DPF posture current as of review date.
- Hosting-region narrative matches `vercel.json` + Supabase
  Dashboard.
- v1.0.4: Supabase region mismatch flagged (linked project is
  Mumbai per `supabase projects list`; Datenschutz says Frankfurt).
  Either migrate the project OR amend Datenschutz BEFORE public
  traffic.

## 6. Impressum

**Surface:** `src/features/legal/pages/ImpressumPage.tsx` (203
LOC). § 5 DDG mandatory fields + § 18 Abs. 2 MStV responsible-
person block.

**v1.0.4 status:** all 8 mandatory fields are env-driven
(VITE_LEGAL_*); validator fails the build if any is missing or
still wrapped in `{{...}}`. Counsel review can confirm the
content in `.env.local` at deploy time.

## 7. Cookie banner

**Surface:** `src/features/cookies/CookieBanner.tsx` + the three
lifecycle gates (Sentry / Analytics).

**Legal-review priorities:**
- TTDSG § 25 alignment for Functional + Analytics buckets.
- "Strictly necessary" bucket — no consent required, but the
  banner must declare which cookies fall in.
- Granular opt-in vs opt-out — current pattern is opt-in for
  Functional / Analytics; "Strictly necessary" auto-enabled.

## 8. In-product disclaimer (gap)

**Status:** ❌ no in-product "this is not legal advice" disclaimer
on the chat surface. The Vorläufig footer functions as the legal
shield on the *result page*; the *chat workspace* itself does not
carry an analogous reminder.

**Counsel-review question:** is the Vorläufig footer + the AGB's
Gewährleistungsausschluss sufficient, or does the chat surface
need its own banner?

## 9. Sign-off ledger

| Reviewer | Role | Date | Pages reviewed | Outcome |
| -------- | ---- | ---- | --------------- | ------- |
| _ | Anwalt (Bayern, Bau-/Datenschutzrecht) | _ | Impressum / Datenschutz / AGB / Cookies / Vorläufig clause / Persona prompt | _ |
| _ | Manager / DPO equivalent | _ | DSGVO posture overall | _ |

**Filling this section is the gate for v1.0.5+ public traffic.**
