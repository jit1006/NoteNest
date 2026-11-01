import { useEffect } from 'react'

const BASE = 'NoteNest'

export function useDocumentTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} · ${BASE}` : `${BASE} — Your Semester. Your Notes. One Place.`
  }, [title])
}
