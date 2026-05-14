import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import {
  buildConsultationSections,
  consultationConsoleOutput,
} from '../src/cli-utils-output'
import { cases } from './fixtures/cases'

const fixturesDirectory = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
)

// A casting record reused by the `buildConsultationSections` shape tests below.
const sampleCasting = cases[0].casting

// Guards that the plain console output (and therefore the saved consultation
// file) stays byte-for-byte identical. Regenerate with `pnpm generate-fixtures`
// after intentionally changing a section builder.
describe('consultationConsoleOutput', () => {
  for (const { name, query, hexagram, casting } of cases) {
    it(`is byte-identical to the captured fixture (${name})`, () => {
      const expected = readFileSync(
        path.join(fixturesDirectory, `plain-output-${name}.txt`),
        'utf8',
      )
      expect(consultationConsoleOutput(query, hexagram, casting)).toBe(expected)
    })
  }
})

describe('buildConsultationSections', () => {
  it('omits the resultant section when there are no moving lines', () => {
    const sections = buildConsultationSections(
      'q',
      [7, 8, 7, 8, 7, 8],
      sampleCasting,
    )
    expect(sections.resultant).toBeNull()
    expect(sections.transformation).toContain('(No transformation)')
  })

  it('includes the resultant section for one moving line', () => {
    const sections = buildConsultationSections(
      'q',
      [6, 7, 8, 7, 8, 7],
      sampleCasting,
    )
    expect(sections.resultant).not.toBeNull()
    expect(sections.originating).toContain('(One moving line)')
  })

  it('includes the resultant section for multiple moving lines', () => {
    const sections = buildConsultationSections(
      'q',
      [6, 9, 7, 8, 7, 8],
      sampleCasting,
    )
    expect(sections.resultant).not.toBeNull()
    expect(sections.originating).toContain('(Multiple moving lines)')
  })

  it('always populates the query, casting and transformation sections', () => {
    const sections = buildConsultationSections(
      '',
      [7, 7, 7, 7, 7, 7],
      sampleCasting,
    )
    expect(sections.query).toContain('QUERY:')
    expect(sections.query).toContain('(Query not provided)')
    expect(sections.casting).toContain('CASTING:')
    expect(sections.transformation).toContain('TRANSFORMATION:')
  })
})
