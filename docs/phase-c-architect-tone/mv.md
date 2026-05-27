# Mecklenburg-Vorpommern — Architect-Tone Diagnostic (Phase C item #2)

Rendered DE PDF: `/tmp/atone-mv.txt`. Classified against [`_FINDINGS.md`](./_FINDINGS.md).

## ⛔ Tier-0 leaks (wrong citations actually rendered in this state's PDF)

- **[F1] Brandschutznachweis → `§ 14 NBauO`** (extract line 130: "· Brandschutzplaner:in oder Architekt:in (je Gebäudeklasse) · § 14 NBauO") — should be an M-V § (fire-protection in LBauO M-V), not Niedersachsen. Source `src/legal/requiredDocuments.ts:108`.

_F2 not applicable: this is a regular Baugenehmigungsverfahren render (T-01); no verfahrensfrei / Anzeige-Formular row appears in the extract._

_F3 not applicable: Denkmalschutz = false (extract line 203), so no "Denkmalrechtliche Erlaubnis · … DSchG M-V § 9" row is rendered._

## ⚠ Boilerplate / template-stamped prose (quoted from this state's PDF)

| Rendered string (quote) | Extract line | Finding | Source file:line |
|---|---|---|---|
| "Reguläres Baugenehmigungsverfahren (Baugenehmigungsverfahren (regulär), § 64 LBauO M-V) als Ausgangspunkt" | 63–64 (also 112–113) | F7 (procedure-name doubling) | `src/legal/resolveProcedure.ts:436` + `src/legal/stateLocalization.ts:377` |
| "konkrete Verfahrensart mit dem lokalen Bauamt bestätigen." | 64 (also 113) | F9 (generic procedure hedge) | `src/legal/resolveProcedure.ts:436` |
| "• Spezifische Verfahrensart mit lokalem Bauamt klären — landesspezifische Detailregeln noch nicht vollständig hinterlegt." | 114–115 | F8 (procedure deferral caveat) | `src/legal/resolveProcedure.ts:445-446` |
| "Landesamt für Denkmalpflege Mecklenburg-Vorpommern; DSchG M-V regelt Erlaubnispflichten." | 270–271 | F4 (generic monument-authority name) | `src/legal/stateCitations.ts:196` surfaced via `src/features/chat/lib/pdfSections/glossary.ts:162` |
| "Bauvorlageberechtigt nach § 65 LBauO M-V; reicht den Antrag ein." | 151 | F12 (generic role qualification) | `src/features/result/lib/roleEffortLookup.ts:55-84` |

_F5 (Untere Denkmalbehörde (Stadt {capital})) not surfaced: no Denkmal document row in this render (Denkmalschutz false)._
_F6 (Architektenkammer {Land}) not surfaced in this extract._
_F10 (docs stub-footer) does NOT appear — see notes._
_F11 (LegalLandscape federal overrides) not part of the PDF render._

## ✅ Authored — state-specific, reads correct (leave alone)

- Regular procedure §: **`§ 64 LBauO M-V`** (corpus, A1) — extract lines 63, 111, 112–113, 207.
- Adjacent-law short names (A2): **`BauVorlVO M-V`** (extract lines 120, 122, 124, 138, 140, glossary 266) and **`DSchG M-V`** (glossary 269).
- Submission / structural §§ (A3): Bauantragsformular **`§ 68 LBauO M-V`** (line 126), Standsicherheitsnachweis / Tragwerk **`§ 66 LBauO M-V`** (lines 79, 128, 153), role qualification **`§ 65 LBauO M-V`** (line 151).
- Capital city (A4): **Schwerin** — "Stadtarchiv Schwerin" (line 59); also "bei Neubauten in Mecklenburg-Vorpommern Pflicht" (line 157).

## State-specific notes

- **Monument authority (F4 target):** the generic "Landesamt für Denkmalpflege Mecklenburg-Vorpommern" is rendered (extract line 270). The likely-correct name to author is **Landesamt für Kultur und Denkmalpflege M-V** — mark as "verify before authoring"; do NOT assert as verified.
- **Does F10 (docs stub-footer "Landespezifische Einreichungs-§§ in Vorbereitung") appear?** **No.** The Dokumente section ends at the Asbest-/PCB row (extract lines 141–142, "Schadstoffsachverständige:r · TRGS 519") with no stub-footer line before the page footer. M-V's submission §§ resolve from the corpus (BauVorlVO M-V §, § 68 LBauO M-V), so the stub-footer path is not tripped.
- **Other quirk:** the doubled procedure name (F7) renders twice — Rechtsbereiche B block (lines 63–64) and Verfahren section (lines 112–113). The "M-V" suffix line-wraps across lines 112→113 in the Verfahren block, which is cosmetic only.
