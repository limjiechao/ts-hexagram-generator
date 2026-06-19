import { describe, expect, it } from 'vitest'

import {
  LEDGER_COLUMNS,
  MOVING_ARROW,
  RIGHT_COLUMN,
  STATIC_GAP,
  TRIGRAM_DIVIDER_WIDTH,
} from '../src/geometry.js'

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
