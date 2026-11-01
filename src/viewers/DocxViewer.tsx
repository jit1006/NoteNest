import { useEffect, useState } from 'react'
import DOMPurify from 'dompurify'
import { useRemoteBuffer } from './useRemoteText'
import Spinner from '../components/ui/Spinner'
import ErrorState from '../components/ui/ErrorState'

/** DOCX → HTML in the browser (mammoth), then sanitised with DOMPurify. Macros are never executed (DOCX has none). */
export default function DocxViewer({ url, cacheKey }: { url: string; cacheKey: string }) {
  const buf = useRemoteBuffer(url, cacheKey)
  const [html, setHtml] = useState<string | null>(null)
  const [err, setErr] = useState<unknown>(null)

  useEffect(() => {
    if (!buf.data) return
    let active = true
    ;(async () => {
      try {
        type Mammoth = { convertToHtml(i: { arrayBuffer: ArrayBuffer }): Promise<{ value: string }> }
        const mod = (await import('mammoth/mammoth.browser.min.js')) as Mammoth & { default?: Mammoth }
        const mammoth: Mammoth = mod.default ?? mod
        const { value } = await mammoth.convertToHtml({ arrayBuffer: buf.data })
        const clean = DOMPurify.sanitize(value, { USE_PROFILES: { html: true }, FORBID_TAGS: ['style', 'form', 'input', 'iframe'], FORBID_ATTR: ['style'] })
        if (active) setHtml(clean)
      } catch (e) { if (active) setErr(e) }
    })()
    return () => { active = false }
  }, [buf.data])

  if (buf.error || err) return <ErrorState error={buf.error ?? err} title="This Word file could not be previewed" />
  if (!html) return <div className="p-6"><Spinner label="Converting document" /></div>
  return (
    <div>
      <p className="border-b border-slate-200 bg-amber-50 px-4 py-2 text-xs text-amber-900 dark:border-slate-800 dark:bg-amber-500/10 dark:text-amber-200">Simplified preview — layout may differ from Word. Download for the original.</p>
      <article className="note-prose mx-auto max-w-3xl p-5 sm:p-8" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  )
}
