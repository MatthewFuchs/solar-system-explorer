# Solar System Explorer

An interactive solar system explorer website. Visitors see a zoomed-out view
of the whole solar system, click a planet to fly to it, see POIs on its
surface, and click a POI to read facts.

## Stack
- Vite + React + TypeScript
- React Three Fiber (`@react-three/fiber`) + drei (`@react-three/drei`) on three.js
- Bloom via `@react-three/postprocessing`
- Lint: oxlint (`npm run lint`). Type-check and build: `npm run build`
- Tests: Vitest unit tests in `test/` (`npm test`); Playwright end-to-end tests in
  `e2e/` (`npm run test:e2e`) against `vite preview`, so they run under the real CSP.
  Run `npm run test:all` before committing a feature.

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
- **Planet songs:** with sound on, choosing a world plays its song (`sing()` in
  `ambientSound.ts`), after Kepler's *Harmonices Mundi*: the pitch glides up and back by
  `((1+e)/(1-e))^2` from the body's real `eccentricity` (data file), starting from a note
  set by `distanceAU` and tuned to the ambient pentatonic. The Sun plays a low chord.
  Silent when sound is off.
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
Clicking a planet (or loading `/<planet-id>`) opens its planet view. This is the
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
  button all run the reverse transition. The URL path (`/mars`) is the source of truth;
  older `#mars` links are rewritten to the path on load (`planetFromUrl` in `Overview`).
  The tab title follows the open world (`pageTitle` in `src/lib/seo.ts`).
- **Two kinds of POI** (`src/data/solarSystem.ts`): `SurfacePOI` (lat/lon on the body) and
  `OrbitPOI` (moons, rings, spacecraft: a screen angle and distance beside the
  planet, which holds still when one is selected). Never put a moon or spacecraft on
  the surface.
- **Moons and spacecraft are objects.** Orbit POIs listed in `ORBITERS`
  (`bodyAppearance.ts`) are drawn, not marked: moons as lit spheres (`Orbiters.tsx`, maps in
  `public/textures/moons/`, radius in planet radii, `face`/`faceLat` choose the side shown),
  spacecraft (ISS, MESSENGER) as hairline drawings. Their button covers the object; a gold
  ring shows on hover or selection. `fitOrbitAngle` turns an object along its orbit until it
  fits on screen (clear of the text column on short landscape, `featureKeepOut`). Rings and
  the corona keep plain markers.
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

## The Sun
- The Sun is a destination too (`kind: "star"`, `#sun`): rendered by `PlanetBody` in star
  mode (emissive `sunShader`, no atmosphere). Its overview label sits past its rim
  (`layout.star`); it has no orbit arc. Up close its brightness eases from `SUN_GLOW` to
  `SUN_GLOW_CLOSE` so the surface reads; surface markers use dark ink there.
- Hovered labels stay readable through a warm near-black halo that hugs the letters
  (`--halo`) plus a soft oval pool behind them (a radial gradient on
  `.dest-label__text::before` that fades to nothing at its edges). Never a hard-edged
  backing box: boxes look like smudges over the Sun's glow.

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

## Deployment and security
- **GitHub Pages** (`.github/workflows/ci.yml`): every push and PR runs lint, build, and
  unit tests, then e2e sharded over four runners (one worker each: software WebGL starves
  with more). Pushes to `main` that pass everything are built with `GITHUB_PAGES=true`,
  `BASE_PATH=/<repo>/`, and `SITE_URL` from `configure-pages`, then deployed. Pages sends
  no custom headers, so that build carries the CSP from `vercel.json` in a `<meta>` (minus
  `frame-ancestors`). All internal URLs must respect the base: `import.meta.env.BASE_URL`
  in the app, `config.base` in build plugins; never hard-code a leading `/`.
- Also deployable on Vercel. `vercel.json` holds the build settings and security headers
  (strict CSP: scripts, styles, fonts, and images from `'self'` only) and clean URLs.
  `vite.config.ts` mirrors the headers into `npm run preview`, and
  `scripts/previewNotFound.ts` mirrors Vercel's 404s and trailing-slash redirects.
- **Fonts are self-hosted** (`@fontsource/*`, imported in `src/main.tsx` and
  `src/notFound.css`). Vite must not inline them as `data:` URLs (`assetsInlineLimit`).
- **Privacy:** no cookies, analytics, or third-party requests, so no cookie banner.
  An E2E test fails on any request to another site. Keep it that way.
- **License:** proprietary, all rights reserved (`LICENSE`, `"license": "UNLICENSED"`).
  Never add an open-source license or publish source maps.
- Adding any external origin (fonts, images, analytics) means updating the CSP in
  `vercel.json` and checking `npm run preview` for CSP errors.
- No inline `<script>`, `eval`, `dangerouslySetInnerHTML`, or injected `<style>`
  tags: the CSP blocks them. Outbound links use `target="_blank" rel="noreferrer"`.
- **Error states:** the 3D scene sits inside `SceneBoundary`. If its chunk or a planet
  texture fails, or WebGL is unavailable, the typography and labels stay usable and a
  quiet italic line under the title says so (`SceneNotice`, with Reload when retrying
  can help). A
  failed 2K map keeps the overview map; a failed moon map draws a plain lit sphere.
- **Loading:** no spinners or loaders. The type paints first, and the entrance waits
  for the scene (max 2.5s); that wait is the loading state.
- **Known issue:** on some portrait screens (768x1024, 375x667, 360x740) labels of
  crowded planets overlap. `e2e/responsive.spec.ts` lists these as expected failures
  (`KNOWN_LABEL_COLLISIONS`); remove an entry once its layout is fixed.

## SEO and prerendering
- The build writes a page per URL (`/`, `/sun` … `/pluto`) with `scripts/prerender.ts`
  (a Vite plugin): title, description, canonical, Open Graph, JSON-LD, and the world's
  text in `#root` (`.prerendered`, replaced by React; it only shows if the app hasn't
  started after 2.5s). Also `sitemap.xml` and `robots.txt`. Content comes from the data
  file (`SITE`, each body's `wikipedia`); `index.html` keeps a `<!--seo-->` marker.
- The site address comes from `SITE_URL`, else `VERCEL_PROJECT_PRODUCTION_URL`, else
  localhost (`siteUrl()`).
- Share images (`public/og/*.jpg`, 1200x630) come from `npm run og`; recapture and
  commit them after visual changes. They are the only JPEGs and are never loaded by the app.
- **404 page:** `404.html` is a second Vite entry with `src/notFound.css` (tokens shared
  through `src/tokens.css`). Static, no script. Its chart (`scripts/notFoundChart.ts`)
  and world links are drawn in by the `notFound` plugin (`scripts/prerender.ts`), in dev and
  in the build; the dev server also answers unknown paths with it.

## Folder structure
- `src/scene/`: 3D layer (R3F), shaders, per-body appearance, and plate layout
- `src/components/`: line work and UI layers (SVG arcs, labels, masthead, backdrop, cursor)
- `src/lib/`, `src/hooks/`: small shared helpers
- `src/data/`: typed content data
- `scripts/`: build-time plugins (prerender, 404 chart, preview 404s) and the share-image script

## Git workflow
- Commit after each working feature, with a clear, descriptive message.
- Never commit `node_modules`, build output (`dist`), or secrets (`.env*`).
- Ask before any force push or history rewrite (`push --force`, `rebase`,
  `reset --hard` on shared commits, `commit --amend` on pushed commits).
- This repo is rooted at the project folder. There is an unrelated stray git
  repo at the user's home directory. Never touch it.
