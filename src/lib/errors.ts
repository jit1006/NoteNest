import type { PostgrestError, AuthError } from '@supabase/supabase-js'

export class ApiError extends Error {
  code?: string
  status?: number
  constructor(message: string, code?: string, status?: number) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
  }
}

type AnyError = PostgrestError | AuthError | Error | { message: string; code?: string; status?: number } | null | undefined

const FRIENDLY: [RegExp, string][] = [
  [/rate_limit_exceeded/i, 'You are creating items too quickly. Please wait a little and try again.'],
  [/storage_quota_exceeded/i, 'Your storage quota is full. Delete some files to upload more.'],
  [/row-level security|violates row-level|42501|permission denied/i, "You don't have permission to do that."],
  [/duplicate key|already exists|23505/i, 'That already exists.'],
  [/user_not_found/i, 'No user with that username exists.'],
  [/Invalid login credentials/i, 'Incorrect email or password.'],
  [/Email not confirmed/i, 'Please confirm your email address first — check your inbox for the confirmation link.'],
  [/User already registered/i, 'An account with this email already exists. Try signing in.'],
  [/Password should be at least/i, 'Password must be at least 8 characters.'],
  [/Failed to fetch|NetworkError|network/i, 'Network problem — check your connection and try again.'],
  [/mime type .* is not supported|invalid_mime_type/i, 'That file type is not allowed.'],
  [/exceeded the maximum allowed size|Payload too large/i, 'That file is too large (50 MB maximum).'],
]

export function friendlyMessage(err: AnyError): string {
  if (!err) return 'Something went wrong.'
  const raw = (err as { message?: string }).message ?? String(err)
  const hit = FRIENDLY.find(([re]) => re.test(raw) || re.test((err as { code?: string }).code ?? ''))
  return hit ? hit[1] : raw
}

export function toApiError(err: AnyError): ApiError {
  const e = err as { message?: string; code?: string; status?: number }
  return new ApiError(friendlyMessage(err), e?.code, e?.status)
}

/** Throw a friendly ApiError for a failed Supabase response; otherwise return the data. */
export function unwrap<T>(res: { data: T | null; error: AnyError }): T {
  if (res.error) throw toApiError(res.error)
  return res.data as T
}

export const isNotFound = (e: unknown) =>
  e instanceof ApiError && (e.code === 'PGRST116' || e.status === 404 || e.code === 'P0002' || e.code === 'PT404')
