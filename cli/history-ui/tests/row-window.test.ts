import { describe, expect, it } from 'vitest'

import { computeWindowStart, resolveRowWindow } from '../src/row-window'

describe('computeWindowStart', () => {
  it('pins to 0 when the whole list fits within the window', () => {
    expect(computeWindowStart(5, 10, 4, 0)).toBe(0)
    expect(computeWindowStart(10, 10, 9, 0)).toBe(0)
  })

  it('keeps the window stationary when focus is already visible', () => {
    // window [3..7], focus 5 is inside — no movement.
    expect(computeWindowStart(20, 5, 5, 3)).toBe(3)
  })

  it('scrolls up when focus moves above the current window', () => {
    // window [10..14], focus jumps to 2.
    expect(computeWindowStart(50, 5, 2, 10)).toBe(2)
  })

  it('scrolls down so the focused row lands on the last visible line', () => {
    // window [0..4], focus moves to 8 → start = 8 - 5 + 1 = 4.
    expect(computeWindowStart(50, 5, 8, 0)).toBe(4)
  })

  it('clamps the window start to the last full page', () => {
    // 50 rows, height 5 → maxStart = 45. Focus at the end.
    expect(computeWindowStart(50, 5, 49, 0)).toBe(45)
  })

  it('clamps a stale currentStart that is past the end', () => {
    expect(computeWindowStart(50, 5, 3, 999)).toBe(3)
  })

  it('handles focus near the top with a non-zero current start', () => {
    // window [20..24], focus 0 → scroll all the way up.
    expect(computeWindowStart(50, 5, 0, 20)).toBe(0)
  })

  it('handles focus mid-list with the window already framing it', () => {
    // window [22..31] (height 10), focus 27 stays put.
    expect(computeWindowStart(100, 10, 27, 22)).toBe(22)
  })

  it('returns 0 for degenerate inputs', () => {
    expect(computeWindowStart(0, 5, 0, 0)).toBe(0)
    expect(computeWindowStart(10, 0, 0, 0)).toBe(0)
  })
})

describe('resolveRowWindow', () => {
  it('reports no off-edge rows when everything fits', () => {
    expect(resolveRowWindow(4, 10, 1, 0)).toEqual({
      start: 0,
      end: 4,
      above: 0,
      below: 0,
    })
  })

  it('reports rows below when focus is at the top of a long list', () => {
    // 100 rows, height 10, focus 0 → window [0..10), 90 below.
    expect(resolveRowWindow(100, 10, 0, 0)).toEqual({
      start: 0,
      end: 10,
      above: 0,
      below: 90,
    })
  })

  it('reports rows above when focus is at the bottom of a long list', () => {
    // 100 rows, height 10, focus 99 → window [90..100), 90 above.
    expect(resolveRowWindow(100, 10, 99, 0)).toEqual({
      start: 90,
      end: 100,
      above: 90,
      below: 0,
    })
  })

  it('reports rows on both edges when focus is mid-list', () => {
    // window [20..30), focus 25 stays put → 20 above, 70 below.
    expect(resolveRowWindow(100, 10, 25, 20)).toEqual({
      start: 20,
      end: 30,
      above: 20,
      below: 70,
    })
  })

  it('clamps end to totalRows when the window straddles the end', () => {
    // 12 rows, height 10, focus 11 → start = 2, end = 12.
    expect(resolveRowWindow(12, 10, 11, 0)).toEqual({
      start: 2,
      end: 12,
      above: 2,
      below: 0,
    })
  })
})
