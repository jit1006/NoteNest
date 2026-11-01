# NoteNest — Smart Class Notes Library

> **Your Semester. Your Notes. One Place.**

NoteNest is a premium, responsive notes library for college CS / MCA students, built for the Embarko Student Challenge 2026. Explore subjects by semester, search and filter notes, preview and download PDFs, practise with model papers, bookmark resources and plan your study — all as a fast static website with no backend.

> **Demo content notice:** every PDF is self-created illustrative material. "PYQ" entries are *model practice papers*, not official or university-specific past papers.

## Features
- **Landing page** – hero with prominent search, explore-by-semester, featured subjects, recently added, popular resources, benefits, footer
- **Explore** – search (title, topic, unit, subject, tags; multi-word AND), semester / subject / type filters, 4 sort options, all combinable and stored in the URL (shareable, refresh-safe)
- **Subject pages** – overview, units & chapters, resource counts, notes / PYQs / references, breadcrumbs
- **Resource pages** – in-browser PDF preview, real file download, bookmark, related resources, graceful fallback for missing files
- **PYQ library** – filter by subject, semester and year
- **Bookmarks** and **Study planner** (add / complete / remove, progress summary) – persisted in `localStorage`
- **Dark mode** (persisted, no flash), keyboard accessible, skip link, ARIA labels, reduced-motion support, mobile-first layout

## Tech stack
React 18 · TypeScript · Vite 5 · Tailwind CSS 3 · React Router 6 (`HashRouter`) · lucide-react. No backend, auth or cloud services; no runtime network calls.

## Installation & local development
```bash
npm install
npm run dev          # http://localhost:5173
```

## Production build
```bash
npm run build        # typecheck + vite build -> dist/
npm run preview      # serve dist/ locally on :4173
```

## Quality checks
```bash
npm run check:data   # catalog integrity: unique ids, valid subjects, every PDF exists
npm run test:logic   # search / filter / sort / URL-state checks (Node >= 22.18)
npm run build        # TypeScript + production build

# Browser smoke tests (needs Chromium): serve dist/ on :4173, then
npx playwright install chromium
BASE_URL=http://localhost:4173 npm run test:e2e   # 17 checks + console-error watch
```
GitHub Actions (`.github/workflows/ci.yml`) runs all of these on every push.

## Replacing the demo content
1. Put your PDF in `public/pdfs/<name>.pdf`.
2. Add a row to `src/data/resources.ts` (`file` = name without `.pdf`). Subject name, semester and URL are derived automatically.
3. Add subjects in `src/data/subjects.ts`.
4. `npm run check:data` validates everything. (Demo PDFs come from `python3 tools/generate_pdfs.py`; remove them and `tools/` when no longer needed — CI's PDF-regeneration step should then be removed too.)

## Project structure
```
src/
  components/   Navbar, HeroSection, SearchBar, SemesterSelector, SubjectCard, NotesCard,
                FilterPanel, PDFViewer, BookmarkButton, ThemeToggle, StudyTaskCard, Footer, ui/*
  pages/        Landing, Explore, SubjectDetail, ResourceDetail, PYQLibrary, Bookmarks, Planner, NotFound
  data/         subjects.ts, resources.ts (single catalog), index.ts (selectors)
  hooks/        useBookmarks, useStudyTasks, useTheme, useDocumentTitle
  utils/        filterResources (pure), storage, format, accent
public/pdfs/    28 sample PDFs      e2e/  scripts/  tools/    QA + content tooling
.kiro/specs/notenest/   requirements.md, design.md, tasks.md
```

## Deployment considerations
- Output is plain static files in `dist/` — upload the folder to any static host.
- `HashRouter` + relative `base: './'` mean no rewrite rules or fixed sub-path are needed (URLs look like `/#/explore`).
- The host should serve `.pdf` files as `application/pdf`.
- No environment variables or secrets are used.
- The official Embarko deployment steps are not assumed here; provide the Embarko deployment prompt and the build can be adapted if needed.
