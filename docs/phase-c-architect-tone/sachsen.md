# Sachsen — Architect-Tone Diagnostic (Phase C item #2)

Rendered DE PDF: `/tmp/atone-sachsen.txt`. Classified against [`_FINDINGS.md`](./_FINDINGS.md).

## ⛔ Tier-0 leaks (wrong citations actually rendered in this state's PDF)
- **[F1] Brandschutznachweis → `§ 14 NBauO`** (extract line 130: "· Brandschutzplaner:in oder Architekt:in (je Gebäudeklasse) · § 14 NBauO") — should be a Sachsen § (Brandschutz sits in § 14 SächsBO), not Niedersachsen. Source `src/legal/requiredDocuments.ts:108`.
- **[F2] § 60 NBauO verfahrensfrei/Anzeige citation** — does NOT appear in this extract. This is a T-01 regular-procedure render; no "Anzeige-Formular (verfahrensfrei)" document row surfaces, so the F2 leak is not triggered here.
- **[F3] `SächsDSchG § 9` Denkmalrechtliche Erlaubnis** — does NOT appear in this extract. Denkmalschutz = false (line 203) and Ensemble-Denkmalschutz = false (line 205), so the Denkmalrechtliche-Erlaubnis row is not rendered and the hardcoded `§ 9` (`src/legal/requiredDocuments.ts:111-113`) is not surfaced. The act name `SächsDSchG` itself still appears in the glossary (line 269) without the `§ 9` suffix.

## ⚠ Boilerplate / template-stamped prose (quoted from this state's PDF)
| Rendered string (quote) | Extract line | Finding | Source file:line |
|---|---|---|---|
| "Reguläres Baugenehmigungsverfahren (Baugenehmigungsverfahren (regulär), § 64 SächsBO) als Ausgangspunkt; konkrete Verfahrensart mit dem lokalen Bauamt bestätigen." | 63–64 (also 112–113) | F7 (procedure-name doubling) | `src/legal/resolveProcedure.ts:436` + `src/legal/stateLocalization.ts:377` |
| "konkrete Verfahrensart mit dem lokalen Bauamt bestätigen." | 64, 113 | F9 (generic procedure hedge) | `src/legal/resolveProcedure.ts:436` |
| "• Spezifische Verfahrensart mit lokalem Bauamt klären — landesspezifische Detailregeln noch nicht vollständig hinterlegt." | 114–115 | F8 (procedure deferral caveat) | `src/legal/resolveProcedure.ts:445-446` |
| "Landesamt für Denkmalpflege Sachsen; SächsDSchG regelt Erlaubnispflichten." | 270–271 | F4 (generic monument authority) | `src/legal/stateCitations.ts:196` → `src/features/chat/lib/pdfSections/glossary.ts:162` |
| "Bauvorlageberechtigt nach § 65 SächsBO; reicht den Antrag ein." | 151 | F12 (generic role qualifications) | `src/features/result/lib/roleEffortLookup.ts:55-84` |

Notes on findings not triggered:
- **F5** (`Untere Denkmalbehörde (Stadt {capital})`): not rendered — no Denkmalschutz path active (the C-row reads "kein Denkmalschutz identifiziert", line 66).
- **F10** (docs stub-footer): does NOT appear — see State-specific notes.
- **F11** (LegalLandscape federal overrides): not part of the PDF extract (LegalLandscapeTab is in-app, not in this rendered briefing).

## ✅ Authored — state-specific, reads correct (leave alone)
- **A1 · corpus procedure §:** "Reguläres Baugenehmigungsverfahren · § 64 SächsBO" (line 111; also surfaced lines 63, 207) — correct Sachsen regular-procedure §.
- **A2 · adjacent-law short names:** "DVOSächsBO § 3" on the submission documents (lines 120, 122, 124, 138, 140); "SächsDSchG · Denkmalschutz" / "SächsDSchG" act name (lines 269, 271) — Sachsen-specific.
- **A3 · submission / structural §§:** Bauantragsformular "§ 68 SächsBO" (line 126); Standsicherheitsnachweis "§ 66 SächsBO" (line 128); Tragwerk cost basis "§ 66 SächsBO Nachweis" (line 79) — corpus-sourced, reads correct.
- **A4 · capital / archive city:** "Stadtarchiv Leipzig" (line 59) — note Leipzig is the project city, not the Sachsen capital (Dresden); the archive/capital interpolation here renders the project city rather than the catalog A4 capital. Flag for review.

## State-specific notes
- **Monument authority (F4 target):** the generic "Landesamt für Denkmalpflege Sachsen" is rendered (lines 270–271). The likely-correct name to author is **Landesamt für Denkmalpflege Sachsen (LfD)** — VERIFY BEFORE AUTHORING; not asserted as verified here. (Note: this is the one state where the generic makeStub label is plausibly close to the real name; still verify.)
- **Does F10 (docs stub-footer "Landespezifische Einreichungs-§§ in Vorbereitung") appear?** No. The full Einreichungs-Dokumente list (lines 118–142) is rendered with concrete §§; the stub-footer is not present in this extract.
- **Other quirks:**
  - Glossary entry header reads "DVOSächsBO · Sachsen" (line 266) but the body says "Landesbauordnung Sachsen (z.B. § 68 SächsBO Bauantrag, § 66 SächsBO Tragwerk)" — the header names the implementing ordinance (DVOSächsBO) while the body names the parent SächsBO; the two don't align. Flag for tone/consistency review.
  - "Stadtarchiv Leipzig" (line 59): A4 capital interpolation renders the project city, not the state capital — confirm intended behavior.
