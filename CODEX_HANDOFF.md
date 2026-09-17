# Codex Handoff — 3D City Google Simulator v0.0.3

## v0.0.3 takeover update

Read RELEASE_REPORT.md and AUDIT.md for measured evidence and remaining validation gates. Assets are now bundled locally (ASSETS.md); the read-only runtime snapshot feeds validation. Surface filtering remains visual-only and still lacks independent elevation/deck data. The original Google integration wrapper was ineffective against read-only exports; credits are now passed directly. No real-key Google drive has been certified. The sections below retain the original long-term boundaries; baseline deployment and external-asset limitations are superseded by this release report.

## Mission

Turn this proof of concept into a production-quality **firefighter/EMS street-knowledge training simulator** only after the v0.0.3 driving demo proves that Google Photorealistic 3D Tiles are a convincing and usable visual city layer.

The central architecture must remain:

```text
Google Photorealistic 3D Tiles = visual city
Independent simulator data      = training/driving truth
```

Do not rebuild the product as a thin Google viewer. The commercial value must remain in the simulator: vehicle behaviour, dispatch training, road/street intelligence, route analysis, scoring, training history, instructor tools, and future knowledge modelling.

## Current v0.0.3 proof of concept

The current build contains:

- CesiumJS 1.138
- Google Photorealistic 3D Tiles loaded with a user-supplied Map Tiles API key
- Peterborough Station 1/2/3 spawns
- existing generic rescue-pumper GLB
- heavy apparatus bicycle-model vehicle physics
- keyboard controls
- mobile joystick/brake/recenter controls
- chase camera with FOLLOW, FREE_LOOK, and RETURNING behaviour
- independent Peterborough road data and current-street matching
- off-road speed limiting
- rendered Google-mesh surface-height sampling
- FPS/tile/road/surface diagnostics
- automatic proof-of-concept validation tracking
- copyable test report
- Node regression tests and static policy/configuration tests

## Mandatory Google/Cesium guardrails

Preserve these unless current Google documentation explicitly requires a different implementation:

1. Google 3D content is a streamed visualization layer. Do not download, rehost, redistribute, extract, trace, or convert Google's mesh/textures into simulator-owned assets.
2. Keep required Google tile/data attribution visibly rendered. v0.0.3 forces `showCreditsOnScreen: true` when the Google tileset is created.
3. Do not turn this into live operational emergency navigation. Product scope is training/simulation.
4. Keep routing, street matching, dispatch locations, scoring, and training state based on independently sourced/owned data.
5. Do not commit Google API keys to GitHub.
6. Re-check current Google Maps Platform terms/policies before commercial release or if architecture changes materially.

## Validation gate before major expansion

The user should run v0.0.3 first. Open Diagnostics and complete the built-in automatic checks:

- Google Photorealistic 3D Tiles connect/stream.
- Independent road graph loads.
- Surface-height lock is obtained.
- Drive at least 50 m.
- Enter free-look by dragging the view, then recenter.
- Average FPS reaches the prototype threshold (25 FPS or better).

Then use **Copy validation report** and manually evaluate:

- Is Peterborough recognizable and detailed enough at street level?
- Does the fire truck look correctly scaled/oriented?
- Does it stay visually on the road without sinking/floating/jumping?
- Are slopes and bridges acceptable?
- Do steering/braking/reverse feel usable?
- Is current-street matching generally correct?
- Does recenter return to persistent FOLLOW behaviour?
- Is mobile usable?
- Is Google attribution visible?

Treat the user's completed validation report as the source of truth for what to fix first.

## Known prototype limitations / risks

### GitHub Pages not yet enabled

The repo currently reports `has_pages: false`. The workflow is ready, but the owner must enable:

**Settings → Pages → Build and deployment → Source → GitHub Actions**

After that, pushes to `main` should deploy automatically.

Expected URL:

`https://edmondsonedits.github.io/3D-City-Google-Simulator/`

### Google API key setup is user-side

The assistant could not perform a real Google tile session without the user's Map Tiles API key. The first live API-key test is therefore part of the user's validation gate, not a completed automated test.

### Surface alignment is prototype-grade

`app.js` currently samples Cesium's rendered surface under the truck and smooths toward the accepted height. It rejects large jumps after a lock, but it is not yet a production road-elevation solver. Potential failures include photogrammetry roofs, trees, bridges, coarse tiles, missing tiles, and sudden LOD changes.

Do not solve this by making Google mesh the driving truth. Build a robust **SurfaceAlignmentService** that combines independent road/lidar elevation with rendered-mesh sampling and continuity filters.

### Road matching is deliberately simple

The current matcher uses distance + heading + sticky street-name bias. Improve it later with canonical road IDs, candidate history/hysteresis, road class, intersection awareness, and bridge/deck context. Do not replace the existing independent road source with visual inference from Google's mesh.

### No building/vehicle collision system yet

Cesium's 3D tile collision/picking support is not a complete truck physics engine. The current demo uses road/off-road logic, not full 3D collision against every visual object.

### External runtime dependencies

The pumper GLB and road GeoJSON currently load from `edmondsonedits/Peterborough-Map-Game` raw GitHub URLs. Before production, move critical runtime assets/data into this repository or a versioned city-package pipeline.

### Prototype API key storage

The demo uses `sessionStorage`, which is acceptable for a private proof of concept but is not the final commercial credential architecture. Review Google-supported key restrictions/proxy patterns before release.

## Recommended Codex sequence

### Phase 1 — stabilize the proof of concept

Do this immediately after receiving the user's validation report:

- fix any tile-loading/API-key errors
- fix truck scale/orientation
- fix surface grounding problems
- fix camera follow/recenter problems
- fix mobile input problems
- profile FPS and memory
- add browser-level smoke tests where possible
- preserve all current Node regression tests

Do not add dispatch or training features until the street-level driving loop is convincing.

### Phase 2 — clean architecture

Refactor into clear modules rather than growing `app.js` indefinitely:

```text
core/
  application.js
  session.js
map/
  cesium-viewer.js
  google-tiles.js
  surface-alignment.js
vehicle/
  vehicle-controller.js
  vehicle-physics.js
input/
  input-controller.js
  keyboard.js
  mobile-joystick.js
camera/
  chase-camera.js
geography/
  road-network.js
  road-matcher.js
  intersections.js
cities/
  peterborough/
ui/
  hud.js
  diagnostics.js
  setup.js
```

Use one authoritative normalized input state. Avoid synthetic keyboard/gamepad hacks.

Use lifecycle ownership with AbortController/cleanup and generation IDs so stale async loads cannot overwrite a newer city/session.

### Phase 3 — production driving foundation

Build:

- robust surface alignment
- bridge/deck handling
- camera obstacle avoidance
- consistent road/off-road boundaries
- station/apparatus spawn zones
- better current-street matching
- intersection graph
- quality/performance governor
- mobile performance profile
- local caching only where permitted for simulator-owned data

### Phase 4 — port existing training systems

After driving is stable, port/adapt concepts from the Peterborough simulator:

- Fire/EMS selection
- fire stations / EMS bases
- dispatch call system
- current-street HUD
- recommended route
- actual driven route
- route comparison
- call editor
- hospital leg for EMS
- training history

Port behaviour and data intentionally; do not copy old architectural debt wholesale.

### Phase 5 — new training intelligence

Add a privacy-preserving knowledge model:

```text
Drive
→ map-match
→ street/intersection sequence
→ route analysis
→ update mastery/confidence aggregates
→ discard unnecessary raw trace
→ choose future calls that target weak knowledge
```

Suggested per-street/intersection fields:

- mastery
- confidence
- exposures
- independent successes
- assisted successes
- mistakes
- last encounter

## Performance direction

Google's current renderer guidance recommends increasing tile request concurrency; v0.0.3 sets `Cesium.RequestScheduler.requestsByServer['tile.googleapis.com:443'] = 18`.

Keep quality selectable. Add future adaptive quality that reduces decorative/visual cost before degrading road/training accuracy.

Measure:

- average and low-percentile FPS
- tile settle time near spawn
- memory use
- time to first controllable frame
- mobile thermal/performance behaviour
- visible LOD popping during driving

## Testing direction

Preserve and expand the test pyramid:

1. unit tests — vehicle physics, road matching, camera state, route logic
2. integration tests — city/session switch, Google tiles init failure, road-data failure, reset/restart
3. browser smoke tests — launch, truck visible, input changes position, recenter returns FOLLOW
4. performance checks — startup and steady-state FPS/memory
5. manual visual drive — Peterborough recognition, surface stability, scale, bridges, mobile feel

Never treat fictional/fallback geography as valid training/scoring data.

## Commercial product direction

Long term, city-specific configuration should look more like a data package than a hand-built 3D scene:

```text
City package
- boundary
- independent road graph
- canonical street names
- intersections
- stations / EMS bases
- hospitals
- dispatch locations
- road/elevation metadata
- department configuration
```

Google provides the streamed visual city where coverage is suitable. The simulator provides the training product.

## Definition of success for the next milestone

Do not call the next milestone successful merely because Google 3D loads.

Success means a user can start at Peterborough Station 1, drive several city blocks, turn at intersections, use free-look/recenter, identify the current street, and feel that the fire truck remains convincingly integrated into the photorealistic environment at an acceptable frame rate.

Once that is true, expanding into dispatch/training systems is justified.
