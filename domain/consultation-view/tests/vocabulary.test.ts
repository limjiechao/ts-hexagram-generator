import { describe, expect, it } from 'vitest'

import {
  LEDGER_COLUMNS,
  LINE_GLYPH,
  LINE_LABELS,
  MOVING_ARROW,
  POSITION_LABELS,
  RIGHT_COLUMN,
  STATIC_GAP,
  TRIGRAM_DIVIDER_WIDTH,
} from '../src/vocabulary.js'

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

describe('LEDGER_COLUMNS', () => {
  it('is the twelve-column ledger geometry, in order', () => {
    expect(LEDGER_COLUMNS.map((c) => [c.key, c.header, c.width])).toEqual([
      ['line', '爻Line', 6],
      ['cast', '變Cast', 6],
      ['stalks', '蓍Stalks', 8],
      ['leftHeap', '左Heap', 6],
      ['leftPiles', '揲Fours', 7],
      ['leftRemainder', '扐Odd', 5],
      ['rightHeap', '右Heap', 6],
      ['rightPiles', '揲Fours', 7],
      ['held', '掛Held', 6],
      ['rightRemainder', '扐Odd', 5],
      ['setAside', '歸奇Aside', 9],
      ['sigma', '營Tally', 7],
    ])
  })
})

describe('transformation geometry', () => {
  it('pins the column + connector + divider constants', () => {
    expect(RIGHT_COLUMN).toBe(46)
    expect(MOVING_ARROW).toBe('─────────────────▶ ')
    expect(STATIC_GAP).toBe('                   ')
    expect(MOVING_ARROW).toHaveLength(STATIC_GAP.length)
    expect(TRIGRAM_DIVIDER_WIDTH).toBe(25)
  })
})
