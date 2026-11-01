// Edge Function: mint a short-lived signed URL for a file that belongs to UNLISTED content.
// Storage RLS cannot see the secret share token, so this trusted function validates it first:
//   1. the caller must be signed in (their JWT is forwarded),
//   2. get_shared_note / get_shared_resource (SECURITY DEFINER) must accept {id, token},
//   3. the requested file must belong to that exact note/resource.
// Only then is the service role used — server-side, never in the browser — to sign the object.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const auth = req.headers.get('Authorization')
  if (!auth) return json({ error: 'auth_required' }, 401)

  const url = Deno.env.get('SUPABASE_URL')!
  const user = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } })
  const { data: who } = await user.auth.getUser()
  if (!who?.user) return json({ error: 'auth_required' }, 401)

  let body: { kind?: string; id?: string; token?: string; resourceId?: string; fileId?: string }
  try { body = await req.json() } catch { return json({ error: 'bad_request' }, 400) }
  const { kind, id, token, resourceId, fileId } = body
  if (!id || !token || !UUID.test(id) || !UUID.test(token) || (kind !== 'note' && kind !== 'resource')) return json({ error: 'bad_request' }, 400)

  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
  let targetResource: string
  if (kind === 'resource') {
    const { data, error } = await user.rpc('get_shared_resource', { p_id: id, p_token: token })
    if (error || !data) return json({ error: 'not_found' }, 404)
    targetResource = id
  } else {
    const { data, error } = await user.rpc('get_shared_note', { p_id: id, p_token: token })
    if (error || !data) return json({ error: 'not_found' }, 404)
    if (!resourceId || !UUID.test(resourceId)) return json({ error: 'bad_request' }, 400)
    const { data: att } = await admin.from('resources').select('id').eq('id', resourceId).eq('attached_note_id', id).maybeSingle()
    if (!att) return json({ error: 'not_found' }, 404)
    targetResource = resourceId
  }

  let q = admin.from('resource_files').select('storage_path, original_filename, mime_type').eq('resource_id', targetResource).order('created_at').limit(1)
  if (fileId && UUID.test(fileId)) q = q.eq('id', fileId)
  const { data: file } = await q.maybeSingle()
  if (!file) return json({ error: 'not_found' }, 404)

  const { data: signed, error: signErr } = await admin.storage.from('files').createSignedUrl(file.storage_path, 120)
  if (signErr || !signed) return json({ error: 'sign_failed' }, 500)
  return json({ url: signed.signedUrl, filename: file.original_filename, mime: file.mime_type })
})
