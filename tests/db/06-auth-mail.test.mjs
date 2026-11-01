import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { admin, newClient, PASSWORD, waitForMail, firstLink } from './helpers.mjs'

const SITE = 'http://127.0.0.1:4173'
const follow = async (link) => {
  const res = await fetch(link, { redirect: 'manual' })
  assert.ok([301, 302, 303, 307].includes(res.status), `verify endpoint should redirect, got ${res.status}`)
  return new URL(res.headers.get('location'))
}

describe('Supabase Auth: email confirmation, sign-in rules and password reset', () => {
  const email = `auth-${randomUUID().slice(0, 8)}@example.test`
  const client = newClient()

  it('sign-up requires email confirmation before password login works', async () => {
    const r = await client.auth.signUp({ email, password: PASSWORD, options: { data: { display_name: 'New Person' }, emailRedirectTo: SITE } })
    assert.ifError(r.error)
    assert.equal(r.data.session, null, 'no session until the email is confirmed')
    const early = await newClient().auth.signInWithPassword({ email, password: PASSWORD })
    assert.ok(early.error, 'login before confirmation is refused')

    const mail = await waitForMail(email, 'confirm')
    const loc = await follow(firstLink(mail))
    assert.ok(loc.origin === SITE, `redirects back to the app (${loc.href})`)
    assert.match(loc.hash + loc.search, /access_token=|code=/)

    const ok = await newClient().auth.signInWithPassword({ email, password: PASSWORD })
    assert.ifError(ok.error)
    const authed = await newClientWith(ok.data.session)
    const profile = await authed.from('profiles').select('display_name,username').eq('id', ok.data.user.id).single()
    assert.equal(profile.data.display_name, 'New Person')
  })

  it('rejects wrong passwords and weak passwords', async () => {
    assert.ok((await newClient().auth.signInWithPassword({ email, password: 'wrong-password-1' })).error)
    const weak = await newClient().auth.signUp({ email: `weak-${randomUUID().slice(0, 6)}@example.test`, password: 'short' })
    assert.ok(weak.error, 'minimum length enforced')
  })

  it('password reset: mail → recovery session → new password works, old one does not', async () => {
    const r = await newClient().auth.resetPasswordForEmail(email, { redirectTo: `${SITE}/#/reset-password` })
    assert.ifError(r.error)
    const mail = await waitForMail(email, 'reset')
    const loc = await follow(firstLink(mail))
    const frag = loc.href.includes('#') ? loc.href.slice(loc.href.lastIndexOf('#') + 1) : ''
    const params = new URLSearchParams(frag.includes('access_token') ? frag : loc.search)
    const access_token = params.get('access_token'), refresh_token = params.get('refresh_token')
    assert.ok(access_token && refresh_token, `recovery tokens expected in ${loc.href}`)
    const c = newClient()
    assert.ifError((await c.auth.setSession({ access_token, refresh_token })).error)
    const next = 'Brand-new-pass-456!'
    assert.ifError((await c.auth.updateUser({ password: next })).error)
    assert.ok((await newClient().auth.signInWithPassword({ email, password: PASSWORD })).error, 'old password is dead')
    assert.ifError((await newClient().auth.signInWithPassword({ email, password: next })).error)
  })

  it('deleting a user removes their profile and content (cascade)', async () => {
    const e = `del-${randomUUID().slice(0, 8)}@example.test`
    const { data } = await admin.auth.admin.createUser({ email: e, password: PASSWORD, email_confirm: true })
    assert.equal((await admin.from('profiles').select('id').eq('id', data.user.id)).data.length, 1)
    assert.equal((await admin.from('academic_spaces').select('id').eq('owner_id', data.user.id)).data.length, 1)
    assert.ifError((await admin.auth.admin.deleteUser(data.user.id)).error)
    assert.equal((await admin.from('profiles').select('id').eq('id', data.user.id)).data.length, 0)
    assert.equal((await admin.from('academic_spaces').select('id').eq('owner_id', data.user.id)).data.length, 0)
  })
})

async function newClientWith(session) {
  const c = newClient()
  await c.auth.setSession({ access_token: session.access_token, refresh_token: session.refresh_token })
  return c
}
