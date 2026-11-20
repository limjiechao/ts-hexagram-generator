import type { NextRound } from '@hexagram/oracle/division'
import type { Pick } from '@hexagram/oracle/pick'

/**
 * The Pick the machine makes in Automatic Division (ADR-0023): a Remainder
 * Group with probability ¼ each, then a Pick within it, each equally likely.
 * It draws twice from `integerBelow`, which returns an integer from 0 to
 * `bound − 1`, each equally likely, as the Random Source's does. The second
 * bound is the chosen group's size, so both integers cannot be drawn before
 * the group is chosen. The caller guarantees every group holds a Pick, as
 * every Round's do.
 */
export function choosePick(
  remainderGroups: NextRound['remainderGroups'],
  integerBelow: (bound: number) => number,
): Pick {
  return notImplemented(remainderGroups, integerBelow)
}

/** Carries the inputs as the cause, so each signature keeps its names. */
function notImplemented(...inputs: readonly unknown[]): never {
  throw new Error('Not implemented', { cause: inputs })
}
