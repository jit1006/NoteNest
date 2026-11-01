import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { unwrap } from '../lib/errors'
import type { SearchHit, SearchParams } from '../types/db'

export const PAGE_SIZE = 12

export function useSearch(p: SearchParams) {
  const pageSize = p.pageSize ?? PAGE_SIZE
  const page = p.page ?? 0
  return useQuery({
    queryKey: ['search', p],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const rows = unwrap(await supabase.rpc('search_library', {
        p_query: p.q ?? '',
        p_scope: p.scope ?? 'all',
        p_types: p.types?.length ? p.types : null,
        p_category: p.category ?? null,
        p_year: p.year ?? null,
        p_semester_number: p.semesterNumber ?? null,
        p_subject_id: p.subjectId ?? null,
        p_owner_id: p.ownerId ?? null,
        p_since: p.since ?? null,
        p_until: p.until ?? null,
        p_limit: pageSize,
        p_offset: page * pageSize,
      })) as SearchHit[]
      return { hits: rows, total: rows.length ? Number(rows[0].total_count) : 0, page, pageSize }
    },
  })
}

export interface PopularNote { id: string; title: string; icon: string | null; owner_id: string; owner_username: string; owner_display_name: string; space_id: string; updated_at: string; saves: number }
export interface RecentUpload { id: string; title: string; kind: string; category: string; owner_username: string; owner_display_name: string; created_at: string; size_bytes: number | null; extension: string | null }

export function usePopularNotes(limit = 6) {
  return useQuery({ queryKey: ['feeds', 'popular', limit], queryFn: async () => unwrap(await supabase.rpc('popular_public_notes', { p_limit: limit })) as PopularNote[] })
}

export function useRecentUploads(limit = 6) {
  return useQuery({ queryKey: ['feeds', 'uploads', limit], queryFn: async () => unwrap(await supabase.rpc('recent_public_uploads', { p_limit: limit })) as RecentUpload[] })
}
