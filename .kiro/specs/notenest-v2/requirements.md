# NoteNest V2 — Requirements

## 0. Analysis of the existing codebase (V1)

| V1 asset | Decision |
|---|---|
| React + Vite + Tailwind SPA, HashRouter, 8 pages, 28 self-created demo PDFs, static TS catalog, localStorage for bookmarks/tasks/theme | **Keep**: design system, components (cards, filters, ThemeToggle, skeletons), theme, PDFs, hash routing (host-agnostic) |
| Static catalog (`src/data`) as the source of truth | **Migrate**: seeded into PostgreSQL + Storage as a public "NoteNest Demo Library" space by `scripts/seed-demo.mjs`. The static catalog stops being a data source. |
| localStorage bookmarks / tasks | **Replaced** by database tables. A one-time "Import from this device" action moves existing tasks into the signed-in account. Theme stays local (a device preference, not content). |
| CI: typecheck, build, Playwright smoke | **Extend** with a local Supabase stack (Postgres, Auth, Storage) for RLS integration tests and browser tests |

Backend: Supabase (Auth, Postgres, Storage, RLS). Hosting: static frontend; Supabase is the hosted backend. No custom server holds state.

## 1. Actors
Visitor (anonymous) · Member (signed in) · Owner (of an object) · Collaborator (viewer / editor of a space) · Platform operator (service role, dashboard only; never in the browser).

## 2. Functional requirements

### Authentication (Supabase Auth only)
- **AUTH-1** Email + password sign-up with email confirmation; sign-in; sign-out.
- **AUTH-2** Google OAuth sign-in (PKCE). Setup documented; the button is only shown when `VITE_ENABLE_GOOGLE_AUTH=true`.
- **AUTH-3** Password reset by email → set new password page.
- **AUTH-4** Session restoration on reload; protected routes redirect to login and return to the intended page.
- **AUTH-5** Profile editing: display name, username (unique), bio, avatar (public avatars bucket).
- **AUTH-6** Meaningful loading / error states for every auth action. No custom password handling.

### Organisation
- **ORG-1** Academic spaces → semesters → subjects → folders → notes / resources. Each row records `owner_id` (creator).
- **ORG-2** CRUD with soft deletion (trash + restore). Deleting a container soft-deletes its subtree.
- **ORG-3** Visibility per space, note and resource: `private`, `unlisted`, `public`.
- **ORG-4** Public content is browsable by anyone, including anonymous visitors.
- **ORG-5** **Unlisted** content is excluded from search/lists and from direct table access. It is only retrievable by a *signed-in* user through a server function that checks a revocable share token (rotatable). The URL alone is not sufficient.
- **ORG-6** Collaboration: a space owner invites members by username as `viewer` or `editor`. Roles are enforced in RLS.
- **ORG-7** Hierarchy integrity (a note's subject must be in its semester, which must be in its space) is enforced by composite foreign keys, not by the UI.

### Rich notes
- **NOTE-1** Tiptap editor: title, emoji icon, optional cover (uploaded image), headings, lists, marks (bold/italic/underline/strike), inline + block code with syntax highlighting, quotes, tables, task lists, dividers, links, images, attachments, text colour, highlight.
- **NOTE-2** Document stored as Tiptap JSON (`jsonb`). Each block carries a stable `blockId`.
- **NOTE-3** Debounced autosave to PostgreSQL with optimistic-concurrency (`version` check), visible save state (saving / saved / failed + retry), `beforeunload` guard while dirty.
- **NOTE-4** Rendering never uses raw HTML from the database: content is rendered by a read-only Tiptap schema; link protocols are allow-listed.
- **NOTE-5** Version history: snapshots written by a database trigger (≥ 5 min apart); list + restore (phase 10).
- **NOTE-6** Plain text for search is derived **in the database** from the JSON by a trigger (never trusted from the client).

### Reading and annotations
- **READ-1** Distraction-free reading mode with table of contents.
- **READ-2** Personal bookmarks: note, heading/block (`block_id`), resource, PDF page. Constraint-validated.
- **READ-3** Personal highlights/comments with colours. Rich notes: anchor = `{blockId, start, end, quote, prefix, suffix}` (re-anchors by quote if offsets drift; orphaned if not found). PDFs: anchor = `{page, rects[normalised 0-1], quote}`.
- **READ-4** Annotations/bookmarks are strictly per-user (`user_id = auth.uid()`), stored apart from the content, and require read access to the target.

### Files
- **FILE-1** PDF, Markdown, TXT, DOCX, PPTX, source code, PNG/JPEG/GIF/WebP. Drag & drop + picker, progress, error handling.
- **FILE-2** Private `files` bucket for every document; access only through signed URLs minted under storage RLS that consults the database. Public `avatars` bucket for profile pictures only.
- **FILE-3** Server-side validation: bucket MIME allow-list + size limit, extension allow-list and owner-folder check in storage policies, ownership/existence check and per-user quota in a trigger on `resource_files`.
- **FILE-4** Uploaded content is never executed or injected as HTML. SVG and HTML uploads are rejected.
- **FILE-5** Previews: PDF (PDF.js), Markdown (sanitised), text/code (highlighted), images, DOCX (converted + sanitised in the browser), PPTX (**text outline only**). Anything else: metadata + download. No claim of native preview for every format.

### Cross-semester references
- **REF-1** Typed references: `prerequisite`, `related`, `continuation`, `revision`, `cited_source`.
- **REF-2** Link dialog searches only notes the user can read; creation requires edit rights on the source and read rights on the target (enforced by RLS).
- **REF-3** Outgoing references, incoming backlinks, graph explorer with server-side depth limit (≤ 3) and cycle-safe traversal.
- **REF-4** References never reveal inaccessible notes (rows hidden unless both ends are readable).

### Discovery
- **DISC-1** Dashboard: semester cards, recent notes, favourites, popular public notes, recent uploads.
- **DISC-2** Explore with PostgreSQL full-text search, filters (subject, semester, type, owner, date), pagination; results limited to what the requester may read.

### Planner
- **PLAN-1** Study tasks in the database (optional subject / note link), progress summary, import of V1 local tasks.

### Safety
- **SAFE-1** Reports (`content_reports`) for notes/resources; creation rate limits; storage quota (default 200 MB/user).
- **SAFE-2** Service-role key never in the browser or repo.

## 3. Non-functional
RLS on every table · responsive (360 px+) · WCAG AA contrast, keyboard operable, labelled controls · light/dark · route-level code splitting (editor and PDF chunks lazy-loaded) · works as static files.

## 4. Success criteria / acceptance
1. Two users can register, sign in, create separate notes, share public resources, view permitted notes, upload files, bookmark notes and PDF pages, and create cross-semester links.
2. User B cannot read user A's private note, update/delete A's content, read A's private storage objects, or learn about A's private notes via references/search.
3. Data persists across browsers (PostgreSQL + Storage).
4. `npm run build` succeeds; DB integration tests and browser tests pass in CI against a real local Supabase stack.

## 5. Out of scope / known limits
- Real-time co-editing (CRDT) — editors use last-write-wins with version conflict detection.
- Server-side content scanning of uploads (magic-byte check is client-side; the server enforces MIME/extension/size/ownership). Antivirus would need an Edge Function + scanner.
- Admin moderation UI (reports are stored; review via the Supabase dashboard).
- PPTX visual rendering; legacy `.doc`/`.ppt`.
- Google OAuth end-to-end test requires real Google credentials (manual step documented).
