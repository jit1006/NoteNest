-- NoteNest V2: all migrations in order. Paste into Supabase Dashboard > SQL Editor and click Run (once, on an EMPTY project).

-- ================= 20260101000001_schema.sql =================
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
  category    text not null default 'notes' check (category in ('notes', 'pyq', 'reference', 'assignment', 'other')),
  academic_year smallint check (academic_year is null or academic_year between 1990 and 2100),
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

-- ================= 20260101000002_functions_triggers.sql =================
-- NoteNest V2 — access helpers, triggers, guards

-- ───────────────────────────── access helpers (SECURITY DEFINER so policies never recurse) ─────────────────────────────
-- Role of the caller within a space: 'owner' | 'editor' | 'viewer' | null.
create or replace function public.space_role(p_space uuid)
returns text language sql stable security definer set search_path = ''
as $$
  select case
    when s.owner_id = auth.uid() then 'owner'
    else (select m.role::text from public.space_members m where m.space_id = s.id and m.user_id = auth.uid())
  end
  from public.academic_spaces s
  where s.id = p_space;
$$;

create or replace function public.is_space_owner(p_space uuid)
returns boolean language sql stable security definer set search_path = ''
as $$ select coalesce(public.space_role(p_space) = 'owner', false); $$;

create or replace function public.is_space_member(p_space uuid)
returns boolean language sql stable security definer set search_path = ''
as $$ select public.space_role(p_space) is not null; $$;

-- A space is readable by its owner, by members (while not deleted) and by anyone when public.
create or replace function public.can_read_space(p_space uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select coalesce((
    select s.owner_id = auth.uid()
        or (s.deleted_at is null and (s.visibility = 'public' or public.space_role(s.id) is not null))
    from public.academic_spaces s where s.id = p_space
  ), false);
$$;

create or replace function public.can_edit_space(p_space uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select coalesce((
    select s.deleted_at is null and public.space_role(s.id) in ('owner', 'editor')
    from public.academic_spaces s where s.id = p_space
  ), false);
$$;

-- Containers (semester / subject / folder) inherit visibility from their space.
create or replace function public.can_read_container(p_space uuid, p_deleted timestamptz)
returns boolean language sql stable security definer set search_path = ''
as $$
  select (p_deleted is null and public.can_read_space(p_space)) or public.is_space_owner(p_space);
$$;

-- Notes / resources: own visibility, plus explicit membership. Unlisted is NOT readable through tables.
create or replace function public.can_read_item(p_space uuid, p_vis public.visibility, p_deleted timestamptz)
returns boolean language sql stable security definer set search_path = ''
as $$
  select (p_deleted is null and (p_vis = 'public' or public.space_role(p_space) is not null))
      or public.is_space_owner(p_space);
$$;

-- Space owners edit anything; editors edit live items (and restore their own deleted ones).
create or replace function public.can_edit_item(p_space uuid, p_deleted timestamptz, p_owner uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select case public.space_role(p_space)
    when 'owner'  then true
    when 'editor' then p_deleted is null or p_owner = auth.uid()
    else false
  end;
$$;

create or replace function public.can_read_note(p_note uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select coalesce((select public.can_read_item(n.space_id, n.visibility, n.deleted_at) from public.notes n where n.id = p_note), false);
$$;

create or replace function public.can_edit_note(p_note uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select coalesce((select public.can_edit_item(n.space_id, n.deleted_at, n.owner_id) from public.notes n where n.id = p_note), false);
$$;

-- Attached resources (inline images, attachments) inherit readability from their note.
create or replace function public.resource_row_readable(
  p_space uuid, p_vis public.visibility, p_deleted timestamptz, p_note uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select case
    when p_note is null then public.can_read_item(p_space, p_vis, p_deleted)
    else coalesce((select public.can_read_item(n.space_id, n.visibility, n.deleted_at) from public.notes n where n.id = p_note), false)
         and (p_deleted is null or public.is_space_owner(p_space))
  end;
$$;

create or replace function public.can_read_resource(p_resource uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select coalesce((
    select public.resource_row_readable(r.space_id, r.visibility, r.deleted_at, r.attached_note_id)
    from public.resources r where r.id = p_resource), false);
$$;

create or replace function public.can_edit_resource(p_resource uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select coalesce((select public.can_edit_item(r.space_id, r.deleted_at, r.owner_id) from public.resources r where r.id = p_resource), false);
$$;

-- Used by storage policies: is this object path referenced by a file the caller may read?
create or replace function public.can_read_storage_object(p_path text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.resource_files f
    where f.storage_path = p_path and public.can_read_resource(f.resource_id)
  );
$$;

-- ───────────────────────────── file type allow-lists ─────────────────────────────
create or replace function public.allowed_file_ext(p_ext text)
returns boolean language sql immutable set search_path = ''
as $$
  select lower(p_ext) = any (array[
    'pdf','md','markdown','txt','docx','pptx','png','jpg','jpeg','gif','webp',
    'js','jsx','ts','tsx','py','java','c','h','cpp','hpp','cs','go','rs','rb','php','sql','sh','json','yaml','yml','css','kt','swift','r'
  ]);
$$;

create or replace function public.file_kind_for_ext(p_ext text)
returns public.resource_kind language sql immutable set search_path = ''
as $$
  select case lower(p_ext)
    when 'pdf' then 'pdf'::public.resource_kind
    when 'md' then 'markdown' when 'markdown' then 'markdown'
    when 'txt' then 'text'
    when 'docx' then 'docx' when 'pptx' then 'pptx'
    when 'png' then 'image' when 'jpg' then 'image' when 'jpeg' then 'image' when 'gif' then 'image' when 'webp' then 'image'
    else 'code'
  end;
$$;

create or replace function public.user_quota_bytes()
returns bigint language sql immutable set search_path = '' as $$ select 209715200::bigint; $$;  -- 200 MB

-- ───────────────────────────── generic triggers ─────────────────────────────
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end $$;

-- owner_id / space_id are immutable after creation.
create or replace function public.prevent_identity_change()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (to_jsonb(new) ->> 'owner_id') is distinct from (to_jsonb(old) ->> 'owner_id') then
    raise exception 'owner_id is immutable' using errcode = '42501';
  end if;
  if (to_jsonb(new) ->> 'space_id') is distinct from (to_jsonb(old) ->> 'space_id') then
    raise exception 'space_id is immutable' using errcode = '42501';
  end if;
  return new;
end $$;

-- Only the item owner or the space owner may change visibility; share tokens are server-controlled.
create or replace function public.guard_visibility()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_space uuid;
begin
  v_space := coalesce((to_jsonb(old) ->> 'space_id')::uuid, old.id);
  if new.visibility is distinct from old.visibility and auth.uid() is not null then
    if not (old.owner_id = auth.uid() or public.is_space_owner(v_space)) then
      raise exception 'only the owner can change visibility' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

create or replace function public.guard_share_token()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.share_token := gen_random_uuid();
    return new;
  end if;
  if coalesce(current_setting('notenest.rotating', true), '') <> '1' then
    new.share_token := old.share_token;
  end if;
  -- switching to unlisted always issues a fresh token so previously seen tokens stop working
  if new.visibility = 'unlisted' and old.visibility is distinct from 'unlisted' then
    new.share_token := gen_random_uuid();
  end if;
  return new;
end $$;

-- Per-user creation throttle: tg_argv[0] = max per hour, tg_argv[1] = owner column.
create or replace function public.enforce_rate_limit()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_count integer;
begin
  if auth.uid() is null then return new; end if;   -- service role / auth triggers
  execute format(
    'select count(*) from public.%I where %I = $1 and created_at > now() - interval ''1 hour''',
    tg_table_name, tg_argv[1])
    into v_count using auth.uid();
  if v_count >= tg_argv[0]::integer then
    raise exception 'rate_limit_exceeded' using errcode = 'P0001', hint = 'Too many items created recently. Try again later.';
  end if;
  return new;
end $$;

-- ───────────────────────────── note content processing ─────────────────────────────
create or replace function public.extract_doc_text(doc jsonb, depth integer default 0)
returns text language plpgsql immutable set search_path = '' as $$
declare r text := ''; child jsonb;
begin
  if doc is null or depth > 40 or jsonb_typeof(doc) <> 'object' then return ''; end if;
  if jsonb_typeof(doc -> 'text') = 'string' then r := doc ->> 'text'; end if;
  if jsonb_typeof(doc -> 'content') = 'array' then
    for child in select value from jsonb_array_elements(doc -> 'content') loop
      r := r || ' ' || public.extract_doc_text(child, depth + 1);
    end loop;
  end if;
  return r;
end $$;

create or replace function public.note_before_write()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' or new.content is distinct from old.content then
    new.content_text := left(btrim(regexp_replace(public.extract_doc_text(new.content), '\s+', ' ', 'g')), 500000);
  end if;
  if tg_op = 'UPDATE' and (new.content is distinct from old.content or new.title is distinct from old.title) then
    new.version := old.version + 1;
  elsif tg_op = 'UPDATE' then
    new.version := old.version;
  else
    new.version := 1;
  end if;
  return new;
end $$;

-- Snapshot the previous state at most once every 5 minutes (history + restore).
create or replace function public.note_snapshot()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.content is distinct from old.content and not exists (
       select 1 from public.note_versions v
       where v.note_id = old.id and v.created_at > now() - interval '5 minutes') then
    insert into public.note_versions (note_id, version, title, content, created_by)
    values (old.id, old.version, old.title, old.content, auth.uid())
    on conflict (note_id, version) do nothing;
  end if;
  return new;
end $$;

-- ───────────────────────────── soft delete cascade ─────────────────────────────
create or replace function public.soft_delete_cascade()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.deleted_at is not distinct from old.deleted_at then return new; end if;

  if new.deleted_at is not null then
    -- deleting: hide every live descendant with the same timestamp
    if tg_table_name = 'academic_spaces' then
      update public.semesters set deleted_at = new.deleted_at where space_id = new.id and deleted_at is null;
      update public.subjects  set deleted_at = new.deleted_at where space_id = new.id and deleted_at is null;
      update public.folders   set deleted_at = new.deleted_at where space_id = new.id and deleted_at is null;
      update public.notes     set deleted_at = new.deleted_at where space_id = new.id and deleted_at is null;
      update public.resources set deleted_at = new.deleted_at where space_id = new.id and deleted_at is null;
    elsif tg_table_name = 'semesters' then
      update public.subjects  set deleted_at = new.deleted_at where semester_id = new.id and deleted_at is null;
      update public.notes     set deleted_at = new.deleted_at where semester_id = new.id and deleted_at is null;
      update public.resources set deleted_at = new.deleted_at where semester_id = new.id and deleted_at is null;
    elsif tg_table_name = 'subjects' then
      update public.folders   set deleted_at = new.deleted_at where subject_id = new.id and deleted_at is null;
      update public.notes     set deleted_at = new.deleted_at where subject_id = new.id and deleted_at is null;
      update public.resources set deleted_at = new.deleted_at where subject_id = new.id and deleted_at is null;
    elsif tg_table_name = 'folders' then
      update public.folders   set deleted_at = new.deleted_at where parent_id = new.id and deleted_at is null;
      update public.notes     set deleted_at = new.deleted_at where folder_id = new.id and deleted_at is null;
      update public.resources set deleted_at = new.deleted_at where folder_id = new.id and deleted_at is null;
    end if;
  else
    -- restoring: bring back descendants that were hidden by that very delete
    if tg_table_name = 'academic_spaces' then
      update public.semesters set deleted_at = null where space_id = new.id and deleted_at = old.deleted_at;
      update public.subjects  set deleted_at = null where space_id = new.id and deleted_at = old.deleted_at;
      update public.folders   set deleted_at = null where space_id = new.id and deleted_at = old.deleted_at;
      update public.notes     set deleted_at = null where space_id = new.id and deleted_at = old.deleted_at;
      update public.resources set deleted_at = null where space_id = new.id and deleted_at = old.deleted_at;
    elsif tg_table_name = 'semesters' then
      update public.subjects  set deleted_at = null where semester_id = new.id and deleted_at = old.deleted_at;
      update public.notes     set deleted_at = null where semester_id = new.id and deleted_at = old.deleted_at;
      update public.resources set deleted_at = null where semester_id = new.id and deleted_at = old.deleted_at;
    elsif tg_table_name = 'subjects' then
      update public.folders   set deleted_at = null where subject_id = new.id and deleted_at = old.deleted_at;
      update public.notes     set deleted_at = null where subject_id = new.id and deleted_at = old.deleted_at;
      update public.resources set deleted_at = null where subject_id = new.id and deleted_at = old.deleted_at;
    elsif tg_table_name = 'folders' then
      update public.folders   set deleted_at = null where parent_id = new.id and deleted_at = old.deleted_at;
      update public.notes     set deleted_at = null where folder_id = new.id and deleted_at = old.deleted_at;
      update public.resources set deleted_at = null where folder_id = new.id and deleted_at = old.deleted_at;
    end if;
  end if;
  return new;
end $$;

-- ───────────────────────────── files ─────────────────────────────
create or replace function public.resource_file_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_obj record; v_used bigint;
begin
  if split_part(new.storage_path, '/', 1) <> new.owner_id::text then
    raise exception 'storage path must start with the uploader id' using errcode = '42501';
  end if;
  if auth.uid() is not null and new.owner_id <> auth.uid() then
    raise exception 'file owner must be the caller' using errcode = '42501';
  end if;
  if not public.allowed_file_ext(new.extension) then
    raise exception 'file type not allowed' using errcode = '22023';
  end if;
  if lower(new.storage_path) not like '%.' || lower(new.extension) then
    raise exception 'extension does not match path' using errcode = '22023';
  end if;

  select o.metadata into v_obj from storage.objects o where o.bucket_id = 'files' and o.name = new.storage_path;
  if not found then
    raise exception 'uploaded object not found' using errcode = '22023';
  end if;
  if (v_obj.metadata ->> 'size')::bigint <> new.size_bytes then
    raise exception 'size mismatch with stored object' using errcode = '22023';
  end if;
  if lower(split_part(coalesce(v_obj.metadata ->> 'mimetype', ''), ';', 1)) is distinct from lower(split_part(new.mime_type, ';', 1)) then
    raise exception 'mime type mismatch with stored object' using errcode = '22023';
  end if;

  select coalesce(sum(size_bytes), 0) into v_used from public.resource_files where owner_id = new.owner_id;
  if v_used + new.size_bytes > public.user_quota_bytes() then
    raise exception 'storage_quota_exceeded' using errcode = 'P0001', hint = 'You have used your storage quota.';
  end if;
  return new;
end $$;

-- tags may only be attached to notes of their own space
create or replace function public.note_tag_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from public.notes n join public.tags t on t.space_id = n.space_id
    where n.id = new.note_id and t.id = new.tag_id) then
    raise exception 'tag belongs to a different space' using errcode = '22023';
  end if;
  return new;
end $$;

-- annotation anchors are validated by shape (block anchor for notes, page+rects anchor for PDFs)
create or replace function public.annotation_anchor_valid(a jsonb, for_note boolean)
returns boolean language plpgsql immutable set search_path = '' as $$
begin
  if a is null or jsonb_typeof(a) is distinct from 'object' then return false; end if;
  if for_note then
    if (a ->> 'type') is distinct from 'block' then return false; end if;
    if jsonb_typeof(a -> 'blockId') is distinct from 'string' then return false; end if;
    if char_length(a ->> 'blockId') not between 1 and 64 then return false; end if;
    if jsonb_typeof(a -> 'start') is distinct from 'number' or jsonb_typeof(a -> 'end') is distinct from 'number' then return false; end if;
    return (a ->> 'start')::numeric >= 0 and (a ->> 'end')::numeric > (a ->> 'start')::numeric;
  end if;
  if (a ->> 'type') is distinct from 'pdf' then return false; end if;
  if jsonb_typeof(a -> 'page') is distinct from 'number' then return false; end if;
  if (a ->> 'page')::numeric < 1 then return false; end if;
  if jsonb_typeof(a -> 'rects') is distinct from 'array' then return false; end if;
  return jsonb_array_length(a -> 'rects') between 1 and 200;
end $$;

alter table public.annotations
  add constraint annotations_anchor_valid check (public.annotation_anchor_valid(anchor, note_id is not null));

-- ───────────────────────────── activity log ─────────────────────────────
create or replace function public.log_activity()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_type text := tg_argv[0]; v_title text;
begin
  v_title := to_jsonb(new) ->> 'title';
  insert into public.activity_events (actor_id, space_id, event_type, entity_type, entity_id, metadata)
  values (
    coalesce((to_jsonb(new) ->> 'owner_id')::uuid, auth.uid()),
    coalesce((to_jsonb(new) ->> 'space_id')::uuid, case when tg_table_name = 'academic_spaces' then new.id end),
    v_type || '.created', v_type, new.id,
    jsonb_build_object('title', v_title));
  return new;
end $$;

-- ───────────────────────────── signup bootstrap ─────────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_base text; v_user text; v_name text; v_space uuid;
begin
  v_base := lower(regexp_replace(split_part(coalesce(new.email, 'user'), '@', 1), '[^a-zA-Z0-9]', '', 'g'));
  if char_length(v_base) < 3 then v_base := 'user' || v_base; end if;
  v_base := left(v_base, 20);
  loop
    v_user := v_base || '_' || substr(md5(random()::text || clock_timestamp()::text), 1, 6);
    exit when not exists (select 1 from public.profiles where username = v_user);
  end loop;
  v_name := left(coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''),
                          nullif(new.raw_user_meta_data ->> 'full_name', ''),
                          nullif(new.raw_user_meta_data ->> 'name', ''),
                          split_part(coalesce(new.email, ''), '@', 1)), 80);
  insert into public.profiles (id, username, display_name) values (new.id, v_user, v_name);

  insert into public.academic_spaces (owner_id, title, description, icon, is_default)
  values (new.id, 'My Space', 'Your personal workspace for notes and files.', '📚', true)
  returning id into v_space;
  insert into public.semesters (space_id, owner_id, number, title) values (v_space, new.id, 1, 'Semester 1');
  return new;
end $$;

-- ───────────────────────────── trigger wiring ─────────────────────────────
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

do $$
declare t text;
begin
  foreach t in array array['profiles','academic_spaces','semesters','subjects','folders','notes','resources','annotations','study_tasks'] loop
    execute format('create trigger %I before update on public.%I for each row execute function public.touch_updated_at()', t || '_touch', t);
  end loop;
  foreach t in array array['academic_spaces','semesters','subjects','folders','notes','resources'] loop
    execute format('create trigger %I before update on public.%I for each row execute function public.prevent_identity_change()', t || '_identity', t);
  end loop;
  foreach t in array array['academic_spaces','semesters','subjects','folders'] loop
    execute format('create trigger %I after update of deleted_at on public.%I for each row execute function public.soft_delete_cascade()', t || '_softdel', t);
  end loop;
end $$;

create trigger academic_spaces_vis before update on public.academic_spaces for each row execute function public.guard_visibility();
create trigger notes_vis           before update on public.notes           for each row execute function public.guard_visibility();
create trigger resources_vis       before update on public.resources       for each row execute function public.guard_visibility();

create trigger notes_token_ins     before insert on public.notes     for each row execute function public.guard_share_token();
create trigger notes_token_upd     before update on public.notes     for each row execute function public.guard_share_token();
create trigger resources_token_ins before insert on public.resources for each row execute function public.guard_share_token();
create trigger resources_token_upd before update on public.resources for each row execute function public.guard_share_token();

create trigger notes_content_ins before insert on public.notes for each row execute function public.note_before_write();
create trigger notes_content_upd before update on public.notes for each row execute function public.note_before_write();
create trigger notes_snapshot    before update on public.notes for each row execute function public.note_snapshot();

create trigger spaces_rate    before insert on public.academic_spaces for each row execute function public.enforce_rate_limit('30', 'owner_id');
create trigger notes_rate     before insert on public.notes           for each row execute function public.enforce_rate_limit('300', 'owner_id');
create trigger resources_rate before insert on public.resources       for each row execute function public.enforce_rate_limit('300', 'owner_id');
create trigger annot_rate     before insert on public.annotations     for each row execute function public.enforce_rate_limit('600', 'user_id');
create trigger refs_rate      before insert on public.note_references for each row execute function public.enforce_rate_limit('300', 'created_by');
create trigger reports_rate   before insert on public.content_reports for each row execute function public.enforce_rate_limit('20', 'reporter_id');

create trigger resource_files_guard before insert on public.resource_files for each row execute function public.resource_file_guard();
create trigger note_tags_guard      before insert on public.note_tags      for each row execute function public.note_tag_guard();

create trigger spaces_activity    after insert on public.academic_spaces for each row execute function public.log_activity('space');
create trigger notes_activity     after insert on public.notes           for each row execute function public.log_activity('note');
create trigger resources_activity after insert on public.resources       for each row execute function public.log_activity('resource');

-- ================= 20260101000003_rls.sql =================
-- NoteNest V2 — Row Level Security
-- Principle: deny by default; every rule is expressed once in the helper functions of migration 2.

alter table public.profiles         enable row level security;
alter table public.academic_spaces  enable row level security;
alter table public.space_members    enable row level security;
alter table public.semesters        enable row level security;
alter table public.subjects         enable row level security;
alter table public.folders          enable row level security;
alter table public.notes            enable row level security;
alter table public.note_versions    enable row level security;
alter table public.resources        enable row level security;
alter table public.resource_files   enable row level security;
alter table public.note_references  enable row level security;
alter table public.tags             enable row level security;
alter table public.note_tags        enable row level security;
alter table public.bookmarks        enable row level security;
alter table public.annotations      enable row level security;
alter table public.study_tasks      enable row level security;
alter table public.activity_events  enable row level security;
alter table public.content_reports  enable row level security;

-- ───────────── profiles: public identity card (no email), self-editable ─────────────
create policy profiles_select on public.profiles for select to anon, authenticated using (true);
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- ───────────── academic spaces ─────────────
create policy spaces_select on public.academic_spaces for select to anon, authenticated
  using (public.can_read_space(id));
create policy spaces_insert on public.academic_spaces for insert to authenticated
  with check (owner_id = auth.uid());
create policy spaces_update on public.academic_spaces for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy spaces_delete on public.academic_spaces for delete to authenticated
  using (owner_id = auth.uid() and not is_default);

-- ───────────── membership (owner manages; members can see/leave themselves) ─────────────
create policy members_select on public.space_members for select to authenticated
  using (user_id = auth.uid() or public.is_space_owner(space_id));
create policy members_insert on public.space_members for insert to authenticated
  with check (public.is_space_owner(space_id) and user_id <> auth.uid());
create policy members_update on public.space_members for update to authenticated
  using (public.is_space_owner(space_id)) with check (public.is_space_owner(space_id));
create policy members_delete on public.space_members for delete to authenticated
  using (public.is_space_owner(space_id) or user_id = auth.uid());

-- ───────────── containers: semesters / subjects / folders ─────────────
do $$
declare t text;
begin
  foreach t in array array['semesters', 'subjects', 'folders'] loop
    execute format($f$create policy %1$I on public.%2$I for select to anon, authenticated
      using (public.can_read_container(space_id, deleted_at))$f$, t || '_select', t);
    execute format($f$create policy %1$I on public.%2$I for insert to authenticated
      with check (owner_id = auth.uid() and public.can_edit_space(space_id))$f$, t || '_insert', t);
    execute format($f$create policy %1$I on public.%2$I for update to authenticated
      using (public.can_edit_item(space_id, deleted_at, owner_id))
      with check (public.space_role(space_id) in ('owner', 'editor'))$f$, t || '_update', t);
    execute format($f$create policy %1$I on public.%2$I for delete to authenticated
      using (public.is_space_owner(space_id))$f$, t || '_delete', t);
  end loop;
end $$;

-- ───────────── notes ─────────────
create policy notes_select on public.notes for select to anon, authenticated
  using (public.can_read_item(space_id, visibility, deleted_at));
create policy notes_insert on public.notes for insert to authenticated
  with check (owner_id = auth.uid() and public.can_edit_space(space_id));
create policy notes_update on public.notes for update to authenticated
  using (public.can_edit_item(space_id, deleted_at, owner_id))
  with check (public.space_role(space_id) in ('owner', 'editor'));
create policy notes_delete on public.notes for delete to authenticated
  using (public.is_space_owner(space_id));

-- version history: editors only (older drafts may contain material not meant for readers)
create policy note_versions_select on public.note_versions for select to authenticated
  using (public.can_edit_note(note_id));

-- ───────────── resources & files ─────────────
create policy resources_select on public.resources for select to anon, authenticated
  using (public.resource_row_readable(space_id, visibility, deleted_at, attached_note_id));
create policy resources_insert on public.resources for insert to authenticated
  with check (owner_id = auth.uid() and public.can_edit_space(space_id));
create policy resources_update on public.resources for update to authenticated
  using (public.can_edit_item(space_id, deleted_at, owner_id))
  with check (public.space_role(space_id) in ('owner', 'editor'));
create policy resources_delete on public.resources for delete to authenticated
  using (public.is_space_owner(space_id) or (owner_id = auth.uid() and public.can_edit_space(space_id)));

create policy resource_files_select on public.resource_files for select to anon, authenticated
  using (public.can_read_resource(resource_id));
create policy resource_files_insert on public.resource_files for insert to authenticated
  with check (owner_id = auth.uid() and public.can_edit_resource(resource_id));
create policy resource_files_delete on public.resource_files for delete to authenticated
  using (owner_id = auth.uid() or public.can_edit_resource(resource_id));

-- ───────────── references (never reveal an unreadable endpoint) ─────────────
create policy refs_select on public.note_references for select to anon, authenticated
  using (public.can_read_note(source_note_id) and public.can_read_note(target_note_id));
create policy refs_insert on public.note_references for insert to authenticated
  with check (created_by = auth.uid() and public.can_edit_note(source_note_id) and public.can_read_note(target_note_id));
create policy refs_delete on public.note_references for delete to authenticated
  using (public.can_edit_note(source_note_id));

-- ───────────── tags ─────────────
create policy tags_select on public.tags for select to anon, authenticated
  using (public.can_read_space(space_id));
create policy tags_insert on public.tags for insert to authenticated
  with check (created_by = auth.uid() and public.can_edit_space(space_id));
create policy tags_update on public.tags for update to authenticated
  using (public.can_edit_space(space_id)) with check (public.can_edit_space(space_id));
create policy tags_delete on public.tags for delete to authenticated
  using (public.can_edit_space(space_id));

create policy note_tags_select on public.note_tags for select to anon, authenticated
  using (public.can_read_note(note_id));
create policy note_tags_insert on public.note_tags for insert to authenticated
  with check (public.can_edit_note(note_id));
create policy note_tags_delete on public.note_tags for delete to authenticated
  using (public.can_edit_note(note_id));

-- ───────────── personal data: strictly per user, and only for readable targets ─────────────
create policy bookmarks_select on public.bookmarks for select to authenticated using (user_id = auth.uid());
create policy bookmarks_insert on public.bookmarks for insert to authenticated
  with check (user_id = auth.uid()
    and ((note_id is not null and public.can_read_note(note_id))
      or (resource_id is not null and public.can_read_resource(resource_id))));
create policy bookmarks_delete on public.bookmarks for delete to authenticated using (user_id = auth.uid());

create policy annotations_select on public.annotations for select to authenticated using (user_id = auth.uid());
create policy annotations_insert on public.annotations for insert to authenticated
  with check (user_id = auth.uid()
    and ((note_id is not null and public.can_read_note(note_id))
      or (resource_id is not null and public.can_read_resource(resource_id))));
create policy annotations_update on public.annotations for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy annotations_delete on public.annotations for delete to authenticated using (user_id = auth.uid());

create policy tasks_all on public.study_tasks for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ───────────── activity & reports ─────────────
create policy activity_select on public.activity_events for select to authenticated
  using (actor_id = auth.uid() or (space_id is not null and public.is_space_member(space_id)));

create policy reports_insert on public.content_reports for insert to authenticated
  with check (reporter_id = auth.uid()
    and ((target_type = 'note' and public.can_read_note(target_id))
      or (target_type = 'resource' and public.can_read_resource(target_id))));
create policy reports_select on public.content_reports for select to authenticated
  using (reporter_id = auth.uid());

-- Defence in depth: anon never writes anything.
revoke insert, update, delete on all tables in schema public from anon;

-- ================= 20260101000004_storage.sql =================
-- NoteNest V2 — Storage buckets and policies
-- `files`   : private. Every read goes through a signed URL minted under the SELECT policy below,
--             which defers to the database (readable resource_files row).
-- `avatars` : public bucket for profile pictures only.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('files', 'files', false, 52428800, array[
     'application/pdf', 'text/plain', 'text/markdown',
     'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
     'application/vnd.openxmlformats-officedocument.presentationml.presentation',
     'image/png', 'image/jpeg', 'image/gif', 'image/webp']),
  ('avatars', 'avatars', true, 2097152, array['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- files: upload only into your own folder, with an allow-listed extension
create policy files_insert_own_folder on storage.objects for insert to authenticated
  with check (
    bucket_id = 'files'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.allowed_file_ext(storage.extension(name))
  );

-- files: read your own uploads, or any object referenced by a file row you may read (anon included for public content)
create policy files_select_readable on storage.objects for select to anon, authenticated
  using (
    bucket_id = 'files'
    and (
      (auth.uid() is not null and (storage.foldername(name))[1] = auth.uid()::text)
      or public.can_read_storage_object(name)
    )
  );

-- files: only the uploader removes objects (no overwrite/update policy → objects are immutable)
create policy files_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'files' and (storage.foldername(name))[1] = auth.uid()::text);

-- avatars
create policy avatars_select on storage.objects for select to anon, authenticated
  using (bucket_id = 'avatars');
create policy avatars_insert_own on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatars_update_own on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatars_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- ================= 20260101000005_rpc.sql =================
-- NoteNest V2 — server-side queries (RPC)
-- Read RPCs are SECURITY INVOKER so Row Level Security always applies to the caller.
-- Only functions that must aggregate across private data (popularity) or validate secrets are SECURITY DEFINER.

-- ───────────── context labels for items the caller can already read ─────────────
-- Publishing a note in a private space exposes ONLY its semester number/title and subject title (never the space or siblings).
create or replace function public.container_labels(p_semester uuid, p_subject uuid)
returns table (semester_number smallint, semester_title text, subject_title text)
language sql stable security definer set search_path = ''
as $$
  select s.number, s.title,
         (select sub.title from public.subjects sub where sub.id = p_subject and sub.deleted_at is null)
  from public.semesters s
  where s.id = p_semester and s.deleted_at is null;
$$;

-- ───────────── full-text search + filters + pagination ─────────────
create or replace function public.search_library(
  p_query           text default '',
  p_scope           text default 'all',      -- 'all' (everything I may read) | 'public' | 'mine'
  p_types           text[] default null,     -- 'note' and/or resource kinds ('pdf','markdown',...)
  p_category        text default null,       -- resource category: notes | pyq | reference | assignment | other
  p_year            integer default null,    -- academic_year (PYQ papers)
  p_semester_number integer default null,
  p_subject_id      uuid default null,
  p_subject_title   text default null,       -- case-insensitive subject name (works across spaces)
  p_owner_id        uuid default null,
  p_since           timestamptz default null,
  p_until           timestamptz default null,
  p_limit           integer default 20,
  p_offset          integer default 0
) returns table (
  entity_type text, id uuid, title text, snippet text, kind text, icon text, category text, academic_year smallint,
  owner_id uuid, owner_username text, owner_display_name text,
  space_id uuid, semester_id uuid, semester_number smallint, semester_title text,
  subject_id uuid, subject_title text, visibility public.visibility,
  created_at timestamptz, updated_at timestamptz, rank real, total_count bigint)
language sql stable security invoker set search_path = ''
as $$
  with q as (
    select
      nullif(btrim(coalesce(p_query, '')), '') as raw,
      case when nullif(btrim(coalesce(p_query, '')), '') is null then null
           else websearch_to_tsquery('english', btrim(p_query)) end as tsq,
      '%' || replace(replace(replace(btrim(coalesce(p_query, '')), '\', '\\'), '%', '\%'), '_', '\_') || '%' as pat
  ),
  hits as (
    select 'note'::text as entity_type, n.id, n.title, n.content_text as body, 'note'::text as kind, n.icon,
           null::text as category, null::smallint as academic_year, n.owner_id, n.space_id, n.semester_id, n.subject_id, n.visibility, n.created_at, n.updated_at,
           (case when q.tsq is null then 0::real
                 else ts_rank(n.search, q.tsq) + (case when n.title ilike q.pat then 0.5 else 0 end)::real end)::real as rank
    from public.notes n cross join q
    where n.deleted_at is null and n.visibility <> 'unlisted'
      and (q.raw is null or n.search @@ q.tsq or n.title ilike q.pat)
      and (p_types is null or 'note' = any (p_types))
      and p_category is null and p_year is null
    union all
    select 'resource'::text, r.id, r.title, r.description, r.kind::text, null::text, r.category, r.academic_year,
           r.owner_id, r.space_id, r.semester_id, r.subject_id, r.visibility, r.created_at, r.updated_at,
           (case when q.tsq is null then 0::real
                 else ts_rank(r.search, q.tsq) + (case when r.title ilike q.pat then 0.5 else 0 end)::real end)::real
    from public.resources r cross join q
    where r.deleted_at is null and r.attached_note_id is null and r.visibility <> 'unlisted'
      and (q.raw is null or r.search @@ q.tsq or r.title ilike q.pat)
      and (p_types is null or r.kind::text = any (p_types))
      and (p_category is null or r.category = p_category)
      and (p_year is null or r.academic_year = p_year)
  ),
  filtered as (
    select h.*, cl.semester_number, cl.semester_title, cl.subject_title,
           p.username as owner_username, p.display_name as owner_display_name
    from hits h
    left join lateral public.container_labels(h.semester_id, h.subject_id) cl on true
    left join public.profiles p    on p.id = h.owner_id
    where (p_semester_number is null or cl.semester_number = p_semester_number)
      and (p_subject_id is null or h.subject_id = p_subject_id)
      and (p_subject_title is null or lower(cl.subject_title) = lower(btrim(p_subject_title)))
      and (p_owner_id is null or h.owner_id = p_owner_id)
      and (p_since is null or h.updated_at >= p_since)
      and (p_until is null or h.updated_at < p_until)
      and (coalesce(p_scope, 'all') = 'all'
           or (p_scope = 'public' and h.visibility = 'public')
           or (p_scope = 'mine' and h.owner_id = auth.uid()))
  ),
  page as (
    select f.*, count(*) over () as total
    from filtered f
    order by f.rank desc, f.updated_at desc, f.id
    limit least(greatest(coalesce(p_limit, 20), 1), 50)
    offset greatest(coalesce(p_offset, 0), 0)
  )
  select pg.entity_type, pg.id, pg.title,
         case when pg.entity_type = 'note' and q.tsq is not null
              then ts_headline('english', pg.body, q.tsq, 'MaxFragments=1, MaxWords=25, MinWords=8, StartSel=⟦, StopSel=⟧')
              else left(pg.body, 180) end,
         pg.kind, pg.icon, pg.category, pg.academic_year, pg.owner_id, pg.owner_username, pg.owner_display_name,
         pg.space_id, pg.semester_id, pg.semester_number, pg.semester_title,
         pg.subject_id, pg.subject_title, pg.visibility, pg.created_at, pg.updated_at, pg.rank, pg.total
  from page pg cross join q
  order by pg.rank desc, pg.updated_at desc, pg.id;
$$;

-- ───────────── reference graph (depth-limited, cycle-safe, RLS-filtered) ─────────────
create or replace function public.note_reference_graph(p_root uuid, p_depth integer default 2)
returns table (source_note_id uuid, target_note_id uuid, relation_type public.relation_type, depth integer)
language sql stable security invoker set search_path = ''
as $$
  with recursive walk as (
    select r.id, r.source_note_id as src, r.target_note_id as dst, r.relation_type as rel, 1 as lvl,
           array[p_root] as visited,
           case when r.source_note_id = p_root then r.target_note_id else r.source_note_id end as frontier
    from public.note_references r
    where r.source_note_id = p_root or r.target_note_id = p_root
    union all
    select r.id, r.source_note_id, r.target_note_id, r.relation_type, w.lvl + 1,
           w.visited || w.frontier,
           case when r.source_note_id = w.frontier then r.target_note_id else r.source_note_id end
    from walk w
    join public.note_references r on r.source_note_id = w.frontier or r.target_note_id = w.frontier
    where w.lvl < least(greatest(coalesce(p_depth, 1), 1), 3)
      and not ((case when r.source_note_id = w.frontier then r.target_note_id else r.source_note_id end)
               = any (w.visited || w.frontier))
  )
  select distinct on (w.id) w.src, w.dst, w.rel, w.lvl
  from walk w
  order by w.id, w.lvl
  limit 500;
$$;

-- ───────────── discovery feeds over PUBLIC content only ─────────────
create or replace function public.popular_public_notes(p_limit integer default 8)
returns table (id uuid, title text, icon text, owner_id uuid, owner_username text, owner_display_name text,
               space_id uuid, updated_at timestamptz, saves bigint)
language sql stable security definer set search_path = ''
as $$
  select n.id, n.title, n.icon, n.owner_id, p.username, p.display_name, n.space_id, n.updated_at, count(b.id) as saves
  from public.notes n
  join public.profiles p on p.id = n.owner_id
  left join public.bookmarks b on b.note_id = n.id
  where n.visibility = 'public' and n.deleted_at is null
  group by n.id, p.username, p.display_name
  order by saves desc, n.updated_at desc
  limit least(greatest(coalesce(p_limit, 8), 1), 24);
$$;

create or replace function public.recent_public_uploads(p_limit integer default 8)
returns table (id uuid, title text, kind text, category text, owner_id uuid, owner_username text, owner_display_name text,
               space_id uuid, created_at timestamptz, size_bytes bigint, extension text)
language sql stable security definer set search_path = ''
as $$
  select r.id, r.title, r.kind::text, r.category, r.owner_id, p.username, p.display_name, r.space_id, r.created_at, f.size_bytes, f.extension
  from public.resources r
  join public.profiles p on p.id = r.owner_id
  left join lateral (select rf.size_bytes, rf.extension from public.resource_files rf where rf.resource_id = r.id order by rf.created_at limit 1) f on true
  where r.visibility = 'public' and r.deleted_at is null and r.attached_note_id is null
  order by r.created_at desc
  limit least(greatest(coalesce(p_limit, 8), 1), 24);
$$;

-- ───────────── unlisted access: signed-in + valid revocable token ─────────────
create or replace function public.get_shared_note(p_id uuid, p_token uuid)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare n public.notes;
begin
  if auth.uid() is null then raise exception 'auth_required' using errcode = 'PT401'; end if;
  select * into n from public.notes
   where id = p_id and visibility = 'unlisted' and deleted_at is null and share_token = p_token;
  if not found then raise exception 'not_found' using errcode = 'PT404'; end if;
  insert into public.activity_events (actor_id, space_id, event_type, entity_type, entity_id)
  values (auth.uid(), n.space_id, 'note.shared_view', 'note', n.id);
  return jsonb_build_object(
    'id', n.id, 'title', n.title, 'icon', n.icon, 'content', n.content, 'owner_id', n.owner_id,
    'updated_at', n.updated_at, 'space_id', n.space_id, 'visibility', n.visibility);
end $$;

create or replace function public.get_shared_resource(p_id uuid, p_token uuid)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare r public.resources; v_files jsonb;
begin
  if auth.uid() is null then raise exception 'auth_required' using errcode = 'PT401'; end if;
  select * into r from public.resources
   where id = p_id and visibility = 'unlisted' and deleted_at is null and share_token = p_token;
  if not found then raise exception 'not_found' using errcode = 'PT404'; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', f.id, 'original_filename', f.original_filename, 'mime_type', f.mime_type,
           'size_bytes', f.size_bytes, 'extension', f.extension)), '[]'::jsonb)
    into v_files from public.resource_files f where f.resource_id = r.id;
  insert into public.activity_events (actor_id, space_id, event_type, entity_type, entity_id)
  values (auth.uid(), r.space_id, 'resource.shared_view', 'resource', r.id);
  return jsonb_build_object(
    'id', r.id, 'title', r.title, 'description', r.description, 'kind', r.kind, 'category', r.category, 'owner_id', r.owner_id,
    'created_at', r.created_at, 'space_id', r.space_id, 'files', v_files);
end $$;

create or replace function public.rotate_share_token(p_type text, p_id uuid)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_new uuid := gen_random_uuid();
begin
  if auth.uid() is null then raise exception 'auth_required' using errcode = 'PT401'; end if;
  perform set_config('notenest.rotating', '1', true);
  if p_type = 'note' then
    update public.notes set share_token = v_new
     where id = p_id and (owner_id = auth.uid() or public.is_space_owner(space_id));
  elsif p_type = 'resource' then
    update public.resources set share_token = v_new
     where id = p_id and (owner_id = auth.uid() or public.is_space_owner(space_id));
  else
    raise exception 'invalid type' using errcode = '22023';
  end if;
  if not found then raise exception 'not_found_or_forbidden' using errcode = '42501'; end if;
  perform set_config('notenest.rotating', '', true);
  return v_new;
end $$;

-- ───────────── collaboration ─────────────
create or replace function public.invite_member(p_space uuid, p_username text, p_role public.member_role)
returns void language plpgsql security definer set search_path = ''
as $$
declare v_user uuid;
begin
  if not public.is_space_owner(p_space) then
    raise exception 'only the space owner can invite members' using errcode = '42501';
  end if;
  select pr.id into v_user from public.profiles pr where pr.username = lower(btrim(p_username));
  if v_user is null then raise exception 'user_not_found' using errcode = 'PT404'; end if;
  if v_user = auth.uid() then raise exception 'you already own this space' using errcode = '22023'; end if;
  insert into public.space_members (space_id, user_id, role, invited_by)
  values (p_space, v_user, p_role, auth.uid())
  on conflict (space_id, user_id) do update set role = excluded.role;
end $$;

-- ───────────── grants: mutating / secret-checking RPCs are not callable anonymously ─────────────
revoke execute on function public.get_shared_note(uuid, uuid)       from public, anon;
revoke execute on function public.get_shared_resource(uuid, uuid)   from public, anon;
revoke execute on function public.rotate_share_token(text, uuid)    from public, anon;
revoke execute on function public.invite_member(uuid, text, public.member_role) from public, anon;
grant  execute on function public.get_shared_note(uuid, uuid)       to authenticated;
grant  execute on function public.get_shared_resource(uuid, uuid)   to authenticated;
grant  execute on function public.rotate_share_token(text, uuid)    to authenticated;
grant  execute on function public.invite_member(uuid, text, public.member_role) to authenticated;
