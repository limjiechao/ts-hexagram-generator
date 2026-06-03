import { describe, expect, it } from 'vitest'

import { deriveSplit, neverZeroMod4 } from '../src/casting-derivation.js'
import type { SplitRecord } from '../src/types.js'

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
