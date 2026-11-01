# NoteNest V2 — Collaborative Academic Knowledge Library

> **Your Semester. Your Notes. One Place.**

A real full-stack app for CS/MCA students: register, organise **spaces → semesters → subjects → folders**, write rich notes in a Notion-style editor, upload and preview documents, bookmark pages and passages, highlight privately, connect notes **across semesters**, search everything you are allowed to see, and share with fine-grained control.

* **Frontend:** React 18, TypeScript, Vite, Tailwind, React Router (hash routes), TanStack Query, Tiptap, PDF.js (react-pdf), react-hook-form + Zod
* **Backend:** Supabase — Auth (email + Google OAuth, PKCE), PostgreSQL (RLS, triggers, RPC, full-text search), Storage (private bucket + signed URLs), one Edge Function
* **Nothing persistent lives in the browser** except the theme preference. Content is in PostgreSQL / Storage and follows you across devices.

> V1 (the static catalog) is **migrated**: its 8 subjects and 28 demo PDFs are loaded into the database and Storage by `scripts/seed-demo.mjs` as a public “NoteNest Demo Library”. All demo material is self-created; practice papers are *model papers*, not official university papers.

## Features

| Area | What works |
|---|---|
| **Auth** | e-mail + password with confirmation, sign-in/out, password reset, Google OAuth, session restore, protected routes, profile + avatar editing |
| **Organisation** | spaces, semesters, subjects, topic folders, notes, files; creator recorded on everything; soft delete + trash/restore |
| **Editor** | headings, bold/italic/underline/strike, inline + block code with syntax highlighting, quotes, tables, checklists, dividers, links, images, attachments, text colour & highlight, icon, cover, undo/redo; **debounced autosave** with saved/failed/retry states and conflict detection; version history with restore |
| **Reading** | distraction-free reading mode, table of contents, text size, deep links to a block |
| **Bookmarks & highlights** | per-user bookmarks for notes, headings/blocks, files and **PDF pages**; text highlights with comments (stable block ids, re-anchoring) and PDF highlights (page + normalised rectangles) — never visible to others |
| **Files** | PDF, Markdown, TXT, DOCX, PPTX, source code, PNG/JPEG/GIF/WebP; drag & drop, progress, retry, 50 MB/file, 200 MB/user; previews for PDF, Markdown, code, images, DOCX (converted), PPTX (**text outline only**); download for everything |
| **Cross-semester links** | prerequisite · related · continuation · revision · cited source; link-search dialog, backlinks, cross-semester cards, graph explorer (depth ≤ 3, cycle-safe) |
| **Discovery** | dashboard (semester cards, recent, favourites, popular, recent uploads), Explore with PostgreSQL full-text search, filters (type, category, semester, exam year, subject, owner, date), pagination |
| **Sharing** | private / **unlisted** (secret revocable link, sign-in required) / public; invite classmates to a space as **viewer** or **editor** (enforced in the database); reports |
| **Planner** | study tasks in the database, progress summary, import of V1 local tasks |
| **UX** | light/dark, responsive 360 px+, skeletons, toasts, dialogs, keyboard navigation, skip link, ARIA labels |

## Quick start (local)

```bash
npm install
supabase start                         # needs Docker; applies supabase/migrations
supabase status -o env                 # copy API_URL and ANON_KEY into .env.local (see .env.example)
npm run dev                            # http://localhost:5173
SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… node scripts/seed-demo.mjs   # optional demo library
```

E-mails (confirmation, reset) appear in Mailpit at <http://127.0.0.1:54324>.

## Testing

| Command | Covers |
|---|---|
| `npm run test:logic` | note sanitizer (XSS cases), annotation anchors, file validation |
| `npm run build` | strict TypeScript + production build |
| `npm run test:db` | **38 integration tests with two real users** against local Postgres/Auth/Storage: RLS read/write isolation, roles, unlisted tokens, soft delete, versions & concurrency, FTS visibility, references/graph/depth/cycles, bookmark & annotation constraints, storage uploads/signed URLs/ownership/quota path, e-mail confirmation & password reset |
| `npm run test:e2e` | **Playwright** on the production build: registration with e-mail confirmation, reset, Google flow start, two-user flows, autosave persistence, uploads, PDF rendering, highlights, cross-semester links, unlisted links, collaboration, planner on two "devices", mobile layout, console-error watch |

CI (`.github/workflows/ci.yml`) runs everything on a real local Supabase stack.

## Documentation

* `docs/SETUP.md` — local + hosted Supabase, **Google OAuth walkthrough**, environment variables
* `docs/DEPLOYMENT.md` — Embarko status (what is verified / not), URLs to configure, headers
* `docs/SECURITY.md` — threat model, controls, **known limitations**
* `docs/ERD.md` — full entity-relationship diagram (Mermaid)
* `.kiro/specs/notenest-v2/` — requirements, design, task status

## Project layout

```
supabase/migrations/   schema · helpers & triggers · RLS · storage · RPC
supabase/functions/    shared-file-url (unlisted file access)
supabase/seed/         migrated V1 catalog (JSON)
src/api/               TanStack Query hooks per entity   src/editor/   Tiptap, sanitizer, autosave, reader
src/viewers/           PDF / Markdown / code / DOCX / PPTX  src/pages/    route pages   src/auth/   Supabase Auth
tests/db/              RLS & storage integration tests    e2e/          Playwright suite
```

## Deployment

Static `dist/` + hosted Supabase. See `docs/DEPLOYMENT.md`. The official Embarko deployment instructions have **not** been applied yet — send them and the deployment can be completed.
