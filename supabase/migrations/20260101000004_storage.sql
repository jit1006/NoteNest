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
