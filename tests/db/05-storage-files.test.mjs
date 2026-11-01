import { describe, it, before } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { anon, makeUser, mkResource, uploadPdf, PDF_BYTES, newClient } from './helpers.mjs'

const fileRow = (u, resource, path, over = {}) => ({
  resource_id: resource.id, owner_id: u.id, storage_path: path, original_filename: 'lecture-1.pdf',
  extension: 'pdf', mime_type: 'application/pdf', size_bytes: PDF_BYTES.length, ...over,
})

describe('storage: uploads, ownership, signed URLs, metadata exposure', () => {
  let a, b
  before(async () => { a = await makeUser('uploader'); b = await makeUser('snooper') })

  it('accepts a valid upload into your own folder only', async () => {
    const ok = await uploadPdf(a)
    assert.ifError(ok.error)
    const intruder = await b.client.storage.from('files').upload(`${a.id}/${randomUUID()}.pdf`, PDF_BYTES, { contentType: 'application/pdf' })
    assert.ok(intruder.error, 'cannot write into another user folder')
    const loose = await a.client.storage.from('files').upload(`${randomUUID()}.pdf`, PDF_BYTES, { contentType: 'application/pdf' })
    assert.ok(loose.error, 'must live under {uid}/')
    const anonUp = await anon().storage.from('files').upload(`${a.id}/${randomUUID()}.pdf`, PDF_BYTES, { contentType: 'application/pdf' })
    assert.ok(anonUp.error)
  })

  it('rejects disallowed extensions and MIME types server-side', async () => {
    const exe = await a.client.storage.from('files').upload(`${a.id}/${randomUUID()}.exe`, PDF_BYTES, { contentType: 'application/pdf' })
    assert.ok(exe.error, '.exe rejected by extension policy')
    const html = await a.client.storage.from('files').upload(`${a.id}/${randomUUID()}.html`, Buffer.from('<script>alert(1)</script>'), { contentType: 'text/plain' })
    assert.ok(html.error, '.html rejected')
    const svg = await a.client.storage.from('files').upload(`${a.id}/${randomUUID()}.pdf`, Buffer.from('<svg/>'), { contentType: 'image/svg+xml' })
    assert.ok(svg.error, 'svg MIME rejected by bucket allow-list')
    const noext = await a.client.storage.from('files').upload(`${a.id}/${randomUUID()}`, PDF_BYTES, { contentType: 'application/pdf' })
    assert.ok(noext.error, 'extension is required')
    const zip = await a.client.storage.from('files').upload(`${a.id}/${randomUUID()}.pdf`, PDF_BYTES, { contentType: 'application/zip' })
    assert.ok(zip.error, 'zip MIME rejected')
  })

  it('metadata rows are validated against the stored object', async () => {
    const r = await mkResource(a)
    const up = await uploadPdf(a)
    const missing = await a.client.from('resource_files').insert(fileRow(a, r, `${a.id}/${randomUUID()}.pdf`))
    assert.ok(missing.error, 'object must exist')
    const wrongSize = await a.client.from('resource_files').insert(fileRow(a, r, up.path, { size_bytes: 1 }))
    assert.ok(wrongSize.error, 'size must match')
    const wrongMime = await a.client.from('resource_files').insert(fileRow(a, r, up.path, { mime_type: 'image/png' }))
    assert.ok(wrongMime.error, 'mime must match')
    const wrongExt = await a.client.from('resource_files').insert(fileRow(a, r, up.path, { extension: 'png' }))
    assert.ok(wrongExt.error, 'extension must match path')
    const foreignPath = await b.client.from('resource_files').insert(fileRow(b, r, up.path))
    assert.ok(foreignPath.error, "cannot attach files to someone else's resource or path")
    const good = await a.client.from('resource_files').insert(fileRow(a, r, up.path)).select().single()
    assert.ifError(good.error)
    const dup = await a.client.from('resource_files').insert(fileRow(a, r, up.path))
    assert.ok(dup.error, 'a path can be registered once')
  })

  it('signed URLs follow resource visibility; private files are never exposed', async () => {
    const r = await mkResource(a, { title: 'Confidential lecture' })
    const up = await uploadPdf(a)
    assert.ifError((await a.client.from('resource_files').insert(fileRow(a, r, up.path, { original_filename: 'my-secret-name.pdf' }))).error)

    const own = await a.client.storage.from('files').createSignedUrl(up.path, 60)
    assert.ifError(own.error)
    const got = await fetch(own.data.signedUrl)
    assert.equal(got.status, 200)
    assert.equal(Buffer.from(await got.arrayBuffer()).subarray(0, 5).toString(), '%PDF-')

    assert.ok((await b.client.storage.from('files').createSignedUrl(up.path, 60)).error, 'private: no URL for others')
    assert.ok((await anon().storage.from('files').createSignedUrl(up.path, 60)).error, 'private: no URL for anon')
    assert.ok((await b.client.storage.from('files').download(up.path)).error)
    assert.equal((await b.client.from('resource_files').select('original_filename').eq('resource_id', r.id)).data.length, 0, 'filename hidden')
    assert.equal((await b.client.from('resources').select('id').eq('id', r.id)).data.length, 0)

    await a.client.from('resources').update({ visibility: 'public' }).eq('id', r.id)
    assert.ifError((await b.client.storage.from('files').createSignedUrl(up.path, 60)).error)
    assert.ifError((await anon().storage.from('files').createSignedUrl(up.path, 60)).error)
    assert.equal((await b.client.from('resource_files').select('original_filename').eq('resource_id', r.id)).data[0].original_filename, 'my-secret-name.pdf')

    await a.client.from('resources').update({ visibility: 'private' }).eq('id', r.id)
    assert.ok((await b.client.storage.from('files').createSignedUrl(up.path, 60)).error, 'revoked again')

    await a.client.from('resources').update({ visibility: 'unlisted' }).eq('id', r.id)
    assert.ok((await b.client.storage.from('files').createSignedUrl(up.path, 60)).error, 'unlisted files are not signable through storage policies')
    const token = (await a.client.from('resources').select('share_token').eq('id', r.id).single()).data.share_token
    const shared = await b.client.rpc('get_shared_resource', { p_id: r.id, p_token: token })
    assert.ifError(shared.error)
    assert.equal(shared.data.files.length, 1)
    assert.equal(JSON.stringify(shared.data).includes(up.path), false, 'storage path is not disclosed')
  })

  it('only the uploader can delete objects', async () => {
    const up = await uploadPdf(a)
    const del = await b.client.storage.from('files').remove([up.path])
    assert.equal(del.data?.length ?? 0, 0)
    assert.ifError((await a.client.storage.from('files').createSignedUrl(up.path, 30)).error)
    const mine = await a.client.storage.from('files').remove([up.path])
    assert.equal(mine.data.length, 1)
  })

  it('editors of a shared space can attach files they uploaded; viewers cannot', async () => {
    const owner = await makeUser('spaceowner')
    const ed = await makeUser('editor')
    const vw = await makeUser('viewer')
    const un = (await ed.client.from('profiles').select('username').eq('id', ed.id).single()).data.username
    const uv = (await vw.client.from('profiles').select('username').eq('id', vw.id).single()).data.username
    await owner.client.rpc('invite_member', { p_space: owner.spaceId, p_username: un, p_role: 'editor' })
    await owner.client.rpc('invite_member', { p_space: owner.spaceId, p_username: uv, p_role: 'viewer' })
    const asEditor = { ...ed, spaceId: owner.spaceId, semesterId: owner.semesterId }
    const res = await mkResource(asEditor, { title: 'Shared by editor' })
    const up = await uploadPdf(ed)
    assert.ifError((await ed.client.from('resource_files').insert(fileRow(ed, res, up.path))).error)
    const vUp = await uploadPdf(vw)
    assert.ok((await vw.client.from('resource_files').insert(fileRow(vw, res, vUp.path))).error, 'viewer cannot attach')
    assert.ifError((await vw.client.storage.from('files').createSignedUrl(up.path, 30)).error, 'viewer can read the shared file')
  })

  it('avatars: public bucket, writable only in your own folder', async () => {
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64')
    const path = `${a.id}/avatar.png`
    assert.ifError((await a.client.storage.from('avatars').upload(path, png, { contentType: 'image/png', upsert: true })).error)
    assert.ok((await b.client.storage.from('avatars').upload(`${a.id}/evil.png`, png, { contentType: 'image/png' })).error)
    assert.ok((await a.client.storage.from('avatars').upload(`${a.id}/x.pdf`, PDF_BYTES, { contentType: 'application/pdf' })).error, 'avatars are images only')
    const url = anon().storage.from('avatars').getPublicUrl(path).data.publicUrl
    assert.equal((await fetch(url)).status, 200)
  })
})
