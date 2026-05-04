// ───────────────────────────────────────────────────────────────────────
// Phase 7 Pass 2 — Citation parser (rewrite)
//
// Walks an assistant-message body, finds law citations via a permissive
// outer regex, and for each match emits one or more <CitationChip />
// components — one per article number in the citation.
//
// Behaviour:
//   • "§ 34 BauGB"               → 1 chip (§ 34 BauGB)
//   • "§34 BauGB"                → 1 chip (no whitespace after §)
//   • "Art. 2 Abs. 3 BayBO"      → 1 chip on the article number (2);
//                                  Abs. is treated as a sub-section,
//                                  not a separate article.
//   • "§§ 30, 34 or 35 BauGB"    → 3 chips (§ 30 BauGB · § 34 BauGB
//                                  · § 35 BauGB), back-to-back.
//
// Registry lookup is by canonical "<articleNumber> <abbrev>" display
// string. Articles not in LAW_ARTICLES still render as bold (v1
// fallback) so unknown citations stay legible.
// ───────────────────────────────────────────────────────────────────────

import type { ReactNode } from 'react'
import { CitationChip } from '../components/CitationChip'
import { LAW_ARTICLES, type LawArticle } from './lawArticles'

const LAW_ABBREVS =
  '(?:BauGB|BayBO|BauNVO|BayDSchG|BayNatSchG|BNatSchG|GEG|GaStellV|BayBauVorlV|BaumschutzV)'

// Outer detection regex — captures whole citation tokens. Permissive on
// whitespace after § / Art. so both "§ 34 BauGB" and "§34 BauGB" match.
// The middle character class includes period so "Abs." sub-section
// references inside a citation are absorbed into the same token.
const CITATION_REGEX = new RegExp(
  `((?:§§?|Art\\.)[\\s\\u00A0]*[\\d\\w.,\\s]+?[\\s\\u00A0]+${LAW_ABBREVS})`,
  'g',
)

const ABBREV_TAIL = new RegExp(`(${LAW_ABBREVS})$`)

function normaliseSpacing(part: string): string {
  return part
    .replace(/§§\s+/g, '§§ ')
    .replace(/§\s+/g, '§ ')
    .replace(/Art\.\s+/g, 'Art. ')
    .trim()
}

function findArticle(num: string, abbrev: string): LawArticle | null {
  const display = `${num} ${abbrev}`
  return LAW_ARTICLES.find((a) => a.display === display) ?? null
}

interface Expansion {
  kind: 'chip' | 'bold'
  article: LawArticle | null
  text: string
}

function expandCitation(token: string): Expansion[] {
  const abbrevMatch = token.match(ABBREV_TAIL)
  const abbrev = abbrevMatch ? abbrevMatch[1] : null
  if (!abbrev) return [{ kind: 'bold', article: null, text: token }]

  const isMulti = /^§§/.test(token)
  const numbers = token.match(/\d+/g) ?? []

  if (numbers.length === 0) {
    return [{ kind: 'bold', article: null, text: token }]
  }

  const [first, ...rest] = numbers
  if (!isMulti) {
    // Single-form: first number is the article; ignore Abs. sub-section
    // numbers that may follow. Display preserves the original token so
    // "Art. 2 Abs. 3 BayBO" still reads naturally inside the chip.
    void rest
    if (!first) return [{ kind: 'bold', article: null, text: token }]
    const article = findArticle(first, abbrev)
    return [
      article
        ? { kind: 'chip', article, text: token }
        : { kind: 'bold', article: null, text: token },
    ]
  }

  // Multi-form (§§): every number is its own article reference.
  return numbers.map((num) => {
    const article = findArticle(num, abbrev)
    const text = `§ ${num} ${abbrev}`
    if (article) return { kind: 'chip' as const, article, text }
    return { kind: 'bold' as const, article: null, text }
  })
}

export function parseCitations(text: string): ReactNode[] {
  if (!text) return []
  const parts = text.split(CITATION_REGEX)
  const out: ReactNode[] = []
  parts.forEach((part, idx) => {
    if (idx % 2 === 0) {
      out.push(part)
      return
    }
    const expansions = expandCitation(normaliseSpacing(part))
    expansions.forEach((e, i) => {
      const key = `cite-${idx}-${i}`
      if (i > 0) out.push(' ')
      if (e.kind === 'chip' && e.article) {
        out.push(<CitationChip key={key} article={e.article} />)
      } else {
        out.push(
          <span key={key} className="font-medium text-ink">
            {e.text}
          </span>,
        )
      }
    })
  })
  return out
}
