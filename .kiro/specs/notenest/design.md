# NoteNest — Technical Design

## 1. Stack
React 18 + TypeScript, Vite 5, Tailwind CSS 3 (class-based dark mode), React Router 6 (`HashRouter`), lucide-react. No other runtime dependencies.

**Why HashRouter?** The hosting target is unknown. Hash URLs (`/#/explore`) work on any static host with no rewrite rules and no 404 fallback config. Vite `base: './'` keeps asset URLs relative.

## 2. Folder structure

```
NoteNest/
├─ .kiro/specs/notenest/{requirements,design,tasks}.md
├─ .github/workflows/ci.yml
├─ public/
│  ├─ favicon.svg
│  └─ pdfs/*.pdf                  # self-created demo PDFs
├─ tools/                         # content authoring (Python, no deps)
│  ├─ generate_pdfs.py            # PDF writer + CLI
│  ├─ content_core.py             # DBMS, DSA, OS, CN
│  └─ content_apps.py             # OOP, SE, Web, AI
├─ scripts/
│  ├─ check-catalog.mjs           # every pdfUrl exists, ids unique, subjects valid
│  └─ test-logic.ts               # (run via tsx-free node --experimental-strip-types)
├─ src/
│  ├─ main.tsx, App.tsx, index.css
│  ├─ types/index.ts
│  ├─ data/{subjects.ts, resources.ts, index.ts}
│  ├─ utils/{filterResources.ts, format.ts, storage.ts, pdf.ts}
│  ├─ hooks/{useLocalStorage.ts, useTheme.ts, useBookmarks.ts, useStudyTasks.ts, useDocumentTitle.ts}
│  ├─ components/
│  │   ├─ layout/{Layout, Navbar, Footer, ScrollToTop}.tsx
│  │   ├─ ui/{Badge, EmptyState, Skeleton, SectionHeading, Breadcrumbs, ResourceGrid}.tsx
│  │   ├─ HeroSection, SearchBar, SemesterSelector, SubjectCard, NotesCard,
│  │   │  FilterPanel, PDFViewer, BookmarkButton, ThemeToggle, StudyTaskCard, StudyTaskForm
│  └─ pages/{Landing, Explore, SubjectDetail, ResourceDetail, PYQLibrary, Bookmarks, Planner, NotFound}.tsx
└─ index.html, vite.config.ts, tailwind.config.js, postcss.config.js, tsconfig*.json, package.json, README.md
```

## 3. Data model

```ts
type ResourceType = 'notes' | 'pyq' | 'reference';
interface Resource {
  id: string; title: string; description: string;
  semester: number; subjectId: string; subjectName: string;
  unit: string; topic: string; resourceType: ResourceType;
  year?: number; pdfUrl: string; tags: string[]; createdAt: string; // ISO date
}
```
`resources.ts` declares compact `ResourceSeed` rows (no `subjectName`, no URL prefix) and a `buildResource()` step derives `subjectName`, `semester` (from subject) and `pdfUrl` (`${BASE_URL}pdfs/<file>`). The exported `resources: Resource[]` therefore matches the spec exactly while staying DRY.

`Subject { id, name, shortName, semester, description, icon, accent, units: {title, chapters: string[]}[] }`.

"Popular" resources are curated via a `popular: true` flag in the seed (there's no analytics backend — documented honestly in code).

## 4. State and persistence

| State | Where | Key |
|---|---|---|
| Bookmarks (`string[]` of ids) | `useBookmarks` via module-level store + `useSyncExternalStore` | `notenest:bookmarks:v1` |
| Study tasks | `useStudyTasks` (same store pattern) | `notenest:tasks:v1` |
| Theme (`light`/`dark`) | `useTheme`, `<html class="dark">` | `notenest:theme:v1` |
| Search/filter state | URL search params | — |

`storage.ts` wraps get/set in try/catch + shape validation. A shared tiny store factory gives cross-component and cross-tab sync (`storage` event). An inline script in `index.html` applies the theme before first paint.

## 5. Search/filter pipeline

`filterResources(list, {q, semester, subjectId, type, year}, sort)`:
1. tokenise query → lowercase words; each word must appear in a haystack of title+topic+description+subjectName+unit+tags.
2. apply exact filters; 3. sort; returns a new array. Pure and testable.

## 6. Routing

| Path | Page |
|---|---|
| `/` | Landing |
| `/explore` (`?q&semester&subject&type&sort`) | Explore |
| `/subjects/:subjectId` | SubjectDetail |
| `/resources/:resourceId` | ResourceDetail |
| `/pyqs` (`?subject&semester&year`) | PYQLibrary |
| `/bookmarks` | Bookmarks |
| `/planner` | Planner |
| `*` | NotFound |

## 7. PDF handling
`PDFViewer` renders `<object type="application/pdf" data="url#toolbar=1&view=FitH">` with fallback children (message + open + download). A `HEAD`-free approach: fallback content is the native `<object>` fallback, so a missing file or unsupported mobile browser degrades gracefully. Download uses `<a href download="filename.pdf">` for same-origin files.

## 8. Design system
- Tokens in Tailwind config: `brand` (indigo) and `accent` (violet) scales, `shadow-soft`, `shadow-glow`, radii `2xl/3xl`.
- Light: `slate-50` canvas / white cards. Dark: `slate-950` canvas / `slate-900` cards.
- Subtle gradient mesh behind hero; gradient text for key phrase; cards lift 2px on hover; focus ring `ring-2 ring-brand-500 ring-offset-2`.
- `prefers-reduced-motion` disables transitions/transforms.
- System font stack (no external fonts → offline-safe, fast).

## 9. Error handling
Invalid ids → NotFound-style panels; corrupt localStorage → defaults; missing PDF → `<object>` fallback; unknown routes → 404 page.

## 10. Content
8 subjects × 2 notes + 1 demo PYQ-style paper each, plus 4 reference sheets = 28 PDFs, generated by `tools/generate_pdfs.py` from readable source text. All PDFs carry a "NoteNest demo material" footer. PYQ entries are "Model practice papers" — never presented as official.
