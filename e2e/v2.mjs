// Full-stack browser tests against the LOCAL Supabase stack + the production build.
//   BASE_URL=http://127.0.0.1:4173 SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… node e2e/v2.mjs
// Optional: CHROME_PATH, MAILPIT_URL, SHOTS_DIR
import { chromium } from 'playwright'
import { createClient } from '@supabase/supabase-js'
import { mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'

const BASE = (process.env.BASE_URL || 'http://127.0.0.1:4173').replace(/\/$/, '')
const API = process.env.SUPABASE_URL || 'http://127.0.0.1:54321'
const MAIL = process.env.MAILPIT_URL || 'http://127.0.0.1:54324'
const SHOTS = process.env.SHOTS_DIR || 'e2e-artifacts'
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const PASSWORD = 'E2e-pass-123!'
mkdirSync(SHOTS, { recursive: true })

const admin = createClient(API, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
const results = []
const problems = []
const livePages = new Set()
// Deliberate negative tests (wrong password, duplicate link, forbidden reads) produce 4xx; 5xx are always problems.
const IGNORE = [/favicon/, /Failed to load resource/]

const ok = (v, msg) => { if (!v) throw new Error(msg || 'assertion failed') }
const eq = (a, b, msg) => { if (a !== b) throw new Error(`${msg || 'expected equal'}: got ${JSON.stringify(a)}, expected ${JSON.stringify(b)}`) }
async function check(name, fn) {
  const t0 = Date.now()
  try { await fn(); results.push({ name, ok: true }); console.log(`  PASS  ${name} (${((Date.now() - t0) / 1000).toFixed(1)}s)`) }
  catch (e) {
    results.push({ name, ok: false, err: e })
    console.log(`  FAIL  ${name}\n        ${String(e.message).split('\n').slice(0, 4).join('\n        ')}`)
    let i = 0
    for (const pg of livePages) {              // diagnostics: where was each browser when it failed?
      try {
        const text = (await pg.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ').slice(0, 350)
        console.log(`        [page ${i}] ${pg.url()}\n        text: ${text}`)
        await pg.screenshot({ path: join(SHOTS, `FAIL-${results.length}-${i}.png`) })
      } catch { /* page already closed */ }
      i++
    }
  } finally {
    for (const pg of livePages) await pg.context().close().catch(() => {})
    livePages.clear()
  }
}

const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || undefined, args: ['--no-sandbox'] })

async function newCtx(opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true, ...opts })
  const page = await ctx.newPage()
  livePages.add(page)
  livePages.add(page)
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`))
  page.on('console', (m) => { if (m.type() === 'error' && !IGNORE.some((re) => re.test(m.text()))) problems.push(`console.error: ${m.text().slice(0, 200)} @ ${page.url()}`) })
  page.on('requestfailed', (r) => { const t = r.failure()?.errorText || ''; if (!t.includes('ERR_ABORTED') && !r.url().startsWith('chrome-extension://')) problems.push(`requestfailed (${t}): ${r.url()}`) })
  page.on('response', (r) => { if (r.status() >= 500) problems.push(`HTTP ${r.status()}: ${r.url()}`) })
  page.setDefaultTimeout(15000)
  return { ctx, page }
}
const go = (page, hash) => page.goto(`${BASE}/#${hash}`)
const shot = (page, name) => page.screenshot({ path: join(SHOTS, `${name}.png`) }).catch(() => {})

async function newUser(label) {
  const email = `${label}-${randomUUID().slice(0, 8)}@example.test`
  const { data, error } = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true, user_metadata: { display_name: label } })
  if (error) throw error
  return { id: data.user.id, email, label }
}
async function login(page, email, password = PASSWORD) {
  await go(page, '/login')
  await page.getByLabel('Email', { exact: true }).fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL(/#\/dashboard/)
  await page.getByRole('heading', { level: 1 }).first().waitFor()
}
async function waitForMail(to, subjectPart) {
  const end = Date.now() + 25000
  while (Date.now() < end) {
    const res = await fetch(`${MAIL}/api/v1/search?query=${encodeURIComponent(`to:${to}`)}`)
    if (res.ok) {
      const { messages = [] } = await res.json()
      const hit = messages.find((m) => (m.Subject || '').toLowerCase().includes(subjectPart))
      if (hit) { const full = await (await fetch(`${MAIL}/api/v1/message/${hit.ID}`)).json(); return full.HTML || full.Text }
    }
    await new Promise((r) => setTimeout(r, 400))
  }
  throw new Error(`no "${subjectPart}" mail for ${to}`)
}
const linkIn = (html) => html.match(/https?:\/\/[^\s"'<>]*\/auth\/v1\/verify[^\s"'<>]*/)[0].replace(/&amp;/g, '&')

async function newNoteViaUi(page, title) {
  await go(page, '/dashboard')
  await page.getByRole('button', { name: 'New note' }).first().click()
  const dlg = page.getByRole('dialog', { name: 'New note' })
  await dlg.getByLabel('Title').fill(title)
  await dlg.getByRole('button', { name: 'Create note' }).click()
  await page.waitForURL(/#\/notes\/[0-9a-f-]+\/edit/)
  await page.locator('.ProseMirror').waitFor()
  return page.url().match(/notes\/([0-9a-f-]+)\/edit/)[1]
}
const saved = (page) => page.getByRole('status').filter({ hasText: /^Saved/ }).first().waitFor({ timeout: 15000 })

console.log(`\nNoteNest V2 end-to-end against ${BASE} (API ${API})\n`)

// ═════════════════════════ anonymous visitor ═════════════════════════
await check('anonymous: landing, public library search, public PDF opens and renders', async () => {
  const { ctx, page } = await newCtx()
  await go(page, '/')
  await page.getByRole('heading', { level: 1 }).filter({ hasText: 'Your Semester' }).waitFor()
  await shot(page, '01-landing')
  await page.getByRole('link', { name: 'Explore the public library' }).click()
  await page.getByRole('searchbox', { name: 'Search the library' }).fill('normalization')
  await page.getByRole('link', { name: /SQL Essentials and Normalization/ }).first().waitFor()
  await shot(page, '02-explore-anonymous')
  await page.getByRole('link', { name: /SQL Essentials and Normalization/ }).first().click()
  await page.locator('canvas').first().waitFor({ timeout: 30000 })
  await shot(page, '03-public-pdf-anonymous')
  await ctx.close()
})

await check('anonymous: protected routes redirect to login; unknown content is "not available"', async () => {
  const { ctx, page } = await newCtx()
  await go(page, '/dashboard')
  await page.waitForURL(/#\/login/)
  await go(page, '/notes/00000000-0000-4000-8000-000000000000')
  await page.getByRole('heading', { name: /isn.t available/ }).waitFor()
  await go(page, '/totally/unknown')
  await page.getByRole('heading', { name: 'Page not found' }).waitFor()
  await ctx.close()
})

// ═════════════════════════ authentication ═════════════════════════
await check('register → email confirmation (Mailpit) → signed in; logout; login; session survives reload', async () => {
  const { ctx, page } = await newCtx()
  const email = `reg-${randomUUID().slice(0, 8)}@example.test`
  await go(page, '/register')
  await page.getByLabel('Your name').fill('Rita Register')
  await page.getByLabel('Email', { exact: true }).fill(email)
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD)
  await page.getByLabel('Confirm password').fill(PASSWORD)
  await page.getByRole('button', { name: 'Create account' }).click()
  await page.getByRole('heading', { name: 'Check your inbox' }).waitFor()
  // password login must be refused until the email is confirmed
  const early = await createClient(API, process.env.SUPABASE_ANON_KEY, { auth: { persistSession: false } }).auth.signInWithPassword({ email, password: PASSWORD })
  ok(early.error, 'unconfirmed account cannot sign in')
  const link = linkIn(await waitForMail(email, 'confirm'))
  await page.goto(link)                                   // GoTrue verifies, then redirects back with ?code= (PKCE)
  await page.waitForURL(/#\/dashboard/, { timeout: 20000 })
  await page.getByRole('heading', { level: 1 }).filter({ hasText: 'Welcome back, Rita Register' }).waitFor()
  await shot(page, '04-dashboard-new-user')
  // default space + semester were created by the database trigger
  await page.getByRole('link', { name: /My Space/ }).first().waitFor()
  await page.reload()
  await page.getByRole('heading', { level: 1 }).filter({ hasText: 'Welcome back' }).waitFor()
  await page.getByRole('button', { name: 'Sign out' }).click()
  await page.waitForURL(/#\/$/)
  await go(page, '/dashboard'); await page.waitForURL(/#\/login/)
  await login(page, email)
  await ctx.close()
})

await check('wrong password shows a friendly error and stays on the login page', async () => {
  const u = await newUser('wrongpw')
  const { ctx, page } = await newCtx()
  await go(page, '/login')
  await page.getByLabel('Email', { exact: true }).fill(u.email)
  await page.getByLabel('Password', { exact: true }).fill('nope-nope-nope')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.getByRole('alert').filter({ hasText: 'Incorrect email or password' }).waitFor()
  ok(page.url().includes('/login'))
  await ctx.close()
})

await check('password reset: email → new password → old password rejected', async () => {
  const u = await newUser('resetter')
  const { ctx, page } = await newCtx()
  await go(page, '/forgot-password')
  await page.getByLabel('Email', { exact: true }).fill(u.email)
  await page.getByRole('button', { name: 'Send reset link' }).click()
  await page.getByRole('status').filter({ hasText: 'reset link is on its way' }).waitFor()
  const link = linkIn(await waitForMail(u.email, 'reset'))
  await page.goto(link)
  await page.waitForURL(/#\/reset-password/, { timeout: 20000 })
  await page.getByRole('heading', { name: 'Choose a new password' }).waitFor()
  const next = 'Brand-new-pass-456!'
  await page.getByLabel('New password', { exact: true }).fill(next)
  await page.getByLabel('Confirm new password').fill(next)
  await page.getByRole('button', { name: 'Update password' }).click()
  await page.waitForURL(/#\/dashboard/)
  await page.getByRole('button', { name: 'Sign out' }).click()
  await page.waitForURL(/#\/$/)
  await go(page, '/login')
  await page.getByLabel('Email', { exact: true }).fill(u.email)
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.getByRole('alert').filter({ hasText: 'Incorrect email or password' }).waitFor()
  await login(page, u.email, next)
  await ctx.close()
})

await check('Google sign-in button starts the Supabase OAuth flow with a secure redirect', async () => {
  const { ctx, page } = await newCtx()
  await go(page, '/login')
  const btn = page.getByRole('button', { name: 'Continue with Google' })
  await btn.waitFor()
  const reqP = page.waitForRequest((r) => r.url().includes('/auth/v1/authorize'))
  await btn.click()
  const req = await reqP
  const u = new URL(req.url())
  eq(u.searchParams.get('provider'), 'google')
  ok((u.searchParams.get('redirect_to') || '').startsWith(BASE), `redirect_to stays on our origin: ${u.searchParams.get('redirect_to')}`)
  ok(u.searchParams.get('code_challenge'), 'PKCE challenge present')
  await ctx.close()
})

// ═════════════════════════ two users: content, sharing, privacy ═════════════════════════
const alice = await newUser('alice')
const bob = await newUser('bob')
const state = {}

await check('Alice: writes a note, autosave persists to PostgreSQL, publishes it', async () => {
  const { ctx, page } = await newCtx()
  await login(page, alice.email)
  const id = await newNoteViaUi(page, 'Alice quokka note')
  state.publicNote = id
  const ed = page.locator('.ProseMirror')
  await ed.click()
  await page.keyboard.type('# Quokka basics')
  await page.keyboard.press('Enter')
  await page.keyboard.type('Quokkas are small marsupials that smile for the camera.')
  await page.keyboard.press('Enter')
  await page.keyboard.type('Second paragraph about habitats and diet.')
  await saved(page)
  await shot(page, '05-editor')
  await page.reload()
  await page.locator('.ProseMirror').filter({ hasText: 'smile for the camera' }).waitFor()
  // formatting + code block + task list via toolbar / shortcuts
  await page.locator('.ProseMirror').click()
  await page.keyboard.press('Control+End')
  await page.keyboard.press('Enter')
  await page.keyboard.type('```js ')
  await page.keyboard.type('const x = 1')
  await page.keyboard.press('Control+Enter')
  await page.getByRole('button', { name: 'Checklist' }).click()
  await page.keyboard.type('buy flashcards')
  await saved(page)
  // publish
  await page.getByRole('button', { name: 'Share' }).click()
  await page.getByRole('radio', { name: /^Public/ }).check()
  await page.getByText('Now public').waitFor()
  await page.keyboard.press('Escape')
  // Alice also makes a PRIVATE note
  state.privateNote = await newNoteViaUi(page, 'Alice private diary')
  await page.locator('.ProseMirror').click(); await page.keyboard.type('top secret plan zebra-secret-token'); await saved(page)
  await ctx.close()
})

await check('Bob: finds Alice\'s public note, cannot edit it, bookmarks and highlights it (private to Bob)', async () => {
  const { ctx, page } = await newCtx()
  await login(page, bob.email)
  await go(page, '/explore?q=quokka')
  await page.getByRole('link', { name: 'Alice quokka note' }).click()
  await page.getByRole('heading', { level: 1, name: 'Alice quokka note' }).waitFor()
  eq(await page.getByRole('link', { name: 'Edit', exact: true }).count(), 0, 'Bob has no Edit link')
  await page.getByRole('button', { name: 'Bookmark', exact: true }).click()
  await page.getByRole('button', { name: 'Bookmarked' }).waitFor()
  // highlight the start of the first paragraph
  await page.evaluate(() => {
    const p = [...document.querySelectorAll('.note-prose p[data-block-id]')].find((e) => e.textContent.includes('Quokkas'))
    const t = p.firstChild; const r = document.createRange(); r.setStart(t, 0); r.setEnd(t, 8)
    const s = getSelection(); s.removeAllRanges(); s.addRange(r)
  })
  await page.getByRole('toolbar', { name: 'Highlight selection' }).waitFor()
  await page.getByRole('button', { name: 'Highlight green' }).click()
  await page.locator('.annot-hl').first().waitFor()
  await shot(page, '06-reader-highlight')
  await page.reload()
  await page.locator('.annot-hl').first().waitFor()
  eq(await page.locator('.annot-hl').first().textContent(), 'Quokkas ')
  // Bob\'s direct attempt to open Alice\'s private note
  await go(page, `/notes/${state.privateNote}`)
  await page.getByRole('heading', { name: /isn.t available/ }).waitFor()
  await go(page, `/notes/${state.privateNote}/edit`)
  await page.getByRole('heading', { name: /isn.t available/ }).waitFor()
  // and a private note's text never shows up in search
  await go(page, '/explore?q=zebra-secret-token')
  await page.getByText('No results').waitFor()
  await ctx.close()
})

await check('Alice never sees Bob\'s highlights or bookmarks', async () => {
  const { ctx, page } = await newCtx()
  await login(page, alice.email)
  await go(page, `/notes/${state.publicNote}`)
  await page.getByRole('heading', { level: 1, name: 'Alice quokka note' }).waitFor()
  await page.getByRole('link', { name: 'Edit', exact: true }).waitFor()
  eq(await page.locator('.annot-hl').count(), 0, 'no foreign highlights')
  await page.getByRole('button', { name: 'Bookmark', exact: true }).waitFor()   // not "Bookmarked"
  await ctx.close()
})

await check('Bob: cross-semester link from his note to a demo note, backlinks visible only where permitted', async () => {
  const { ctx, page } = await newCtx()
  await login(page, bob.email)
  state.bobNote = await newNoteViaUi(page, 'Bob follow-up')
  await page.locator('.ProseMirror').click(); await page.keyboard.type('Revising indexes after hashing.'); await saved(page)
  await page.getByRole('button', { name: 'Link a note' }).click()
  const dlg = page.getByRole('dialog', { name: 'Link a note' })
  await dlg.getByLabel('Search notes').fill('indexes')
  await dlg.getByRole('option', { name: /Why indexes are fast/ }).click()
  await dlg.getByLabel('Relationship').selectOption('prerequisite')
  await dlg.getByRole('button', { name: 'Add link' }).click()
  const card = page.getByRole('listitem').filter({ hasText: 'Why indexes are fast' })
  await card.getByText('Cross-semester').waitFor()
  await card.getByText('Prerequisite').waitFor()
  await shot(page, '07-cross-semester-link')
  // duplicate links are refused
  await page.getByRole('button', { name: 'Link a note' }).click()
  const d2 = page.getByRole('dialog', { name: 'Link a note' })
  await d2.getByLabel('Search notes').fill('indexes')
  await d2.getByRole('option', { name: /Why indexes are fast/ }).click()
  await d2.getByLabel('Relationship').selectOption('prerequisite')
  await d2.getByRole('button', { name: 'Add link' }).click()
  await page.getByText('That already exists.').waitFor()
  await d2.getByRole('button', { name: 'Cancel' }).click()
  // reference explorer shows the edge
  await go(page, `/references?note=${state.bobNote}`)
  await page.getByRole('img', { name: /Reference graph around Bob follow-up/ }).waitFor()
  await page.getByRole('link', { name: 'Why indexes are fast' }).first().waitFor()
  // backlink is visible to Bob on the target note…
  await go(page, '/explore?q=indexes')
  await page.getByRole('link', { name: 'Why indexes are fast' }).first().click()
  await page.getByRole('heading', { name: 'Connections' }).waitFor()
  await page.getByText('Bob follow-up').first().waitFor()
  state.demoNoteUrl = page.url()
  await ctx.close()
  // …but NOT to Alice (Bob's note is private → no leak through backlinks)
  const a = await newCtx()
  await login(a.page, alice.email)
  await a.page.goto(state.demoNoteUrl)
  await a.page.getByRole('heading', { name: 'Connections' }).waitFor()
  await a.page.getByText('Hashing in five minutes').first().waitFor()      // the visible prerequisite (public) is there
  await a.page.waitForTimeout(500)
  eq(await a.page.getByText('Bob follow-up').count(), 0, 'private note title must not leak through backlinks')
  await a.ctx.close()
})

await check('Alice: uploads a PDF (progress, validation), previews it, bookmarks page 1, downloads it', async () => {
  const { ctx, page } = await newCtx()
  await login(page, alice.email)
  await go(page, '/files')
  const input = page.locator('input[type=file][aria-label="Select files"]')
  await page.waitForFunction(() => document.querySelector('#up-sem')?.value, null, { timeout: 15000 })   // destination resolved
  // an executable disguised as a document is refused before upload
  await input.setInputFiles({ name: 'evil.exe', mimeType: 'application/octet-stream', buffer: Buffer.from('MZ\x90\x00 pretend binary') })
  await page.getByRole('alert').filter({ hasText: /not supported/ }).waitFor()
  // and a renamed non-PDF fails the signature check
  await input.setInputFiles({ name: 'fake.pdf', mimeType: 'application/pdf', buffer: Buffer.from('<html><script>alert(1)</script></html>') })
  await page.getByRole('alert').filter({ hasText: /does not look like a real/ }).waitFor()
  await input.setInputFiles(join(ROOT, 'public/pdfs/dbms-sql-cheatsheet.pdf'))
  await page.getByRole('list', { name: 'Upload queue' }).getByRole('link', { name: 'Open' }).first().waitFor({ timeout: 30000 })
  await shot(page, '08-upload')
  await page.getByRole('list', { name: 'Upload queue' }).getByRole('link', { name: 'Open' }).first().click()
  await page.waitForURL(/#\/resources\//)
  state.pdf = page.url().match(/resources\/([0-9a-f-]+)/)[1]
  await page.locator('canvas').first().waitFor({ timeout: 30000 })
  await shot(page, '09-pdf-viewer')
  await page.getByRole('button', { name: /Bookmark page 1/ }).click()
  await page.getByRole('button', { name: /Page 1 bookmarked/ }).waitFor()
  await go(page, '/bookmarks')
  await page.getByText(/PDF page 1/).waitFor()
  await shot(page, '10-bookmarks')
  // download
  await go(page, `/resources/${state.pdf}`)
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /^Download dbms-sql-cheatsheet\.pdf/ }).first().click()])
  eq(dl.suggestedFilename(), 'dbms-sql-cheatsheet.pdf')
  await ctx.close()
})

await check('PDF: highlight text on a page (stored with page + rectangles), survives reload; page nav works', async () => {
  const { ctx, page } = await newCtx()
  await login(page, alice.email)
  await go(page, `/resources/${state.pdf}`)
  await page.locator('canvas').first().waitFor({ timeout: 30000 })
  await page.locator('.react-pdf__Page__textContent span').first().waitFor()
  await page.evaluate(() => {
    const spans = [...document.querySelectorAll('.react-pdf__Page__textContent span')].filter((s) => s.textContent.trim().length > 3)
    const t = spans[0].firstChild; const r = document.createRange(); r.setStart(t, 0); r.setEnd(t, Math.min(6, t.length))
    const s = getSelection(); s.removeAllRanges(); s.addRange(r)
    document.querySelector('.react-pdf__Page').parentElement.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
  })
  await page.getByRole('toolbar', { name: 'Highlight selection' }).waitFor()
  await page.getByRole('button', { name: 'Highlight yellow' }).click()
  await page.getByText('Highlight saved').waitFor()
  await page.reload()
  await page.locator('canvas').first().waitFor({ timeout: 30000 })
  await page.getByRole('complementary', { name: /Page highlights/ }).getByRole('listitem').first().waitFor()
  await ctx.close()
})

await check('Bob cannot open Alice\'s private PDF; after Alice publishes it Bob can preview it, and after un-publishing he cannot', async () => {
  const b = await newCtx(); await login(b.page, bob.email)
  await go(b.page, `/resources/${state.pdf}`)
  await b.page.getByRole('heading', { name: /isn.t available/ }).waitFor()
  const a = await newCtx(); await login(a.page, alice.email)
  await go(a.page, `/resources/${state.pdf}`)
  await a.page.getByRole('button', { name: 'Share' }).click()
  await a.page.getByRole('radio', { name: /^Public/ }).check(); await a.page.getByText('Now public').waitFor()
  await b.page.reload()
  await b.page.locator('canvas').first().waitFor({ timeout: 30000 })
  eq(await b.page.locator('.annot-hl, .react-pdf__Page span[style*="mix-blend"]').count(), 0, "Alice's highlights are not shown to Bob")
  await a.page.getByRole('radio', { name: /^Private/ }).check(); await a.page.getByText('Now private').waitFor()
  await b.page.reload()
  await b.page.getByRole('heading', { name: /isn.t available/ }).waitFor()
  await a.ctx.close(); await b.ctx.close()
})

await check('unlisted: hidden from search, opens only for signed-in people with the token, revoked by rotation', async () => {
  const { ctx, page } = await newCtx()
  await login(page, alice.email)
  const id = await newNoteViaUi(page, 'Alice unlisted gem')
  await page.locator('.ProseMirror').click(); await page.keyboard.type('unlisted words only for link holders'); await saved(page)
  await page.getByRole('button', { name: 'Share' }).click()
  await page.getByRole('radio', { name: /^Unlisted/ }).check()
  const link = await page.getByLabel('Secret link', { exact: true }).inputValue()
  ok(link.includes(`/shared/note/${id}?token=`), link)
  await page.keyboard.press('Escape')
  const b = await newCtx(); await login(b.page, bob.email)
  await go(b.page, '/explore?q=unlisted+gem'); await b.page.getByText('No results').waitFor()
  await b.page.goto(link)
  await b.page.getByRole('heading', { level: 1, name: /Alice unlisted gem/ }).waitFor()
  await b.page.getByText('unlisted words only for link holders').waitFor()
  await go(b.page, `/notes/${id}`); await b.page.getByRole('heading', { name: /isn.t available/ }).waitFor()   // the bare id is useless
  // anonymous visitor: sign-in required even with the token
  const anon = await newCtx(); await anon.page.goto(link); await anon.page.waitForURL(/#\/login/)
  // Alice rotates the link → old link stops working
  await page.getByRole('button', { name: 'Share' }).click()
  await page.getByRole('button', { name: /Revoke/ }).click()
  await page.getByText('old link no longer works').waitFor()
  await b.page.goto(link); await b.page.reload()
  await b.page.getByRole('heading', { name: /isn.t available/ }).waitFor()
  await anon.ctx.close(); await b.ctx.close(); await ctx.close()
})

await check('collaboration: invited editor can edit, viewer cannot; removal revokes access', async () => {
  const carol = await newUser('carol'); const dave = await newUser('dave')
  const { ctx, page } = await newCtx(); await login(page, alice.email)
  const noteId = await newNoteViaUi(page, 'Team notes'); await page.locator('.ProseMirror').click(); await page.keyboard.type('shared draft'); await saved(page)
  const { data: sp } = await admin.from('academic_spaces').select('id').eq('owner_id', alice.id).eq('is_default', true).single()
  const { data: cu } = await admin.from('profiles').select('username').eq('id', carol.id).single()
  const { data: du } = await admin.from('profiles').select('username').eq('id', dave.id).single()
  await go(page, `/spaces/${sp.id}`)
  await page.getByLabel('Username', { exact: true }).fill(cu.username); await page.getByLabel('Role', { exact: true }).selectOption('editor'); await page.getByRole('button', { name: 'Invite' }).click()
  await page.getByText('can now edit this space').waitFor()
  await page.getByLabel('Username', { exact: true }).fill(du.username); await page.getByLabel('Role', { exact: true }).selectOption('viewer'); await page.getByRole('button', { name: 'Invite' }).click()
  await page.getByText('can now view this space').waitFor()
  const c = await newCtx(); await login(c.page, carol.email)
  await go(c.page, `/notes/${noteId}/edit`); await c.page.locator('.ProseMirror').filter({ hasText: 'shared draft' }).waitFor()
  await c.page.locator('.ProseMirror').click(); await c.page.keyboard.press('Control+End'); await c.page.keyboard.type(' + carol edit'); await saved(c.page)
  const d = await newCtx(); await login(d.page, dave.email)
  await go(d.page, `/notes/${noteId}/edit`); await d.page.getByRole('heading', { name: /read this note, but not edit/ }).waitFor()
  await go(d.page, `/notes/${noteId}`); await d.page.getByText('shared draft + carol edit').waitFor()
  // Alice sees Carol's change; then removes Dave → he loses access
  await go(page, `/notes/${noteId}`); await page.getByText('shared draft + carol edit').waitFor()
  await go(page, `/spaces/${sp.id}`)
  await page.getByRole('button', { name: `Remove ${du.username}` }).click()
  await page.waitForTimeout(600)
  await d.page.reload(); await d.page.getByRole('heading', { name: /isn.t available/ }).waitFor()
  await c.ctx.close(); await d.ctx.close(); await ctx.close()
})

await check('global search respects permissions; filters + pagination work', async () => {
  const { ctx, page } = await newCtx(); await login(page, bob.email)
  await go(page, '/explore?cat=pyq')
  await page.getByText(/Showing \d+ results?/).waitFor()
  const n = Number((await page.getByText(/Showing \d+ results?/).textContent()).match(/\d+/)[0])
  eq(n, 8, 'seeded practice papers')
  await go(page, '/explore?cat=pyq&year=2025'); await page.getByText('Showing 3 results').waitFor()
  await go(page, '/explore?type=pdf&sem=3'); await page.getByText(/Showing 8 results/).waitFor()
  await go(page, '/explore?type=pdf'); await page.getByText(/Showing 28/).waitFor()
  await page.getByRole('navigation', { name: 'Pagination' }).getByRole('button', { name: 'Next' }).click()
  await page.getByText('Page 2 of 3').waitFor()
  await shot(page, '11-explore-filters')
  await ctx.close()
})

await check('study planner persists in the database across devices (two browser contexts)', async () => {
  const u = await newUser('planner')
  const one = await newCtx(); await login(one.page, u.email)
  await go(one.page, '/planner')
  await one.page.getByRole('button', { name: 'Add task' }).click()
  await one.page.getByText('Please describe the task').waitFor()
  await one.page.getByLabel('New task').fill('Revise normal forms'); await one.page.getByRole('button', { name: 'Add task' }).click()
  await one.page.getByRole('checkbox', { name: 'Revise normal forms' }).click()
  await one.page.getByRole('checkbox', { name: 'Revise normal forms', checked: true }).waitFor()
  await one.page.getByRole('progressbar', { name: 'Study progress' }).waitFor()
  const two = await newCtx(); await login(two.page, u.email)       // a second "device"
  await go(two.page, '/planner')
  await two.page.getByRole('checkbox', { name: 'Revise normal forms', checked: true }).waitFor()
  eq(await two.page.getByRole('progressbar', { name: 'Study progress' }).getAttribute('aria-valuenow'), '100')
  await one.ctx.close(); await two.ctx.close()
})

await check('profile editing, avatar rules and dark mode persistence', async () => {
  const u = await newUser('profiler')
  const { ctx, page } = await newCtx({ colorScheme: 'light' }); await login(page, u.email)
  await go(page, '/settings')
  await page.getByLabel('Display name').fill('Pro Filer'); await page.getByLabel('Bio').fill('I study databases.')
  await page.getByRole('button', { name: 'Save profile' }).click(); await page.getByText('Profile saved').waitFor()
  await page.reload()
  await page.waitForFunction(() => document.querySelector('#p-name')?.value === 'Pro Filer')   // form fills once the profile query resolves
  await page.getByLabel('Username').fill('Bad Name!'); await page.getByRole('button', { name: 'Save profile' }).click()
  await page.getByText(/3–30 lowercase letters/).waitFor()
  await page.getByRole('button', { name: 'Switch to dark mode' }).first().click()
  await page.reload()
  eq(await page.evaluate(() => document.documentElement.classList.contains('dark')), true, 'dark mode persisted')
  await shot(page, '12-settings-dark')
  await ctx.close()
})

await check('mobile: navigation drawer, no horizontal overflow, editor toolbar reachable', async () => {
  const { ctx, page } = await newCtx({ viewport: { width: 375, height: 740 }, isMobile: true, hasTouch: true })
  await login(page, alice.email)
  const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - 375)
  for (const route of ['/dashboard', '/explore', '/files', '/bookmarks', '/planner', '/settings', `/notes/${state.publicNote}`, `/notes/${state.publicNote}/edit`, '/references']) {
    await go(page, route); await page.getByRole('heading').first().waitFor(); await page.waitForTimeout(250)
    if ((await overflow()) > 1) {
      const culprits = await page.evaluate(() => [...document.querySelectorAll('body *')].filter((e) => e.getBoundingClientRect().right > 376 && getComputedStyle(e).position !== 'fixed').slice(0, 6).map((e) => `${e.tagName.toLowerCase()}.${String(e.className).split(' ').slice(0, 3).join('.')} right=${Math.round(e.getBoundingClientRect().right)}`))
      throw new Error(`horizontal overflow on ${route}: ${await overflow()}px; wide elements: ${culprits.join(' | ')}`)
    }
  }
  await go(page, '/dashboard')
  await page.getByRole('button', { name: 'Open menu' }).click()
  await page.getByRole('dialog', { name: 'Navigation' }).getByRole('link', { name: 'Bookmarks' }).click()
  await page.waitForURL(/#\/bookmarks/)
  await go(page, `/notes/${state.publicNote}/edit`)
  await page.getByRole('toolbar', { name: 'Formatting' }).waitFor()
  await page.getByRole('button', { name: 'Bold (Ctrl+B)' }).scrollIntoViewIfNeeded()
  await shot(page, '13-mobile-editor')
  await go(page, '/dashboard'); await shot(page, '14-mobile-dashboard')
  await ctx.close()
})

await check('soft delete: trashed note disappears for others and can be restored', async () => {
  const { ctx, page } = await newCtx(); await login(page, alice.email)
  const id = await newNoteViaUi(page, 'Short-lived note'); await page.locator('.ProseMirror').click(); await page.keyboard.type('temp'); await saved(page)
  await page.getByRole('button', { name: 'Share' }).click(); await page.getByRole('radio', { name: /^Public/ }).check(); await page.getByText('Now public').waitFor(); await page.keyboard.press('Escape')
  const b = await newCtx(); await login(b.page, bob.email)
  await go(b.page, `/notes/${id}`); await b.page.getByRole('heading', { level: 1, name: 'Short-lived note' }).waitFor()
  await go(page, `/notes/${id}`)
  await page.getByRole('button', { name: 'Move to trash' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Move to trash' }).click()
  await page.waitForURL(/#\/dashboard/)
  await b.page.reload(); await b.page.getByRole('heading', { name: /isn.t available/ }).waitFor()
  await go(page, '/settings')
  await page.getByRole('listitem').filter({ hasText: 'Short-lived note' }).getByRole('button', { name: 'Restore' }).click()
  await page.getByText('Restored').waitFor()
  await b.page.reload(); await b.page.getByRole('heading', { level: 1, name: 'Short-lived note' }).waitFor()
  await b.ctx.close(); await ctx.close()
})

await browser.close()

const failed = results.filter((r) => !r.ok)
console.log('\nBrowser console / network problems:')
if (problems.length) [...new Set(problems)].forEach((p) => console.log('  -', p)); else console.log('  none')
console.log(`\n${results.length - failed.length}/${results.length} checks passed${problems.length ? `, ${new Set(problems).size} console/network problem(s)` : ''}`)
process.exit(failed.length || problems.length ? 1 : 0)
