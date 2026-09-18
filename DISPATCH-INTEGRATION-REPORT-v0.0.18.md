# Dispatch Integration Report — v0.0.18

## Status
Prompt 8 merge-candidate prototype. Production `index.html` / v0.0.8 is intentionally unchanged.

## Reused unchanged
- Google Photorealistic 3D Tiles/Cesium visual-world path and attribution behavior from the proven isolated v0.0.8 runtime.
- Peterborough authoritative city package, Fire/EMS base records, spawn coordinates/headings, yard geometry, PRHC checkpoint/drivable area, dispatch records/categories, and OSM public-road dataset.
- Existing Peterborough gameplay intent for dispatch state, service filtering, EMS transport, tablet, route comparison and training history.

## Adapted for Cesium / Google 3D
- Base spawning uses the isolated runtime coordinate/heading API rather than address geocoding.
- Incident and hospital targets use Cesium entities and geographic distance checks instead of Leaflet markers/circles/map distance.
- Nearest-road access and recommended routing continue to use independent OSM road data; Google mesh remains visual only.
- After-action review uses Cesium polylines/bird's-eye camera rather than the source 2D map review.
- The separate MDT remains a 2D OSM display so the driving world stays Cesium.

## Authoritative data and editor sync
`dispatch/peterborough-data-adapter-v0.0.10.js` is the single normalization boundary. It loads the current Peterborough package and dispatch store at runtime; Stage 8 does not create another editable location database. `window.__DISPATCH_INTEGRATION__.exportNormalizedData()` exposes the same normalized base, spawn, yard, hospital, dispatch and road objects for diagnostics/editor synchronization.

## Cleanup and diagnostics
v0.0.18 adds a small diagnostics panel with prototype/package/dispatch/schema versions and record counts. A common `dispatch-prototype-cleanup` event is emitted on city-session reset and base change so modules can release transient UI/entities without coupling the coordinator to private module state.

## Remaining limitations before production promotion
- This is intentionally an isolated merge candidate; production is not replaced automatically.
- Real Google Photorealistic Tiles require the user's runtime API-key path and therefore cannot be fully exercised by repository CI fixtures.
- Browser CI validates the repository-controlled renderer/interaction fixture; final real-key desktop/mobile smoke testing remains a release gate.
- The adapter currently consumes authoritative editor-produced source data from the Peterborough repository rather than writing back into those editors from this repository.

## Promotion set when approved
Promote the isolated dispatch runtime chain (`app-dispatch-v0.0.12.js` through `app-dispatch-v0.0.18.js`), `dispatch/` integration modules, and the v0.0.18 prototype shell behavior into the production entry/runtime. Preserve `peterborough-data-adapter-v0.0.10.js` as the normalization boundary and keep production Google attribution/API-key handling unchanged. Do not promote historical prototype HTML wrappers as separate production pages.

## Security/data audit
No Google API key is introduced by the dispatch integration. Google mesh/texture data is neither downloaded nor stored by these modules. OSM/Peterborough source data remains the routing/training truth.
