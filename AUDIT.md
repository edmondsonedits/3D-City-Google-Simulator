# v0.0.2 baseline — 2026-09-17

Inspected all 11 repository files at main 1998c6b84ebe13fad2239206e3dfeedaf803252b, including full README/handoff, both test suites, and Pages workflow. No repository AGENTS.md exists. Existing tests: 13/13 pass before edits.

## Runtime map

HTML loads Cesium 1.138 from jsDelivr, configures credits/concurrency, then app.js and validation.js. app.js starts independent road fetch and installs keyboard/touch/setup handlers. Submit creates one Viewer, loads Google tiles, creates an Entity pumper, awaits roads, then starts driving. A requestAnimationFrame loop advances bicycle physics and latitude/longitude (clockwise heading from north), matches roads every 180 ms, samples rendered height every 280 ms, updates the truck quaternion, owns the orbit camera and refreshes HUD. validation.js independently scrapes HUD once per second. Viewer listeners use AbortController; asynchronous surface samples lack session/reset guards. Mobile joystick and brake own separate input fields. Assets reference another project's mutable main branch. GitHub Actions tests then deploys static files.

## Decisions

- KEEP: Cesium, streamed Google visuals, independent OSM roads, physics tuning, station configuration, keyboard/mobile input, explicit camera modes, validation workflow and all regressions.
- IMPROVE: self-sampling surface height; stale asynchronous results; camera placed ahead of vehicle; low-FPS time loss; missing-road classification; release of touch controls; validation false positives; pinned local assets; startup failure handling.
- REFACTOR LATER: city packages, matcher extraction, routing, dispatch, history, instructor tools.
- REMOVE: empty no-op tick block; dynamic pixel enlargement of real-world truck.
- RISK: no real Google key available, no authoritative elevation/deck dataset, no building collisions, Google street-level LOD and physical mobile performance unproven.

## Browser baseline

Real Chrome, real Cesium, setup at 390×844, 768×1024, 1440×900: no uncaught errors, failed requests or horizontal overflow; 14,420 independent road segments loaded in each. Evidence in local artifacts/baseline.json and baseline-*.png. A real Cesium camera experiment measured heading 0 at local north -13.20 m, heading pi at north +13.20 m: the extra pi in the chase camera places it in front. No Google drive/FPS/surface measurements are claimed without a key.

## Deployment baseline

GitHub reports has_pages=false; Pages API returns 404. Expected URL is https://edmondsonedits.github.io/3D-City-Google-Simulator/. No deployment was live at baseline.

## Dependency rationale

Problems are simulation timestep integration, coordinate-frame conversion, temporal surface filtering, lifecycle cancellation and input release. Existing Cesium and plain JavaScript support these; retain custom vehicle/road/camera behavior. Small pure helpers and focused changes suffice; no new runtime library or engine is needed. Browser tests use Playwright only as a development dependency.
