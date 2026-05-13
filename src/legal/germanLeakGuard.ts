// ───────────────────────────────────────────────────────────────────────
// v1.0.22 Bug K — runtime guard against German content on EN exports.
//
// The v1.0.20 Berlin × T-01 PDF EN export contained German persona
// output on page 4:
//   "Zwei harte Blocker festgestellt: MK-Gebietsart (§ 7 BauNVO) und
//    Ensemble-Denkmalschutz."
//   "Voranfrage-Strategie beschlossen."
//   "Denkmalschutz als harter Blocker identifiziert — denkmalrechtliche
//    Erlaubnis erforderlich."
//
// These strings are NOT in the source code — they come from the chat
// persona at runtime. The persona emits both _de and _en fields for
// recommendations, but occasionally emits German content in the _en
// field (prompt drift). This guard catches that at PDF render time.
//
// Behaviour:
//   • When lang === 'en' AND the text contains ≥ 2 high-confidence
//     German content tokens, return an honest placeholder.
//   • Conservative token list — proper-noun anchors (Bauamt, Bauherr)
//     are excluded because they legitimately appear in EN text. We
//     match on verb forms + suffixes that DO NOT appear in correct EN.
// ───────────────────────────────────────────────────────────────────────

const GERMAN_CONTENT_TOKENS: ReadonlyArray<RegExp> = [
  // High-confidence verb forms — these never appear in correct EN.
  /\bfestgestellt\b/i,
  /\bbeschlossen\b/i,
  /\bidentifiziert\b/i,
  /\berforderlich\b/i,
  /\bbestätigt\b/i,
  /\bvorhanden\b/i,
  /\bvorgesehen\b/i,
  /\bzulässig\b/i,
  /\bgenehmigt\b/i,
  // German content nouns with German morphology.
  /\bdenkmalrechtliche\b/i,
  /\bdenkmalrechtlicher\b/i,
  /\bGebäudehülle\b/i,
  /\bBauvorhaben\b/i,
  /\bVorhabensbeschreibung\b/i,
  /\bWohnbauflächen\b/i,
  /\bVerfahrensart\b/i,
  /\bVerfahrensfreiheit\b/i,
  /\bVoranfrage-Strategie\b/i,
  /\bWärmeschutznachweis\b/i,
  /\bAbstandsflächen\b/i,
  // German articles / function words that don't appear in EN.
  /\b(?:für\s+die|für\s+den|für\s+das)\b/i,
  /\b(?:bei\s+der|bei\s+dem|bei\s+den)\b/i,
  /\b(?:mit\s+der|mit\s+dem|mit\s+den)\b/i,
  /\b(?:vor\s+der|vor\s+dem|vor\s+Beginn)\b/i,
  /\b(?:nach\s+der|nach\s+dem|nach\s+§)\b/i,
] as const

/** Threshold of token hits before the guard fires. Two is the
 *  sweet spot: a single hit could be a borrowed German legal term
 *  ("Bauamt", "Bebauungsplan") that legitimately appears in EN
 *  text. Two distinct hits are very unlikely in correct EN. */
const FIRE_THRESHOLD = 2

const EN_PLACEHOLDER = '(German content; English translation pending)'

/**
 * Sanitize a string against German content on EN exports. Returns
 * the input unchanged when lang === 'de' or when fewer than the
 * threshold German tokens hit. On a hit, logs a console warning and
 * returns the honest placeholder so the bauherr sees an explicit
 * gap rather than a confusing mixed-language string.
 */
export function sanitizeGermanContentOnEnglish(
  text: string,
  lang: 'de' | 'en',
): string {
  if (lang === 'de' || !text) return text
  let hits = 0
  for (const rx of GERMAN_CONTENT_TOKENS) {
    if (rx.test(text)) {
      hits++
      if (hits >= FIRE_THRESHOLD) break
    }
  }
  if (hits >= FIRE_THRESHOLD) {
    if (typeof console !== 'undefined') {
      console.warn(
        '[germanLeakGuard] EN export carries German content; replacing with placeholder. Original:',
        text.slice(0, 120),
      )
    }
    return EN_PLACEHOLDER
  }
  return text
}
