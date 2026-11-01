# NoteNest V2 — Setup guide

## 1. Local development (everything runs on your machine)

Requirements: Node 22+, Docker (for the local Supabase stack), the [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started).

```bash
npm install
supabase start                      # Postgres + Auth + Storage + Mailpit; applies supabase/migrations/*
supabase status -o env              # prints API_URL, ANON_KEY, SERVICE_ROLE_KEY …
cp .env.example .env.local          # then set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from the output
npm run dev                         # http://localhost:5173
```

* Confirmation and reset e-mails are caught by **Mailpit** at <http://127.0.0.1:54324> (nothing is really sent).
* Load the demo library (the migrated V1 catalog + two linked sample notes):
  ```bash
  SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_SERVICE_ROLE_KEY=<service key> node scripts/seed-demo.mjs   # add --reset to rebuild
  ```
* Reset the database at any time: `supabase db reset`.

## 2. Hosted Supabase (production backend)

1. Create a project at <https://supabase.com/dashboard>.
2. Link and push the schema, RLS policies, storage buckets and RPCs:
   ```bash
   supabase login
   supabase link --project-ref <project-ref>
   supabase db push
   ```
3. **Authentication → URL Configuration**
   * *Site URL*: your deployed origin, e.g. `https://<your-app>.embarko.app/`
   * *Redirect URLs*: add `https://<your-app>.embarko.app/**` (and `http://localhost:5173/**` for development).

   The app uses PKCE: e-mail confirmation, password reset and OAuth return to `<site>/?flow=…&code=…`, which supabase-js exchanges for a session. Hash routes (`/#/…`) are unaffected.
4. **Authentication → Providers → Email**: keep *Confirm email* ON (the app and the tests assume it). For real traffic configure a custom **SMTP** server (the built-in sender is heavily rate-limited).
5. **Edge Function** (needed only for opening *unlisted* files / images):
   ```bash
   supabase functions deploy shared-file-url
   ```
   It uses the project's own `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`, which Supabase injects server-side. The service-role key never reaches the browser.
6. Seed the demo library (optional) with the service-role key **from your own shell**, never from the frontend:
   `SUPABASE_URL=https://<ref>.supabase.co SUPABASE_SERVICE_ROLE_KEY=… node scripts/seed-demo.mjs`

## 3. Google OAuth (manual — requires your Google account)

1. <https://console.cloud.google.com> → create/select a project → **APIs & Services → OAuth consent screen** (External; add your domain and support e-mail; scopes `openid`, `email`, `profile`).
2. **Credentials → Create credentials → OAuth client ID → Web application**
   * *Authorized JavaScript origins*: your site origin (`https://<your-app>.embarko.app`) and, for development, `http://localhost:5173`
   * *Authorized redirect URIs*: `https://<project-ref>.supabase.co/auth/v1/callback`
     (local stack: `http://127.0.0.1:54321/auth/v1/callback`)
3. Copy the **Client ID** and **Client secret** into Supabase **Authentication → Providers → Google** and enable it.
   For the local stack set `[auth.external.google] enabled = true`, `client_id`, `secret` (use `env(GOOGLE_CLIENT_ID)` / `env(GOOGLE_CLIENT_SECRET)`) in `supabase/config.toml`.
4. Build the frontend with `VITE_ENABLE_GOOGLE_AUTH=true` so the “Continue with Google” button appears.
5. Make sure the site URL is in Supabase's **Redirect URLs** list (step 2.3). Test: click the button → Google consent → you land on `/#/dashboard`.

> The automated tests verify that the button starts the OAuth flow with PKCE and an allow-listed `redirect_to`. They cannot complete Google's consent screen without real credentials.

## 4. Environment variables

| Variable | Where | Secret? | Purpose |
|---|---|---|---|
| `VITE_SUPABASE_URL` | frontend build | no | Supabase API URL |
| `VITE_SUPABASE_ANON_KEY` | frontend build | no (public, RLS-protected) | anon / publishable key |
| `VITE_ENABLE_GOOGLE_AUTH` | frontend build | no | show the Google button |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | **your shell / CI only** | **YES** | seed script and DB integration tests |
| `PORT`, `SUPABASE_URL` | optional `npm start` server | no | static server port / CSP `connect-src` |

## 5. Quality gates

```bash
npm run test:logic     # sanitizer, anchors, file validation (no services needed)
npm run build          # typecheck + production build
npm run test:db        # RLS / storage / auth integration tests (needs `supabase start`)
npm run test:e2e       # Playwright against the production build + the local stack
```
