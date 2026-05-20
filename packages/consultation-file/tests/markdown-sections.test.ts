import { describe, expect, it } from 'vitest'

import {
  castingMarkdownSection,
  emergingHexagramMarkdownSection,
  linesMarkdownBlock,
  queryMarkdownSection,
  standingHexagramMarkdownSection,
  transformationMarkdownSection,
} from '../src/markdown-sections'

const casting = [
  [
    { pick: 27, max: 48 },
    { pick: 28, max: 43 },
    { pick: 30, max: 39 },
  ],
  [
    { pick: 22, max: 48 },
    { pick: 23, max: 43 },
    { pick: 29, max: 35 },
  ],
  [
    { pick: 17, max: 48 },
    { pick: 24, max: 43 },
    { pick: 14, max: 35 },
  ],
  [
    { pick: 22, max: 48 },
    { pick: 34, max: 43 },
    { pick: 25, max: 39 },
  ],
  [
    { pick: 10, max: 48 },
    { pick: 26, max: 43 },
    { pick: 33, max: 39 },
  ],
  [
    { pick: 12, max: 48 },
    { pick: 20, max: 39 },
    { pick: 18, max: 31 },
  ],
] as const

describe('castingMarkdownSection', () => {
  it('emits a ## CASTING header followed by a fenced text block with the hierarchical table', () => {
    const text = castingMarkdownSection(casting as never)
    expect(text).toMatch(/^## CASTING\n/)
    expect(text).toContain('```text\n')
    expect(text).toContain('\n```\n')
    expect(text).toContain('Cast') // banner row
    expect(text).toContain('1st')
    expect(text).toContain('Heap')
    expect(text).toContain('Stalks')
    expect(text).toContain('Left')
    expect(text).toContain('Right')
    expect(text).toContain('│ Line │') // header column label
    // Numeric values must appear in the table:
    expect(text).toContain('27')
    expect(text).toContain('33')
  })

  it('contains no ANSI escape codes', () => {
    const text = castingMarkdownSection(casting as never)
    // Check for ANSI escape sequences using Unicode escape
    const escapeChar = ''
    expect(text.includes(escapeChar)).toBe(false)
  })

  it('renders "Casting not recorded" when casting is null', () => {
    expect(castingMarkdownSection(null)).toBe(
      '## CASTING\n\n_Casting not recorded._\n',
    )
  })
})

describe('queryMarkdownSection', () => {
  it('emits ## QUERY and the query paragraph', () => {
    expect(queryMarkdownSection('Will it rain?')).toBe(
      '## QUERY\n\nWill it rain?\n',
    )
  })
  it('shows a placeholder for empty query', () => {
    expect(queryMarkdownSection('')).toBe(
      '## QUERY\n\n_(Query not provided)_\n',
    )
  })
})

describe('transformationMarkdownSection', () => {
  it('emits an italic caption for no moving lines', () => {
    const text = transformationMarkdownSection([7, 8, 7, 8, 7, 8])
    expect(text).toMatch(/^## TRANSFORMATION\n\n_\(No transformation\)_\n$/)
  })

  it('emits a fenced text block for moving lines', () => {
    const text = transformationMarkdownSection([6, 7, 8, 7, 8, 7])
    expect(text).toMatch(/^## TRANSFORMATION\n/)
    expect(text).toContain('```text\n')
    expect(text).toContain('Standing')
    expect(text).toContain('Emerging')
    expect(text).toContain('▶')
  })
})

describe('standingHexagramMarkdownSection', () => {
  it('emits ## STANDING HEXAGRAM <N> with translations', () => {
    const text = standingHexagramMarkdownSection([7, 8, 7, 8, 7, 8])
    expect(text).toMatch(/^## STANDING HEXAGRAM 63\n/)
    expect(text).toContain('_Line at bottom is first._')
    expect(text).toContain('```text\n')
    expect(text).toContain('_First is line at bottom._')
    expect(text).toContain('### Traditional Chinese')
    expect(text).toContain('### Simplified Chinese')
    expect(text).toContain('### English, Wilhelm-Baynes')
    expect(text).toContain('### English, James Legge')
    // Name + pronunciation appear directly under each translation heading:
    expect(text).toContain('既濟（ㄐㄧˋ ㄐㄧˋ）')
    expect(text).toContain('Chi Chi / After Completion')
  })
})

describe('emergingHexagramMarkdownSection', () => {
  it('emits ## EMERGING HEXAGRAM <N>', () => {
    const text = emergingHexagramMarkdownSection([6, 7, 8, 7, 8, 7])
    expect(text).toMatch(/^## EMERGING HEXAGRAM 38\n/)
  })
})

describe('linesMarkdownBlock', () => {
  it('emits one-moving-line mode', () => {
    const text = linesMarkdownBlock([6, 7, 8, 7, 8, 7])
    expect(text).toMatch(/^## LINES\n/)
    expect(text).toContain('_One moving line._')
    expect(text).toContain('### Traditional Chinese')
    expect(text).toContain('#### Scripture')
    expect(text).toContain('#### Exegesis')
  })
  it('emits no-moving-lines mode', () => {
    const text = linesMarkdownBlock([7, 8, 7, 8, 7, 8])
    expect(text).toContain('_No moving lines._')
    expect(text).toContain('#### Scripture')
    expect(text).toContain('#### Exegesis')
  })
  it('emits multiple-moving-lines mode', () => {
    const text = linesMarkdownBlock([6, 9, 7, 8, 7, 8])
    expect(text).toContain('_Multiple moving lines._')
    expect(text).toContain(
      'No available reference scripture or exegesis for multiple moving lines.',
    )
  })
})
