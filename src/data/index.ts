import { resources, isPopular } from './resources'
import { subjects, SEMESTERS } from './subjects'
import type { Resource, ResourceType, Subject } from '../types'

export { resources, subjects, SEMESTERS, isPopular }

const resourceMap = new Map(resources.map((r) => [r.id, r]))
const subjectMap = new Map(subjects.map((s) => [s.id, s]))

export const getResource = (id: string | undefined): Resource | undefined =>
  id ? resourceMap.get(id) : undefined

export const getSubject = (id: string | undefined): Subject | undefined =>
  id ? subjectMap.get(id) : undefined

export const resourcesForSubject = (subjectId: string): Resource[] =>
  resources.filter((r) => r.subjectId === subjectId)

export const countByType = (list: Resource[]): Record<ResourceType, number> => {
  const out: Record<ResourceType, number> = { notes: 0, pyq: 0, reference: 0 }
  for (const r of list) out[r.resourceType] += 1
  return out
}

export const recentResources = (limit: number): Resource[] =>
  [...resources].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit)

export const popularResources = (limit: number): Resource[] =>
  resources.filter(isPopular).slice(0, limit)

/** Related = same subject first, then same semester, excluding the resource itself. */
export const relatedResources = (resource: Resource, limit: number): Resource[] => {
  const score = (r: Resource) =>
    (r.subjectId === resource.subjectId ? 2 : 0) +
    (r.semester === resource.semester ? 1 : 0) +
    (r.resourceType === resource.resourceType ? 0.5 : 0)
  return resources
    .filter((r) => r.id !== resource.id && score(r) > 0)
    .sort((a, b) => score(b) - score(a) || b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit)
}

export const pyqYears = (): number[] =>
  [...new Set(resources.filter((r) => r.resourceType === 'pyq' && r.year).map((r) => r.year as number))].sort(
    (a, b) => b - a,
  )

export const TYPE_LABEL: Record<ResourceType, string> = {
  notes: 'Notes',
  pyq: 'PYQ',
  reference: 'Reference',
}

export const TYPE_LABEL_LONG: Record<ResourceType, string> = {
  notes: 'Study notes',
  pyq: 'Previous year question paper',
  reference: 'Quick reference',
}
