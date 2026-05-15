import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import {
  buildConsultationSections,
  buildPartialCastingSections,
  castingSection,
  consultationConsoleOutput,
} from '../src/cli-utils-output'
import { emptyPartialCastingRecord } from '../src/types'
import { cases } from './fixtures/cases'

const fixturesDirectory = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
)

// A casting record reused by the `buildConsultationSections` shape tests below.
const sampleCasting = cases[0].casting

// Strips ANSI SGR escape sequences from rendered output so colour markup
// doesn't perturb structural comparisons. Hoisted to module scope so it isn't
// recreated for every assertion.
// oxlint-disable-next-line no-control-regex
const stripAnsi = (text: string): string => text.replaceAll(/\[[0-9;]*m/g, '')

const borderColumns = (row: string): number[] => {
  const positions: number[] = []
  const plain = stripAnsi(row)
  for (const [index, character] of [...plain].entries()) {
    if (character === '│') positions.push(index)
  }
  return positions
}

const dataRowsOf = (rendered: string): string[] =>
  rendered.split('\n').filter((row) => /^│ {2,4}\d │/.test(stripAnsi(row)))

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

// `castingSection` accepts a `PartialCastingRecord` so the same renderer is
// reused while the casting is still being collected by the interactive viewer.
// Border characters must never shift as cells fill in — verified by structural
// `indexOf('│')` comparisons against the fully-populated rendering.
describe('castingSection (partial)', () => {
  it('renders an all-empty grid with the same column boundaries as a full grid', () => {
    const empty = castingSection(emptyPartialCastingRecord())
    const full = castingSection(sampleCasting)
    const emptyRows = dataRowsOf(empty)
    const fullRows = dataRowsOf(full)
    expect(emptyRows).toHaveLength(6)
    expect(fullRows).toHaveLength(6)
    for (const [index, fullRow] of fullRows.entries()) {
      expect(borderColumns(emptyRows[index])).toEqual(borderColumns(fullRow))
    }
  })

  it('renders a `·` placeholder for null cells', () => {
    const empty = castingSection(emptyPartialCastingRecord())
    // 6 lines × 3 casts × 2 sub-columns (Stalks + Split) = 36 dots.
    const dots = (stripAnsi(empty).match(/·/g) ?? []).length
    expect(dots).toBe(36)
  })

  it('shows populated cells alongside placeholders when partially filled', () => {
    const mixed = emptyPartialCastingRecord()
    mixed[0][0] = { pick: 24, max: 48 }
    const rendered = stripAnsi(castingSection(mixed))
    // Line 1's first cast cell shows `48` (Stalks) and `24` (Split); the
    // remaining 17 cells stay as `·` placeholders.
    expect(rendered).toContain(' 48 ')
    expect(rendered).toContain(' 24 ')
    expect((rendered.match(/·/g) ?? []).length).toBe(34)
  })
})

describe('buildPartialCastingSections', () => {
  it('returns the query and casting sections only', () => {
    const sections = buildPartialCastingSections(
      'Will the harvest be plentiful?',
      emptyPartialCastingRecord(),
    )
    expect(sections.query).toContain('QUERY:')
    expect(sections.query).toContain('Will the harvest be plentiful?')
    expect(sections.casting).toContain('CASTING:')
    expect(Object.keys(sections).toSorted()).toEqual(['casting', 'query'])
  })
})
