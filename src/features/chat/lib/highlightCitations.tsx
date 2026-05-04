// ───────────────────────────────────────────────────────────────────────
// Phase 7 Move 5 — Citation rendering (delegate to parseCitations).
//
// `highlightCitations` keeps its pre-Phase-7 export name + signature so
// the single call site in Typewriter.tsx:87 doesn't change. Internally
// the function now delegates to parseCitations, which renders matches
// in the LAW_ARTICLES registry as interactive <CitationChip /> popovers
// and falls back to the original bold-span rendering for citations
// that match the regex but aren't yet in the registry.
//
// Pre-Phase-7 behaviour for unknown citations is preserved verbatim —
// non-breaking-space normalisation + `font-medium text-ink` span — so
// any rendering that wasn't already a chip looks identical.
// ───────────────────────────────────────────────────────────────────────

import type { ReactNode } from 'react'
import { parseCitations } from './parseCitations'

export function highlightCitations(text: string): ReactNode[] {
  return parseCitations(text)
}
