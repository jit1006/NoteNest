# NoteNest V2 — Implementation tasks & status

Legend: `[x]` done and verified in CI · `[~]` implemented, verified only partially · `[ ]` not done / external

## Phase 1 — Inspect, specify, plan
- [x] Inspect V1 (React/Vite/Tailwind SPA, static catalog, localStorage) and decide what to keep / migrate / replace (`requirements.md` §0)
- [x] requirements.md, design.md (architecture, access model, ERD), tasks.md

## Phase 2 — Supabase, migrations, RLS
- [x] `supabase/config.toml` (confirmations on, Mailpit, redirect allow-list, PKCE-friendly)
- [x] Migrations: schema (18 tables), helper functions & triggers, RLS for every table, storage buckets + policies, RPCs
- [x] Seed: `scripts/seed-demo.mjs` + `supabase/seed/demo-catalog.json` (V1 catalog → 1 public space, 6 semesters, 8 subjects, 28 PDFs in Storage, 2 linked sample notes)
- [x] ERD (`docs/ERD.md`) · security model (`docs/SECURITY.md`)
- [x] DB integration tests with two real users (`tests/db/*`, 38 tests)

## Phase 3 — Authentication
- [x] e-mail/password sign-up with confirmation, sign-in, sign-out, reset, set-new-password, session restore, protected routes, profile editing
- [x] Google OAuth wiring (PKCE, allow-listed redirect); button gated by `VITE_ENABLE_GOOGLE_AUTH`
- [ ] Google consent end-to-end — **needs your Google credentials** (`docs/SETUP.md` §3)

## Phase 4 — Spaces, semesters, subjects, folders
- [x] CRUD with ownership, soft delete + cascade + trash/restore, composite-FK integrity, space visibility
- [x] Members: invite by username as viewer/editor (RLS-enforced), role change, removal

## Phase 5 — Notes & editor
- [x] Tiptap editor (headings, marks, lists, tasks, quotes, tables, code + highlighting, links, images, attachments, colours, dividers, undo/redo, shortcuts, icon, cover)
- [x] Debounced autosave, saved/saving/failed+retry states, optimistic concurrency with conflict resolution, unload guard
- [x] JSON storage with stable block ids, DB-derived search text, whitelist sanitizer, version history + restore

## Phase 6 — Files
- [x] Drag & drop / picker, per-file progress, queue with retry, client + server validation, quota, signed URLs
- [x] Viewers: PDF (PDF.js), Markdown (sanitised), code/text (highlighted), image, DOCX (mammoth + DOMPurify), PPTX (text outline only), download fallback

## Phase 7 — Reading, bookmarks, annotations
- [x] Reading mode (TOC, text size, deep links to blocks), note / heading / block / resource / PDF-page bookmarks
- [x] Text highlights with comments (block anchors with re-anchoring), PDF highlights (page + normalised rectangles)

## Phase 8 — Cross-semester references
- [x] Five relation types, link dialog (readable notes only), outgoing + backlinks, cross-semester badges, depth-limited cycle-safe graph explorer, no leaks

## Phase 9 — Discovery
- [x] Dashboard (semester cards, recent, favourites, popular, recent uploads), Explore with FTS, filters (type, category, semester, year, subject, owner, date), pagination, permission-aware

## Phase 10 — Collaboration, polish, tests
- [x] Unlisted sharing for notes/resources metadata (token RPC, verified in DB + browser tests), reports, rate limits, activity feed
- [~] Edge function `shared-file-url` (files/images inside UNLISTED items): written, **not executed in CI** (the Edge runtime is not started there) — test it after `supabase functions deploy`
- [x] Unit tests (sanitizer, anchors, files), DB tests, Playwright e2e (auth with Mailpit, two users, uploads, PDF, highlights, references, mobile)
- [~] Tags: tables + policies + guard trigger exist; **no tag UI and no DB test yet**
- [~] Accessibility: semantic landmarks, labels, focus states, skip link, aria-live; no automated axe audit
- [ ] Real-time co-editing (out of scope), antivirus scanning (out of scope)

## Phase 11 — Build & deployment
- [x] Production build in CI; CSP-friendly `index.html`; optional `server.mjs`
- [x] `docs/SETUP.md`, `docs/DEPLOYMENT.md`
- [ ] Hosted Supabase project + `supabase db push` (needs your account)
- [ ] Deploy to Embarko — **waiting for the official Embarko deployment prompt** and your hosted Supabase credentials
