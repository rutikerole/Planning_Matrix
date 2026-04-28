/**
 * Phase 3.5 #61 — public-source URL lookup for cited articles.
 *
 * The legal landscape (Section IV) makes each article row clickable
 * → a small popover that shows where the user can read the original
 * statute. This is a static lookup; nothing fancy.
 *
 * Keys are normalized: lowercase, no whitespace. The matcher accepts
 * "BayBO Art. 58", "BayBO Art 58", "art58baybo" etc.
 */
export interface LegalCitation {
  /** Display label, e.g. `Art. 58 BayBO`. */
  label: string
  /** Public-source URL. */
  href: string
}

const TABLE: Array<{ pattern: RegExp; cite: LegalCitation }> = [
  // BayBO — gesetze-bayern.de
  {
    pattern: /baybo\s*art\.?\s*2\b/i,
    cite: {
      label: 'BayBO Art. 2',
      href: 'https://www.gesetze-bayern.de/Content/Document/BayBO-2',
    },
  },
  {
    pattern: /baybo\s*art\.?\s*6\b/i,
    cite: {
      label: 'BayBO Art. 6',
      href: 'https://www.gesetze-bayern.de/Content/Document/BayBO-6',
    },
  },
  {
    pattern: /baybo\s*art\.?\s*47\b/i,
    cite: {
      label: 'BayBO Art. 47',
      href: 'https://www.gesetze-bayern.de/Content/Document/BayBO-47',
    },
  },
  {
    pattern: /baybo\s*art\.?\s*57\b/i,
    cite: {
      label: 'BayBO Art. 57',
      href: 'https://www.gesetze-bayern.de/Content/Document/BayBO-57',
    },
  },
  {
    pattern: /baybo\s*art\.?\s*58\b/i,
    cite: {
      label: 'BayBO Art. 58',
      href: 'https://www.gesetze-bayern.de/Content/Document/BayBO-58',
    },
  },
  {
    pattern: /baybo\s*art\.?\s*60\b/i,
    cite: {
      label: 'BayBO Art. 60',
      href: 'https://www.gesetze-bayern.de/Content/Document/BayBO-60',
    },
  },
  {
    pattern: /baybo\s*art\.?\s*61\b/i,
    cite: {
      label: 'BayBO Art. 61',
      href: 'https://www.gesetze-bayern.de/Content/Document/BayBO-61',
    },
  },
  // BauGB — gesetze-im-internet.de
  {
    pattern: /baugb\s*§\s*30\b/i,
    cite: {
      label: '§ 30 BauGB',
      href: 'https://www.gesetze-im-internet.de/bbaug/__30.html',
    },
  },
  {
    pattern: /baugb\s*§\s*34\b/i,
    cite: {
      label: '§ 34 BauGB',
      href: 'https://www.gesetze-im-internet.de/bbaug/__34.html',
    },
  },
  {
    pattern: /baugb\s*§\s*35\b/i,
    cite: {
      label: '§ 35 BauGB',
      href: 'https://www.gesetze-im-internet.de/bbaug/__35.html',
    },
  },
  // BauNVO
  {
    pattern: /baunvo/i,
    cite: {
      label: 'BauNVO',
      href: 'https://www.gesetze-im-internet.de/baunvo/',
    },
  },
  // GEG
  {
    pattern: /\bgeg\b/i,
    cite: {
      label: 'GEG 2024',
      href: 'https://www.gesetze-im-internet.de/geg/',
    },
  },
  // Bayerisches Denkmalschutzgesetz
  {
    pattern: /baydschg|denkmalschutz/i,
    cite: {
      label: 'BayDSchG',
      href: 'https://www.gesetze-bayern.de/Content/Document/BayDSchG',
    },
  },
]

export function findCitation(text: string): LegalCitation | null {
  for (const entry of TABLE) {
    if (entry.pattern.test(text)) return entry.cite
  }
  return null
}
