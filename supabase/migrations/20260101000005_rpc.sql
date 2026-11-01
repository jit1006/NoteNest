-- NoteNest V2 — server-side queries (RPC)
-- Read RPCs are SECURITY INVOKER so Row Level Security always applies to the caller.
-- Only functions that must aggregate across private data (popularity) or validate secrets are SECURITY DEFINER.

-- ───────────── full-text search + filters + pagination ─────────────
create or replace function public.search_library(
  p_query           text default '',
  p_scope           text default 'all',      -- 'all' (everything I may read) | 'public' | 'mine'
  p_types           text[] default null,     -- 'note' and/or resource kinds ('pdf','markdown',...)
  p_semester_number integer default null,
  p_subject_id      uuid default null,
  p_owner_id        uuid default null,
  p_since           timestamptz default null,
  p_until           timestamptz default null,
  p_limit           integer default 20,
  p_offset          integer default 0
) returns table (
  entity_type text, id uuid, title text, snippet text, kind text, icon text,
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
           n.owner_id, n.space_id, n.semester_id, n.subject_id, n.visibility, n.created_at, n.updated_at,
           (case when q.tsq is null then 0::real
                 else ts_rank(n.search, q.tsq) + (case when n.title ilike q.pat then 0.5 else 0 end)::real end)::real as rank
    from public.notes n cross join q
    where n.deleted_at is null and n.visibility <> 'unlisted'
      and (q.raw is null or n.search @@ q.tsq or n.title ilike q.pat)
      and (p_types is null or 'note' = any (p_types))
    union all
    select 'resource'::text, r.id, r.title, r.description, r.kind::text, null::text,
           r.owner_id, r.space_id, r.semester_id, r.subject_id, r.visibility, r.created_at, r.updated_at,
           (case when q.tsq is null then 0::real
                 else ts_rank(r.search, q.tsq) + (case when r.title ilike q.pat then 0.5 else 0 end)::real end)::real
    from public.resources r cross join q
    where r.deleted_at is null and r.attached_note_id is null and r.visibility <> 'unlisted'
      and (q.raw is null or r.search @@ q.tsq or r.title ilike q.pat)
      and (p_types is null or r.kind::text = any (p_types))
  ),
  filtered as (
    select h.*, s.number as semester_number, s.title as semester_title, sub.title as subject_title,
           p.username as owner_username, p.display_name as owner_display_name
    from hits h
    left join public.semesters s   on s.id = h.semester_id
    left join public.subjects sub  on sub.id = h.subject_id
    left join public.profiles p    on p.id = h.owner_id
    where (p_semester_number is null or s.number = p_semester_number)
      and (p_subject_id is null or h.subject_id = p_subject_id)
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
         pg.kind, pg.icon, pg.owner_id, pg.owner_username, pg.owner_display_name,
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
returns table (id uuid, title text, kind text, owner_id uuid, owner_username text, owner_display_name text,
               space_id uuid, created_at timestamptz, size_bytes bigint, extension text)
language sql stable security definer set search_path = ''
as $$
  select r.id, r.title, r.kind::text, r.owner_id, p.username, p.display_name, r.space_id, r.created_at, f.size_bytes, f.extension
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
  if auth.uid() is null then raise exception 'auth_required' using errcode = '28000'; end if;
  select * into n from public.notes
   where id = p_id and visibility = 'unlisted' and deleted_at is null and share_token = p_token;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
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
  if auth.uid() is null then raise exception 'auth_required' using errcode = '28000'; end if;
  select * into r from public.resources
   where id = p_id and visibility = 'unlisted' and deleted_at is null and share_token = p_token;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', f.id, 'original_filename', f.original_filename, 'mime_type', f.mime_type,
           'size_bytes', f.size_bytes, 'extension', f.extension)), '[]'::jsonb)
    into v_files from public.resource_files f where f.resource_id = r.id;
  insert into public.activity_events (actor_id, space_id, event_type, entity_type, entity_id)
  values (auth.uid(), r.space_id, 'resource.shared_view', 'resource', r.id);
  return jsonb_build_object(
    'id', r.id, 'title', r.title, 'description', r.description, 'kind', r.kind, 'owner_id', r.owner_id,
    'created_at', r.created_at, 'space_id', r.space_id, 'files', v_files);
end $$;

create or replace function public.rotate_share_token(p_type text, p_id uuid)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_new uuid := gen_random_uuid();
begin
  if auth.uid() is null then raise exception 'auth_required' using errcode = '28000'; end if;
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
  if v_user is null then raise exception 'user_not_found' using errcode = 'P0002'; end if;
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
