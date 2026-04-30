# Privacy & data flow — Phase 6a

> Documents which external services touch the user's plot address when the map preview is enabled.
> Phase 6a is admin-only (gated by `MAP_PREVIEW_ENABLED` allowlist); the user-facing privacy notice lands in Phase 6b alongside the license-attribution footer.

## Summary

When an admin user types a plot address in the wizard's Q2, the address travels to up to three external services. Each is documented below with the exact data sent and the data-residency posture.

```
┌──────────────────────────────────────────────────────────────────┐
│ User types address in wizard Q2                                  │
│   ↓                                                              │
│ Vite SPA debounces 250 ms, calls geocode.ts                      │
│   ↓                                                              │
│ Nominatim (operations.osmfoundation.org)                         │
│   ← receives the typed address (free text)                       │
│   → returns lat/lng                                              │
│   ↓                                                              │
│ SPA calls our Edge Function bplan-lookup with { lat, lng }       │
│   ↓                                                              │
│ Edge Function (Supabase region eu-central-1)                     │
│   ← receives lat/lng only — never the typed address              │
│   → calls geoportal.muenchen.de WMS at the EPSG:25832 coords     │
│      with our identifying User-Agent + contact email             │
│   → returns BplanLookupResult                                    │
│   ↓                                                              │
│ SPA renders PlotMap basemap tiles from OpenFreeMap (CDN)         │
│   ← receives lat/lng + zoom + tile coords (every pan/zoom)       │
│   ← does not receive the typed address                           │
│   ↓                                                              │
│ On wizard submit: state.facts[] is seeded with B-Plan facts      │
│ and the project is created via Supabase. The address itself is   │
│ stored in projects.plot_address (RLS-protected, owner-scoped).   │
│   ↓                                                              │
│ Chat-turn Edge Function calls Anthropic with the address         │
│ embedded in the conversation context. (Existing pre-Phase-6a     │
│ behaviour — Anthropic data-handling per their published privacy  │
│ policy.)                                                         │
└──────────────────────────────────────────────────────────────────┘
```

## External services and what they receive

### 1. Nominatim (OpenStreetMap)
- **Endpoint:** `https://nominatim.openstreetmap.org/search`
- **Data sent:** the user's typed plot address as free text. We append `, München, Deutschland` if not already present, to scope the geocode.
- **Data received:** lat/lng + canonical display_name.
- **Residency:** OpenStreetMap Foundation infrastructure (UK).
- **Retention:** subject to the [OSMF privacy policy](https://wiki.osmfoundation.org/wiki/Privacy_Policy). Geocoding requests are logged with the IP address for abuse prevention.
- **Compliance posture:** Nominatim's [Usage Policy](https://operations.osmfoundation.org/policies/nominatim/) covers free public use including limited commercial use. We respect their 1 req/s cap and provide an identifying email contact in every request.

### 2. OpenFreeMap (basemap tile provider)
- **Endpoint:** `https://tiles.openfreemap.org/styles/positron/{z}/{x}/{y}.png`
- **Data sent:** zoom level + tile coordinates. The user's IP address is implicit (every HTTP request).
- **Data received:** PNG raster tiles for the visible map area.
- **Residency:** OpenFreeMap CDN (jurisdiction varies by edge).
- **Retention:** OpenFreeMap states no user database, no cookies, no API keys. Server access logs are kept for operational reasons; not associated with user identity.
- **Compliance posture:** [MIT-licensed](https://openfreemap.org/), 2026 terms explicitly permit commercial use.

### 3. München Geoportal WMS (B-Plan lookup proxy)
- **Endpoint:** `https://geoportal.muenchen.de/geoserver/plan/wms` — accessed only via our Supabase Edge Function `bplan-lookup`.
- **Data sent (by the Edge Function):** lat/lng converted to EPSG:25832 (UTM Zone 32N). Identifying User-Agent: `Planning-Matrix/1.0 (+https://planning-matrix.vercel.app; contact: rutikerole@gmail.com)`.
- **Data received:** GeoJSON FeatureCollection describing the rechtsgültiger Bebauungsplan covering those coordinates (or empty).
- **Residency:** Landeshauptstadt München infrastructure (DE).
- **Retention:** subject to München Geoportal terms.
- **Compliance posture:** Phase 6a runs without a Nutzungsvereinbarung (admin-only preview, sample volume). Phase 6b ships the user-facing experience under the agreement contract; the WMS endpoint never moves out of the Edge Function so no SPA code change is required when Phase 6b lands.

## Data residency on our side

| Surface | Storage | Lifecycle |
|---|---|---|
| `projects.plot_address` | Supabase Postgres, eu-central-1 | RLS-scoped to owner. Deleted on project delete (cascade) or account delete (FK on auth.users). |
| `projects.state.facts[]` (B-Plan facts) | Same row as above | Same lifecycle. Facts visible only to the project owner. |
| `bplan_lookup_rate_limits` | Same DB | Owner-scoped via RLS for SELECT. Hourly cleanup helper drops buckets older than 1 hour. No PII. |
| `messages` (chat history including the address embedded in conversation) | Same DB | Cascade-deletes with the project. |

## Caching

- The bplan-lookup Edge Function does not cache results — every call hits the WMS. Caching is a Phase 6b-or-later improvement once we observe usage patterns.
- The SPA uses `useBplanLookup` which is in-component state; refreshing the page re-runs the lookup.

## What changes in Phase 6b

When the Nutzungsvereinbarung lands and the flag flips to true for everyone:

1. The map appears for every wizard user.
2. A user-facing privacy notice appears in a footer that links to this document.
3. The license-attribution footer for OpenFreeMap + OpenMapTiles + OpenStreetMap is added (currently only present in the map's attribution control).
4. The bplan-lookup Edge Function may add an authentication header for the WMS endpoint; the SPA contract is unchanged.
5. Optional: short-lived caching of bplan-lookup results (per coordinate) to reduce WMS traffic.

No data flow changes between Phase 6a and Phase 6b — only audience changes.

## DSGVO posture

The plot address is **already** sent to the chat-turn Edge Function and embedded in the conversation context with Anthropic — that is the existing Phase 1+ behaviour. Phase 6a adds two additional recipients (Nominatim, OpenFreeMap) for the same address class, both of which operate under permissive licences and policies that allow commercial use. No new categories of personal data are introduced in Phase 6a.

When the user-facing experience lands (Phase 6b), the privacy footer will explicitly enumerate these recipients.
