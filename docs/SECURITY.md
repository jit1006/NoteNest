# NoteNest V2 — Security model

**Principle:** the browser is untrusted. Authorization lives in PostgreSQL (RLS, constraints, triggers) and Storage policies. The frontend only hides buttons.

| Concern | Control | Verified by |
|---|---|---|
| Identity | Supabase Auth only (hashed passwords, e-mail confirmation, PKCE). No custom password code. | `tests/db/06`, e2e auth flows |
| Reading others' private data | RLS on **all 18 tables**; `anon` has no write privileges | `tests/db/01–04` |
| Editing others' data | write policies require ownership or editor role; `owner_id`/`space_id` immutable (trigger); visibility changeable only by the owner | `01`, `02` |
| Roles | `space_members` viewer/editor enforced in policies through SECURITY DEFINER helpers (no policy recursion) | `02`, e2e collaboration |
| Hierarchy integrity | composite foreign keys (note ↔ subject ↔ semester ↔ space) | `01` |
| Unlisted links | not readable through tables; the RPC needs a **signed-in user + secret token**; tokens rotate on demand and are never writable by clients; the edge function re-checks before signing files | `02`, `05`, e2e |
| Files at rest | private bucket; an object is readable only if a readable `resource_files` row references it; signed URLs (5 min) | `05` |
| Upload validation | bucket MIME allow-list + 50 MB cap; storage policy: own folder + extension allow-list; trigger: object exists, size/MIME match, path owner, **200 MB quota**; client magic-byte check | `05`, `test:logic` |
| Never executed | SVG/HTML/JS rejected; text/code shown as inert text; Markdown through `rehype-sanitize`; DOCX through mammoth + DOMPurify; PDF.js with `isEvalSupported:false` | `test:logic`, e2e |
| Stored XSS in notes | every document passes a whitelist sanitizer (node/mark/attribute allow-list, safe URLs, colour validation) on load and save; link `href` re-validated at render; images/attachments carry only validated ids | `test:logic` (javascript:, data:, CSS injection, unknown nodes) |
| Search leaks | `search_library` is SECURITY INVOKER (RLS applies); unlisted excluded | `03` |
| Reference leaks | a reference row is visible only if **both** notes are readable; graph traversal is filtered by RLS, depth ≤ 3, cycle-safe | `04`, e2e |
| Personal data | bookmarks / annotations strictly `user_id = auth.uid()`; creation requires read access to the target | `04`, e2e |
| Abuse | per-hour creation limits (spaces, notes, resources, annotations, references, reports); storage quota; content reports | `01` |
| Deletion | soft delete cascades down and hides content from others; restore from Settings → Trash | `02`, e2e |
| Secrets | only the public anon key is in the bundle; the service-role key is used by scripts, tests and the edge function only | review |
| Browser hardening | optional `server.mjs` sets CSP (`script-src 'self'`), `nosniff`, referrer and permissions policies; send equivalent headers on any host | `docs/DEPLOYMENT.md` |

## Known limitations

* **No antivirus / deep content scan.** Server-side checks are MIME type, extension, size, ownership and quota. Magic-byte verification is client-side. Add an Edge Function + scanner (e.g. ClamAV) for stricter environments.
* **Publishing a note reveals its semester number/title and subject title** (not the space, siblings or other notes) so readers can filter and see context.
* **Members of a space can read everything in it**, including items marked private — membership is the explicit authorization.
* Unlisted: anyone *signed in* who holds the link can read it; use *Revoke* to rotate it. Bookmarks/highlights are not offered on unlisted files.
* No real-time co-editing: concurrent edits are detected by version and resolved manually (reload or overwrite).
* Report moderation UI is out of scope; reports are stored in `content_reports` for review in the Supabase dashboard.
* Account deletion needs an admin action (the browser cannot delete `auth.users`).
