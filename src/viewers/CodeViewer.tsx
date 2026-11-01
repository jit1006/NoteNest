import { useMemo } from 'react'
import hljs from 'highlight.js/lib/core'
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import python from 'highlight.js/lib/languages/python'
import java from 'highlight.js/lib/languages/java'
import c from 'highlight.js/lib/languages/c'
import cpp from 'highlight.js/lib/languages/cpp'
import csharp from 'highlight.js/lib/languages/csharp'
import go from 'highlight.js/lib/languages/go'
import rust from 'highlight.js/lib/languages/rust'
import ruby from 'highlight.js/lib/languages/ruby'
import php from 'highlight.js/lib/languages/php'
import sql from 'highlight.js/lib/languages/sql'
import bash from 'highlight.js/lib/languages/bash'
import json from 'highlight.js/lib/languages/json'
import yaml from 'highlight.js/lib/languages/yaml'
import css from 'highlight.js/lib/languages/css'
import kotlin from 'highlight.js/lib/languages/kotlin'
import swift from 'highlight.js/lib/languages/swift'
import r from 'highlight.js/lib/languages/r'
import { useRemoteText } from './useRemoteText'
import Spinner from '../components/ui/Spinner'
import ErrorState from '../components/ui/ErrorState'

const REG: Record<string, [string, Parameters<typeof hljs.registerLanguage>[1]]> = {
  js: ['javascript', javascript], jsx: ['javascript', javascript], ts: ['typescript', typescript], tsx: ['typescript', typescript],
  py: ['python', python], java: ['java', java], c: ['c', c], h: ['c', c], cpp: ['cpp', cpp], hpp: ['cpp', cpp], cs: ['csharp', csharp],
  go: ['go', go], rs: ['rust', rust], rb: ['ruby', ruby], php: ['php', php], sql: ['sql', sql], sh: ['bash', bash], json: ['json', json],
  yaml: ['yaml', yaml], yml: ['yaml', yaml], css: ['css', css], kt: ['kotlin', kotlin], swift: ['swift', swift], r: ['r', r],
}
for (const [name, def] of new Map(Object.values(REG).map(([n, d]) => [n, d]))) hljs.registerLanguage(name, def)

/** Source is shown as inert text. highlight.js escapes its input, so the produced markup contains only <span class>. */
export default function CodeViewer({ url, extension }: { url: string; extension: string }) {
  const { data, isLoading, error } = useRemoteText(url)
  const lines = useMemo(() => {
    if (!data) return []
    const lang = REG[extension]?.[0]
    const html = lang ? hljs.highlight(data.text, { language: lang, ignoreIllegals: true }).value : data.text.replace(/[&<>]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[ch]!)
    return html.split('\n')
  }, [data, extension])
  if (isLoading) return <div className="p-6"><Spinner label="Loading source" /></div>
  if (error || !data) return <ErrorState error={error} title="Could not display this file" />
  return (
    <div className="overflow-auto bg-slate-50 p-4 dark:bg-slate-950">
      <pre className="hljs-view min-w-max text-[13px] leading-6" tabIndex={0} aria-label="Source code"><code>
        {lines.map((l, i) => (
          <span key={i} className="flex"><span aria-hidden="true" className="w-10 shrink-0 select-none pr-3 text-right text-slate-400">{i + 1}</span><span className="whitespace-pre" dangerouslySetInnerHTML={{ __html: l || ' ' }} /></span>
        ))}
      </code></pre>
      {data.truncated && <p className="mt-3 text-xs text-amber-600">Preview truncated — download the file to read everything.</p>}
    </div>
  )
}
