import { Database } from 'lucide-react'

export default function SetupRequired() {
  return (
    <div className="mx-auto flex min-h-screen max-w-xl items-center p-6">
      <div className="card p-8" role="alert">
        <Database className="mb-4 h-10 w-10 text-brand-600" aria-hidden="true" />
        <h1 className="text-2xl">Backend not configured</h1>
        <p className="mt-2 text-sm">NoteNest needs a Supabase project. Set these build-time variables and rebuild:</p>
        <pre className="mt-4 overflow-x-auto rounded-xl bg-slate-100 p-4 text-xs dark:bg-slate-800">{`VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon / publishable key>
VITE_ENABLE_GOOGLE_AUTH=false`}</pre>
        <p className="mt-4 text-xs text-slate-500">Only the public anon key belongs in the frontend. See docs/SETUP.md. Never use the service-role key here.</p>
      </div>
    </div>
  )
}
