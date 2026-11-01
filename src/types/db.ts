// Row shapes returned by the PostgREST API (hand-written to mirror supabase/migrations).
export type Visibility = 'private' | 'unlisted' | 'public'
export type MemberRole = 'viewer' | 'editor'
export type ResourceKind = 'pdf' | 'markdown' | 'text' | 'code' | 'docx' | 'pptx' | 'image' | 'other'
export type RelationType = 'prerequisite' | 'related' | 'continuation' | 'revision' | 'cited_source'
export type ResourceCategory = 'notes' | 'pyq' | 'reference' | 'assignment' | 'other'
export type SubjectColor = 'indigo' | 'violet' | 'sky' | 'emerald' | 'amber' | 'rose' | 'fuchsia' | 'teal'
export type AnnotationColor = 'yellow' | 'green' | 'blue' | 'pink' | 'purple'

export interface Profile {
  id: string
  username: string
  display_name: string
  bio: string
  avatar_path: string | null
  created_at: string
  updated_at: string
}

interface Base {
  id: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface Space extends Base {
  owner_id: string
  title: string
  description: string
  icon: string | null
  visibility: Visibility
  is_default: boolean
}

export interface Semester extends Base {
  space_id: string
  owner_id: string
  number: number | null
  title: string
  description: string
  position: number
}

export interface Subject extends Base {
  space_id: string
  semester_id: string
  owner_id: string
  title: string
  code: string | null
  description: string
  color: SubjectColor
  position: number
}

export interface Folder extends Base {
  space_id: string
  subject_id: string
  parent_id: string | null
  owner_id: string
  title: string
  position: number
}

export interface TiptapDoc {
  type: 'doc'
  content?: unknown[]
}

export interface Note extends Base {
  space_id: string
  semester_id: string
  subject_id: string | null
  folder_id: string | null
  owner_id: string
  title: string
  icon: string | null
  cover_resource_id: string | null
  content: TiptapDoc
  content_text: string
  version: number
  visibility: Visibility
  share_token: string
}

export type NoteListItem = Pick<
  Note,
  'id' | 'title' | 'icon' | 'space_id' | 'semester_id' | 'subject_id' | 'folder_id' | 'owner_id' | 'visibility' | 'updated_at' | 'created_at' | 'deleted_at'
>

export interface ResourceFile {
  id: string
  resource_id: string
  owner_id: string
  storage_path: string
  original_filename: string
  extension: string
  mime_type: string
  size_bytes: number
  created_at: string
}

export interface Resource extends Base {
  space_id: string
  semester_id: string
  subject_id: string | null
  folder_id: string | null
  attached_note_id: string | null
  owner_id: string
  title: string
  description: string
  kind: ResourceKind
  category: ResourceCategory
  academic_year: number | null
  visibility: Visibility
  share_token: string
  resource_files?: ResourceFile[]
}

export interface NoteReference {
  id: string
  source_note_id: string
  target_note_id: string
  relation_type: RelationType
  description: string
  created_by: string
  created_at: string
}

export interface Bookmark {
  id: string
  user_id: string
  note_id: string | null
  resource_id: string | null
  block_id: string | null
  pdf_page: number | null
  label: string
  created_at: string
}

export type NoteAnchor = { type: 'block'; blockId: string; start: number; end: number; quote: string; prefix: string; suffix: string }
export type PdfAnchor = { type: 'pdf'; page: number; rects: { x: number; y: number; w: number; h: number }[]; quote: string }

export interface Annotation {
  id: string
  user_id: string
  note_id: string | null
  resource_id: string | null
  kind: 'highlight' | 'comment'
  color: AnnotationColor
  comment: string
  quote: string
  anchor: NoteAnchor | PdfAnchor
  created_at: string
  updated_at: string
}

export interface StudyTask {
  id: string
  user_id: string
  title: string
  done: boolean
  due_date: string | null
  subject_id: string | null
  note_id: string | null
  created_at: string
}

export interface Tag {
  id: string
  space_id: string
  name: string
  color: string
}

export interface SpaceMember {
  space_id: string
  user_id: string
  role: MemberRole
  created_at: string
  profiles?: Pick<Profile, 'username' | 'display_name' | 'avatar_path'> | null
}

export interface SearchHit {
  entity_type: 'note' | 'resource'
  id: string
  title: string
  snippet: string
  kind: string
  icon: string | null
  category: ResourceCategory | null
  academic_year: number | null
  owner_id: string
  owner_username: string | null
  owner_display_name: string | null
  space_id: string
  semester_id: string
  semester_number: number | null
  semester_title: string | null
  subject_id: string | null
  subject_title: string | null
  visibility: Visibility
  created_at: string
  updated_at: string
  rank: number
  total_count: number
}

export interface SearchParams {
  q?: string
  scope?: 'all' | 'public' | 'mine'
  types?: string[]
  category?: ResourceCategory | null
  year?: number | null
  semesterNumber?: number | null
  subjectId?: string | null
  subjectTitle?: string | null
  ownerId?: string | null
  since?: string | null
  until?: string | null
  page?: number
  pageSize?: number
}

export interface GraphEdge {
  source_note_id: string
  target_note_id: string
  relation_type: RelationType
  depth: number
}
