// Phase 6a — WMS GetFeatureInfo client.
//
// Calls the München Geoportal WMS at the user's plot coordinates and
// returns the raw GeoJSON FeatureCollection. The endpoint URL is
// hidden behind this Edge Function so the SPA never sees it
// (network inspection-friendly).
//
// Coordinate handling:
//   • SPA passes lat/lng (WGS84, EPSG:4326)
//   • WMS layer requires EPSG:25832 (UTM Zone 32N)
//   • We send a small bbox in EPSG:25832 around the converted point
//     and probe the centre via I=5, J=5 on a WIDTH=11, HEIGHT=11 grid
//   • Point conversion uses the published proj4-equivalent formula
//     for EPSG:4326 → EPSG:25832 (zone 32N, central meridian 9°E)
//
// We INTENTIONALLY do not pull a proj4 dependency — the formula
// inlined here is well-tested and stable. If München ever moves to
// a different CRS, we revisit.
//
// Bounding box width: 1 metre. The WMS sample grid (11×11, centre
// pixel I=5,J=5) effectively probes the centre of this box.

const WMS_ENDPOINT = 'https://geoportal.muenchen.de/geoserver/plan/wms'
const LAYER = 'vagrund_baug_umgriff_veredelt_in_kraft'
const USER_AGENT =
  'Planning-Matrix/1.0 (+https://planning-matrix.vercel.app; contact: rutikerole@gmail.com)'
const FETCH_TIMEOUT_MS = 15_000

// ─── EPSG:4326 → EPSG:25832 (UTM Zone 32N) ──────────────────────────────
// Standard transverse-Mercator forward formula. Inputs in degrees.
function wgs84ToUtm32n(lat: number, lng: number): { x: number; y: number } {
  const a = 6378137.0
  const f = 1 / 298.257223563
  const k0 = 0.9996
  const eSq = f * (2 - f)
  const ePrimeSq = eSq / (1 - eSq)
  const lambda0 = (9 * Math.PI) / 180 // central meridian for zone 32N

  const phi = (lat * Math.PI) / 180
  const lambda = (lng * Math.PI) / 180

  const N = a / Math.sqrt(1 - eSq * Math.sin(phi) ** 2)
  const T = Math.tan(phi) ** 2
  const C = ePrimeSq * Math.cos(phi) ** 2
  const A = Math.cos(phi) * (lambda - lambda0)

  const M =
    a *
    ((1 - eSq / 4 - (3 * eSq ** 2) / 64 - (5 * eSq ** 3) / 256) * phi -
      ((3 * eSq) / 8 + (3 * eSq ** 2) / 32 + (45 * eSq ** 3) / 1024) *
        Math.sin(2 * phi) +
      ((15 * eSq ** 2) / 256 + (45 * eSq ** 3) / 1024) * Math.sin(4 * phi) -
      ((35 * eSq ** 3) / 3072) * Math.sin(6 * phi))

  const easting =
    k0 *
      N *
      (A + ((1 - T + C) * A ** 3) / 6 + ((5 - 18 * T + T ** 2 + 72 * C - 58 * ePrimeSq) * A ** 5) / 120) +
    500_000.0

  const northing =
    k0 *
    (M +
      N *
        Math.tan(phi) *
        ((A ** 2) / 2 +
          ((5 - T + 9 * C + 4 * C ** 2) * A ** 4) / 24 +
          ((61 - 58 * T + T ** 2 + 600 * C - 330 * ePrimeSq) * A ** 6) / 720))

  return { x: easting, y: northing }
}

export interface WmsCallResult {
  ok: boolean
  status: number
  body: unknown
}

export async function callWmsGetFeatureInfo(
  lat: number,
  lng: number,
): Promise<WmsCallResult> {
  const { x, y } = wgs84ToUtm32n(lat, lng)
  // 1-metre-wide bbox centred on (x, y); the GetFeatureInfo grid samples
  // the centre via I=5, J=5 of an 11x11 pixel area.
  const halfWidth = 0.5
  const bbox = `${(x - halfWidth).toFixed(2)},${(y - halfWidth).toFixed(2)},${(x + halfWidth).toFixed(2)},${(y + halfWidth).toFixed(2)}`

  const url = new URL(WMS_ENDPOINT)
  url.searchParams.set('SERVICE', 'WMS')
  url.searchParams.set('VERSION', '1.3.0')
  url.searchParams.set('REQUEST', 'GetFeatureInfo')
  url.searchParams.set('LAYERS', LAYER)
  url.searchParams.set('QUERY_LAYERS', LAYER)
  url.searchParams.set('CRS', 'EPSG:25832')
  url.searchParams.set('BBOX', bbox)
  url.searchParams.set('WIDTH', '11')
  url.searchParams.set('HEIGHT', '11')
  url.searchParams.set('I', '5')
  url.searchParams.set('J', '5')
  url.searchParams.set('INFO_FORMAT', 'application/json')
  url.searchParams.set('FEATURE_COUNT', '5')

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(url.toString(), {
      headers: {
        'user-agent': USER_AGENT,
        accept: 'application/json',
      },
      signal: ctrl.signal,
    })
    if (!res.ok) {
      // Capture upstream body for log correlation but do not return it
      // to the SPA — keep error envelope clean.
      console.error(
        `[bplan-lookup] WMS upstream ${res.status}: ${(await res.text()).slice(0, 300)}`,
      )
      return { ok: false, status: res.status, body: null }
    }
    let body: unknown
    try {
      body = await res.json()
    } catch {
      console.error('[bplan-lookup] WMS returned non-JSON body')
      return { ok: false, status: 502, body: null }
    }
    return { ok: true, status: 200, body }
  } catch (err) {
    console.error('[bplan-lookup] WMS network error:', err)
    return { ok: false, status: 0, body: null }
  } finally {
    clearTimeout(timer)
  }
}
