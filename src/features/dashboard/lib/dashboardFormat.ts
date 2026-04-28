/**
 * Phase 3.3 #47 — locale-aware formatting helpers shared by the
 * dashboard welcome sentence and the per-project activity meta line.
 */

const NUMBER_WORDS_DE: Record<number, string> = {
  1: 'Ein',
  2: 'Zwei',
  3: 'Drei',
  4: 'Vier',
  5: 'Fünf',
  6: 'Sechs',
  7: 'Sieben',
  8: 'Acht',
  9: 'Neun',
  10: 'Zehn',
  11: 'Elf',
  12: 'Zwölf',
}

/**
 * 1..12 → German number word with capitalised first letter
 * 13+    → numeric digit string
 */
export function germanNumberWord(n: number): string {
  if (n in NUMBER_WORDS_DE) return NUMBER_WORDS_DE[n]
  return String(n)
}

export type Lang = 'de' | 'en'

export interface ProjectsCountSummary {
  count: number
  lang: Lang
}

/**
 * "Drei laufende Projekte." / "Three ongoing projects." Singular /
 * plural handled per locale.
 */
export function formatProjectsCount({ count, lang }: ProjectsCountSummary): string {
  if (lang === 'de') {
    if (count === 1) return 'Ein laufendes Projekt.'
    return `${germanNumberWord(count)} laufende Projekte.`
  }
  if (count === 1) return '1 ongoing project.'
  return `${count} ongoing projects.`
}

/**
 * Locale-aware relative timestamp. Same day → "heute, HH:mm".
 * Previous calendar day → "gestern, HH:mm". Else absolute date.
 */
export function formatRelativeOrAbsolute(iso: string, lang: Lang): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''

  const now = new Date()
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()

  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  const isYesterday =
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate()

  const time = d.toLocaleTimeString(lang === 'en' ? 'en-GB' : 'de-DE', {
    hour: '2-digit',
    minute: '2-digit',
  })

  if (sameDay) {
    return lang === 'en' ? `today, ${time}` : `heute, ${time}`
  }
  if (isYesterday) {
    return lang === 'en' ? `yesterday, ${time}` : `gestern, ${time}`
  }
  return d.toLocaleDateString(lang === 'en' ? 'en-GB' : 'de-DE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const ROMAN_NUMERALS = [
  'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X',
  'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX',
  'XXI', 'XXII', 'XXIII', 'XXIV', 'XXV', 'XXVI', 'XXVII', 'XXVIII', 'XXIX', 'XXX',
  'XXXI', 'XXXII', 'XXXIII', 'XXXIV', 'XXXV', 'XXXVI', 'XXXVII', 'XXXVIII', 'XXXIX', 'XL',
  'XLI', 'XLII', 'XLIII', 'XLIV', 'XLV', 'XLVI', 'XLVII', 'XLVIII', 'XLIX', 'L',
]

export function romanFor(index1Based: number): string {
  return ROMAN_NUMERALS[index1Based - 1] ?? String(index1Based)
}

/**
 * First-name extraction per Q4: profile.full_name → first word; else
 * email local-part with first letter capitalised; else null (caller
 * renders the bare "Willkommen." headline).
 */
export function welcomeName(
  fullName: string | null | undefined,
  email: string | null | undefined,
): string | null {
  const trimmed = fullName?.trim()
  if (trimmed) {
    const first = trimmed.split(/\s+/)[0]
    if (first) return first
  }
  if (email) {
    const local = email.split('@')[0] ?? ''
    if (!local) return null
    // If local part starts with a non-letter, fall through to bare headline.
    if (!/^[A-Za-zÄÖÜäöüß]/.test(local)) return null
    return local.charAt(0).toUpperCase() + local.slice(1)
  }
  return null
}
