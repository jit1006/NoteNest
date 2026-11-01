export type ResourceType = 'notes' | 'pyq' | 'reference'

export interface Resource {
  id: string
  title: string
  description: string
  semester: number
  subjectId: string
  subjectName: string
  unit: string
  topic: string
  resourceType: ResourceType
  year?: number
  pdfUrl: string
  tags: string[]
  /** ISO date (YYYY-MM-DD) */
  createdAt: string
}

export interface Unit {
  title: string
  chapters: string[]
}

export type SubjectAccent = 'indigo' | 'violet' | 'sky' | 'emerald' | 'amber' | 'rose' | 'fuchsia' | 'teal'

export type SubjectIcon =
  | 'database'
  | 'network'
  | 'cpu'
  | 'globe'
  | 'boxes'
  | 'clipboard'
  | 'layout'
  | 'brain'

export interface Subject {
  id: string
  name: string
  shortName: string
  semester: number
  description: string
  icon: SubjectIcon
  accent: SubjectAccent
  units: Unit[]
}

export interface StudyTask {
  id: string
  title: string
  subjectId?: string
  /** ISO date (YYYY-MM-DD) */
  dueDate?: string
  done: boolean
  createdAt: number
}

export type SortKey = 'newest' | 'oldest' | 'title' | 'subject'

export interface ResourceFilters {
  q: string
  semester: number | null
  subjectId: string | null
  type: ResourceType | null
  year: number | null
}
