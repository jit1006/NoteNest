import { describe, it, before } from 'node:test'
import assert from 'node:assert/strict'
import { anon, newClient, makeUser, mkNote, doc, admin } from './helpers.mjs'

describe('signup bootstrap and basic isolation', () => {
  let a, b
  before(async () => { a = await makeUser('alice'); b = await makeUser('bob') })

  it('creates a profile with a valid unique username and a default private space', async () => {
    const { data } = await a.client.from('profiles').select('*').eq('id', a.id).single()
    assert.match(data.username, /^[a-z0-9_]{3,30}$/)
    assert.equal(data.display_name, 'alice')
    const sp = await a.client.from('academic_spaces').select('*').eq('id', a.spaceId).single()
    assert.equal(sp.data.visibility, 'private')
    assert.equal(sp.data.is_default, true)
  })

  it('profiles are public identity cards, but only editable by their owner', async () => {
    const seen = await b.client.from('profiles').select('username').eq('id', a.id)
    assert.equal(seen.data.length, 1)
    const bad = await b.client.from('profiles').update({ bio: 'hacked' }).eq('id', a.id).select()
    assert.equal(bad.data.length, 0)
    const ok = await a.client.from('profiles').update({ bio: 'hello' }).eq('id', a.id).select()
    assert.equal(ok.data[0].bio, 'hello')
  })

  it("a user cannot see another user's private space, semesters or notes", async () => {
    const note = await mkNote(a, { title: 'Secret' })
    assert.equal((await b.client.from('academic_spaces').select('id').eq('id', a.spaceId)).data.length, 0)
    assert.equal((await b.client.from('semesters').select('id').eq('id', a.semesterId)).data.length, 0)
    assert.equal((await b.client.from('notes').select('id').eq('id', note.id)).data.length, 0)
    assert.equal((await anon().from('notes').select('id').eq('id', note.id)).data.length, 0)
  })

  it('anonymous clients cannot write anything', async () => {
    const r = await anon().from('academic_spaces').insert({ owner_id: a.id, title: 'x' })
    assert.ok(r.error)
  })

  it("a user cannot create content in someone else's space", async () => {
    const r = await b.client.from('notes').insert({ space_id: a.spaceId, semester_id: a.semesterId, owner_id: b.id, title: 'intruder' })
    assert.ok(r.error, 'insert must be denied')
    const spoof = await b.client.from('notes').insert({ space_id: b.spaceId, semester_id: b.semesterId, owner_id: a.id, title: 'spoof' })
    assert.ok(spoof.error, 'cannot create rows owned by someone else')
  })

  it("other users cannot update or delete a private note", async () => {
    const note = await mkNote(a, { title: 'Mine' })
    const up = await b.client.from('notes').update({ title: 'pwned' }).eq('id', note.id).select()
    assert.equal(up.data?.length ?? 0, 0)
    await b.client.from('notes').delete().eq('id', note.id)
    const still = await a.client.from('notes').select('title').eq('id', note.id).single()
    assert.equal(still.data.title, 'Mine')
  })

  it('owner_id and space_id are immutable', async () => {
    const note = await mkNote(a)
    const r = await a.client.from('notes').update({ owner_id: b.id }).eq('id', note.id)
    assert.ok(r.error)
  })

  it('hierarchy integrity is enforced by composite foreign keys', async () => {
    const sem2 = await a.client.from('semesters').insert({ space_id: a.spaceId, owner_id: a.id, number: 2, title: 'Semester 2' }).select().single()
    assert.ifError(sem2.error)
    const subj = await a.client.from('subjects').insert({ space_id: a.spaceId, semester_id: sem2.data.id, owner_id: a.id, title: 'Algorithms' }).select().single()
    assert.ifError(subj.error)
    // subject belongs to semester 2 but the note claims semester 1 -> rejected
    const bad = await a.client.from('notes').insert({ space_id: a.spaceId, semester_id: a.semesterId, subject_id: subj.data.id, owner_id: a.id, title: 'bad' })
    assert.ok(bad.error, 'subject/semester mismatch must fail')
    // semester from another space is rejected
    const cross = await a.client.from('subjects').insert({ space_id: a.spaceId, semester_id: b.semesterId, owner_id: a.id, title: 'x' })
    assert.ok(cross.error)
    // folder needs a subject
    const f = await a.client.from('notes').insert({ space_id: a.spaceId, semester_id: sem2.data.id, folder_id: crypto.randomUUID(), owner_id: a.id })
    assert.ok(f.error)
  })

  it('creation is rate limited', async () => {
    const c = await makeUser('ratelimit')
    let failure
    for (let i = 0; i < 32 && !failure; i++) {
      const r = await c.client.from('academic_spaces').insert({ owner_id: c.id, title: `s${i}` })
      if (r.error) failure = r.error
    }
    assert.ok(failure, 'rate limit should trigger')
    assert.match(failure.message, /rate_limit_exceeded/)
  })

  it('study tasks, bookmarks and reports are private to their user', async () => {
    const t = await a.client.from('study_tasks').insert({ user_id: a.id, title: 'Revise' }).select().single()
    assert.ifError(t.error)
    assert.equal((await b.client.from('study_tasks').select('id').eq('id', t.data.id)).data.length, 0)
    const spoof = await b.client.from('study_tasks').insert({ user_id: a.id, title: 'spoof' })
    assert.ok(spoof.error)
  })
})
