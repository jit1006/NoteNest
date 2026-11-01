// Run with: node scripts/test-logic.ts   (Node >= 22.18 strips types natively)
import assert from 'node:assert/strict'
import {
  filterResources,
  filtersFromParams,
  paramsFromFilters,
  queryResources,
  sortFromParams,
} from '../src/utils/filterResources.ts'
import { downloadName, ordinal } from '../src/utils/format.ts'

type R = Parameters<typeof filterResources>[0][number]
const mk = (o: Partial<R> & { id: string }): R => ({
  title: o.id, description: '', semester: 1, subjectId: 'a', subjectName: 'Alpha', unit: 'Unit 1',
  topic: '', resourceType: 'notes', pdfUrl: `./pdfs/${o.id}.pdf`, tags: [], createdAt: '2026-01-01', ...o,
})

const data: R[] = [
  mk({ id: 'er', title: 'ER Model', subjectId: 'dbms', subjectName: 'Database Management Systems', semester: 3, tags: ['keys'], createdAt: '2026-10-01' }),
  mk({ id: 'sql', title: 'SQL Essentials', subjectId: 'dbms', subjectName: 'Database Management Systems', semester: 3, resourceType: 'reference', createdAt: '2026-10-05' }),
  mk({ id: 'dbms-paper', title: 'DBMS Paper', subjectId: 'dbms', subjectName: 'Database Management Systems', semester: 3, resourceType: 'pyq', year: 2025, createdAt: '2026-10-03' }),
  mk({ id: 'os-paper', title: 'OS Paper', subjectId: 'os', subjectName: 'Operating Systems', semester: 4, resourceType: 'pyq', year: 2024, createdAt: '2026-09-03' }),
  mk({ id: 'sched', title: 'CPU Scheduling', subjectId: 'os', subjectName: 'Operating Systems', semester: 4, topic: 'Round Robin', tags: ['process'], createdAt: '2026-09-10' }),
]
const ids = (l: R[]) => l.map((r) => r.id).sort()
let n = 0
const t = (name: string, fn: () => void) => { fn(); n++; console.log('  ok -', name) }

t('empty filters return everything', () => assert.equal(filterResources(data, {}).length, 5))
t('search matches title, case-insensitive', () => assert.deepEqual(ids(filterResources(data, { q: 'sql' })), ['sql']))
t('search matches topic', () => assert.deepEqual(ids(filterResources(data, { q: 'round robin' })), ['sched']))
t('search matches subject name', () => assert.equal(filterResources(data, { q: 'database' }).length, 3))
t('search matches tags', () => assert.deepEqual(ids(filterResources(data, { q: 'KEYS' })), ['er']))
t('multi-word search is AND', () => assert.deepEqual(ids(filterResources(data, { q: 'operating paper' })), ['os-paper']))
t('search with no hits is empty', () => assert.equal(filterResources(data, { q: 'zzz' }).length, 0))
t('semester filter', () => assert.equal(filterResources(data, { semester: 4 }).length, 2))
t('subject filter', () => assert.equal(filterResources(data, { subjectId: 'dbms' }).length, 3))
t('type filter', () => assert.deepEqual(ids(filterResources(data, { type: 'pyq' })), ['dbms-paper', 'os-paper']))
t('year filter', () => assert.deepEqual(ids(filterResources(data, { year: 2025 })), ['dbms-paper']))
t('filters combine (AND)', () => {
  assert.deepEqual(ids(filterResources(data, { semester: 3, type: 'pyq' })), ['dbms-paper'])
  assert.deepEqual(ids(filterResources(data, { q: 'paper', subjectId: 'os', semester: 4, type: 'pyq', year: 2024 })), ['os-paper'])
  assert.equal(filterResources(data, { semester: 4, subjectId: 'dbms' }).length, 0)
})
t('sort newest/oldest', () => {
  assert.equal(queryResources(data, {}, 'newest')[0].id, 'sql')
  assert.equal(queryResources(data, {}, 'oldest')[0].id, 'os-paper')
})
t('sort title and subject', () => {
  assert.equal(queryResources(data, {}, 'title')[0].id, 'sched')
  assert.equal(queryResources(data, {}, 'subject')[0].subjectName, 'Database Management Systems')
})
t('sorting does not mutate input', () => { const copy = [...data]; queryResources(data, {}, 'title'); assert.deepEqual(data, copy) })
t('URL params round-trip', () => {
  const f = { q: 'tcp ip', semester: 5, subjectId: 'cn', type: 'notes' as const, year: null }
  const p = paramsFromFilters(f, 'title')
  assert.deepEqual(filtersFromParams(p), f)
  assert.equal(sortFromParams(p), 'title')
})
t('invalid URL params are ignored', () => {
  const f = filtersFromParams(new URLSearchParams('semester=abc&type=bogus&year=x&sort=nope'))
  assert.equal(f.semester, null); assert.equal(f.type, null); assert.equal(f.year, null)
  assert.equal(sortFromParams(new URLSearchParams('sort=nope')), 'newest')
})
t('format helpers', () => {
  assert.equal(ordinal(1), '1st'); assert.equal(ordinal(12), '12th'); assert.equal(ordinal(23), '23rd')
  assert.equal(downloadName('SQL: Essentials & More!', 'x'), 'notenest-sql-essentials-more.pdf')
})

console.log(`\n${n} logic checks passed`)
