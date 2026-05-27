# Thüringen — Architect-Tone Diagnostic (Phase C item #2)

Rendered DE PDF: `/tmp/atone-thueringen.txt`. Classified against [`_FINDINGS.md`](./_FINDINGS.md).

## ⛔ Tier-0 leaks (wrong citations actually rendered in this state's PDF)

- **[F1] Brandschutznachweis → `§ 14 NBauO`** (extract line 130: "· Brandschutzplaner:in oder Architekt:in (je Gebäudeklasse) · § 14 NBauO") — should be a Thüringen § (the ThürBO fire-protection anchor), not Niedersachsen. Source `src/legal/requiredDocuments.ts:108`.

> F2 (`§ 60 NBauO` on the verfahrensfrei / Anzeige row) does **not** appear: this T-01 regular-procedure run renders no "Anzeige-Formular (verfahrensfrei)" document row.
> F3 (`{DSchG} § 9`) does **not** appear: this run has `Denkmalschutz false` (extract line 203) and "Keine Baulasten, kein Denkmalschutz identifiziert" (line 66), so no Denkmalrechtliche-Erlaubnis row with the hardcoded `§ 9` is rendered.

## ⚠ Boilerplate / template-stamped prose (quoted from this state's PDF)

| Rendered string (quote) | Extract line | Finding | Source file:line |
|---|---|---|---|
| "Reguläres Baugenehmigungsverfahren (Baugenehmigungsverfahren (regulär), § 66 ThürBO) als Ausgangspunkt; konkrete Verfahrensart mit dem lokalen Bauamt bestätigen." | 63–64 (also 112–113) | F7 (procedure-name doubling) | `src/legal/resolveProcedure.ts:436` + `src/legal/stateLocalization.ts:377` |
| "konkrete Verfahrensart mit dem lokalen Bauamt bestätigen." | 64 / 113 | F9 (generic procedure hedge) | `src/legal/resolveProcedure.ts:436` |
| "• Spezifische Verfahrensart mit lokalem Bauamt klären — landesspezifische Detailregeln noch nicht vollständig hinterlegt." | 114–115 | F8 (procedure deferral caveat) | `src/legal/resolveProcedure.ts:445-446` |
| "Landesamt für Denkmalpflege Thüringen; ThürDSchG regelt Erlaubnispflichten." | 270–271 | F4 (generic monument-authority name) | `src/legal/stateCitations.ts:196` → `src/features/chat/lib/pdfSections/glossary.ts:162` |
| "Bauvorlageberechtigt nach § 67 ThürBO; reicht den Antrag ein." | 151 | F12 (generic role qualifications) | `src/features/result/lib/roleEffortLookup.ts:55-84` |

> F5 (`Untere Denkmalbehörde (Stadt {capital})`) does **not** surface: it rides on `requiredDocuments.ts:110`, part of the Denkmal row, which is suppressed because Denkmalschutz=false here.
> F6 (`Architektenkammer {Land}`) does **not** appear as a rendered string in this extract (no chamber-name line surfaces).
> F11 (FEDERAL_OVERRIDES "…in Vorbereitung") is a LegalLandscapeTab artifact and does **not** appear in this PDF extract.

## ✅ Authored — state-specific, reads correct (leave alone)

- **A1 · Regular procedure § (corpus):** "Reguläres Baugenehmigungsverfahren · § 66 ThürBO" (lines 111, 207) — the Thüringen regular-procedure anchor renders correctly.
- **A2 · Adjacent-law short names:** "ThürBauVorlVO § 3" (lines 120, 122, 124, 138, 140) and "ThürDSchG" (lines 269, 270) — Thüringen-specific short names, correct.
- **A3 · Submission / structural §§ (corpus):** Bauantragsformular "§ 74 ThürBO" (lines 126, 267); Standsicherheitsnachweis / Tragwerk "§ 72 ThürBO" (lines 79, 128, 153, 267–268) — Thüringen-specific, correct.
- **A4 · Capital / archive city:** "Stadtarchiv Erfurt" (line 59), "in Thüringen Pflicht" (line 157) — Erfurt is the Thüringen capital, correct.

## State-specific notes

- **Monument authority (F4 target):** the generic "Landesamt für Denkmalpflege Thüringen" is rendered (extract lines 270–271). Likely-correct name to author: **Thüringisches Landesamt für Denkmalpflege und Archäologie (TLDA)**. Mark "verify before authoring" — do NOT assert as verified.
- **Does F10 (docs stub-footer "Landespezifische Einreichungs-§§ in Vorbereitung") appear?** **No.** The DOKUMENTE section (lines 117–142) renders a full per-document list with Thüringen §§ (ThürBauVorlVO § 3, § 74/§ 72 ThürBO); the stub-footer string is absent.
- **Other quirks:**
  - Glossary header reads "ThürBauVorlVO · Thüringen" but the body describes it as "Landesbauordnung Thüringen (z.B. § 74 ThürBO …)" (lines 266–268) — the short-name label is the ThürBauVorlagenVO while the gloss text describes the ThürBO; minor label/body mismatch worth noting.
  - The Brandschutznachweis line (130) is the single Tier-0 leak in this otherwise Thüringen-consistent document — every other § anchor in the extract is correctly ThürBO / ThürBauVorlVO / ThürDSchG.
