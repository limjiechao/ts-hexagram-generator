# `performCast` Rewindable Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract a pure phase-indexed `performCast(state, pick) → state` function from `@hexagram/core`'s per-line generator so the algorithm becomes resumable from any cast, while keeping every current consumer working unchanged.

**Architecture:** Introduce a `LineState` discriminated union in `@hexagram/types` (four phases — `'0th-cast'` through `'3rd-cast'`, with tuple-length-narrowed `rounds` per phase and a terminal `'3rd-cast'` carrying the resolved `Line`). Add `performCast`, `initialLineState`, and `maxPickFor` to `@hexagram/core`. Re-express the existing `makeLineGenerator` as a thin generator wrapper around `performCast`, preserving its public signature byte-for-byte. Migrate `packages/casting-ui/src/use-line-generator.ts` from holding a `Generator` ref to holding a `LineState` ref — the hook's external API (`submitSplit`, `rewindCurrentLine`, `currentMax`) does not change, so the viewer, the reducer, and every existing test continue to work.

**Tech Stack:** TypeScript, pnpm workspaces, Turborepo, Vitest, tsdown, React 19 + Ink (downstream consumer).

**Scope (in):** New primitive in `@hexagram/core/index.ts` and new type in `@hexagram/types/src/index.ts`; thin-wrapper rewrite of `makeLineGenerator`; in-place migration of `use-line-generator.ts`. All existing behavior preserved.

**Scope (out):** New rewind keybindings or new viewer UX, widening the manual flow's two-line undo window to multi-line, and the `lineRewound` reducer action's payload shape. Those are reducer/host concerns that can be a follow-up plan once this primitive lands.

---

## File structure

| File | Role | Action |
|---|---|---|
| `packages/types/src/index.ts` | Add `LineState` union | **Modify** (append) |
| `packages/core/src/index.ts` | Add `initialLineState`, `maxPickFor`, `performCast`; wrap `makeLineGenerator` | **Modify** |
| `packages/core/tests/perform-cast.test.ts` | Unit + type-narrowing tests for the new primitive | **Create** |
| `packages/casting-ui/src/use-line-generator.ts` | Replace `Generator` ref with `LineState` ref | **Modify** |
| `packages/core/tests/random-casting.test.ts` | Unchanged — re-run to prove wrapper preserves behavior | (verify only) |
| `packages/consultation-file/tests/legacy-converter.test.ts` | Unchanged — re-run to prove wrapper preserves behavior | (verify only) |
| `packages/casting-ui/tests/use-line-generator.test.tsx` | Unchanged — re-run to prove hook migration preserves behavior | (verify only) |
| `packages/casting-ui/tests/viewer-flow.test.ts` | Unchanged | (verify only) |
| `packages/casting-ui/tests/viewer.test.tsx` | Unchanged | (verify only) |

Note on placement of `LineState`: matches the existing convention. `@hexagram/types` already houses `Line`, `Hexagram`, `FourOperationsResult`, `LineGeneratorResult`, `CastingRecord`, `PartialCastingRecord`, etc. `LineState` is part of the same family.

Note on the absence of a runtime assertion (`assertIsLineState`): the other types carry assertions because they cross the generator boundary where TS narrowing is lost. `LineState` is only ever produced by `performCast`, which is fully type-narrowed end-to-end — a runtime assertion would be dead weight today. If a future consumer deserializes a `LineState` from disk, that is the time to add one.

---

## Task 1: Add `LineState` discriminated union to `@hexagram/types`

**Files:**
- Modify: `packages/types/src/index.ts` (append after `LineGeneratorResult` block at line 141)

- [ ] **Step 1: Write the type-check assertion as a structural test**

We don't have type-only test files in this repo. The strongest test we can write at this step is "the new type compiles and another file can `import type` it without runtime cost." Verification is `pnpm --filter @hexagram/types type:check`.

- [ ] **Step 2: Append the new type to `packages/types/src/index.ts`**

Append at end of file (after the closing brace of `assertIsLineGeneratorResult` block at line 141):

```ts
// Per-line algorithmic state, indexed by the number of casts committed so
// far. Each cast advances the phase by one; `'3rd-cast'` is the resolved
// terminal phase carrying the emerged Line. Designed to let `performCast`
// in `@hexagram/core` be a pure forward-step function — the phase
// discriminant lets the static type system narrow `rounds` to the exact
// tuple length per phase and exclude resolved states from the input domain
// of the step function (so stepping a resolved line is a compile error,
// not a runtime throw).
export type LineState =
  | {
      phase: '0th-cast'
      unparted: number[]
      suspended: number[]
      rounds: []
    }
  | {
      phase: '1st-cast'
      unparted: number[]
      suspended: number[]
      rounds: [FourOperationsResult]
    }
  | {
      phase: '2nd-cast'
      unparted: number[]
      suspended: number[]
      rounds: [FourOperationsResult, FourOperationsResult]
    }
  | {
      phase: '3rd-cast'
      rounds: [FourOperationsResult, FourOperationsResult, FourOperationsResult]
      line: Line
    }

// The non-terminal phases — the input domain of `performCast`. A line in
// the `'3rd-cast'` phase is fully resolved; calling `performCast` on it
// would be a programming error and is rejected at the type level.
export type AdvanceableLineState = Extract<
  LineState,
  { phase: '0th-cast' | '1st-cast' | '2nd-cast' }
>
```

- [ ] **Step 3: Run the type check and the lint suite**

Run: `pnpm --filter @hexagram/types type:check && pnpm --filter @hexagram/types test`
Expected: both pass (no tests in `@hexagram/types`, vitest's `--passWithNoTests` keeps it green).

Run: `pnpm lint:check && pnpm format:check`
Expected: both pass.

- [ ] **Step 4: Commit**

```bash
git add packages/types/src/index.ts
git commit -m "feat(types): add LineState discriminated union for resumable casting

Phase-indexed (0th-cast..3rd-cast) with rounds tuple length narrowed
per phase and the terminal phase carrying the resolved Line. Foundation
for the upcoming performCast pure step function in @hexagram/core.
AdvanceableLineState exposes the non-terminal subdomain that performCast
will accept as input."
```

---

## Task 2: Add `initialLineState`, `maxPickFor`, and `performCast` to `@hexagram/core`

**Files:**
- Modify: `packages/core/src/index.ts` (add new exports above `makeLineGenerator` at line 170)
- Create: `packages/core/tests/perform-cast.test.ts`

- [ ] **Step 1: Write the failing test file**

Create `packages/core/tests/perform-cast.test.ts` with the full test set:

```ts
import type { AdvanceableLineState, LineState } from '@hexagram/types'
import { describe, expect, test } from 'vitest'

import {
  initialLineState,
  maxPickFor,
  performCast,
  stalksBeforeParting,
} from '../src/index'

describe('initialLineState', () => {
  test('is in 0th-cast phase with all 49 stalks unparted', () => {
    expect(initialLineState.phase).toBe('0th-cast')
    expect(initialLineState.unparted).toEqual(stalksBeforeParting)
    expect(initialLineState.unparted).toHaveLength(49)
    expect(initialLineState.suspended).toEqual([])
    expect(initialLineState.rounds).toEqual([])
  })
})

describe('maxPickFor', () => {
  test('reports unparted.length - 1 in 0th-cast (=48)', () => {
    expect(maxPickFor(initialLineState)).toBe(48)
  })

  test('reports the smaller selectable range after one cast', () => {
    const next = performCast(initialLineState, 24)
    expect(maxPickFor(next)).toBe(next.unparted.length - 1)
    expect(maxPickFor(next)).toBeLessThan(48)
  })
})

describe('performCast', () => {
  test('0th-cast → 1st-cast adds round[0] and updates unparted/suspended', () => {
    const next = performCast(initialLineState, 24)
    expect(next.phase).toBe('1st-cast')
    expect(next.rounds).toHaveLength(1)
    expect(next.unparted).toEqual(next.rounds[0].unpartedStalks)
    expect(next.suspended).toEqual(next.rounds[0].suspendedFromNextRound)
  })

  test('three sequential casts produce a 3rd-cast state with a valid Line', () => {
    const s1 = performCast(initialLineState, 24)
    const s2 = performCast(s1, Math.max(1, s1.unparted.length - 2))
    const s3 = performCast(s2, Math.max(1, s2.unparted.length - 2))
    expect(s3.phase).toBe('3rd-cast')
    if (s3.phase !== '3rd-cast') throw new Error('phase narrowing failed')
    expect(s3.rounds).toHaveLength(3)
    expect([6, 7, 8, 9]).toContain(s3.line)
  })

  test('is deterministic: same picks → same Line', () => {
    const cast = (picks: [number, number, number]) => {
      const s1 = performCast(initialLineState, picks[0])
      const s2 = performCast(s1, picks[1])
      const s3 = performCast(s2, picks[2])
      if (s3.phase !== '3rd-cast') throw new Error('phase narrowing failed')
      return s3.line
    }
    const a = cast([24, 17, 9])
    const b = cast([24, 17, 9])
    expect(a).toBe(b)
  })

  test('immutability: the input state is not mutated', () => {
    const before = initialLineState
    const beforeUnpartedSnapshot = [...before.unparted]
    performCast(before, 24)
    expect(before.unparted).toEqual(beforeUnpartedSnapshot)
    expect(before.rounds).toEqual([])
    expect(before.phase).toBe('0th-cast')
  })

  test('rewind-by-replay reproduces the same state from a SplitRecord prefix', () => {
    // The casting record (SplitRecord[]) is the natural input to rewind:
    // throw away picks past the rewind point, replay the survivors through
    // performCast, and you land on the exact state you had before.
    const picks: [number, number, number] = [24, 17, 9]
    const full = picks.reduce<AdvanceableLineState | LineState>(
      (state, pick) => {
        if (state.phase === '3rd-cast') throw new Error('over-stepped')
        return performCast(state, pick)
      },
      initialLineState as LineState,
    )
    if (full.phase !== '3rd-cast') throw new Error('did not resolve')

    // Now simulate rewinding to after-cast-1 by replaying only the first pick.
    const rewound = performCast(initialLineState, picks[0])
    // Re-extending it with the same remaining picks should produce the same
    // line as the full play-through.
    const s2 = performCast(rewound, picks[1])
    const s3 = performCast(s2, picks[2])
    if (s3.phase !== '3rd-cast') throw new Error('replay did not resolve')
    expect(s3.line).toBe(full.line)
  })
})

describe('performCast — type-level invariants', () => {
  test('performCast on a 3rd-cast state is a compile error', () => {
    const s1 = performCast(initialLineState, 24)
    const s2 = performCast(s1, Math.max(1, s1.unparted.length - 2))
    const s3 = performCast(s2, Math.max(1, s2.unparted.length - 2))
    if (s3.phase !== '3rd-cast') throw new Error('phase narrowing failed')
    // @ts-expect-error — '3rd-cast' is not in the input domain of performCast.
    // If this directive ever becomes "unused", the conditional type has
    // weakened — investigate before deleting.
    performCast(s3, 1)
  })

  test('the return phase narrows correctly: 0th-cast → 1st-cast', () => {
    // The conditional NextPhase type binds the output phase to the input
    // phase. We test it dynamically here (the runtime tag matches), and the
    // surrounding compile-time discriminant narrowing in performCast's
    // signature ensures the type matches statically too.
    const after = performCast(initialLineState, 24)
    expect(after.phase).toBe('1st-cast')
    // This branch must compile (after is narrowed to '1st-cast'). If
    // performCast ever loses its phase-binding behavior, this assignment
    // becomes a type error.
    const _typed: Extract<LineState, { phase: '1st-cast' }> = after
    expect(_typed.rounds).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run the failing test**

Run: `pnpm --filter @hexagram/core test -- tests/perform-cast.test.ts`
Expected: FAIL — `initialLineState`, `maxPickFor`, and `performCast` are not exported from `../src/index`.

- [ ] **Step 3: Add the implementation to `packages/core/src/index.ts`**

Insert the following block in `packages/core/src/index.ts` immediately above the existing `makeLineGenerator` declaration (around line 169, between the closing `}` of `fourOperations` and the `// Pipe three rounds for a complete line` comment):

```ts
// ---------------------------------------------------------------------------
// Pure step API — `performCast` advances a `LineState` by one cast.
//
// The classic generator API (`makeLineGenerator`, below) is a generator
// wrapper around this step function; existing consumers don't need to know
// `performCast` exists. The point of exposing it as a public primitive is
// that the state is a value, not a hidden frame — host code can hold it,
// rebuild it from a SplitRecord prefix, and resume from any cast.
// ---------------------------------------------------------------------------

export const initialLineState: Extract<LineState, { phase: '0th-cast' }> = {
  phase: '0th-cast',
  unparted: stalksBeforeParting,
  suspended: [],
  rounds: [],
}

// The selectable range for the next pick: the prompt's "Pick a number from
// 1 to max". Only meaningful before resolution — `'3rd-cast'` has nothing
// left to pick, so it's excluded from the input domain.
export const maxPickFor = (state: AdvanceableLineState): number =>
  state.unparted.length - 1

// Phase advancement is total over the non-terminal subdomain; the conditional
// type binds the output phase to the input phase exactly.
type NextPhase<P extends AdvanceableLineState['phase']> = P extends '0th-cast'
  ? '1st-cast'
  : P extends '1st-cast'
    ? '2nd-cast'
    : '3rd-cast'

export function performCast<P extends AdvanceableLineState['phase']>(
  state: Extract<LineState, { phase: P }>,
  pick: number,
): Extract<LineState, { phase: NextPhase<P> }> {
  const roundResult = fourOperations({
    unpartedStalks: state.unparted,
    suspendedFromNextRound: state.suspended,
    partStalksAtIndex: pick,
  })

  const nextRoundsLength = state.rounds.length + 1

  if (nextRoundsLength === 3) {
    const maybeLine = roundResult.unpartedStalks.length / 4
    assertIsLine(maybeLine)
    // The runtime branch decides which discriminant we're emitting; the
    // signature's conditional type tells callers it matches their input.
    // The `as` cast is the bridge between the two — necessary because TS
    // cannot infer the conditional return from a runtime if-branch alone.
    return {
      phase: '3rd-cast',
      rounds: [...state.rounds, roundResult] as [
        FourOperationsResult,
        FourOperationsResult,
        FourOperationsResult,
      ],
      line: maybeLine,
    } as Extract<LineState, { phase: NextPhase<P> }>
  }

  const nextPhase = nextRoundsLength === 1 ? '1st-cast' : '2nd-cast'
  return {
    phase: nextPhase,
    unparted: roundResult.unpartedStalks,
    suspended: roundResult.suspendedFromNextRound,
    rounds: [...state.rounds, roundResult],
  } as Extract<LineState, { phase: NextPhase<P> }>
}
```

You'll also need to extend the imports at the top of `packages/core/src/index.ts`:

Replace the existing import block (lines 1-5):

```ts
import {
  assertIsLine,
  type FourOperationsResult,
  type Line,
} from '@hexagram/types'
```

with:

```ts
import {
  assertIsLine,
  type AdvanceableLineState,
  type FourOperationsResult,
  type Line,
  type LineState,
} from '@hexagram/types'
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @hexagram/core test -- tests/perform-cast.test.ts`
Expected: PASS — all `describe('performCast')` blocks green, including the `@ts-expect-error` line (vitest treats `@ts-expect-error` as a TypeScript directive and the test body runs).

Run: `pnpm --filter @hexagram/core type:check`
Expected: PASS — the conditional type compiles, the `@ts-expect-error` directive is satisfied (i.e., the next line really would be an error without it).

- [ ] **Step 5: Run the lint + format check**

Run: `pnpm lint:check && pnpm format:check`
Expected: PASS. (If oxfmt rewraps anything, run `pnpm format:fix` and re-check.)

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/index.ts packages/core/tests/perform-cast.test.ts
git commit -m "feat(core): add performCast pure step function with phase-indexed LineState

Exposes initialLineState, maxPickFor, and performCast. The conditional
NextPhase type binds the output phase to the input phase exactly; calling
performCast on a resolved '3rd-cast' state is a compile error rather
than a runtime throw. This is the foundation the rewindable casting
flow will consume — the classic makeLineGenerator becomes a wrapper in
the next commit."
```

---

## Task 3: Re-express `makeLineGenerator` as a thin wrapper around `performCast`

**Files:**
- Modify: `packages/core/src/index.ts` (replace the body of `makeLineGenerator` at lines 170-197)

- [ ] **Step 1: Run the existing core + consultation-file tests to establish a green baseline**

Run: `pnpm --filter @hexagram/core test && pnpm --filter @hexagram/consultation-file test`
Expected: PASS. The slow `rng distribution (slow)` test in `random-casting.test.ts` takes ~30 s — wait for it.

This is the baseline we are protecting: the wrapper rewrite MUST keep both of these suites green without modification.

- [ ] **Step 2: Replace `makeLineGenerator`'s body**

Replace the existing `makeLineGenerator` block (lines 170-197):

```ts
// Pipe three rounds for a complete line
export const makeLineGenerator = function* (roundOneArguments: {
  unpartedStalks: number[]
  suspendedFromNextRound: number[]
  partStalksAtIndex: number
}): Generator<
  /* Yield */ FourOperationsResult,
  /* Return */ Line,
  /* Next */ number
> {
  const rounds = Array.from({ length: 3 }, () => fourOperations)

  let nextRoundArguments = roundOneArguments

  for (const round of rounds) {
    const results = round(nextRoundArguments)
    const partStalksAtIndex = yield results
    nextRoundArguments = {
      ...results,
      partStalksAtIndex,
    }
  }

  const maybeLine = nextRoundArguments.unpartedStalks.length / 4

  assertIsLine(maybeLine)

  return maybeLine
}
```

with:

```ts
// Pipe three rounds for a complete line. Now a thin generator wrapper
// around `performCast`. The classic API stays — args come in as
// `{ unpartedStalks, suspendedFromNextRound, partStalksAtIndex }` with
// the first pick passed in the args object — but the algorithm of record
// lives in `performCast` above. The wrapper just translates: build the
// 0th-cast state from the args, perform three casts, yielding the
// most-recent round's `FourOperationsResult` between picks, and return
// the resolved Line. Existing consumers (random-casting, interactive-flow,
// legacy-converter, use-line-generator) see the same generator interface
// and `assertIsFourOperationsResult` continues to typecheck each yielded
// payload.
export const makeLineGenerator = function* (roundOneArguments: {
  unpartedStalks: number[]
  suspendedFromNextRound: number[]
  partStalksAtIndex: number
}): Generator<
  /* Yield */ FourOperationsResult,
  /* Return */ Line,
  /* Next */ number
> {
  const s0: Extract<LineState, { phase: '0th-cast' }> = {
    phase: '0th-cast',
    unparted: roundOneArguments.unpartedStalks,
    suspended: roundOneArguments.suspendedFromNextRound,
    rounds: [],
  }
  const s1 = performCast(s0, roundOneArguments.partStalksAtIndex)
  const pick2 = yield s1.rounds[0]
  const s2 = performCast(s1, pick2)
  const pick3 = yield s2.rounds[1]
  const s3 = performCast(s2, pick3)
  return s3.line
}
```

- [ ] **Step 3: Re-run the core + consultation-file tests**

Run: `pnpm --filter @hexagram/core test && pnpm --filter @hexagram/consultation-file test`
Expected: PASS — including the `rng distribution (slow)` test and the legacy-converter replay tests. If anything fails, the wrapper has drifted from the original algorithm.

- [ ] **Step 4: Run the full type-check + lint + format pass**

Run: `pnpm type:check && pnpm lint:check && pnpm format:check`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/index.ts
git commit -m "refactor(core): re-express makeLineGenerator as a performCast wrapper

The four-operations pipeline becomes the algorithm of record inside
performCast; makeLineGenerator's body is now ~10 lines that build the
0th-cast state from the existing args, perform three casts, and yield
each round's FourOperationsResult between picks. Behavior unchanged:
random-casting and legacy-converter tests continue to pass against the
identical yielded payloads and resolved Line."
```

---

## Task 4: Migrate `use-line-generator.ts` from `Generator` ref to `LineState` ref

**Files:**
- Modify: `packages/casting-ui/src/use-line-generator.ts` (full rewrite of the hook body; external API unchanged)

- [ ] **Step 1: Run the existing casting-ui tests to establish a green baseline**

Run: `pnpm --filter @hexagram/casting-ui test`
Expected: PASS. This is the baseline the migration protects — `use-line-generator.test.tsx`, `viewer-flow.test.ts`, `viewer.test.tsx` MUST stay green with no edits.

- [ ] **Step 2: Replace `packages/casting-ui/src/use-line-generator.ts`**

Replace the entire file contents with:

```ts
import {
  initialLineState,
  maxPickFor,
  performCast,
} from '@hexagram/core'
import type { LineState } from '@hexagram/types'
import { useRef, type Dispatch } from 'react'

import type { FlowAction, FlowState } from './viewer-flow.js'

interface UseLineGeneratorResult {
  submitSplit: (pick: number) => void
  rewindCurrentLine: () => void
  currentMax: number
}

/**
 * Imperative bridge between the viewer's pure reducer state and
 * `@hexagram/core`'s per-line algorithm. The per-line state and the
 * "current selectable range" live in refs so reducer reductions stay
 * pure; the hook advances the state synchronously on each commit and
 * dispatches `splitCommitted` with the next slot's `max` (plus the
 * resolved `Line` on the third cast).
 *
 * Migrated from a `Generator` ref to a `LineState` ref: `performCast` is
 * a pure step function, so there is no suspended frame to hold across
 * renders — just a value. That simplifies the hook (no per-cast
 * branching, no defensive null-checks) and makes the existing
 * `rewindCurrentLine()` reset trivial (just reset the ref to
 * `initialLineState`). The external API — `submitSplit`,
 * `rewindCurrentLine`, `currentMax` — is unchanged, so the viewer, the
 * reducer, and every existing test continue to work without edits.
 */
export function useLineGenerator(
  state: FlowState,
  dispatch: Dispatch<FlowAction>,
): UseLineGeneratorResult {
  const lineStateRef = useRef<LineState>(initialLineState)
  const currentMaxRef = useRef<number>(maxPickFor(initialLineState))

  const submitSplit = (pick: number): void => {
    if (state.mode !== 'casting') return
    const max = currentMaxRef.current
    const before = lineStateRef.current
    // Defensive: the reducer should never let us call submitSplit on a
    // resolved line (the previous splitCommitted with a Line argument
    // either advances to the next line or transitions out of casting).
    if (before.phase === '3rd-cast') return

    const after = performCast(before, pick)

    if (after.phase === '3rd-cast') {
      // Line complete — reset the ref so the next line starts clean, and
      // reset the displayed max synchronously so the immediate re-render
      // shows the new line's first-cast range (1..48) instead of the
      // stale third-cast max from this line.
      lineStateRef.current = initialLineState
      currentMaxRef.current = maxPickFor(initialLineState)
      dispatch({ type: 'splitCommitted', pick, max, line: after.line })
      return
    }

    lineStateRef.current = after
    currentMaxRef.current = maxPickFor(after)
    dispatch({ type: 'splitCommitted', pick, max })
  }

  // Manual-flow rewind. Drops the per-line state back to `initialLineState`
  // and resets the displayed `currentMax` to the round-1 range so the
  // upcoming `lineRewound` reducer step (the viewer dispatches it right
  // after this call) lands the next render on a clean cast-0 prompt with
  // max 48. Per-cast undo is now expressible too — replace this body with
  // a fold over the surviving SplitRecord prefix — but that's a follow-up
  // plan once the reducer learns the new action shape.
  const rewindCurrentLine = (): void => {
    lineStateRef.current = initialLineState
    currentMaxRef.current = maxPickFor(initialLineState)
  }

  return {
    submitSplit,
    rewindCurrentLine,
    currentMax: currentMaxRef.current,
  }
}
```

- [ ] **Step 3: Re-run the casting-ui tests**

Run: `pnpm --filter @hexagram/casting-ui test`
Expected: PASS — `use-line-generator.test.tsx`, `viewer-flow.test.ts`, `viewer.test.tsx` all green without edits. In particular:
- `useLineGenerator — rewindCurrentLine` (use-line-generator.test.tsx line 73): "clears the generator ref and resets currentMax to 48" — still passes because the migrated hook resets `lineStateRef` to `initialLineState`, which has `maxPickFor === 48`.
- `useLineGenerator — rewindCurrentLine` (line 92): "after rewind, a castIndex=0 submitSplit builds a fresh generator" — still passes because `performCast(initialLineState, 20)` is deterministic and yields the same round-2 max as the previous generator-based implementation.

If anything fails, the migration has drifted from the original behavior — investigate before committing.

- [ ] **Step 4: Run the full repo type-check + lint + format pass**

Run: `pnpm type:check && pnpm lint:check && pnpm format:check`
Expected: PASS.

- [ ] **Step 5: Run the full test suite end-to-end**

Run: `pnpm test`
Expected: PASS — including the slow rng distribution test (~30 s) and the manual-flow Phase-7 byte-identity test in `packages/casting-ui/tests/viewer.test.tsx`. If `cross-env` complains about FORCE_COLOR, that's pre-existing — see `cross-platform-tests` skill for the fix, not this PR.

- [ ] **Step 6: Commit**

```bash
git add packages/casting-ui/src/use-line-generator.ts
git commit -m "refactor(casting-ui): use LineState ref in useLineGenerator

Migrate the manual-flow line-driver hook from holding a Generator ref to
holding a LineState ref. performCast is a pure step function, so there
is no suspended frame to hold across renders — just a value. The
external API (submitSplit, rewindCurrentLine, currentMax) is unchanged,
so viewer.tsx, viewer-flow.ts, and every existing casting-ui test
continue to work without edits.

Bonus: per-cast undo within a line is now a one-liner — replace
rewindCurrentLine's body with a fold over the surviving SplitRecord
prefix. Wiring that into the viewer (new keybinding, reducer payload
extension) is a follow-up plan."
```

---

## Verification matrix

After Task 4 completes, the following invariants should hold. Run them as a final sanity check before opening the PR.

| Invariant | Verification command | Expected |
|---|---|---|
| Algorithm preserved | `pnpm --filter @hexagram/core test` | All pass, incl. `rng distribution (slow)` |
| Legacy replay preserved | `pnpm --filter @hexagram/consultation-file test` | All pass |
| Manual flow preserved | `pnpm --filter @hexagram/casting-ui test` | All pass, incl. `lineRewound` reducer tests + manual byte-identity test |
| Type system clean | `pnpm type:check` | No errors anywhere in the monorepo |
| Lint + format clean | `pnpm lint:check && pnpm format:check` | No errors |
| Full suite | `pnpm test` | All packages green |
| New primitive surface | `grep -n 'performCast\|initialLineState\|maxPickFor\|LineState\|AdvanceableLineState' packages/types/src/index.ts packages/core/src/index.ts` | Each name appears in the expected file |
| Generator wrapper signature unchanged | `grep -A3 'export const makeLineGenerator' packages/core/src/index.ts` | Same `Generator<FourOperationsResult, Line, number>` return type as before |

---

## Out-of-scope follow-up (track in CONTEXT.md or issues, not in this PR)

The primitive lands open. Concrete follow-up plans you might write next:

1. **Per-cast undo UX in the manual viewer** — change `rewindCurrentLine` to fold over a surviving SplitRecord prefix, extend the `lineRewound` reducer action with a `targetCast: 0 | 1 | 2` payload, wire Ctrl+R (or a new binding) to step back one cast at a time. The core primitive supports it; the viewer just needs to be told.
2. **Multi-line rewind window** — extend `lineRewound` to accept a `targetLine: 0..5` payload; same fold-over-prefix recipe per line. Purely a reducer/host concern.
3. **Save mid-consultation** — `LineState` is already serializable (no hidden state, no circular refs, no functions). A future "pause and resume later" feature can persist `{ partialCasting, completedLines, lineStateRef.current }` to a draft `.md` file and restore it on next open.

None of these require touching `@hexagram/core` again.
