import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Copy, EyeOff, Globe2, Link2, Lock, RefreshCw } from 'lucide-react'
import Modal from '../ui/Modal'
import { useToast } from '../ui/Toast'
import { supabase } from '../../lib/supabase'
import { appLink } from '../../lib/env'
import { friendlyMessage, toApiError } from '../../lib/errors'
import { invalidateAll } from '../../api/helpers'
import { useUpdateNoteMeta } from '../../api/notes'
import { useUpdateResource } from '../../api/resources'
import type { Visibility } from '../../types/db'

interface Props {
  open: boolean
  onClose: () => void
  kind: 'note' | 'resource'
  id: string
  title: string
  visibility: Visibility
  shareToken: string
  /** only the item owner / space owner may change visibility */
  canChange: boolean
}

const OPTIONS: { v: Visibility; icon: typeof Lock; title: string; text: string }[] = [
  { v: 'private', icon: Lock, title: 'Private', text: 'Only you and members of this space can open it.' },
  { v: 'unlisted', icon: EyeOff, title: 'Unlisted', text: 'Hidden from search and lists. Signed-in people with the secret link can read it. Rotate the link to revoke access.' },
  { v: 'public', icon: Globe2, title: 'Public', text: 'Anyone can find and read it, including visitors who are not signed in.' },
]

export default function ShareDialog({ open, onClose, kind, id, title, visibility, shareToken, canChange }: Props) {
  const toast = useToast()
  const qc = useQueryClient()
  const updateNote = useUpdateNoteMeta()
  const updateResource = useUpdateResource()
  const [busy, setBusy] = useState(false)
  const link = appLink(`/shared/${kind}/${id}?token=${shareToken}`)

  const change = async (v: Visibility) => {
    if (v === visibility || !canChange) return
    try {
      if (kind === 'note') await updateNote.mutateAsync({ id, visibility: v })
      else await updateResource.mutateAsync({ id, visibility: v })
      toast.success(`Now ${v}`)
    } catch (e) { toast.error(friendlyMessage(e as Error)) }
  }

  const rotate = async () => {
    setBusy(true)
    try {
      const { error } = await supabase.rpc('rotate_share_token', { p_type: kind, p_id: id })
      if (error) throw toApiError(error)
      await invalidateAll(qc)
      toast.success('New link created — the old link no longer works')
    } catch (e) { toast.error(friendlyMessage(e as Error)) } finally { setBusy(false) }
  }

  const copy = async () => {
    try { await navigator.clipboard.writeText(link); toast.success('Link copied') } catch { toast.error('Copy failed — select the link and copy it manually') }
  }

  return (
    <Modal open={open} onClose={onClose} title="Visibility & sharing" description={title}>
      {!canChange && <p className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">Only the owner can change visibility.</p>}
      <fieldset className="space-y-2" disabled={!canChange}>
        <legend className="sr-only">Visibility</legend>
        {OPTIONS.map(({ v, icon: Icon, title: t, text }) => (
          <label key={v} className={`flex cursor-pointer gap-3 rounded-xl border p-3 transition ${visibility === v ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10' : 'border-slate-200 hover:border-brand-300 dark:border-slate-700'}`}>
            <input type="radio" name="visibility" value={v} checked={visibility === v} onChange={() => void change(v)} className="mt-1 accent-brand-600" />
            <span className="min-w-0">
              <span className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white"><Icon className="h-4 w-4" aria-hidden="true" />{t}</span>
              <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">{text}</span>
            </span>
          </label>
        ))}
      </fieldset>

      {visibility === 'unlisted' && (
        <div className="mt-4 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
          <label htmlFor="share-link" className="label flex items-center gap-1.5"><Link2 className="h-3.5 w-3.5" aria-hidden="true" />Secret link</label>
          <div className="flex gap-2">
            <input id="share-link" readOnly value={link} className="input text-xs" onFocus={(e) => e.currentTarget.select()} />
            <button type="button" className="btn-secondary shrink-0" onClick={() => void copy()}><Copy className="h-4 w-4" aria-hidden="true" />Copy</button>
          </div>
          <p className="mt-2 text-xs text-slate-500">Viewers must be signed in. The link alone is not enough for people without an account.</p>
          {canChange && (
            <button type="button" className="btn-ghost mt-2 text-rose-600" disabled={busy} onClick={() => void rotate()}>
              <RefreshCw className="h-4 w-4" aria-hidden="true" />Revoke &amp; create a new link
            </button>
          )}
        </div>
      )}
      {visibility === 'public' && <p className="mt-4 text-xs text-slate-500">Public notes show their semester and subject names to readers. Your private space and other content stay hidden.</p>}
    </Modal>
  )
}
