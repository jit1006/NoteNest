// Browser smoke test. Usage:
//   BASE_URL=http://localhost:4173 node e2e/smoke.mjs
// Optional: CHROME_PATH=/path/to/chrome  (otherwise Playwright's bundled Chromium is used)
import { chromium } from 'playwright'

const BASE = (process.env.BASE_URL || 'http://localhost:4173').replace(/\/$/, '')
const results = []
const consoleProblems = []
const expectedErrors = [] // URL fragments whose 4xx responses are intentional in a test

async function check(name, fn) {
  try {
    await fn()
    results.push({ name, ok: true })
    console.log(`  PASS  ${name}`)
  } catch (e) {
    results.push({ name, ok: false, err: e })
    console.log(`  FAIL  ${name}\n        ${String(e.message).split('\n')[0]}`)
  }
}
const eq = (a, b, msg) => {
  if (a !== b) throw new Error(`${msg || 'expected equal'}: got ${JSON.stringify(a)}, expected ${JSON.stringify(b)}`)
}
const ok = (v, msg) => {
  if (!v) throw new Error(msg || 'assertion failed')
}

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_PATH || undefined,
  args: ['--no-sandbox'],
})

async function newPage(opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true, ...opts })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => consoleProblems.push(`pageerror: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() === 'error' && !expectedErrors.some((u) => m.text().includes(u) || (m.location().url || '').includes(u))) consoleProblems.push(`console.error: ${m.text()} @ ${page.url()}`)
  })
  page.on('requestfailed', (r) => {
    const reason = r.failure()?.errorText || ''
    // ERR_ABORTED = navigation superseded by a download / the PDF viewer taking over: not an app error.
    if (reason.includes('ERR_ABORTED') || r.url().startsWith('chrome-extension://')) return
    consoleProblems.push(`requestfailed (${reason}): ${r.url()}`)
  })
  page.on('response', (r) => {
    if (r.status() >= 400 && !expectedErrors.some((u) => r.url().includes(u))) consoleProblems.push(`HTTP ${r.status()}: ${r.url()}`)
  })
  return page
}
// Always a fresh document load: deterministic (no stale DOM after hash-only navigation) and
// it exercises deep links, which is how a static host will receive them.
const go = async (page, hash) => {
  await page.goto('about:blank')
  await page.goto(`${BASE}/#${hash}`)
  await page.waitForSelector('h1', { timeout: 10000 })
}
const resultCount = async (page) => {
  // Results render after the lazy route chunk loads: wait for the status line, then count.
  await page.getByRole('status').filter({ hasText: /Showing \d+ of/ }).waitFor({ timeout: 8000 })
  return page.locator('ul[aria-label="Search results"] > li').count()
}

console.log(`\nNoteNest smoke test against ${BASE}\n`)

// ------------------------------------------------------------------ routes
await check('all main routes load with a heading', async () => {
  const page = await newPage()
  const routes = {
    '/': /Your Semester/,
    '/explore': /Explore notes/,
    '/pyqs': /PYQ library/,
    '/bookmarks': /Bookmarks/,
    '/planner': /Study planner/,
    '/subjects/dbms': /Database Management Systems/,
    '/resources/dbms-er-model-relational': /ER Model and Relational Model/,
  }
  for (const [route, re] of Object.entries(routes)) {
    await go(page, route)
    const h1 = await page.locator('h1').first().innerText()
    ok(re.test(h1), `route ${route} heading was "${h1}"`)
  }
  await page.context().close()
})

await check('invalid subject / resource / route show friendly not-found', async () => {
  const page = await newPage()
  for (const [route, text] of [
    ['/subjects/nope', 'Subject not found'],
    ['/resources/nope', 'Resource not found'],
    ['/totally/unknown', 'Page not found'],
  ]) {
    await page.goto(`${BASE}/#${route}`)
    await page.getByRole('heading', { name: text }).waitFor({ timeout: 8000 })
  }
  await page.context().close()
})

// ------------------------------------------------------------------ landing
await check('landing: sections present and hero search navigates to Explore', async () => {
  const page = await newPage()
  await go(page, '/')
  for (const t of ['Start from where you are', 'Core subjects, covered end to end', 'Fresh on NoteNest', 'Students keep coming back to these', 'Everything you need to study smarter']) {
    await page.getByRole('heading', { name: t }).waitFor({ timeout: 5000 })
  }
  await page.getByRole('searchbox', { name: 'Search all notes' }).fill('normalization')
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  await page.waitForURL(/#\/explore\?q=normalization/)
  ok((await resultCount(page)) >= 1, 'expected results for "normalization"')
  await page.context().close()
})

await check('landing: semester card opens filtered Explore', async () => {
  const page = await newPage()
  await go(page, '/')
  await page.getByRole('link', { name: /^Semester 4:/ }).click()
  await page.waitForURL(/semester=4/)
  const n = await resultCount(page)
  eq(n, 3, 'semester 4 resources (OS x3)')
  await page.context().close()
})

// ------------------------------------------------------------------ search & filters
await check('explore: search by title / topic / subject / tag', async () => {
  const page = await newPage()
  await go(page, '/explore')
  eq(await resultCount(page), 28, 'initial count')
  const box = page.getByRole('searchbox', { name: 'Search notes' })
  const cases = [['round robin', 1], ['Operating Systems', 3], ['subnetting', 2], ['sql', 3], ['dijkstra', 2]]
  for (const [q, min] of cases) {
    await box.fill(q)
    const n = await resultCount(page)
    ok(n >= min, `"${q}" gave ${n}, expected at least ${min}`)
  }
  await box.fill('zzzzqqq')
  await page.getByText('No resources match your search').waitFor()
  await page.getByRole('button', { name: 'Clear all filters' }).click()
  eq(await resultCount(page), 28, 'after clearing')
  await page.context().close()
})

await check('explore: filters work individually and together; subject list follows semester', async () => {
  const page = await newPage()
  await go(page, '/explore')
  await page.getByLabel('Semester').selectOption('3')
  eq(await resultCount(page), 8, 'semester 3 = DBMS(4)+Web(4)')
  // subject options narrowed to semester 3
  const opts = await page.getByLabel('Subject', { exact: true }).locator('option').allInnerTexts()
  eq(opts.join('|'), 'All subjects|Database Management Systems|Web Development', 'subject options')
  await page.getByLabel('Subject', { exact: true }).selectOption('dbms')
  eq(await resultCount(page), 4, 'dbms in sem 3')
  await page.getByRole('button', { name: 'PYQ', exact: true }).click()
  eq(await resultCount(page), 1, 'dbms + pyq')
  // changing semester drops stale subject
  await page.getByLabel('Semester').selectOption('4')
  eq(await page.getByLabel('Subject', { exact: true }).inputValue(), '', 'stale subject cleared')
  eq(await resultCount(page), 1, 'sem 4 + pyq (OS paper)')
  // sort
  await page.getByLabel('Semester').selectOption('')
  await page.getByRole('button', { name: 'All', exact: true }).click()
  await page.getByLabel('Sort by').selectOption('title')
  const titles = await page.locator('ul[aria-label="Search results"] h3').allInnerTexts()
  const sorted = [...titles].sort((a, b) => a.localeCompare(b))
  eq(titles.join('|'), sorted.join('|'), 'title sort order')
  // URL state survives reload
  await page.getByLabel('Semester').selectOption('5')
  await page.reload()
  await page.waitForSelector('h1')
  eq(await page.getByLabel('Semester').inputValue(), '5', 'filter state restored from URL')
  await page.context().close()
})

await check('pyq library: filter by subject, semester, year', async () => {
  const page = await newPage()
  await go(page, '/pyqs')
  eq(await page.locator('ul[aria-label="Question papers"] > li').count(), 8, 'all pyqs')
  await page.getByLabel('Year').selectOption('2025')
  eq(await page.locator('ul[aria-label="Question papers"] > li').count(), 3, '2025 papers')
  await page.getByLabel('Semester').selectOption('3')
  eq(await page.locator('ul[aria-label="Question papers"] > li').count(), 1, '2025 + sem 3')
  await page.getByLabel('Semester').selectOption('6')
  await page.getByText('No papers match these filters').waitFor()
  await page.context().close()
})

// ------------------------------------------------------------------ subject + resource
await check('subject detail: units, counts, related resources, breadcrumb', async () => {
  const page = await newPage()
  await go(page, '/subjects/os')
  await page.getByRole('heading', { name: 'Units and chapters' }).waitFor()
  await page.getByRole('navigation', { name: 'Breadcrumb' }).waitFor()
  ok((await page.locator('main ul[aria-label="Notes"] > li').count()) === 2, 'OS has 2 notes')
  await page.getByRole('heading', { name: /Previous year question papers/ }).waitFor()
  await page.context().close()
})

await check('resource detail: PDF is real, previews, downloads with a proper filename', async () => {
  const page = await newPage()
  await go(page, '/resources/dbms-er-model-relational')
  const obj = page.locator('object[type="application/pdf"]')
  await obj.waitFor({ state: 'attached' })
  const data = await obj.getAttribute('data')
  const url = new URL(data.replace(/#.*/, ''), page.url()).toString()
  const res = await page.request.get(url)
  eq(res.status(), 200, 'pdf http status')
  ok((res.headers()['content-type'] || '').includes('pdf'), `content-type ${res.headers()['content-type']}`)
  const body = await res.body()
  eq(body.subarray(0, 5).toString(), '%PDF-', 'pdf magic')
  const [dl] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('link', { name: /Download PDF: ER Model/ }).first().click(),
  ])
  eq(dl.suggestedFilename(), 'notenest-er-model-and-relational-model.pdf', 'download filename')
  await page.context().close()
})

await check('resource detail: a missing PDF shows a graceful message', async () => {
  expectedErrors.push('cn-layered-models.pdf')
  const page = await newPage()
  await page.route('**/pdfs/cn-layered-models.pdf', (route) => route.fulfill({ status: 404, body: 'nope' }))
  await go(page, '/resources/cn-layered-models')
  await page.getByRole('heading', { name: 'This PDF could not be found' }).waitFor({ timeout: 8000 })
  eq(await page.locator('object').count(), 0, 'no broken embed')
  await page.context().close()
})

await check('every catalog PDF is reachable', async () => {
  const page = await newPage()
  await go(page, '/explore')
  const hrefs = await page.locator('ul[aria-label="Search results"] a[download]').evaluateAll((els) => els.map((e) => e.href))
  eq(hrefs.length, 28, 'download links')
  for (const h of hrefs) {
    const r = await page.request.get(h)
    ok(r.status() === 200 && (await r.body()).subarray(0, 5).toString() === '%PDF-', `bad pdf ${h}`)
  }
  await page.context().close()
})

// ------------------------------------------------------------------ persistence
await check('bookmarks persist across refresh and appear on Bookmarks page', async () => {
  const page = await newPage()
  await go(page, '/resources/dbms-er-model-relational')
  const btn = page.getByRole('button', { name: 'Bookmark', exact: true })
  await btn.click()
  await page.getByRole('button', { name: 'Bookmarked', exact: true }).waitFor()
  await page.reload()
  await page.getByRole('button', { name: 'Bookmarked', exact: true }).waitFor()
  await go(page, '/bookmarks')
  eq(await page.locator('ul[aria-label="Bookmarked resources"] > li').count(), 1, 'bookmarked items')
  // unbookmark from the card
  await page.getByRole('button', { name: /^Remove bookmark:/ }).click()
  await page.getByText('No bookmarks yet').waitFor()
  await page.reload()
  await page.getByText('No bookmarks yet').waitFor()
  await page.context().close()
})

await check('bookmarks: unknown ids in storage are ignored, corrupt storage does not crash', async () => {
  const page = await newPage()
  await page.addInitScript(() => {
    if (!location.protocol.startsWith('http')) return // skip about:blank
    localStorage.setItem('notenest:bookmarks:v1', JSON.stringify(['ghost-id', 'os-practice-paper']))
    localStorage.setItem('notenest:tasks:v1', '{not json')
    localStorage.setItem('notenest:theme:v1', '"purple"')
  })
  await go(page, '/bookmarks')
  eq(await page.locator('ul[aria-label="Bookmarked resources"] > li').count(), 1, 'only the valid id shows')
  await go(page, '/planner')
  await page.getByText('No tasks yet').waitFor()
  await page.context().close()
})

await check('study planner: add, complete, progress, persist, remove', async () => {
  const page = await newPage()
  await go(page, '/planner')
  await page.getByText('No tasks yet').waitFor()
  // empty submit is rejected with a message
  await page.getByRole('button', { name: 'Add task' }).click()
  await page.getByText('Please describe the task').waitFor()
  await page.getByLabel('New task').fill('Revise normal forms')
  await page.getByLabel('Subject (optional)').selectOption('dbms')
  await page.getByRole('button', { name: 'Add task' }).click()
  await page.getByLabel('New task').fill('Solve OS scheduling problems')
  await page.getByRole('button', { name: 'Add task' }).click()
  eq(await page.getByRole('checkbox').count(), 2, 'two tasks')
  const bar = page.getByRole('progressbar')
  eq(await bar.getAttribute('aria-valuenow'), '0', 'initial progress')
  await page.getByRole('checkbox', { name: 'Revise normal forms' }).check()
  eq(await bar.getAttribute('aria-valuenow'), '50', 'half done')
  await page.reload()
  await page.waitForSelector('h1')
  eq(await page.getByRole('checkbox').count(), 2, 'tasks persisted')
  eq(await page.getByRole('progressbar').getAttribute('aria-valuenow'), '50', 'progress persisted')
  await page.getByRole('button', { name: 'Done', exact: true }).click()
  eq(await page.getByRole('checkbox').count(), 1, 'done filter')
  await page.getByRole('button', { name: 'Clear completed' }).click()
  await page.getByText('Nothing completed yet').waitFor()
  await page.getByRole('button', { name: 'All', exact: true }).click()
  await page.getByRole('button', { name: /Delete task: Solve OS/ }).click()
  await page.getByText('No tasks yet').waitFor()
  await page.context().close()
})

await check('dark mode toggles and persists across reload', async () => {
  const page = await newPage({ colorScheme: 'light' })
  await go(page, '/')
  const isDark = () => page.evaluate(() => document.documentElement.classList.contains('dark'))
  eq(await isDark(), false, 'starts light')
  await page.getByRole('button', { name: 'Switch to dark mode' }).click()
  eq(await isDark(), true, 'dark after toggle')
  await page.reload()
  eq(await isDark(), true, 'dark after reload')
  await page.getByRole('button', { name: 'Switch to light mode' }).click()
  await page.reload()
  eq(await isDark(), false, 'light persisted')
  await page.context().close()
})

// ------------------------------------------------------------------ mobile
await check('mobile: navigation menu opens, navigates, closes; no horizontal scroll', async () => {
  const page = await newPage({ viewport: { width: 375, height: 740 }, isMobile: true, hasTouch: true })
  await go(page, '/')
  await page.getByRole('navigation', { name: 'Primary' }).waitFor({ state: 'hidden' })
  const menu = page.getByRole('button', { name: 'Open menu' })
  await menu.click()
  await page.getByRole('navigation', { name: 'Mobile' }).waitFor()
  await page.keyboard.press('Escape')
  await page.getByRole('navigation', { name: 'Mobile' }).waitFor({ state: 'hidden' })
  await page.getByRole('button', { name: 'Open menu' }).click()
  await page.getByRole('navigation', { name: 'Mobile' }).getByRole('link', { name: 'Planner' }).click()
  await page.waitForURL(/#\/planner/)
  await page.getByRole('navigation', { name: 'Mobile' }).waitFor({ state: 'hidden' })
  for (const route of ['/', '/explore', '/pyqs', '/planner', '/subjects/cn', '/resources/cn-layered-models']) {
    await go(page, route)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - 375) // device width, not the (expandable) layout viewport
    ok(await page.evaluate(() => window.innerWidth) <= 376, 'layout viewport grew beyond device width')
    ok(overflow <= 1, `horizontal overflow of ${overflow}px on ${route}`)
  }
  // filters collapse on mobile and can be opened
  await go(page, '/explore')
  await page.getByRole('button', { name: /Filters & sort/ }).click()
  await page.getByLabel('Semester').selectOption('2')
  eq(await resultCount(page), 4, 'sem 2 on mobile')
  await page.context().close()
})

await check('keyboard: skip link focuses main without breaking the router', async () => {
  const page = await newPage()
  await go(page, '/explore')
  await page.keyboard.press('Tab')
  await page.getByRole('link', { name: 'Skip to main content' }).click()
  ok(page.url().includes('#/explore'), `url changed to ${page.url()}`)
  eq(await page.evaluate(() => document.activeElement?.id), 'main', 'main focused')
  await page.context().close()
})

await browser.close()

// ------------------------------------------------------------------ console
const failed = results.filter((r) => !r.ok)
console.log('\nBrowser console / network problems:')
// Intentional: the invalid-route test never requests missing assets, so any entry here is real.
const real = consoleProblems.filter((p) => !/favicon/.test(p))
if (real.length) real.forEach((p) => console.log('  -', p))
else console.log('  none')

console.log(`\n${results.length - failed.length}/${results.length} checks passed${real.length ? `, ${real.length} console/network problem(s)` : ''}`)
process.exit(failed.length || real.length ? 1 : 0)
