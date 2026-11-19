import type { Pick } from '#src/pick.js'
import type { Remainder } from '#src/remainder.js'
import type { SetAside } from '#src/set-aside.js'

/**
 * One pass of the four operations. The Pick is the Round's only free value;
 * the Remainders and the Set-aside follow from it and the stalks.
 */
export interface Round {
  readonly stalks: number
  readonly pick: Pick
  readonly remainderLeft: Remainder
  readonly remainderRight: Remainder
  readonly setAside: SetAside
}
