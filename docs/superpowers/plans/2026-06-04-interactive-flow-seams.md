# Interactive-Flow Seam Resolution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the remaining legibility seams in the interactive consultation flow by **unifying the per-line casting algorithm into the pure reducer** (deleting the imperative line-generator hook), plus an additive lock-in test for the random flow — cohering with the manual-flow seam work already on `origin/main`.

**Architecture:** `performCast`/`maxPickFor` are _pure_ step functions, so the per-line `LineState` that today lives in a React `useRef` inside `useLineGenerator` can live directly in the reducer's `FlowState`. Moving it there makes the reducer the single owner of the casting algorithm: it derives the recorded `max` and resolved `Line` itself instead of trusting a hook to pre-compute and dispatch them. This collapses the two seams the manual work left open for the interactive flow — **S2** (two state machines synced by convention) and **S4** (the Ctrl+R ref-before-dispatch ordering handshake, which becomes a single pure dispatch) — and structurally closes **S3** (the random pick now flows through `performCast`'s `assertSelectablePick` guard like every other cast). No observable behavior changes: determinism of `performCast` guarantees byte-identity, locked by the existing `viewer.test.tsx` manual/interactive equality test.

**Tech Stack:** TypeScript (ESM, NodeNext, `isolatedDeclarations`), pnpm workspaces + Turborepo, Vitest (`cross-env FORCE_COLOR=1 vitest run`), `tsc --noEmit` for `type:check`. Source files use explicit `.js` import specifiers; test files import from `../src/<module>` (no extension).

---

## Context

A cold-read theory-reconstruction (4 independent agents, cleared context) of the interactive consultation flow surfaced 8 seams. Since then, `origin/main` advanced 9 commits with a **manual-flow seam resolution** (`docs/superpowers/plans/2026-06-04-manual-flow-seams.md`) built on an explicit doctrine: _every fix additive — lock-in test, pure helper, compile-time guard, or comment — zero runtime behavior change._ That work resolved 6 of the 8 interactive seams as a side effect (it centralized the never-zero-remainder pick rule into `selectablePickMax`/`assertSelectablePick` and made `performCast`'s assertion load-bearing), and even corrected the "single source of truth" comment to admit _"two layers enforce this rule, by design — there is no single owner."_

Re-scored against `origin/main` (the manual commits provably did **not** touch `use-line-generator.ts` or `viewer.tsx`):

| Seam                                                          | Verdict                                                                                     | Disposition                                        |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| S1 pick-ceiling ownership                                     | ✅ resolved by `b88914a`                                                                    | —                                                  |
| V1 assert intent / V2 `currentMax` shadow / V3 spinner intent | ✅ resolved (V2 was a cold-read misread: hook value is renamed `interactiveMax`, no shadow) | —                                                  |
| **S2** two state machines (hook ref vs reducer)               | ⚠️ **open**                                                                                 | **Task 1**                                         |
| **S4** Ctrl+R ref-before-dispatch handshake                   | ⚠️ open (manual-only infra)                                                                 | **dissolved by Task 1**                            |
| **S3** random pick bypasses `performCast`                     | ◑ clamped at generation, but never asserted like manual got                                 | **structurally closed by Task 1 + Task 2 lock-in** |
| **S5** plan lifetime                                          | ✅ already pinned (existing tests assert `castingPlan === null`)                            | **preserved in Task 1**                            |

The user chose **structural unification** for S2 (a deliberate divergence from the manual flow's additive treatment — justified because `performCast` is pure and the change is byte-identical) and the **full additive sweep**. Outcome: one less stateful substrate, one pure state machine, and the manual flow benefits identically (it shares the same reducer + `handleCastSubmit` path).

**Branch:** Develop on `claude/theory-reconstruction-walkthrough-ZlbVJ`. It currently sits at `06e3070` (origin/main's _old_ head) with no unique commits, so it fast-forwards cleanly to `origin/main` (`311c995`).

**Coherence checks for every task:**

- Single Vitest file: `pnpm --filter @hexagram/casting-ui test -- <filename-substring>`
- Package type-check: `pnpm --filter @hexagram/casting-ui type:check`
- Never edit a byte-locked fixture/snapshot to make a test pass. If a _pre-existing_ `viewer.test.tsx` assertion fails, STOP — the refactor changed behavior it must not.

---

### Task 0: Sync the branch onto the manual-flow seam work

**Files:** none (git only) + copy this plan into the repo.

- [ ] **Step 1: Fetch and fast-forward onto origin/main**

```bash
git fetch origin main
git checkout claude/theory-reconstruction-walkthrough-ZlbVJ
git merge --ff-only origin/main
```

Expected: `Fast-forward` to `311c995`. If it refuses (the branch has diverged), STOP and report — do not force.

- [ ] **Step 2: Confirm the manual-flow tests are present and green**

Run: `pnpm install`
Run: `pnpm --filter @hexagram/casting-ui test -- manual-validation`
Expected: PASS (the manual seam tests `computeManualRoundResult ≡ performCast`, `manual "ok" picks satisfy the core never-zero guard`, `manualFeedbackSurface` all exist).

- [ ] **Step 3: Place this plan in the repo and commit**

Save this document to `docs/superpowers/plans/2026-06-04-interactive-flow-seams.md`, then:

```bash
git add docs/superpowers/plans/2026-06-04-interactive-flow-seams.md
git commit -m "docs(plans): add implementation plan for interactive-flow seam resolution

Captures the structural-unification plan derived from a cold-read theory-reconstruction
of the interactive consultation flow, building on the manual-flow seam work."
```

---

### Task 1: Move the per-line algorithm into the reducer (S2; dissolves S4; preserves S5)

The interactive flow currently keeps `LineState` + the "current selectable max" in two `useRef`s inside `useLineGenerator`, advanced imperatively on each `submitSplit` and dispatched into the reducer as `{ pick, max, line? }`. The reducer just records what it is handed. This is two state machines kept in lockstep by convention (S2), and the manual Ctrl+R rewind needs a documented ref-reset-before-dispatch ordering (S4). Make the reducer the single owner: hold `LineState` in `FlowState`, derive `max`/`line` via `performCast`, and reduce the action to `{ pick }`. The hook disappears.

**Files:**

- Modify: `packages/casting-ui/src/viewer-flow.ts` (state, action, reducer, new `recordedMaxFor` helper)
- Modify: `packages/casting-ui/src/viewer.tsx` (drop the hook; rewire `currentMax`, `handleCastSubmit`, `randomSplitAction`, Ctrl+R)
- Delete: `packages/casting-ui/src/use-line-generator.ts`
- Delete: `packages/casting-ui/tests/use-line-generator.test.tsx` (folded into the reducer tests)
- Modify: `packages/casting-ui/tests/viewer-flow.test.ts` (real plan fixture; drop `max`/`line` from dispatches; add lineState-sync + rewind tests)
- Modify: `packages/casting-ui/src/manual-prompt.tsx` + `packages/casting-ui/src/manual-validation.ts` (retarget stale `use-line-generator` comments to the reducer)

- [ ] **Step 1: Rewrite the reducer test fixture as a _real_ (internally consistent) plan**

In `packages/casting-ui/tests/viewer-flow.test.ts`, replace the `STUB_HEXAGRAM` / `STUB_CASTING` / `STUB_PLAN` declarations (around lines 21–27) with a builder that derives each `max` and `Line` from `performCast`, so replaying its picks through the reducer reproduces it exactly:

```ts
import { initialLineState, maxPickFor, performCast } from '@hexagram/core'
import type {
  AdvanceableLineState,
  CastingRecord,
  Hexagram,
  LineState,
} from '@hexagram/core/types'
import type { CastingPlan } from '../src/viewer-flow'

// A casting plan whose recorded `max`es and resolved `Line`s are EXACTLY what
// `performCast` produces for the given picks. The reducer now DERIVES both
// itself (it no longer trusts an action payload), so the fixture must be
// internally consistent — the old STUB_* arrays hard-coded a fabricated
// max/line and would no longer survive cast-by-cast replay.
function realPlan(picksByLine: readonly (readonly number[])[]): CastingPlan {
  const casting = picksByLine.map((linePicks) => {
    let s: LineState = initialLineState
    return linePicks.map((pick) => {
      const max = maxPickFor(s as AdvanceableLineState)
      s = performCast(s as AdvanceableLineState, pick)
      return { pick, max }
    })
  }) as CastingRecord
  const hexagram = picksByLine.map((linePicks) => {
    let s: LineState = initialLineState
    for (const pick of linePicks) {
      s = performCast(s as AdvanceableLineState, pick)
    }
    return (s as Extract<LineState, { phase: '3rd-cast' }>).line
  }) as Hexagram
  return { hexagram, casting }
}

// pick = 1 is always ≤ selectablePickMax(recordedMax) for any running stalk
// count, so every one of the eighteen casts is legal regardless of the line.
const PLAN: CastingPlan = realPlan(Array.from({ length: 6 }, () => [1, 1, 1]))
```

Then replace every `STUB_PLAN` reference with `PLAN`, every `STUB_HEXAGRAM` with `PLAN.hexagram`, every `STUB_CASTING` with `PLAN.casting`. (The `querySubmit` tests at lines ~46–56 keep working unchanged — they only assert `next.castingPlan` identity.)

- [ ] **Step 2: Rewrite the `splitCommitted` advance tests to dispatch `{ pick }` and assert reducer-derived values**

In `packages/casting-ui/tests/viewer-flow.test.ts`, replace the `describe('flowReducer — splitCommitted advance path', ...)` block with:

```ts
import { recordedMaxFor } from '../src/viewer-flow'

describe('flowReducer — splitCommitted advance path', () => {
  it('advances the slot and DERIVES each split (max + resolved line) itself', () => {
    let state: FlowState = {
      ...initialFlowState('random', null, null),
      mode: 'casting',
      castingPlan: PLAN,
    }
    // Cast 1 — the action carries only the pick; the reducer derives max=48.
    state = flowReducer(state, {
      type: 'splitCommitted',
      pick: PLAN.casting[0][0].pick,
    })
    expect(state.castIndex).toBe(1)
    expect(state.lineIndex).toBe(0)
    expect(state.partialCasting[0][0]).toEqual(PLAN.casting[0][0])

    // Cast 2
    state = flowReducer(state, {
      type: 'splitCommitted',
      pick: PLAN.casting[0][1].pick,
    })
    expect(state.castIndex).toBe(2)
    expect(state.partialCasting[0][1]).toEqual(PLAN.casting[0][1])

    // Cast 3 — reducer resolves the line via performCast and advances to line 2.
    state = flowReducer(state, {
      type: 'splitCommitted',
      pick: PLAN.casting[0][2].pick,
    })
    expect(state.lineIndex).toBe(1)
    expect(state.castIndex).toBe(0)
    expect(state.completedLines).toEqual([PLAN.hexagram[0]])
  })

  it('enters computing after the eighteenth cast and clears the plan', () => {
    let state: FlowState = {
      ...initialFlowState('random', null, null),
      mode: 'casting',
      castingPlan: PLAN,
    }
    for (let li = 0; li < 6; li += 1) {
      for (let ci = 0; ci < 3; ci += 1) {
        state = flowReducer(state, {
          type: 'splitCommitted',
          pick: PLAN.casting[li][ci].pick,
        })
      }
    }
    expect(state.mode).toBe('computing')
    expect(state.completedLines).toEqual([...PLAN.hexagram])
    // S5 preserved: the plan is cleared on the computing transition.
    expect(state.castingPlan).toBeNull()
  })
})
```

- [ ] **Step 3: Update the `playbackSkipped` byte-identity test to use the real plan**

In the `describe('flowReducer — playbackSkipped', ...)` block, the `'produces a state byte-identical to eighteen splitCommitteds'` test must dispatch `{ pick }` only:

```ts
it('produces a state byte-identical to eighteen splitCommitteds', () => {
  const base: FlowState = {
    ...initialFlowState('random', null, null),
    mode: 'casting',
    castingPlan: PLAN,
  }
  let played: FlowState = base
  for (let lineIndex = 0; lineIndex < 6; lineIndex += 1) {
    for (let castIndex = 0; castIndex < 3; castIndex += 1) {
      played = flowReducer(played, {
        type: 'splitCommitted',
        pick: PLAN.casting[lineIndex][castIndex].pick,
      })
    }
  }
  const skipped = flowReducer(base, { type: 'playbackSkipped' })
  expect(skipped.mode).toBe(played.mode)
  expect(skipped.partialCasting).toEqual(played.partialCasting)
  expect(skipped.completedLines).toEqual(played.completedLines)
  expect(skipped.castingPlan).toBe(played.castingPlan)
})
```

The other `playbackSkipped` assertions (`next.partialCasting).toEqual(PLAN.casting)`, the fresh-array `not.toBe` checks, `next.castingPlan).toBeNull()`) stay as-is with `STUB_*`→`PLAN`.

- [ ] **Step 4: Fold the hook's rewind/advance coverage into reducer tests**

Append to `packages/casting-ui/tests/viewer-flow.test.ts` (this replaces everything `use-line-generator.test.tsx` covered — the rewind now lives entirely in the pure reducer, so S4's ordering handshake is gone):

```ts
describe('flowReducer — lineRewound resets the per-line algorithm', () => {
  it('mid-line rewind clears the line and resets the selectable max to 48', () => {
    let state: FlowState = {
      ...initialFlowState('manual', null, null),
      mode: 'casting',
    }
    // First cast advances the line: the round-2 selectable max drops below 48.
    state = flowReducer(state, { type: 'splitCommitted', pick: 20 })
    expect(recordedMaxFor(state.lineState)).toBeLessThan(48)

    // One pure dispatch resets BOTH the slot pointer and the lineState — no
    // ref-before-dispatch handshake (S4 dissolved).
    state = flowReducer(state, { type: 'lineRewound' })
    expect(recordedMaxFor(state.lineState)).toBe(48)
    expect(state.lineIndex).toBe(0)
    expect(state.castIndex).toBe(0)
    expect(state.partialCasting[0]).toEqual([null, null, null])
  })

  it('after rewind, a fresh first cast rebuilds the same round-2 max', () => {
    let state: FlowState = {
      ...initialFlowState('manual', null, null),
      mode: 'casting',
    }
    state = flowReducer(state, { type: 'splitCommitted', pick: 20 })
    const round2Max = recordedMaxFor(state.lineState)
    state = flowReducer(state, { type: 'lineRewound' })
    state = flowReducer(state, { type: 'splitCommitted', pick: 20 })
    expect(recordedMaxFor(state.lineState)).toBe(round2Max)
  })
})
```

- [ ] **Step 5: Delete the hook test, then run the reducer tests to watch them FAIL**

```bash
git rm packages/casting-ui/tests/use-line-generator.test.tsx
```

Run: `pnpm --filter @hexagram/casting-ui test -- viewer-flow`
Expected: FAIL to compile — `recordedMaxFor` is not exported yet, and `FlowAction`'s `splitCommitted` still requires `max`. This is the red state; Steps 6–8 make it green.

- [ ] **Step 6: Add `lineState` + `recordedMaxFor` and make the reducer authoritative**

In `packages/casting-ui/src/viewer-flow.ts`:

(a) Add the core runtime imports at the top (the module stays pure — `@hexagram/core` has no React/Ink):

```ts
import { initialLineState, maxPickFor, performCast } from '@hexagram/core'
```

and add `LineState` to the existing `@hexagram/core/types` import block.

(b) Add `lineState` to `FlowState` (after `completedLines`):

```ts
  completedLines: Line[]
  // The per-line algorithm state — the reducer is the SINGLE owner of casting
  // (it advances this via the pure `performCast` and derives the recorded
  // `max` + resolved `Line` itself). Reset to `initialLineState` after every
  // 3rd cast and on `lineRewound`. Replaces the old `useLineGenerator` refs.
  lineState: LineState
```

(c) Narrow the `splitCommitted` action to carry only the pick:

```ts
  | { type: 'splitCommitted'; pick: number }
```

(d) Add the pure selector right after `EMPTY_SECTIONS`:

```ts
/**
 * The recorded `max` for the current cast (`stalks - 1` for this round).
 * `lineState` is never in the resolved `'3rd-cast'` phase mid-casting (the
 * reducer resets it after every 3rd cast), so the fallback to the round-1 max
 * is unreachable in practice — it only satisfies `maxPickFor`'s advanceable
 * input domain for the type checker.
 */
export function recordedMaxFor(lineState: LineState): number {
  return lineState.phase === '3rd-cast'
    ? maxPickFor(initialLineState)
    : maxPickFor(lineState)
}
```

(e) Set `lineState: initialLineState` in `initialFlowState`'s returned object.

(f) Replace the entire `case 'splitCommitted':` block body:

```ts
    case 'splitCommitted': {
      // The reducer is the SINGLE owner of the per-line algorithm: it advances
      // `lineState` through the pure `performCast` and derives the recorded
      // `max` and resolved `Line` itself. The action carries only the pick.
      const before = state.lineState
      // Defensive: the reducer resets `lineState` after every 3rd cast, so a
      // `splitCommitted` can never arrive on a resolved line (this also
      // satisfies `performCast`/`maxPickFor`'s advanceable input domain).
      if (before.phase === '3rd-cast') return state

      const max = maxPickFor(before)
      const after = performCast(before, action.pick)
      const split: SplitRecord = { pick: action.pick, max }
      const line = after.phase === '3rd-cast' ? after.line : undefined
      const nextLineState: LineState =
        after.phase === '3rd-cast' ? initialLineState : after

      const partialCasting = state.partialCasting.map(
        (lineRow, lineIndex) =>
          (lineIndex === state.lineIndex
            ? lineRow.map((cast, castIndex) =>
                castIndex === state.castIndex ? split : cast,
              )
            : lineRow) as PartialCastingRecord[number],
      ) as PartialCastingRecord
      const completedLines =
        line === undefined
          ? state.completedLines
          : [...state.completedLines, line]

      const isLastCastOfLine = state.castIndex === 2
      const isLastLine = state.lineIndex === 5
      if (isLastCastOfLine && isLastLine) {
        return {
          ...state,
          mode: 'computing',
          partialCasting,
          completedLines,
          castingBuffer: '',
          error: null,
          castingPlan: null,
          lineState: initialLineState,
        }
      }
      const nextLineIndex = (
        isLastCastOfLine ? state.lineIndex + 1 : state.lineIndex
      ) as FlowState['lineIndex']
      const nextCastIndex = (
        isLastCastOfLine ? 0 : state.castIndex + 1
      ) as FlowState['castIndex']
      return {
        ...state,
        partialCasting,
        completedLines,
        lineIndex: nextLineIndex,
        castIndex: nextCastIndex,
        castingBuffer: '',
        error: null,
        lineState: nextLineState,
      }
    }
```

(g) In `case 'lineRewound':`, add `lineState: initialLineState,` to the returned object (the rewind now resets the algorithm purely). Replace the stale action doc comment (lines ~70–78, the "The viewer calls `rewindCurrentLine()` … first (sync ref reset)" paragraph) with:

```ts
// Manual-flow rewind. Resets the slot pointer AND `lineState` in one pure
// step — no imperative ref to reset first (the per-line algorithm now lives
// in `lineState`). Mid-line rewinds clear the current line's casts;
// post-line-completion rewinds drop back to the previous line. No-op outside
// `mode === 'casting'`, when `flowKind !== 'manual'`, or at line 0 cast 0.
// Reads `castingPlan` nowhere and relies on the invariant that a manual flow
// never carries one (see "manual flow carries no casting plan" in the tests).
```

(h) In `case 'playbackSkipped':`, add `lineState: initialLineState,` to the returned object (it jumps to `computing`; keep the field clean).

- [ ] **Step 7: Delete the hook and rewire the viewer**

```bash
git rm packages/casting-ui/src/use-line-generator.ts
```

In `packages/casting-ui/src/viewer.tsx`:

(a) Remove `import { useLineGenerator } from './use-line-generator.js'` (line ~48). Add `recordedMaxFor` to the import from `./viewer-flow.js` (the block at line ~60).

(b) Delete the hook call + its comment (lines ~203–212, the `const { submitSplit, rewindCurrentLine, currentMax: interactiveMax } = useLineGenerator(...)` block and the "The random flow never consults…" comment above it).

(c) Replace the Ctrl+R handler (lines ~214–237) — drop the ordering comment and the `rewindCurrentLine()` call:

```tsx
// Manual-flow Ctrl+R rewind. One pure dispatch resets both the slot and the
// per-line algorithm (`lineState`) in the reducer — no ref to reset first.
// Gated to `mode === 'casting' && flowKind === 'manual'`.
useInput(
  (input, key) => {
    if (key.ctrl && input === 'r') {
      dispatch({ type: 'lineRewound' })
      return
    }
    if (input === '?') {
      setHelpOpen(true)
    }
  },
  {
    isActive:
      state.mode === 'casting' && state.flowKind === 'manual' && !helpOpen,
  },
)
```

(d) Replace the `currentMax` derivation (lines ~242–245) — interactive reads the reducer's `lineState` instead of the deleted hook:

```tsx
// The current cast's selectable range. The interactive/manual flows derive
// it from the reducer's `lineState`; the random flow reads the predetermined
// plan's `SplitRecord.max` (which equals what `lineState` would derive).
const currentMax =
  state.castingPlan === null
    ? recordedMaxFor(state.lineState)
    : state.castingPlan.casting[state.lineIndex][state.castIndex].max
```

(e) Simplify `randomSplitAction` (lines ~287–292) — the reducer derives `max`/`line`, so it forwards only the pick:

```tsx
// The random flow's `splitCommitted` for the current slot — the plan's pick;
// the reducer derives `max` and the resolved line itself. Shared by the
// slider's `onSubmit` and the number mode's per-cast timer.
const randomSplitAction = (plan: CastingPlan): FlowAction => ({
  type: 'splitCommitted',
  pick: plan.casting[state.lineIndex][state.castIndex].pick,
})
```

(f) In `handleCastSubmit` (lines ~300–306), replace `submitSplit(pick)` with `dispatch({ type: 'splitCommitted', pick })`:

```tsx
const handleCastSubmit = (pick: number): void => {
  if (state.castingPlan === null) {
    dispatch({ type: 'splitCommitted', pick })
    return
  }
  dispatch(randomSplitAction(state.castingPlan))
}
```

- [ ] **Step 8: Retarget the stale `use-line-generator` comments in the manual modules**

In `packages/casting-ui/src/manual-prompt.tsx`, the bridge comment added by the manual plan (the `key.return` branch) names "`performCast` in `use-line-generator.ts`". Change that phrase to "`performCast` in the reducer (`viewer-flow.ts`)". In `packages/casting-ui/src/manual-validation.ts`, the `computeManualRoundResult` doc comment names "`performCast` … via `submitSplit` in `use-line-generator.ts`" — change it to "`performCast` … in the flow reducer (`viewer-flow.ts`'s `splitCommitted`)".

- [ ] **Step 9: Type-check, then run the full casting-ui suite (byte-identity gate)**

Run: `pnpm --filter @hexagram/casting-ui type:check`
Expected: no errors.
Run: `pnpm --filter @hexagram/casting-ui test`
Expected: PASS — crucially the `viewer.test.tsx` Phase-7 manual/interactive **byte-identity** test stays green, proving the unification changed no saved output. If it fails, STOP: the refactor altered behavior.

- [ ] **Step 10: Commit**

```bash
git add packages/casting-ui/src/viewer-flow.ts packages/casting-ui/src/viewer.tsx \
        packages/casting-ui/src/manual-prompt.tsx packages/casting-ui/src/manual-validation.ts \
        packages/casting-ui/tests/viewer-flow.test.ts
git add -A packages/casting-ui/src/use-line-generator.ts packages/casting-ui/tests/use-line-generator.test.tsx
git commit -m "refactor(casting-ui): unify the per-line algorithm into the flow reducer

The interactive flow kept LineState + the selectable max in useRef inside
useLineGenerator and dispatched pre-computed {pick,max,line} into the reducer — two
state machines synced by convention (S2), with the manual Ctrl+R rewind needing a
ref-before-dispatch ordering handshake (S4). performCast/maxPickFor are pure, so move
LineState into FlowState: the reducer now derives max and the resolved Line itself
from {pick}, and lineRewound resets it in one pure dispatch. Delete the hook. The
random pick now flows through performCast's assertSelectablePick guard like every
other cast (S3). Byte-identical — the viewer.test.tsx manual/interactive equality
test is the regression gate."
```

---

### Task 2: Lock the random flow's picks to the core never-zero guard (S3, additive)

Mirrors manual Task 2 (`manual "ok" picks satisfy the core never-zero guard`). After Task 1 the random pick passes through `performCast`'s `assertSelectablePick`, but the property that the RNG _never_ draws a pick that would trip it (so a user never sees a thrown `RangeError`) deserves its own lock-in — the existing test only checks `deriveSplit` remainders, not the core guard directly.

**Files:**

- Test: `packages/core/tests/random-casting.test.ts` (append a `describe` block)

- [ ] **Step 1: Write the property test**

Append to `packages/core/tests/random-casting.test.ts` (confirm the existing imports; add what's missing):

```ts
import { assertSelectablePick } from '../src/casting-derivation.js'
import { generateRandomConsultation } from '../src/random-casting.js'

// S3 lock-in: every RNG-drawn pick must satisfy the core's never-zero guard, so
// the random flow — which now routes each pick through `performCast`
// (`assertSelectablePick`) in the reducer — can never surface a thrown
// RangeError to the user. `SplitRecord.max` is the recorded max for that round.
describe('random picks satisfy the core never-zero guard', () => {
  it('every plan pick passes assertSelectablePick across 200 consultations', () => {
    for (let i = 0; i < 200; i += 1) {
      const { casting } = generateRandomConsultation()
      for (const line of casting) {
        for (const split of line) {
          expect(() =>
            assertSelectablePick(split.max, split.pick),
          ).not.toThrow()
        }
      }
    }
  })
})
```

- [ ] **Step 2: Run the test**

Run: `pnpm --filter @hexagram/core test -- random-casting`
Expected: PASS. (If it ever FAILS, that is a real RNG bug — the clamp in `splitStalksRandomly` no longer matches `selectablePickMax`; STOP and report, do not patch the test.)

- [ ] **Step 3: Commit**

```bash
git add packages/core/tests/random-casting.test.ts
git commit -m "test(core): prove every random pick satisfies assertSelectablePick

The random flow now routes each pick through performCast's guard in the unified
reducer; pin that the RNG never draws a pick that would throw, mirroring the manual
flow's never-zero property test."
```

---

### Task 3: Record the single-state-machine decision in the ADRs (docs)

Moving `LineState` into the reducer and deleting the hook is architecturally significant — it changes the rewindable-core design (ADR-0006) and the manual-flow rewind mechanism (ADR-0011), and strands their references to `use-line-generator.ts`. Record it, the same way `b88914a` amended ADR-0006 when it centralized the pick rule.

**Files:**

- Modify: `docs/adr/0006-casting-algorithm-rewindable-core-and-randomness.md`
- Modify: `docs/adr/0011-manual-casting-flow-design.md` (the `use-line-generator.ts` reference at line ~100)
- Modify: `CLAUDE.md` (the architecture section's `use-line-generator` mentions, if any survive)

- [ ] **Step 1: Amend ADR-0006**

Add a dated amendment paragraph at the end of ADR-0006 recording: the per-line `LineState` now lives in the viewer's flow reducer (`viewer-flow.ts`'s `FlowState.lineState`), advanced by the pure `performCast` inside the `splitCommitted` case; the imperative `useLineGenerator` hook is removed. Consequence: the reducer is the single owner of the casting algorithm — `max` and the resolved `Line` are derived, not dispatched; `lineRewound` resets the algorithm in one pure step (no ref-before-dispatch ordering); and the random pick now passes through `assertSelectablePick` like every other cast.

- [ ] **Step 2: Fix the ADR-0011 + CLAUDE.md references**

In `docs/adr/0011-manual-casting-flow-design.md` line ~100, change the `use-line-generator.ts — rewindCurrentLine() op` bullet to point at the reducer's `lineRewound` action as the single source of truth for the rewind. Grep `CLAUDE.md` for `use-line-generator` / `submitSplit` / `rewindCurrentLine` and retarget any surviving mention to `viewer-flow.ts`'s reducer.

```bash
grep -nE 'use-line-generator|submitSplit|rewindCurrentLine' CLAUDE.md AGENTS.md docs/adr/*.md
```

- [ ] **Step 3: Verify formatting and commit**

Run: `pnpm format:check`
Expected: clean (run `pnpm format:fix` if a `.md` is flagged, except byte-locked fixtures).

```bash
git add docs/adr/0006-casting-algorithm-rewindable-core-and-randomness.md \
        docs/adr/0011-manual-casting-flow-design.md CLAUDE.md
git commit -m "docs(adr): record per-line LineState moving into the flow reducer

The interactive/manual casting algorithm now lives in viewer-flow.ts's reducer (single
state machine); the useLineGenerator hook is gone. Amend ADR-0006 and retarget the
ADR-0011/CLAUDE.md references from use-line-generator.ts to the reducer."
```

---

### Final verification (after all tasks)

- [ ] **Step 1: Full workspace gates**

Run: `pnpm test`
Expected: PASS across all packages (the core `rng distribution (slow)` block takes ~40 s by design).
Run: `pnpm type:check && pnpm lint:check && pnpm format:check`
Expected: all clean.

- [ ] **Step 2: CI-contention smoke (the unification touches the shared reducer + an Ink test was deleted)**

Run: `pnpm test:stress:once`
Expected: PASS. Catches any race the deleted `use-line-generator.test.tsx` was masking and confirms the reducer change is stable under 2-CPU contention.

- [ ] **Step 3: Manual sanity of both flows (Ink, TTY)**

Run: `pnpm hexagram-interactive` — cast a full hexagram with the slider; confirm the casting table fills and the file saves.
Run: `pnpm hexagram-manual` — cast a line, press **Ctrl+R** mid-line and after a completed line; confirm the rewind resets correctly (S4's behavior is unchanged, now reducer-driven).

- [ ] **Step 4: Push**

```bash
git push -u origin claude/theory-reconstruction-walkthrough-ZlbVJ
```

(Retry on network error with exponential backoff: 2s, 4s, 8s, 16s. Do NOT open a PR unless explicitly asked.)

---

## Self-Review

**1. Spec coverage:** S2 → Task 1 (structural unification, user's choice). S4 → dissolved by Task 1 (`lineRewound` resets `lineState` purely; one dispatch). S3 → structurally closed by Task 1 (pick flows through `performCast`) + locked by Task 2. S5 → preserved by Task 1 Steps 2–3 (the `castingPlan === null` assertions survive). S1/V1/V2/V3 → already resolved on `origin/main` (Context table). The "cohere with manual" constraint: the manual flow shares the same reducer + `handleCastSubmit` path, so it is unified identically; the manual seam tests stay green (Task 0 Step 2); the ADR amendment mirrors `b88914a`'s treatment. ✔

**2. Placeholder scan:** Every code step shows complete code; every command states expected output; no TBD/"handle edge cases". ✔

**3. Type consistency:** `recordedMaxFor(lineState: LineState): number` — same signature in viewer-flow.ts (Step 6d), viewer.tsx (Step 7d), and the tests (Steps 2, 4). `splitCommitted` is `{ type: 'splitCommitted'; pick: number }` everywhere after Task 1 (action def 6c, reducer 6f, viewer 7e/7f, tests 2/3). `CastingPlan` = `{ hexagram: Hexagram; casting: CastingRecord }` (imported into the test in Step 1). `performCast`/`maxPickFor`/`initialLineState` imported from `@hexagram/core`; `LineState`/`AdvanceableLineState`/`CastingRecord`/`Hexagram` from `@hexagram/core/types`. ✔

**Behavioral safety:** Task 1 is byte-identical (determinism of `performCast`), gated by the pre-existing `viewer.test.tsx` manual/interactive equality test. Tasks 2–3 are additive (test + docs). The "pre-existing tests stay green" gate in every task is the regression guard.
