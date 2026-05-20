import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { emptyPartialCastingRecord } from '@hexagram/types'
import { describe, expect, it } from 'vitest'

import {
  buildConsultationSections,
  buildPartialCastingSections,
  consultationConsoleOutput,
} from '../src/output-composers'
import { castingSection } from '../src/output-sections'
import { cases } from './fixtures/cases'
import { STUB_STATIC_HEXAGRAM } from './helpers/stubs'

const fixturesDirectory = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
)

// A casting record reused by the `buildConsultationSections` shape tests below.
const [firstCase] = cases
if (firstCase === undefined) throw new Error('tests/fixtures/cases.ts is empty')
const sampleCasting = firstCase.casting

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

// Guards the Ink-side composer the same way the plain test guards the
// console output. Catches drift in `buildConsultationSections` that wouldn't
// otherwise surface — e.g. a structural change to a single section's string
// that the plain composer happens to mask via concatenation.
describe('buildConsultationSections (fixture parity)', () => {
  for (const { name, query, hexagram, casting } of cases) {
    it(`matches the captured ink-sections fixture (${name})`, () => {
      const expected = JSON.parse(
        readFileSync(
          path.join(fixturesDirectory, `ink-sections-${name}.json`),
          'utf8',
        ),
      )
      expect(buildConsultationSections(query, hexagram, casting)).toEqual(
        expected,
      )
    })
  }
})

describe('buildConsultationSections', () => {
  it('omits the emerging section when there are no moving lines', () => {
    const sections = buildConsultationSections(
      'q',
      STUB_STATIC_HEXAGRAM,
      sampleCasting,
    )
    expect(sections.emerging).toBeNull()
    expect(sections.transformation).toContain('(No transformation)')
  })

  it('includes the emerging section for one moving line', () => {
    const sections = buildConsultationSections(
      'q',
      [6, 7, 8, 7, 8, 7],
      sampleCasting,
    )
    expect(sections.emerging).not.toBeNull()
    expect(sections.standing).toContain('(One moving line)')
  })

  it('includes the emerging section for multiple moving lines', () => {
    const sections = buildConsultationSections(
      'q',
      [6, 9, 7, 8, 7, 8],
      sampleCasting,
    )
    expect(sections.emerging).not.toBeNull()
    expect(sections.standing).toContain('(Multiple moving lines)')
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
      const emptyRow = emptyRows[index]
      if (emptyRow === undefined) throw new Error(`row ${index} missing`)
      expect(borderColumns(emptyRow)).toEqual(borderColumns(fullRow))
    }
  })

  it('renders a `·` placeholder for null cells', () => {
    const empty = castingSection(emptyPartialCastingRecord())
    // 6 lines × 3 casts × 3 leaf sub-columns (Stalks + Heap.Left + Heap.Right) = 54 dots.
    const dots = (stripAnsi(empty).match(/·/g) ?? []).length
    expect(dots).toBe(54)
  })

  it('shows populated cells alongside placeholders when partially filled', () => {
    const mixed = emptyPartialCastingRecord()
    mixed[0][0] = { pick: 20, max: 48 }
    const rendered = stripAnsi(castingSection(mixed))
    // Line 1's first cast cell shows `48` (Stalks), `20` (Heap.Left), and
    // `28` (Heap.Right = max - pick); the remaining 17 cells stay as 3-dot
    // placeholders, so 54 − 3 = 51 dots remain.
    expect(rendered).toContain(' 48 ')
    expect(rendered).toContain(' 20 ')
    expect(rendered).toContain(' 28 ')
    expect((rendered.match(/·/g) ?? []).length).toBe(51)
  })

  it('renders "Casting not recorded" when casting is null', () => {
    const rendered = stripAnsi(castingSection(null))
    expect(rendered).toContain('CASTING:')
    expect(rendered).toContain('Casting not recorded')
    // No table is drawn for a null casting.
    expect(rendered).not.toContain('│')
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
