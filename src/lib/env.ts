/** Build-time configuration (Vite inlines VITE_* variables). Only PUBLIC values belong here. */
export const env = {
  supabaseUrl: (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, ''),
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined,
  googleAuth: import.meta.env.VITE_ENABLE_GOOGLE_AUTH === 'true',
}

export const isConfigured = Boolean(env.supabaseUrl && env.supabaseAnonKey)

/** Absolute URL of the app root (works for any hosting sub-path). Auth emails and OAuth return here. */
export const siteUrl = () => `${window.location.origin}${window.location.pathname}`

/** Hash-router deep link, e.g. appLink('/notes/123') */
export const appLink = (path: string) => `${siteUrl()}#${path}`

// Capture the "flow" hint from the auth redirect before supabase-js strips ?code= from the URL.
const initialParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams()
export const initialAuthFlow = initialParams.get('flow')
