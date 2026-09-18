# 3D City Google Simulator — v0.0.7

A focused proof of concept for a future commercial firefighter/EMS street-knowledge simulator. The demo streams **Google Photorealistic 3D Tiles** through **CesiumJS**, then layers independent vehicle physics, road matching, controls, and training-oriented UI over the visual city.

## Play v0.0.7

Open https://edmondsonedits.github.io/3D-City-Google-Simulator/ and enter your own Map Tiles API key. Choose Station 1 and launch. The key needs billing, Map Tiles API access, and website restrictions allowing that address. No Google key ships with the game.

Locally, run `npm start` and open http://127.0.0.1:4173/. Allow that address in your key restrictions. Desktop: W/S, A/D, Space, C. Mobile: joystick, Brake, Recenter. Setup pauses the drive; Resume returns without rebuilding the city.

This release corrects truck orientation, chase-camera placement, direct Google credit configuration, low-FPS integration, truck self-sampling, stale surface requests, off-road classification, mobile touch release/recenter and validation false positives. It bundles the existing independent roads and pumper. See [AUDIT.md](AUDIT.md), [ASSETS.md](ASSETS.md) and [RELEASE_REPORT.md](RELEASE_REPORT.md).

The Google driving milestone is **awaiting real-key visual validation**. Automated browser tests use real Cesium, the real model and road graph with a synthetic surface/tileset fixture. They do not validate Google's city, bridge decks, grounding or FPS.

## v0.0.7 camera, address spawn, and recovery

Adds **Tactical overhead** and **Bird’s-eye · GTA** camera presets. The GTA-style view follows from roughly 95 m with a steep downward pitch, while free-look and mouse-wheel zoom now support much higher ranges.

The setup menu also includes a collapsible **Spawn & recovery tools** submenu. While the simulator is running, enter an Ontario street address to move the truck there using the existing Google Maps JavaScript API geocoder. The same submenu includes **Recover truck to surface**, which re-samples the rendered Google surface beneath the apparatus and snaps the truck back above it if visual grounding fails.

## v0.0.6 mobile long-press fix

Mobile driving surfaces now suppress browser text selection, copy callouts, drag-start behavior, and touch gestures that conflict with holding the joystick or dragging the 3D view. The protection is scoped to gameplay surfaces so API-key and Ontario city inputs in setup remain selectable and editable.

## v0.0.5 mobile HUD

The driving view now prioritizes road visibility, especially on phones. The full-width top banner is removed in favor of small edge controls, the title hides on mobile, current street/area becomes a compact upper-left chip, camera/setup stay in the upper-right, and the lower controls use a smaller joystick plus Brake and Center buttons. Camera cycling remains available from the small top-right CAM button.

## What this demo is proving

The goal is not to build the full simulator yet. Version 0.0.3 is intended to answer the expensive technical questions before a larger Codex build:

- Can Google Photorealistic 3D Tiles provide a convincing street-level city environment?
- Can the existing rescue-pumper asset be driven through that streamed world?
- Can independent road data remain the driving/training truth while Google is the visual layer?
- Can the truck remain visually grounded against the rendered Google mesh?
- Can desktop and mobile controls work at street level?
- Can a chase camera support free look and return to persistent FOLLOW mode?
- Is performance good enough to justify expanding the concept?

## Demo features

- Google Photorealistic 3D Tiles with CesiumJS 1.138
- Peterborough Station 1, 2, and 3 starting positions
- Original project rescue-pumper GLB from the Peterborough simulator
- Heavy apparatus bicycle-model steering, acceleration, braking, reverse, drag, and off-road speed limits
- Independent Peterborough public-road GeoJSON for current-street matching
- Heading-aware road matching with sticky-name bias
- Rendered-mesh surface-height sampling
- Persistent chase camera, free look, recenter, and zoom
- Desktop keyboard controls
- Mobile virtual joystick, brake, and recenter controls
- Runtime Google API-key entry; no key is committed to the repository
- Diagnostics for FPS, tile state, road graph, surface height, road distance, and vehicle position
- Automated proof-of-concept validation tracking
- One-click validation report intended to be pasted into Codex after the test drive
- Regression and static configuration tests

## v0.0.3 validation additions

Version 0.0.3 adds a structured pre-Codex test pass. Open **Diagnostics** after launching the city and:

1. Let nearby Google 3D detail settle.
2. Confirm the road graph and surface height lock.
3. Drive at least **50 m**.
4. Drag the 3D view to enter free look.
5. Press **C** or **Recenter**.
6. Let the FPS sample collect.
7. Press **Copy validation report**.
8. Complete the manual visual checklist in the copied report and give it to Codex.

The browser also exposes `window.__CITY_DEMO_VALIDATION__` with `snapshot()`, `report()`, and `reset()` so future browser automation can inspect the same proof-of-concept signals.

## Controls

### Desktop

- **W / S** — throttle / reverse
- **A / D** — steer
- **Space** — service brake
- **C** — recenter chase camera
- **R** — reset to selected station
- **Drag the 3D view** — free-look camera
- **Mouse wheel** — chase-camera distance

### Mobile

- Left joystick — throttle/reverse + steering
- Brake — service brake
- Recenter — return to persistent chase view
- Drag the 3D view — free look

## Google API setup

1. Create or select a Google Cloud project.
2. Attach billing.
3. Enable **Map Tiles API**.
4. Create a test API key.
5. Restrict the key to the Map Tiles API and apply appropriate application restrictions for the deployment.
6. Open the demo and paste the key into the setup screen.

The prototype stores the key only in `sessionStorage` for the current browser tab. Production credential handling should be reviewed separately before commercial deployment.

## Google/Cesium policy guardrails

The demo forces `showCreditsOnScreen: true` when creating Google Photorealistic 3D Tiles so tile attribution is rendered on-screen. It also applies Google's recommended `tile.googleapis.com:443` request concurrency of 18 for CesiumJS streaming performance.

Do not remove Google attribution, download/rehost the Google city, extract or trace Google geometry/textures, or use this training prototype as live emergency-response navigation.

## Architecture

```text
Google Photorealistic 3D Tiles
            ↓
         CesiumJS
            ↓
      visual 3D city
            ↓
──────────────────────────────
Independent simulator systems
──────────────────────────────
rescue-pumper model
vehicle physics
road graph / street matcher
station spawns
camera controller
mobile + keyboard input
future dispatch/training logic
```

Google's mesh is deliberately **not** the authoritative road network. Independent road geometry controls street logic and road/off-road behaviour; the Google mesh is sampled for visual surface alignment.

## Existing project data reused

The proof of concept bundles these existing resources from `edmondsonedits/Peterborough-Map-Game`:

- `city-explorer/assets/vehicles/generic-pumper.glb`
- `city-explorer/data/osm-public-roads.geojson`
- Peterborough fire-station spawn coordinates
- established heavy-truck physics tuning

These files are now bundled locally at a pinned source revision. See ASSETS.md for provenance and OSM attribution.

## Testing

```bash
npm test
```

Tests cover vehicle physics, braking, off-road limits, steering direction, frame-rate stability, geographic movement, version alignment, required Google attribution configuration, tile-request optimization, and validation UI presence.

## Deployment

`.github/workflows/demo-pages.yml` tests the build and deploys the static site to GitHub Pages on pushes to `main`.

If configuring a fresh copy of the repository, enable:

**Settings → Pages → Build and deployment → Source → GitHub Actions**

Expected URL afterward:

`https://edmondsonedits.github.io/3D-City-Google-Simulator/`

## Codex handoff

Read [`CODEX_HANDOFF.md`](./CODEX_HANDOFF.md) before expanding the simulator. It defines the prototype boundary, what must remain independent from Google, the validation gate, known risks, and the recommended next implementation phases.

## Prototype boundary

This project is for **training and simulation only**. It is not intended for live emergency-response navigation or operational dispatch routing.
