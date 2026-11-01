# NoteNest — Implementation Tasks

Legend: `[x]` done · `[ ]` pending · `(env)` needs network/browser, not possible in the offline authoring sandbox

## Phase 0 — Specs
- [x] Requirements, design, tasks, folder structure

## Phase 1 — Content & data
- [x] Pure-Python PDF writer (`tools/generate_pdfs.py`)
- [x] Educational content for 8 subjects (`tools/content_*.py`)
- [x] Generate 28 PDFs into `public/pdfs/`; verify text extraction & page counts
- [x] Typed subjects + resource catalog (`src/data`)
- [x] `scripts/check-catalog.mjs` (ids unique, subject refs valid, PDF files exist)

## Phase 2 — Scaffold
- [x] package.json, Vite, TS, Tailwind, PostCSS configs, index.html (theme bootstrap), favicon
- [x] types, utils (filter, storage, format), hooks

## Phase 3 — Components
- [x] Layout: Navbar (mobile menu), Footer, ScrollToTop, skip link
- [x] ThemeToggle, SearchBar, SemesterSelector, SubjectCard, NotesCard, BookmarkButton
- [x] FilterPanel, PDFViewer, StudyTaskCard/Form, Badge, EmptyState, Skeleton, Breadcrumbs

## Phase 4 — Pages
- [x] Landing, Explore, SubjectDetail, ResourceDetail, PYQLibrary, Bookmarks, Planner, NotFound

## Phase 5 — QA
- [x] Logic checks for search/filter/sort (`scripts/test-logic.ts`)
- [x] CI workflow: install, typecheck, catalog check, logic test, build
- [x] CI green on GitHub Actions (typecheck + build)
- [x] Browser smoke suite `e2e/smoke.mjs` (17 checks, 0 console errors) run against the CI-built dist

## Phase 6 — Deployment prep
- [x] README
- [ ] Ask owner for the official Embarko deployment prompt, then deploy `dist/`
