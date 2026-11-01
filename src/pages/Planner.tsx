import { useMemo, useState } from 'react'
import { CheckCircle2, ClipboardList, ListChecks, Target, Trash2 } from 'lucide-react'
import StudyTaskCard from '../components/StudyTaskCard'
import StudyTaskForm from '../components/StudyTaskForm'
import EmptyState from '../components/ui/EmptyState'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useStudyTasks } from '../hooks/useStudyTasks'

type View = 'all' | 'active' | 'done'
const VIEWS: { id: View; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'To do' },
  { id: 'done', label: 'Done' },
]

export default function Planner() {
  useDocumentTitle('Study planner')
  const { tasks, stats, addTask, toggleTask, removeTask, clearCompleted } = useStudyTasks()
  const [view, setView] = useState<View>('all')

  const visible = useMemo(
    () => tasks.filter((t) => (view === 'all' ? true : view === 'done' ? t.done : !t.done)),
    [tasks, view],
  )

  const summary = [
    { label: 'Total', value: stats.total, icon: ListChecks },
    { label: 'Completed', value: stats.completed, icon: CheckCircle2 },
    { label: 'Remaining', value: stats.remaining, icon: Target },
  ]

  return (
    <div className="container-page py-10">
      <header className="mb-8">
        <h1 className="text-3xl sm:text-4xl">Study planner</h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400">Plan what to study, tick it off, and watch your progress grow. Tasks are saved on this device.</p>
      </header>

      <section aria-label="Progress summary" className="card mb-8 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <dl className="grid flex-1 grid-cols-3 gap-4">
            {summary.map(({ label, value, icon: Icon }) => (
              <div key={label} className="flex items-center gap-3">
                <Icon className="hidden h-6 w-6 text-brand-600 sm:block dark:text-brand-300" aria-hidden="true" />
                <div className="flex flex-col-reverse">
                  <dt className="text-xs text-slate-500 dark:text-slate-400">{label}</dt>
                  <dd className="text-2xl font-extrabold text-slate-900 dark:text-white">{value}</dd>
                </div>
              </div>
            ))}
          </dl>
          <p className="gradient-text text-4xl font-extrabold" aria-hidden="true">{stats.percent}%</p>
        </div>
        <div
          role="progressbar"
          aria-label="Study progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={stats.percent}
          aria-valuetext={`${stats.completed} of ${stats.total} tasks completed`}
          className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-500 transition-all duration-500"
            style={{ width: `${stats.percent}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          {stats.total === 0 ? 'Add your first task to start tracking progress.' : `${stats.completed} of ${stats.total} tasks completed.`}
        </p>
      </section>

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-8 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <StudyTaskForm onAdd={addTask} />

        <section aria-label="Tasks">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div role="group" aria-label="Filter tasks" className="inline-flex rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900">
              {VIEWS.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  aria-pressed={view === v.id}
                  onClick={() => setView(v.id)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                    view === v.id ? 'bg-brand-600 text-white' : 'text-slate-600 hover:text-brand-700 dark:text-slate-300'
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
            {stats.completed > 0 && (
              <button type="button" className="btn-ghost" onClick={clearCompleted}>
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Clear completed
              </button>
            )}
          </div>

          {visible.length > 0 ? (
            <ul className="space-y-3">
              {visible.map((t) => (
                <StudyTaskCard key={t.id} task={t} onToggle={toggleTask} onRemove={removeTask} />
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={ClipboardList}
              title={tasks.length === 0 ? 'No tasks yet' : view === 'done' ? 'Nothing completed yet' : 'All caught up!'}
              message={
                tasks.length === 0
                  ? 'Use the form to add your first study task, like “Revise ER diagrams”.'
                  : view === 'done'
                    ? 'Complete a task and it will appear here.'
                    : 'You have no pending tasks in this view.'
              }
            />
          )}
        </section>
      </div>
    </div>
  )
}
