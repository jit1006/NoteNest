import type { Resource, ResourceFilters, ResourceType, SortKey } from '../types'

export const EMPTY_FILTERS: ResourceFilters = {
  q: '',
  semester: null,
  subjectId: null,
  type: null,
  year: null,
}

export const RESOURCE_TYPES: ResourceType[] = ['notes', 'pyq', 'reference']
export const SORT_KEYS: SortKey[] = ['newest', 'oldest', 'title', 'subject']

export const tokenize = (q: string): string[] => q.toLowerCase().split(/\s+/).filter(Boolean)

function haystack(r: Resource): string {
  return [r.title, r.topic, r.description, r.subjectName, r.unit, r.tags.join(' '), r.year ?? '']
    .join(' ')
    .toLowerCase()
}

/** Every search word must appear somewhere in the resource (AND semantics). */
export function matchesQuery(r: Resource, tokens: string[]): boolean {
  if (tokens.length === 0) return true
  const text = haystack(r)
  return tokens.every((t) => text.includes(t))
}

export function filterResources(list: Resource[], f: Partial<ResourceFilters>): Resource[] {
  const tokens = tokenize(f.q ?? '')
  return list.filter(
    (r) =>
      matchesQuery(r, tokens) &&
      (f.semester == null || r.semester === f.semester) &&
      (f.subjectId == null || r.subjectId === f.subjectId) &&
      (f.type == null || r.resourceType === f.type) &&
      (f.year == null || r.year === f.year),
  )
}

export function sortResources(list: Resource[], sort: SortKey): Resource[] {
  const copy = [...list]
  const byTitle = (a: Resource, b: Resource) => a.title.localeCompare(b.title)
  switch (sort) {
    case 'oldest':
      return copy.sort((a, b) => a.createdAt.localeCompare(b.createdAt) || byTitle(a, b))
    case 'title':
      return copy.sort(byTitle)
    case 'subject':
      return copy.sort((a, b) => a.subjectName.localeCompare(b.subjectName) || byTitle(a, b))
    case 'newest':
    default:
      return copy.sort((a, b) => b.createdAt.localeCompare(a.createdAt) || byTitle(a, b))
  }
}

export function queryResources(list: Resource[], f: Partial<ResourceFilters>, sort: SortKey): Resource[] {
  return sortResources(filterResources(list, f), sort)
}

/* ---------- URL <-> filter state ---------- */

const toInt = (v: string | null): number | null => {
  if (v == null || v.trim() === '') return null
  const n = Number(v)
  return Number.isInteger(n) ? n : null
}

export function filtersFromParams(p: URLSearchParams): ResourceFilters {
  const semester = toInt(p.get('semester'))
  const type = p.get('type')
  return {
    q: p.get('q') ?? '',
    semester: semester != null && semester >= 1 && semester <= 12 ? semester : null,
    subjectId: p.get('subject') || null,
    type: RESOURCE_TYPES.includes(type as ResourceType) ? (type as ResourceType) : null,
    year: toInt(p.get('year')),
  }
}

export function sortFromParams(p: URLSearchParams): SortKey {
  const s = p.get('sort')
  return SORT_KEYS.includes(s as SortKey) ? (s as SortKey) : 'newest'
}

export function paramsFromFilters(f: Partial<ResourceFilters>, sort?: SortKey): URLSearchParams {
  const p = new URLSearchParams()
  if (f.q?.trim()) p.set('q', f.q)
  if (f.semester != null) p.set('semester', String(f.semester))
  if (f.subjectId) p.set('subject', f.subjectId)
  if (f.type) p.set('type', f.type)
  if (f.year != null) p.set('year', String(f.year))
  if (sort && sort !== 'newest') p.set('sort', sort)
  return p
}

export const hasActiveFilters = (f: ResourceFilters): boolean =>
  Boolean(f.q.trim()) || f.semester != null || f.subjectId != null || f.type != null || f.year != null
