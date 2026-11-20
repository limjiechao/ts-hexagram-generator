import type { NextRound } from '@hexagram/oracle/division'
import type { Pick } from '@hexagram/oracle/pick'
import { choosePick } from '@hexagram/remainder-group-policy/choose-pick'

import type { RandomSource } from '#src/random-source.js'

/**
 * A step of use case 1, for Automatic Division: the machine's Pick from the
 * Remainder Groups `nextRound` gives, by ADR-0023's Remainder-Group policy,
 * which the caller hands to `divide`. It imports only types from the Oracle,
 * so a channel without the Oracle can draw from the Remainder Groups the
 * engine supplies (ADR-0037).
 */
export function drawAutomaticPick(
  ports: { readonly randomSource: RandomSource },
  remainderGroups: NextRound['remainderGroups'],
): Pick {
  return choosePick(remainderGroups, (bound) =>
    ports.randomSource.integerBelow(bound),
  )
}
