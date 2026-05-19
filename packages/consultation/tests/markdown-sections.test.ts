import { describe, expect, it } from 'vitest'

import { castingMarkdownSection } from '../src/markdown-sections'

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
})
