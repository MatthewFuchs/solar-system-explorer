# Solar System Explorer

An interactive solar system explorer website. Visitors see a zoomed-out view
of the whole solar system, click a planet to fly to it, see POIs on its
surface, and click a POI to read facts.

## Stack
- Vite + React + TypeScript
- React Three Fiber (`@react-three/fiber`) + drei (`@react-three/drei`) on three.js
- Bloom via `@react-three/postprocessing`
- Lint: oxlint (`npm run lint`). Type-check and build: `npm run build`

## Project rules
- **Stylized layout, not to scale.** Display radii, orbit distances, and orbit
  speeds are tuned for readability, not astronomical accuracy. Don't "fix"
  them toward real values.
- **All content lives in `src/data/solarSystem.ts`.** Planet names, colors,
  taglines, POIs, and facts belong there. Components read from the data file
  and never hardcode content.
- **Never use Destiny or Bungie assets.** The Destiny 2 "Director" map is only
  a design inspiration for the feel. No Destiny or Bungie art, icons, fonts,
  sounds, names, or trademarks. All assets must be original or properly licensed.

## Art direction: "Astrolabe"
Mystical and mysterious, never game-like or sci-fi: a candlelit astrolabe of the
solar system, with planets lit by the Sun out of a violet-black abyss.
- **Fixed composition.** The only motion that runs on its own is each planet
  slowly spinning on its axis (speeds in `bodyAppearance.ts`; Venus and Uranus turn
  retrograde). No orbiting, drifting, or twinkling. Everything else answers the
  user: the point-of-light cursor, and on hover a gold halo fades in, the label
  unfolds its tagline, and other planets dim.
- **Entrance:** on first load (once per session, `sessionStorage`), the scene, orbit
  arcs, names, belts, spacecraft, title, and masthead reveal in one ~2.7s sequence
  (`data-entrance` in `Overview`, keyframes in `index.css`), then everything is still.
  It waits for the 3D scene to be ready (max 2.5s). Never add a second load animation.
- **Reduced motion:** with `prefers-reduced-motion`, planets don't spin; the entrance is
  a single fade; the zoom becomes a short dark dissolve (`.view-veil`); panels fade in
  without sliding. Nothing moves across the screen.
- **Sound:** optional ambient sound, generated live with Web Audio
  (`src/lib/ambientSound.ts`): sparse. Faint filtered air, and single soft pentatonic
  notes surfacing every 5–12s like distant signals, with one quiet echo. Mostly
  silence. Off by default; it may only start from the toggle's click.
  Keep it calm and spacious: no low rumble, no heavy reverb.
- **Easing:** unhurried ease-out (`--ease`, `--dur: 380ms` in CSS; exponential
  damping in R3F). No bouncy or linear easing.
- **Avoid game/HUD tropes:** no glass bars, corner brackets, reticles, crosshair
  cursors, wide-tracked tech sans, or neon blue.
- **Layout is locked:** Sun in the top-left corner, planets on the diagonal, partial
  arcs, title bottom-left. `src/scene/plateLayout.ts` places everything
  (art-directed, not astronomical) and picks label sides that avoid collisions.
- **Palette** (`src/lib/palette.ts`, mirrored in `src/index.css`): abyss `#06040B`,
  candle gold `#D6B06A` for line work and accents, ivory `#ECE4D2` for type, ember
  `#F0A25A` reserved for the Sun's light. Smoky violet haze.
- **Type:** Marcellus (title, small capitals, numerals) + Cormorant Garamond
  (italic planet names, taglines, body). Don't use Inter, Roboto, or Space Grotesk.
- **Line work:** gold hairline arcs with engraved degree ticks and small ring ends;
  leaders end in a four-point star. Glows are a second faint wide stroke.
- **Rendering:** textured planets lit from the Sun's direction, with deep night
  sides and atmospheric rims (`src/scene/shaders.ts`); Saturn has rings; the Sun
  blooms. Haze, sunglow, and vignette are static CSS layers over the canvas.
- **Per-body visuals** (texture, atmosphere color, spin and spin speed, tilt, rings) live in
  `src/scene/bodyAppearance.ts`. That is presentation; facts stay in the data file.
- **Textures** are from Solar System Scope (CC BY 4.0), in `public/textures/`.
  Keep the in-app credit line, the Credits panel, and `public/textures/CREDITS.md`.

## Planet view
Clicking a planet (or loading `#<planet-id>`) opens its planet view. This is the
site's signature moment; keep it intact.
- **The zoom** (`ZOOM_MS` = 1.5s, ease-in-out, `src/scene/viewTransition.ts`): one
  `Timeline` drives the 3D scene. The planet travels to its feature placement while
  everything else scales outward from it and fades out completely. The numeral and
  name FLIP from the overview label into the column with Web Animations on the same
  duration and curve (`ZOOM_EASING_CSS`), and reverse with `Animation.reverse()`, so
  interrupting mid-flight stays in sync.
- **Layout:** magazine spread. Planet large on the right (`computeFeaturePlacement`
  in `plateLayout.ts`), text column on the left; planet above text in portrait.
- **The planet is static** in planet view (no spin, no free rotation). Next / Previous
  turn it to face a point of interest (`TURN_MS`). Full-size `2k/` textures swap in.
- **POI markers** are DOM buttons positioned every frame from the 3D surface point
  (`PlanetBody`), hidden on the far side. They brighten on hover and never animate
  on their own.
- **Leaving:** "Back to the system", Escape, the Overview link, or the browser back
  button all run the reverse transition. The URL hash is the source of truth.
- **Two kinds of POI** (`src/data/solarSystem.ts`): `SurfacePOI` (lat/lon on the body) and
  `OrbitPOI` (moons, rings, spacecraft: a screen angle and distance beside the
  planet, which holds still when one is selected). Never put a moon or spacecraft on
  the surface.
- **POI coordinates must match the textures.** Markers are placed by lat/lon on an
  equirectangular map (left edge = -180°). Before adding or moving a POI, check its
  spot on the texture itself; features that drift (e.g. Jupiter's Great Red Spot) use
  the texture's position, with a comment saying so.

## Spacecraft, belts, and Pluto (overview)
All defined in `src/data/solarSystem.ts`; nothing about them is hard-coded in components.
- **Spacecraft** (`SPACECRAFT`): placed by `anchor` body, `bearing` (degrees from the
  anchor's away-from-Sun direction, counterclockwise; 0 = straight behind it, as for
  Webb at L2), and `distance` (in the anchor's overview radii). The layout treats this
  as a preference and nudges to the clearest nearby spot (`placeSpacecraft`). Drawings
  are hairline SVGs in `src/components/spacecraftDrawings.tsx`, chosen by `drawing`.
  Hover shows name and launch year; click opens the shared detail panel. The masthead
  toggle hides them.
- **Belts** (`BELTS`): static stipple rendered in WebGL (`BeltField`), bounded by two
  bodies' orbits (`between`, `fill`), with a clickable label that slides along the band
  to a clear spot. `density` is dots per 10,000 square pixels.
- **Pluto** (`DWARF_PLANETS`, `kind: "dwarf"`): a full destination with a planet view,
  but no Roman numeral, a dashed orbit, and "Dwarf planet" in place of a numeral. Its
  texture is NASA's New Horizons mosaic, shifted to our longitude convention.
- Everything stays static and fades or flies out with the zoom like the planets.

## Small screens
- Phones (< 640px wide): name-only labels at rest, planet above text in the planet view,
  bottom-sheet panels, no Overview link (Back and the title cover it).
- Short landscape (< 520px tall): compact one-line title, name-only labels, smaller
  scrolling planet-view column. `SHORT_HEIGHT` in `plateLayout.ts` matches the CSS.
- Test at 390×844, 360×740, 375×667, 844×390, and 768×1024 after layout changes.

## Point-of-interest panel
- Clicking a marker (or "Open details") opens `PoiPanel`: an editorial sidebar on the
  right, a bottom sheet on phones. Non-modal: closes with its X, Escape, or a click
  on empty space; markers and Previous / Next switch its content instead.
- Content comes from the POI in the data file: name, category, summary, `facts`,
  optional `stats` (real values with units, shown as data labels), optional `image`
  (licensed and credited only), and `source` for "Learn more".
- Lines reveal with a short stagger. The panel is solid, not translucent, and uses no
  blur. Focus moves to its heading on open and returns on close.
- `SidePanel` is the shared shell (dialog, focus, Escape, outside click, animation);
  `PoiPanel` and `CreditsPanel` are its contents. Credits list fonts, textures, data
  sources, and software; keep them current when adding any asset or source.

## Performance rules
- **No SVG or CSS blur filters on large or full-screen layers** (`feGaussianBlur`,
  `filter: blur/drop-shadow`, `backdrop-filter`). Repainting them during hover
  transitions dropped the page to ~45fps. Fake glows with extra strokes or
  radial gradients.
- The canvas renders every frame for the planet spin (`frameloop="always"`) and only
  on change with reduced motion (`"demand"`). It is capped at 1.5x DPR. Keep the
  per-frame work small: spin is a single rotation write per planet in `useFrame`.
  Measured: 60fps idle on an M2.
- Animate only `opacity` and `transform` where possible; the cursor moves by
  `transform` on its own layer.
- **First load:** the 3D scene (three.js) is a lazily loaded chunk; the main chunk stays
  small so typography paints fast. Textures are WebP (first load about 450 KB); 2K maps
  load only for the open planet. Don't add JPEG/PNG textures or import three.js from
  non-scene modules (e.g. `textures.ts` must stay three-free).
- **Re-renders:** hover changes state in `Overview`; layers that don't depend on hover
  (`TopBar`, `SpacecraftLayer`, `BeltLabels`, `SpaceBackdrop`) are memoized, so pass
  them stable callbacks (`useCallback`).

## Folder structure
- `src/scene/`: 3D layer (R3F), shaders, per-body appearance, and plate layout
- `src/components/`: line work and UI layers (SVG arcs, labels, masthead, backdrop, cursor)
- `src/lib/`, `src/hooks/`: small shared helpers
- `src/data/`: typed content data

## Git workflow
- Commit after each working feature, with a clear, descriptive message.
- Never commit `node_modules`, build output (`dist`), or secrets (`.env*`).
- Ask before any force push or history rewrite (`push --force`, `rebase`,
  `reset --hard` on shared commits, `commit --amend` on pushed commits).
- This repo is rooted at the project folder. There is an unrelated stray git
  repo at the user's home directory. Never touch it.
