import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { initialAuthFlow, isConfigured, siteUrl } from '../lib/env'
import { toApiError } from '../lib/errors'
import { queryClient } from '../lib/queryClient'

interface AuthState {
  session: Session | null
  user: User | null
  /** true until the first session lookup (restoration from storage / code exchange) completes */
  loading: boolean
  signUp: (email: string, password: string, displayName: string) => Promise<{ needsConfirmation: boolean }>
  signIn: (email: string, password: string) => Promise<void>
  signInWithGoogle: (next?: string) => Promise<void>
  signOut: () => Promise<void>
  requestPasswordReset: (email: string) => Promise<void>
  updatePassword: (password: string) => Promise<void>
}

const Ctx = createContext<AuthState | null>(null)
const NEXT_KEY = 'notenest:next'

export const rememberNext = (path: string) => { try { sessionStorage.setItem(NEXT_KEY, path) } catch { /* ignore */ } }
const takeNext = () => {
  try { const v = sessionStorage.getItem(NEXT_KEY); sessionStorage.removeItem(NEXT_KEY); return v } catch { return null }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(isConfigured)
  const navigate = useNavigate()

  useEffect(() => {
    if (!isConfigured) return
    let active = true

    // Restores the session from storage, or completes the PKCE code exchange when returning from an email link / OAuth.
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      setLoading(false)
      if (data.session) {
        if (initialAuthFlow === 'recovery') navigate('/reset-password', { replace: true })
        else if (initialAuthFlow === 'confirmed' || initialAuthFlow === 'oauth') navigate(takeNext() || '/dashboard', { replace: true })
        if (initialAuthFlow) {
          const url = new URL(window.location.href)
          url.searchParams.delete('flow')
          window.history.replaceState({}, '', url.toString())
        }
      }
    })

    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next)
      setLoading(false)
      if (event === 'PASSWORD_RECOVERY') navigate('/reset-password', { replace: true })
      if (event === 'SIGNED_OUT') queryClient.clear()
    })
    return () => { active = false; sub.subscription.unsubscribe() }
  }, [navigate])

  const signUp = useCallback<AuthState['signUp']>(async (email, password, displayName) => {
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { display_name: displayName }, emailRedirectTo: `${siteUrl()}?flow=confirmed` },
    })
    if (error) throw toApiError(error)
    return { needsConfirmation: !data.session }
  }, [])

  const signIn = useCallback<AuthState['signIn']>(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw toApiError(error)
  }, [])

  const signInWithGoogle = useCallback<AuthState['signInWithGoogle']>(async (next) => {
    if (next) rememberNext(next)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${siteUrl()}?flow=oauth` },
    })
    if (error) throw toApiError(error)
  }, [])

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw toApiError(error)
    queryClient.clear()
  }, [])

  const requestPasswordReset = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${siteUrl()}?flow=recovery` })
    if (error) throw toApiError(error)
  }, [])

  const updatePassword = useCallback(async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password })
    if (error) throw toApiError(error)
  }, [])

  const value = useMemo<AuthState>(
    () => ({ session, user: session?.user ?? null, loading, signUp, signIn, signInWithGoogle, signOut, requestPasswordReset, updatePassword }),
    [session, loading, signUp, signIn, signInWithGoogle, signOut, requestPasswordReset, updatePassword],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth(): AuthState {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAuth must be used inside <AuthProvider>')
  return v
}
