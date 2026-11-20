import type { PartialCasting } from '@hexagram/oracle/casting'
import {
  nextRound as nextRoundByOracle,
  type NextRoundResult,
} from '@hexagram/oracle/division'

/**
 * A step of use case 1: the Round the Casting awaits, with its stalks, valid
 * Picks and Remainder Groups, for a driving adapter to offer before a
 * Division. A Casting that does not replay is the `refused` result, never a
 * throw, which the caller reports.
 */
export function nextRound(casting: PartialCasting): NextRoundResult {
  return nextRoundByOracle(casting)
}
