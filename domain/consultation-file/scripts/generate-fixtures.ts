import { writeFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { serializeFrontmatter } from '../src/frontmatter.js'
import { markdownConsultationBody } from '../src/markdown.js'
import { cases, FIXTURE_TIMESTAMP } from '../tests/fixtures/cases.js'

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'tests',
  'fixtures',
)

for (const { name, query, hexagram, casting } of cases) {
  const body = markdownConsultationBody(query, hexagram, casting)
  writeFileSync(path.join(fixturesDir, `md-body-${name}.md`), body, 'utf8')
  process.stdout.write(`Wrote md-body-${name}.md\n`)

  const fullFile = serializeFrontmatter(
    {
      schemaVersion: 1,
      timestamp: FIXTURE_TIMESTAMP,
      query,
      hexagram,
      casting,
    },
    body,
  )
  writeFileSync(path.join(fixturesDir, `md-file-${name}.md`), fullFile, 'utf8')
  process.stdout.write(`Wrote md-file-${name}.md\n`)
}
