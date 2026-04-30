// Phase 6a — interactive map under the Q2 plot input.
//
// Geocodes the typed address (debounced 250 ms), drops a soft clay
// pin at the resolved coordinate, recenters the map there. The
// component is lazy-loaded by QuestionPlot.tsx (React.lazy) so the
// non-admin bundle does not download Leaflet.
//
// Inputs: { address }
// Outputs: { onCoordinatesResolved? }  callback fires when geocode
//          succeeds; useful for the parent's B-Plan lookup chain.
//
// Centre default: München Marienplatz (48.1374, 11.5755). Once an
// address resolves, the map flies there at zoom 17.

import { useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, Marker, useMap } from 'react-leaflet'
import L from 'leaflet'
import { MapTileLayer } from './tileLayer'
import { geocodeAddress, type GeocodeResult } from './geocode'
import { BplanResultCard } from './BplanResultCard'
import { useBplanLookup } from '../../hooks/useBplanLookup'
import type { BplanLookupResult } from '@/types/bplan'
import './styles.css'

const MUENCHEN_CENTER: [number, number] = [48.1374, 11.5755]
const DEFAULT_ZOOM = 11
const RESOLVED_ZOOM = 17
const GEOCODE_DEBOUNCE_MS = 250

interface Props {
  address: string
  onCoordinatesResolved?: (coords: GeocodeResult | null) => void
  onBplanResolved?: (result: BplanLookupResult | null) => void
}

// Custom DivIcon — we don't ship Leaflet's marker images (they're
// PNG sprites that don't match our brand); instead a tiny styled
// div with a clay dot + paper border.
const pin = L.divIcon({
  className: '',
  html:
    '<div style="position:relative">' +
    '<div class="pm-plotmap-pin"></div>' +
    '<div class="pm-plotmap-pin-shadow"></div>' +
    '</div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
})

// Internal: a child that has access to useMap() so we can fly
// to a resolved coordinate without re-mounting the map.
function FlyToOnCoords({ coords }: { coords: GeocodeResult | null }) {
  const map = useMap()
  useEffect(() => {
    if (!coords) return
    map.flyTo([coords.lat, coords.lng], RESOLVED_ZOOM, { duration: 0.6 })
  }, [coords, map])
  return null
}

export function PlotMap({ address, onCoordinatesResolved, onBplanResolved }: Props) {
  const [coords, setCoords] = useState<GeocodeResult | null>(null)
  const [isGeocoding, setIsGeocoding] = useState(false)
  const [errored, setErrored] = useState(false)
  const ctrlRef = useRef<AbortController | null>(null)

  // Debounce the address input before geocoding.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    ctrlRef.current?.abort()
    const trimmed = address.trim()
    if (trimmed.length < 6) {
      setCoords(null)
      setIsGeocoding(false)
      setErrored(false)
      return
    }
    const ctrl = new AbortController()
    ctrlRef.current = ctrl
    setIsGeocoding(true)
    setErrored(false)
    const timer = setTimeout(() => {
      geocodeAddress(trimmed, ctrl.signal)
        .then((result) => {
          if (ctrl.signal.aborted) return
          setCoords(result)
          setIsGeocoding(false)
          if (!result) setErrored(true)
        })
        .catch(() => {
          if (ctrl.signal.aborted) return
          setIsGeocoding(false)
          setErrored(true)
        })
    }, GEOCODE_DEBOUNCE_MS)
    return () => {
      clearTimeout(timer)
      ctrl.abort()
    }
  }, [address])
  /* eslint-enable react-hooks/set-state-in-effect */

  // Notify parent when coords settle (resolved OR cleared).
  useEffect(() => {
    onCoordinatesResolved?.(coords)
  }, [coords, onCoordinatesResolved])

  // Phase 6a — once coordinates resolve, fire the B-Plan lookup
  // through the Edge Function. The hook handles its own
  // AbortController, so a fast typer doesn't queue stale calls.
  const { data: bplanResult, isLoading: bplanLoading } = useBplanLookup({
    lat: coords?.lat ?? null,
    lng: coords?.lng ?? null,
  })

  // Bubble the B-Plan result up to QuestionPlot so it can pass it
  // through to useCreateProject (Commit 6 will land that path).
  useEffect(() => {
    onBplanResolved?.(bplanResult)
  }, [bplanResult, onBplanResolved])

  const initialCenter = useMemo<[number, number]>(
    () => (coords ? [coords.lat, coords.lng] : MUENCHEN_CENTER),
    // Only set the initial center once; FlyToOnCoords handles
    // subsequent updates without remounting the map.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )
  const initialZoom = coords ? RESOLVED_ZOOM : DEFAULT_ZOOM

  return (
    <div className="flex flex-col">
      <div className="pm-plotmap-container relative" style={{ height: 280 }}>
        {isGeocoding ? <div className="pm-plotmap-progress" aria-hidden="true" /> : null}
        <MapContainer
          center={initialCenter}
          zoom={initialZoom}
          scrollWheelZoom={false}
          style={{ height: '100%', width: '100%' }}
          attributionControl={true}
        >
          <MapTileLayer />
          {coords ? <Marker position={[coords.lat, coords.lng]} icon={pin} /> : null}
          <FlyToOnCoords coords={coords} />
        </MapContainer>
        {errored ? (
          <div
            role="alert"
            className="absolute bottom-2 left-2 right-2 text-[12px] px-3 py-1.5 bg-paper/95 border-l-2 border-destructive/50 italic font-serif text-destructive/85 leading-relaxed"
          >
            Adresse konnte nicht aufgelöst werden — überprüfen Sie die Schreibweise.
          </div>
        ) : null}
      </div>
      {coords ? <BplanResultCard result={bplanResult} isLoading={bplanLoading} /> : null}
    </div>
  )
}
