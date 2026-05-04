// ───────────────────────────────────────────────────────────────────────
// Phase 7 Move 5 — Law-article registry
//
// Map from regex match → display short-form + i18n key + (optional)
// external href. Each entry corresponds to a citation that the system
// prompt may produce. parseCitations consults the registry on every
// match; unrecognised citations stay as plain bold text so the chip
// system never breaks readability.
//
// Adding a new article = one row here + three i18n keys
// (chat.law.<key>.{head, title, summary}). Display string is the
// post-§ canonical form ("34 BauGB" — the rendered "§" comes from
// CitationChip's leading glyph).
// ───────────────────────────────────────────────────────────────────────

export interface LawArticle {
  /** Regex applied to a single citation token (e.g. "§ 34 BauGB"). */
  match: RegExp
  /** Canonical short form rendered inside the chip (no leading "§"). */
  display: string
  /** Path under chat.law.* — three sibling keys: head, title, summary. */
  i18nKey: string
  /** External reference URL (gesetze-im-internet.de etc.). Optional. */
  href?: string
}

export const LAW_ARTICLES: LawArticle[] = [
  {
    match: /\b§\s?30\s+BauGB\b/,
    display: '30 BauGB',
    i18nKey: 'baugb.30',
    href: 'https://www.gesetze-im-internet.de/bbaug/__30.html',
  },
  {
    match: /\b§\s?34\s+BauGB\b/,
    display: '34 BauGB',
    i18nKey: 'baugb.34',
    href: 'https://www.gesetze-im-internet.de/bbaug/__34.html',
  },
  {
    match: /\b§\s?35\s+BauGB\b/,
    display: '35 BauGB',
    i18nKey: 'baugb.35',
    href: 'https://www.gesetze-im-internet.de/bbaug/__35.html',
  },
  {
    match: /\bArt\.?\s?2\s+BayBO\b/,
    display: '2 BayBO',
    i18nKey: 'baybo.2',
    href: 'https://www.gesetze-bayern.de/Content/Document/BayBO-2',
  },
  {
    match: /\bArt\.?\s?57\s+BayBO\b/,
    display: '57 BayBO',
    i18nKey: 'baybo.57',
    href: 'https://www.gesetze-bayern.de/Content/Document/BayBO-57',
  },
  {
    match: /\bArt\.?\s?58\s+BayBO\b/,
    display: '58 BayBO',
    i18nKey: 'baybo.58',
    href: 'https://www.gesetze-bayern.de/Content/Document/BayBO-58',
  },
  {
    match: /\bArt\.?\s?59\s+BayBO\b/,
    display: '59 BayBO',
    i18nKey: 'baybo.59',
    href: 'https://www.gesetze-bayern.de/Content/Document/BayBO-59',
  },
  {
    match: /\bArt\.?\s?6\s+BayDSchG\b/,
    display: '6 BayDSchG',
    i18nKey: 'baydschg.6',
  },
  {
    match: /\b§\s?3\s+BaumschutzV\b/,
    display: '3 BaumschutzV',
    i18nKey: 'baumschutzv.3',
  },
]
