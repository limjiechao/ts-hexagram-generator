import { describe, expect, it } from 'vitest'

import { MOVING_ARROW, STATIC_GAP } from '../src/vocabulary.js'
import { transformationRow } from '../src/diagram-template.js'

const id = (t: string): string => t

describe('transformationRow', () => {
  it('plain (Markdown) form: indent, two-space separators, gap by moving', () => {
    const standing = { line: 9, position: 3, moving: true } as const
    const emerging = { line: 8, position: 3, moving: false } as const
    expect(transformationRow(standing, emerging, id, id)).toBe(
      `  9  ━━━━○━━━━  （三, 3rd）${MOVING_ARROW}8  ━━━   ━━━  （三, 3rd）`,
    )
  })

  it('static line uses STATIC_GAP', () => {
    const standing = { line: 7, position: 1, moving: false } as const
    const emerging = { line: 7, position: 1, moving: false } as const
    expect(transformationRow(standing, emerging, id, id)).toBe(
      `  7  ━━━━━━━━━  （初, 1st）${STATIC_GAP}7  ━━━━━━━━━  （初, 1st）`,
    )
  })

  it('decorate wraps value and glyph cells only (position untouched)', () => {
    const standing = { line: 9, position: 3, moving: true } as const
    const emerging = { line: 8, position: 3, moving: false } as const
    const wrap = (t: string): string => `<${t}>`
    expect(transformationRow(standing, emerging, wrap, wrap)).toBe(
      `  <9>  <━━━━○━━━━>  （三, 3rd）${MOVING_ARROW}<8>  <━━━   ━━━>  （三, 3rd）`,
    )
  })
})
