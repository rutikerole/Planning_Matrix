// Phase 6a — geocoding the user's plot address.
//
// Strategy: Nominatim primary, no fallback. The brief's hypothetical
// München OpenData geocoder doesn't exist as a real-time service —
// the city's open data is a CSV adress dataset, not an HTTP geocoder
// — so we rely on Nominatim with strict politeness:
//
//   • 1 req/s ceiling (Nominatim policy hard limit)
//   • Identifying User-Agent with contact email per their policy
//   • Address scoped to München by appending "München, Deutschland"
//     when the user hasn't already typed those tokens — improves
//     hit rate on the first try and reduces false matches
//   • 250 ms typing debounce in the call site (PlotMap.tsx) so a
//     fast typer doesn't burn the rate limit
//
// For Phase 6a (admin-only, low volume) this stays well within
// Nominatim's policy. If usage grows, we revisit (Photon, BKG, or
// a paid geocoder).

const NOMINATIM_ENDPOINT = 'https://nominatim.openstreetmap.org/search'
const USER_AGENT_QUERY = 'planning-matrix-eval'

export interface GeocodeResult {
  lat: number
  lng: number
  display_name?: string
}

export async function geocodeAddress(
  address: string,
  signal?: AbortSignal,
): Promise<GeocodeResult | null> {
  const trimmed = address.trim()
  if (trimmed.length < 6) return null

  // Append München if the user hasn't typed it (improves first-try
  // hit rate; Nominatim is greedy and will otherwise match anywhere
  // in the world).
  const lower = trimmed.toLowerCase()
  const looksLikeMuenchen = lower.includes('münchen') || lower.includes('muenchen') || lower.includes('munich')
  const query = looksLikeMuenchen ? trimmed : `${trimmed}, München, Deutschland`

  const url = new URL(NOMINATIM_ENDPOINT)
  url.searchParams.set('q', query)
  url.searchParams.set('format', 'json')
  url.searchParams.set('limit', '1')
  url.searchParams.set('countrycodes', 'de')
  url.searchParams.set('email', 'rutikerole@gmail.com') // Nominatim courtesy
  url.searchParams.set('client', USER_AGENT_QUERY)

  let res: Response
  try {
    res = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        // Browsers strip / override User-Agent on cross-origin fetches,
        // but the email + client params above identify us at the
        // Nominatim server side per their policy guidance for
        // browser-side calls.
        Accept: 'application/json',
      },
      signal,
    })
  } catch {
    return null
  }
  if (!res.ok) return null

  let body: unknown
  try {
    body = await res.json()
  } catch {
    return null
  }
  if (!Array.isArray(body) || body.length === 0) return null
  const first = body[0] as { lat?: string; lon?: string; display_name?: string }
  if (!first?.lat || !first?.lon) return null
  const lat = Number(first.lat)
  const lng = Number(first.lon)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  return { lat, lng, display_name: first.display_name }
}
