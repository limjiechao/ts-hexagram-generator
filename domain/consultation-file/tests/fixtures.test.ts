import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { serializeFrontmatter } from '../src/frontmatter.js'
import { markdownConsultationBody } from '../src/markdown.js'
import { cases, FIXTURE_TIMESTAMP } from './fixtures/cases.js'

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures')

describe('markdown body fixtures', () => {
  for (const { name, query, hexagram, casting } of cases) {
    it(`is byte-identical for case "${name}"`, () => {
      const body = markdownConsultationBody(query, hexagram, casting)
      const golden = readFileSync(path.join(dir, `md-body-${name}.md`), 'utf8')
      expect(body).toBe(golden)
    })
  }
})

describe('full markdown file fixtures', () => {
  for (const { name, query, hexagram, casting } of cases) {
    it(`is byte-identical for case "${name}"`, () => {
      const text = serializeFrontmatter(
        {
          schemaVersion: 1,
          timestamp: FIXTURE_TIMESTAMP,
          query,
          hexagram,
          casting,
        },
        markdownConsultationBody(query, hexagram, casting),
      )
      const golden = readFileSync(path.join(dir, `md-file-${name}.md`), 'utf8')
      expect(text).toBe(golden)
    })
  }
})
