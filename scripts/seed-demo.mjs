#!/usr/bin/env node
// Seeds the "NoteNest Demo Library" (migration of the V1 static catalog) into a Supabase project.
//
//   SUPABASE_URL=...  SUPABASE_SERVICE_ROLE_KEY=...  node scripts/seed-demo.mjs [--reset]
//
// Uses the SERVICE-ROLE key, so run it from a trusted machine / CI only — never ship it to the browser.
// Creates: a demo account (random password, not meant for login), one PUBLIC space with 6 semesters,
// the 8 V1 subjects, the 28 V1 PDFs (uploaded to Storage) and two linked sample notes.
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { randomUUID, randomBytes } from 'node:crypto'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) { console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'); process.exit(1) }
const reset = process.argv.includes('--reset')
const DEMO_EMAIL = process.env.DEMO_EMAIL || 'notenest-demo@example.com'
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const catalog = JSON.parse(readFileSync(join(root, 'supabase/seed/demo-catalog.json'), 'utf8'))
const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
const must = (r, what) => { if (r.error) { console.error(`✖ ${what}:`, r.error.message); process.exit(1) } return r.data }

const COLOR = { indigo: 'indigo', violet: 'violet', sky: 'sky', emerald: 'emerald', amber: 'amber', rose: 'rose', fuchsia: 'fuchsia', teal: 'teal' }
const CATEGORY = { notes: 'notes', pyq: 'pyq', reference: 'reference' }

async function findUser() {
  for (let page = 1; page < 20; page++) {
    const { data } = await sb.auth.admin.listUsers({ page, perPage: 200 })
    const hit = data?.users?.find((u) => u.email === DEMO_EMAIL)
    if (hit) return hit
    if (!data?.users?.length || data.users.length < 200) break
  }
  return null
}

async function wipe(user) {
  const list = await sb.storage.from('files').list(user.id, { limit: 1000 })
  if (list.data?.length) await sb.storage.from('files').remove(list.data.map((f) => `${user.id}/${f.name}`))
  must(await sb.auth.admin.deleteUser(user.id), 'delete demo user')
  console.log('• removed previous demo data')
}

let user = await findUser()
if (user && reset) { await wipe(user); user = null }
if (!user) {
  const created = must(await sb.auth.admin.createUser({
    email: DEMO_EMAIL, password: randomBytes(24).toString('base64url'), email_confirm: true,
    user_metadata: { display_name: 'NoteNest Demo' },
  }), 'create demo user')
  user = created.user
}
const uid = user.id
must(await sb.from('profiles').update({ username: 'notenest_demo', display_name: 'NoteNest Demo', bio: 'Sample library migrated from the original NoteNest catalog. Demo material only.' }).eq('id', uid), 'profile')

const existing = must(await sb.from('academic_spaces').select('id').eq('owner_id', uid).eq('title', 'NoteNest Demo Library'), 'lookup space')
if (existing.length) { console.log('Demo library already present. Use --reset to rebuild it.'); process.exit(0) }

const space = must(await sb.from('academic_spaces').insert({
  owner_id: uid, title: 'NoteNest Demo Library', icon: '🎓', visibility: 'public',
  description: 'Self-created demo notes, quick references and model practice papers for CS & MCA — migrated from the original NoteNest catalog. Practice papers are model papers, NOT official university papers.',
}).select().single(), 'space')

const semIds = {}
for (const n of [1, 2, 3, 4, 5, 6]) {
  semIds[n] = must(await sb.from('semesters').insert({ space_id: space.id, owner_id: uid, number: n, title: `Semester ${n}`, position: n }).select().single(), `semester ${n}`).id
}
const subjIds = {}
for (const s of catalog.subjects) {
  subjIds[s.id] = must(await sb.from('subjects').insert({
    space_id: space.id, semester_id: semIds[s.semester], owner_id: uid, title: s.name, code: s.shortName, color: COLOR[s.accent] ?? 'indigo',
    description: `${s.description}\n\nUnits: ${s.units.map((u) => `${u.title} (${u.chapters.join(', ')})`).join(' · ')}`.slice(0, 2000),
  }).select().single(), `subject ${s.id}`).id
}
console.log(`• space + ${Object.keys(semIds).length} semesters + ${Object.keys(subjIds).length} subjects`)

let count = 0
for (const r of catalog.resources) {
  const bytes = readFileSync(join(root, 'public/pdfs', r.pdf))
  const path = `${uid}/${randomUUID()}.pdf`
  must(await sb.storage.from('files').upload(path, bytes, { contentType: 'application/pdf' }), `upload ${r.pdf}`)
  const sub = catalog.subjects.find((s) => s.id === r.subjectId)
  const year = r.resourceType === 'pyq' ? Number(/\((\d{4})\)/.exec(r.title)?.[1]) || null : null
  const res = must(await sb.from('resources').insert({
    space_id: space.id, semester_id: semIds[sub.semester], subject_id: subjIds[r.subjectId], owner_id: uid,
    title: r.title, description: `${r.description} (${r.unit} · ${r.topic}). Tags: ${r.tags.join(', ')}. Demo material.`.slice(0, 4000),
    kind: 'pdf', category: CATEGORY[r.resourceType] ?? 'other', academic_year: year, visibility: 'public',
  }).select().single(), `resource ${r.id}`)
  must(await sb.from('resource_files').insert({
    resource_id: res.id, owner_id: uid, storage_path: path, original_filename: `${r.id}.pdf`, extension: 'pdf', mime_type: 'application/pdf', size_bytes: bytes.length,
  }), `file ${r.id}`)
  count++
}
console.log(`• ${count} PDFs uploaded and registered`)

// ── two rich sample notes, linked across semesters ──
const b = () => `s${randomUUID().replace(/-/g, '').slice(0, 10)}`
const p = (text, marks) => ({ type: 'paragraph', attrs: { blockId: b() }, content: [marks ? { type: 'text', text, marks } : { type: 'text', text }] })
const h = (level, text) => ({ type: 'heading', attrs: { level, blockId: b() }, content: [{ type: 'text', text }] })
const bullets = (...items) => ({ type: 'bulletList', attrs: { blockId: b() }, content: items.map((t) => ({ type: 'listItem', content: [{ type: 'paragraph', attrs: { blockId: b() }, content: [{ type: 'text', text: t }] }] })) })
const code = (language, text) => ({ type: 'codeBlock', attrs: { language, blockId: b() }, content: [{ type: 'text', text }] })

const dsaNote = must(await sb.from('notes').insert({
  space_id: space.id, semester_id: semIds[2], subject_id: subjIds.dsa, owner_id: uid, title: 'Hashing in five minutes', icon: '#️⃣', visibility: 'public',
  content: { type: 'doc', content: [
    h(1, 'Hashing in five minutes'),
    p('A hash table maps keys to array slots with a hash function, giving average O(1) lookups, inserts and deletes.'),
    h(2, 'Collisions'),
    bullets('Chaining: each slot holds a linked list of entries.', 'Open addressing: probe for the next free slot (linear, quadratic, double hashing).'),
    code('python', "def bucket(key, size):\n    return hash(key) % size   # index into the table"),
    p('Sample demo note — see the PDF resources in this subject for complete notes.', [{ type: 'italic' }]),
  ] },
}).select().single(), 'dsa note')

const dbmsNote = must(await sb.from('notes').insert({
  space_id: space.id, semester_id: semIds[3], subject_id: subjIds.dbms, owner_id: uid, title: 'Why indexes are fast', icon: '🗂️', visibility: 'public',
  content: { type: 'doc', content: [
    h(1, 'Why database indexes are fast'),
    p('Most database indexes are B-trees (or hash indexes) that let the engine find rows without scanning the whole table.'),
    h(2, 'Rule of thumb'),
    bullets('Index columns used in WHERE, JOIN and ORDER BY.', 'Every index slows writes down a little — do not index everything.'),
    code('sql', 'CREATE INDEX idx_student_email ON Student(email);'),
    p('This note builds on hashing from Semester 2: hash indexes use exactly the idea of a hash table.'),
  ] },
}).select().single(), 'dbms note')

must(await sb.from('note_references').insert([
  { source_note_id: dbmsNote.id, target_note_id: dsaNote.id, relation_type: 'prerequisite', description: 'Hash indexes are hash tables stored on disk.', created_by: uid },
]), 'reference')
console.log('• 2 sample notes with a cross-semester prerequisite link')
console.log('✔ demo library ready')
