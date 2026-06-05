import { describe, expect, it } from 'vitest'

import {
  hexagramDiagramRowStrings,
  transformationHalfRow,
  transformationRow,
} from '../src/diagram-template.js'
import { MOVING_ARROW, STATIC_GAP } from '../src/vocabulary.js'

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

  it('transformationHalfRow decorates the position cell when given a fourth callback', () => {
    const cell = { line: 8, position: 3 } as const
    const wrapCell = (t: string): string => `<${t}>`
    const wrapPos = (t: string): string => `[${t}]`
    expect(transformationHalfRow(cell, '  ', wrapCell, wrapPos)).toBe(
      `  <8>  <━━━   ━━━>  [（三, 3rd）]`,
    )
  })

  it('transformationHalfRow leaves the position cell undecorated by default', () => {
    const cell = { line: 8, position: 3 } as const
    const id = (t: string): string => t
    expect(transformationHalfRow(cell, '  ', id)).toBe(
      `  8  ━━━   ━━━  （三, 3rd）`,
    )
  })
})

describe('hexagramDiagramRowStrings', () => {
  const rows = [
    { line: 9, position: 6, moving: true },
    { line: 7, position: 5, moving: false },
    { line: 7, position: 4, moving: false },
    { line: 8, position: 3, moving: false },
    { line: 7, position: 2, moving: false },
    { line: 7, position: 1, moving: false },
  ] as const
  const identity = {
    upperTrigramImageryChinese: '天',
    upperTrigramImageryEnglish: 'Heaven',
    lowerTrigramImageryChinese: '澤',
    lowerTrigramImageryEnglish: 'Lake',
  }

  it('plain form: six brace rows with imagery on the middle rows', () => {
    const out = hexagramDiagramRowStrings(rows, identity, (t) => t)
    expect(out).toEqual([
      '  9  ━━━━○━━━━  （上, 6th）──┐',
      '  7  ━━━━━━━━━  （五, 5th）──┼── 天（上卦）',
      '  7  ━━━━━━━━━  （四, 4th）──┘   Heaven (upper trigram)',
      '  8  ━━━   ━━━  （三, 3rd）──┐',
      '  7  ━━━━━━━━━  （二, 2nd）──┼── 澤（下卦）',
      '  7  ━━━━━━━━━  （初, 1st）──┘   Lake (lower trigram)',
    ])
  })

  it('decorate wraps the value+glyph chunk, not the position or brace', () => {
    const out = hexagramDiagramRowStrings(rows, identity, (t) => `<${t}>`)
    expect(out[0]).toBe('  <9  ━━━━○━━━━  >（上, 6th）──┐')
  })
})
