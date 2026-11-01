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
