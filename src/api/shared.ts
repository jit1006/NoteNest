import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { ApiError, toApiError, unwrap } from '../lib/errors'
import type { ResourceKind, TiptapDoc } from '../types/db'

export interface SharedNote { id: string; title: string; icon: string | null; content: TiptapDoc; owner_id: string; updated_at: string; space_id: string }
export interface SharedResource { id: string; title: string; description: string; kind: ResourceKind; category: string; owner_id: string; created_at: string; files: { id: string; original_filename: string; mime_type: string; size_bytes: number; extension: string }[] }

/** Unlisted content: needs a signed-in user AND the secret token. The server refuses anything else. */
export function useSharedItem<T>(kind: 'note' | 'resource', id: string | undefined, token: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['shared', kind, id, token],
    enabled: enabled && !!id && !!token,
    retry: false,
    queryFn: async () => unwrap(await supabase.rpc(kind === 'note' ? 'get_shared_note' : 'get_shared_resource', { p_id: id!, p_token: token! })) as T,
  })
}

export async function fetchSharedFileUrl(args: { kind: 'note' | 'resource'; id: string; token: string; resourceId?: string; fileId?: string }): Promise<{ url: string; filename: string; mime: string }> {
  const { data, error } = await supabase.functions.invoke('shared-file-url', { body: args })
  if (error) throw toApiError(error)
  if (!data?.url) throw new ApiError('This file is not available.')
  return data
}

export function useSharedFileUrl(noteId: string | undefined, token: string | undefined, resourceId: string | undefined) {
  return useQuery({
    queryKey: ['signed-url', 'shared', noteId, resourceId],
    enabled: !!noteId && !!token && !!resourceId,
    staleTime: 90_000,
    retry: false,
    queryFn: async () => (await fetchSharedFileUrl({ kind: 'note', id: noteId!, token: token!, resourceId })).url,
  })
}
