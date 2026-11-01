import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Trash2, UserPlus } from 'lucide-react'
import { useInviteMember, useMembers, useRemoveMember } from '../api/spaces'
import { useToast } from './ui/Toast'
import { friendlyMessage, toApiError } from '../lib/errors'
import { supabase } from '../lib/supabase'
import type { MemberRole } from '../types/db'

export default function MembersPanel({ spaceId }: { spaceId: string }) {
  const toast = useToast(); const qc = useQueryClient()
  const members = useMembers(spaceId)
  const invite = useInviteMember(spaceId)
  const remove = useRemoveMember(spaceId)
  const [username, setUsername] = useState(''); const [role, setRole] = useState<MemberRole>('viewer')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    try { await invite.mutateAsync({ username, role }); toast.success(`${username} can now ${role === 'editor' ? 'edit' : 'view'} this space`); setUsername('') }
    catch (err) { toast.error(friendlyMessage(err as Error)) }
  }
  const changeRole = async (userId: string, next: MemberRole) => {
    const { error } = await supabase.from('space_members').update({ role: next }).eq('space_id', spaceId).eq('user_id', userId)
    if (error) toast.error(friendlyMessage(toApiError(error))); else void qc.invalidateQueries({ queryKey: ['members', spaceId] })
  }

  return (
    <section aria-labelledby="members-h" className="card p-5">
      <h2 id="members-h" className="text-base">Members</h2>
      <p className="mt-1 text-xs text-slate-500">Viewers can read everything in this space. Editors can also create and edit — but only you can change visibility or delete.</p>
      <form onSubmit={(e) => void submit(e)} className="mt-4 flex flex-wrap items-end gap-2">
        <div className="min-w-[10rem] flex-1"><label htmlFor="inv-user" className="label">Username</label><input id="inv-user" className="input" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="e.g. asha_3f9a1c" required /></div>
        <div><label htmlFor="inv-role" className="label">Role</label><select id="inv-role" className="input" value={role} onChange={(e) => setRole(e.target.value as MemberRole)}><option value="viewer">Viewer</option><option value="editor">Editor</option></select></div>
        <button className="btn-primary" disabled={invite.isPending || !username.trim()}><UserPlus className="h-4 w-4" aria-hidden="true" />Invite</button>
      </form>
      <ul className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
        {members.data?.map((m) => (
          <li key={m.user_id} className="flex items-center gap-3 py-2.5">
            <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{m.profiles?.display_name || m.profiles?.username}</span><span className="text-xs text-slate-500">@{m.profiles?.username}</span></span>
            <label className="sr-only" htmlFor={`role-${m.user_id}`}>Role for {m.profiles?.username}</label>
            <select id={`role-${m.user_id}`} className="input w-28 py-1.5" value={m.role} onChange={(e) => void changeRole(m.user_id, e.target.value as MemberRole)}><option value="viewer">Viewer</option><option value="editor">Editor</option></select>
            <button type="button" className="btn-ghost h-9 w-9 p-0 text-slate-400 hover:text-rose-600" aria-label={`Remove ${m.profiles?.username}`} onClick={() => remove.mutate(m.user_id, { onError: (err) => toast.error(friendlyMessage(err as Error)) })}><Trash2 className="h-4 w-4" aria-hidden="true" /></button>
          </li>
        ))}
        {members.data?.length === 0 && <li className="py-3 text-sm text-slate-500">Only you for now.</li>}
      </ul>
    </section>
  )
}
