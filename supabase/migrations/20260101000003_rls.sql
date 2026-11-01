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
