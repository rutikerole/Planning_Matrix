// ───────────────────────────────────────────────────────────────────────
// pre-test #2 (MV walk) — Stadtarchiv archive-label resolution for the PDF
// Area-A planning-law caveat.
//
// The ONLY reliable city signal in a free-form project address is the
// "PLZ City" pattern (e.g. "…, 18055 Rostock" → "Rostock"). Address ordering
// is NOT reliable ("Straße 14, Stadt" AND "Stadt, Straße 14" both occur), so a
// comma-segment guess could name a street as a city. When no PLZ is present we
// therefore do NOT fall back to the state-capital archive (that was the bug:
// "Stadtarchiv Schwerin" on a Rostock project, for every state) — we genericize
// to "the local Stadtarchiv" so the caveat is never wrong.
// ───────────────────────────────────────────────────────────────────────

/** City from a "… PLZ City" address tail, or null if no PLZ-anchored city. */
export function cityFromPlotAddress(plotAddress: string | null | undefined): string | null {
  const m = (plotAddress ?? '').match(
    /\b\d{5}\s+([A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß .\-/]*?)\s*$/u,
  )
  const city = m?.[1]?.trim()
  return city && city.length > 0 ? city : null
}

/**
 * The archive label for the Area-A caveat: a specific "Stadtarchiv <City>" when
 * the city is high-confidence (PLZ-anchored), else a generic local reference —
 * NEVER the state capital, which would confidently name the wrong city.
 */
export function resolveArchiveLabel(
  plotAddress: string | null | undefined,
  lang: 'de' | 'en',
): string {
  const city = cityFromPlotAddress(plotAddress)
  if (city) return `Stadtarchiv ${city}`
  return lang === 'en' ? 'the local Stadtarchiv' : 'dem örtlichen Stadtarchiv'
}
