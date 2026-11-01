import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { toApiError, unwrap } from '../lib/errors'
import type { MemberRole, Space, SpaceMember, Visibility } from '../types/db'
import { invalidateAll, nowIso, useUid } from './helpers'

export interface MySpaces {
  owned: Space[]
  shared: { role: MemberRole; space: Space }[]
}

export function useMySpaces() {
  const uid = useUid()
  return useQuery({
    queryKey: ['spaces', 'mine', uid],
    enabled: !!uid,
    queryFn: async (): Promise<MySpaces> => {
      const owned = unwrap(await supabase.from('academic_spaces').select('*').eq('owner_id', uid!).is('deleted_at', null).order('is_default', { ascending: false }).order('created_at'))
      const shared = unwrap(await supabase.from('space_members').select('role, academic_spaces(*)').eq('user_id', uid!)) as unknown as { role: MemberRole; academic_spaces: Space | null }[]
      return {
        owned: owned as Space[],
        shared: shared.filter((m) => m.academic_spaces && !m.academic_spaces.deleted_at).map((m) => ({ role: m.role, space: m.academic_spaces as Space })),
      }
    },
  })
}

export function useSpace(id: string | undefined) {
  return useQuery({
    queryKey: ['spaces', 'one', id],
    enabled: !!id,
    queryFn: async () => unwrap(await supabase.from('academic_spaces').select('*, profiles:owner_id(username, display_name)').eq('id', id!).maybeSingle()) as (Space & { profiles: { username: string; display_name: string } | null }) | null,
  })
}

export function usePublicSpaces(limit = 6) {
  return useQuery({
    queryKey: ['spaces', 'public', limit],
    queryFn: async () => unwrap(await supabase.from('academic_spaces').select('*, profiles:owner_id(username, display_name)').eq('visibility', 'public').is('deleted_at', null).order('updated_at', { ascending: false }).limit(limit)) as (Space & { profiles: { username: string; display_name: string } | null })[],
  })
}

export function useCreateSpace() {
  const qc = useQueryClient(); const uid = useUid()
  return useMutation({
    mutationFn: async (v: { title: string; description?: string; icon?: string; visibility?: Visibility }) => {
      const space = unwrap(await supabase.from('academic_spaces').insert({ ...v, owner_id: uid }).select().single()) as Space
      // every space starts with a first semester so content can be added immediately
      unwrap(await supabase.from('semesters').insert({ space_id: space.id, owner_id: uid, number: 1, title: 'Semester 1' }).select().single())
      return space
    },
    onSuccess: () => invalidateAll(qc),
  })
}

export function useUpdateSpace() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Partial<Pick<Space, 'title' | 'description' | 'icon' | 'visibility'>>) =>
      unwrap(await supabase.from('academic_spaces').update(patch).eq('id', id).select().single()) as Space,
    onSuccess: () => invalidateAll(qc),
  })
}

export function useSetDeleted(table: 'academic_spaces' | 'semesters' | 'subjects' | 'folders' | 'notes' | 'resources') {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, deleted }: { id: string; deleted: boolean }) => {
      const rows = unwrap(await supabase.from(table).update({ deleted_at: deleted ? nowIso() : null }).eq('id', id).select('id'))
      if (!rows || (rows as unknown[]).length === 0) throw toApiError({ message: "You don't have permission to do that." })
    },
    onSuccess: () => invalidateAll(qc),
  })
}

export function useMembers(spaceId: string | undefined) {
  return useQuery({
    queryKey: ['members', spaceId],
    enabled: !!spaceId,
    queryFn: async () => unwrap(await supabase.from('space_members').select('*, profiles:user_id(username, display_name, avatar_path)').eq('space_id', spaceId!).order('created_at')) as unknown as SpaceMember[],
  })
}

export function useInviteMember(spaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: { username: string; role: MemberRole }) => {
      const { error } = await supabase.rpc('invite_member', { p_space: spaceId, p_username: v.username, p_role: v.role })
      if (error) throw toApiError(error)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['members', spaceId] }),
  })
}

export function useRemoveMember(spaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.from('space_members').delete().eq('space_id', spaceId).eq('user_id', userId)
      if (error) throw toApiError(error)
    },
    onSuccess: () => invalidateAll(qc),
  })
}

export type SpaceRole = 'owner' | 'editor' | 'viewer' | null

/** The caller's role in a space, derived from ownership / membership rows they are allowed to see. */
export function useSpaceRole(spaceId: string | undefined, ownerId: string | undefined): SpaceRole {
  const uid = useUid()
  const mine = useMySpaces()
  if (!uid || !spaceId) return null
  if (ownerId && ownerId === uid) return 'owner'
  return mine.data?.shared.find((s) => s.space.id === spaceId)?.role ?? null
}

export function useSpaceActivity(spaceId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['activity', spaceId],
    enabled: !!spaceId && enabled,
    queryFn: async () => unwrap(await supabase.from('activity_events').select('id,event_type,entity_type,entity_id,metadata,created_at,profiles:actor_id(display_name,username)').eq('space_id', spaceId!).order('created_at', { ascending: false }).limit(12)) as unknown as { id: string; event_type: string; entity_type: string; entity_id: string; metadata: { title?: string }; created_at: string; profiles: { display_name: string; username: string } | null }[],
  })
}
