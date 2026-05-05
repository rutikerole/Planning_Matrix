// Phase 6a — single source of truth for the basemap tile provider.
// Phase 6c — adds a transparent WMS overlay drawn on top of the
// basemap so the user sees rechtsgültiger Bebauungsplan polygons in
// München's official styling instead of a bare street map.
//
// CARTO Voyager (https://carto.com/basemaps/) — soft cartographic
// raster style with labels, served from basemaps.cartocdn.com under
// CARTO's standard "free-with-attribution" terms (commercial use
// permitted; OpenStreetMap data under ODbL). No API key, no signup.
//
// Required attribution per CARTO + OSM terms: "© OpenStreetMap
// contributors, © CARTO".
//
// Why raster + Leaflet (not vector + MapLibre): pulling
// @maplibre/maplibre-gl pushes the entry chunk past our 250 KB gzip
// ceiling. Voyager's raster style at z11–19 reads cleanly enough
// for an address-confirmation viewport.
//
// ─── B-Plan WMS overlay ────────────────────────────────────────────
// Same WMS layer the production `bplan-lookup` Edge Function queries
// via GetFeatureInfo (`vagrund_baug_umgriff_veredelt_in_kraft`),
// reused here for GetMap so the visual ↔ data layers cannot
// disagree. EPSG:3857 is supported by the GeoServer instance
// (verified live via GetCapabilities); Leaflet's default CRS, no
// custom projection needed.
//
// License: same as Phase 6a. Stadt München's WMS-API requires a
// Nutzungsvereinbarung for production end-customer use; the
// admin-only featureFlag gate keeps Phase 6c inside the same posture.

import { TileLayer, WMSTileLayer } from 'react-leaflet'

// Phase 7.10e — back to labeled CARTO Voyager. The previous
// `light_nolabels` variant rendered as featureless gray shapes
// with no street names, which combined with the container sepia
// filter made the tiles blend into the paper background and read
// as a stylized illustration rather than a real map. Voyager
// keeps the soft cartographic tone but ships labels, so users can
// recognize streets and orient themselves.
const VOYAGER_TILES =
  'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png'
const VOYAGER_SUBDOMAINS = 'abcd'

const BASEMAP_ATTRIBUTION =
  '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors · ' +
  '© <a href="https://carto.com/attributions" target="_blank" rel="noreferrer">CARTO</a>'

export function MapTileLayer() {
  return (
    <TileLayer
      url={VOYAGER_TILES}
      subdomains={VOYAGER_SUBDOMAINS}
      attribution={BASEMAP_ATTRIBUTION}
      maxZoom={19}
    />
  )
}

// ─── Phase 6c — B-Plan WMS overlay ─────────────────────────────────

const BPLAN_WMS_URL = 'https://geoportal.muenchen.de/geoserver/plan/wms'
const BPLAN_WMS_LAYER = 'vagrund_baug_umgriff_veredelt_in_kraft'
const BPLAN_WMS_ATTRIBUTION =
  '© <a href="https://geoportal.muenchen.de/portal/plan/" target="_blank" rel="noreferrer">Stadt München · Geoportal</a>'

export function BplanWmsLayer() {
  return (
    <WMSTileLayer
      url={BPLAN_WMS_URL}
      layers={BPLAN_WMS_LAYER}
      format="image/png"
      transparent={true}
      version="1.3.0"
      opacity={0.55}
      attribution={BPLAN_WMS_ATTRIBUTION}
    />
  )
}
