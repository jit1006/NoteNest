import type { SubjectAccent } from '../types'

/** Literal class names so Tailwind's scanner can see them. */
export const ACCENT: Record<SubjectAccent, { soft: string; gradient: string; text: string }> = {
  indigo: {
    soft: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300',
    gradient: 'from-indigo-500 to-blue-500',
    text: 'text-indigo-600 dark:text-indigo-300',
  },
  violet: {
    soft: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
    gradient: 'from-violet-500 to-indigo-500',
    text: 'text-violet-600 dark:text-violet-300',
  },
  sky: {
    soft: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
    gradient: 'from-sky-500 to-indigo-500',
    text: 'text-sky-600 dark:text-sky-300',
  },
  emerald: {
    soft: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
    gradient: 'from-emerald-500 to-teal-500',
    text: 'text-emerald-600 dark:text-emerald-300',
  },
  amber: {
    soft: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
    gradient: 'from-amber-500 to-orange-500',
    text: 'text-amber-700 dark:text-amber-300',
  },
  rose: {
    soft: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
    gradient: 'from-rose-500 to-pink-500',
    text: 'text-rose-600 dark:text-rose-300',
  },
  fuchsia: {
    soft: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/15 dark:text-fuchsia-300',
    gradient: 'from-fuchsia-500 to-violet-500',
    text: 'text-fuchsia-600 dark:text-fuchsia-300',
  },
  teal: {
    soft: 'bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300',
    gradient: 'from-teal-500 to-sky-500',
    text: 'text-teal-600 dark:text-teal-300',
  },
}
