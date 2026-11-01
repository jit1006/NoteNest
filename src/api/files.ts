import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { env } from '../lib/env'
import { ApiError, toApiError, unwrap } from '../lib/errors'
import { validateFile } from '../lib/files'
import type { Resource, ResourceCategory, ResourceKind, Visibility } from '../types/db'

/** Short-lived signed URL for a private object. Access is decided by storage RLS (which consults the database). */
export async function signedUrl(path: string, expiresIn = 300, downloadName?: string): Promise<string> {
  const { data, error } = await supabase.storage.from('files').createSignedUrl(path, expiresIn, downloadName ? { download: downloadName } : undefined)
  if (error || !data) throw toApiError(error ?? { message: 'File is not available.' })
  return data.signedUrl
}

export function useSignedUrl(path: string | null | undefined) {
  return useQuery({
    queryKey: ['signed-url', path],
    enabled: !!path,
    staleTime: 4 * 60_000,
    gcTime: 5 * 60_000,
    retry: false,
    queryFn: () => signedUrl(path!, 300),
  })
}

export function uploadToStorage(opts: { path: string; file: Blob; mime: string; onProgress?: (fraction: number) => void }): Promise<void> {
  return new Promise((resolve, reject) => {
    supabase.auth.getSession().then(({ data }) => {
      const token = data.session?.access_token
      if (!token) return reject(new ApiError('Please sign in to upload files.', '401', 401))
      const url = `${env.supabaseUrl}/storage/v1/object/files/${opts.path.split('/').map(encodeURIComponent).join('/')}`
      const xhr = new XMLHttpRequest()
      xhr.open('POST', url)
      xhr.setRequestHeader('Authorization', `Bearer ${token}`)
      xhr.setRequestHeader('apikey', env.supabaseAnonKey ?? '')
      xhr.setRequestHeader('Content-Type', opts.mime)
      xhr.setRequestHeader('x-upsert', 'false')
      xhr.setRequestHeader('cache-control', 'max-age=3600')
      xhr.upload.onprogress = (e) => { if (e.lengthComputable) opts.onProgress?.(e.loaded / e.total) }
      xhr.onerror = () => reject(new ApiError('Network problem during upload — please try again.'))
      xhr.onabort = () => reject(new ApiError('Upload cancelled.'))
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) return resolve()
        let msg = `Upload failed (${xhr.status}).`
        try { const j = JSON.parse(xhr.responseText); msg = j.message || j.error || msg } catch { /* ignore */ }
        reject(toApiError({ message: msg, status: xhr.status }))
      }
      xhr.send(opts.file)
    })
  })
}

export interface UploadArgs {
  file: File
  ownerId: string
  space_id: string
  semester_id: string
  subject_id?: string | null
  folder_id?: string | null
  attached_note_id?: string | null
  title?: string
  description?: string
  visibility?: Visibility
  category?: ResourceCategory
  academic_year?: number | null
  allowedKinds?: ResourceKind[]
  onProgress?: (fraction: number) => void
}

/** Upload → create resource → register file metadata. Cleans up on failure so nothing is left half-created. */
export async function uploadResource(a: UploadArgs): Promise<Resource & { storage_path: string }> {
  const check = await validateFile(a.file, a.allowedKinds)
  if (!check.ok) throw new ApiError(check.error, '22023')
  const path = `${a.ownerId}/${crypto.randomUUID()}.${check.ext}`
  await uploadToStorage({ path, file: a.file, mime: check.mime, onProgress: a.onProgress })

  let resource: Resource | null = null
  try {
    resource = unwrap(await supabase.from('resources').insert({
      space_id: a.space_id, semester_id: a.semester_id, subject_id: a.subject_id ?? null, folder_id: a.folder_id ?? null,
      attached_note_id: a.attached_note_id ?? null, owner_id: a.ownerId,
      title: (a.title?.trim() || a.file.name.replace(/\.[^.]+$/, '')).slice(0, 200),
      description: a.description ?? '', kind: check.kind, category: a.category ?? 'notes', academic_year: a.academic_year ?? null,
      visibility: a.visibility ?? 'private',
    }).select().single()) as Resource
    unwrap(await supabase.from('resource_files').insert({
      resource_id: resource.id, owner_id: a.ownerId, storage_path: path, original_filename: a.file.name.slice(0, 255),
      extension: check.ext, mime_type: check.mime, size_bytes: a.file.size,
    }).select().single())
    return { ...resource, storage_path: path }
  } catch (e) {
    if (resource) await supabase.from('resources').delete().eq('id', resource.id)
    await supabase.storage.from('files').remove([path])
    throw e
  }
}

/** Permanently delete a resource and its stored objects. */
export async function purgeResource(id: string): Promise<void> {
  const files = unwrap(await supabase.from('resource_files').select('storage_path').eq('resource_id', id)) as { storage_path: string }[]
  const { error } = await supabase.from('resources').delete().eq('id', id)
  if (error) throw toApiError(error)
  if (files.length) await supabase.storage.from('files').remove(files.map((f) => f.storage_path))
}
