import type { CompleteCasting } from '@hexagram/oracle/casting'
import type { LinePosition } from '@hexagram/oracle/line-position'
import type { LineValue } from '@hexagram/oracle/line-value'
import type { Round } from '@hexagram/oracle/round'

import type { LedgerRound } from '#src/readout.js'

/**
 * One Round as the ledger shows it. The Round records the stalks, the Pick,
 * both Remainders and the Set-aside; the heaps and piles here are read back
 * from them. This repeats the Oracle's Division arithmetic (the left heap is
 * the Pick, the Hung Stalk comes from the right heap, each heap is counted
 * off in fours), a known duplicate kept because the Oracle exposes Rounds,
 * not their piles. Change the two together.
 */
function ledgerRound(
  line: LinePosition,
  round: 1 | 2 | 3,
  { stalks, pick, remainderLeft, remainderRight, setAside }: Round,
  lineValue: LineValue,
): LedgerRound {
  const rightHeap = stalks - pick
  return {
    line,
    round,
    stalks,
    leftHeap: pick,
    leftPiles: (pick - remainderLeft) / 4,
    leftRemainder: remainderLeft,
    rightHeap,
    rightPiles: (rightHeap - 1 - remainderRight) / 4,
    rightRemainder: remainderRight,
    setAside,
    remainingFours: (stalks - setAside) / 4,
    lineValue: round === 3 ? lineValue : undefined,
  }
}

/**
 * A complete Casting's eighteen Rounds as the ledger orders them: Line 6
 * first, down to Line 1, each Line's third Round above its first.
 */
export function ledgerOf(casting: CompleteCasting): readonly LedgerRound[] {
  const [l1, l2, l3, l4, l5, l6] = casting.rounds
  const [v1, v2, v3, v4, v5, v6] = casting.transformation
  const lines = [
    [6, l6, v6],
    [5, l5, v5],
    [4, l4, v4],
    [3, l3, v3],
    [2, l2, v2],
    [1, l1, v1],
  ] as const
  return lines.flatMap(([line, [first, second, third], value]) => [
    ledgerRound(line, 3, third, value),
    ledgerRound(line, 2, second, value),
    ledgerRound(line, 1, first, value),
  ])
}
