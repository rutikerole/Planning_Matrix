// `isPlotAddressValid` moved to `src/lib/addressParse.ts` so the
// chat workspace's address-suggestion logic can consume it without
// crossing into wizard/. Re-exported here for backwards-compat with
// callers that still import from this path.
export { isPlotAddressValid } from '@/lib/addressParse'

/**
 * München Stadtgebiet postcodes — 70 entries spanning 80331-81929.
 * Source: data/muenchen/stadtbezirke.json (Phase 4 WFS harvest of
 * gsm_wfs:vablock_stadtbezirk, postcodes_approx field). The list is
 * the union of postcodes_approx across all 25 Stadtbezirke,
 * deduplicated. Postcodes outside the Stadtgebiet (Munich Region
 * Land-Postleitzahlen) are NOT admitted by v1.
 *
 * Kept as a string-Set rather than a literal-union type because 70
 * literal members would bloat tooling output without callers needing
 * to switch on the resolved postcode (callers only need a yes/no
 * gate). The Set form gives O(1) membership checks at the call site.
 */
const MUENCHEN_POSTCODES = new Set<string>([
  '80331', '80333', '80335', '80336', '80337', '80339',
  '80538', '80539',
  '80636', '80637', '80638', '80639',
  '80686', '80687', '80689',
  '80796', '80797', '80798', '80799',
  '80801', '80802', '80803', '80804', '80805', '80807', '80809',
  '80937', '80939',
  '80992', '80993', '80995', '80997', '80999',
  '81241', '81243', '81245', '81247', '81249',
  '81369', '81371', '81373', '81375', '81377', '81379',
  '81475', '81476', '81477', '81479',
  '81539', '81541', '81543', '81545', '81547', '81549',
  '81667', '81669', '81671', '81673', '81675', '81677', '81679',
  '81735', '81737', '81739',
  '81825', '81827', '81829',
  '81925', '81927', '81929',
])

const MUENCHEN_POSTCODE_RE = /\b(8[01]\d{3})\b/g

/**
 * Pull the first München Stadtgebiet postcode out of a free-text
 * address. Returns null when no München postcode is present. Match
 * is anchored on word boundaries so `'803311'` never spuriously
 * matches `'80331'`.
 */
export function extractMuenchenPostcode(address: string): string | null {
  MUENCHEN_POSTCODE_RE.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = MUENCHEN_POSTCODE_RE.exec(address)) !== null) {
    if (MUENCHEN_POSTCODES.has(m[1])) return m[1]
  }
  return null
}

/** True iff the address contains a München Stadtgebiet postcode. */
export function isMuenchenAddress(address: string): boolean {
  return extractMuenchenPostcode(address) !== null
}
