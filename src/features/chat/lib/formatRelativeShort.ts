/**
 * Phase 3.4 #59 — short relative timestamp helper for the Auto-saved
 * indicator. "vor 12 Sek." / "12s ago" — small, calm, untranslated
 * the moment a turn lands.
 */
export function formatRelativeShort(date: Date | null, lang: 'de' | 'en'): string {
  if (!date) return ''
  const now = Date.now()
  const elapsedSeconds = Math.max(0, Math.floor((now - date.getTime()) / 1000))

  if (elapsedSeconds < 60) {
    return lang === 'en' ? `${elapsedSeconds}s ago` : `vor ${elapsedSeconds} Sek.`
  }
  const minutes = Math.floor(elapsedSeconds / 60)
  if (minutes < 60) {
    return lang === 'en' ? `${minutes}m ago` : `vor ${minutes} Min.`
  }
  const hours = Math.floor(minutes / 60)
  if (hours < 24) {
    return lang === 'en' ? `${hours}h ago` : `vor ${hours} Std.`
  }
  const days = Math.floor(hours / 24)
  return lang === 'en' ? `${days}d ago` : `vor ${days} Tag${days === 1 ? '' : 'en'}.`
}
