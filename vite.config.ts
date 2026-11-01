import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' keeps every asset URL relative, so the build works from any
// sub-path or static host (combined with HashRouter, no rewrite rules needed).
export default defineConfig({
  base: './',
  plugins: [react()],
  build: { sourcemap: false, chunkSizeWarningLimit: 700 },
})
