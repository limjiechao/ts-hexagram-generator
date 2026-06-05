// Pure manual-flow I Ching invariants — the domain rules a manual yarrow-stalk
// cast must satisfy. No UI, no React, no Ink: only the four hand-counted
// numbers + the round's unparted count + the cast index. This is the single
// home for the conservation / never-zero / suspended-sum knowledge; the
// casting-ui layer consumes the structured result and routes it to a surface.

/**
 * Manual-mode split validator. Runs checks in strict priority order — the
 * first failing check wins, so a consumer surfaces exactly one message at a
 * time. `zero-remainder` fires before `conservation` because a 0 remainder can
 * sneak past conservation when the user shifts the missing 4 into the pile
 * count on the same side (e.g. `pR=5, rR=0` is conservation-equivalent to
 * `pR=4, rR=4` at M=49). The I-Ching never-zero convention says a heap
 * divisible by 4 yields remainder 4, not 0, so we reject the 0 form
 * explicitly. Conservation then catches off-by-one heap totals before
 * suspended-sum; once all three pass, the derived pick is mathematically in
 * `[1, unparted - 1]`, so no `range` variant is needed.
 */
export type ManualSplitValidation =
  | { kind: 'incomplete' }
  | { kind: 'zero-remainder'; remL: number; remR: number }
  | {
      kind: 'conservation'
      total: number
      unparted: number
      leftHeapTotal: number
      rightHeapTotal: number
    }
  | {
      kind: 'suspended-sum'
      sum: number
      // Carried through (already non-null past the `incomplete` branch) so a
      // consumer can render the message from the narrowed result.
      remL: number
      remR: number
      expectedLabel: string
    }
  | {
      kind: 'ok'
      pick: number
      leftHeapTotal: number
      rightHeapTotal: number
    }

export function validateManualSplit(args: {
  pilesL: number | null
  remL: number | null
  pilesR: number | null
  remR: number | null
  unparted: number
  castIndex: 0 | 1 | 2
}): ManualSplitValidation {
  const { pilesL, remL, pilesR, remR, unparted, castIndex } = args
  if (pilesL === null || remL === null || pilesR === null || remR === null) {
    return { kind: 'incomplete' }
  }
  // I-Ching never-zero convention: a heap divisible by 4 yields remainder 4,
  // never 0. Rejected here (before conservation) because pR=N+1, rR=0 is
  // conservation-equivalent to pR=N, rR=4 — a 0 in the remainder slot would
  // otherwise pass conservation undetected.
  if (remL === 0 || remR === 0) {
    return { kind: 'zero-remainder', remL, remR }
  }
  const leftHeapTotal = 4 * pilesL + remL
  // The pick is the LEFT-heap total alone (below). The right heap is NOT a
  // generator input — it is a transcription CROSS-CHECK: requiring all four
  // hand-counted numbers lets conservation + suspended-sum catch a miscount.
  const rightHeapTotal = 4 * pilesR + remR
  // Conservation: the four user-typed counts plus the 1 always-suspended
  // stalk must sum to the round's unparted count.
  const total = leftHeapTotal + rightHeapTotal + 1
  if (total !== unparted) {
    return {
      kind: 'conservation',
      total,
      unparted,
      leftHeapTotal,
      rightHeapTotal,
    }
  }
  // Suspended sum: round 1 (castIndex 0) expects {5, 9}; rounds 2/3 expect
  // {4, 8}. (The 1-from-right is folded in via the +1 term.)
  const sum = 1 + remL + remR
  const expectedSums = castIndex === 0 ? [5, 9] : [4, 8]
  if (!expectedSums.includes(sum)) {
    const expectedLabel = castIndex === 0 ? '5 or 9' : '4 or 8'
    return { kind: 'suspended-sum', sum, remL, remR, expectedLabel }
  }
  // Conservation + suspended-sum both pass → derived pick is in
  // `[1, unparted - 1]`. No standalone `range` failure mode.
  return {
    kind: 'ok',
    pick: leftHeapTotal,
    leftHeapTotal,
    rightHeapTotal,
  }
}
