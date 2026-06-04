# Slice 4: Manual Invariants into @hexagram/core — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the pure manual-consultation I Ching invariants (conservation, never-zero remainder, suspended-sum residue) into `@hexagram/core` as domain knowledge with one home, and eliminate the deliberate `computeManualRoundResult ≡ performCast` duplicate so there is exactly one next-state computation.

**Architecture:** A new pure `validateManualSplit(...)` in `domain/core/src/manual-validation.ts` (exported at the subpath `@hexagram/core/manual-validation`) encodes the four-invariant priority order and reuses the existing `neverZeroMod4` from `casting-derivation.ts` rather than re-hand-rolling `((n-1)%4)+1`. `cli/casting-ui/src/manual-validation.ts` keeps ONLY UI concerns — buffer parsing (`parseManualBuffer`) and feedback routing (`manualFeedbackSurface`) — and re-exports the core validator's result type so `manual-prompt.tsx` consumes it unchanged. `computeManualRoundResult` is deleted: the prompt's `→ next cast: N unparted` reveal is fed by `performCast` (the algorithm of record) run once in the prompt, matching the flow reducer's authoritative advance.

**Tech Stack:** TypeScript, vitest, Ink, tsdown, pnpm workspaces

---

## Context the implementer must hold

**Path translation.** This slice ASSUMES Slices 0–3 merged. Read CURRENT code from `packages/...`, but WRITE to post-reorg paths:

| Current (read here) | Post-reorg (write here) |
| --- | --- |
| `packages/core/src/manual-validation.ts` (new) | `domain/core/src/manual-validation.ts` |
| `packages/core/src/casting-derivation.ts` | `domain/core/src/casting-derivation.ts` |
| `packages/core/src/index.ts` | `domain/core/src/index.ts` |
| `packages/core/tsdown.config.ts` | `domain/core/tsdown.config.ts` |
| `packages/core/package.json` | `domain/core/package.json` |
| `packages/core/tests/manual-validation.test.ts` (new) | `domain/core/tests/manual-validation.test.ts` |
| `packages/casting-ui/src/manual-validation.ts` | `cli/casting-ui/src/manual-validation.ts` |
| `packages/casting-ui/src/manual-prompt.tsx` | `cli/casting-ui/src/manual-prompt.tsx` |
| `packages/casting-ui/src/viewer-flow.ts` | `cli/casting-ui/src/viewer-flow.ts` |
| `packages/casting-ui/tests/manual-validation.test.tsx` | `cli/casting-ui/tests/manual-validation.test.tsx` |
| `packages/casting-ui/tests/viewer.test.tsx` | `cli/casting-ui/tests/viewer.test.tsx` |

If the post-reorg directories do not exist on the branch you are on (Slices 0–3 not yet merged), STOP and confirm with the human before proceeding — do not fall back to `packages/...` silently.

**Shared decisions (do NOT deviate):**

- Core subpath is exactly `@hexagram/core/manual-validation`.
- Reuse the existing `neverZeroMod4` and `selectablePickMax` from `casting-derivation.ts`. Do NOT duplicate or re-hand-roll `((n-1)%4)+1`.
- Preserve the four-invariant priority order: **incomplete → zero-remainder → conservation → suspended-sum → ok**.
- Preserve the exact residue sets: cast 1 (`castIndex === 0`) expects `{5, 9}`; casts 2/3 (`castIndex === 1 | 2`) expect `{4, 8}`.
- Preserve every exact user-facing message / `expectedLabel` (`'5 or 9'` / `'4 or 8'`).
- Saved output must stay byte-identical (the manual≡interactive test in `viewer.test.tsx`).

**Regression gate (must stay green at every commit):**

```bash
pnpm --filter @hexagram/core test
pnpm --filter @hexagram/casting-ui test
pnpm --filter @hexagram/core type:check
pnpm --filter @hexagram/casting-ui type:check
```

The two load-bearing tests are the manual-validation suite and the byte-identity test at `cli/casting-ui/tests/viewer.test.tsx:1858` (`it('manual flow saves byte-identical to interactive ...')`).

---

## Decisions baked into this plan

1. **Result type — discriminated union, renamed.** The core export is `validateManualSplit(...)` returning `ManualSplitValidation` (a discriminated union on `kind`). It is identical in shape to the current `ManualValidationResult`:

   ```ts
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
   ```

   `cli/casting-ui/src/manual-validation.ts` re-exports both the function and the type so `manual-prompt.tsx` keeps importing `validateManualInput` / `ManualValidationResult` from its own package (one local rename alias, no churn in the component). Rationale: `manual-prompt.tsx` references `ManualValidationResult` only via the `validation.kind` narrowing and the field reads (`validation.remL`, etc.); keeping the local alias means the component diff is zero.

2. **`computeManualRoundResult` is DELETED.** The prompt's reveal row (`→ next cast: N unparted`) reads the next-round unparted count from `performCast`, the algorithm of record, run once in the prompt's Enter handler. `next = maxPickFor(after) + 1` where `after = performCast(beforeState, pick)`. This collapses the two next-state computations into one and removes the Seam-1 "≡" lock-in test (it tested two paths agreeing; there is now only one path). The byte-identity test remains the end-to-end guarantee that manual and interactive produce the same saved file.

   To run `performCast` in the prompt we need the current `LineState`. The prompt today receives only `unpartedStalks: number` + `castIndex`. We pass the live `lineState` down from the viewer (it already lives in `flowReducer`'s `state.lineState`) as a new prop `lineState: AdvanceableLineState`. The prompt computes `next` from `maxPickFor(performCast(lineState, pick)) + 1`. This is DISPLAY ONLY in the prompt; the authoritative advance still happens in the reducer's `splitCommitted`. Both now call the SAME `performCast` — there is one computation, invoked in two places for two presentation purposes, not two re-implementations.

3. **What stays in `cli/casting-ui/src/manual-validation.ts`:** `parseManualBuffer` (buffer→int, pure UI input parsing) and `manualFeedbackSurface` (UI routing: gauge / strip / none). Both are UI-layer knowledge (how a digit buffer and a render surface behave), not I Ching domain rules.

---

## Task 1 — Create the core validator with TDD (one invariant at a time)

**Files:**
- `domain/core/tests/manual-validation.test.ts` (new)
- `domain/core/src/manual-validation.ts` (new)

The core validator is pure and has NO React/Ink imports. Build it test-first, one invariant per red→green cycle, reusing `neverZeroMod4` only where a remainder must be derived (it is NOT needed here — the user TYPES the remainders — but import it nowhere it would be redundant; this validator validates typed remainders, it does not derive them). Conservation/suspended-sum are pure arithmetic on the four typed numbers.

- [ ] Write the failing test file `domain/core/tests/manual-validation.test.ts`. Port every case from the current `packages/casting-ui/tests/manual-validation.test.tsx` `describe('validateManualInput', ...)` block verbatim, renamed to `validateManualSplit`:

  ```ts
  import { describe, expect, it } from 'vitest'
  import { initialLineState, maxPickFor, performCast } from '@hexagram/core'
  import { assertSelectablePick } from '@hexagram/core/casting-derivation'
  import { validateManualSplit } from '../src/manual-validation.js'

  describe('validateManualSplit', () => {
    it('returns incomplete when any field is null', () => {
      expect(
        validateManualSplit({
          pilesL: 5,
          remL: null,
          pilesR: 5,
          remR: 4,
          unparted: 49,
          castIndex: 0,
        }),
      ).toEqual({ kind: 'incomplete' })
    })

    it('reports conservation failure with the actual total vs unparted', () => {
      // 4·5 + 4 + 4·4 + 4 + 1 = 45, but unparted = 49.
      expect(
        validateManualSplit({
          pilesL: 5,
          remL: 4,
          pilesR: 4,
          remR: 4,
          unparted: 49,
          castIndex: 0,
        }),
      ).toEqual({
        kind: 'conservation',
        total: 45,
        unparted: 49,
        leftHeapTotal: 24,
        rightHeapTotal: 20,
      })
    })

    it('reports suspended-sum failure when conservation passes but the suspended sum is off', () => {
      // M=10, castIndex=1 (cast 2, expected sums {4, 8}).
      //   4·1 + 1 + 4·0 + 4 + 1 = 10 ✓ conservation
      //   suspended sum = 1 + 1 + 4 = 6 (not in {4, 8}).
      expect(
        validateManualSplit({
          pilesL: 1,
          remL: 1,
          pilesR: 0,
          remR: 4,
          unparted: 10,
          castIndex: 1,
        }),
      ).toEqual({
        kind: 'suspended-sum',
        sum: 6,
        remL: 1,
        remR: 4,
        expectedLabel: '4 or 8',
      })
    })

    it('rejects rR=0 even when conservation and suspended-sum would otherwise pass', () => {
      // cast 1, M=49, pL=6, rL=4, pR=5, rR=0.
      expect(
        validateManualSplit({
          pilesL: 6,
          remL: 4,
          pilesR: 5,
          remR: 0,
          unparted: 49,
          castIndex: 0,
        }),
      ).toEqual({ kind: 'zero-remainder', remL: 4, remR: 0 })
    })

    it('rejects rL=0 with the same priority as rR=0', () => {
      expect(
        validateManualSplit({
          pilesL: 5,
          remL: 0,
          pilesR: 6,
          remR: 4,
          unparted: 49,
          castIndex: 0,
        }),
      ).toEqual({ kind: 'zero-remainder', remL: 0, remR: 4 })
    })

    it('zero-remainder fires before conservation when both fail', () => {
      const result = validateManualSplit({
        pilesL: 0,
        remL: 0,
        pilesR: 0,
        remR: 0,
        unparted: 49,
        castIndex: 0,
      })
      expect(result.kind).toBe('zero-remainder')
    })

    it('conservation fires before suspended-sum when both fail', () => {
      // Cast 1, M=49: pL=5, rL=4, pR=4, rR=2 → total 43 (not 49), suspended 7.
      const result = validateManualSplit({
        pilesL: 5,
        remL: 4,
        pilesR: 4,
        remR: 2,
        unparted: 49,
        castIndex: 0,
      })
      expect(result.kind).toBe('conservation')
    })

    it('returns ok with leftHeapTotal and rightHeapTotal for a valid commit', () => {
      // Cast 2 of M=40: pL=4, rL=3, pR=4, rR=4 → total 40, suspended 8. pick = 19.
      expect(
        validateManualSplit({
          pilesL: 4,
          remL: 3,
          pilesR: 4,
          remR: 4,
          unparted: 40,
          castIndex: 1,
        }),
      ).toEqual({
        kind: 'ok',
        pick: 19,
        leftHeapTotal: 19,
        rightHeapTotal: 20,
      })
    })

    it('round-1 ok validates a canonical 24/49 split', () => {
      expect(
        validateManualSplit({
          pilesL: 5,
          remL: 4,
          pilesR: 5,
          remR: 4,
          unparted: 49,
          castIndex: 0,
        }),
      ).toEqual({
        kind: 'ok',
        pick: 24,
        leftHeapTotal: 24,
        rightHeapTotal: 24,
      })
    })

    it('conservation result carries heap totals for downstream rendering', () => {
      const result = validateManualSplit({
        pilesL: 5,
        remL: 2,
        pilesR: 4,
        remR: 3,
        unparted: 40,
        castIndex: 1,
      })
      expect(result.kind).toBe('conservation')
      if (result.kind !== 'conservation') return
      expect(result.total).toBe(42)
      expect(result.unparted).toBe(40)
      expect(result.leftHeapTotal).toBe(22)
      expect(result.rightHeapTotal).toBe(19)
    })
  })

  // The structurally-derived range never escapes the core never-zero guard.
  describe('validateManualSplit "ok" picks satisfy assertSelectablePick', () => {
    it('every accepted cast-0 input has a pick the core accepts', () => {
      const unparted = 49
      for (let pilesL = 0; pilesL <= Math.floor(unparted / 4); pilesL++) {
        for (let remL = 1; remL <= 4; remL++) {
          for (let pilesR = 0; pilesR <= Math.floor(unparted / 4); pilesR++) {
            for (let remR = 1; remR <= 4; remR++) {
              const result = validateManualSplit({
                pilesL,
                remL,
                pilesR,
                remR,
                unparted,
                castIndex: 0,
              })
              if (result.kind !== 'ok') continue
              expect(() =>
                assertSelectablePick(unparted - 1, result.pick),
              ).not.toThrow()
            }
          }
        }
      }
    })
  })
  ```

- [ ] Run the test, confirm it FAILS (module not found):
  ```bash
  pnpm --filter @hexagram/core test -- manual-validation
  ```
  Expected: `Failed to resolve import "../src/manual-validation.js"` (red).

- [ ] Create `domain/core/src/manual-validation.ts` with the type and function. PORT the priority order and comments from the current source — they encode WHY each check fires where it does (especially zero-remainder-before-conservation). Keep the prose:

  ```ts
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
  ```

  > Note on `neverZeroMod4`: the validator does NOT derive remainders (the user types them), so `neverZeroMod4` is not called here. It IS already used by `deriveSplit` / `selectablePickMax` in `casting-derivation.ts`, which is the never-zero authority this validator's `[1, unparted-1]` guarantee is proven against by the `assertSelectablePick` property test above. Do NOT add a redundant `neverZeroMod4` import to this file.

- [ ] Run the test, confirm it PASSES:
  ```bash
  pnpm --filter @hexagram/core test -- manual-validation
  ```
  Expected: all `validateManualSplit` cases green, including the exhaustive `assertSelectablePick` property loop.

- [ ] Commit:
  ```bash
  git add domain/core/src/manual-validation.ts domain/core/tests/manual-validation.test.ts
  git commit -m "Add validateManualSplit to @hexagram/core

Move the manual-cast I Ching invariants (conservation, never-zero
remainder, suspended-sum residue {5,9}/{4,8}) into core as domain
knowledge with one home, so a non-UI host (e.g. a Next.js app) can
reuse them. Ported test-first from the casting-ui validator.

https://claude.ai/code/session_013psvyKdKysvpzsYwcwFSMf"
  ```

---

## Task 2 — Add the `@hexagram/core/manual-validation` subpath export

**Files:**
- `domain/core/package.json`
- `domain/core/tsdown.config.ts`
- `domain/core/tests/exports.test.ts` (or wherever core's export-surface test lives — check `domain/core/tests/`; create a focused assertion if none exists)

- [ ] Add the export entry to `domain/core/package.json` `exports` (alphabetical placement is between `./getters` and `./hexagrams`):
  ```json
  "./manual-validation": {
    "source": "./src/manual-validation.ts",
    "types": "./dist/manual-validation.d.mts",
    "import": "./dist/manual-validation.mjs"
  },
  ```

- [ ] Add the entry to `domain/core/tsdown.config.ts` `entry` array:
  ```ts
  entry: [
    './src/index.ts',
    './src/casting-derivation.ts',
    './src/crypto-random.ts',
    './src/getters.ts',
    './src/manual-validation.ts',
    './src/models/hexagrams.ts',
    './src/random-casting.ts',
    './src/models/trigrams.ts',
    './src/types.ts',
  ],
  ```

- [ ] Verify the subpath resolves via the `source` condition (tsx/vitest dev path). Add an assertion to a core test that imports through the package specifier rather than the relative path:
  ```ts
  import { validateManualSplit } from '@hexagram/core/manual-validation'
  // ... assert one known case resolves and returns { kind: 'ok', ... }
  ```

- [ ] Build core and confirm the new entry emits:
  ```bash
  pnpm --filter @hexagram/core build
  ls domain/core/dist/manual-validation.mjs domain/core/dist/manual-validation.d.mts
  ```
  Expected: both files listed (no `No such file`).

- [ ] Run core tests + type-check:
  ```bash
  pnpm --filter @hexagram/core test
  pnpm --filter @hexagram/core type:check
  ```
  Expected: green.

- [ ] Commit:
  ```bash
  git add domain/core/package.json domain/core/tsdown.config.ts domain/core/tests/
  git commit -m "Export validateManualSplit at @hexagram/core/manual-validation

Add the subpath so the casting-ui layer (and any future host) imports the
invariants through the package public API, not a deep relative path.

https://claude.ai/code/session_013psvyKdKysvpzsYwcwFSMf"
  ```

---

## Task 3 — Re-point casting-ui's validator at core; delete `computeManualRoundResult`

**Files:**
- `cli/casting-ui/src/manual-validation.ts` (becomes UI-routing only)
- `cli/casting-ui/tests/manual-validation.test.tsx`

The casting-ui file now keeps ONLY `parseManualBuffer` (UI input parsing) and `manualFeedbackSurface` (UI routing), and RE-EXPORTS the core validator + its type under the existing local names so `manual-prompt.tsx` needs no import-path churn.

- [ ] Rewrite `cli/casting-ui/src/manual-validation.ts` to:

  ```ts
  // UI-layer manual-flow helpers. The I Ching INVARIANTS live in
  // `@hexagram/core/manual-validation` (validateManualSplit); this module owns
  // only the casting-ui concerns: parsing a digit buffer, and routing the
  // validator's outcome to a render surface. Re-exported under the prompt's
  // existing local names so the component consumes one stable import.

  import {
    validateManualSplit,
    type ManualSplitValidation,
  } from '@hexagram/core/manual-validation'

  // Local alias preserves the prompt's existing call site and narrowing.
  export const validateManualInput = validateManualSplit
  export type ManualValidationResult = ManualSplitValidation

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

  // Parse a digit-buffer into an integer, or `null` if the buffer is empty or
  // fails the integer check. Module-scoped so React doesn't recreate it per
  // render; closure-less.
  export function parseManualBuffer(buffer: string): number | null {
    if (buffer.length === 0) return null
    const parsed = Number.parseInt(buffer, 10)
    return Number.isInteger(parsed) ? parsed : null
  }
  ```

  `computeManualRoundResult` is GONE from this file (no export, no definition).

- [ ] Update `cli/casting-ui/tests/manual-validation.test.tsx`:
  - DELETE the entire `describe('computeManualRoundResult ≡ performCast (next-round count)', ...)` block — there is no second next-state computation to lock against any more (its single-source guarantee is now structural: the prompt calls `performCast` directly).
  - DELETE the `computeManualRoundResult` import.
  - KEEP `describe('validateManualInput', ...)`, `describe('manual "ok" picks satisfy the core never-zero guard', ...)`, and `describe('manualFeedbackSurface', ...)` — they still test the casting-ui re-export surface (`validateManualInput` / `manualFeedbackSurface` resolve through the package's own module). These guard that the UI package's public helpers behave, even though the validator body now lives in core.
  - Leave the `assertSelectablePick` / `performCast` imports as-is (still used by the surviving property test).

- [ ] Run the casting-ui manual-validation test:
  ```bash
  pnpm --filter @hexagram/casting-ui test -- manual-validation
  ```
  Expected: green; the `computeManualRoundResult` describe is gone and the rest pass through the re-exported `validateManualInput`.

- [ ] Type-check (will still FAIL until Task 4 — `manual-prompt.tsx` still imports `computeManualRoundResult`):
  ```bash
  pnpm --filter @hexagram/casting-ui type:check
  ```
  Expected: error in `manual-prompt.tsx` — `computeManualRoundResult` has no exported member. This is expected; Task 4 fixes it. (Do NOT commit a broken type-check — fold Task 3 + Task 4 into one commit, or stage Task 3 and commit only after Task 4 is green.)

---

## Task 4 — Feed the prompt's reveal from `performCast` (single computation)

**Files:**
- `cli/casting-ui/src/manual-prompt.tsx`
- (caller) `cli/casting-ui/src/viewer.tsx` — wherever `<ManualCastingPrompt>` is rendered, to pass the new `lineState` prop. Confirm the exact file/line by grepping for `ManualCastingPrompt` / `CastingPromptBox` dispatch.

The prompt currently calls `computeManualRoundResult(validation.pick, castIndex, unpartedStalks)` to get `next` for the green reveal. Replace it with the algorithm of record: `performCast(lineState, pick)` then `next = maxPickFor(after) + 1`. `lineState` is already owned by the flow reducer; pass it down.

- [ ] In `cli/casting-ui/src/manual-prompt.tsx`, update imports — drop `computeManualRoundResult`, add the core step API and the `AdvanceableLineState` type:

  Before:
  ```ts
  import {
    computeManualRoundResult,
    manualFeedbackSurface,
    parseManualBuffer,
    validateManualInput,
  } from './manual-validation.js'
  ```
  After:
  ```ts
  import { maxPickFor, performCast } from '@hexagram/core'
  import type { AdvanceableLineState } from '@hexagram/core/types'

  import {
    manualFeedbackSurface,
    parseManualBuffer,
    validateManualInput,
  } from './manual-validation.js'
  ```

  > Verify `AdvanceableLineState` is exported from `@hexagram/core/types` (it is referenced by `maxPickFor`'s signature in `domain/core/src/index.ts`). If the type is not re-exported at the `./types` subpath, import it from wherever `maxPickFor` sources it and adjust this line.

- [ ] Add the `lineState` prop to `ManualCastingPromptProps`:
  ```ts
  interface ManualCastingPromptProps {
    lineNumber: 1 | 2 | 3 | 4 | 5 | 6
    castIndex: 0 | 1 | 2
    width: number
    unpartedStalks: number
    /**
     * The per-line algorithm state for THIS cast, owned by the flow reducer.
     * The prompt runs `performCast(lineState, pick)` to display the next-round
     * unparted count in the green reveal row. DISPLAY ONLY — the authoritative
     * advance is the reducer's own `performCast` in `splitCommitted`. Both call
     * the SAME core function, so there is one next-state computation, not two.
     */
    lineState: AdvanceableLineState
    manualRevealMs: number
    horizontalOffset: number
    onSubmit: (parsed: number) => void
    onReady?: () => void
    onFocusedFieldChange?: (field: ManualFocusedField) => void
    initialDraft?: ManualDraft
    onDraftChange?: (draft: ManualDraft) => void
  }
  ```
  Add `lineState` to the destructured params in the function signature.

- [ ] Replace the Enter-commit body that called `computeManualRoundResult`:

  Before:
  ```ts
        // First Enter: commit only when the validator passes.
        if (validation.kind !== 'ok') return
        // `validation.pick` is the LEFT-heap total (`4·pilesL + remL`); the core
        // pipeline consumes that same number as `partStalksAtIndex` (the cut
        // point) — they coincide because the left-heap size IS the partition
        // index. `result.next` here is DISPLAY ONLY (the reveal row); the
        // authoritative advance happens when `onSubmit(pick)` reaches
        // `performCast` in the flow reducer (`viewer-flow.ts`'s `splitCommitted`).
        const result = computeManualRoundResult(
          validation.pick,
          castIndex,
          unpartedStalks,
        )
        setCommitted({
          pick: validation.pick,
          next: result.next,
        })
        return
  ```
  After:
  ```ts
        // First Enter: commit only when the validator passes.
        if (validation.kind !== 'ok') return
        // `validation.pick` is the LEFT-heap total (`4·pilesL + remL`); the core
        // pipeline consumes that same number as `partStalksAtIndex` (the cut
        // point) — they coincide because the left-heap size IS the partition
        // index. Run the algorithm of record to display the next-round unparted
        // count: `maxPickFor(after) + 1`. DISPLAY ONLY — the reducer's own
        // `performCast` in `splitCommitted` is authoritative. Same function,
        // one computation, two presentation purposes.
        const after = performCast(lineState, validation.pick)
        const next = maxPickFor(after) + 1
        setCommitted({
          pick: validation.pick,
          next,
        })
        return
  ```

  > `performCast` on a `'2nd-cast'` input returns the resolved `'3rd-cast'` state, which has NO `unparted` and is OUTSIDE `maxPickFor`'s `AdvanceableLineState` domain. On the third cast there is no "next cast", but the reveal row still renders `committed.next`. Check what the third cast currently shows: `computeManualRoundResult` returns `next` from its closed form regardless of cast. To preserve the EXACT current third-cast reveal value, compute `next` defensively:
  >
  > ```ts
  > const after = performCast(lineState, validation.pick)
  > const next = after.phase === '3rd-cast' ? 0 : maxPickFor(after) + 1
  > ```
  >
  > BUT first verify what the old code displayed on cast 3 by reading the current `computeManualRoundResult` math against a 3rd-cast `unparted`, and confirm against the bottom-strip `resolved` branch rendering. The byte-identity test does not cover the transient reveal text, so use the `manual-prompt.test.tsx` reveal-row assertions as the oracle. If a third-cast reveal test exists and expects a specific number, match it exactly; if the third cast never shows a "next cast" row, gate the reveal text on `castIndex !== 2`. RESOLVE this before writing the line — do not guess.

- [ ] Update the caller (`cli/casting-ui/src/viewer.tsx` or the `<CastingPromptBox>` manual dispatch in `casting-prompt-box.tsx`) to pass `lineState`. The reducer already holds it as `state.lineState`; thread it through the prompt-box props the same way `unpartedStalks` / `castIndex` are passed. Confirm with:
  ```bash
  rg -n "ManualCastingPrompt|unpartedStalks=" cli/casting-ui/src/
  ```
  and add `lineState={state.lineState}` (or the equivalent prop name) alongside `unpartedStalks`. `state.lineState` is `LineState`; narrow/assert it to `AdvanceableLineState` at the call site if needed (mid-casting it is never `'3rd-cast'` — the reducer resets after each line; the same narrowing `recordedMaxFor` relies on).

- [ ] Type-check casting-ui (now expected GREEN):
  ```bash
  pnpm --filter @hexagram/casting-ui type:check
  ```
  Expected: no errors.

- [ ] Run the manual-prompt component tests (reveal row + commit behaviour):
  ```bash
  pnpm --filter @hexagram/casting-ui test -- manual-prompt
  ```
  Expected: green. If a reveal-row assertion fails, the `next` value differs from the old closed form — reconcile per the third-cast note above (the first two casts MUST match `maxPickFor(after)+1`, which the old Seam-1 test already proved equal to the closed form).

- [ ] Commit Tasks 3 + 4 together (they must land as one green change):
  ```bash
  git add cli/casting-ui/src/manual-validation.ts cli/casting-ui/src/manual-prompt.tsx cli/casting-ui/src/viewer.tsx cli/casting-ui/src/casting-prompt-box.tsx cli/casting-ui/tests/manual-validation.test.tsx
  git commit -m "Delete computeManualRoundResult; read next-round count from performCast

The manual prompt no longer re-implements the round arithmetic for its
reveal row — it runs the algorithm of record (performCast) directly and
reads maxPickFor(after)+1, the SAME computation the flow reducer uses to
advance. casting-ui's manual-validation.ts is now UI-routing only
(parseManualBuffer + manualFeedbackSurface) and re-exports the core
validateManualSplit under the prompt's existing local names. Removes the
deliberate computeManualRoundResult≡performCast duplicate and its
lock-in test; the manual≡interactive byte-identity test remains the
end-to-end guarantee.

https://claude.ai/code/session_013psvyKdKysvpzsYwcwFSMf"
  ```

---

## Task 5 — Verify the regression gate end-to-end

**Files:** none (verification only)

- [ ] Run the full casting-ui suite, focused on the byte-identity guarantee:
  ```bash
  pnpm --filter @hexagram/casting-ui test -- viewer
  ```
  Expected: `manual flow saves byte-identical to interactive for the same casting record` PASSES (the saved `{ query, hexagram, casting }` are equal across flows). This is the load-bearing proof that collapsing the two computations changed nothing observable in the saved file.

- [ ] Run both packages' full test + type-check + the workspace lint:
  ```bash
  pnpm --filter @hexagram/core test
  pnpm --filter @hexagram/core type:check
  pnpm --filter @hexagram/casting-ui test
  pnpm --filter @hexagram/casting-ui type:check
  pnpm lint:check
  pnpm format:check
  ```
  Expected: all green. (Core's slow `rng distribution` test is unaffected by this slice but still runs under `pnpm --filter @hexagram/core test`; it is ~40s by design.)

- [ ] Grep to confirm `computeManualRoundResult` is fully gone (no dangling references in src, tests, or docs):
  ```bash
  rg -n "computeManualRoundResult"
  ```
  Expected: NO matches (or only in this plan / a CHANGELOG if one is kept). If a doc/comment elsewhere references it, update that reference to point at `performCast` + `@hexagram/core/manual-validation`.

- [ ] Confirm the core invariants are importable from the package public API (the Next.js-reuse goal):
  ```bash
  rg -n "from '@hexagram/core/manual-validation'" domain/ cli/
  ```
  Expected: the casting-ui re-export module (and the core subpath test) import it; no deep relative reaches into `domain/core/src/manual-validation.ts` from outside the core package.

- [ ] If your team runs the contention scripts before merging a reducer/Ink change, do a stress pass:
  ```bash
  pnpm test:stress:once
  ```
  Expected: green; this slice touches no timing-sensitive code, but the manual prompt's `useInput`/reveal-timer paths are exercised.

---

## Done criteria

- `@hexagram/core/manual-validation` exports `validateManualSplit` + `ManualSplitValidation`, with the four-invariant priority order and `{5,9}`/`{4,8}` residues, TDD'd per invariant.
- `cli/casting-ui/src/manual-validation.ts` is UI-routing only (`parseManualBuffer`, `manualFeedbackSurface`) + a thin re-export of the core validator under the prompt's existing names.
- `computeManualRoundResult` is deleted; the prompt's `→ next cast: N unparted` reveal is computed from `performCast` (`maxPickFor(after)+1`) — one next-state computation, invoked authoritatively in the reducer and for-display in the prompt.
- The manual≡interactive byte-identity test and the manual-validation suite are green; saved output is byte-identical.
