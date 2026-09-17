# 3D City Google Simulator — v0.0.1

A focused proof of concept for a future commercial firefighter/EMS street-knowledge simulator. The demo streams **Google Photorealistic 3D Tiles** through **CesiumJS**, then layers independent vehicle physics, road matching, controls, and training-oriented UI over the visual city.

## What this demo is proving

The goal is not to build the full simulator yet. Version 0.0.1 answers the expensive technical questions first:

- Can Google Photorealistic 3D Tiles provide a convincing city-scale driving environment?
- Can our existing rescue-pumper asset be driven through that streamed world?
- Can our independent road data remain the training/driving truth while Google is only the visual layer?
- Can we keep the truck visually grounded against the rendered Google mesh?
- Can desktop and mobile controls feel usable at street level?
- Can a chase camera remain attached to the apparatus while still supporting free look and recenter?

## Demo features

- Google Photorealistic 3D Tiles loaded directly with CesiumJS 1.138
- Peterborough, Ontario Station 1, 2, and 3 starting positions
- Original project rescue-pumper GLB from the Peterborough simulator
- Heavy apparatus bicycle-model steering, acceleration, braking, reverse, drag, and off-road speed limits
- Independent Peterborough OSM/public-road GeoJSON for current-street matching
- Heading-aware street matching with sticky/hysteresis bias
- Rendered-mesh height sampling to visually align the truck with Google's 3D surface
- Persistent chase camera, free look, recenter, and zoom
- Desktop keyboard controls
- Mobile virtual joystick, brake, and recenter controls
- Diagnostics for FPS, tile streaming, road graph, surface height, road distance, and vehicle position
- Runtime API-key entry; no Google key is stored in the repository
- Automated vehicle-physics regression tests

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
2. Attach billing to the project.
3. Enable **Map Tiles API**.
4. Create an API key for testing.
5. Restrict the key to the Map Tiles API and apply the strongest client/application restrictions supported for your deployment.
6. Open the demo and paste the key into the setup screen.

The key is stored only in `sessionStorage` for the current browser tab. It is passed directly to the Google/Cesium tile loader and is never committed to this repository.

For a production commercial build, follow Google's current API-key security guidance and current Map Tiles/Photorealistic 3D Tiles terms rather than treating this prototype key flow as the final credential architecture.

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

Google's mesh is deliberately **not** used as the authoritative road network. The current demo uses independent road geometry for road/street logic and samples Google's rendered mesh only for visual surface alignment. This separation is intended to keep the eventual training product independent, predictable, and portable.

## Existing project data reused

The proof of concept references these existing assets from `edmondsonedits/Peterborough-Map-Game`:

- `city-explorer/assets/vehicles/generic-pumper.glb`
- `city-explorer/data/osm-public-roads.geojson`
- Peterborough fire-station spawn coordinates
- established heavy-truck physics tuning

The pumper is an original project asset marked for commercial use in its source metadata.

## Testing

```bash
npm test
```

Tests cover forward/reverse limits, braking, off-road limiting, steering direction, frame-rate stability, geographic movement convention, and bidirectional road-heading matching.

## Deployment

`.github/workflows/demo-pages.yml` runs the physics tests and deploys the static site to GitHub Pages on pushes to `main`.

If GitHub Pages has never been enabled for this repository, enable **Settings → Pages → Source: GitHub Actions** once. Subsequent pushes deploy automatically.

Expected Pages URL after enablement:

`https://edmondsonedits.github.io/3D-City-Google-Simulator/`

## Prototype boundary

This project is for **training and simulation only**. It is not intended for live emergency-response navigation or operational dispatch routing.

The simulator must preserve all Google/Cesium attribution rendered by the viewer. Do not use this project to download, redistribute, extract, trace, or create derivative 3D assets from Google Maps content.
