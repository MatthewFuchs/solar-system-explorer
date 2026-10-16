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

## Art direction: deep-space destination map
The overview feels like a sci-fi game's destination map: a HUD floating over deep
space. Inspired by that genre (e.g. Destiny 2's Director), never copied from it.
- **Fixed composition, nothing moves on its own.** No orbiting, spinning, drifting,
  or twinkling. The only motion answers the user: the HUD cursor, and on hover a
  selection reticle snaps in, the label brightens and expands to show the tagline,
  and other planets dim. Respect `prefers-reduced-motion` (instant state changes).
- **Easing:** quick ease-out only (`--ease`, `--dur: 240ms` in CSS; exponential
  damping in R3F). No bouncy or linear easing.
- **Layout is locked:** Sun in the top-left corner, planets on the diagonal, partial
  arcs, title bottom-left. `src/scene/plateLayout.ts` places everything
  (art-directed, not astronomical) and picks label sides that avoid collisions.
- **Palette** (`src/lib/palette.ts`, mirrored in `src/index.css`): space `#03050B`,
  HUD white `#D8E8FF`, signal blue `#8FD3FF` for selection and active states,
  sunlight `#FFB24D` reserved for the Sun's light.
- **Type:** Saira (display: wide, uppercase, letter-spaced) + Barlow (body).
  Don't use Inter, Roboto, or Space Grotesk.
- **Rendering:** textured planets lit from the Sun's direction, with a night side and
  atmospheric rim (`src/scene/shaders.ts`); Saturn has rings; the Sun blooms. Nebula
  haze and the Sun's volumetric glow are static CSS layers screen-blended over the
  canvas. The canvas renders on demand only.
- **Per-body visuals** (texture, atmosphere color, spin, tilt, rings) live in
  `src/scene/bodyAppearance.ts`. That is presentation; facts stay in the data file.
- **Textures** are from Solar System Scope (CC BY 4.0), in `public/textures/`.
  Keep the in-app credit line, the Credits panel, and `public/textures/CREDITS.md`.

## Folder structure
- `src/scene/`: 3D layer (R3F), shaders, per-body appearance, and plate layout
- `src/components/`: HUD and UI layers (SVG HUD, labels, top bar, backdrop, cursor)
- `src/lib/`, `src/hooks/`: small shared helpers
- `src/data/`: typed content data

## Git workflow
- Commit after each working feature, with a clear, descriptive message.
- Never commit `node_modules`, build output (`dist`), or secrets (`.env*`).
- Ask before any force push or history rewrite (`push --force`, `rebase`,
  `reset --hard` on shared commits, `commit --amend` on pushed commits).
- This repo is rooted at the project folder. There is an unrelated stray git
  repo at the user's home directory. Never touch it.
