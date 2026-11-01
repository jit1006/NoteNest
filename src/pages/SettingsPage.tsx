import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Camera, RotateCcw, Trash2 } from 'lucide-react'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useAuth } from '../auth/AuthProvider'
import { avatarUrl, useProfile, useUpdateProfile, useUploadAvatar } from '../api/profile'
import { useTrash } from '../api/notes'
import { useSetDeleted } from '../api/spaces'
import PageHeader from '../components/ui/PageHeader'
import ThemeToggle from '../components/ThemeToggle'
import { useToast } from '../components/ui/Toast'
import { friendlyMessage } from '../lib/errors'
import { formatDate } from '../utils/format'

const profileSchema = z.object({
  display_name: z.string().trim().min(1, 'Enter a display name').max(80),
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,30}$/, 'Use 3–30 lowercase letters, numbers or underscores'),
  bio: z.string().max(500, 'Keep it under 500 characters'),
})
const pwSchema = z.object({ password: z.string().min(8, 'Use at least 8 characters').max(72), confirm: z.string() }).refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'Passwords do not match' })

function Err({ m }: { m?: string }) { return m ? <p role="alert" className="mt-1 text-xs text-rose-600">{m}</p> : null }

export default function SettingsPage() {
  useDocumentTitle('Profile & settings')
  const { user, updatePassword } = useAuth()
  const profile = useProfile(); const update = useUpdateProfile(); const avatar = useUploadAvatar()
  const trash = useTrash()
  const delNote = useSetDeleted('notes'); const delRes = useSetDeleted('resources'); const delSpace = useSetDeleted('academic_spaces')
  const toast = useToast(); const fileRef = useRef<HTMLInputElement>(null)
  const [pwBusy, setPwBusy] = useState(false)
  const pf = useForm({ resolver: zodResolver(profileSchema), defaultValues: { display_name: '', username: '', bio: '' } })
  const pw = useForm({ resolver: zodResolver(pwSchema) })
  useEffect(() => { if (profile.data) pf.reset({ display_name: profile.data.display_name, username: profile.data.username, bio: profile.data.bio }) }, [profile.data]) // eslint-disable-line react-hooks/exhaustive-deps
  const img = avatarUrl(profile.data?.avatar_path)
  const provider = (user?.app_metadata?.provider as string | undefined) ?? 'email'

  const saveProfile = pf.handleSubmit(async (v) => { try { await update.mutateAsync(v); toast.success('Profile saved') } catch (e) { toast.error(friendlyMessage(e as Error)) } })
  const savePw = pw.handleSubmit(async (v) => { setPwBusy(true); try { await updatePassword(v.password); toast.success('Password changed'); pw.reset() } catch (e) { toast.error(friendlyMessage(e as Error)) } finally { setPwBusy(false) } })
  const restore = (kind: 'note' | 'resource' | 'space', id: string) => {
    const m = kind === 'note' ? delNote : kind === 'resource' ? delRes : delSpace
    m.mutate({ id, deleted: false }, { onSuccess: () => toast.success('Restored'), onError: (e) => toast.error(friendlyMessage(e as Error)) })
  }
  const trashed = [...(trash.data?.spaces.map((x) => ({ ...x, kind: 'space' as const })) ?? []), ...(trash.data?.notes.map((x) => ({ ...x, kind: 'note' as const })) ?? []), ...(trash.data?.resources.map((x) => ({ ...x, kind: 'resource' as const })) ?? [])]

  return (
    <>
      <PageHeader title="Profile & settings" description="Manage how you appear to others and how you sign in." />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section aria-labelledby="prof-h" className="card p-5 sm:p-6 lg:col-span-2">
          <h2 id="prof-h" className="text-lg">Profile</h2>
          <div className="mt-4 flex items-center gap-4">
            {img ? <img src={img} alt="Your avatar" className="h-16 w-16 rounded-full object-cover" /> : <span aria-hidden="true" className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-accent-500 text-2xl font-bold text-white">{(profile.data?.display_name || '?').slice(0, 1).toUpperCase()}</span>}
            <div>
              <button type="button" className="btn-secondary" disabled={avatar.isPending} onClick={() => fileRef.current?.click()}><Camera className="h-4 w-4" aria-hidden="true" />{avatar.isPending ? 'Uploading…' : 'Change photo'}</button>
              <input ref={fileRef} type="file" hidden accept=".png,.jpg,.jpeg,.webp,.gif" aria-label="Choose profile photo" onChange={(e) => { const f = e.target.files?.[0]; if (f) avatar.mutate(f, { onSuccess: () => toast.success('Photo updated'), onError: (er) => toast.error(friendlyMessage(er as Error)) }); e.target.value = '' }} />
              <p className="mt-1 text-xs text-slate-500">PNG, JPEG, WebP or GIF up to 2 MB. Profile photos are public.</p>
            </div>
          </div>
          <form onSubmit={(e) => void saveProfile(e)} className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2" noValidate>
            <div><label htmlFor="p-name" className="label">Display name</label><input id="p-name" className="input" {...pf.register('display_name')} /><Err m={pf.formState.errors.display_name?.message} /></div>
            <div><label htmlFor="p-user" className="label">Username</label><input id="p-user" className="input" {...pf.register('username')} /><Err m={pf.formState.errors.username?.message} /><p className="mt-1 text-xs text-slate-500">Others use this to invite you to spaces.</p></div>
            <div className="sm:col-span-2"><label htmlFor="p-bio" className="label">Bio</label><textarea id="p-bio" rows={3} className="input" {...pf.register('bio')} /><Err m={pf.formState.errors.bio?.message} /></div>
            <div className="sm:col-span-2"><button className="btn-primary" disabled={update.isPending}>{update.isPending ? 'Saving…' : 'Save profile'}</button></div>
          </form>
        </section>

        <section aria-labelledby="acct-h" className="card p-5 sm:p-6">
          <h2 id="acct-h" className="text-lg">Account</h2>
          <p className="mt-3 text-sm"><span className="text-slate-500">Email:</span> <strong>{user?.email}</strong></p>
          <p className="mt-1 text-sm"><span className="text-slate-500">Sign-in method:</span> <strong className="capitalize">{provider}</strong></p>
          {provider === 'email' ? (
            <form onSubmit={(e) => void savePw(e)} className="mt-5 space-y-3" noValidate>
              <h3 className="text-sm">Change password</h3>
              <div><label htmlFor="pw1" className="label">New password</label><input id="pw1" type="password" autoComplete="new-password" className="input" {...pw.register('password')} /><Err m={pw.formState.errors.password?.message as string} /></div>
              <div><label htmlFor="pw2" className="label">Confirm</label><input id="pw2" type="password" autoComplete="new-password" className="input" {...pw.register('confirm')} /><Err m={pw.formState.errors.confirm?.message as string} /></div>
              <button className="btn-secondary" disabled={pwBusy}>{pwBusy ? 'Updating…' : 'Update password'}</button>
            </form>
          ) : <p className="mt-4 text-sm text-slate-500">Your password is managed by {provider}.</p>}
        </section>

        <section aria-labelledby="look-h" className="card p-5 sm:p-6">
          <h2 id="look-h" className="text-lg">Appearance</h2>
          <p className="mt-2 text-sm text-slate-500">Light or dark theme — remembered on this device.</p>
          <div className="mt-3"><ThemeToggle /></div>
        </section>

        <section aria-labelledby="trash-h" className="card p-5 sm:p-6 lg:col-span-2">
          <h2 id="trash-h" className="flex items-center gap-2 text-lg"><Trash2 className="h-4 w-4" aria-hidden="true" />Trash</h2>
          <p className="mt-1 text-sm text-slate-500">Deleted items stay here until restored. Restoring a space brings back everything deleted with it.</p>
          {trash.isLoading ? <div className="skeleton mt-4 h-16" /> : trashed.length ? (
            <ul className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
              {trashed.map((t) => (
                <li key={`${t.kind}-${t.id}`} className="flex items-center gap-3 py-2.5">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold capitalize dark:bg-slate-800">{t.kind}</span>
                  <span className="min-w-0 flex-1 truncate text-sm">{t.title}</span>
                  <span className="hidden text-xs text-slate-400 sm:block">deleted {formatDate(t.deleted_at.slice(0, 10))}</span>
                  <button type="button" className="btn-secondary px-3 py-1.5 text-xs" onClick={() => restore(t.kind, t.id)}><RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />Restore</button>
                </li>
              ))}
            </ul>
          ) : <p className="mt-4 text-sm text-slate-500">The trash is empty.</p>}
        </section>
      </div>
    </>
  )
}
