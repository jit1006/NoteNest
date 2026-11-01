# NoteNest V2 — Entity-relationship diagram

```mermaid
erDiagram
  AUTH_USERS ||--|| PROFILES : "id = id"
  PROFILES ||--o{ ACADEMIC_SPACES : owns
  ACADEMIC_SPACES ||--o{ SPACE_MEMBERS : "shared with"
  PROFILES ||--o{ SPACE_MEMBERS : "is member"
  ACADEMIC_SPACES ||--o{ SEMESTERS : contains
  SEMESTERS ||--o{ SUBJECTS : contains
  SUBJECTS ||--o{ FOLDERS : contains
  FOLDERS ||--o{ FOLDERS : "parent of"
  SEMESTERS ||--o{ NOTES : "filed in"
  SUBJECTS |o--o{ NOTES : "optional"
  FOLDERS |o--o{ NOTES : "optional"
  NOTES ||--o{ NOTE_VERSIONS : "history"
  NOTES ||--o{ NOTE_REFERENCES : "source"
  NOTES ||--o{ NOTE_REFERENCES : "target"
  SEMESTERS ||--o{ RESOURCES : "filed in"
  SUBJECTS |o--o{ RESOURCES : "optional"
  NOTES |o--o{ RESOURCES : "attachments / images"
  RESOURCES ||--o{ RESOURCE_FILES : "stored as"
  ACADEMIC_SPACES ||--o{ TAGS : defines
  NOTES ||--o{ NOTE_TAGS : tagged
  TAGS ||--o{ NOTE_TAGS : tagged
  PROFILES ||--o{ BOOKMARKS : saves
  NOTES |o--o{ BOOKMARKS : "note / block"
  RESOURCES |o--o{ BOOKMARKS : "file / pdf page"
  PROFILES ||--o{ ANNOTATIONS : writes
  NOTES |o--o{ ANNOTATIONS : "block anchor"
  RESOURCES |o--o{ ANNOTATIONS : "pdf page + rects"
  PROFILES ||--o{ STUDY_TASKS : plans
  PROFILES ||--o{ ACTIVITY_EVENTS : performs
  ACADEMIC_SPACES ||--o{ ACTIVITY_EVENTS : "happens in"
  PROFILES ||--o{ CONTENT_REPORTS : files

  PROFILES { uuid id PK "auth.users.id" text username UK text display_name text bio text avatar_path }
  ACADEMIC_SPACES { uuid id PK uuid owner_id FK text title enum visibility "private|public" bool is_default timestamptz deleted_at }
  SPACE_MEMBERS { uuid space_id PK uuid user_id PK enum role "viewer|editor" }
  SEMESTERS { uuid id PK uuid space_id FK smallint number text title timestamptz deleted_at }
  SUBJECTS { uuid id PK uuid space_id uuid semester_id FK text title text code text color }
  FOLDERS { uuid id PK uuid subject_id FK uuid parent_id FK text title }
  NOTES { uuid id PK uuid space_id uuid semester_id FK uuid subject_id FK uuid folder_id FK uuid owner_id FK text title jsonb content text content_text tsvector search int version enum visibility "private|unlisted|public" uuid share_token }
  NOTE_VERSIONS { uuid id PK uuid note_id FK int version jsonb content uuid created_by }
  RESOURCES { uuid id PK uuid space_id uuid semester_id FK uuid subject_id FK uuid attached_note_id FK uuid owner_id FK enum kind text category smallint academic_year enum visibility uuid share_token }
  RESOURCE_FILES { uuid id PK uuid resource_id FK text storage_path UK text original_filename text mime_type bigint size_bytes }
  NOTE_REFERENCES { uuid id PK uuid source_note_id FK uuid target_note_id FK enum relation_type "prerequisite|related|continuation|revision|cited_source" }
  BOOKMARKS { uuid id PK uuid user_id FK uuid note_id FK uuid resource_id FK text block_id int pdf_page }
  ANNOTATIONS { uuid id PK uuid user_id FK uuid note_id FK uuid resource_id FK jsonb anchor text quote enum color text comment }
  TAGS { uuid id PK uuid space_id FK text name }
  NOTE_TAGS { uuid note_id PK uuid tag_id PK }
  STUDY_TASKS { uuid id PK uuid user_id FK text title bool done date due_date }
  ACTIVITY_EVENTS { uuid id PK uuid actor_id FK uuid space_id FK text event_type uuid entity_id }
  CONTENT_REPORTS { uuid id PK uuid reporter_id FK text target_type uuid target_id text reason }
```

Constraints beyond the arrows:

* composite FKs `(semester_id, space_id)`, `(subject_id, semester_id)`, `(folder_id, subject_id)`, `(attached_note_id, space_id)` keep every hierarchy consistent;
* `note_references`: `UNIQUE (source, target, relation_type)` and `CHECK (source <> target)`;
* `bookmarks`: `CHECK` exactly one target, `block_id ⇒ note`, `pdf_page ⇒ resource`, plus a de-duplicating unique index;
* `annotations`: `CHECK (annotation_anchor_valid(anchor, note_id IS NOT NULL))`.
