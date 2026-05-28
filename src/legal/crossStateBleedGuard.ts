// ───────────────────────────────────────────────────────────────────────
// v1.0.21 — Cross-state bleed runtime guard.
//
// Belt-and-braces sanitizer for PDF section text. The Bug 23-family
// fixes (state-aware citation pack + state-aware risk filters) close
// the known leak sites; this guard catches future regressions and
// any persona-emitted output that names a state other than the
// project's bundesland.
//
// Behaviour: scan a rendered string for tokens that uniquely identify
// a Bundesland other than the active one. On a hit: log a console
// warning (dev visibility) AND replace the token with an honest
// generic fallback so the PDF never ships with cross-state text.
//
// The token list is conservative — only high-confidence state-unique
// markers. Generic terms ("Bauamt", "Denkmalbehörde") never trigger.
// Token list grows as we find new leak sites; coverage is verified by
// the smoke-pdf-text cross-state-bleed assertions.
// ───────────────────────────────────────────────────────────────────────

import type { BundeslandCode } from './states/_types'

interface BlockerToken {
  /** Bundesland the token uniquely belongs to. */
  state: BundeslandCode
  /** Regex matching the token in rendered text. */
  pattern: RegExp
  /** Honest generic replacement. Empty string drops the token. */
  replacement: string
}

const TOKENS: ReadonlyArray<BlockerToken> = [
  // Bayern-only tokens
  { state: 'bayern', pattern: /\bBayBO\b/g, replacement: 'state-LBO' },
  { state: 'bayern', pattern: /\bBayDSchG\b/g, replacement: 'state-DSchG' },
  { state: 'bayern', pattern: /\bBayNatSchG\b/g, replacement: 'state nature-protection act' },
  { state: 'bayern', pattern: /\bBLfD\b/g, replacement: 'state Landesdenkmalamt' },
  { state: 'bayern', pattern: /\bBayerisches Landesamt für Denkmalpflege\b/g, replacement: 'state Landesamt für Denkmalpflege' },
  { state: 'bayern', pattern: /\b(?:Schwabing|Maxvorstadt)\b/g, replacement: 'historic district' },
  { state: 'bayern', pattern: /\bStPlS\s*926\b/g, replacement: 'local Stellplatzsatzung' },
  // NRW-only tokens
  { state: 'nrw', pattern: /\bBauO\s+NRW\b/g, replacement: 'state-LBO' },
  { state: 'nrw', pattern: /\bBauVorlVO\s+NRW\b/g, replacement: 'state Bauvorlagenverordnung' },
  { state: 'nrw', pattern: /\bDSchG\s+NRW\b/g, replacement: 'state-DSchG' },
  { state: 'nrw', pattern: /\bStadtarchiv\s+Düsseldorf\b/g, replacement: 'local Stadtarchiv' },
  { state: 'nrw', pattern: /\bKönigsallee\b/g, replacement: 'street' },
  { state: 'nrw', pattern: /\bAKNW\b/g, replacement: 'state Architektenkammer' },
  { state: 'nrw', pattern: /\bIK-Bau\s+NRW\b/g, replacement: 'state Ingenieurkammer' },
  // BW-only tokens
  { state: 'bw', pattern: /\bLBO\s+BW\b/g, replacement: 'state-LBO' },
  { state: 'bw', pattern: /\bLBOVVO\s+BW\b/g, replacement: 'state Bauvorlagenverordnung' },
  // Hessen-only tokens
  { state: 'hessen', pattern: /\bHBO\b/g, replacement: 'state-LBO' },
  { state: 'hessen', pattern: /\bHDSchG\b/g, replacement: 'state-DSchG' },
  // Niedersachsen-only tokens
  { state: 'niedersachsen', pattern: /\bNBauO\b/g, replacement: 'state-LBO' },
  { state: 'niedersachsen', pattern: /\bNDSchG\b/g, replacement: 'state-DSchG' },
  // ── Bucket-C states (audit-remediation M4). Each has a (Bau)O law-short
  //    plus a DSchG variant the corpus references via ALLOWED_NOT_IN_CORPUS_
  //    LAWS_PER_STATE. Token list grows as new cross-state leaks land in
  //    PDF text. Order matters for LBauO: "LBauO M-V" MUST be tested before
  //    bare "LBauO" so the longer pattern wins greedy-leftmost.
  // Berlin (Stadtstaat)
  { state: 'berlin',         pattern: /\bBauO\s+Bln\b/g,   replacement: 'state-LBO' },
  { state: 'berlin',         pattern: /\bDSchG\s+Bln\b/g,  replacement: 'state-DSchG' },
  // Hamburg (Stadtstaat)
  { state: 'hamburg',        pattern: /\bHBauO\b/g,        replacement: 'state-LBO' },
  { state: 'hamburg',        pattern: /\bDSchG\s+HH\b/g,   replacement: 'state-DSchG' },
  // Bremen (Stadtstaat)
  { state: 'bremen',         pattern: /\bBremLBO\b/g,      replacement: 'state-LBO' },
  { state: 'bremen',         pattern: /\bDSchG\s+HB\b/g,   replacement: 'state-DSchG' },
  // Sachsen (Flächenland)
  { state: 'sachsen',        pattern: /\bSächsBO\b/g,      replacement: 'state-LBO' },
  { state: 'sachsen',        pattern: /\bSächsDSchG\b/g,   replacement: 'state-DSchG' },
  // Sachsen-Anhalt (Flächenland)
  { state: 'sachsen-anhalt', pattern: /\bBauO\s+LSA\b/g,   replacement: 'state-LBO' },
  { state: 'sachsen-anhalt', pattern: /\bDSchG\s+LSA\b/g,  replacement: 'state-DSchG' },
  // Thüringen (Flächenland)
  { state: 'thueringen',     pattern: /\bThürBO\b/g,       replacement: 'state-LBO' },
  { state: 'thueringen',     pattern: /\bThürDSchG\b/g,    replacement: 'state-DSchG' },
  // Schleswig-Holstein (Flächenland)
  { state: 'sh',             pattern: /\bLBO\s+SH\b/g,     replacement: 'state-LBO' },
  { state: 'sh',             pattern: /\bDSchG\s+SH\b/g,   replacement: 'state-DSchG' },
  // Brandenburg (Flächenland)
  { state: 'brandenburg',    pattern: /\bBbgBO\b/g,        replacement: 'state-LBO' },
  { state: 'brandenburg',    pattern: /\bBbgDSchG\b/g,     replacement: 'state-DSchG' },
  // Mecklenburg-Vorpommern (Flächenland) — MUST come BEFORE bare LBauO
  { state: 'mv',             pattern: /\bLBauO\s+M-V\b/g,  replacement: 'state-LBO' },
  { state: 'mv',             pattern: /\bDSchG\s+M-V\b/g,  replacement: 'state-DSchG' },
  // Rheinland-Pfalz (Flächenland) — bare LBauO, anchored not to match
  // "LBauO M-V"; \b after LBauO blocks matching when " M-V" follows.
  { state: 'rlp',            pattern: /\bLBauO\b(?!\s+M-V)/g, replacement: 'state-LBO' },
  { state: 'rlp',            pattern: /\bDSchG\s+RLP\b/g,  replacement: 'state-DSchG' },
  // Saarland (Flächenland) — note SDschG capitalisation
  { state: 'saarland',       pattern: /\bLBO\s+Saarland\b/g, replacement: 'state-LBO' },
  { state: 'saarland',       pattern: /\bSDschG\b/g,       replacement: 'state-DSchG' },
]

/**
 * Sanitize a string against cross-state bleed. Returns the input
 * unchanged if no tokens hit; otherwise logs a warning and returns
 * the sanitized version. Pass the active project's bundesland; tokens
 * matching that bundesland pass through.
 */
export function sanitizeCrossStateBleed(
  text: string,
  bundesland: BundeslandCode,
): string {
  if (!text) return text
  let out = text
  const hits: string[] = []
  for (const token of TOKENS) {
    if (token.state === bundesland) continue
    if (token.pattern.test(out)) {
      hits.push(token.pattern.toString())
      out = out.replace(token.pattern, token.replacement)
    }
  }
  if (hits.length > 0 && typeof console !== 'undefined') {
    console.warn(
      '[crossStateBleedGuard]',
      `bundesland=${bundesland}`,
      'removed cross-state tokens:',
      hits.join(', '),
    )
  }
  return out
}
