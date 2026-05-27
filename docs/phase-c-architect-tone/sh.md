# Schleswig-Holstein — Architect-Tone Diagnostic (Phase C item #2)

Rendered DE PDF: `/tmp/atone-sh.txt`. Classified against [`_FINDINGS.md`](./_FINDINGS.md).

## ⛔ Tier-0 leaks (wrong citations actually rendered in this state's PDF)

- **[F1] Brandschutznachweis → `§ 14 NBauO`** (extract line 130: "· Brandschutzplaner:in oder Architekt:in (je Gebäudeklasse) · § 14 NBauO") — should be a Schleswig-Holstein § (the SH fire-protection anchor, e.g. an LBO SH §), not Niedersachsen. Source `src/legal/requiredDocuments.ts:108`.

> F2 (`§ 60 NBauO` on the verfahrensfrei / Anzeige row) does **not** appear: this T-01 regular-procedure run renders no "Anzeige-Formular (verfahrensfrei)" document row.
> F3 (`{DSchG} § 9`) does **not** appear: this run has `Denkmalschutz false` (extract line 203) and "Keine Baulasten, kein Denkmalschutz identifiziert" (line 66), so no Denkmalrechtliche-Erlaubnis row with the hardcoded `§ 9` is rendered.

## ⚠ Boilerplate / template-stamped prose (quoted from this state's PDF)

| Rendered string (quote) | Extract line | Finding | Source file:line |
|---|---|---|---|
| "Reguläres Baugenehmigungsverfahren (Baugenehmigungsverfahren (regulär), § 64 LBO SH) als Ausgangspunkt; konkrete Verfahrensart mit dem lokalen Bauamt bestätigen." | 63–64 (also 112–113) | F7 (procedure-name doubling) | `src/legal/resolveProcedure.ts:436` + `src/legal/stateLocalization.ts:377` |
| "konkrete Verfahrensart mit dem lokalen Bauamt bestätigen." | 64 / 113 | F9 (generic procedure hedge) | `src/legal/resolveProcedure.ts:436` |
| "• Spezifische Verfahrensart mit lokalem Bauamt klären — landesspezifische Detailregeln noch nicht vollständig hinterlegt." | 114–115 | F8 (procedure deferral caveat) | `src/legal/resolveProcedure.ts:445-446` |
| "Landesamt für Denkmalpflege Schleswig-Holstein; DSchG SH regelt Erlaubnispflichten." | 270–271 | F4 (generic monument-authority name) | `src/legal/stateCitations.ts:196` → `src/features/chat/lib/pdfSections/glossary.ts:162` |
| "Bauvorlageberechtigt nach § 65 LBO SH; reicht den Antrag ein." | 151 | F12 (generic role qualifications) | `src/features/result/lib/roleEffortLookup.ts:55-84` |

> F5 (`Untere Denkmalbehörde (Stadt {capital})`) does **not** surface: it rides on `requiredDocuments.ts:110`, part of the Denkmal row, which is suppressed because Denkmalschutz=false here.
> F6 (`Architektenkammer {Land}`) does **not** appear as a rendered string in this extract (no chamber-name line surfaces).
> F11 (FEDERAL_OVERRIDES "…in Vorbereitung") is a LegalLandscapeTab artifact and does **not** appear in this PDF extract.

## ✅ Authored — state-specific, reads correct (leave alone)

- **A1 · Regular procedure § (corpus):** "Reguläres Baugenehmigungsverfahren · § 64 LBO SH" (lines 111, 207) — the SH regular-procedure anchor renders correctly.
- **A2 · Adjacent-law short names:** "BauVorlVO § 3" (lines 120, 122, 124, 138, 140) and "DSchG SH" (lines 269, 270) — SH-specific short names, correct.
- **A3 · Submission / structural §§ (corpus):** Bauantragsformular "§ 68 LBO SH" (line 126); Standsicherheitsnachweis / Tragwerk "§ 66 LBO SH" (lines 79, 128, 153, 268) — SH-specific, correct.
- **A4 · Capital / archive city:** "Stadtarchiv Kiel" (line 59), "in Schleswig-Holstein Pflicht" (line 157) — Kiel is the SH capital, correct.

## State-specific notes

- **Monument authority (F4 target):** the generic "Landesamt für Denkmalpflege Schleswig-Holstein" is rendered (extract lines 270–271). Likely-correct name to author: **Landesamt für Denkmalpflege Schleswig-Holstein**. Mark "verify before authoring" — do NOT assert as verified. (Note: in SH the glossary generic and the plausibly-correct name happen to coincide, but this still needs verification against the actual authority name/spelling before it is treated as authored.)
- **Does F10 (docs stub-footer "Landespezifische Einreichungs-§§ in Vorbereitung") appear?** **No.** The DOKUMENTE section (lines 117–142) renders a full per-document list with SH §§ (BauVorlVO § 3, § 68/§ 66 LBO SH); the stub-footer string is absent.
- **Other quirks:**
  - Glossary header reads "BauVorlVO · Schleswig-Holstein" but the body describes it as "Landesbauordnung Schleswig-Holstein (z.B. § 68 LBO SH …)" (lines 266–268) — the short-name label is the BauVorlagenVO while the gloss text describes the LBO; minor label/body mismatch worth noting.
  - The Brandschutznachweis line (130) is the single Tier-0 leak in this otherwise SH-consistent document — every other § anchor in the extract is correctly LBO SH / BauVorlVO / DSchG SH.
