import { readFileSync } from 'node:fs'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'
import { defineConfig } from 'vitest/config'
import { notFound, prerender } from './scripts/prerender.ts'
import { previewNotFound } from './scripts/previewNotFound.ts'

// `npm run preview` serves the production security headers from vercel.json, so the
// Content Security Policy is tested locally before it ships.
type VercelHeaders = { headers: { source: string; headers: { key: string; value: string }[] }[] }
const vercel: VercelHeaders = JSON.parse(readFileSync(new URL('./vercel.json', import.meta.url), 'utf8'))
const siteHeaders = Object.fromEntries(
  vercel.headers.find((rule) => rule.source === '/(.*)')!.headers.map((h) => [h.key, h.value]),
)

// GitHub Pages serves the site from /<repo>/ and can't send headers, so its build sets
// BASE_PATH and GITHUB_PAGES (see .github/workflows/ci.yml) and carries the same Content
// Security Policy in a <meta> tag. frame-ancestors is dropped: browsers ignore it there.
const base = process.env.BASE_PATH || '/'
const metaCsp = siteHeaders['Content-Security-Policy']
  .split(';')
  .map((d) => d.trim())
  .filter((d) => d && !d.startsWith('frame-ancestors'))
  .join('; ')
const cspMeta = (): Plugin => ({
  name: 'csp-meta',
  apply: 'build',
  transformIndexHtml: () => [
    { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: metaCsp }, injectTo: 'head-prepend' },
  ],
})

// https://vite.dev/config/
export default defineConfig({
  // prerender writes a page per world, sitemap.xml, and robots.txt after the build.
  base,
  plugins: [react(), prerender(), notFound(), previewNotFound(), ...(process.env.GITHUB_PAGES ? [cspMeta()] : [])],
  preview: { headers: siteHeaders },
  test: { include: ['test/**/*.test.ts'] },
  build: {
    // The lazily loaded 3D chunk (three.js, React Three Fiber, postprocessing) is about
    // 1 MB minified, 270 KB gzipped; the main chunk the page paints from is far smaller.
    chunkSizeWarningLimit: 1100,
    // Fonts stay files: the CSP allows fonts from 'self' only, not data: URLs.
    assetsInlineLimit: (file) => (/\.woff2?$/.test(file) ? false : undefined),
    rolldownOptions: {
      // The app, and the static 404 page (served by Vercel for unknown paths).
      input: { main: 'index.html', notFound: '404.html' },
    },
  },
})
