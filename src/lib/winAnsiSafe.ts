// ───────────────────────────────────────────────────────────────────────
// Phase 3.6 #73 — WinAnsi-safe text sanitizer
//
// pdf-lib's standard Helvetica family is WinAnsi-encoded (Latin-1
// only). Characters outside that range — em dash, en dash, smart
// quotes, ellipsis, arrows, non-breaking space variants, zero-width
// joiners — throw `Error: WinAnsi cannot encode 0x…` from drawText.
//
// This sanitizer maps the common offenders to safe ASCII equivalents.
// Applied only on the fontLoader fallback path (when brand TTFs aren't
// shipped). When TTFs are present, fontkit handles full Unicode and
// the sanitizer is bypassed.
// ───────────────────────────────────────────────────────────────────────

const REPLACEMENTS: Array<[RegExp, string]> = [
  // Dashes
  [/[—―]/g, '-'], // em dash, horizontal bar
  [/[‒–]/g, '-'], // figure dash, en dash
  [/[‐‑]/g, '-'], // hyphen, non-breaking hyphen
  // Quotes
  [/[‘’‚‛]/g, "'"], // ‘ ’ ‚ ‛
  [/[“”„‟]/g, '"'], // “ ” „ ‟
  // Ellipsis + bullets + interpunct preserve
  [/…/g, '...'], // …
  [/•/g, '-'], // •
  // Arrows
  [/→/g, '->'], // →
  [/←/g, '<-'], // ←
  [/↑/g, '^'], // ↑
  [/↓/g, 'v'], // ↓
  // Whitespace edge cases — regexes match NBSP and zero-width by codepoint.
  /* eslint-disable no-irregular-whitespace */
  [/ /g, ' '], // nbsp → space (WinAnsi has nbsp at 0xA0 but pdf-lib's Helvetica WinAnsi mapping is fussy)
  [/​|‌|‍|﻿/g, ''], // zero-widths
  /* eslint-enable no-irregular-whitespace */
  // Common ligatures pdf-lib's Helvetica often refuses
  [/ﬁ/g, 'fi'], // ﬁ
  [/ﬂ/g, 'fl'], // ﬂ
]

/**
 * Map common Unicode characters to their nearest WinAnsi-safe ASCII
 * equivalent. Idempotent on already-safe input. Falls through unmapped
 * codepoints — at least the WinAnsi-supported ones (Latin-1) survive
 * untouched; the remainder may still throw, but the hot path (literal
 * em dashes in our own copy + smart quotes from model output) is
 * covered.
 */
export function winAnsiSafe(text: string): string {
  let out = text
  for (const [pattern, replacement] of REPLACEMENTS) {
    out = out.replace(pattern, replacement)
  }
  return out
}
