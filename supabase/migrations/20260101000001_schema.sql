-- NoteNest V2 — core schema
-- Identity = auth.users (Supabase Auth). Everything else lives in `public`.

create extension if not exists pg_trgm with schema extensions;

-- ───────────────────────────── enums ─────────────────────────────
create type public.visibility    as enum ('private', 'unlisted', 'public');
create type public.member_role   as enum ('viewer', 'editor');
create type public.resource_kind as enum ('pdf', 'markdown', 'text', 'code', 'docx', 'pptx', 'image', 'other');
create type public.relation_type as enum ('prerequisite', 'related', 'continuation', 'revision', 'cited_source');

-- ───────────────────────────── profiles ─────────────────────────────
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  username     text not null unique,
  display_name text not null default '' check (char_length(display_name) <= 80),
  bio          text not null default '' check (char_length(bio) <= 500),
  avatar_path  text check (avatar_path is null or char_length(avatar_path) <= 300),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint profiles_username_format check (username ~ '^[a-z0-9_]{3,30}$')
);

-- ───────────────────────────── academic structure ─────────────────────────────
create table public.academic_spaces (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references public.profiles (id) on delete cascade,
  title       text not null check (char_length(title) between 1 and 120),
  description text not null default '' check (char_length(description) <= 2000),
  icon        text check (icon is null or char_length(icon) <= 16),
  visibility  public.visibility not null default 'private',
  is_default  boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz,
  constraint spaces_no_unlisted check (visibility <> 'unlisted')
);
create index academic_spaces_owner_idx  on public.academic_spaces (owner_id) where deleted_at is null;
create index academic_spaces_public_idx on public.academic_spaces (updated_at desc) where deleted_at is null and visibility = 'public';

create table public.space_members (
  space_id   uuid not null references public.academic_spaces (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  role       public.member_role not null default 'viewer',
  invited_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (space_id, user_id)
);
create index space_members_user_idx on public.space_members (user_id);

create table public.semesters (
  id          uuid primary key default gen_random_uuid(),
  space_id    uuid not null references public.academic_spaces (id) on delete cascade,
  owner_id    uuid not null references public.profiles (id) on delete cascade,
  number      smallint check (number between 0 and 20),
  title       text not null check (char_length(title) between 1 and 120),
  description text not null default '' check (char_length(description) <= 2000),
  position    integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz,
  unique (id, space_id)
);
create index semesters_space_idx on public.semesters (space_id) where deleted_at is null;
create unique index semesters_space_number_key on public.semesters (space_id, number) where number is not null and deleted_at is null;

create table public.subjects (
  id          uuid primary key default gen_random_uuid(),
  space_id    uuid not null,
  semester_id uuid not null,
  owner_id    uuid not null references public.profiles (id) on delete cascade,
  title       text not null check (char_length(title) between 1 and 120),
  code        text check (code is null or char_length(code) <= 24),
  description text not null default '' check (char_length(description) <= 2000),
  color       text not null default 'indigo' check (color in ('indigo','violet','sky','emerald','amber','rose','fuchsia','teal')),
  position    integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz,
  foreign key (semester_id, space_id) references public.semesters (id, space_id) on delete cascade,
  unique (id, space_id),
  unique (id, semester_id)
);
create index subjects_semester_idx on public.subjects (semester_id) where deleted_at is null;

create table public.folders (
  id         uuid primary key default gen_random_uuid(),
  space_id   uuid not null,
  subject_id uuid not null,
  parent_id  uuid,
  owner_id   uuid not null references public.profiles (id) on delete cascade,
  title      text not null check (char_length(title) between 1 and 120),
  position   integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  foreign key (subject_id, space_id) references public.subjects (id, space_id) on delete cascade,
  unique (id, subject_id),
  foreign key (parent_id, subject_id) references public.folders (id, subject_id) on delete cascade,
  check (parent_id is distinct from id)
);
create index folders_subject_idx on public.folders (subject_id) where deleted_at is null;

-- ───────────────────────────── notes ─────────────────────────────
create table public.notes (
  id          uuid primary key default gen_random_uuid(),
  space_id    uuid not null,
  semester_id uuid not null,
  subject_id  uuid,
  folder_id   uuid,
  owner_id    uuid not null references public.profiles (id) on delete cascade,
  title       text not null default 'Untitled' check (char_length(title) between 1 and 200),
  icon        text check (icon is null or char_length(icon) <= 16),
  cover_resource_id uuid,                                   -- FK added after resources exist
  content     jsonb not null default '{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb
              check (jsonb_typeof(content) = 'object' and octet_length(content::text) <= 2000000),
  content_text text not null default '',                    -- derived by trigger, never trusted from client
  search      tsvector generated always as (
                setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
                setweight(to_tsvector('english', coalesce(content_text, '')), 'B')
              ) stored,
  version     integer not null default 1,
  visibility  public.visibility not null default 'private',
  share_token uuid not null default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz,
  foreign key (semester_id, space_id) references public.semesters (id, space_id) on delete cascade,
  foreign key (subject_id, semester_id) references public.subjects (id, semester_id) on delete cascade,
  foreign key (folder_id, subject_id) references public.folders (id, subject_id) on delete cascade,
  check (folder_id is null or subject_id is not null),
  unique (id, space_id)
);
create index notes_semester_idx on public.notes (semester_id) where deleted_at is null;
create index notes_subject_idx  on public.notes (subject_id) where deleted_at is null;
create index notes_folder_idx   on public.notes (folder_id) where deleted_at is null;
create index notes_owner_idx    on public.notes (owner_id, updated_at desc) where deleted_at is null;
create index notes_public_idx   on public.notes (updated_at desc) where deleted_at is null and visibility = 'public';
create index notes_search_idx   on public.notes using gin (search);
create index notes_title_trgm   on public.notes using gin (title extensions.gin_trgm_ops);

create table public.note_versions (
  id         uuid primary key default gen_random_uuid(),
  note_id    uuid not null references public.notes (id) on delete cascade,
  version    integer not null,
  title      text not null,
  content    jsonb not null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (note_id, version)
);
create index note_versions_note_idx on public.note_versions (note_id, version desc);

-- ───────────────────────────── resources & files ─────────────────────────────
create table public.resources (
  id          uuid primary key default gen_random_uuid(),
  space_id    uuid not null,
  semester_id uuid not null,
  subject_id  uuid,
  folder_id   uuid,
  attached_note_id uuid,                                    -- inline images / attachments belong to a note
  owner_id    uuid not null references public.profiles (id) on delete cascade,
  title       text not null check (char_length(title) between 1 and 200),
  description text not null default '' check (char_length(description) <= 4000),
  kind        public.resource_kind not null,
  visibility  public.visibility not null default 'private',
  share_token uuid not null default gen_random_uuid(),
  search      tsvector generated always as (
                setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
                setweight(to_tsvector('english', coalesce(description, '')), 'B')
              ) stored,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz,
  foreign key (semester_id, space_id) references public.semesters (id, space_id) on delete cascade,
  foreign key (subject_id, semester_id) references public.subjects (id, semester_id) on delete cascade,
  foreign key (folder_id, subject_id) references public.folders (id, subject_id) on delete cascade,
  foreign key (attached_note_id, space_id) references public.notes (id, space_id) on delete cascade,
  check (folder_id is null or subject_id is not null),
  unique (id, space_id)
);
create index resources_semester_idx on public.resources (semester_id) where deleted_at is null;
create index resources_subject_idx  on public.resources (subject_id) where deleted_at is null;
create index resources_owner_idx    on public.resources (owner_id, created_at desc) where deleted_at is null;
create index resources_note_idx     on public.resources (attached_note_id) where attached_note_id is not null;
create index resources_public_idx   on public.resources (created_at desc) where deleted_at is null and visibility = 'public' and attached_note_id is null;
create index resources_search_idx   on public.resources using gin (search);
create index resources_title_trgm   on public.resources using gin (title extensions.gin_trgm_ops);

alter table public.notes
  add constraint notes_cover_fk foreign key (cover_resource_id) references public.resources (id) on delete set null;

create table public.resource_files (
  id                uuid primary key default gen_random_uuid(),
  resource_id       uuid not null references public.resources (id) on delete cascade,
  owner_id          uuid not null references public.profiles (id) on delete cascade,
  bucket            text not null default 'files' check (bucket = 'files'),
  storage_path      text not null unique check (char_length(storage_path) between 10 and 400),
  original_filename text not null check (char_length(original_filename) between 1 and 255),
  extension         text not null check (extension ~ '^[a-z0-9]{1,8}$'),
  mime_type         text not null,
  size_bytes        bigint not null check (size_bytes > 0 and size_bytes <= 52428800),
  created_at        timestamptz not null default now()
);
create index resource_files_resource_idx on public.resource_files (resource_id);
create index resource_files_owner_idx    on public.resource_files (owner_id);

-- ───────────────────────────── references ─────────────────────────────
create table public.note_references (
  id             uuid primary key default gen_random_uuid(),
  source_note_id uuid not null references public.notes (id) on delete cascade,
  target_note_id uuid not null references public.notes (id) on delete cascade,
  relation_type  public.relation_type not null,
  description    text not null default '' check (char_length(description) <= 500),
  created_by     uuid not null references public.profiles (id) on delete cascade,
  created_at     timestamptz not null default now(),
  unique (source_note_id, target_note_id, relation_type),
  check (source_note_id <> target_note_id)
);
create index note_references_target_idx on public.note_references (target_note_id);

-- ───────────────────────────── tags ─────────────────────────────
create table public.tags (
  id         uuid primary key default gen_random_uuid(),
  space_id   uuid not null references public.academic_spaces (id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 40),
  color      text not null default 'indigo',
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);
create unique index tags_space_name_key on public.tags (space_id, lower(name));

create table public.note_tags (
  note_id uuid not null references public.notes (id) on delete cascade,
  tag_id  uuid not null references public.tags (id) on delete cascade,
  primary key (note_id, tag_id)
);
create index note_tags_tag_idx on public.note_tags (tag_id);

-- ───────────────────────────── personal data ─────────────────────────────
create table public.bookmarks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  note_id     uuid references public.notes (id) on delete cascade,
  resource_id uuid references public.resources (id) on delete cascade,
  block_id    text check (block_id is null or char_length(block_id) between 1 and 64),
  pdf_page    integer check (pdf_page is null or pdf_page >= 1),
  label       text not null default '' check (char_length(label) <= 200),
  created_at  timestamptz not null default now(),
  -- exactly one target; block_id only for notes; pdf_page only for resources
  check ((note_id is not null)::int + (resource_id is not null)::int = 1),
  check (block_id is null or note_id is not null),
  check (pdf_page is null or resource_id is not null)
);
create unique index bookmarks_dedupe_key on public.bookmarks (
  user_id,
  coalesce(note_id, '00000000-0000-0000-0000-000000000000'::uuid),
  coalesce(resource_id, '00000000-0000-0000-0000-000000000000'::uuid),
  coalesce(block_id, ''),
  coalesce(pdf_page, 0)
);
create index bookmarks_user_idx on public.bookmarks (user_id, created_at desc);
create index bookmarks_note_idx on public.bookmarks (note_id) where note_id is not null;

create table public.annotations (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  note_id     uuid references public.notes (id) on delete cascade,
  resource_id uuid references public.resources (id) on delete cascade,
  kind        text not null default 'highlight' check (kind in ('highlight', 'comment')),
  color       text not null default 'yellow' check (color in ('yellow', 'green', 'blue', 'pink', 'purple')),
  comment     text not null default '' check (char_length(comment) <= 2000),
  quote       text not null default '' check (char_length(quote) <= 1000),
  anchor      jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check ((note_id is not null)::int + (resource_id is not null)::int = 1)
);
create index annotations_note_idx     on public.annotations (user_id, note_id) where note_id is not null;
create index annotations_resource_idx on public.annotations (user_id, resource_id) where resource_id is not null;

create table public.study_tasks (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  title      text not null check (char_length(title) between 1 and 200),
  done       boolean not null default false,
  due_date   date,
  subject_id uuid references public.subjects (id) on delete set null,
  note_id    uuid references public.notes (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index study_tasks_user_idx on public.study_tasks (user_id, done, due_date);

-- ───────────────────────────── activity & moderation ─────────────────────────────
create table public.activity_events (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references public.profiles (id) on delete cascade,
  space_id    uuid references public.academic_spaces (id) on delete cascade,
  event_type  text not null,
  entity_type text not null,
  entity_id   uuid,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index activity_events_space_idx on public.activity_events (space_id, created_at desc);
create index activity_events_actor_idx on public.activity_events (actor_id, created_at desc);

create table public.content_reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  target_type text not null check (target_type in ('note', 'resource')),
  target_id   uuid not null,
  reason      text not null check (reason in ('spam', 'copyright', 'inappropriate', 'other')),
  details     text not null default '' check (char_length(details) <= 1000),
  status      text not null default 'open' check (status in ('open', 'reviewed', 'dismissed')),
  created_at  timestamptz not null default now(),
  unique (reporter_id, target_type, target_id)
);
