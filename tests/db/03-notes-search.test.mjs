import { describe, it, before } from 'node:test'
import assert from 'node:assert/strict'
import { anon, makeUser, mkNote, doc, sleep } from './helpers.mjs'

describe('note content, versions and full-text search', () => {
  let a, b
  before(async () => { a = await makeUser('writer'); b = await makeUser('searcher') })

  it('derives searchable text from the JSON in the database, not from the client', async () => {
    const n = await mkNote(a, { content: doc('Alpha beta', 'gamma delta'), content_text: 'FORGED' })
    const { data } = await a.client.from('notes').select('content_text').eq('id', n.id).single()
    assert.match(data.content_text, /Alpha beta/)
    assert.match(data.content_text, /gamma delta/)
    assert.doesNotMatch(data.content_text, /FORGED/)
  })

  it('bumps version on change, supports optimistic concurrency and snapshots history', async () => {
    const n = await mkNote(a, { title: 'v1', content: doc('first') })
    assert.equal(n.version, 1)
    const u1 = await a.client.from('notes').update({ content: doc('second') }).eq('id', n.id).eq('version', 1).select().single()
    assert.equal(u1.data.version, 2)
    const stale = await a.client.from('notes').update({ content: doc('stale write') }).eq('id', n.id).eq('version', 1).select()
    assert.equal(stale.data.length, 0, 'stale version must not overwrite')
    const vs = await a.client.from('note_versions').select('version,content').eq('note_id', n.id)
    assert.equal(vs.data.length, 1)
    assert.equal(vs.data[0].version, 1)
    // clients cannot forge version numbers
    const forged = await a.client.from('notes').update({ version: 99, title: 'forged' }).eq('id', n.id).select().single()
    assert.equal(forged.data.version, 3)
    // history is not readable by others
    assert.equal((await b.client.from('note_versions').select('id').eq('note_id', n.id)).data.length, 0)
  })

  it('search returns only content the requester may read and supports stemming', async () => {
    const tag = 'quokkaphrase' + Math.random().toString(36).slice(2, 6)
    await mkNote(a, { title: `Public ${tag}`, content: doc(`running ${tag} walking`), visibility: 'public' })
    await mkNote(a, { title: `Private ${tag}`, content: doc(`${tag} hidden`) })
    const mine = await a.client.rpc('search_library', { p_query: tag })
    assert.equal(mine.data.length, 2)
    const theirs = await b.client.rpc('search_library', { p_query: tag })
    assert.equal(theirs.data.length, 1)
    assert.match(theirs.data[0].title, /^Public/)
    const stem = await b.client.rpc('search_library', { p_query: `${tag} runs` })
    assert.equal(stem.data.length, 1)
    const an = await anon().rpc('search_library', { p_query: tag })
    assert.equal(an.data.length, 1)
    assert.ok(an.data[0].snippet.includes('⟦'), 'snippet highlights matches')
  })

  it('filters, scopes and pagination work together', async () => {
    const tag = 'pagetopic' + Math.random().toString(36).slice(2, 6)
    for (let i = 0; i < 5; i++) await mkNote(a, { title: `${tag} ${i}`, content: doc(tag), visibility: 'public' })
    const p1 = await b.client.rpc('search_library', { p_query: tag, p_scope: 'public', p_limit: 2, p_offset: 0 })
    assert.equal(p1.data.length, 2)
    assert.equal(Number(p1.data[0].total_count), 5)
    const p3 = await b.client.rpc('search_library', { p_query: tag, p_limit: 2, p_offset: 4 })
    assert.equal(p3.data.length, 1)
    const owner = await b.client.rpc('search_library', { p_query: tag, p_owner_id: a.id })
    assert.equal(owner.data.length, 5)
    const none = await b.client.rpc('search_library', { p_query: tag, p_owner_id: b.id })
    assert.equal(none.data.length, 0)
    const sem = await b.client.rpc('search_library', { p_query: tag, p_semester_number: 1 })
    assert.equal(sem.data.length, 5)
    const mine = await b.client.rpc('search_library', { p_query: tag, p_scope: 'mine' })
    assert.equal(mine.data.length, 0)
    const types = await b.client.rpc('search_library', { p_query: tag, p_types: ['pdf'] })
    assert.equal(types.data.length, 0)
    // wildcard characters in the query are treated literally
    const weird = await b.client.rpc('search_library', { p_query: '100%_' })
    assert.ifError(weird.error)
  })
})
