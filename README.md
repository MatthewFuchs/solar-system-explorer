# Solar System Explorer

An interactive, stylized 3D map of the solar system. Start with a zoomed-out
view of the Sun and the eight planets, click a planet to fly to it, explore
its points of interest (POIs), and click a POI to read facts about it.

The layout is stylized for readability. Sizes, distances, and orbit speeds
are **not** to scale.

## Stack

Vite · React · TypeScript · React Three Fiber · drei (three.js)

## Getting started

Requires Node.js 20+.

```bash
npm install
npm run dev      # start the dev server at http://localhost:5173
npm run build    # type-check and build for production into dist/
npm run preview  # serve the production build locally
npm run lint     # run oxlint
```

## Project structure

```
src/
  scene/       3D scene components (React Three Fiber)
  components/  2D UI overlays (panels, POI cards, navigation)
  data/        solarSystem.ts, which holds all planet and POI content
```

To add or edit planets and POIs, change `src/data/solarSystem.ts`.
Components never hardcode content.
