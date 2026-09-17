# v0.0.3 — driving stabilization

## Current version

0.0.3, exactly one patch increment from 0.0.2. This is a locally playable, key-required driving build. The real-Google milestone is not certified.

## What was inspected

All original repository source, styles, markup, regression tests, README, complete CODEX_HANDOFF and Pages workflow; current main commit 1998c6b84ebe13fad2239206e3dfeedaf803252b; the pumper metadata/source documentation and independent road dependencies; actual Cesium 1.138 APIs in Chrome. No applicable repository AGENTS.md was present. See AUDIT.md for lifecycle and KEEP/IMPROVE/REFACTOR/REMOVE/RISK map.

## Baseline

13/13 Node tests passed. Setup rendered at 390×844, 768×1024 and 1440×900 without horizontal overflow, uncaught errors or failed requests. 14,420 road segments loaded. Google Pages was disabled. No Google key was available: city startup time, first controllable city frame, tile settling, real surface lock, city FPS and memory were not measured.

## Root causes / findings

- A read-only Cesium export prevented the old attribution wrapper from taking effect.
- The extra pi put the chase camera ahead of the truck; the GLB heading offset made the nose point sideways.
- The 40 ms frame cap lost simulation time below 25 FPS.
- Surface sampling did not exclude the truck, and late asynchronous samples could overwrite a reset/session. Large single-sample height changes were accepted.
- A missing nearest road was treated as on-road. Touch release could leave input held.
- Validation certified a recenter keypress, old surface lock and teleport distance rather than current runtime evidence.
- Actual touch testing reproduced a suppressed recenter click after a Cesium drag.

## What changed

Direct credit options, bounded/recoverable startup and sanitized error messages; pinned bundled pumper/OSM assets; correct model/chase orientation and enough camera range to show the whole vehicle; real-metre model scale; substepped physics; conservative unknown/off-road behavior; corroborated visual height filtering, self-exclusion and stale-result guards; touch reset/capture handling and touch recenter; pause/resume; live runtime-fed validation with reset handling, ten FPS samples and actual FOLLOW confirmation; visible OSM provenance; repeatable Node/browser checks and CI browser evidence.

## Files changed

app.js, logic.js, surface.js, validation.js, index.html, styles.css, package.json, package-lock.json, tests/logic.test.mjs, tests/static.test.mjs, tests/driving.test.mjs, tests/browser.mjs, tools/serve.mjs, .github/workflows/demo-pages.yml, .gitignore, README.md, CODEX_HANDOFF.md, AUDIT.md, ASSETS.md, RELEASE_REPORT.md, assets/generic-pumper.glb, assets/generic-pumper.json, data/osm-public-roads.geojson.

## Deliberately unchanged

Cesium version/engine, Google streaming-only boundary, independent road geometry and matcher concept, physics tuning, station coordinates, desktop bindings, camera modes, diagnostics, training boundary. No dispatch expansion, fictional training roads, building collision engine, city-data rewrite or Google asset extraction.

## Automated tests

17/17 Node tests pass, including all existing regressions and new 10/20/60/120 FPS integration equivalence, long-stall/braking, off-road and surface-filter checks. Syntax checks cover all runtime modules. Bundled assets' source revision and hashes are in ASSETS.md. No API keys are included.

## Browser results

Real Chrome + real Cesium + bundled GLB and road graph at 390×844, 768×1024 and 1440×900. Synthetic tileset and 190 m sample fixture are explicitly confined to tests/browser.mjs. No Google city success is inferred.

Passed: visible loaded model, no horizontal overflow, no uncaught errors or unexpected failed requests, credit option reaching API, exclusion of the truck from sampling, chase behind vehicle, 50.23 m driven, turn, stop, reverse, persistent free-look, RETURNING→FOLLOW, pause/resume, reset clearing validation, tile failure reporting, startup failure/retry, touch joystick/steering/cancel/brake/drag/recenter. The actual unmodified Cesium API also handles an intercepted 403 root request without exposing the entered key. Setup remains usable when sessionStorage throws.

## Screenshots / runtime evidence

Local artifacts/baseline.json, baseline-390.png, baseline-768.png, baseline-1440.png; browser-results.json; setup-*.png; fixture-*.png. Fixture images are renderer/input evidence, not Peterborough city images. Screenshots were visually inspected; the initial sideways/cropped truck prompted the orientation/range correction. Artifacts are ignored by git and uploaded by CI when it runs.

## Performance before / after

Baseline at 10 FPS advanced only 0.04 seconds of physics per 0.1-second frame. The new integrator advances the full frame with 1/120-second substeps; six-second simulations agree across 10, 20, 60 and 120 FPS within 1e-8 for position/speed/heading. Frames over 250 ms are intentionally capped to prevent resume teleports. This fixes timing, not rendering throughput. Headless fixture rendering was approximately 5–7 FPS on this host; that is below the 25 FPS gate and is not a Google-city/device benchmark. Real Google FPS, memory and startup comparisons remain unavailable.

## Regressions / rejected approaches

Touch recenter initially failed after dragging; a touch pointer-up handler fixed the reproduced failure and the full browser suite then passed. The original export-wrapping approach was rejected after inspecting Cesium's non-configurable getters. Unmeasured tile-cache tuning was removed. No remaining failure in the executed automated suite is hidden.

## Known remaining risks

No real-key Google drive, street-level LOD, bridge/deck alignment, slopes or physical mobile performance has been certified. The visual filter has no independent elevation/deck data and cannot distinguish a stable rooftop/tree from a road; it may reject genuine abrupt elevation transitions. Vehicle pitch/roll and building/vehicle collisions remain prototype limitations. Station coordinates and scale must be visually judged in the real city. Headless performance is below the target. The demo must not be treated as a finished operational training system.

## Deployment status

Local: http://127.0.0.1:4173/ (or npm start). GitHub Pages remains disabled: automatic approval review rejected enabling a public website without explicit publishing approval. No push/deployment is claimed. The release is committed locally; its exact SHA is supplied in the completion message.

Repository: https://github.com/edmondsonedits/3D-City-Google-Simulator

Expected Pages address after approved publication: https://edmondsonedits.github.io/3D-City-Google-Simulator/

## Next highest-value task

Enter a Map Tiles API key in the local launch screen, drive from Station 1 through several blocks, turn/brake/reverse, drag/recenter, inspect slopes/bridges, then Diagnostics → Copy validation report. Record recognizability, scale/orientation, grounding, streets and performance. That real-world evidence is the gate for further driving fixes and later training expansion. Publishing the prepared build requires explicit approval.

## Official integration references checked

- https://developers.google.com/maps/documentation/tile/use-renderer — credits and request concurrency.
- https://developers.google.com/maps/documentation/tile/policies — visible attribution and streamed content restrictions.
- https://cesium.com/learn/cesiumjs/ref-doc/Scene.html — sampleHeight objectsToExclude.
- https://cesium.com/learn/cesiumjs/ref-doc/Camera.html — camera transforms, verified numerically in the actual pinned renderer.
