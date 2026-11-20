import type { PartialCasting } from '@hexagram/oracle/casting'
import {
  divide as divideByOracle,
  type DivisionResult,
} from '@hexagram/oracle/division'
import type { Pick } from '@hexagram/oracle/pick'

/**
 * A step of use case 1: one Division from a Pick, for Virtual or Automatic
 * Division. It returns the Oracle's next Casting, complete after the
 * eighteenth Round, or its refusal as the `refused` result, never a throw,
 * which the caller holds or reports.
 */
export function divide(casting: PartialCasting, pick: Pick): DivisionResult {
  return divideByOracle(casting, pick)
}
