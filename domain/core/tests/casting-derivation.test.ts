import { describe, expect, it } from 'vitest'

import {
  assertSelectablePick,
  deriveSplit,
  neverZeroMod4,
  selectablePickMax,
  stalkCountFor,
} from '../src/casting-derivation.js'
import type { SplitRecord } from '../src/types.js'

describe('selectablePickMax', () => {
  it('is one below the recorded max (reserving a second, countable stalk)', () => {
    // `recordedMax` (= stalks - 1) already reserves the suspended stalk (掛一);
    // the selectable ceiling holds back a SECOND stalk so the right heap's
    // remainder stays 1..4, never 0.
    expect(selectablePickMax(48)).toBe(47)
    expect([48, 43, 39, 32, 13].map(selectablePickMax)).toEqual([
      47, 42, 38, 31, 12,
    ])
  })

  it('agrees with deriveSplit: pick = selectablePickMax keeps both remainders in 1..4', () => {
    for (const max of [48, 43, 39, 32, 13]) {
      const d = deriveSplit({ pick: selectablePickMax(max), max })
      expect(d.rightRemainder).toBeGreaterThanOrEqual(1)
      expect(d.rightRemainder).toBeLessThanOrEqual(4)
    }
  })
})

describe('stalkCountFor', () => {
  it('is the inverse of the recorded-ceiling − 1', () => {
    expect(stalkCountFor(48)).toBe(49)
    expect([48, 43, 39].map(stalkCountFor)).toEqual([49, 44, 40])
  })
  it('round-trips with selectablePickMax over a recorded max', () => {
    for (const recordedMax of [48, 43, 39, 13]) {
      // selectablePickMax(recordedMax) = recordedMax − 1; stalkCountFor adds 1,
      // so the count sits two above the selectable ceiling.
      expect(stalkCountFor(recordedMax)).toBe(selectablePickMax(recordedMax) + 2)
    }
  })
})

describe('assertSelectablePick', () => {
  it('accepts picks in [1, selectablePickMax(recordedMax)]', () => {
    expect(() => assertSelectablePick(48, 1)).not.toThrow()
    expect(() => assertSelectablePick(48, 47)).not.toThrow()
  })

  it('throws RangeError at the recorded max (the zero-remainder boundary)', () => {
    // pick === recordedMax empties the right heap after suspension → remainder 0.
    expect(() => assertSelectablePick(48, 48)).toThrow(RangeError)
  })

  it('throws RangeError below 1 and on non-integers', () => {
    expect(() => assertSelectablePick(48, 0)).toThrow(RangeError)
    expect(() => assertSelectablePick(48, 24.5)).toThrow(RangeError)
  })
})

describe('neverZeroMod4', () => {
  it('returns 1..4 for non-empty heaps, 4 for exact multiples of four', () => {
    expect([1, 2, 3, 4, 5, 8].map(neverZeroMod4)).toEqual([1, 2, 3, 4, 1, 4])
  })

  it('returns 0 only for an empty heap', () => {
    expect(neverZeroMod4(0)).toBe(0)
  })
})

describe('deriveSplit', () => {
  it('derives every field from {pick, max}', () => {
    expect(deriveSplit({ pick: 24, max: 48 })).toEqual({
      stalks: 49,
      leftHeap: 24,
      leftPiles: 5,
      leftRemainder: 4,
      rightHeap: 25,
      rightPiles: 5,
      rightRemainder: 4,
      held: 1,
      setAside: 9,
      combinedPiles: 10,
    })
  })

  it('tolerates a right heap that empties after suspension (0 piles, 0 remainder)', () => {
    // max - pick = 0 → the right heap is just the one suspended stalk. This is
    // the degenerate split the input flows exclude (see the `pick = max - 1`
    // boundary below): `deriveSplit` still derives it faithfully, but no flow
    // ever feeds it a `pick === max`.
    const d = deriveSplit({ pick: 40, max: 40 })
    expect(d.rightHeap).toBe(1)
    expect(d.rightPiles).toBe(0)
    expect(d.rightRemainder).toBe(0)
  })

  it('keeps both remainders in 1..4 at the input ceiling pick = max - 1', () => {
    // The slider / typed / Inquirer / RNG flows all cap the pick at `max - 1`
    // precisely so the right heap keeps a countable stalk after the suspension
    // (max - pick = 1 → remainder 1). This is the boundary that guarantees the
    // "no zero remainder" invariant; spot-check it across several maxes.
    for (const max of [48, 43, 39, 32, 13]) {
      const d = deriveSplit({ pick: max - 1, max })
      expect(d.leftRemainder).toBeGreaterThanOrEqual(1)
      expect(d.leftRemainder).toBeLessThanOrEqual(4)
      expect(d.rightRemainder).toBeGreaterThanOrEqual(1)
      expect(d.rightRemainder).toBeLessThanOrEqual(4)
    }
  })

  it('satisfies conservation 1 + Lrem + Rrem + 4*combinedPiles === stalks', () => {
    const splits: SplitRecord[] = [
      { pick: 24, max: 48 },
      { pick: 1, max: 48 },
      { pick: 40, max: 40 },
      { pick: 20, max: 43 },
      { pick: 16, max: 35 },
      { pick: 13, max: 13 },
    ]
    for (const s of splits) {
      const d = deriveSplit(s)
      expect(1 + d.leftRemainder + d.rightRemainder + 4 * d.combinedPiles).toBe(
        d.stalks,
      )
    }
  })
})
