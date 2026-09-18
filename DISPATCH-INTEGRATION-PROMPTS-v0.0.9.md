# Dispatch Integration Prompt Set — Prototype v0.0.9

These prompts are designed to be run **in order**. They integrate the Peterborough dispatch simulator into the Google Photorealistic 3D Tiles simulator while keeping the production `index.html` / v0.0.8 build untouched until the integration is proven.

## Ground rules for all 8 prompts

- Destination repo: `edmondsonedits/3D-City-Google-Simulator`
- Experimental entry page: `dispatch-prototype-v0.0.9.html`
- Source repo: `edmondsonedits/Peterborough-Map-Game`
- Do **not** modify the production `index.html` unless a later explicit request says to merge the prototype.
- Preserve Google attribution and the current Google Photorealistic 3D Tiles loading path.
- Keep Google/Cesium as the **visual 3D world**.
- Keep the independent OSM road graph / dispatch data as the **training and routing truth**.
- Do not invent or re-geocode Peterborough stations, EMS bases, hospital data, dispatch calls, or road data when authoritative coordinates already exist in the source repo.
- Prefer adapters/modules over copy-pasting large blocks into one file.
- Keep desktop and mobile working.
- Run existing tests after every stage, add focused tests for the new stage, and stop if a regression appears.
- Never silently substitute Google geometry for training data.
- Use the current source values from the Peterborough repo, not older hard-coded values in the Google prototype.

---

# Prompt 1 of 8 — Build the isolated dispatch data foundation

You are integrating the existing Peterborough dispatch simulator into the experimental Google 3D prototype.

Work only on the experimental dispatch build. Do not modify production `index.html`.

First isolate the prototype runtime so future dispatch work cannot affect the live v0.0.8 simulator:
1. Create a dedicated experimental runtime/bootstrap for `dispatch-prototype-v0.0.9.html`.
2. It may start as a copy/wrapper of the current Google 3D runtime, but the experimental page must no longer depend on production `app.js` for future behavior changes.
3. Keep all current Google 3D city picker, camera, mobile controls, surface alignment, OSM road matching, truck rendering, and API-key behavior working.

Then build a Peterborough data adapter using the authoritative source repo:
- `cities/peterborough/package.js`
- `response-simulator/service-config.js`
- `shared/base-locations.js`
- `shared/dispatch-locations.js`
- `cities/peterborough/dispatch-data.js`
- `shared/dispatch-data-1.4.4.js`
- `shared/hospital-dropoff-store-1.6.49.js`

The adapter must expose a clean immutable experimental API such as:
- city metadata
- Fire bases/stations
- EMS bases
- exact apparatus spawn latitude/longitude/heading
- station/base yard dimensions and rotation
- PRHC hospital/drop-off/checkpoint/drivable area data
- dispatch categories
- normalized dispatch records
- dispatch radius/district/metadata
- Peterborough OSM road data URL/config

Do not manually retype or “improve” source coordinates. Preserve the current authoritative values.

Add validation that rejects malformed lat/lng, duplicate base IDs, and invalid dispatch records.

Acceptance criteria:
- Opening the experimental page still works exactly like the Google 3D prototype.
- A console/runtime diagnostic can report the imported Peterborough package version, number of Fire bases, EMS bases, and dispatch calls.
- No dispatch gameplay yet.
- Production page remains unchanged.
- Tests prove the adapter uses current source values, including Station 1/2/3, both EMS bases, and PRHC.

---

# Prompt 2 of 8 — Add Dispatch Mode, Fire/EMS, and authoritative base spawning

Build on Prompt 1.

After the Ontario God’s-eye city selector chooses **Peterborough**, add a mode choice:
- Free Drive
- Dispatch Simulator

For cities without a complete dispatch package, keep Free Drive available and clearly mark Dispatch Simulator as unavailable rather than fabricating data.

When Dispatch Simulator is selected:
1. Ask Fire or EMS.
2. Populate base/hall choices from the authoritative Peterborough package.
3. Fire must use the three current Fire bases.
4. EMS must use the current EMS bases.
5. Spawn the apparatus at each base’s exact `spawnLat`, `spawnLng`, and `spawnHeading`, not the base center.
6. Respect the base yard/drivable-area geometry where the existing source package provides it.
7. Fire uses the pumper. EMS should use an ambulance if an existing model is available; otherwise use a clearly temporary generic emergency vehicle without breaking Fire.
8. Keep the smooth God’s-eye → city → apparatus camera transition.

Add a compact in-game mode indicator showing:
- Dispatch / Free Drive
- Fire / EMS
- current base

Do not add calls yet.

Acceptance criteria:
- Peterborough → Dispatch → Fire → Station 1/2/3 spawns at the correct source coordinates and heading.
- Peterborough → Dispatch → EMS → each EMS base spawns correctly.
- Free Drive behavior remains available.
- Other Ontario cities do not receive fake Peterborough bases.
- Desktop and mobile flows both work.

---

# Prompt 3 of 8 — Port the dispatch call engine and HUD

Build on Prompt 2.

Port the dispatch gameplay state machine and call-selection behavior from the existing simulator, using these sources as the behavior reference:
- `response-simulator/index.html`
- `shared/dispatch-locations.js`
- `response-simulator/incident-formatting-1.6.44.js`
- `response-simulator/dispatch-voice-bridge-1.4.2.js`
- `response-simulator/service-selection.js`

Preserve the intent of the existing states:
- INACTIVE
- ENROUTE
- ONSCENE
- INSERVICE
- TRANSPORTING for EMS

Add a compact dispatch HUD suitable for the minimal Google 3D interface:
- call type
- location name
- address
- response timer
- distance to target
- next-action state
- minimize/expand behavior that does not obstruct the road view

Port the existing call filters/categories so Fire and EMS only draw appropriate calls. Preserve the existing alarm-category/service rules.

Use the normalized dispatch adapter from Prompt 1. Do not create a second hard-coded call database.

Port the existing dispatch voice behavior where practical, with graceful fallback if speech/audio is unavailable.

Do not add route lines yet.

Acceptance criteria:
- Starting a call randomly selects a valid existing dispatch record.
- HUD shows the correct source name/address/type.
- Timer runs and resets properly.
- Fire and EMS filters behave independently.
- “Next Call”/availability cycle works without reloading.
- No Leaflet dependency is introduced into the 3D driving world itself.

---

# Prompt 4 of 8 — Replace Leaflet incident markers with Cesium 3D incident/arrival logic

Build on Prompt 3.

Port the spatial incident behavior from the 2D simulator into the Google/Cesium world.

Source behavior to preserve:
- dispatch target radius
- nearest-road/access-point fallback
- arrival detection
- distance-to-target updates
- on-scene transition
- existing OSM road graph as routing/driving truth

Replace Leaflet-specific operations such as `L.circle`, `L.marker`, `mapInstance.distance`, and `mapInstance.setView` with Cesium/native simulator equivalents.

Create a restrained 3D incident visualization:
- ground-level target/arrival ring or marker
- readable from driving view without becoming visually huge
- optional label only when useful
- hidden/changed once the apparatus arrives

Important:
- Google 3D mesh is only visual.
- Determine road access using the independent Peterborough road graph, not Google imagery/mesh.
- If a dispatch coordinate is inside a building or away from a drivable road, use the same nearest-road access concept as the existing simulator.

Acceptance criteria:
- Distance decreases correctly while driving.
- Reaching the configured arrival radius triggers ON SCENE once.
- Off-road building coordinates do not require driving through Google buildings.
- Target marker remains aligned to geographic coordinates as the camera moves.
- Arrival behavior works on desktop and mobile.

---

# Prompt 5 of 8 — Port the full EMS transport and hospital workflow

Build on Prompt 4.

Use the existing EMS/hospital source behavior:
- `cities/peterborough/package.js`
- `shared/base-locations.js`
- `shared/hospital-dropoff-store-1.6.49.js`
- EMS logic in `response-simulator/index.html`

Implement the complete EMS mission:
1. Spawn from selected EMS base.
2. Dispatch to an EMS call.
3. Detect scene arrival.
4. Show the existing pickup/scene transition.
5. Begin hospital transport.
6. Change the active destination to PRHC’s authoritative drop-off/checkpoint.
7. Use the authoritative hospital checkpoint radius and drivable-area geometry.
8. Detect hospital arrival.
9. Complete patient handover.
10. Record response time and transport time separately.
11. Return to available / Next Call.

Represent the hospital target with Cesium entities, not Leaflet.

Do not invent a different hospital entrance.

Acceptance criteria:
- Fire missions still complete normally without a hospital leg.
- EMS missions execute both legs in the correct order.
- Timers preserve response vs transport time.
- Hospital arrival requires reaching the authoritative drop-off checkpoint/area.
- Reset/Next Call does not leave stale markers or mission state behind.

---

# Prompt 6 of 8 — Add the in-truck dispatch tablet and route guidance

Build on Prompt 5.

Keep the main driving world Google Photorealistic 3D/Cesium.

Add an in-truck **2D dispatch tablet/MDT** inspired by the existing response tablet:
- use `response-simulator/response-tablet-1.6.48.js` as the behavior/UI reference
- show current apparatus position
- show incident location
- show station/base and, for EMS, hospital
- show a recommended route calculated from the independent OSM road graph
- show call details
- allow open/close/minimize
- make it responsive on desktop and mobile

The tablet may use a conventional 2D OSM/Carto/Leaflet-style road map because it is a separate MDT display. Do not replace the 3D driving world with Leaflet.

Route calculation must come from the independent road graph. Do not use Google 3D mesh as route truth.

Preserve attribution for any 2D basemap.

Acceptance criteria:
- Opening the tablet does not pause or corrupt 3D rendering.
- Recommended route follows the road graph.
- Apparatus marker updates while driving.
- EMS tablet changes from call route to hospital route at the correct mission phase.
- Closing/reopening retains the current mission state.
- Mobile tablet does not cover controls permanently.

---

# Prompt 7 of 8 — Port route comparison, training history, and after-action review

Build on Prompt 6.

Use these systems as source references:
- `response-simulator/route-compare-1.4.2.js`
- `response-simulator/route-reveal.js`
- `response-simulator/route-reveal-review-1.6.26.js`
- `response-simulator/training-history-1.6.45.js`

Record the player’s driven geographic path during every call leg.

At the end of a mission, add an optional after-action review:
- actual driven path
- recommended road-graph route
- start
- incident
- hospital for EMS
- actual distance
- recommended distance
- response time
- transport time for EMS

Use the Google 3D simulator’s high/GTA bird’s-eye camera for review. Render actual and recommended paths as Cesium polylines with restrained opacity and a clear legend.

Support Fire one-leg review and EMS two-leg review.

Preserve/reset training history cleanly between calls. Do not let review mode move the truck.

Acceptance criteria:
- Actual path sampling is efficient and does not create thousands of unnecessary points.
- Review can be entered/exited without corrupting camera follow.
- EMS displays both legs separately.
- Next Call clears review entities.
- Existing driving performance remains smooth.

---

# Prompt 8 of 8 — Integrate editor/data workflow, polish, regression-test, and prepare merge candidate

Build on Prompts 1–7.

Complete the experimental dispatch prototype to a merge-ready state.

Use the existing editor/data systems as reference:
- `dispatch-editor/editor.js`
- `dispatch-editor/spawn-box-editor-1.6.55.js`
- `dispatch-editor/hospital-dropoff-editor-1.6.49.js`
- `shared/dispatch-locations.js`
- `shared/base-locations.js`

Goals:
1. Ensure the new 3D dispatch build consumes the same normalized data schema as the existing editors.
2. Do not duplicate editable location data in multiple incompatible formats.
3. Provide a clear import/export/sync path for:
   - dispatch locations
   - Fire/EMS bases
   - spawn points/headings
   - base yard geometry
   - hospital checkpoint/area
4. Add a small diagnostics panel that reports source package versions and record counts.
5. Add robust cleanup when changing city, mode, Fire/EMS service, or base.
6. Preserve the Ontario God’s-eye selector.
7. Mark Peterborough as Dispatch-capable in the city picker and keep other unsupported cities Free Drive only.
8. Polish transitions:
   - Ontario → city
   - city → base
   - dispatch start
   - scene arrival
   - EMS hospital transport
   - after-action bird’s-eye review
9. Audit mobile layout so the road ahead stays unobstructed.
10. Add regression tests for:
   - Free Drive
   - Fire Station 1/2/3 spawn
   - both EMS bases
   - Fire call lifecycle
   - EMS call + hospital lifecycle
   - call filtering
   - arrival radius
   - route tablet
   - after-action review
   - changing modes without stale state

Do not merge into production automatically. Finish by producing a concise integration report identifying:
- what was reused unchanged
- what was adapted from Leaflet to Cesium
- what data is authoritative
- remaining limitations
- exact files that would need to be promoted when I later approve replacing the production build.

Acceptance criteria:
- Experimental dispatch page is fully playable on desktop and mobile.
- Production v0.0.8 remains untouched.
- All automated tests pass.
- No Google API key is committed.
- No Google mesh/texture data is downloaded or stored.
