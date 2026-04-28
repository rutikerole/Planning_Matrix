// ───────────────────────────────────────────────────────────────────────
// RoleGlyphs — title→key heuristic
//
// Extracted from RoleGlyphs.tsx so the component file only exports
// components (Fast-Refresh friendly).
// ───────────────────────────────────────────────────────────────────────

/**
 * Heuristic: map a role title (German) to the glyph key. Pattern-based;
 * falls through to `bauamt` for any obvious "amt/behörde" mention,
 * `architekt` for any "architekt:in", etc. Returns the safest default
 * (`architekt`) when no confident match — caller may render the dot
 * fallback for null returns from upstream lookups.
 */
export function inferRoleGlyphKey(titleDe: string): string {
  const t = titleDe.toLowerCase()
  if (/architekt|bauvorlageberechtigt/.test(t)) return 'architekt'
  if (/tragwerk|statik/.test(t)) return 'tragwerksplaner'
  if (/energieberat|w(ä|ae)rmeschutz|energie/.test(t)) return 'energieberater'
  if (/vermess/.test(t)) return 'vermesser'
  if (/brandschutz/.test(t)) return 'brandschutzplaner'
  if (/bauamt|beh(ö|oe)rde|amt/.test(t)) return 'bauamt'
  return 'architekt' // safest default for "Fachplaner"-style entries
}
