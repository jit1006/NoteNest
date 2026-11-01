import { useEffect, useState } from 'react'
import { useRemoteBuffer } from './useRemoteText'
import Spinner from '../components/ui/Spinner'
import ErrorState from '../components/ui/ErrorState'

const decode = (s: string) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&')

/** Extracts slide TEXT only (no rendering of shapes/images/animations). Clearly labelled as an outline. */
export default function PptxViewer({ url, cacheKey }: { url: string; cacheKey: string }) {
  const buf = useRemoteBuffer(url, cacheKey)
  const [slides, setSlides] = useState<string[][] | null>(null)
  const [err, setErr] = useState<unknown>(null)

  useEffect(() => {
    if (!buf.data) return
    let active = true
    ;(async () => {
      try {
        const JSZip = (await import('jszip')).default
        const zip = await JSZip.loadAsync(buf.data)
        const names = Object.keys(zip.files).filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n)).sort((a, b) => parseInt(a.match(/\d+/)![0]) - parseInt(b.match(/\d+/)![0])).slice(0, 300)
        const out: string[][] = []
        for (const n of names) {
          const xml = await zip.files[n].async('string')
          const paras = xml.split('</a:p>').map((p) => [...p.matchAll(/<a:t[^>]*>([^<]*)<\/a:t>/g)].map((m) => decode(m[1])).join('')).filter((t) => t.trim())
          out.push(paras)
        }
        if (active) setSlides(out)
      } catch (e) { if (active) setErr(e) }
    })()
    return () => { active = false }
  }, [buf.data])

  if (buf.error || err) return <ErrorState error={buf.error ?? err} title="This presentation could not be previewed" />
  if (!slides) return <div className="p-6"><Spinner label="Reading slides" /></div>
  return (
    <div>
      <p className="border-b border-slate-200 bg-amber-50 px-4 py-2 text-xs text-amber-900 dark:border-slate-800 dark:bg-amber-500/10 dark:text-amber-200">Text outline only — images, layout and animations are not shown. Download the file to see the full slides.</p>
      <ol className="grid gap-4 p-4 sm:grid-cols-2">
        {slides.map((paras, i) => (
          <li key={i} className="card p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-brand-600">Slide {i + 1}</p>
            {paras.length ? paras.map((t, j) => <p key={j} className={`text-sm ${j === 0 ? 'font-semibold text-slate-900 dark:text-white' : ''}`}>{t}</p>) : <p className="text-xs italic text-slate-400">No text on this slide</p>}
          </li>
        ))}
      </ol>
    </div>
  )
}
