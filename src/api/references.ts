import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { toApiError, unwrap } from '../lib/errors'
import type { GraphEdge, RelationType } from '../types/db'
import { invalidateAll, useUid } from './helpers'

export const RELATION_LABEL: Record<RelationType, string> = {
  prerequisite: 'Prerequisite',
  related: 'Related topic',
  continuation: 'Continuation',
  revision: 'Revision',
  cited_source: 'Cited source',
}
export const RELATION_HINT: Record<RelationType, string> = {
  prerequisite: 'Read this first',
  related: 'Connected idea',
  continuation: 'Continues in',
  revision: 'Revises',
  cited_source: 'Cites',
}
export const RELATION_TYPES = Object.keys(RELATION_LABEL) as RelationType[]

export interface NoteBrief {
  id: string
  title: string
  icon: string | null
  semester_id: string
  semesters: { number: number | null; title: string } | null
  subjects: { title: string } | null
}
const BRIEF = 'id,title,icon,semester_id,semesters(number,title),subjects(title)'

export interface RefRow {
  id: string
  relation_type: RelationType
  description: string
  created_by: string
  source_note_id: string
  target_note_id: string
  note: NoteBrief | null // the note at the other end
}

export function useOutgoingRefs(noteId: string | undefined) {
  return useQuery({
    queryKey: ['refs', 'out', noteId],
    enabled: !!noteId,
    queryFn: async () => {
      const rows = unwrap(await supabase.from('note_references').select(`id,relation_type,description,created_by,source_note_id,target_note_id, note:notes!note_references_target_note_id_fkey(${BRIEF})`).eq('source_note_id', noteId!).order('created_at')) as unknown as RefRow[]
      return rows
    },
  })
}

export function useBacklinks(noteId: string | undefined) {
  return useQuery({
    queryKey: ['refs', 'in', noteId],
    enabled: !!noteId,
    queryFn: async () => unwrap(await supabase.from('note_references').select(`id,relation_type,description,created_by,source_note_id,target_note_id, note:notes!note_references_source_note_id_fkey(${BRIEF})`).eq('target_note_id', noteId!).order('created_at')) as unknown as RefRow[],
  })
}

export function useAddReference() {
  const qc = useQueryClient(); const uid = useUid()
  return useMutation({
    mutationFn: async (v: { source: string; target: string; type: RelationType; description?: string }) => {
      const { error } = await supabase.from('note_references').insert({ source_note_id: v.source, target_note_id: v.target, relation_type: v.type, description: v.description ?? '', created_by: uid })
      if (error) throw toApiError(error)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['refs'] }),
  })
}

export function useRemoveReference() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('note_references').delete().eq('id', id); if (error) throw toApiError(error) },
    onSuccess: () => invalidateAll(qc),
  })
}

export interface Graph { edges: GraphEdge[]; nodes: Record<string, NoteBrief> }

/** Depth-limited, cycle-safe traversal done in SQL; nodes are then fetched under RLS so inaccessible notes never appear. */
export function useReferenceGraph(rootId: string | undefined, depth = 2) {
  return useQuery({
    queryKey: ['refs', 'graph', rootId, depth],
    enabled: !!rootId,
    queryFn: async (): Promise<Graph> => {
      const edges = unwrap(await supabase.rpc('note_reference_graph', { p_root: rootId!, p_depth: depth })) as GraphEdge[]
      const ids = [...new Set([rootId!, ...edges.flatMap((e) => [e.source_note_id, e.target_note_id])])]
      const notes = unwrap(await supabase.from('notes').select(BRIEF).in('id', ids)) as unknown as NoteBrief[]
      const nodes = Object.fromEntries(notes.map((n) => [n.id, n]))
      return { edges: edges.filter((e) => nodes[e.source_note_id] && nodes[e.target_note_id]), nodes }
    },
  })
}

/** Link-dialog search: only notes the caller may read are ever returned (RLS), excluding the source itself. */
export function useLinkSearch(query: string, excludeId: string | undefined) {
  const q = query.trim()
  return useQuery({
    queryKey: ['refs', 'search', q, excludeId],
    enabled: !!excludeId,
    queryFn: async () => {
      let req = supabase.from('notes').select(BRIEF).is('deleted_at', null).neq('id', excludeId!)
      if (q) req = req.ilike('title', `%${q.replace(/[%_\\]/g, (m) => `\\${m}`)}%`)
      return unwrap(await req.order('updated_at', { ascending: false }).limit(15)) as unknown as NoteBrief[]
    },
  })
}
