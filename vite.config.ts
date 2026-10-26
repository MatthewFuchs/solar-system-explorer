import { readFileSync } from 'node:fs'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// `npm run preview` serves the production security headers from vercel.json, so the
// Content Security Policy is tested locally before it ships.
type VercelHeaders = { headers: { source: string; headers: { key: string; value: string }[] }[] }
const vercel: VercelHeaders = JSON.parse(readFileSync(new URL('./vercel.json', import.meta.url), 'utf8'))
const siteHeaders = Object.fromEntries(
  vercel.headers.find((rule) => rule.source === '/(.*)')!.headers.map((h) => [h.key, h.value]),
)

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  preview: { headers: siteHeaders },
  build: {
    // The lazily loaded 3D chunk (three.js, React Three Fiber, postprocessing) is about
    // 1 MB minified, 270 KB gzipped; the main chunk the page paints from is far smaller.
    chunkSizeWarningLimit: 1100,
  },
})
