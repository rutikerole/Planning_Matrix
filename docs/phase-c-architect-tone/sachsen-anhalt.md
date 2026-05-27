# Sachsen-Anhalt — Architect-Tone Diagnostic (Phase C item #2)

Rendered DE PDF: `/tmp/atone-sachsen-anhalt.txt`. Classified against [`_FINDINGS.md`](./_FINDINGS.md).

## ⛔ Tier-0 leaks (wrong citations actually rendered in this state's PDF)
- **[F1] Brandschutznachweis → `§ 14 NBauO`** (extract line 130: "· Brandschutzplaner:in oder Architekt:in (je Gebäudeklasse) · § 14 NBauO") — should be a Sachsen-Anhalt § (Brandschutz sits in the BauO LSA), not Niedersachsen. Source `src/legal/requiredDocuments.ts:108`.
- **[F2] § 60 NBauO verfahrensfrei/Anzeige citation** — does NOT appear in this extract. This is a T-01 regular-procedure render; no "Anzeige-Formular (verfahrensfrei)" document row surfaces, so the F2 leak is not triggered here.
- **[F3] `DSchG ST § 9` Denkmalrechtliche Erlaubnis** — does NOT appear in this extract. Denkmalschutz = false (line 203) and Ensemble-Denkmalschutz = false (line 205), so the Denkmalrechtliche-Erlaubnis row is not rendered and the hardcoded `§ 9` (`src/legal/requiredDocuments.ts:111-113`) is not surfaced. The act name `DSchG ST` itself still appears in the glossary (line 269) without the `§ 9` suffix.

## ⚠ Boilerplate / template-stamped prose (quoted from this state's PDF)
| Rendered string (quote) | Extract line | Finding | Source file:line |
|---|---|---|---|
| "Reguläres Baugenehmigungsverfahren (Baugenehmigungsverfahren (regulär), § 63 BauO LSA) als Ausgangspunkt; konkrete Verfahrensart mit dem lokalen Bauamt bestätigen." | 63–64 (also 112–113) | F7 (procedure-name doubling) | `src/legal/resolveProcedure.ts:436` + `src/legal/stateLocalization.ts:377` |
| "konkrete Verfahrensart mit dem lokalen Bauamt bestätigen." | 64, 113 | F9 (generic procedure hedge) | `src/legal/resolveProcedure.ts:436` |
| "• Spezifische Verfahrensart mit lokalem Bauamt klären — landesspezifische Detailregeln noch nicht vollständig hinterlegt." | 114–115 | F8 (procedure deferral caveat) | `src/legal/resolveProcedure.ts:445-446` |
| "Landesamt für Denkmalpflege Sachsen-Anhalt; DSchG ST regelt Erlaubnispflichten." | 270–271 | F4 (generic monument authority) | `src/legal/stateCitations.ts:196` → `src/features/chat/lib/pdfSections/glossary.ts:162` |
| "Bauvorlageberechtigt nach § 64 BauO LSA; reicht den Antrag ein." | 151 | F12 (generic role qualifications) | `src/features/result/lib/roleEffortLookup.ts:55-84` |

Notes on findings not triggered:
- **F5** (`Untere Denkmalbehörde (Stadt {capital})`): not rendered — no Denkmalschutz path active (the C-row reads "kein Denkmalschutz identifiziert", line 66).
- **F10** (docs stub-footer): does NOT appear — see State-specific notes.
- **F11** (LegalLandscape federal overrides): not part of the PDF extract (LegalLandscapeTab is in-app, not in this rendered briefing).

## ✅ Authored — state-specific, reads correct (leave alone)
- **A1 · corpus procedure §:** "Reguläres Baugenehmigungsverfahren · § 63 BauO LSA" (line 111; also surfaced lines 63, 207) — correct Sachsen-Anhalt regular-procedure §.
- **A2 · adjacent-law short names:** "BauVorlVO § 3" on the submission documents (lines 120, 122, 124, 138, 140); "DSchG ST · Denkmalschutz" / "DSchG ST" act name (lines 269, 271) — Sachsen-Anhalt-specific.
- **A3 · submission / structural §§:** Bauantragsformular "§ 67 BauO LSA" (line 126); Standsicherheitsnachweis "§ 65 BauO LSA" (line 128); Tragwerk cost basis "§ 65 BauO LSA Nachweis" (line 79) — corpus-sourced, reads correct.
- **A4 · capital / archive city:** "Stadtarchiv Magdeburg" (line 59) — Magdeburg is the Sachsen-Anhalt capital, correct.

## State-specific notes
- **Monument authority (F4 target):** the generic "Landesamt für Denkmalpflege Sachsen-Anhalt" is rendered (lines 270–271). The likely-correct name to author is **Landesamt für Denkmalpflege und Archäologie Sachsen-Anhalt** — VERIFY BEFORE AUTHORING; not asserted as verified here.
- **Does F10 (docs stub-footer "Landespezifische Einreichungs-§§ in Vorbereitung") appear?** No. The full Einreichungs-Dokumente list (lines 118–142) is rendered with concrete §§; the stub-footer is not present in this extract.
- **Other quirks:**
  - Glossary entry header reads "BauVorlVO · Sachsen-Anhalt" (line 266) but the body says "Landesbauordnung Sachsen-Anhalt (z.B. § 67 BauO LSA Bauantrag, § 65 BauO LSA Tragwerk)" — the short-name header names the submission ordinance (BauVorlVO) while the body names the parent BauO LSA; the two don't align. Flag for tone/consistency review.
  - Procedure §§ are internally consistent and LSA-specific throughout (§ 63 regular, § 64 Bauvorlageberechtigung, § 65 Tragwerk, § 67 Bauantrag), so the only correctness leak is F1 (NBauO Brandschutz).
