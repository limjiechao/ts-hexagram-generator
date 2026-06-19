import { describe, expect, it } from 'vitest'

import { LINE_GLYPH, LINE_LABELS, POSITION_LABELS } from '../src/vocabulary.js'

describe('LINE_GLYPH', () => {
  it('maps each Line value to its diagram glyph (U+2715 for moving yin)', () => {
    expect(LINE_GLYPH).toEqual({
      6: '━━━ ✕ ━━━',
      7: '━━━━━━━━━',
      8: '━━━   ━━━',
      9: '━━━━○━━━━',
    })
  })
})

describe('POSITION_LABELS', () => {
  it('is bottom-first fullwidth ordinal labels', () => {
    expect(POSITION_LABELS).toEqual({
      1: '（初, 1st）',
      2: '（二, 2nd）',
      3: '（三, 3rd）',
      4: '（四, 4th）',
      5: '（五, 5th）',
      6: '（上, 6th）',
    })
  })
})

describe('LINE_LABELS', () => {
  it('fuses the classical ordinal glyph with the Arabic line number', () => {
    expect(LINE_LABELS).toEqual({
      1: '初1',
      2: '二2',
      3: '三3',
      4: '四4',
      5: '五5',
      6: '上6',
    })
  })
})
