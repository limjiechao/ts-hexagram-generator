import { describe, expect, it } from 'vitest'

import { computeAutoScrollOffset } from '../src/auto-scroll-offset.js'

// The casting table is 28 content rows -> 30 with breathers (totalRows = 30).
describe('computeAutoScrollOffset', () => {
  it('pins line 1 (row 27) to the bottom on a short viewport', () => {
    // viewportHeight 5 -> maxOffset 30 - 5 = 25. windowedRow 28, margin keeps
    // one row below -> offset clamps to the bottom (maxOffset).
    expect(
      computeAutoScrollOffset({ row: 27, viewportHeight: 5, maxOffset: 25 }),
    ).toBe(25)
  })

  it('clamps line 6 (row 7) to the top on a tall viewport', () => {
    // viewportHeight 20 -> maxOffset 30 - 20 = 10. windowedRow 8 sits high; the
    // bottom-align target goes negative and clamps to 0 (top of table).
    expect(
      computeAutoScrollOffset({ row: 7, viewportHeight: 20, maxOffset: 10 }),
    ).toBe(0)
  })

  it('keeps the active row visible at viewportHeight 1 (no overshoot)', () => {
    // The margin must collapse: without the clamp, target = windowedRow + 1
    // would scroll PAST the active row. Here it must land on the row itself.
    expect(
      computeAutoScrollOffset({ row: 27, viewportHeight: 1, maxOffset: 29 }),
    ).toBe(28)
  })
})
