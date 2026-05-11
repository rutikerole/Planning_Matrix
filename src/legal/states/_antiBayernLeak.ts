// ───────────────────────────────────────────────────────────────────────
// v1.0.6 Bug 5 — Anti-Bayern-Leak override block.
//
// The Hessen × T-03 smoke walk against v1.0.5 surfaced a persona
// behaviour gap: even when projects.bundesland was correctly set
// non-Bayern at runtime, the persona still led with BayBO Art./Abs.
// references as "comparable" anchors. Root cause is that several
// Bayern-SHA-locked layers (personaBehaviour.ts, federal.ts,
// templates/shared.ts, t01..t08 per-template files) contain Bayern-
// specific examples that the LLM treats as authoritative anchors.
//
// We cannot touch those layers (they are inside the Bayern SHA
// invariant `b18d3f7f9a6fe238c18cec5361d30ea3a547e46b1ef2b16a1e74c533aacb3471`).
// The remediation that holds the SHA: every non-Bayern state's
// systemBlock prepends an override block that explicitly invalidates
// Bayern-specific examples for the active state. State systemBlocks
// load AFTER the cached Bayern prefix, so "later instruction wins"
// LLM semantics push the override in front of any earlier Bayern
// example.
//
// Substantive vs stub: substantive states (Hessen, NRW, BW, NS) point
// the persona at the state-specific allow-list. Stub states (the
// other 11) point the persona at federal-only citations and the
// visible-gap rule, because their allowedCitations is `[]`.
// ───────────────────────────────────────────────────────────────────────

export interface AntiLeakArgs {
  /** German display label of the state (e.g. 'Hessen'). */
  labelDe: string
  /** English display label of the state (e.g. 'Hesse'). */
  labelEn: string
  /** State-LBO citation prefix used in the override text
   *  (e.g. 'HBO', 'BauO NRW', 'LBO', 'NBauO'). Stub states pass
   *  a best-effort prefix even though their allow-list is empty —
   *  the override directs the persona at federal law in that case. */
  codePrefix: string
  /** Substantive (Phase-12 content present) vs stub (allowedCitations: []). */
  isSubstantive: boolean
}

/**
 * Returns the DE + EN anti-Bayern-leak block that each non-Bayern
 * state's systemBlock prepends. Keep the wording assertive — the
 * persona ignores soft suggestions.
 */
export function buildAntiBayernLeakBlock(args: AntiLeakArgs): string {
  const { labelDe, labelEn, codePrefix, isSubstantive } = args

  const deCiteLine = isSubstantive
    ? `Zitiere ausschließlich ${codePrefix}-§§ aus der Allow-List weiter unten oder bundesrechtliche §§ (GEG, BauGB, BauNVO).`
    : `${labelDe}-spezifische Inhalte sind in Vorbereitung. Zitiere ausschließlich bundesrechtliche §§ (GEG, BauGB, BauNVO).`

  const deDeferLine = isSubstantive
    ? `Wenn keine spezifische ${codePrefix}-§ verfügbar ist: defer to einer in ${labelDe} eingetragenen Architekt:in (visible-gap-Regel).`
    : `Visible-gap-Regel: erkläre offen, dass detaillierter ${labelDe}-Inhalt in Vorbereitung ist und eine in ${labelDe} registrierte Architekt:in die Verfahrenseinordnung entscheidet.`

  const enCiteLine = isSubstantive
    ? `Cite only ${codePrefix} §§ from the allow-list below or federal §§ (GEG, BauGB, BauNVO).`
    : `${labelEn}-specific content is being authored. Cite only federal §§ (GEG, BauGB, BauNVO).`

  const enDeferLine = isSubstantive
    ? `If no specific ${codePrefix} § is available, defer to a ${labelEn}-registered architect (visible-gap rule).`
    : `Visible-gap rule: surface openly that detailed ${labelEn} content is in preparation and a ${labelEn}-registered architect will classify the procedure.`

  return `══════════════════════════════════════════════════════════════════════════
v1.0.6 BUG-5 OVERRIDE · ANTI-BAYERN-LEAK · LANDESREGEL ${labelDe.toUpperCase()}
══════════════════════════════════════════════════════════════════════════

DE: Du befindest dich in einem ${labelDe}-Projekt. Du zitierst NIEMALS
BayBO, BayDSchG, BayNatSchG oder andere bayernspezifische Art./Abs.
— weder als Hauptzitat, noch als Vergleichsanker, noch als "in
Bayern wäre das …"-Beispiel, noch als "vergleichbare Regelung".
Diese Regel überschreibt alle Bayern-Beispiele aus den Persona-
und Template-Shared-Schichten, die vor diesem Block geladen wurden.
${deCiteLine}
${deDeferLine}

EN: You are in a ${labelEn} project. NEVER cite BayBO, BayDSchG,
BayNatSchG, or any Bavaria-specific Art./Abs. — not as primary
citation, not as comparison anchor, not as "in Bavaria this would
be …" example, not as "comparable regulation". This rule OVERRIDES
any Bavaria-specific examples in the persona- and template-shared
layers that loaded above this block.
${enCiteLine}
${enDeferLine}

══════════════════════════════════════════════════════════════════════════
`
}
