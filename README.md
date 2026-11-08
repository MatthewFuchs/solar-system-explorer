# Solar System Explorer

An interactive, stylized map of the solar system, drawn like a candlelit
astrolabe. Start with an overview of the Sun and the eight planets, click a
planet to fly to it, explore its points of interest (POIs), and click a POI to
read facts about it.

**Live site: [matthewfuchs.github.io/solar-system-explorer](https://matthewfuchs.github.io/solar-system-explorer/)**

The layout is stylized for readability. Sizes, distances, and orbit speeds
are **not** to scale.

## Stack

Vite · React · TypeScript · React Three Fiber · drei (three.js)

## Getting started

Requires Node.js 20.19+ (22.18+ for `npm run og`).

```bash
npm install
npm run dev      # start the dev server at http://localhost:5173
npm run build    # type-check, build, and prerender the pages into dist/
npm run preview  # serve the production build locally, as Vercel would
npm run lint     # run oxlint
npm test         # unit tests (Vitest)
npm run test:e2e # end-to-end tests (Playwright, against the production build)
npm run test:all # lint, build, and both test suites
npm run og       # recapture the link-preview images in public/og/
```

The first end-to-end run needs a browser: `npx playwright install chromium`.

## Pages and URLs

Each world has its own page: `/` is the overview, and `/sun`, `/mercury` …
`/neptune`, and `/pluto` open a world's planet view. On GitHub Pages these sit under
the repo's path, e.g. [`/solar-system-explorer/mars`](https://matthewfuchs.github.io/solar-system-explorer/mars). Escape, "Back to the system", and
the browser's back button return to the overview. Older `/#mars` links still work and
turn into `/mars`. Any other address shows the custom 404 page.

To add or edit planets and POIs, change `src/data/solarSystem.ts`.
Components never hardcode content.

## Search engines and link previews

The app draws its text with JavaScript, so the build also writes a real HTML page for
each URL (`scripts/prerender.ts`), filled from the data file:

- its own title, description, canonical URL, and Open Graph / Twitter tags
- structured data (schema.org `WebSite`, `WebPage`, and `BreadcrumbList`, linking each
  world to its Wikipedia article)
- the world's text (name, tagline, stats, every point of interest and its facts),
  which React replaces when the app starts
- `sitemap.xml` and `robots.txt`

Link-preview images (1200×630) are in `public/og/`. After visual changes, run
`npm run og` and commit the new images.

### Site address

Canonical URLs, the sitemap, and preview images need the site's full address. The
build uses, in order:

1. `SITE_URL`, if set (e.g. `https://example.com`). The GitHub Pages deploy sets it
   from the Pages address automatically, including a custom domain if you add one.
   On Vercel, set it once you add a custom domain.
2. Vercel's production URL (`VERCEL_PROJECT_PRODUCTION_URL`), set automatically.
3. `http://localhost:4173` for local builds.

After launch, verify the domain in [Google Search Console](https://search.google.com/search-console)
and submit `/sitemap.xml`.

## Privacy

The site sets no cookies and has no analytics or tracking, so it needs no cookie
banner. Fonts and textures are self-hosted: a visit makes no requests to other sites.
One `sessionStorage` flag remembers that the opening animation has played. Once a visitor
discovers something, a logbook appears: it and the places they've been are kept in this
browser's `localStorage` (one key, `sse-journey-v1`), are never sent anywhere, and can be
forgotten from the logbook at any time. Storage the visitor's own use needs is "strictly
necessary", so this needs no consent banner either.

## Tests

- `test/`: unit tests for the data file (unique ids, coordinates on the globe, https
  sources, textures present on disk), the plate layout at every supported viewport,
  view transitions, formatting, and the prerendered pages and 404 page.
- `e2e/`: browser tests for navigation (click, page URLs, old hash links, Back,
  Escape, browser history, reduced motion), panels, credits, the masthead toggles,
  layout at each supported screen size, the security headers and CSP, the pages search
  engines see (titles, canonical URLs, structured data, sitemap, text without
  JavaScript), the 404 page, and the error states (3D code or textures failing to load,
  no WebGL). Any console error fails a test.

CI (`.github/workflows/ci.yml`) runs on every push and pull request: lint, build, and
unit tests first, then the end-to-end suite split across four runners (one browser
worker each, since WebGL runs in software there), merged into one HTML report
(the `playwright-report` artifact). Pushes to `main` deploy only when all of it passes.

## Deploying

### GitHub Pages (live)

The site is hosted on GitHub Pages at **<https://matthewfuchs.github.io/solar-system-explorer/>**.
Every push to `main` that passes CI is built and deployed by the `build-pages` and
`deploy` jobs in `.github/workflows/ci.yml`. To deploy by hand, run the CI workflow
from the Actions tab (`workflow_dispatch`).

One-time setup: in the repo's **Settings → Pages**, set **Source** to **GitHub Actions**.

GitHub Pages serves a project site from `/solar-system-explorer/` and can't send
custom HTTP headers, so the Pages build differs from a plain one in two ways:

- `BASE_PATH` sets Vite's `base`; the app, prerendered pages, sitemap, and 404 page
  all link under it.
- `GITHUB_PAGES=true` puts the Content Security Policy from `vercel.json` into a
  `<meta>` tag (without `frame-ancestors`, which browsers ignore there). The other
  headers (`X-Frame-Options`, `nosniff`, cache rules) aren't available on Pages.

To try the Pages build locally:

```bash
GITHUB_PAGES=true BASE_PATH=/solar-system-explorer/ npm run build
GITHUB_PAGES=true BASE_PATH=/solar-system-explorer/ npm run preview
# then open http://localhost:4173/solar-system-explorer/
```

### Vercel

The site can also deploy to [Vercel](https://vercel.com): import the repo
and Vercel picks up `vercel.json` (Vite preset, `npm run build`, output `dist/`,
clean URLs). No environment variables are required; see "Site address" for `SITE_URL`.

`vercel.json` also sets the security headers (a strict Content Security Policy that
allows only the site's own scripts, styles, fonts, and images; no framing; `nosniff`)
and long-lived caching for the hashed files in `assets/`. `npm run preview` serves the
same headers, clean URLs, and 404 page, so run it before deploying whenever you add an
external resource and check the browser console for CSP errors.

## Project structure

```
src/
  scene/       3D layer (React Three Fiber), shaders, and layout
  components/  Line work and UI layers (labels, masthead, navigation)
  data/        solarSystem.ts, which holds all planet and POI content
  lib/         Small shared helpers (formatting, page titles, sound)
scripts/       Build-time prerendering, the 404 chart, preview 404s, share images
test/          Unit tests
e2e/           End-to-end tests
404.html       The custom 404 page (static, no script)
```

## Credits

Planet, Sun, and ring textures are by
[Solar System Scope](https://www.solarsystemscope.com/textures/), licensed under
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Planet maps were resized
for the web; see `public/textures/CREDITS.md`.

Typefaces: [Marcellus](https://fonts.google.com/specimen/Marcellus) and
[Cormorant Garamond](https://fonts.google.com/specimen/Cormorant+Garamond), under the
SIL Open Font License, self-hosted via [Fontsource](https://fontsource.org).

The Pluto map is NASA/JHUAPL/SwRI's New Horizons global mosaic (public domain).

This is an independent project and uses no Bungie or Destiny assets.

## License

Copyright © 2026 Matthew Fuchs. All rights reserved. See [LICENSE](LICENSE).
Third-party assets keep their own licenses, listed under Credits.
