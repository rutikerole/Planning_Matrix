// Phase 6a — single source of truth for the basemap tile provider.
//
// OpenFreeMap (https://openfreemap.org/) — chosen for 2026 license
// terms that explicitly permit commercial use, no signup, no API
// key, no rate limits. MIT licensed; map data from OpenStreetMap.
//
// Required attribution per OpenFreeMap policy: "© OpenMapTiles
// Data from OpenStreetMap" (the OpenFreeMap branding itself is
// optional). We attribute conservatively to be honest credit-givers
// of the OSM contributor community on top of OpenMapTiles' work.
//
// We use OpenFreeMap's RASTER endpoint (the "positron" style — a
// calm, near-monochrome look that matches our paper/clay palette
// better than the default style). Vector tiles would render
// crisper at high zoom but require @maplibre/maplibre-gl which
// would push the bundle past our 280 KB ceiling.

import { TileLayer } from 'react-leaflet'

const POSITRON_TILES = 'https://tiles.openfreemap.org/styles/positron/{z}/{x}/{y}.png'

const ATTRIBUTION =
  '© <a href="https://openfreemap.org/" target="_blank" rel="noreferrer">OpenFreeMap</a> · ' +
  '© <a href="https://www.openmaptiles.org/" target="_blank" rel="noreferrer">OpenMapTiles</a> · ' +
  '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>'

export function MapTileLayer() {
  return <TileLayer url={POSITRON_TILES} attribution={ATTRIBUTION} maxZoom={19} />
}
