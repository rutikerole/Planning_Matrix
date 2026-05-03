// Phase 6a — geocoding the user's plot address.
// Phase 6c — reverse geocoding for click-to-select.
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

const NOMINATIM_SEARCH_ENDPOINT = 'https://nominatim.openstreetmap.org/search'
const NOMINATIM_REVERSE_ENDPOINT = 'https://nominatim.openstreetmap.org/reverse'
const NOMINATIM_ENDPOINT = NOMINATIM_SEARCH_ENDPOINT
const USER_AGENT_QUERY = 'planning-matrix-eval'

// Phase 6c — soft 1 req/s gate shared between forward + reverse
// geocoding. Nominatim policy is per-IP, not per-endpoint. We track
// the last request time at module scope so a click-to-select that
// fires immediately after a typed-address forward-geocode waits
// politely instead of slamming the service.
let lastNominatimRequestAt = 0
const NOMINATIM_MIN_INTERVAL_MS = 1100

async function waitForNominatimSlot(): Promise<void> {
  const now = Date.now()
  const elapsed = now - lastNominatimRequestAt
  if (elapsed < NOMINATIM_MIN_INTERVAL_MS) {
    await new Promise((r) => setTimeout(r, NOMINATIM_MIN_INTERVAL_MS - elapsed))
  }
  lastNominatimRequestAt = Date.now()
}

// Phase 6c — München bounding box (rough rectangular envelope around
// the city limits with a small margin). Reverse-geocoding outside
// this box is treated as out-of-scope and skipped; the click-to-
// select handler in PlotMap.tsx surfaces the inline "außerhalb des
// Anwendungsbereichs" notice instead of firing a network call.
export const MUENCHEN_BOUNDS = {
  latMin: 47.5,
  latMax: 48.5,
  lngMin: 11.0,
  lngMax: 12.0,
} as const

export function isInMuenchenBounds(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= MUENCHEN_BOUNDS.latMin &&
    lat <= MUENCHEN_BOUNDS.latMax &&
    lng >= MUENCHEN_BOUNDS.lngMin &&
    lng <= MUENCHEN_BOUNDS.lngMax
  )
}

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

  await waitForNominatimSlot()

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

// ─── Phase 6c ───────────────────────────────────────────────────────
// Reverse geocoding: lat/lng → human-readable address.
//
// Used by the click-to-select handler — when the user clicks a
// point on the map, we drop the pin instantly (optimistic) and ask
// Nominatim for the closest address in the background. The result
// updates the address input so the typed-address path stays
// canonical (chat-turn pipeline reads only the address string).
//
// Format priority: street + house number, postcode + city. We
// handle Nominatim's German address shape (`road`, `house_number`,
// `postcode`, `city` / `town` / `village` / `suburb`) and degrade
// gracefully if any field is missing — better to return a partial
// "Maxvorstadt, München" than to drop a successful reverse-geocode
// because the building has no street number on file.
//
// Returns null on:
//   • out-of-bounds coordinates (skip the call entirely)
//   • network / parse failure
//   • Nominatim returning no `address` object (water, forest, etc.)

interface NominatimReverseAddress {
  road?: string
  house_number?: string
  postcode?: string
  city?: string
  town?: string
  village?: string
  suburb?: string
  city_district?: string
}

function formatGermanAddress(a: NominatimReverseAddress): string | null {
  const street = [a.road, a.house_number].filter(Boolean).join(' ').trim()
  const cityName = a.city ?? a.town ?? a.village ?? a.suburb ?? a.city_district
  const cityPart = [a.postcode, cityName].filter(Boolean).join(' ').trim()
  if (!street && !cityPart) return null
  if (!street) return cityPart || null
  if (!cityPart) return street
  return `${street}, ${cityPart}`
}

export async function reverseGeocode(
  lat: number,
  lng: number,
  signal?: AbortSignal,
): Promise<string | null> {
  if (!isInMuenchenBounds(lat, lng)) return null

  const url = new URL(NOMINATIM_REVERSE_ENDPOINT)
  url.searchParams.set('lat', lat.toFixed(6))
  url.searchParams.set('lon', lng.toFixed(6))
  url.searchParams.set('format', 'json')
  url.searchParams.set('addressdetails', '1')
  url.searchParams.set('zoom', '18')
  url.searchParams.set('accept-language', 'de')
  url.searchParams.set('email', 'rutikerole@gmail.com')
  url.searchParams.set('client', USER_AGENT_QUERY)

  await waitForNominatimSlot()

  let res: Response
  try {
    res = await fetch(url.toString(), {
      method: 'GET',
      headers: { Accept: 'application/json' },
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
  if (!body || typeof body !== 'object') return null
  const obj = body as { address?: NominatimReverseAddress }
  if (!obj.address) return null
  return formatGermanAddress(obj.address)
}
