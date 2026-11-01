import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Modal from '../ui/Modal'
import { useToast } from '../ui/Toast'
import { friendlyMessage } from '../../lib/errors'
import { useCreateSpace, useMySpaces, useUpdateSpace } from '../../api/spaces'
import { useCreateFolder, useCreateSemester, useCreateSubject, useSemesters, useSubjectsOfSemester, useUpdateRow } from '../../api/hierarchy'
import { useCreateNote } from '../../api/notes'
import type { Folder, Semester, Space, Subject, SubjectColor } from '../../types/db'

const COLORS: SubjectColor[] = ['indigo', 'violet', 'sky', 'emerald', 'amber', 'rose', 'fuchsia', 'teal']

function Field({ label, error, children, htmlFor }: { label: string; error?: string; children: ReactNode; htmlFor: string }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="label">{label}</label>
      {children}
      {error && <p role="alert" className="mt-1 text-xs text-rose-600 dark:text-rose-400">{error}</p>}
    </div>
  )
}

function FormModal({ open, onClose, title, description, submitLabel, busy, onSubmit, children, formId }: { open: boolean; onClose: () => void; title: string; description?: string; submitLabel: string; busy: boolean; onSubmit: () => void; children: ReactNode; formId: string }) {
  return (
    <Modal open={open} onClose={onClose} title={title} description={description}
      footer={<><button type="button" className="btn-secondary" onClick={onClose}>Cancel</button><button type="submit" form={formId} className="btn-primary" disabled={busy}>{busy ? 'Saving…' : submitLabel}</button></>}>
      <form id={formId} className="space-y-4" onSubmit={(e) => { e.preventDefault(); onSubmit() }} noValidate>{children}</form>
    </Modal>
  )
}

// ───────────── space ─────────────
const spaceSchema = z.object({
  title: z.string().trim().min(1, 'Give the space a name').max(120),
  description: z.string().max(2000).optional(),
  icon: z.string().max(8).optional(),
  visibility: z.enum(['private', 'public']),
})
type SpaceForm = z.infer<typeof spaceSchema>

export function CreateSpaceDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return <SpaceDialog open={open} onClose={onClose} />
}

export function SpaceDialog({ open, onClose, space }: { open: boolean; onClose: () => void; space?: Space }) {
  const toast = useToast(); const navigate = useNavigate()
  const create = useCreateSpace(); const update = useUpdateSpace()
  const { register, handleSubmit, reset, formState: { errors } } = useForm<SpaceForm>({ resolver: zodResolver(spaceSchema), defaultValues: { title: '', description: '', icon: '📚', visibility: 'private' } })
  useEffect(() => { if (open) reset(space ? { title: space.title, description: space.description, icon: space.icon ?? '', visibility: space.visibility === 'public' ? 'public' : 'private' } : { title: '', description: '', icon: '📚', visibility: 'private' }) }, [open, space, reset])
  const busy = create.isPending || update.isPending
  const submit = handleSubmit(async (v) => {
    try {
      if (space) { await update.mutateAsync({ id: space.id, ...v, icon: v.icon || null }); toast.success('Space updated') }
      else { const s = await create.mutateAsync({ ...v, icon: v.icon || undefined }); toast.success('Space created'); navigate(`/spaces/${s.id}`) }
      onClose()
    } catch (e) { toast.error(friendlyMessage(e as Error)) }
  })
  return (
    <FormModal open={open} onClose={onClose} formId="space-form" title={space ? 'Edit space' : 'New academic space'} description="A space is a course or collection, e.g. “MCA 2026”." submitLabel={space ? 'Save' : 'Create space'} busy={busy} onSubmit={() => void submit()}>
      <div className="grid grid-cols-[5rem_1fr] gap-3">
        <Field label="Icon" htmlFor="sp-icon"><input id="sp-icon" className="input text-center text-lg" {...register('icon')} /></Field>
        <Field label="Name" htmlFor="sp-title" error={errors.title?.message}><input id="sp-title" className="input" autoFocus {...register('title')} /></Field>
      </div>
      <Field label="Description" htmlFor="sp-desc" error={errors.description?.message}><textarea id="sp-desc" rows={3} className="input" {...register('description')} /></Field>
      <Field label="Visibility" htmlFor="sp-vis">
        <select id="sp-vis" className="input" {...register('visibility')}>
          <option value="private">Private — only you and invited members</option>
          <option value="public">Public — anyone can browse the structure</option>
        </select>
      </Field>
    </FormModal>
  )
}

// ───────────── semester ─────────────
const semSchema = z.object({
  title: z.string().trim().min(1, 'Give the semester a name').max(120),
  number: z.string().regex(/^\d{0,2}$/, 'Use a number from 0 to 20').optional(),
})

export function SemesterDialog({ open, onClose, spaceId, semester }: { open: boolean; onClose: () => void; spaceId: string; semester?: Semester }) {
  const toast = useToast(); const create = useCreateSemester(); const update = useUpdateRow('semesters')
  const { register, handleSubmit, reset, formState: { errors } } = useForm<z.infer<typeof semSchema>>({ resolver: zodResolver(semSchema), defaultValues: { title: '', number: '' } })
  useEffect(() => { if (open) reset({ title: semester?.title ?? '', number: semester?.number != null ? String(semester.number) : '' }) }, [open, semester, reset])
  const submit = handleSubmit(async (v) => {
    const number = v.number ? Number(v.number) : null
    try {
      if (semester) await update.mutateAsync({ id: semester.id, title: v.title, number })
      else await create.mutateAsync({ space_id: spaceId, title: v.title, number })
      toast.success(semester ? 'Semester updated' : 'Semester added'); onClose()
    } catch (e) { toast.error(friendlyMessage(e as Error)) }
  })
  return (
    <FormModal open={open} onClose={onClose} formId="sem-form" title={semester ? 'Edit semester' : 'Add semester'} submitLabel={semester ? 'Save' : 'Add semester'} busy={create.isPending || update.isPending} onSubmit={() => void submit()}>
      <Field label="Name" htmlFor="sem-title" error={errors.title?.message}><input id="sem-title" className="input" autoFocus placeholder="Semester 3" {...register('title')} /></Field>
      <Field label="Number (optional)" htmlFor="sem-num" error={errors.number?.message}><input id="sem-num" inputMode="numeric" className="input" placeholder="3" {...register('number')} /></Field>
      <p className="text-xs text-slate-500">The number powers the semester filter in Explore. Each number can be used once per space.</p>
    </FormModal>
  )
}

// ───────────── subject ─────────────
const subjSchema = z.object({
  title: z.string().trim().min(1, 'Give the subject a name').max(120),
  code: z.string().max(24).optional(),
  description: z.string().max(2000).optional(),
  color: z.enum(['indigo', 'violet', 'sky', 'emerald', 'amber', 'rose', 'fuchsia', 'teal']),
})

export function SubjectDialog({ open, onClose, spaceId, semesterId, subject }: { open: boolean; onClose: () => void; spaceId: string; semesterId: string; subject?: Subject }) {
  const toast = useToast(); const create = useCreateSubject(); const update = useUpdateRow('subjects')
  const { register, handleSubmit, reset, formState: { errors } } = useForm<z.infer<typeof subjSchema>>({ resolver: zodResolver(subjSchema), defaultValues: { title: '', code: '', description: '', color: 'indigo' } })
  useEffect(() => { if (open) reset({ title: subject?.title ?? '', code: subject?.code ?? '', description: subject?.description ?? '', color: subject?.color ?? 'indigo' }) }, [open, subject, reset])
  const submit = handleSubmit(async (v) => {
    try {
      if (subject) await update.mutateAsync({ id: subject.id, ...v, code: v.code || null })
      else await create.mutateAsync({ space_id: spaceId, semester_id: semesterId, ...v, code: v.code || null })
      toast.success(subject ? 'Subject updated' : 'Subject added'); onClose()
    } catch (e) { toast.error(friendlyMessage(e as Error)) }
  })
  return (
    <FormModal open={open} onClose={onClose} formId="subj-form" title={subject ? 'Edit subject' : 'Add subject'} submitLabel={subject ? 'Save' : 'Add subject'} busy={create.isPending || update.isPending} onSubmit={() => void submit()}>
      <div className="grid grid-cols-[1fr_7rem] gap-3">
        <Field label="Name" htmlFor="sj-title" error={errors.title?.message}><input id="sj-title" className="input" autoFocus {...register('title')} /></Field>
        <Field label="Code" htmlFor="sj-code"><input id="sj-code" className="input" placeholder="DBMS" {...register('code')} /></Field>
      </div>
      <Field label="Description" htmlFor="sj-desc"><textarea id="sj-desc" rows={3} className="input" {...register('description')} /></Field>
      <Field label="Colour" htmlFor="sj-color"><select id="sj-color" className="input capitalize" {...register('color')}>{COLORS.map((c) => <option key={c} value={c}>{c}</option>)}</select></Field>
    </FormModal>
  )
}

// ───────────── folder ─────────────
export function FolderDialog({ open, onClose, spaceId, subjectId, parentId, folder }: { open: boolean; onClose: () => void; spaceId: string; subjectId: string; parentId?: string | null; folder?: Folder }) {
  const toast = useToast(); const create = useCreateFolder(); const update = useUpdateRow('folders')
  const { register, handleSubmit, reset, formState: { errors } } = useForm<{ title: string }>({ resolver: zodResolver(z.object({ title: z.string().trim().min(1, 'Give the folder a name').max(120) })), defaultValues: { title: '' } })
  useEffect(() => { if (open) reset({ title: folder?.title ?? '' }) }, [open, folder, reset])
  const submit = handleSubmit(async (v) => {
    try {
      if (folder) await update.mutateAsync({ id: folder.id, title: v.title })
      else await create.mutateAsync({ space_id: spaceId, subject_id: subjectId, title: v.title, parent_id: parentId ?? null })
      toast.success(folder ? 'Folder renamed' : 'Folder created'); onClose()
    } catch (e) { toast.error(friendlyMessage(e as Error)) }
  })
  return (
    <FormModal open={open} onClose={onClose} formId="folder-form" title={folder ? 'Rename topic folder' : 'New topic folder'} submitLabel={folder ? 'Save' : 'Create folder'} busy={create.isPending || update.isPending} onSubmit={() => void submit()}>
      <Field label="Name" htmlFor="fd-title" error={errors.title?.message}><input id="fd-title" className="input" autoFocus {...register('title')} /></Field>
    </FormModal>
  )
}

// ───────────── new note (choose where it lives) ─────────────
export interface NoteDefaults { spaceId?: string; semesterId?: string; subjectId?: string | null; folderId?: string | null }

export function NewNoteDialog({ open, onClose, defaults = {} }: { open: boolean; onClose: () => void; defaults?: NoteDefaults }) {
  const toast = useToast(); const navigate = useNavigate(); const create = useCreateNote()
  const spaces = useMySpaces()
  const editable: Space[] = [...(spaces.data?.owned ?? []), ...(spaces.data?.shared.filter((s) => s.role === 'editor').map((s) => s.space) ?? [])]
  const [spaceId, setSpaceId] = useState(''); const [semesterId, setSemesterId] = useState(''); const [subjectId, setSubjectId] = useState(''); const [title, setTitle] = useState('')
  const sems = useSemesters(spaceId || undefined)
  const subs = useSubjectsOfSemester(semesterId || undefined)

  useEffect(() => { if (open) { setSpaceId(defaults.spaceId ?? ''); setSemesterId(defaults.semesterId ?? ''); setSubjectId(defaults.subjectId ?? ''); setTitle('') } }, [open, defaults.spaceId, defaults.semesterId, defaults.subjectId])
  useEffect(() => { if (open && !spaceId && editable.length) setSpaceId(editable[0].id) }, [open, spaceId, editable])
  useEffect(() => { if (open && spaceId && sems.data?.length && !sems.data.some((s) => s.id === semesterId)) setSemesterId(sems.data[0].id) }, [open, spaceId, sems.data, semesterId])
  useEffect(() => { if (subjectId && subs.data && !subs.data.some((s) => s.id === subjectId)) setSubjectId('') }, [subs.data, subjectId])

  const submit = async () => {
    if (!spaceId || !semesterId) return
    try {
      const n = await create.mutateAsync({ space_id: spaceId, semester_id: semesterId, subject_id: subjectId || null, folder_id: subjectId && defaults.folderId ? defaults.folderId : null, title: title.trim() || 'Untitled' })
      toast.success('Note created'); onClose(); navigate(`/notes/${n.id}/edit`)
    } catch (e) { toast.error(friendlyMessage(e as Error)) }
  }

  return (
    <Modal open={open} onClose={onClose} title="New note" description="Choose where it lives — you can reference it from any other note later."
      footer={<><button type="button" className="btn-secondary" onClick={onClose}>Cancel</button><button type="button" className="btn-primary" disabled={!spaceId || !semesterId || create.isPending} onClick={() => void submit()}>{create.isPending ? 'Creating…' : 'Create note'}</button></>}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); void submit() }}>
        <Field label="Title" htmlFor="nn-title"><input id="nn-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Untitled" autoFocus /></Field>
        <Field label="Space" htmlFor="nn-space"><select id="nn-space" className="input" value={spaceId} onChange={(e) => { setSpaceId(e.target.value); setSemesterId(''); setSubjectId('') }}>{editable.map((s) => <option key={s.id} value={s.id}>{s.icon ?? ''} {s.title}</option>)}</select></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Semester" htmlFor="nn-sem"><select id="nn-sem" className="input" value={semesterId} onChange={(e) => { setSemesterId(e.target.value); setSubjectId('') }}>{sems.data?.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}</select></Field>
          <Field label="Subject (optional)" htmlFor="nn-sub"><select id="nn-sub" className="input" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}><option value="">No subject</option>{subs.data?.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}</select></Field>
        </div>
        {editable.length === 0 && !spaces.isLoading && <p role="alert" className="text-sm text-amber-700">You need a space you can edit first.</p>}
      </form>
    </Modal>
  )
}
