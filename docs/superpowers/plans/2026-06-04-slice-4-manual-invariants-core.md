# Slice 4: Manual Invariants into @hexagram/core — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the pure manual-consultation I Ching invariants (conservation, never-zero remainder, suspended-sum residue) into `@hexagram/core` as domain knowledge with one home, and eliminate the deliberate `computeManualRoundResult ≡ performCast` duplicate so there is exactly one next-state computation.

**Architecture:** A new pure `validateManualSplit(...)` in `domain/core/src/manual-validation.ts` (exported at the subpath `@hexagram/core/manual-validation`) encodes the four-invariant priority order and reuses the existing `neverZeroMod4` from `casting-derivation.ts` rather than re-hand-rolling `((n-1)%4)+1`. `cli/casting-ui/src/manual-validation.ts` keeps ONLY UI concerns — buffer parsing (`parseManualBuffer`) and feedback routing (`manualFeedbackSurface`). It does NOT re-export the core validator. Instead, every casting-ui call site is FULLY REPOINTED to import `validateManualSplit` and `ManualSplitValidation` directly from `@hexagram/core/manual-validation` under core's canonical names. `computeManualRoundResult` is deleted: the prompt's `→ next cast: N unparted` reveal is fed by `performCast` (the algorithm of record) run once in the prompt, matching the flow reducer's authoritative advance.

**Tech Stack:** TypeScript, vitest, Ink, tsdown, pnpm workspaces

---

## Context the implementer must hold

**Path translation.** This slice ASSUMES Slices 0–3 merged. Read CURRENT code from `packages/...`, but WRITE to post-reorg paths:

| Current (read here) | Post-reorg (write here) |
| --- | --- |
| `packages/core/src/manual-validation.ts` (new) | `domain/core/src/manual-validation.ts` |
| `packages/core/src/casting-derivation.ts` | `domain/core/src/casting-derivation.ts` |
| `packages/core/src/index.ts` | `domain/core/src/index.ts` |
| `packages/core/src/types.ts` | `domain/core/src/types.ts` |
| `packages/core/tsdown.config.ts` | `domain/core/tsdown.config.ts` |
| `packages/core/package.json` | `domain/core/package.json` |
| `packages/core/tests/manual-validation.test.ts` (new) | `domain/core/tests/manual-validation.test.ts` |
| `packages/casting-ui/src/manual-validation.ts` | `cli/casting-ui/src/manual-validation.ts` |
| `packages/casting-ui/src/manual-prompt.tsx` | `cli/casting-ui/src/manual-prompt.tsx` |
| `packages/casting-ui/src/casting-prompt-box.tsx` | `cli/casting-ui/src/casting-prompt-box.tsx` |
| `packages/casting-ui/src/viewer.tsx` | `cli/casting-ui/src/viewer.tsx` |
| `packages/casting-ui/src/viewer-flow.ts` | `cli/casting-ui/src/viewer-flow.ts` |
| `packages/casting-ui/tests/manual-validation.test.tsx` | `cli/casting-ui/tests/manual-validation.test.tsx` |
| `packages/casting-ui/tests/viewer.test.tsx` | `cli/casting-ui/tests/viewer.test.tsx` |

If the post-reorg directories do not exist on the branch you are on (Slices 0–3 not yet merged), STOP and confirm with the human before proceeding — do not fall back to `packages/...` silently.

**Shared decisions (do NOT deviate):**

- Core subpath is exactly `@hexagram/core/manual-validation`.
- Result type is `ManualSplitValidation` (a discriminated union on `kind`: `incomplete | zero-remainder | conservation | suspended-sum | ok`); the function is `validateManualSplit`.
- Reuse the existing `neverZeroMod4` and `selectablePickMax` from `casting-derivation.ts`. Do NOT duplicate or re-hand-roll `((n-1)%4)+1`.
- Preserve the four-invariant priority order: **incomplete → zero-remainder → conservation → suspended-sum → ok**.
- Preserve the exact residue sets: cast 1 (`castIndex === 0`) expects `{5, 9}`; casts 2/3 (`castIndex === 1 | 2`) expect `{4, 8}`.
- Preserve every exact user-facing message / `expectedLabel` (`'5 or 9'` / `'4 or 8'`) and every render behaviour. Saved output must stay byte-identical (the manual≡interactive test in `viewer.test.tsx`).
- **FULL REPOINT, no passthrough shim.** casting-ui MUST NOT re-export the core validator under old local names. Every consumer imports `validateManualSplit` / `ManualSplitValidation` directly from `@hexagram/core/manual-validation` and is renamed at the call site explicitly.

**Regression gate (must stay green at every commit):**

```bash
pnpm --filter @hexagram/core test
pnpm --filter @hexagram/casting-ui test
pnpm --filter @hexagram/core type:check
pnpm --filter @hexagram/casting-ui type:check
```

The two load-bearing tests are the manual-validation suite and the byte-identity test at `cli/casting-ui/tests/viewer.test.tsx` (`it('manual flow saves byte-identical to interactive ...')`).

---

## Call-site inventory (the FULL REPOINT scope)

Grepped from the CURRENT codebase (`packages/casting-ui/...`). Every reference to `validateManualInput`, `ManualValidationResult`, or `computeManualRoundResult` is listed here as a concrete before/after edit. The decision is: **delete the casting-ui validator body + type, point every consumer at `@hexagram/core/manual-validation`, and rename to the canonical names** — no aliasing to old names purely to avoid edits.

| File | Current references | After |
| --- | --- | --- |
| `cli/casting-ui/src/manual-validation.ts` | DEFINES `validateManualInput` (L111), `ManualValidationResult` type (L54), `manualFeedbackSurface` (L96–98 — params typed `ManualValidationResult['kind']`), `parseManualBuffer` (L171), `computeManualRoundResult` (L23) | DELETE `validateManualInput`, `ManualValidationResult`, `computeManualRoundResult`. KEEP `parseManualBuffer` + `manualFeedbackSurface`, with `manualFeedbackSurface`'s param retyped to `ManualSplitValidation['kind']` (imported `type`-only from core). NO re-export of the core validator. |
| `cli/casting-ui/src/manual-prompt.tsx` | imports `computeManualRoundResult`, `validateManualInput` (+ `manualFeedbackSurface`, `parseManualBuffer`) from `./manual-validation.js` (L30–35); calls `validateManualInput({...})` (L234); calls `computeManualRoundResult(validation.pick, castIndex, unpartedStalks)` (L322) | Import `validateManualSplit` + types `ManualSplitValidation`/`AdvanceableLineState` from core; keep `manualFeedbackSurface`/`parseManualBuffer` from `./manual-validation.js`. Rename the L234 call `validateManualInput(` → `validateManualSplit(`. Replace the L322 `computeManualRoundResult` block with `performCast` + `maxPickFor` (Task 4). |
| `cli/casting-ui/tests/manual-validation.test.tsx` | imports `computeManualRoundResult`, `manualFeedbackSurface`, `validateManualInput` from `../src/manual-validation` (L5–9); `describe('validateManualInput', …)` (L13) + many `validateManualInput({...})` calls; `describe('computeManualRoundResult ≡ performCast …', …)` (L191) with `computeManualRoundResult(...)` calls (L196, L206) | Import `validateManualSplit` from `@hexagram/core/manual-validation`; keep `manualFeedbackSurface` from `../src/manual-validation`. DELETE the `computeManualRoundResult` import + its entire `describe` block. Rename `describe('validateManualInput', …)` → `describe('validateManualSplit', …)` and every `validateManualInput(` → `validateManualSplit(`. (The exhaustive validator cases now live in core's own suite — Task 1; here keep only the casting-ui-relevant surface: `manualFeedbackSurface` routing + any property test that exercises `validateManualSplit` against the never-zero guard.) |
| `cli/casting-ui/tests/viewer.test.tsx` | L1911 — COMMENT only: "Decomposition pinned by `computeManualRoundResult`" | Reword the comment to reference `performCast` (the now-single source). No code change. |
| `cli/casting-ui/src/casting-prompt-box.tsx` | renders `<ManualCastingPrompt …>` (L233) — does NOT pass `lineState` today | Thread a new `lineState` prop down to `<ManualCastingPrompt>` (Task 4). |
| `cli/casting-ui/src/viewer.tsx` | renders `<CastingPromptBox …>` (L590) with `unpartedStalks={currentMax + 1}` (L603); `state.lineState` is the reducer-owned per-line state (L233 `recordedMaxFor(state.lineState)`) | Pass `lineState={state.lineState}` alongside `unpartedStalks` (Task 4). |

There are NO other references — `viewer-flow.ts` consumes the validator indirectly (it owns `lineState` and runs `performCast` in `splitCommitted`) and imports neither the validator function nor its type, so it needs no edit beyond what Task 4 threads through props.

---

## Decisions baked into this plan

1. **Result type — discriminated union, canonical name everywhere.** The core export is `validateManualSplit(...)` returning `ManualSplitValidation` (a discriminated union on `kind`). It is identical in shape to the current `ManualValidationResult`:

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

   **No passthrough shim.** `cli/casting-ui/src/manual-validation.ts` does NOT re-export `validateManualSplit` or `ManualSplitValidation`. Every casting-ui consumer (the prompt, the manual-validation test) imports them DIRECTLY from `@hexagram/core/manual-validation` using the canonical names. The old local names `validateManualInput` / `ManualValidationResult` are RETIRED — call sites are renamed explicitly to `validateManualSplit` / `ManualSplitValidation`. Rationale (reviewer decision): a passthrough re-export hides the dependency edge and leaves a dead alias whose only purpose is to keep a diff small; an explicit repoint makes the package boundary legible — a reader sees the I Ching invariants are imported from core, not from a sibling UI module.

2. **`computeManualRoundResult` is DELETED.** The prompt's reveal row (`→ next cast: N unparted`) reads the next-round unparted count from `performCast`, the algorithm of record, run once in the prompt's Enter handler. `next = maxPickFor(after) + 1` where `after = performCast(lineState, pick)`. This collapses the two next-state computations into one and removes the Seam-1 "≡" lock-in test (it tested two paths agreeing; there is now only one path). The byte-identity test remains the end-to-end guarantee that manual and interactive produce the same saved file.

   To run `performCast` in the prompt we need the current `LineState`. The prompt today receives only `unpartedStalks: number` + `castIndex`. We pass the live `lineState` down from the viewer (it already lives in `flowReducer`'s `state.lineState`) as a new prop `lineState: AdvanceableLineState`, threaded `viewer.tsx → casting-prompt-box.tsx → manual-prompt.tsx`. The prompt computes `next` from `maxPickFor(performCast(lineState, pick)) + 1`. This is DISPLAY ONLY in the prompt; the authoritative advance still happens in the reducer's `splitCommitted`. Both now call the SAME `performCast` — there is one computation, invoked in two places for two presentation purposes, not two re-implementations.

3. **What stays in `cli/casting-ui/src/manual-validation.ts`:** `parseManualBuffer` (buffer→int, pure UI input parsing) and `manualFeedbackSurface` (UI routing: gauge / strip / none). Both are UI-layer knowledge (how a digit buffer and a render surface behave), not I Ching domain rules. `manualFeedbackSurface` is retyped to operate on `ManualSplitValidation['kind']` (a `type`-only import from core) so adding a new core outcome still forces a routing decision here (the missing `case` fails `tsc`).

---

## Task 1 — Create the core validator with TDD (one invariant at a time)

**Files:**
- `domain/core/tests/manual-validation.test.ts` (new)
- `domain/core/src/manual-validation.ts` (new)

The core validator is pure and has NO React/Ink imports. Build it test-first, one invariant per red→green cycle. It validates TYPED remainders (the user hand-counts them), so it does NOT derive remainders and does NOT call `neverZeroMod4`; conservation/suspended-sum are pure arithmetic on the four typed numbers. The never-zero authority (`neverZeroMod4`, used by `deriveSplit` / `selectablePickMax` in `casting-derivation.ts`) is what this validator's `[1, unparted-1]` guarantee is proven against by the `assertSelectablePick` property test below.

- [ ] Write the failing test file `domain/core/tests/manual-validation.test.ts`. Port every case from the current `packages/casting-ui/tests/manual-validation.test.tsx` `describe('validateManualInput', ...)` block verbatim, renamed to `validateManualSplit`:

  ```ts
  import { describe, expect, it } from 'vitest'
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

  > Note on `neverZeroMod4`: the validator does NOT derive remainders (the user types them), so `neverZeroMod4` is not called here. It IS already used by `deriveSplit` / `selectablePickMax` in `casting-derivation.ts`, which is the never-zero authority this validator's `[1, unparted-1]` guarantee is proven against by the `assertSelectablePick` property test above. Do NOT add a redundant `neverZeroMod4` import to this file, and do NOT re-hand-roll `((n-1)%4)+1` anywhere in it.

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

## Task 3 — Strip casting-ui's validator to UI-routing only; delete `computeManualRoundResult`

**Files:**
- `cli/casting-ui/src/manual-validation.ts` (becomes UI-routing only)
- `cli/casting-ui/tests/manual-validation.test.tsx`

The casting-ui file now keeps ONLY `parseManualBuffer` (UI input parsing) and `manualFeedbackSurface` (UI routing). It does NOT define `validateManualInput`/`ManualValidationResult` and does NOT re-export the core validator — every consumer repoints directly at `@hexagram/core/manual-validation` (Task 4 handles the prompt). `manualFeedbackSurface`'s param is retyped to `ManualSplitValidation['kind']` via a `type`-only core import.

- [ ] Rewrite `cli/casting-ui/src/manual-validation.ts` to:

  ```ts
  // UI-layer manual-flow helpers. The I Ching INVARIANTS live in
  // `@hexagram/core/manual-validation` (validateManualSplit); this module owns
  // ONLY the casting-ui concerns: parsing a digit buffer, and routing the
  // validator's outcome to a render surface. It does NOT re-export the core
  // validator — consumers import validateManualSplit / ManualSplitValidation
  // straight from core, so the package boundary stays legible.

  import type { ManualSplitValidation } from '@hexagram/core/manual-validation'

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
   * The `switch` is exhaustive over `ManualSplitValidation['kind']`, so adding a
   * new core outcome forces a routing decision here (the missing `case` fails
   * `tsc`).
   */
  export function manualFeedbackSurface(
    kind: ManualSplitValidation['kind'],
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

  `computeManualRoundResult`, `validateManualInput`, and the `ManualValidationResult` type are GONE from this file (no export, no definition, no re-export alias).

- [ ] Update `cli/casting-ui/tests/manual-validation.test.tsx`:
  - Change the import block: import `validateManualSplit` from `@hexagram/core/manual-validation`, and keep `manualFeedbackSurface` from `../src/manual-validation`. DELETE the `computeManualRoundResult` import (and the `validateManualInput` import — it no longer exists in this package).

    Before:
    ```ts
    import {
      computeManualRoundResult,
      manualFeedbackSurface,
      validateManualInput,
    } from '../src/manual-validation'
    ```
    After:
    ```ts
    import { validateManualSplit } from '@hexagram/core/manual-validation'

    import { manualFeedbackSurface } from '../src/manual-validation'
    ```

  - DELETE the entire `describe('computeManualRoundResult ≡ performCast (next-round count)', ...)` block (L191) — there is no second next-state computation to lock against any more (its single-source guarantee is now structural: the prompt calls `performCast` directly). Drop the now-unused `initialLineState` / `maxPickFor` / `performCast` import from `@hexagram/core` if that block was their only consumer; keep `assertSelectablePick` if the surviving property test still uses it.
  - Rename `describe('validateManualInput', ...)` → `describe('validateManualSplit', ...)` and every `validateManualInput(` call inside it to `validateManualSplit(`. These cases now duplicate core's own suite (Task 1) — TRIM this casting-ui copy to the minimum that proves the package's public surface still works end-to-end: keep the `manualFeedbackSurface` routing `describe` and ONE smoke case that calls `validateManualSplit` through the core specifier (the bulk invariant coverage is core's responsibility now). Do not leave a verbatim 200-line duplicate of core's suite in the UI package.

- [ ] Run the casting-ui manual-validation test:
  ```bash
  pnpm --filter @hexagram/casting-ui test -- manual-validation
  ```
  Expected: green; the `computeManualRoundResult` describe is gone and the survivors resolve `validateManualSplit` through `@hexagram/core/manual-validation`.

- [ ] Type-check (will still FAIL until Task 4 — `manual-prompt.tsx` still imports `computeManualRoundResult` / `validateManualInput` from `./manual-validation.js`):
  ```bash
  pnpm --filter @hexagram/casting-ui type:check
  ```
  Expected: errors in `manual-prompt.tsx` — `computeManualRoundResult` and `validateManualInput` have no exported member. This is expected; Task 4 fixes it. (Do NOT commit a broken type-check — fold Task 3 + Task 4 into one commit, or stage Task 3 and commit only after Task 4 is green.)

---

## Task 4 — Repoint the prompt at core; feed the reveal from `performCast`

**Files:**
- `cli/casting-ui/src/manual-prompt.tsx`
- `cli/casting-ui/src/casting-prompt-box.tsx` (the `<ManualCastingPrompt>` dispatch — add the new `lineState` prop)
- `cli/casting-ui/src/viewer.tsx` (the `<CastingPromptBox>` render — pass `lineState={state.lineState}`)

Two changes land together here: (a) the prompt imports `validateManualSplit` directly from core under its canonical name, renaming the L234 call from `validateManualInput`; (b) the reveal row reads from `performCast` instead of the deleted `computeManualRoundResult`. The `lineState` prop is threaded `viewer.tsx → casting-prompt-box.tsx → manual-prompt.tsx`.

- [ ] In `cli/casting-ui/src/manual-prompt.tsx`, update imports — drop `computeManualRoundResult` and `validateManualInput` from `./manual-validation.js`; import `validateManualSplit` + its type from core, add the core step API and the `AdvanceableLineState` type. Keep `manualFeedbackSurface` / `parseManualBuffer` local:

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
  import {
    validateManualSplit,
    type ManualSplitValidation,
  } from '@hexagram/core/manual-validation'
  import type { AdvanceableLineState } from '@hexagram/core/types'

  import {
    manualFeedbackSurface,
    parseManualBuffer,
  } from './manual-validation.js'
  ```

  > Import only what the file uses: if `ManualSplitValidation` is never referenced by name in `manual-prompt.tsx` (the component narrows on `validation.kind` inline), drop the `type ManualSplitValidation` import — do not add an unused import to satisfy the plan. Grep `ManualValidationResult` in the current file first; today it is referenced ONLY through the `validateManualInput` return value's narrowing, so the type import is likely unnecessary.

  > **EXECUTION-TIME FACT-CHECK (flagged):** Verify `AdvanceableLineState` is exported from `@hexagram/core/types` (it is referenced by `maxPickFor`'s signature in `domain/core/src/index.ts`, and `packages/core/src/types.ts` defines `export type AdvanceableLineState`). If `domain/core/src/types.ts` does NOT re-export it at the `./types` subpath, import it from wherever `maxPickFor` sources it and adjust this line. Do not assume — confirm the export at execution time.

- [ ] Rename the validator call (current L234) from `validateManualInput` to `validateManualSplit`:

  Before:
  ```ts
  const validation = validateManualInput({
    pilesL,
    remL,
    pilesR,
    remR,
    unparted: unpartedStalks,
    castIndex,
  })
  ```
  After:
  ```ts
  const validation = validateManualSplit({
    pilesL,
    remL,
    pilesR,
    remR,
    unparted: unpartedStalks,
    castIndex,
  })
  ```

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
  Add `lineState` to the destructured params in the `ManualCastingPrompt({ ... })` function signature (current L187).

- [ ] Replace the Enter-commit body that called `computeManualRoundResult` (current L322):

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

  > **EXECUTION-TIME FACT-CHECK (flagged) — third-cast reveal value.** `performCast` on a `'2nd-cast'` input returns the resolved `'3rd-cast'` state, which has NO `unparted` and is OUTSIDE `maxPickFor`'s `AdvanceableLineState` domain. On the third cast there is no "next cast", but the reveal row still renders `committed.next`. BEFORE writing this line, verify what the OLD code displayed on cast 3: read the current `computeManualRoundResult` math (`packages/casting-ui/src/manual-validation.ts` L23–36 — `_castIndex` is ignored, so it returns a `next` from `pick` + `unparted` regardless of cast) against a 3rd-cast `unparted`, and confirm against the bottom-strip `resolved` branch rendering. The byte-identity test does NOT cover the transient reveal text, so use the `manual-prompt.test.tsx` reveal-row assertions as the oracle. If a third-cast reveal test exists and expects a specific number, match it exactly with a defensive form, e.g.:
  >
  > ```ts
  > const after = performCast(lineState, validation.pick)
  > const next = after.phase === '3rd-cast' ? 0 : maxPickFor(after) + 1
  > ```
  >
  > If the third cast never shows a "next cast" row, gate the reveal text on `castIndex !== 2` instead. RESOLVE this from the test oracle before writing the line — do not guess. The first two casts MUST equal `maxPickFor(after)+1`, which the old Seam-1 test already proved equal to the closed form.

- [ ] Thread `lineState` through the caller chain. In `cli/casting-ui/src/casting-prompt-box.tsx`, add `lineState` to `CastingPromptBoxProps` and forward it to `<ManualCastingPrompt>` (current dispatch at L233), alongside `unpartedStalks`. Then in `cli/casting-ui/src/viewer.tsx`, pass `lineState={state.lineState}` on the `<CastingPromptBox>` render (current L590, next to `unpartedStalks={currentMax + 1}` at L603). The reducer already owns `state.lineState` (it's read at L233 via `recordedMaxFor(state.lineState)`).

  `state.lineState` is typed `LineState`; narrow/assert it to `AdvanceableLineState` at the call site if `tsc` rejects the wider type (mid-casting it is never `'3rd-cast'` — the reducer resets after each line; the same narrowing `recordedMaxFor` relies on). Confirm the exact prop wiring with:
  ```bash
  rg -n "ManualCastingPrompt|unpartedStalks=|state.lineState" cli/casting-ui/src/
  ```

- [ ] Type-check casting-ui (now expected GREEN):
  ```bash
  pnpm --filter @hexagram/casting-ui type:check
  ```
  Expected: no errors.

- [ ] Run the manual-prompt component tests (reveal row + commit behaviour):
  ```bash
  pnpm --filter @hexagram/casting-ui test -- manual-prompt
  ```
  Expected: green. If a reveal-row assertion fails, the `next` value differs from the old closed form — reconcile per the third-cast fact-check above (the first two casts MUST match `maxPickFor(after)+1`).

- [ ] Commit Tasks 3 + 4 together (they must land as one green change):
  ```bash
  git add cli/casting-ui/src/manual-validation.ts cli/casting-ui/src/manual-prompt.tsx cli/casting-ui/src/casting-prompt-box.tsx cli/casting-ui/src/viewer.tsx cli/casting-ui/tests/manual-validation.test.tsx
  git commit -m "Repoint manual prompt at @hexagram/core/manual-validation; drop computeManualRoundResult

The manual prompt now imports validateManualSplit directly from core
under its canonical name (no passthrough re-export through the casting-ui
module). casting-ui's manual-validation.ts is UI-routing only
(parseManualBuffer + manualFeedbackSurface). The reveal row no longer
re-implements the round arithmetic — it runs the algorithm of record
(performCast) directly and reads maxPickFor(after)+1, the SAME
computation the flow reducer uses to advance. Removes the deliberate
computeManualRoundResult≡performCast duplicate and its lock-in test; the
manual≡interactive byte-identity test remains the end-to-end guarantee.

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

- [ ] Grep to confirm `computeManualRoundResult`, `validateManualInput`, and `ManualValidationResult` are fully gone (no dangling references or passthrough aliases in src, tests, or docs):
  ```bash
  rg -n "computeManualRoundResult|validateManualInput|ManualValidationResult"
  ```
  Expected: NO matches in `cli/` or `domain/` source/tests (or only in this plan / a CHANGELOG if one is kept). If a doc/comment elsewhere references them, update that reference to point at `validateManualSplit` + `performCast` + `@hexagram/core/manual-validation`. The `cli/casting-ui/tests/viewer.test.tsx` L1911 comment ("Decomposition pinned by `computeManualRoundResult`") MUST be reworded to reference `performCast`.

- [ ] Confirm casting-ui does NOT re-export the core validator (no passthrough shim survived):
  ```bash
  rg -n "validateManualSplit|ManualSplitValidation" cli/casting-ui/src/manual-validation.ts
  ```
  Expected: ONLY the `import type { ManualSplitValidation }` line used by `manualFeedbackSurface`'s param — NO `export const validateManualInput = …`, NO `export { validateManualSplit }`, NO `export type ManualValidationResult = …`.

- [ ] Confirm the core invariants are importable from the package public API and every consumer reaches them through the subpath (the Next.js-reuse goal + full-repoint check):
  ```bash
  rg -n "from '@hexagram/core/manual-validation'" domain/ cli/
  ```
  Expected: `manual-prompt.tsx`, the casting-ui `manual-validation.ts` (type-only), the casting-ui manual-validation test, and the core subpath test all import through the specifier; no deep relative reaches into `domain/core/src/manual-validation.ts` from outside the core package.

- [ ] If your team runs the contention scripts before merging a reducer/Ink change, do a stress pass:
  ```bash
  pnpm test:stress:once
  ```
  Expected: green; this slice touches no timing-sensitive code, but the manual prompt's `useInput`/reveal-timer paths are exercised.

---

## Done criteria

- `@hexagram/core/manual-validation` exports `validateManualSplit` + `ManualSplitValidation`, with the four-invariant priority order and `{5,9}`/`{4,8}` residues, TDD'd per invariant.
- `cli/casting-ui/src/manual-validation.ts` is UI-routing only (`parseManualBuffer`, `manualFeedbackSurface`). It does NOT re-export the core validator — every casting-ui consumer (prompt, test) imports `validateManualSplit` / `ManualSplitValidation` directly from `@hexagram/core/manual-validation` under the canonical names; the old `validateManualInput` / `ManualValidationResult` names are retired.
- `computeManualRoundResult` is deleted; the prompt's `→ next cast: N unparted` reveal is computed from `performCast` (`maxPickFor(after)+1`) — one next-state computation, invoked authoritatively in the reducer and for-display in the prompt, with `lineState` threaded `viewer.tsx → casting-prompt-box.tsx → manual-prompt.tsx`.
- The manual≡interactive byte-identity test and the manual-validation suite are green; saved output is byte-identical.
