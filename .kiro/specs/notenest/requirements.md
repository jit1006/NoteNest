# NoteNest — Requirements Specification

**Tagline:** "Your Semester. Your Notes. One Place."
**Context:** Embarko Student Challenge 2026 · static-site MVP (no backend, no auth, no cloud DB)

## 1. Analysis summary

| Aspect | Decision |
|---|---|
| Users | College CS / MCA students looking for semester-wise notes and practice papers |
| Core jobs | Find a resource fast, read/download the PDF, save it, plan study tasks |
| Hosting | Pure static files. Must work on any host with no rewrite rules → hash-based routing, relative asset paths |
| Persistence | `localStorage` only (bookmarks, study tasks, theme) |
| Content | Self-created demo PDFs (clearly labelled), catalog in typed TS so it can be swapped for real notes |
| Out of scope | Upload, login, AI features, comments, payments, any fake control that does nothing |

## 2. Functional requirements

Format: **FR-n** — "The system shall …" followed by acceptance criteria (AC).

### Catalog and data
- **FR-1** All displayed resources originate from a single typed catalog.
  - AC: `Resource` has `id, title, description, semester, subjectId, subjectName, unit, topic, resourceType (notes | pyq | reference), year?, pdfUrl, tags, createdAt`.
  - AC: `subjectName` is never hand-typed per resource; it is derived from the subject table so the two cannot drift.
  - AC: A dev-time/CI check confirms every `pdfUrl` points at an existing file.
- **FR-2** Each subject has: id, name, code-style short name, semester, description, icon, accent, and a list of units with chapters.

### Landing page (`/`)
- **FR-3** Navbar with brand logo, links, theme toggle, mobile menu.
- **FR-4** Hero with headline, tagline and a prominent search field. Submitting navigates to `/explore?q=…`.
- **FR-5** Explore-by-semester selector (Sem 1–6). Selecting navigates to `/explore?semester=N`.
- **FR-6** Featured subjects, recently added notes, popular resources, benefits section, footer.

### Explore (`/explore`)
- **FR-7** Text search over title, topic, description, subject name and tags (case-insensitive, multi-word AND).
- **FR-8** Filters: semester, subject, resource type. Sort: newest, oldest, title A–Z, subject.
- **FR-9** All filters and search combine (AND). State lives in URL query string so results are shareable and survive refresh.
- **FR-10** Responsive card grid with title, subject, semester, type, description, download action, bookmark.
- **FR-11** No-results state with a "Clear filters" action. Result count announced to assistive tech.
- **FR-12** Selecting a semester narrows the subject filter options to that semester; stale subject selections are dropped.

### Subject detail (`/subjects/:subjectId`)
- **FR-13** Overview, units & chapters, resource counts by type, related notes and PYQs, breadcrumbs.
- **FR-14** Invalid subject id → friendly "not found" page with navigation back.

### Resource detail (`/resources/:resourceId`)
- **FR-15** Title, description, subject, semester, type badge, tags, PDF preview, Download button, Bookmark button, related resources.
- **FR-16** PDF preview uses the browser's native PDF rendering with a visible fallback (open in new tab + download) if it can't render or the file is missing.
- **FR-17** Download button downloads the real local file with a meaningful filename.
- **FR-18** Invalid resource id → friendly "not found" page.

### PYQ library (`/pyqs`)
- **FR-19** Lists `pyq` resources; filter by subject, semester and year; sorted newest year first.
- **FR-20** Papers are explicitly labelled as demo/model papers — no claim of being official university papers.

### Bookmarks (`/bookmarks`)
- **FR-21** Toggle bookmark from cards and detail page; state persists across refresh and syncs across components/tabs.
- **FR-22** Bookmarks page lists saved resources; ids that no longer exist in the catalog are ignored gracefully. Empty state with CTA.

### Study planner (`/planner`)
- **FR-23** Create (title, optional subject, optional due date), complete/uncomplete, delete tasks. Persisted locally.
- **FR-24** Progress summary: total, completed, remaining, percentage with progress bar. Filter all/active/done. "Clear completed" action.

### Theme and navigation
- **FR-25** Light/dark/system-aware theme, toggle persists; no flash of wrong theme on load.
- **FR-26** Unknown route → 404 page. Scroll resets on navigation.
- **FR-27** Mobile navigation (hamburger) opens/closes, closes on navigation and on Escape.

## 3. Non-functional requirements

- **NFR-1 Static hosting**: no server logic; `vite build` output deployable to any static host; hash routing; relative base path.
- **NFR-2 Accessibility**: semantic landmarks, skip link, labelled inputs, visible focus rings, AA contrast in both themes, `aria-pressed` on toggles, `prefers-reduced-motion` respected.
- **NFR-3 Responsive**: usable at 360 px, 768 px, 1280 px+.
- **NFR-4 Performance**: route-level code splitting not required; keep dependencies minimal (react, react-router-dom, lucide-react).
- **NFR-5 Robustness**: corrupted localStorage never crashes the app; missing PDFs show a fallback.
- **NFR-6 Security**: no secrets, no third-party network calls at runtime (system font stack, no CDN).
- **NFR-7 Replaceability**: swapping demo content requires editing only `src/data/*` and `public/pdfs/*`.

## 4. Verification matrix

| Area | How verified |
|---|---|
| Type safety + production build | `npm run build` (`tsc -b && vite build`) — in CI |
| Search/filter correctness | Pure function `filterResources` with a scripted check (`npm run check:data` + `npm run test:logic`) |
| Catalog ↔ PDF integrity | `scripts/check-catalog.mjs` |
| PDFs readable | Generated by `tools/generate_pdfs.py`, text-extracted and page-checked |
| Routes, persistence, dark mode, mobile nav, console errors | Manual/browser checklist in README (requires an environment with network + browser) |
