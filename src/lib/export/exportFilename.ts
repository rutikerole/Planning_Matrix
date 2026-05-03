/**
 * Phase 3.4 #55 — slug helper for download filenames.
 *
 * Lowercase ASCII slug + ISO-style date suffix. Diacritics stripped via
 * NFKD; non-letters/digits collapsed to single dashes. Capped at 64
 * chars so the filename stays manageable. Date is current local YYYY-MM-DD.
 */
export function buildExportFilename(projectName: string, ext: 'pdf' | 'md' | 'json'): string {
  const slug =
    projectName
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 64) || 'projekt'
  const today = new Date().toISOString().slice(0, 10)
  return `${slug}-${today}.${ext}`
}
