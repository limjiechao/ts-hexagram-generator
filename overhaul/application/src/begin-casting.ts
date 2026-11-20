import type { PartialCasting } from '@hexagram/oracle/casting'
import { emptyCasting } from '@hexagram/oracle/division'

/**
 * Use case 1's first step: the Empty Casting (ADR-0038), which the caller
 * holds and passes to each Division in turn.
 */
export function beginCasting(): PartialCasting {
  return emptyCasting
}
