# Solar System Explorer

An interactive solar system explorer website. Visitors see a zoomed-out view
of the whole solar system, click a planet to fly to it, see POIs on its
surface, and click a POI to read facts.

## Stack
- Vite + React + TypeScript
- React Three Fiber (`@react-three/fiber`) + drei (`@react-three/drei`) on three.js
- Lint: oxlint (`npm run lint`). Type-check and build: `npm run build`

## Project rules
- **Stylized layout, not to scale.** Display radii, orbit distances, and orbit
  speeds are tuned for readability, not astronomical accuracy. Don't "fix"
  them toward real values.
- **All content lives in `src/data/solarSystem.ts`.** Planet names, colors,
  taglines, POIs, and facts belong there. Components read from the data file
  and never hardcode content.
- **Never use Destiny or Bungie assets.** The Destiny 2 "Director" map is only
  a design inspiration. No Destiny or Bungie art, icons, fonts, sounds, names,
  or trademarks. All assets must be original or properly licensed.

## Art direction: "Night Plate"
The overview is a fixed composition, like an antique engraved astronomical plate.
- **Nothing moves on its own.** No orbiting, spinning, or drifting. The only motion
  answers the user: custom cursor, and on hover the planet brightens, its label
  eases in, and the others dim. Respect `prefers-reduced-motion`.
- **Easing:** ease-out only (`--ease` in CSS, exponential damping in R3F). No bouncy
  or linear easing.
- **Palette** (`src/lib/palette.ts`, mirrored in `src/index.css`): Prussian ink
  `#101A2B` / `#0A1220`, bone `#D9D0BC`, gilt `#C9973F` reserved for the Sun and
  active states. Planet tones are muted versions of the data colors.
- **Type:** Bodoni Moda (display, numerals, names) + Hanken Grotesk (body).
  Don't use Inter, Roboto, or Space Grotesk.
- **Rendering:** planets are halftone-shaded spheres (`src/scene/halftoneShader.ts`),
  never photo textures. Film grain over the page. The canvas renders on demand.
- **Layout:** `src/scene/plateLayout.ts` places everything (art-directed, not
  astronomical). Placement is presentation; planet facts still come from the data file.

## Folder structure
- `src/scene/`: 3D layer (R3F) and plate layout
- `src/components/`: 2D layers and UI (SVG arcs, labels, cursor, overview shell)
- `src/lib/`, `src/hooks/`: small shared helpers
- `src/data/`: typed content data

## Git workflow
- Commit after each working feature, with a clear, descriptive message.
- Never commit `node_modules`, build output (`dist`), or secrets (`.env*`).
- Ask before any force push or history rewrite (`push --force`, `rebase`,
  `reset --hard` on shared commits, `commit --amend` on pushed commits).
- This repo is rooted at the project folder. There is an unrelated stray git
  repo at the user's home directory. Never touch it.
