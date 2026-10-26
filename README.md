# Solar System Explorer

An interactive, stylized map of the solar system, drawn like a candlelit
astrolabe. Start with an overview of the Sun and the eight planets, click a
planet to fly to it, explore its points of interest (POIs), and click a POI to
read facts about it.

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
npm test         # unit tests (Vitest)
npm run test:e2e # end-to-end tests (Playwright, against the production build)
npm run test:all # lint, build, and both test suites
```

The first end-to-end run needs a browser: `npx playwright install chromium`.

## Tests

- `test/`: unit tests for the data file (unique ids, coordinates on the globe, https
  sources, textures present on disk), the plate layout at every supported viewport,
  view transitions, and formatting.
- `e2e/`: browser tests for navigation (click, links, Back, Escape, browser history,
  reduced motion), panels, credits, the masthead toggles, layout at each supported
  screen size, the security headers and CSP, and the error states (3D code or
  textures failing to load, no WebGL). Any console error fails a test.

CI (`.github/workflows/ci.yml`) runs lint, build, and both suites on every push and
pull request.

## Deploying

The site is static and deploys to [Vercel](https://vercel.com): import the repo
and Vercel picks up `vercel.json` (Vite preset, `npm run build`, output `dist/`).
No environment variables are needed.

`vercel.json` also sets the security headers (a strict Content Security Policy,
no framing, `nosniff`) and long-lived caching for the hashed files in `assets/`.
`npm run preview` serves the same headers, so run it before deploying whenever you
add an external resource (a new font host, image CDN, and so on) and check the
browser console for CSP errors. Views live in the URL hash, so no rewrites are needed.

## Project structure

```
src/
  scene/       3D layer (React Three Fiber), shaders, and layout
  components/  Line work and UI layers (labels, masthead, navigation)
  data/        solarSystem.ts, which holds all planet and POI content
```

Click a planet to zoom into its planet view; link to one directly with its id,
for example `/#mars`. Escape or "Back to the system" returns to the overview.

To add or edit planets and POIs, change `src/data/solarSystem.ts`.
Components never hardcode content.

## Credits

Planet, Sun, and ring textures are by
[Solar System Scope](https://www.solarsystemscope.com/textures/), licensed under
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Planet maps were resized
for the web; see `public/textures/CREDITS.md`.

Typefaces: [Marcellus](https://fonts.google.com/specimen/Marcellus) and
[Cormorant Garamond](https://fonts.google.com/specimen/Cormorant+Garamond), via Google Fonts.

The Pluto map is NASA/JHUAPL/SwRI's New Horizons global mosaic (public domain).

This is an independent project and uses no Bungie or Destiny assets.
