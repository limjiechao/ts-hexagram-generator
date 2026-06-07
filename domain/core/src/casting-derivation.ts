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
 * selectablePickMax(recordedMax) = recordedMax − 1 is the DEFINITIONAL home of
 * the never-zero-remainder rule (a pick of `recordedMax` would leave the right heap one
 * suspended stalk, nothing to count by fours, remainder 0). The slider, typed,
 * plain-Inquirer, and RNG flows clamp to this value. assertSelectablePick —
 * called by performCast, the algorithm of record — is the single RUNTIME
 * enforcer. The manual validator derives the same [1, recordedMax−1] range
 * structurally from its four typed fields (it cannot call a pick-clamp because
 * it has no pick); its agreement with the guard is locked by manual-validation
 * .test ("manual 'ok' picks satisfy the core never-zero guard"). One definition,
 * one runtime enforcer; see ADR-0006.
 */
export const selectablePickMax = (recordedMax: number): number =>
  recordedMax - 1

/**
 * stalkCountFor(recordedMax) = recordedMax + 1 is the inverse of the `− 1` that
 * `SplitRecord.recordedMax` bakes in: `recordedMax` is the unparted stalk count minus the one
 * suspended stalk (掛一), so adding it back recovers the true count of stalks
 * before this division. The slider/manual readouts show this as `Stalks: <n>`.
 * Paired with `selectablePickMax` so the two `± 1` conversions around the
 * recorded ceiling each have exactly one named owner.
 */
export const stalkCountFor = (recordedMax: number): number => recordedMax + 1

/**
 * Throw a `RangeError` unless `pick` is a strictly-interior split of a round's
 * stalk pile: `1 ≤ pick ≤ selectablePickMax(recordedMax)`. This is the runtime
 * guard behind the never-zero-remainder invariant (see `selectablePickMax`);
 * `performCast` calls it, and the legacy converter's replay relies on it.
 */
export const assertSelectablePick = (
  recordedMax: number,
  pick: number,
): void => {
  const ceiling = selectablePickMax(recordedMax)
  if (!Number.isInteger(pick) || pick < 1 || pick > ceiling) {
    throw new RangeError(
      `pick ${pick} out of range 1..${ceiling} (recorded max ${recordedMax})`,
    )
  }
}

/**
 * Every intermediate quantity of one stalk division (一變), reconstructed from
 * its `{ pick, recordedMax }` record for display. `stalks` and `rightHeap` fold the one
 * suspended stalk back in (it was part of the unparted stalks and the right
 * heap before sorting), so `leftHeap + rightHeap === stalks`.
 */
export interface DerivedSplit {
  /** unparted stalks at the start of this cast (`stalkCountFor(recordedMax)`) */
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
 * `{ pick, recordedMax }` record. Conservation holds for every division:
 * `1 + leftRemainder + rightRemainder + 4 * combinedPiles === stalks`.
 */
export function deriveSplit({ pick, recordedMax }: SplitRecord): DerivedSplit {
  const stalks = stalkCountFor(recordedMax)
  const leftHeap = pick
  const rightHeap = recordedMax - pick + 1
  const leftRemainder = neverZeroMod4(pick)
  const leftPiles = (pick - leftRemainder) / 4
  const rightSorted = recordedMax - pick // right heap minus the 1 suspended stalk
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
