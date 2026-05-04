// ───────────────────────────────────────────────────────────────────────
// Phase 7 Move 5 — Citation parser
//
// Walks an assistant-message body, finds law citations via the same
// permissive regex highlightCitations has used since Phase 3, and for
// each match consults LAW_ARTICLES to decide whether to render the
// hit as an interactive <CitationChip /> or as plain bold text.
//
// Behavior contract:
//   • Recognised citation (regex match AND in LAW_ARTICLES) → chip.
//   • Recognised citation (regex match, NOT in registry)    → bold.
//   • Plain text segments pass through unchanged.
//
// The regex itself is unchanged from highlightCitations.tsx so the
// detection breadth doesn't regress; BaumschutzV is added as a
// recognised abbreviation since it's now in the registry.
// ───────────────────────────────────────────────────────────────────────

import type { ReactNode } from 'react'
import { CitationChip } from '../components/CitationChip'
import { LAW_ARTICLES } from './lawArticles'

const LAW_ABBREVS =
  '(?:BauGB|BayBO|BauNVO|BayDSchG|BayNatSchG|BNatSchG|GEG|GaStellV|BayBauVorlV|BaumschutzV)'

const CITATION_REGEX = new RegExp(
  `((?:§§?|Art\\.)[\\s\\u00A0]+[\\d\\w.,\\s]+?[\\s\\u00A0]+${LAW_ABBREVS})`,
  'g',
)

/**
 * Whitespace normaliser kept identical to the v1 highlightCitations
 * post-processor so existing prose renders the same — collapses any
 * trailing whitespace after `§§`, `§`, and `Art.` into a single space.
 */
function normaliseSpacing(part: string): string {
  return part
    .replace(/§§\s+/g, '§§ ')
    .replace(/§\s+/g, '§ ')
    .replace(/Art\.\s+/g, 'Art. ')
}

/**
 * Returns the registry entry whose pattern matches the citation
 * token, or null if none does.
 */
function findArticle(citation: string) {
  for (const a of LAW_ARTICLES) {
    if (a.match.test(citation)) return a
  }
  return null
}

export function parseCitations(text: string): ReactNode[] {
  if (!text) return []
  const parts = text.split(CITATION_REGEX)
  return parts.map((part, idx) => {
    // Even indices are surrounding text; odd indices are matched citations.
    if (idx % 2 === 0) return part
    const normalised = normaliseSpacing(part)
    const article = findArticle(normalised)
    if (article) {
      return <CitationChip key={idx} article={article} />
    }
    // Recognised by the citation regex but not in the registry —
    // fall back to the v1 bold rendering so unknown articles stay
    // legible rather than disappearing.
    return (
      <span key={idx} className="font-medium text-ink">
        {normalised}
      </span>
    )
  })
}
