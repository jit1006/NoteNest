import { describe, it, before } from 'node:test'
import assert from 'node:assert/strict'
import { anon, makeUser, mkNote, doc } from './helpers.mjs'

describe('visibility, unlisted tokens, collaboration and soft delete', () => {
  let a, b, c
  before(async () => { a = await makeUser('owner'); b = await makeUser('reader'); c = await makeUser('stranger') })

  it('public notes are readable by everyone (including anonymous); private are not', async () => {
    const pub = await mkNote(a, { title: 'Public note', visibility: 'public' })
    const priv = await mkNote(a, { title: 'Private note' })
    for (const client of [b.client, anon()]) {
      assert.equal((await client.from('notes').select('id').eq('id', pub.id)).data.length, 1)
      assert.equal((await client.from('notes').select('id').eq('id', priv.id)).data.length, 0)
    }
  })

  it('only the owner can change visibility', async () => {
    const pub = await mkNote(a, { visibility: 'public' })
    const r = await b.client.from('notes').update({ visibility: 'private' }).eq('id', pub.id).select()
    assert.equal(r.data?.length ?? 0, 0)
  })

  it('unlisted notes are invisible to tables and search, reachable only with a valid token while signed in', async () => {
    const n = await mkNote(a, { title: 'Unlisted gem zebracorn', content: doc('zebracorn secret text'), visibility: 'unlisted' })
    const own = await a.client.from('notes').select('share_token').eq('id', n.id).single()
    const token = own.data.share_token
    assert.ok(token)
    // not through tables
    assert.equal((await b.client.from('notes').select('id').eq('id', n.id)).data.length, 0)
    assert.equal((await anon().from('notes').select('id').eq('id', n.id)).data.length, 0)
    // not through search (even for the owner)
    const s = await a.client.rpc('search_library', { p_query: 'zebracorn' })
    assert.equal(s.data.length, 0)
    // token flow
    const ok = await b.client.rpc('get_shared_note', { p_id: n.id, p_token: token })
    assert.ifError(ok.error)
    assert.equal(ok.data.title, 'Unlisted gem zebracorn')
    assert.equal(ok.data.share_token, undefined, 'token must not be echoed')
    const bad = await b.client.rpc('get_shared_note', { p_id: n.id, p_token: crypto.randomUUID() })
    assert.ok(bad.error)
    const anonCall = await anon().rpc('get_shared_note', { p_id: n.id, p_token: token })
    assert.ok(anonCall.error, 'anonymous callers are refused')
    // a URL alone is not enough: other tokens for other notes do not work
    const other = await mkNote(a, { visibility: 'unlisted' })
    const t2 = (await a.client.from('notes').select('share_token').eq('id', other.id).single()).data.share_token
    assert.ok((await b.client.rpc('get_shared_note', { p_id: n.id, p_token: t2 })).error)
  })

  it('rotating the share token revokes old links; strangers cannot rotate', async () => {
    const n = await mkNote(a, { visibility: 'unlisted' })
    const old = (await a.client.from('notes').select('share_token').eq('id', n.id).single()).data.share_token
    assert.ok((await c.client.rpc('rotate_share_token', { p_type: 'note', p_id: n.id })).error)
    const rot = await a.client.rpc('rotate_share_token', { p_type: 'note', p_id: n.id })
    assert.ifError(rot.error)
    assert.notEqual(rot.data, old)
    assert.ok((await b.client.rpc('get_shared_note', { p_id: n.id, p_token: old })).error)
    assert.ifError((await b.client.rpc('get_shared_note', { p_id: n.id, p_token: rot.data })).error)
  })

  it('clients cannot set or change share_token directly', async () => {
    const n = await mkNote(a, { visibility: 'unlisted' })
    const before = (await a.client.from('notes').select('share_token').eq('id', n.id).single()).data.share_token
    await a.client.from('notes').update({ share_token: crypto.randomUUID() }).eq('id', n.id)
    const after = (await a.client.from('notes').select('share_token').eq('id', n.id).single()).data.share_token
    assert.equal(after, before)
  })

  it('space membership: viewer reads private content but cannot edit; editor can edit but not change ownership/visibility; removal revokes', async () => {
    const n = await mkNote(a, { title: 'Team note' })
    const { data: bProfile } = await b.client.from('profiles').select('username').eq('id', b.id).single()
    // only the space owner can invite
    assert.ok((await c.client.rpc('invite_member', { p_space: a.spaceId, p_username: bProfile.username, p_role: 'editor' })).error)
    assert.ifError((await a.client.rpc('invite_member', { p_space: a.spaceId, p_username: bProfile.username, p_role: 'viewer' })).error)

    assert.equal((await b.client.from('notes').select('id').eq('id', n.id)).data.length, 1, 'viewer can read')
    assert.equal((await b.client.from('notes').update({ title: 'x' }).eq('id', n.id).select()).data.length, 0, 'viewer cannot edit')
    assert.ok((await b.client.from('notes').insert({ space_id: a.spaceId, semester_id: a.semesterId, owner_id: b.id })).error, 'viewer cannot create')

    assert.ifError((await a.client.rpc('invite_member', { p_space: a.spaceId, p_username: bProfile.username, p_role: 'editor' })).error)
    const upd = await b.client.from('notes').update({ title: 'Edited by editor' }).eq('id', n.id).select()
    assert.equal(upd.data[0].title, 'Edited by editor')
    assert.ok((await b.client.from('notes').update({ visibility: 'public' }).eq('id', n.id)).error, 'editor cannot publish')
    assert.ok((await b.client.from('notes').update({ owner_id: b.id }).eq('id', n.id)).error, 'editor cannot take ownership')
    assert.equal((await b.client.from('notes').delete().eq('id', n.id).select()).data?.length ?? 0, 0, 'editor cannot hard-delete')
    const made = await b.client.from('notes').insert({ space_id: a.spaceId, semester_id: a.semesterId, owner_id: b.id, title: 'By editor' }).select().single()
    assert.ifError(made.error)

    // member list is visible to the space owner only
    assert.equal((await a.client.from('space_members').select('user_id').eq('space_id', a.spaceId)).data.length, 1)
    assert.equal((await c.client.from('space_members').select('user_id').eq('space_id', a.spaceId)).data.length, 0)

    await a.client.from('space_members').delete().eq('space_id', a.spaceId).eq('user_id', b.id)
    assert.equal((await b.client.from('notes').select('id').eq('id', n.id)).data.length, 0, 'access revoked')
  })

  it('soft delete hides the subtree from others and can be restored by the owner', async () => {
    const sem = (await a.client.from('semesters').insert({ space_id: a.spaceId, owner_id: a.id, number: 7, title: 'Sem 7' }).select().single()).data
    const n = await mkNote(a, { semester_id: sem.id, title: 'In sem 7', visibility: 'public' })
    assert.equal((await b.client.from('notes').select('id').eq('id', n.id)).data.length, 1)
    const del = await a.client.from('semesters').update({ deleted_at: new Date().toISOString() }).eq('id', sem.id).select()
    assert.equal(del.data.length, 1)
    assert.equal((await b.client.from('notes').select('id').eq('id', n.id)).data.length, 0, 'cascade hides the public note')
    assert.equal((await a.client.from('notes').select('id').eq('id', n.id)).data.length, 1, 'owner still sees it (trash)')
    await a.client.from('semesters').update({ deleted_at: null }).eq('id', sem.id)
    assert.equal((await b.client.from('notes').select('id').eq('id', n.id)).data.length, 1, 'restore brings it back')
  })
})
