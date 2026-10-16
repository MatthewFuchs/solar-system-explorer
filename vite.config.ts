import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // The lazily loaded 3D chunk (three.js, React Three Fiber, postprocessing) is about
    // 1 MB minified, 270 KB gzipped; the main chunk the page paints from is far smaller.
    chunkSizeWarningLimit: 1100,
  },
})
