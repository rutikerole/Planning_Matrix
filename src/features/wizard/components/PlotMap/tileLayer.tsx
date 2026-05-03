// Phase 6a — single source of truth for the basemap tile provider.
//
// CARTO Voyager (https://carto.com/basemaps/) — soft cartographic
// raster style with labels, served from basemaps.cartocdn.com under
// CARTO's standard "free-with-attribution" terms (commercial use
// permitted; OpenStreetMap data under ODbL). No API key, no signup.
//
// We were previously pointing at OpenFreeMap's positron raster path
// (`tiles.openfreemap.org/styles/positron/{z}/{x}/{y}.png`) — that
// host returns 404 because OpenFreeMap is a *vector*-tile service
// (PMTiles + style.json for MapLibre GL); they don't ship a raster
// XYZ endpoint. Tiles silently failed to load in production, leaving
// a grey square under the marker.
//
// Required attribution per CARTO + OSM terms: "© OpenStreetMap
// contributors, © CARTO".
//
// Why raster + Leaflet (not vector + MapLibre): pulling
// @maplibre/maplibre-gl pushes the entry chunk past our 250 KB gzip
// ceiling. Voyager's raster style at z11–19 reads cleanly enough
// for an address-confirmation viewport.

import { TileLayer } from 'react-leaflet'

const VOYAGER_TILES =
  'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png'
const VOYAGER_SUBDOMAINS = 'abcd'

const ATTRIBUTION =
  '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors · ' +
  '© <a href="https://carto.com/attributions" target="_blank" rel="noreferrer">CARTO</a>'

export function MapTileLayer() {
  return (
    <TileLayer
      url={VOYAGER_TILES}
      subdomains={VOYAGER_SUBDOMAINS}
      attribution={ATTRIBUTION}
      maxZoom={19}
    />
  )
}
