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
- **Fixed composition, nothing moves on its own.** No orbiting, spinning, drifting,
  or twinkling. The only motion answers the user: the point-of-light cursor, and on
  hover a gold halo fades in, the label unfolds its tagline, and other planets dim.
  Respect `prefers-reduced-motion` (instant state changes).
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
- **Per-body visuals** (texture, atmosphere color, spin, tilt, rings) live in
  `src/scene/bodyAppearance.ts`. That is presentation; facts stay in the data file.
- **Textures** are from Solar System Scope (CC BY 4.0), in `public/textures/`.
  Keep the in-app credit line, the Credits panel, and `public/textures/CREDITS.md`.

## Performance rules
- **No SVG or CSS blur filters on large or full-screen layers** (`feGaussianBlur`,
  `filter: blur/drop-shadow`, `backdrop-filter`). Repainting them during hover
  transitions dropped the page to ~45fps. Fake glows with extra strokes or
  radial gradients.
- The canvas renders on demand only (`frameloop="demand"`), capped at 1.5x DPR.
- Animate only `opacity` and `transform` where possible; the cursor moves by
  `transform` on its own layer.

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
