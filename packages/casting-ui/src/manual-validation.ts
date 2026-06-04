// Pure manual-flow arithmetic + validation, lifted out of the
// `<ManualCastingPrompt>` component so it can be reasoned about (and
// unit-tested) without an Ink render. No React, no Ink — only its inputs.

/**
 * Closed-form "next unparted" and "set-aside this round" from the user's pick.
 *
 * DISPLAY ONLY. This drives the manual prompt's "→ next cast: N unparted"
 * reveal row. The AUTHORITATIVE next-round state comes from `performCast`
 * (`@hexagram/core`) via `submitSplit` in `use-line-generator.ts` — that is
 * the algorithm of record that produces the saved Line/hexagram. These two
 * paths compute the same number for two different reasons; their agreement is
 * locked by `manual-validation.test.tsx` ("computeManualRoundResult ≡
 * performCast"). If you change either path, that test guards the seam.
 *
 * Mirrors `fourOperations` — `partTheStalks → suspendOneFromTheRight →
 * sortInto4s → setAside` — which suspends one stalk from the right heap on
 * EVERY round (see `packages/core/src/index.ts`), not only the first. The
 * `_castIndex` parameter is retained for signature/call-site stability but is
 * NOT consulted: the result depends only on `pick` and `unparted`.
 */
export function computeManualRoundResult(
  pick: number,
  _castIndex: 0 | 1 | 2,
  unparted: number,
): { suspended: number; next: number } {
  // I Ching convention: a heap that's a multiple of 4 yields remainder 4,
  // never 0 — modelled as ((count - 1) % 4) + 1.
  const leftRem = ((pick - 1) % 4) + 1
  const rightAfterPart = unparted - pick
  const rightCount = rightAfterPart - 1
  const rightRem = ((rightCount - 1) % 4) + 1
  const next = pick - leftRem + (rightCount - rightRem)
  return { suspended: unparted - next, next }
}

/**
 * Manual-mode validator. Runs checks in strict priority order — the
 * first failing check wins, so the SPLIT row only shows one message at a
 * time. `zero-remainder` fires before conservation because a 0 remainder
 * can sneak past conservation when the user shifts the missing 4 into the
 * pile count on the same side (e.g. `pR=5, rR=0` is conservation-equivalent
 * to `pR=4, rR=4` at M=49). The I-Ching never-zero convention says a heap
 * divisible by 4 yields remainder 4, not 0, so we reject the 0 form
 * explicitly. Conservation then catches off-by-one heap totals before
 * suspended sum; once all three pass, the derived pick is mathematically
 * in `[1, M-1]`, so no `range` variant is needed.
 *
 * Pure — depends only on its inputs. The single source of truth for what
 * the prompt's input state means; the textual rendering + commit path both
 * consume this result.
 */
export type ManualValidationResult =
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
      // `remL`/`remR` are already non-null because the `incomplete` branch
      // (above) fires first when any field is null. Carrying them through
      // here lets the message render from the narrowed validator result
      // rather than the closure-scoped (possibly-null) inputs.
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

/**
 * Where each validator outcome surfaces in the manual prompt — the SINGLE
 * statement of routing that was previously implicit across the render
 * (`missingColor`, the strip-branch selector) and the bottom-strip type:
 *
 *   - 'gauge' — conservation: shown ONLY as the red MISSING gauge, never as
 *     strip text (a counting error reads best as a number, not a sentence).
 *   - 'strip' — zero-remainder / suspended-sum: rule violations shown as
 *     BOLD_RED strip text.
 *   - 'none'  — incomplete / ok: no error surface (mid-edit or commit-ready).
 *
 * The `switch` is exhaustive over `ManualValidationResult['kind']`, so adding a
 * new outcome forces a routing decision here (the missing `case` fails `tsc`).
 */
export function manualFeedbackSurface(
  kind: ManualValidationResult['kind'],
): 'strip' | 'gauge' | 'none' {
  switch (kind) {
    case 'conservation':
      return 'gauge'
    case 'zero-remainder':
    case 'suspended-sum':
      return 'strip'
    case 'incomplete':
    case 'ok':
      return 'none'
  }
}

export function validateManualInput(args: {
  pilesL: number | null
  remL: number | null
  pilesR: number | null
  remR: number | null
  unparted: number
  castIndex: 0 | 1 | 2
}): ManualValidationResult {
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
  // Suspended sum: the I-Ching invariant. Round 1 expects {5, 9};
  // rounds 2/3 expect {4, 8}. (The 1-from-right is folded in via the +1
  // term; rL + rR + 1 == 4·(pL+pR) ⊕ unparted lands at exactly these
  // residues for the canonical M = 49/40/32 sequence.)
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

// Parse a digit-buffer into an integer, or `null` if the buffer is empty or
// fails the integer check. Lifted to module scope so React doesn't recreate
// it on every render — closure-less, so it captures nothing.
export function parseManualBuffer(buffer: string): number | null {
  if (buffer.length === 0) return null
  const parsed = Number.parseInt(buffer, 10)
  return Number.isInteger(parsed) ? parsed : null
}
