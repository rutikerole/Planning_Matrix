// Phase 6a — interactive map under the Q2 plot input.
// Phase 6c — click-to-select: a click anywhere on the map drops the
// pin at that point, reverse-geocodes (Nominatim, polite 1 req/s),
// updates the parent's address input, and re-runs the B-Plan lookup.
//
// Geocodes the typed address (debounced 250 ms), drops a soft clay
// pin at the resolved coordinate, recenters the map there. The
// component is lazy-loaded by QuestionPlot.tsx (React.lazy) so the
// non-admin bundle does not download Leaflet.
//
// Inputs: { address, onAddressChange, onCoordinatesResolved?,
//          onBplanResolved? }
//
// Centre default: München Marienplatz (48.1374, 11.5755). Once an
// address resolves, the map flies there at zoom 17. A click does
// NOT auto-pan — the user clicked there, they know where they
// clicked; pin moves but map view stays put.

import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MapContainer, Marker, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { MapTileLayer, BplanWmsLayer } from './tileLayer'
import {
  geocodeAddress,
  reverseGeocode,
  isInMuenchenBounds,
  type GeocodeResult,
} from './geocode'
import { useBplanLookup } from '../../hooks/useBplanLookup'
import type { BplanLookupResult } from '@/types/bplan'
import './styles.css'

const MUENCHEN_CENTER: [number, number] = [48.1374, 11.5755]
const DEFAULT_ZOOM = 11
const RESOLVED_ZOOM = 17
const GEOCODE_DEBOUNCE_MS = 250
const BOUNDS_NOTICE_MS = 3000

interface Props {
  address: string
  onAddressChange?: (next: string) => void
  onCoordinatesResolved?: (coords: GeocodeResult | null) => void
  onBplanResolved?: (result: BplanLookupResult | null) => void
  onBplanLoadingChange?: (loading: boolean) => void
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

// Internal: a child with access to useMap() so we can fly to a
// resolved coordinate without re-mounting the map. Reads
// `flyTarget` (a one-shot trigger set ONLY by forward-geocode);
// click-to-select intentionally does not write here.
function FlyToOnResolve({ flyTarget }: { flyTarget: GeocodeResult | null }) {
  const map = useMap()
  useEffect(() => {
    if (!flyTarget) return
    map.flyTo([flyTarget.lat, flyTarget.lng], RESOLVED_ZOOM, { duration: 0.6 })
  }, [flyTarget, map])
  return null
}

interface ClickHandlerProps {
  onPick: (lat: number, lng: number) => void
  onOutOfBounds: () => void
}

// Internal: registers a Leaflet `click` event (already filters
// drag-vs-click natively). On click, if the latlng is within the
// München envelope we hand off to onPick; otherwise we surface the
// out-of-bounds notice via onOutOfBounds without moving the pin.
function MapClickHandler({ onPick, onOutOfBounds }: ClickHandlerProps) {
  useMapEvents({
    click: (e) => {
      const { lat, lng } = e.latlng
      if (!isInMuenchenBounds(lat, lng)) {
        onOutOfBounds()
        return
      }
      onPick(lat, lng)
    },
  })
  return null
}

export function PlotMap({
  address,
  onAddressChange,
  onCoordinatesResolved,
  onBplanResolved,
  onBplanLoadingChange,
}: Props) {
  const { t } = useTranslation()
  const [coords, setCoords] = useState<GeocodeResult | null>(null)
  const [flyTarget, setFlyTarget] = useState<GeocodeResult | null>(null)
  const [isGeocoding, setIsGeocoding] = useState(false)
  const [errored, setErrored] = useState(false)

  // Click-to-select status: 'idle' | 'reverse-loading' |
  // 'reverse-failed'. Drives the small status hint under the map.
  const [clickStatus, setClickStatus] = useState<
    'idle' | 'reverse-loading' | 'reverse-failed'
  >('idle')
  const [outOfBoundsNotice, setOutOfBoundsNotice] = useState(false)
  const boundsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const ctrlRef = useRef<AbortController | null>(null)
  const reverseCtrlRef = useRef<AbortController | null>(null)

  // Phase 6c — when the address prop changes because we just pushed a
  // reverse-geocoded value up to the parent, the forward-geocode
  // effect should NOT run (it would slightly shift coords + bounce
  // the pin). We stash the address we sent up; the effect compares
  // against this ref and short-circuits + clears it.
  const lastClickedAddressRef = useRef<string | null>(null)

  // Debounce the address input before geocoding.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    ctrlRef.current?.abort()

    // Reverse-geocode just pushed this exact string up; skip the
    // forward call so the click coords stay authoritative.
    if (
      lastClickedAddressRef.current !== null &&
      lastClickedAddressRef.current === address
    ) {
      lastClickedAddressRef.current = null
      setIsGeocoding(false)
      setErrored(false)
      return
    }
    lastClickedAddressRef.current = null

    const trimmed = address.trim()
    if (trimmed.length < 6) {
      setCoords(null)
      setFlyTarget(null)
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
          if (result) setFlyTarget(result)
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

  // Bubble the B-Plan result + loading state up to QuestionPlot so the
  // BPlanCheck pill above the map can render its status without
  // duplicating the lookup hook.
  useEffect(() => {
    onBplanResolved?.(bplanResult)
  }, [bplanResult, onBplanResolved])
  useEffect(() => {
    onBplanLoadingChange?.(bplanLoading)
  }, [bplanLoading, onBplanLoadingChange])

  // ─── Click-to-select ─────────────────────────────────────────────
  function handlePick(lat: number, lng: number) {
    // Optimistic pin move — no waiting for the geocode roundtrip.
    setCoords({ lat, lng })
    // Click does NOT trigger a fly — keep the user's chosen viewport.
    setErrored(false)
    setClickStatus('reverse-loading')

    // Cancel any in-flight reverse-geocode before starting a new one.
    reverseCtrlRef.current?.abort()
    const ctrl = new AbortController()
    reverseCtrlRef.current = ctrl

    void reverseGeocode(lat, lng, ctrl.signal)
      .then((resolved) => {
        if (ctrl.signal.aborted) return
        if (resolved && onAddressChange) {
          // Tag this address as click-derived so the address-prop
          // useEffect skips its forward-geocode (already at the
          // click coords; otherwise the pin would jitter slightly).
          lastClickedAddressRef.current = resolved
          onAddressChange(resolved)
          setClickStatus('idle')
        } else {
          setClickStatus('reverse-failed')
        }
      })
      .catch(() => {
        if (ctrl.signal.aborted) return
        setClickStatus('reverse-failed')
      })
  }

  function handleOutOfBounds() {
    if (boundsTimerRef.current) clearTimeout(boundsTimerRef.current)
    setOutOfBoundsNotice(true)
    boundsTimerRef.current = setTimeout(() => {
      setOutOfBoundsNotice(false)
    }, BOUNDS_NOTICE_MS)
  }

  useEffect(
    () => () => {
      if (boundsTimerRef.current) clearTimeout(boundsTimerRef.current)
      reverseCtrlRef.current?.abort()
    },
    [],
  )

  const initialCenter = useMemo<[number, number]>(
    () => (coords ? [coords.lat, coords.lng] : MUENCHEN_CENTER),
    // Only set the initial center once; FlyToOnResolve handles
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
          <BplanWmsLayer />
          <MapClickHandler onPick={handlePick} onOutOfBounds={handleOutOfBounds} />
          {coords ? <Marker position={[coords.lat, coords.lng]} icon={pin} /> : null}
          <FlyToOnResolve flyTarget={flyTarget} />
        </MapContainer>
        {outOfBoundsNotice ? (
          <div
            role="status"
            aria-live="polite"
            className="absolute bottom-2 left-2 right-2 text-[12px] px-3 py-1.5 bg-paper/95 border-l-2 border-clay/45 italic font-serif text-clay-deep leading-relaxed"
          >
            {t('wizard.q2.mapClickOutOfMuenchen')}
          </div>
        ) : errored ? (
          <div
            role="alert"
            className="absolute bottom-2 left-2 right-2 text-[12px] px-3 py-1.5 bg-paper/95 border-l-2 border-destructive/50 italic font-serif text-destructive/85 leading-relaxed"
          >
            Adresse konnte nicht aufgelöst werden — überprüfen Sie die Schreibweise.
          </div>
        ) : clickStatus === 'reverse-failed' ? (
          <div
            role="alert"
            className="absolute bottom-2 left-2 right-2 text-[12px] px-3 py-1.5 bg-paper/95 border-l-2 border-clay/45 italic font-serif text-clay-deep leading-relaxed"
          >
            {t('wizard.q2.mapReverseFailed')}
          </div>
        ) : clickStatus === 'reverse-loading' ? (
          <div
            role="status"
            aria-live="polite"
            className="absolute bottom-2 left-2 right-2 text-[12px] px-3 py-1.5 bg-paper/95 border-l-2 border-clay/35 italic font-serif text-clay/85 leading-relaxed"
          >
            {t('wizard.q2.mapReverseLoading')}
          </div>
        ) : null}
      </div>
    </div>
  )
}
