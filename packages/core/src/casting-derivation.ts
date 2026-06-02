import type { SplitRecord } from './types.js'

/**
 * Map a heap size to its division-by-four remainder, never returning 0 for a
 * non-empty heap: a heap that is an exact multiple of four leaves a remainder
 * of four (揲之以四 always sets aside at least one stalk). An empty heap (0)
 * maps to 0 — the only way a remainder is zero. `((n - 1) mod 4) + 1` yields
 * 1..4 for n >= 1 and 0 for n = 0.
 */
export const neverZeroMod4 = (heap: number): number => ((heap - 1) % 4) + 1

/**
 * Every intermediate quantity of one stalk division (一變), reconstructed from
 * its `{ pick, max }` record for display. `stalks` and `rightHeap` fold the one
 * suspended stalk back in (it was part of the unparted stalks and the right
 * heap before sorting), so `leftHeap + rightHeap === stalks`.
 */
export interface DerivedSplit {
  /** unparted stalks at the start of this cast (`max + 1`) */
  stalks: number
  /** left heap size (`pick`) */
  leftHeap: number
  /** complete groups of four in the left heap */
  leftPiles: number
  /** left heap remainder (1..4, or 0 iff the heap is empty) */
  leftRemainder: number
  /** right heap size, with the suspended stalk folded back in */
  rightHeap: number
  /** complete groups of four in the right heap (after the 1 is suspended) */
  rightPiles: number
  /** right heap remainder */
  rightRemainder: number
  /** the one stalk suspended from the right heap (掛一) — always 1 */
  held: 1
  /** `1 + leftRemainder + rightRemainder` (歸奇於扐) */
  setAside: number
  /** `leftPiles + rightPiles`; on the third cast this is the line value (6/7/8/9) */
  combinedPiles: number
}

/**
 * Reconstruct every intermediate quantity of one yarrow-stalk division from its
 * `{ pick, max }` record. Conservation holds for every division:
 * `1 + leftRemainder + rightRemainder + 4 * combinedPiles === stalks`.
 */
export function deriveSplit({ pick, max }: SplitRecord): DerivedSplit {
  const stalks = max + 1
  const leftHeap = pick
  const rightHeap = max - pick + 1
  const leftRemainder = neverZeroMod4(pick)
  const leftPiles = (pick - leftRemainder) / 4
  const rightSorted = max - pick // right heap minus the 1 suspended stalk
  const rightRemainder = neverZeroMod4(rightSorted)
  const rightPiles = (rightSorted - rightRemainder) / 4
  return {
    stalks,
    leftHeap,
    leftPiles,
    leftRemainder,
    rightHeap,
    rightPiles,
    rightRemainder,
    held: 1,
    setAside: 1 + leftRemainder + rightRemainder,
    combinedPiles: leftPiles + rightPiles,
  }
}
