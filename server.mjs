// Minimal dependency-free static file server for hosts that run a Node process (PORT / 0.0.0.0).
//   npm run build && npm start
// Serves ./dist, adds security headers (incl. a Content-Security-Policy) and falls back to index.html.
// NOTE: pure static hosting works too — see docs/DEPLOYMENT.md. This file is optional.
import { createServer } from 'node:http'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { extname, join, normalize, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('./dist', import.meta.url)))
const port = Number(process.env.PORT || 4173)
const supabase = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://*.supabase.co').replace(/\/$/, '')
const wss = supabase.replace(/^http/, 'ws')

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.pdf': 'application/pdf', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.map': 'application/json' }

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",           // Tailwind + ProseMirror/PDF.js set inline styles
  `img-src 'self' data: blob: ${supabase}`,
  `connect-src 'self' ${supabase} ${wss}`,
  "worker-src 'self' blob:",
  `frame-src ${supabase}`,
  "object-src 'none'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'",
].join('; ')

createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://x')
  let file = normalize(join(root, decodeURIComponent(url.pathname)))
  if (!file.startsWith(root)) { res.writeHead(403).end('Forbidden'); return }          // no path traversal
  if (!existsSync(file) || statSync(file).isDirectory()) file = join(root, 'index.html')   // SPA fallback
  const ext = extname(file)
  res.writeHead(200, {
    'Content-Type': MIME[ext] ?? 'application/octet-stream',
    'Cache-Control': file.includes('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache',
    'Content-Security-Policy': CSP,
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  })
  createReadStream(file).pipe(res)
}).listen(port, '0.0.0.0', () => console.log(`NoteNest serving dist/ on http://0.0.0.0:${port}`))
