import { CalendarDays, Trash2 } from 'lucide-react'
import type { StudyTask } from '../types'
import { getSubject } from '../data'
import { formatDate, todayISO } from '../utils/format'

interface Props {
  task: StudyTask
  onToggle: (id: string) => void
  onRemove: (id: string) => void
}

export default function StudyTaskCard({ task, onToggle, onRemove }: Props) {
  const subject = getSubject(task.subjectId)
  const overdue = !task.done && task.dueDate != null && task.dueDate < todayISO()
  const checkId = `task-${task.id}`

  return (
    <li className="card flex items-start gap-3 p-4">
      <input
        id={checkId}
        type="checkbox"
        checked={task.done}
        onChange={() => onToggle(task.id)}
        className="mt-1 h-5 w-5 shrink-0 cursor-pointer rounded-md border-slate-300 accent-brand-600"
      />
      <div className="min-w-0 flex-1">
        <label
          htmlFor={checkId}
          className={`block cursor-pointer break-words text-sm font-medium ${
            task.done ? 'text-slate-400 line-through dark:text-slate-500' : 'text-slate-900 dark:text-white'
          }`}
        >
          {task.title}
        </label>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
          {subject && <span className="font-semibold text-brand-600 dark:text-brand-300">{subject.shortName}</span>}
          {task.dueDate && (
            <span className={`inline-flex items-center gap-1 ${overdue ? 'font-semibold text-rose-600 dark:text-rose-400' : ''}`}>
              <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
              {overdue ? 'Overdue · ' : 'Due '}
              {formatDate(task.dueDate)}
            </span>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={() => onRemove(task.id)}
        aria-label={`Delete task: ${task.title}`}
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
      </button>
    </li>
  )
}
