import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { MailCheck } from 'lucide-react'
import { useAuth } from './AuthProvider'
import AuthLayout, { FormError, GoogleButton } from './AuthLayout'
import { env, siteUrl } from '../lib/env'
import { friendlyMessage } from '../lib/errors'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/ui/Toast'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { PageSkeleton } from '../components/ui/Skeleton'

const email = z.string().trim().toLowerCase().email('Enter a valid email address')
const password = z.string().min(8, 'Use at least 8 characters').max(72, 'Use at most 72 characters')

function Err({ m }: { m?: string }) { return m ? <p role="alert" className="mt-1 text-xs text-rose-600 dark:text-rose-400">{m}</p> : null }

// ───────────────────────── Login ─────────────────────────
export function LoginPage() {
  useDocumentTitle('Sign in')
  const { user, loading, signIn, signInWithGoogle } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from || '/dashboard'
  const toast = useToast()
  const [error, setError] = useState<string | null>(null)
  const [needsConfirm, setNeedsConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const { register, handleSubmit, getValues, formState: { errors } } = useForm({ resolver: zodResolver(z.object({ email, password: z.string().min(1, 'Enter your password') })) })

  if (loading) return <PageSkeleton />
  if (user) return <Navigate to={from} replace />

  const onSubmit = handleSubmit(async (v) => {
    setBusy(true); setError(null); setNeedsConfirm(false)
    try { await signIn(v.email, v.password); navigate(from, { replace: true }) }
    catch (e) { const m = friendlyMessage(e as Error); setError(m); setNeedsConfirm(/confirm your email/i.test(m)) }
    finally { setBusy(false) }
  })

  const resend = async () => {
    const { error: err } = await supabase.auth.resend({ type: 'signup', email: getValues('email'), options: { emailRedirectTo: `${siteUrl()}?flow=confirmed` } })
    if (err) toast.error(friendlyMessage(err)); else toast.success('Confirmation email sent')
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to your notes, files and study plan." footer={<>New to NoteNest? <Link to="/register" className="font-semibold text-brand-600 hover:underline dark:text-brand-300">Create an account</Link></>}>
      <form onSubmit={(e) => void onSubmit(e)} className="space-y-4" noValidate>
        <FormError message={error} />
        {needsConfirm && <button type="button" onClick={() => void resend()} className="text-sm font-semibold text-brand-600 hover:underline">Resend confirmation email</button>}
        <div><label htmlFor="email" className="label">Email</label><input id="email" type="email" autoComplete="email" className="input" aria-invalid={!!errors.email} {...register('email')} /><Err m={errors.email?.message as string} /></div>
        <div>
          <div className="flex items-center justify-between"><label htmlFor="password" className="label">Password</label><Link to="/forgot-password" className="mb-1.5 text-xs font-semibold text-brand-600 hover:underline dark:text-brand-300">Forgot password?</Link></div>
          <input id="password" type="password" autoComplete="current-password" className="input" aria-invalid={!!errors.password} {...register('password')} /><Err m={errors.password?.message as string} />
        </div>
        <button type="submit" className="btn-primary w-full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
      {env.googleAuth && (
        <>
          <div className="my-4 flex items-center gap-3 text-xs text-slate-400"><span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />or<span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" /></div>
          <GoogleButton busy={busy} onClick={() => { setBusy(true); signInWithGoogle(from).catch((e) => { setError(friendlyMessage(e as Error)); setBusy(false) }) }} />
        </>
      )}
    </AuthLayout>
  )
}

// ───────────────────────── Register ─────────────────────────
const registerSchema = z.object({
  displayName: z.string().trim().min(1, 'Tell us what to call you').max(80),
  email, password, confirm: z.string(),
}).refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'Passwords do not match' })

export function RegisterPage() {
  useDocumentTitle('Create account')
  const { user, loading, signUp, signInWithGoogle } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(registerSchema) })

  if (loading) return <PageSkeleton />
  if (user) return <Navigate to="/dashboard" replace />

  if (sentTo) {
    const resend = async () => {
      const { error: err } = await supabase.auth.resend({ type: 'signup', email: sentTo, options: { emailRedirectTo: `${siteUrl()}?flow=confirmed` } })
      if (err) toast.error(friendlyMessage(err)); else toast.success('Confirmation email sent again')
    }
    return (
      <AuthLayout title="Check your inbox">
        <div className="flex flex-col items-center text-center" role="status">
          <span className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 text-brand-600 dark:bg-brand-500/15"><MailCheck className="h-7 w-7" aria-hidden="true" /></span>
          <p className="text-sm">We sent a confirmation link to <strong>{sentTo}</strong>. Open it to activate your account, then sign in.</p>
          <button type="button" onClick={() => void resend()} className="btn-secondary mt-5">Resend email</button>
          <Link to="/login" className="mt-3 text-sm font-semibold text-brand-600 hover:underline">Back to sign in</Link>
        </div>
      </AuthLayout>
    )
  }

  const onSubmit = handleSubmit(async (v) => {
    setBusy(true); setError(null)
    try {
      const { needsConfirmation } = await signUp(v.email, v.password, v.displayName)
      if (needsConfirmation) setSentTo(v.email); else navigate('/dashboard', { replace: true })
    } catch (e) { setError(friendlyMessage(e as Error)) } finally { setBusy(false) }
  })

  return (
    <AuthLayout title="Create your account" subtitle="Organise notes by semester, upload files and connect ideas." footer={<>Already have an account? <Link to="/login" className="font-semibold text-brand-600 hover:underline dark:text-brand-300">Sign in</Link></>}>
      <form onSubmit={(e) => void onSubmit(e)} className="space-y-4" noValidate>
        <FormError message={error} />
        <div><label htmlFor="name" className="label">Your name</label><input id="name" autoComplete="name" className="input" {...register('displayName')} /><Err m={errors.displayName?.message as string} /></div>
        <div><label htmlFor="email" className="label">Email</label><input id="email" type="email" autoComplete="email" className="input" {...register('email')} /><Err m={errors.email?.message as string} /></div>
        <div><label htmlFor="password" className="label">Password</label><input id="password" type="password" autoComplete="new-password" className="input" {...register('password')} /><Err m={errors.password?.message as string} /></div>
        <div><label htmlFor="confirm" className="label">Confirm password</label><input id="confirm" type="password" autoComplete="new-password" className="input" {...register('confirm')} /><Err m={errors.confirm?.message as string} /></div>
        <button type="submit" className="btn-primary w-full" disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</button>
      </form>
      {env.googleAuth && (
        <>
          <div className="my-4 flex items-center gap-3 text-xs text-slate-400"><span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />or<span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" /></div>
          <GoogleButton busy={busy} onClick={() => { setBusy(true); signInWithGoogle('/dashboard').catch((e) => { setError(friendlyMessage(e as Error)); setBusy(false) }) }} />
        </>
      )}
    </AuthLayout>
  )
}

// ───────────────────────── Forgot password ─────────────────────────
export function ForgotPasswordPage() {
  useDocumentTitle('Reset password')
  const { requestPasswordReset } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(z.object({ email })) })
  const onSubmit = handleSubmit(async (v) => {
    setBusy(true); setError(null)
    try { await requestPasswordReset(v.email); setDone(v.email) } catch (e) { setError(friendlyMessage(e as Error)) } finally { setBusy(false) }
  })
  return (
    <AuthLayout title="Reset your password" subtitle="We’ll email you a link to choose a new one." footer={<Link to="/login" className="font-semibold text-brand-600 hover:underline dark:text-brand-300">Back to sign in</Link>}>
      {done ? (
        <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100">If an account exists for <strong>{done}</strong>, a reset link is on its way. Check your inbox (and spam).</p>
      ) : (
        <form onSubmit={(e) => void onSubmit(e)} className="space-y-4" noValidate>
          <FormError message={error} />
          <div><label htmlFor="email" className="label">Email</label><input id="email" type="email" autoComplete="email" className="input" {...register('email')} /><Err m={errors.email?.message as string} /></div>
          <button type="submit" className="btn-primary w-full" disabled={busy}>{busy ? 'Sending…' : 'Send reset link'}</button>
        </form>
      )}
    </AuthLayout>
  )
}

// ───────────────────────── Set a new password (after the email link) ─────────────────────────
export function ResetPasswordPage() {
  useDocumentTitle('Choose a new password')
  const { user, loading, updatePassword } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const schema = z.object({ password, confirm: z.string() }).refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'Passwords do not match' })
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema) })

  if (loading) return <PageSkeleton />
  if (!user) {
    return (
      <AuthLayout title="Link expired or invalid">
        <p className="text-sm">This password reset link can’t be used any more. Request a new one to continue.</p>
        <Link to="/forgot-password" className="btn-primary mt-5 w-full">Request a new link</Link>
      </AuthLayout>
    )
  }
  const onSubmit = handleSubmit(async (v) => {
    setBusy(true); setError(null)
    try { await updatePassword(v.password); toast.success('Password updated'); navigate('/dashboard', { replace: true }) }
    catch (e) { setError(friendlyMessage(e as Error)) } finally { setBusy(false) }
  })
  return (
    <AuthLayout title="Choose a new password" subtitle={`Signed in as ${user.email}`}>
      <form onSubmit={(e) => void onSubmit(e)} className="space-y-4" noValidate>
        <FormError message={error} />
        <div><label htmlFor="password" className="label">New password</label><input id="password" type="password" autoComplete="new-password" className="input" {...register('password')} /><Err m={errors.password?.message as string} /></div>
        <div><label htmlFor="confirm" className="label">Confirm new password</label><input id="confirm" type="password" autoComplete="new-password" className="input" {...register('confirm')} /><Err m={errors.confirm?.message as string} /></div>
        <button type="submit" className="btn-primary w-full" disabled={busy}>{busy ? 'Saving…' : 'Update password'}</button>
      </form>
    </AuthLayout>
  )
}
