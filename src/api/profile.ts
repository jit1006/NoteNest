import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { ApiError, toApiError, unwrap } from '../lib/errors'
import { extensionOf } from '../lib/files'
import type { Profile } from '../types/db'
import { useUid } from './helpers'

export function useProfile(id?: string) {
  const uid = useUid()
  const target = id ?? uid
  return useQuery({
    queryKey: ['profiles', target],
    enabled: !!target,
    queryFn: async () => unwrap(await supabase.from('profiles').select('*').eq('id', target!).maybeSingle()) as Profile | null,
  })
}

export function useUpdateProfile() {
  const qc = useQueryClient(); const uid = useUid()
  return useMutation({
    mutationFn: async (patch: Partial<Pick<Profile, 'display_name' | 'username' | 'bio' | 'avatar_path'>>) => {
      const { data, error } = await supabase.from('profiles').update(patch).eq('id', uid!).select().single()
      if (error) {
        if (error.code === '23505') throw new ApiError('That username is taken.', '23505')
        if (error.code === '23514') throw new ApiError('Usernames use 3–30 lowercase letters, numbers or underscores.', '23514')
        throw toApiError(error)
      }
      return data as Profile
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profiles'] }),
  })
}

export function useUploadAvatar() {
  const update = useUpdateProfile(); const uid = useUid()
  return useMutation({
    mutationFn: async (file: File) => {
      const ext = extensionOf(file.name)
      if (!['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) throw new ApiError('Avatars must be PNG, JPEG, WebP or GIF images.')
      if (file.size > 2 * 1024 * 1024) throw new ApiError('Avatars must be smaller than 2 MB.')
      const path = `${uid}/avatar-${Date.now()}.${ext}`
      const mime = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`
      const { error } = await supabase.storage.from('avatars').upload(path, file, { contentType: mime })
      if (error) throw toApiError(error)
      return update.mutateAsync({ avatar_path: path })
    },
  })
}

export const avatarUrl = (path: string | null | undefined) =>
  path ? supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl : null
