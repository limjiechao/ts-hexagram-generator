import type { NextRound } from '@hexagram/oracle/division'
import type { Pick } from '@hexagram/oracle/pick'
import type { Remainder } from '@hexagram/oracle/remainder'

/**
 * The Pick the machine makes in Automatic Division (ADR-0023): a Remainder
 * Group with probability ¼ each, then a Pick within it, each equally likely.
 * It draws twice from `integerBelow`, which returns an integer from 0 to
 * `bound − 1`, each equally likely, as the Random Source's does. The second
 * bound is the chosen group's size, so both integers cannot be drawn before
 * the group is chosen. The caller guarantees every group holds a Pick, as
 * every Round's do, and that each draw is an integer below its bound.
 */
export function choosePick(
  remainderGroups: NextRound['remainderGroups'],
  integerBelow: (bound: number) => number,
): Pick {
  const group = remainderGroups[remainderDrawn(integerBelow(4))]
  const pick = group[integerBelow(group.length)]
  // Only a draw the caller guarantees against reaches here; the throw gives
  // the type a Pick without asserting one.
  if (pick === undefined) throw new Error('a draw past the Remainder Group')
  return pick
}

/** Draws 0 to 3 give Remainders 1 to 4. */
function remainderDrawn(draw: number): Remainder {
  if (draw === 0) return 1
  if (draw === 1) return 2
  if (draw === 2) return 3
  return 4
}
