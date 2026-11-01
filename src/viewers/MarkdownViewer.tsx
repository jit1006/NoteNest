import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSanitize from 'rehype-sanitize'
import rehypeHighlight from 'rehype-highlight'
import { useRemoteText } from './useRemoteText'
import Spinner from '../components/ui/Spinner'
import ErrorState from '../components/ui/ErrorState'

/** Markdown is rendered through rehype-sanitize (no raw HTML/scripts); remote images are never fetched. */
export default function MarkdownViewer({ url }: { url: string }) {
  const { data, isLoading, error } = useRemoteText(url)
  if (isLoading) return <div className="p-6"><Spinner label="Loading document" /></div>
  if (error || !data) return <ErrorState error={error} title="Could not display this Markdown file" />
  return (
    <article className="note-prose mx-auto max-w-3xl p-5 sm:p-8">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize, rehypeHighlight]}
        components={{
          a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer nofollow">{children}</a>,
          img: ({ alt }) => <span className="rounded bg-slate-100 px-1.5 text-xs text-slate-500 dark:bg-slate-800">[image: {alt || 'omitted'}]</span>,
        }}
      >{data.text}</ReactMarkdown>
      {data.truncated && <p className="mt-6 text-xs text-amber-600">Preview truncated — download the file to read everything.</p>}
    </article>
  )
}
