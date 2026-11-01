// Shared helpers for integration tests against the LOCAL Supabase stack (`supabase start`).
// Env: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY (see .github/workflows/ci.yml).
import { createClient } from '@supabase/supabase-js'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'

export const API_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321'
export const ANON_KEY = process.env.SUPABASE_ANON_KEY
export const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
export const MAIL_URL = process.env.MAILPIT_URL || 'http://127.0.0.1:54324'
assert.ok(ANON_KEY && SERVICE_KEY, 'SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY must be set')

const opts = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
export const admin = createClient(API_URL, SERVICE_KEY, opts)
export const newClient = () => createClient(API_URL, ANON_KEY, opts)
export const PASSWORD = 'Test-pass-123!'

/** Create a confirmed user via the admin API and return a signed-in client. */
export async function makeUser(label) {
  const email = `${label}-${randomUUID().slice(0, 8)}@example.test`
  const { data, error } = await admin.auth.admin.createUser({
    email, password: PASSWORD, email_confirm: true, user_metadata: { display_name: label },
  })
  assert.ifError(error)
  const client = newClient()
  const signIn = await client.auth.signInWithPassword({ email, password: PASSWORD })
  assert.ifError(signIn.error)
  const user = { id: data.user.id, email, label, client }
  const ctx = await defaultContext(user)
  return { ...user, ...ctx }
}

/** The default private space + "Semester 1" created by the signup trigger. */
export async function defaultContext(u) {
  const sp = await u.client.from('academic_spaces').select('id').eq('owner_id', u.id).eq('is_default', true).single()
  assert.ifError(sp.error)
  const sem = await u.client.from('semesters').select('id').eq('space_id', sp.data.id).single()
  assert.ifError(sem.error)
  return { spaceId: sp.data.id, semesterId: sem.data.id }
}

export const doc = (...paras) => ({
  type: 'doc',
  content: paras.map((t) => ({ type: 'paragraph', attrs: { blockId: randomUUID() }, content: [{ type: 'text', text: t }] })),
})

export async function mkNote(u, over = {}) {
  const row = { space_id: u.spaceId, semester_id: u.semesterId, owner_id: u.id, title: 'Test note', ...over }
  const { data, error } = await u.client.from('notes').insert(row).select().single()
  assert.ifError(error)
  return data
}

export async function mkResource(u, over = {}) {
  const row = { space_id: u.spaceId, semester_id: u.semesterId, owner_id: u.id, title: 'Test resource', kind: 'pdf', ...over }
  const { data, error } = await u.client.from('resources').insert(row).select().single()
  assert.ifError(error)
  return data
}

export const PDF_BYTES = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n')

export async function uploadPdf(u, path = `${u.id}/${randomUUID()}.pdf`, bytes = PDF_BYTES, contentType = 'application/pdf') {
  const r = await u.client.storage.from('files').upload(path, bytes, { contentType })
  return { path, ...r }
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** Poll Mailpit for the newest message to an address (local Supabase mail catcher). */
export async function waitForMail(to, subjectPart, timeoutMs = 20000) {
  const end = Date.now() + timeoutMs
  while (Date.now() < end) {
    const res = await fetch(`${MAIL_URL}/api/v1/search?query=${encodeURIComponent(`to:${to}`)}`)
    if (res.ok) {
      const { messages = [] } = await res.json()
      const hit = messages.find((m) => !subjectPart || (m.Subject || '').toLowerCase().includes(subjectPart.toLowerCase()))
      if (hit) {
        const full = await (await fetch(`${MAIL_URL}/api/v1/message/${hit.ID}`)).json()
        return { subject: hit.Subject, html: full.HTML || '', text: full.Text || '' }
      }
    }
    await sleep(400)
  }
  throw new Error(`no mail for ${to} (${subjectPart || 'any'}) within ${timeoutMs}ms`)
}

export const firstLink = (mail) => {
  const m = (mail.html || mail.text).match(/https?:\/\/[^\s"'<>]*\/auth\/v1\/verify[^\s"'<>]*/)
  assert.ok(m, 'verification link not found in mail')
  return m[0].replace(/&amp;/g, '&')
}
