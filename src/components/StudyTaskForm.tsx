import { useId, useState, type FormEvent } from 'react'
import { Plus } from 'lucide-react'
import { subjects } from '../data'
import type { NewTask } from '../hooks/useStudyTasks'

export default function StudyTaskForm({ onAdd }: { onAdd: (t: NewTask) => boolean }) {
  const uid = useId()
  const [title, setTitle] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [error, setError] = useState('')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setError('Please describe the task before adding it.')
      return
    }
    if (onAdd({ title, subjectId, dueDate })) {
      setTitle('')
      setDueDate('')
      setError('')
    }
  }

  return (
    <form onSubmit={submit} className="card space-y-4 p-5" noValidate aria-label="Add study task">
      <div>
        <label htmlFor={`${uid}-title`} className="label">New task</label>
        <input
          id={`${uid}-title`}
          className="input"
          value={title}
          maxLength={140}
          placeholder="e.g. Revise normal forms and solve 5 problems"
          onChange={(e) => {
            setTitle(e.target.value)
            if (error) setError('')
          }}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${uid}-err` : undefined}
        />
        {error && (
          <p id={`${uid}-err`} role="alert" className="mt-1.5 text-xs font-medium text-rose-600 dark:text-rose-400">
            {error}
          </p>
        )}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${uid}-sub`} className="label">Subject (optional)</label>
          <select id={`${uid}-sub`} className="input" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
            <option value="">No subject</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`${uid}-due`} className="label">Due date (optional)</label>
          <input id={`${uid}-due`} type="date" className="input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
      </div>
      <button type="submit" className="btn-primary w-full sm:w-auto">
        <Plus className="h-4 w-4" aria-hidden="true" />
        Add task
      </button>
    </form>
  )
}
