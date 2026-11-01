import { createClient } from '@supabase/supabase-js'
import { env } from './env'

/**
 * Browser client: anon key + the signed-in user's JWT. All authorization is enforced by
 * Postgres Row Level Security and Storage policies — never trust this client for security.
 * (The service-role key must never be used here.)
 */
export const supabase = createClient(env.supabaseUrl ?? 'http://localhost:54321', env.supabaseAnonKey ?? 'not-configured', {
  auth: {
    flowType: 'pkce',
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'notenest-auth',
  },
})
