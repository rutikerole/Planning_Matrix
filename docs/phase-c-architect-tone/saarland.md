# Saarland — Architect-Tone Diagnostic (Phase C item #2)

Rendered DE PDF: `/tmp/atone-saarland.txt`. Classified against [`_FINDINGS.md`](./_FINDINGS.md).

## ⛔ Tier-0 leaks (wrong citations actually rendered in this state's PDF)
- **[F1] Brandschutznachweis → `§ 14 NBauO`** (extract line 131: "· Brandschutzplaner:in oder Architekt:in (je Gebäudeklasse) · § 14 NBauO") — should be a Saarland § (Brandschutz sits in the LBO Saarland), not Niedersachsen. Source `src/legal/requiredDocuments.ts:108`.
- **[F2] §
60 NBauO verfahrensfrei/Anzeige citation** — does NOT appear in this extract. This is a T-01 regular-procedure render; no "Anzeige-Formular (verfahrensfrei)" document row surfaces, so the F2 leak is not triggered here.
- **[F3] `SDschG § 9` Denkmalrechtliche Erlaubnis** — does NOT appear in this extract. Denkmalschutz = false (line 204) and Ensemble-Denkmalschutz = false (line 206), so the Denkmalrechtliche-Erlaubnis row is not rendered and the hardcoded `§ 9` (`src/legal/requiredDocuments.ts:111-113`) is not surfaced. Note the act name `SDschG` itself still appears in the glossary (line 270) without the `§ 9` suffix.

## ⚠ Boilerplate / template-stamped prose (quoted from this state's PDF)
| Rendered string (quote) | Extract line | Finding | Source file:line |
|---|---|---|---|
| "Reguläres Baugenehmigungsverfahren (Baugenehmigungsverfahren (regulär), § 65 LBO Saarland) als Ausgangspunkt; konkrete Verfahrensart mit dem lokalen Bauamt bestätigen." | 64–65 (also 113–114) | F7 (procedure-name doubling) | `src/legal/resolveProcedure.ts:436` + `src/legal/stateLocalization.ts:377` |
| "konkrete Verfahrensart mit dem lokalen Bauamt bestätigen." | 65, 114 | F9 (generic procedure hedge) | `src/legal/resolveProcedure.ts:436` |
| "• Spezifische Verfahrensart mit lokalem Bauamt klären — landesspezifische Detailregeln noch nicht vollständig hinterlegt." | 115–116 | F8 (procedure deferral caveat) | `src/legal/resolveProcedure.ts:445-446` |
| "Landesamt für Denkmalpflege Saarland; SDschG regelt Erlaubnispflichten." | 271–272 | F4 (generic monument authority) | `src/legal/stateCitations.ts:196` → `src/features/chat/lib/pdfSections/glossary.ts:162` |
| "Bauvorlageberechtigt nach § 66 LBO Saarland; reicht den Antrag ein." | 152 | F12 (generic role qualifications) | `src/features/result/lib/roleEffortLookup.ts:55-84` |

Notes on findings not triggered:
- **F5** (`Untere Denkmalbehörde (Stadt {capital})`): not rendered — no Denkmalschutz path active (the C-row reads "kein Denkmalschutz identifiziert", line 67).
- **F10** (docs stub-footer): does NOT appear — see State-specific notes.
- **F11** (LegalLandscape federal overrides): not part of the PDF extract (LegalLandscapeTab is in-app, not in this rendered briefing).

## ✅ Authored — state-specific, reads correct (leave alone)
- **A1 · corpus procedure §:** "Reguläres Baugenehmigungsverfahren · § 65 LBO Saarland" (line 112; also surfaced lines 64, 208) — correct Saarland regular-procedure §.
- **A2 · adjacent-law short names:** "BauVorlVO § 3" on the submission documents (lines 121, 123, 125, 139, 141); "SDschG · Denkmalschutz" / "SDschG" act name (lines 270, 272) — Saarland-specific.
- **A3 · submission / structural §§:** Bauantragsformular "§ 69 LBO Saarland" (line 127); Standsicherheitsnachweis "§ 67 LBO Saarland" (line 129); Tragwerk cost basis "§ 67 LBO Saarland Nachweis" (line 80) — corpus-sourced, reads correct.
- **A4 · capital / archive city:** "Stadtarchiv Saarbrücken" (line 60) — Saarbrücken is the Saarland capital, correct.

## State-specific notes
- **Monument authority (F4 target):** the generic "Landesamt für Denkmalpflege Saarland" is rendered (lines 271–272). The likely-correct name to author is **Landesdenkmalamt (im Ministerium für Bildung und Kultur)** — VERIFY BEFORE AUTHORING; not asserted as verified here.
- **Does F10 (docs stub-footer "Landespezifische Einreichungs-§§ in Vorbereitung") appear?** No. The full Einreichungs-Dokumente list (lines 119–143) is rendered with concrete §§; the stub-footer is not present in this extract.
- **Other quirks:**
  - Glossary entry header reads "BauVorlVO · Saarland" (line 267) but the body text says "Landesbauordnung Saarland (z.B. § 69 LBO Saarland Bauantrag, § 67 LBO Saarland Tragwerk)" — the short-name header (`BauVorlVO`) and the spelled-out LBO body don't match each other; flag for tone/consistency review.
  - Act short name renders as "SDschG" (lines 270, 271). Note the catalog's A2 example writes it "SDschG"/"SDschG"; confirm intended casing (commonly **SDSchG**) when authoring — verify, do not assert.
