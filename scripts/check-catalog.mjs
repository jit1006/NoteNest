// Verifies catalog integrity without a build: unique ids, valid subject refs,
// every referenced PDF exists, is a real PDF, and every PDF is referenced.
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const resSrc = readFileSync(join(root, 'src/data/resources.ts'), 'utf8')
const subSrc = readFileSync(join(root, 'src/data/subjects.ts'), 'utf8')

const subjectIds = [...subSrc.matchAll(/^\s{4}id: '([^']+)'/gm)].map((m) => m[1])
const seedBlock = resSrc.slice(resSrc.indexOf('const seeds'), resSrc.indexOf('const subjectById'))
const rows = [...seedBlock.matchAll(/\{\s*id: '([^']+)',\s*file: '([^']+)'[\s\S]*?subjectId: '([^']+)'[\s\S]*?type: '([^']+)'([\s\S]*?)\n  \},/g)]

const errors = []
const ids = new Set()
const files = new Set()
for (const [, id, file, subjectId, type, rest] of rows) {
  if (ids.has(id)) errors.push(`duplicate resource id: ${id}`)
  ids.add(id)
  files.add(file)
  if (!subjectIds.includes(subjectId)) errors.push(`${id}: unknown subjectId "${subjectId}"`)
  if (!['notes', 'pyq', 'reference'].includes(type)) errors.push(`${id}: invalid type "${type}"`)
  if (type === 'pyq' && !/year: \d{4}/.test(rest)) errors.push(`${id}: pyq without year`)
  const p = join(root, 'public/pdfs', `${file}.pdf`)
  if (!existsSync(p)) errors.push(`${id}: missing file public/pdfs/${file}.pdf`)
  else {
    if (statSync(p).size < 1000) errors.push(`${id}: PDF suspiciously small`)
    if (readFileSync(p).subarray(0, 5).toString() !== '%PDF-') errors.push(`${id}: not a PDF`)
  }
}

const seedCount = (seedBlock.match(/^\s{4}id: '/gm) || []).length
if (rows.length !== seedCount) errors.push(`parsed ${rows.length} rows but found ${seedCount} ids - check formatting`)
for (const f of readdirSync(join(root, 'public/pdfs'))) {
  if (f.endsWith('.pdf') && !files.has(f.slice(0, -4))) errors.push(`orphan PDF not in catalog: ${f}`)
}

if (errors.length) {
  console.error('Catalog check FAILED:\n - ' + errors.join('\n - '))
  process.exit(1)
}
console.log(`Catalog OK: ${rows.length} resources, ${subjectIds.length} subjects, all PDFs present.`)
