import type { ReactNode } from 'react'

/**
 * Auto-detect German law citations in a body of text and render them in
 * font-medium with non-breaking spaces inside the paragraph mark, so a
 * line break never lands between "§" and "34". Matches:
 *
 *   • § 34 BauGB
 *   • §§ 30, 35 BauGB
 *   • Art. 57 BayBO
 *   • Art. 6 Abs. 1 BayBO
 *   • Art. 44a BayBO
 *
 * Restraint over completeness — the regex covers the abbreviations our
 * v1 system prompt cites; obscure lookups still render as plain text.
 */

const LAW_ABBREVS = '(?:BauGB|BayBO|BauNVO|BayDSchG|BayNatSchG|BNatSchG|GEG|GaStellV|BayBauVorlV)'

const CITATION_REGEX = new RegExp(
  `((?:§§?|Art\\.)[\\s\\u00A0]+[\\d\\w.,\\s]+?[\\s\\u00A0]+${LAW_ABBREVS})`,
  'g',
)

export function highlightCitations(text: string): ReactNode[] {
  if (!text) return []
  const parts = text.split(CITATION_REGEX)
  return parts.map((part, idx) => {
    // Even indices are surrounding text; odd indices are matched citations.
    if (idx % 2 === 0) return part
    const withNbsp = part
      .replace(/§§\s+/g, '§§ ')
      .replace(/§\s+/g, '§ ')
      .replace(/Art\.\s+/g, 'Art. ')
    return (
      <span key={idx} className="font-medium text-ink">
        {withNbsp}
      </span>
    )
  })
}
