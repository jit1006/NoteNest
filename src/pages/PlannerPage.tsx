import { useMemo, useState } from 'react'
import { CalendarDays, CheckCircle2, ClipboardList, ListChecks, Plus, Target, Trash2, Upload } from 'lucide-react'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { readLegacyTasks, useAddTask, useDeleteTasks, useImportLegacyTasks, useTasks, useToggleTask } from '../api/tasks'
import PageHeader from '../components/ui/PageHeader'
import EmptyState from '../components/ui/EmptyState'
import ErrorState from '../components/ui/ErrorState'
import { useToast } from '../components/ui/Toast'
import { friendlyMessage } from '../lib/errors'
import { formatDate, todayISO } from '../utils/format'

type View = 'all' | 'active' | 'done'

export default function PlannerPage() {
  useDocumentTitle('Study planner')
  const tasks = useTasks(); const add = useAddTask(); const toggle = useToggleTask(); const remove = useDeleteTasks(); const importer = useImportLegacyTasks()
  const toast = useToast()
  const [title, setTitle] = useState(''); const [due, setDue] = useState(''); const [err, setErr] = useState(''); const [view, setView] = useState<View>('all')
  const legacy = readLegacyTasks().length

  const list = tasks.data ?? []
  const stats = useMemo(() => { const done = list.filter((t) => t.done).length; return { total: list.length, done, left: list.length - done, pct: list.length ? Math.round((done / list.length) * 100) : 0 } }, [list])
  const visible = list.filter((t) => view === 'all' ? true : view === 'done' ? t.done : !t.done)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) { setErr('Please describe the task before adding it.'); return }
    try { await add.mutateAsync({ title: title.trim(), due_date: due || null }); setTitle(''); setDue(''); setErr('') } catch (er) { toast.error(friendlyMessage(er as Error)) }
  }

  return (
    <>
      <PageHeader title="Study planner" description="Plan what to study and track your progress. Tasks sync to your account." />
      {legacy > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-brand-200 bg-brand-50 p-4 text-sm dark:border-brand-500/30 dark:bg-brand-500/10">
          <Upload className="h-5 w-5 text-brand-600" aria-hidden="true" />
          <p className="min-w-0 flex-1">Found <strong>{legacy}</strong> task{legacy === 1 ? '' : 's'} from the old NoteNest saved on this device.</p>
          <button type="button" className="btn-primary" disabled={importer.isPending} onClick={() => importer.mutate(undefined, { onSuccess: (n) => toast.success(`Imported ${n} tasks`), onError: (e) => toast.error(friendlyMessage(e as Error)) })}>Import into my account</button>
        </div>
      )}

      <section aria-label="Progress summary" className="card mb-8 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <dl className="grid flex-1 grid-cols-3 gap-4">
            {[['Total', stats.total, ListChecks], ['Completed', stats.done, CheckCircle2], ['Remaining', stats.left, Target]].map(([l, v, I]) => { const Icon = I as typeof ListChecks; return (
              <div key={l as string} className="flex items-center gap-3"><Icon className="hidden h-6 w-6 text-brand-600 sm:block" aria-hidden="true" /><div className="flex flex-col-reverse"><dt className="text-xs text-slate-500">{l as string}</dt><dd className="text-2xl font-extrabold text-slate-900 dark:text-white">{v as number}</dd></div></div>
            ) })}
          </dl>
          <p className="gradient-text text-4xl font-extrabold" aria-hidden="true">{stats.pct}%</p>
        </div>
        <div role="progressbar" aria-label="Study progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={stats.pct} aria-valuetext={`${stats.done} of ${stats.total} tasks completed`} className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-500 transition-all duration-500" style={{ width: `${stats.pct}%` }} />
        </div>
      </section>

      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <form onSubmit={(e) => void submit(e)} className="card space-y-4 p-5" noValidate aria-label="Add study task">
          <div><label htmlFor="t-title" className="label">New task</label><input id="t-title" className="input" maxLength={200} value={title} placeholder="e.g. Revise normal forms" onChange={(e) => { setTitle(e.target.value); setErr('') }} aria-invalid={!!err} />{err && <p role="alert" className="mt-1 text-xs text-rose-600">{err}</p>}</div>
          <div><label htmlFor="t-due" className="label">Due date (optional)</label><input id="t-due" type="date" className="input" value={due} onChange={(e) => setDue(e.target.value)} /></div>
          <button className="btn-primary w-full" disabled={add.isPending}><Plus className="h-4 w-4" aria-hidden="true" />Add task</button>
        </form>

        <section aria-label="Tasks">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div role="group" aria-label="Filter tasks" className="inline-flex rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900">
              {(['all', 'active', 'done'] as View[]).map((v) => <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)} className={`rounded-lg px-3 py-1.5 text-sm font-semibold capitalize ${view === v ? 'bg-brand-600 text-white' : 'text-slate-600 dark:text-slate-300'}`}>{v === 'active' ? 'To do' : v}</button>)}
            </div>
            {stats.done > 0 && <button type="button" className="btn-ghost" onClick={() => remove.mutate(list.filter((t) => t.done).map((t) => t.id))}><Trash2 className="h-4 w-4" aria-hidden="true" />Clear completed</button>}
          </div>
          {tasks.error ? <ErrorState error={tasks.error} onRetry={() => void tasks.refetch()} />
            : tasks.isLoading ? <div className="skeleton h-24" />
            : visible.length ? (
              <ul className="space-y-3">{visible.map((t) => {
                const overdue = !t.done && t.due_date != null && t.due_date < todayISO()
                return (
                  <li key={t.id} className="card flex items-start gap-3 p-4">
                    <input id={`task-${t.id}`} type="checkbox" checked={t.done} onChange={() => toggle.mutate(t)} className="mt-1 h-5 w-5 shrink-0 cursor-pointer accent-brand-600" />
                    <div className="min-w-0 flex-1">
                      <label htmlFor={`task-${t.id}`} className={`block cursor-pointer break-words text-sm font-medium ${t.done ? 'text-slate-400 line-through' : 'text-slate-900 dark:text-white'}`}>{t.title}</label>
                      {t.due_date && <p className={`mt-1 inline-flex items-center gap-1 text-xs ${overdue ? 'font-semibold text-rose-600' : 'text-slate-500'}`}><CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />{overdue ? 'Overdue · ' : 'Due '}{formatDate(t.due_date)}</p>}
                    </div>
                    <button type="button" aria-label={`Delete task: ${t.title}`} className="btn-ghost h-9 w-9 p-0 text-slate-400 hover:text-rose-600" onClick={() => remove.mutate([t.id])}><Trash2 className="h-4 w-4" aria-hidden="true" /></button>
                  </li>
                )
              })}</ul>
            ) : <EmptyState icon={ClipboardList} title={list.length === 0 ? 'No tasks yet' : 'Nothing here'} message={list.length === 0 ? 'Add your first study task with the form.' : 'No tasks in this view.'} />}
        </section>
      </div>
    </>
  )
}
