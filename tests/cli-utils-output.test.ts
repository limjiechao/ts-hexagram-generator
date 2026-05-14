import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import {
  buildConsultationSections,
  consultationConsoleOutput,
} from '../src/cli-utils-output'
import type { Hexagram } from '../src/types'

const fixturesDirectory = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
)

const cases: { name: string; query: string; hexagram: Hexagram }[] = [
  {
    name: 'no-moving',
    query: 'Will the harvest be plentiful?',
    hexagram: [7, 8, 7, 8, 7, 8],
  },
  {
    name: 'one-moving',
    query: 'Should I take the new position?',
    hexagram: [6, 7, 8, 7, 8, 7],
  },
  {
    name: 'multi-moving',
    query: 'How will the journey unfold?',
    hexagram: [6, 9, 7, 8, 7, 8],
  },
  { name: 'empty-query', query: '', hexagram: [7, 7, 7, 7, 7, 7] },
]

// Guards that the refactor into section builders kept the plain console
// output (and therefore the saved consultation file) byte-for-byte identical.
// The fixtures were captured from the pre-refactor implementation.
describe('consultationConsoleOutput', () => {
  for (const { name, query, hexagram } of cases) {
    it(`is byte-identical to the captured fixture (${name})`, () => {
      const expected = readFileSync(
        path.join(fixturesDirectory, `plain-output-${name}.txt`),
        'utf8',
      )
      expect(consultationConsoleOutput(query, hexagram)).toBe(expected)
    })
  }
})

describe('buildConsultationSections', () => {
  it('omits the resultant section when there are no moving lines', () => {
    const sections = buildConsultationSections('q', [7, 8, 7, 8, 7, 8])
    expect(sections.resultant).toBeNull()
    expect(sections.transformation).toContain('(No transformation)')
  })

  it('includes the resultant section for one moving line', () => {
    const sections = buildConsultationSections('q', [6, 7, 8, 7, 8, 7])
    expect(sections.resultant).not.toBeNull()
    expect(sections.originating).toContain('(One moving line)')
  })

  it('includes the resultant section for multiple moving lines', () => {
    const sections = buildConsultationSections('q', [6, 9, 7, 8, 7, 8])
    expect(sections.resultant).not.toBeNull()
    expect(sections.originating).toContain('(Multiple moving lines)')
  })

  it('always populates the query and transformation sections', () => {
    const sections = buildConsultationSections('', [7, 7, 7, 7, 7, 7])
    expect(sections.query).toContain('QUERY:')
    expect(sections.query).toContain('(Query not provided)')
    expect(sections.transformation).toContain('TRANSFORMATION:')
  })
})
