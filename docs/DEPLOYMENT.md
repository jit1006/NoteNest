# Deployment

NoteNest V2 = **static frontend** (`dist/`) + **hosted Supabase** (Postgres, Auth, Storage, one Edge Function).
No server of ours holds state, sessions or secrets.

## What was checked about Embarko (and what was not)

Source: the public `embarko-ai/skill` repository (`SKILL.md`), read via the GitHub API. The Embarko documentation site itself (`embarko.ai/docs/*`) returned HTTP 403 to my tooling, so the detail pages could **not** be read.

| Statement | Status |
|---|---|
| Embarko builds an app from source automatically (no Dockerfile) and serves it at `<app-name>.embarko.app` | ✅ stated in `SKILL.md` |
| Apps are expected to listen on `PORT` / `0.0.0.0`, may use `DATA_DIR`, and Embarko deploys via `scripts/deploy.sh` | ✅ stated in `SKILL.md` (“what an app needs to run (PORT, 0.0.0.0, DATA_DIR, no Dockerfile)”) |
| Static sites are a supported kind (the Integrations feature is documented as unavailable for them) | ✅ implied by `SKILL.md` |
| How a **Vite single-page app** is detected, built and served (build command, output folder, SPA fallback) | ❓ **unverified** |
| Whether build-time `VITE_*` variables can be set for the build | ❓ **unverified** |
| Whether Embarko can run a Node server (so `npm start` / `server.mjs` is usable) | ❓ **unverified** (SKILL.md suggests apps listen on `PORT`, but I did not read the details) |

Because of that, nothing here assumes an Embarko API. Provide the **official Embarko deployment prompt/instructions** and the deployment can be finished exactly as they specify. The app is prepared for either shape:

* **Static hosting** – upload `dist/` (hash routes, relative asset paths → no rewrite rules needed).
* **Node process** – `npm run build && npm start` (`server.mjs`: zero dependencies, binds `0.0.0.0:$PORT`, security headers, SPA fallback).

## Steps (after Embarko's instructions are known)

1. Create/prepare the hosted Supabase project (`docs/SETUP.md` §2) and note the project URL and **anon** key.
2. Build the frontend with the public values baked in:
   ```bash
   VITE_SUPABASE_URL=https://<ref>.supabase.co VITE_SUPABASE_ANON_KEY=<anon key> VITE_ENABLE_GOOGLE_AUTH=true npm run build
   ```
   (If Embarko builds from source, set the same three variables in its build environment. They are public by design.)
3. Deploy, then copy the live origin (e.g. `https://notenest.embarko.app`).
4. In Supabase → **Authentication → URL Configuration** set *Site URL* to that origin and add `https://notenest.embarko.app/**` to *Redirect URLs*.
5. In Google Cloud add the origin to *Authorized JavaScript origins* (redirect URI stays the Supabase callback — `docs/SETUP.md` §3).
6. Smoke-test: register → confirm e-mail → create a note → upload a PDF → reload on a second device.

## Routing and SPA notes

* Routes use the **hash** (`/#/explore`), so deep links work on any static host without server rewrites.
* Auth e-mail/OAuth links return to the site root with `?flow=…&code=…`; `index.html` must therefore be served at `/` (default for every host).
* `index.html` loads `theme-init.js` as an external file so a strict `script-src 'self'` CSP works.

## Recommended response headers (static hosts that allow them)

```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://<ref>.supabase.co; connect-src 'self' https://<ref>.supabase.co wss://<ref>.supabase.co; worker-src 'self' blob:; frame-src https://<ref>.supabase.co; object-src 'none'; base-uri 'self'; frame-ancestors 'none'
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
```

## Secrets checklist

* [x] Only `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_ENABLE_GOOGLE_AUTH` reach the bundle.
* [x] Service-role key: only in your shell for `scripts/seed-demo.mjs`, in CI for tests, and (injected by Supabase) inside the edge function.
* [x] Google client secret: only in the Supabase dashboard.
* [ ] Before launch: configure custom SMTP, review rate limits, enable Supabase backups.
