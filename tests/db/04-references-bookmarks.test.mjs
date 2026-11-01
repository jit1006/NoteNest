import { describe, it, before } from 'node:test'
import assert from 'node:assert/strict'
import { anon, makeUser, mkNote, doc } from './helpers.mjs'

const ref = (u, s, t, relation_type = 'related') =>
  u.client.from('note_references').insert({ source_note_id: s, target_note_id: t, relation_type, created_by: u.id })

describe('cross-semester references, bookmarks and annotations', () => {
  let a, b, sem2
  before(async () => {
    a = await makeUser('refa'); b = await makeUser('refb')
    sem2 = (await a.client.from('semesters').insert({ space_id: a.spaceId, owner_id: a.id, number: 2, title: 'Semester 2' }).select().single()).data
  })

  it('links notes across semesters with typed relations and blocks duplicates / self links', async () => {
    const n1 = await mkNote(a, { title: 'Sem1 prerequisite' })
    const n2 = await mkNote(a, { title: 'Sem2 topic', semester_id: sem2.id })
    for (const t of ['prerequisite', 'related', 'continuation', 'revision', 'cited_source']) {
      assert.ifError((await ref(a, n2.id, n1.id, t)).error, t)
    }
    assert.ok((await ref(a, n2.id, n1.id, 'related')).error, 'duplicate rejected')
    assert.ok((await ref(a, n1.id, n1.id)).error, 'self reference rejected')
    assert.ok((await ref(a, n2.id, n1.id, 'nonsense')).error, 'unknown relation type rejected')
    const back = await a.client.from('note_references').select('source_note_id,relation_type').eq('target_note_id', n1.id)
    assert.equal(back.data.length, 5, 'backlinks are queryable')
  })

  it('cannot reference a note you cannot read, or from a note you cannot edit', async () => {
    const mine = await mkNote(b, { title: 'B note' })
    const secret = await mkNote(a, { title: 'A secret' })
    const open = await mkNote(a, { title: 'A public', visibility: 'public' })
    assert.ok((await ref(b, mine.id, secret.id)).error, 'private target blocked')
    assert.ifError((await ref(b, mine.id, open.id)).error)
    assert.ok((await ref(b, open.id, mine.id)).error, 'cannot add references to someone else\'s note')
  })

  it('does not leak: when the target becomes private, others no longer see the link row', async () => {
    const mine = await mkNote(b, { title: 'B source' })
    const open = await mkNote(a, { title: 'A to-be-hidden', visibility: 'public' })
    assert.ifError((await ref(b, mine.id, open.id)).error)
    assert.equal((await b.client.from('note_references').select('id').eq('source_note_id', mine.id)).data.length, 1)
    await a.client.from('notes').update({ visibility: 'private' }).eq('id', open.id)
    assert.equal((await b.client.from('note_references').select('id').eq('source_note_id', mine.id)).data.length, 0)
    const g = await b.client.rpc('note_reference_graph', { p_root: mine.id, p_depth: 3 })
    assert.equal(g.data.length, 0, 'graph hides inaccessible edges')
  })

  it('graph traversal is depth limited and survives cycles', async () => {
    const n = []
    for (let i = 0; i < 6; i++) n.push(await mkNote(a, { title: `chain ${i}` }))
    for (let i = 0; i < 5; i++) assert.ifError((await ref(a, n[i].id, n[i + 1].id)).error)
    assert.ifError((await ref(a, n[5].id, n[0].id)).error)           // closes a cycle 0→…→5→0
    const g1 = await a.client.rpc('note_reference_graph', { p_root: n[0].id, p_depth: 1 })
    assert.ok(g1.data.length >= 2 && g1.data.every((e) => e.depth === 1))
    const g99 = await a.client.rpc('note_reference_graph', { p_root: n[0].id, p_depth: 99 })
    assert.ifError(g99.error)
    assert.ok(g99.data.every((e) => e.depth <= 3), 'depth is capped at 3')
    assert.equal(new Set(g99.data.map((e) => `${e.source_note_id}>${e.target_note_id}`)).size, g99.data.length, 'no duplicate edges')
  })

  it('bookmarks: validated targets, uniqueness, per-user privacy, no bookmarking unreadable notes', async () => {
    const open = await mkNote(a, { visibility: 'public' })
    const secret = await mkNote(a)
    assert.ifError((await b.client.from('bookmarks').insert({ user_id: b.id, note_id: open.id })).error)
    assert.ifError((await b.client.from('bookmarks').insert({ user_id: b.id, note_id: open.id, block_id: 'blk-1', label: 'Intro' })).error)
    assert.ok((await b.client.from('bookmarks').insert({ user_id: b.id, note_id: open.id, block_id: 'blk-1' })).error, 'duplicate block bookmark')
    assert.ok((await b.client.from('bookmarks').insert({ user_id: b.id, note_id: open.id })).error, 'duplicate note bookmark')
    assert.ok((await b.client.from('bookmarks').insert({ user_id: b.id, note_id: secret.id })).error, 'unreadable note')
    assert.ok((await b.client.from('bookmarks').insert({ user_id: b.id })).error, 'needs a target')
    assert.ok((await b.client.from('bookmarks').insert({ user_id: b.id, note_id: open.id, pdf_page: 2 })).error, 'pdf_page requires a resource')
    assert.equal((await a.client.from('bookmarks').select('id').eq('note_id', open.id)).data.length, 0, 'bookmarks are private')
    assert.equal((await anon().from('bookmarks').select('id')).data?.length ?? 0, 0)
    const pop = await anon().rpc('popular_public_notes', { p_limit: 5 })
    assert.ok(pop.data.some((r) => r.id === open.id && Number(r.saves) >= 1), 'popularity counts saves of public notes')
  })

  it('annotations validate anchors, belong to one user and need read access', async () => {
    const open = await mkNote(a, { visibility: 'public', content: doc('Highlight this sentence please') })
    const anchor = { type: 'block', blockId: 'abc', start: 0, end: 9, quote: 'Highlight', prefix: '', suffix: ' this' }
    const good = await b.client.from('annotations').insert({ user_id: b.id, note_id: open.id, anchor, quote: 'Highlight', color: 'green' }).select().single()
    assert.ifError(good.error)
    for (const bad of [{ type: 'block' }, { type: 'block', blockId: 'x', start: 5, end: 2 }, { type: 'pdf', page: 0, rects: [{}] }, 'str', null]) {
      assert.ok((await b.client.from('annotations').insert({ user_id: b.id, note_id: open.id, anchor: bad })).error, JSON.stringify(bad))
    }
    assert.equal((await a.client.from('annotations').select('id').eq('id', good.data.id)).data.length, 0, 'owner of the note cannot see my annotations')
    const secret = await mkNote(a)
    assert.ok((await b.client.from('annotations').insert({ user_id: b.id, note_id: secret.id, anchor })).error)
    assert.ok((await b.client.from('annotations').update({ comment: 'x' }).eq('id', good.data.id)).error === null)
    assert.equal((await a.client.from('annotations').update({ comment: 'hack' }).eq('id', good.data.id).select()).data.length, 0)
  })
})
