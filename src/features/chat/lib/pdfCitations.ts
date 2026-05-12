// ───────────────────────────────────────────────────────────────────────
// v1.0.18 — § citation → official legal-portal URL mapping.
//
// Every § citation rendered in the PDF (executive footer, area
// reasons, procedure rationales, glossary definitions) becomes a
// clickable hyperlink. Federal codes (BauGB, GEG, HOAI) map to
// gesetze-im-internet.de. State codes (BauO {state}) map to the
// respective state portal — known URL patterns per state in the
// switch below; absent states return null and render as plain text.
// ───────────────────────────────────────────────────────────────────────

/**
 * Regex matching a single § citation occurrence in body text.
 * Captures:
 *   [1] section number with optional letter (e.g. "62", "62a", "30")
 *   [2] code identifier ("BauGB", "GEG", "HOAI", "BauO NRW", etc.)
 *
 * Examples that match:
 *   "§ 30 BauGB"
 *   "§ 62 BauO NRW"
 *   "§ 62/64 BauO {state}"  (only the first number matches; the
 *     compose-from-citations helper splits these up-front)
 *   "§ 48 GEG"
 */
export const CITATION_REGEX = /§\s*(\d+[a-z]?)\s+(BauGB|GEG|HOAI|BauO\s+[A-ZÄÖÜ-]+)/g

/**
 * Maps state bundesland codes (lowercase) to their legal portal
 * URL patterns. {section} is the captured section number. Returns
 * null for states where we don't yet have a precise URL pattern.
 */
function stateBauOUrl(bundeslandKey: string, section: string): string | null {
  // Normalize: BauO NRW → state key 'nrw'
  const key = bundeslandKey.toLowerCase().replace(/\s+/g, '')
  // The state-portal URLs vary in their per-§ anchor structure;
  // for states with a single landing-page URL we link there and
  // accept that the user must scroll to the right § themselves.
  const PORTALS: Record<string, string> = {
    nrw: `https://recht.nrw.de/lmi/owa/br_text_anzeigen?v_id=10000000000000000724`,
    bayern: `https://www.gesetze-bayern.de/Content/Document/BayBO-${section}`,
    bw: `https://www.landesrecht-bw.de/perma?d=jlr-BauOBW2010pP${section}`,
    niedersachsen: `https://voris.wolterskluwer-online.de/browse/document/bs/JURIS:nds_bauo_ges_2012_p${section}`,
    hessen: `https://www.rv.hessenrecht.hessen.de/bshe/document/jlr-BauOHE2018rahmen`,
    berlin: `https://gesetze.berlin.de/perma?d=jlr-BauOBE2005pP${section}`,
    hamburg: `https://www.landesrecht-hamburg.de/bsha/document/jlr-BauOHA2005rahmen`,
    bremen: `https://www.transparenz.bremen.de/sixcms/detail.php?gsid=bremen2014_tp.c.71692.de`,
    sh: `https://www.gesetze-rechtsprechung.sh.juris.de/perma?d=jlr-BauOSH2009pP${section}`,
    mv: `https://www.landesrecht-mv.de/bsmv/document/jlr-BauOMV2015rahmen`,
    brandenburg: `https://bravors.brandenburg.de/gesetze/bbgbo_2016`,
    rlp: `https://landesrecht.rlp.de/perma?d=jlr-BauOOdRP2015pP${section}`,
    saarland: `https://recht.saarland.de/bssl/document/jlr-BauOSL2015rahmen`,
    sachsen: `https://www.revosax.sachsen.de/vorschrift/14888-Saechsische-Bauordnung`,
    'sachsen-anhalt': `https://www.landesrecht.sachsen-anhalt.de/perma?d=jlr-BauOST2013pP${section}`,
    thueringen: `https://landesrecht.thueringen.de/perma?d=jlr-BauOTH2014pP${section}`,
  }
  return PORTALS[key] ?? null
}

/**
 * v1.0.18 — citation → URL mapping. Federal codes (BauGB/GEG/HOAI)
 * always resolve. State codes (BauO {state}) require a known
 * portal entry — returns null otherwise so the renderer can fall
 * back to plain text.
 *
 * `bundeslandFallback` is used when the citation reads as
 * "BauO {state}" with {state} unresolved (the placeholder pattern
 * the renderer substitutes before this function sees it).
 */
export function citationToUrl(
  citation: string,
  bundeslandFallback?: string,
): string | null {
  const trimmed = citation.trim()
  // Federal codes — direct pattern match
  const fed = trimmed.match(/^§\s*(\d+[a-z]?)\s+(BauGB|GEG|HOAI)$/)
  if (fed) {
    const section = fed[1]
    const code = fed[2].toLowerCase()
    if (code === 'baugb') return `https://www.gesetze-im-internet.de/baugb/__${section}.html`
    if (code === 'geg') return `https://www.gesetze-im-internet.de/geg/__${section}.html`
    if (code === 'hoai') return `https://www.gesetze-im-internet.de/hoai_2013/__${section}.html`
  }
  // State BauO codes
  const state = trimmed.match(/^§\s*(\d+[a-z]?)\s+BauO\s+([A-ZÄÖÜa-zäöü-]+)$/)
  if (state) {
    const section = state[1]
    const stateKey = state[2] === '{state}' ? bundeslandFallback ?? '' : state[2]
    return stateBauOUrl(stateKey, section)
  }
  return null
}

/**
 * Extract every § citation from `text`. Returns occurrences with
 * their string-index range + the resolved URL (or null when no
 * portal pattern matches). Renderers use this to overlay link
 * annotations on the rendered glyph rects.
 */
export interface CitationMatch {
  /** Full matched substring, e.g. "§ 30 BauGB". */
  text: string
  /** Start index in source string. */
  start: number
  /** End index (exclusive). */
  end: number
  /** Resolved URL or null. */
  url: string | null
}

export function findCitations(
  text: string,
  bundeslandFallback?: string,
): CitationMatch[] {
  // Reset regex state — CITATION_REGEX has the `g` flag and shares
  // lastIndex across calls.
  CITATION_REGEX.lastIndex = 0
  const out: CitationMatch[] = []
  for (const m of text.matchAll(CITATION_REGEX)) {
    if (m.index === undefined) continue
    const matched = m[0]
    out.push({
      text: matched,
      start: m.index,
      end: m.index + matched.length,
      url: citationToUrl(matched, bundeslandFallback),
    })
  }
  return out
}
