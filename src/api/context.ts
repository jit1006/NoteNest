import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { unwrap } from '../lib/errors'

export interface ContainerLabels { semester_number: number | null; semester_title: string | null; subject_title: string | null }

/** Semester/subject names for an item the caller can read — available even when the surrounding space is private. */
export function useContainerLabels(semesterId: string | undefined, subjectId: string | null | undefined) {
  return useQuery({
    queryKey: ['labels', semesterId, subjectId ?? null],
    enabled: !!semesterId,
    staleTime: 60_000,
    queryFn: async () => {
      const rows = unwrap(await supabase.rpc('container_labels', { p_semester: semesterId!, p_subject: subjectId ?? null })) as ContainerLabels[]
      return rows[0] ?? null
    },
  })
}
