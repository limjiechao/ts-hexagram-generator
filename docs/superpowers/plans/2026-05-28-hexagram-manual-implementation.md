# `hexagram-manual` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a third casting flow (`hexagram-manual`) that lets users transcribe physical yarrow-stalk casts via a two-field (piles + remainder) prompt, plus the shell + bin + menu wiring, end-to-end TDD.

**Architecture:** No new package. The reducer (`viewer-flow.ts`) gains one action; the hook (`use-line-generator.ts`) gains one rewind op; the prompt (`casting-prompt-box.tsx`) gains a sibling branch with two `<NumberInput>` fields; the viewer (`viewer.tsx`) wires Ctrl+R and exports a thin `runManualConsultationViewer`. The shell (`home-menu.tsx`, `nav-machine.ts`, `hexagram-app.tsx`) adds the 'manual' selection. A new bin (`apps/cli/src/manual.ts`) mirrors `history.ts`.

**Tech Stack:** TypeScript / React + Ink / Vitest + `ink-testing-library` / Turborepo / tsdown. Pure-reducer tests for state machines; `ink-testing-library` with `waitFor`/`onReady` for component tests (per AGENTS.md: the May 2026 stabilisation requires `pnpm test:stress:once` before pushing Ink changes).

**Spec:** `docs/superpowers/specs/2026-05-27-hexagram-manual-design.md`. All seven locked decisions inherited — do NOT propose alternatives.

**Worktree:** Continue work in `.claude/worktrees/hexagram-manual-spec/` on branch `worktree-hexagram-manual-spec`. The spec commits (`edf4b83`, `0549759`) must remain on the branch's history.

---

## Phase 1: Reducer extension — `lineRewound` action

**Why first:** Pure-function change, isolated to `viewer-flow.ts`, exercised by `viewer-flow.test.ts` (Vitest only — no Ink, no flake risk). Lands the type widening that every later phase depends on.

**Files:**

- Modify: `packages/casting-ui/src/viewer-flow.ts:30` (FlowKind), `:52-71` (FlowAction), `:128-238` (reducer)
- Test: `packages/casting-ui/tests/viewer-flow.test.ts`

### Task 1.1: Extend `FlowKind` to include `'manual'`

- [ ] **Step 1: Add a failing test asserting manual is in the union**

In `packages/casting-ui/tests/viewer-flow.test.ts`, add a top-of-file type test:

```ts
import type { FlowKind } from '../src/viewer-flow.js'

it('FlowKind admits "manual"', () => {
  const _: FlowKind = 'manual'
  expect(_).toBe('manual')
})
```

- [ ] **Step 2: Run — expect a TypeScript type-check failure**

```bash
pnpm --filter @hexagram/casting-ui type:check
```

Expected: `Type '"manual"' is not assignable to type 'FlowKind'`.

- [ ] **Step 3: Widen the type at `viewer-flow.ts:30`**

```ts
export type FlowKind = 'interactive' | 'random' | 'manual'
```

- [ ] **Step 4: Re-run type:check — expect pass**

```bash
pnpm --filter @hexagram/casting-ui type:check
```

- [ ] **Step 5: Commit**

```bash
git add packages/casting-ui/src/viewer-flow.ts packages/casting-ui/tests/viewer-flow.test.ts
git commit -m "feat(viewer-flow): extend FlowKind with 'manual'"
```

### Task 1.2: Add `lineRewound` action + reducer case

- [ ] **Step 1: Write five failing reducer tests**

Append to `packages/casting-ui/tests/viewer-flow.test.ts`:

```ts
describe('flowReducer — lineRewound', () => {
  const baseCasting = () =>
    flowReducer(initialFlowState('manual'), {
      type: 'queryChange',
      value: 'Will the rains come?',
    })

  const inCastingMode = (overrides: Partial<FlowState> = {}): FlowState => ({
    ...flowReducer(baseCasting(), { type: 'querySubmit' }),
    ...overrides,
  })

  it("clears the current line's casts on a mid-line rewind", () => {
    const state = inCastingMode({
      lineIndex: 2,
      castIndex: 2,
      partialCasting: [
        [
          { pick: 21, max: 48 },
          { pick: 17, max: 43 },
          { pick: 9, max: 39 },
        ],
        [
          { pick: 22, max: 48 },
          { pick: 12, max: 40 },
          { pick: 8, max: 36 },
        ],
        [{ pick: 19, max: 48 }, { pick: 14, max: 42 }, null],
        [null, null, null],
        [null, null, null],
        [null, null, null],
      ],
      completedLines: [7, 8],
    })
    const next = flowReducer(state, { type: 'lineRewound' })
    expect(next.lineIndex).toBe(2)
    expect(next.castIndex).toBe(0)
    expect(next.partialCasting[2]).toEqual([null, null, null])
    expect(next.completedLines).toEqual([7, 8])
    expect(next.castingBuffer).toBe('')
    expect(next.error).toBeNull()
  })

  it('rewinds to the previous line when called immediately after a line completes', () => {
    const state = inCastingMode({
      lineIndex: 2,
      castIndex: 0,
      partialCasting: [
        [
          { pick: 21, max: 48 },
          { pick: 17, max: 43 },
          { pick: 9, max: 39 },
        ],
        [
          { pick: 22, max: 48 },
          { pick: 12, max: 40 },
          { pick: 8, max: 36 },
        ],
        [null, null, null],
        [null, null, null],
        [null, null, null],
        [null, null, null],
      ],
      completedLines: [7, 8],
    })
    const next = flowReducer(state, { type: 'lineRewound' })
    expect(next.lineIndex).toBe(1)
    expect(next.castIndex).toBe(0)
    expect(next.partialCasting[1]).toEqual([null, null, null])
    expect(next.completedLines).toEqual([7])
  })

  it('is a no-op at line 0 cast 0', () => {
    const state = inCastingMode()
    const next = flowReducer(state, { type: 'lineRewound' })
    expect(next).toBe(state)
  })

  it('is a no-op when flowKind !== manual', () => {
    const state = inCastingMode({ flowKind: 'interactive', castIndex: 2 })
    const next = flowReducer(state, { type: 'lineRewound' })
    expect(next).toBe(state)
  })

  it('is a no-op when mode !== casting', () => {
    const state: FlowState = {
      ...inCastingMode({ castIndex: 2 }),
      mode: 'done',
    }
    const next = flowReducer(state, { type: 'lineRewound' })
    expect(next).toBe(state)
  })
})
```

- [ ] **Step 2: Run the new describe — expect 5 failures (unknown action type)**

```bash
pnpm --filter @hexagram/casting-ui test -- -t "flowReducer — lineRewound"
```

- [ ] **Step 3: Add `lineRewound` to the `FlowAction` union**

At `viewer-flow.ts:52-71`, append after `computeFailed`:

```ts
  | { type: 'lineRewound' }
```

- [ ] **Step 4: Add the reducer case**

In `flowReducer`, slot the case after `'splitCommitted'` (the lifecycle-adjacent neighbour), copying the spec block verbatim from the design doc lines 137–172:

```ts
case 'lineRewound': {
  if (state.mode !== 'casting') return state
  if (state.flowKind !== 'manual') return state

  const targetLineIndex =
    state.castIndex === 0 && state.lineIndex > 0
      ? ((state.lineIndex - 1) as FlowState['lineIndex'])
      : state.lineIndex

  if (targetLineIndex === state.lineIndex && state.castIndex === 0) {
    return state
  }

  const partialCasting = state.partialCasting.map(
    (line, lineIndex) =>
      (lineIndex === targetLineIndex
        ? [null, null, null]
        : line) as PartialCastingRecord[number],
  ) as PartialCastingRecord

  const completedLines =
    targetLineIndex < state.lineIndex
      ? state.completedLines.slice(0, -1)
      : state.completedLines

  return {
    ...state,
    partialCasting,
    completedLines,
    lineIndex: targetLineIndex,
    castIndex: 0,
    castingBuffer: '',
    error: null,
  }
}
```

- [ ] **Step 5: Run the describe — expect 5 passes**

```bash
pnpm --filter @hexagram/casting-ui test -- -t "flowReducer — lineRewound"
```

- [ ] **Step 6: Run the whole package — expect green**

```bash
pnpm --filter @hexagram/casting-ui test
pnpm --filter @hexagram/casting-ui type:check
```

- [ ] **Step 7: Commit**

```bash
git add packages/casting-ui/src/viewer-flow.ts packages/casting-ui/tests/viewer-flow.test.ts
git commit -m "feat(viewer-flow): add lineRewound action for manual rewind"
```

---

## Phase 2: Hook extension — `rewindCurrentLine()`

**Files:**

- Modify: `packages/casting-ui/src/use-line-generator.ts:12-15` (return type), `:44-49` (refs), bottom (new function)
- Test (new): `packages/casting-ui/tests/use-line-generator.test.tsx`

### Task 2.1: Create the missing test file

- [ ] **Step 1: Create `packages/casting-ui/tests/use-line-generator.test.tsx` with a render harness**

Because the hook depends on a `dispatch` from `useReducer` external to the hook, drive it via a tiny test component:

```tsx
import { describe, expect, it } from 'vitest'
import { render } from 'ink-testing-library'
import React, { useReducer } from 'react'

import { flowReducer, initialFlowState } from '../src/viewer-flow.js'
import { useLineGenerator } from '../src/use-line-generator.js'

type ApiRef = {
  submitSplit: (pick: number) => void
  rewindCurrentLine: () => void
  currentMax: number
}

function Harness({ apiRef }: { apiRef: { current: ApiRef | null } }) {
  const [state, dispatch] = useReducer(flowReducer, initialFlowState('manual'))
  // Drive into casting mode for the first render
  if (state.mode === 'awaitingQuery') {
    dispatch({ type: 'queryChange', value: 'q' })
    dispatch({ type: 'querySubmit' })
  }
  const api = useLineGenerator(state, dispatch)
  apiRef.current = { ...api }
  return null
}

it('rewindCurrentLine clears the generator ref and resets currentMax', () => {
  const apiRef: { current: ApiRef | null } = { current: null }
  render(<Harness apiRef={apiRef} />)
  // first cast advances to round 2 (max < 49)
  apiRef.current!.submitSplit(20)
  expect(apiRef.current!.currentMax).toBeLessThan(48)
  apiRef.current!.rewindCurrentLine()
  expect(apiRef.current!.currentMax).toBe(48) // stalksBeforeParting.length - 1
})

it('after rewind, a castIndex=0 submitSplit builds a fresh generator', () => {
  const apiRef: { current: ApiRef | null } = { current: null }
  render(<Harness apiRef={apiRef} />)
  apiRef.current!.submitSplit(20)
  const round2Max = apiRef.current!.currentMax
  apiRef.current!.rewindCurrentLine()
  apiRef.current!.submitSplit(20)
  expect(apiRef.current!.currentMax).toBe(round2Max)
})
```

(NB: the harness shape may need a small tweak — `useReducer` initialisation must not loop. Use a `useEffect` or initialAction pattern if the inline dispatch races. The point is to expose the hook's API; the implementer should adapt the harness to whatever idiom matches `viewer.tsx`.)

- [ ] **Step 2: Run — expect failure ("rewindCurrentLine is not a function")**

```bash
pnpm --filter @hexagram/casting-ui test tests/use-line-generator.test.tsx
```

### Task 2.2: Implement `rewindCurrentLine()`

- [ ] **Step 1: Extend `UseLineGeneratorResult` at `use-line-generator.ts:12-15`**

```ts
interface UseLineGeneratorResult {
  submitSplit: (pick: number) => void
  rewindCurrentLine: () => void
  currentMax: number
}
```

- [ ] **Step 2: Add the rewind function before the `return` statement**

```ts
const rewindCurrentLine = useCallback(() => {
  lineGeneratorRef.current = null
  currentMaxRef.current = stalksBeforeParting.length - 1
}, [])
```

Update the return:

```ts
return { submitSplit, rewindCurrentLine, currentMax: currentMaxRef.current }
```

- [ ] **Step 3: Run the hook tests — expect pass**

```bash
pnpm --filter @hexagram/casting-ui test tests/use-line-generator.test.tsx
```

- [ ] **Step 4: Commit**

```bash
git add packages/casting-ui/src/use-line-generator.ts packages/casting-ui/tests/use-line-generator.test.tsx
git commit -m "feat(use-line-generator): add rewindCurrentLine op"
```

---

## Phase 3: Prompt component — manual branch

**Files:**

- Modify: `packages/casting-ui/src/casting-prompt-box.tsx:36` (add `MANUAL_REVEAL_MS`), `:491` (extend CastingInputMode? no — keep slider/number; add a separate `flowKind` prop), `:503-509` (getCastingPromptHeight), `:525-577` (props), `:608-670` (component body — add sibling branch)
- Test: `packages/casting-ui/tests/casting-prompt-box.test.tsx`

### Design notes for this phase

The spec says `inputMode` stays `'slider' | 'number'`. So the prompt receives a new prop — `flowKind: FlowKind` — and dispatches:

```ts
if (flowKind === 'manual') return <ManualBranch ... />
if (inputMode === 'slider') return <SliderCastingPrompt ... />
return <NumberBranch ... />
```

`getCastingPromptHeight()` gains a third arg:

```ts
export function getCastingPromptHeight(
  inputMode: CastingInputMode,
  hasError: boolean,
  flowKind: FlowKind = 'interactive',
): number {
  if (flowKind === 'manual') return 7
  if (inputMode === 'slider') return 7
  return hasError ? 6 : 5
}
```

The `flowKind` default keeps existing callers source-compatible until Phase 4 threads it explicitly.

The manual branch reuses two `<NumberInput>` instances. **Focus cycling** is the new mechanic — Tab swaps a `focusedField: 'piles' | 'remainder'` local state.

### Task 3.1: Add the new `MANUAL_REVEAL_MS` constant + helper functions

- [ ] **Step 1: Write a test for `getCastingPromptHeight` manual branch**

In `packages/casting-ui/tests/casting-prompt-box.test.tsx`, append:

```ts
import { getCastingPromptHeight } from '../src/casting-prompt-box.js'

describe('getCastingPromptHeight', () => {
  it('returns 7 for manual flow regardless of inputMode', () => {
    expect(getCastingPromptHeight('number', false, 'manual')).toBe(7)
    expect(getCastingPromptHeight('slider', false, 'manual')).toBe(7)
    expect(getCastingPromptHeight('number', true, 'manual')).toBe(7)
  })
  it('still returns 5/6 for number / interactive', () => {
    expect(getCastingPromptHeight('number', false, 'interactive')).toBe(5)
    expect(getCastingPromptHeight('number', true, 'interactive')).toBe(6)
    expect(getCastingPromptHeight('slider', false, 'interactive')).toBe(7)
  })
})
```

- [ ] **Step 2: Run — expect type error (third arg)**

```bash
pnpm --filter @hexagram/casting-ui type:check
```

- [ ] **Step 3: Update `getCastingPromptHeight` signature at `:503-509`**

```ts
export function getCastingPromptHeight(
  inputMode: CastingInputMode,
  hasError: boolean,
  flowKind: FlowKind = 'interactive',
): number {
  if (flowKind === 'manual') return 7
  if (inputMode === 'slider') return 7
  return hasError ? 6 : 5
}
```

Import `FlowKind` at the top of the file from `./viewer-flow.js`.

- [ ] **Step 4: Add `MANUAL_REVEAL_MS` constant near `SLIDER_COMMIT_REVEAL_MS` (line 36)**

```ts
export const MANUAL_REVEAL_MS = 1000
```

- [ ] **Step 5: Run helper tests — expect pass**

```bash
pnpm --filter @hexagram/casting-ui test -- -t "getCastingPromptHeight"
```

- [ ] **Step 6: Commit**

```bash
git add packages/casting-ui/src/casting-prompt-box.tsx packages/casting-ui/tests/casting-prompt-box.test.tsx
git commit -m "feat(casting-prompt): add MANUAL_REVEAL_MS and flowKind-aware height"
```

### Task 3.2: Add the manual prompt branch

- [ ] **Step 1: Write the component test suite (use `manualRevealMs={0}` to bypass dwell)**

Append to `casting-prompt-box.test.tsx`. Each test asserts one observable behavior; cover the 11 items listed in the spec's "Component tests" section. Sketch:

```tsx
import { render } from 'ink-testing-library'
import {
  waitFor,
  waitForReady,
  yieldMacrotask,
  TAB,
  ENTER,
} from '@hexagram/test-utils'

import { CastingPromptBox } from '../src/casting-prompt-box.js'

const baseProps = {
  lineNumber: 3 as const,
  castIndex: 1 as const,
  min: 1,
  max: 40,
  width: 60,
  inputMode: 'number' as const,
  flowKind: 'manual' as const,
  onSubmit: () => {},
  manualRevealMs: 0,
}

it('renders title, unparted, two-field input, derived rows', async () => {
  const onReady = vi.fn()
  const { lastFrame } = render(
    <CastingPromptBox {...baseProps} onReady={onReady} />,
  )
  await waitForReady(onReady)
  const frame = lastFrame()!
  expect(frame).toContain('Line 3/6 · Cast 2/3')
  expect(frame).toContain('Unparted stalks: 40')
  expect(frame).toMatch(/Left heap: \[.\] piles × 4 \+ \[.\] remainder/)
  expect(frame).toContain('range 1 to 39')
})

it('Tab cycles focus between piles and remainder', async () => {
  const onReady = vi.fn()
  const { stdin, lastFrame } = render(
    <CastingPromptBox {...baseProps} onReady={onReady} />,
  )
  await waitForReady(onReady)
  // assert piles cursor is shown initially (use a focus marker in the rendered text)
  stdin.write(TAB)
  await yieldMacrotask()
  // remainder is now focused
  stdin.write(TAB)
  await yieldMacrotask()
  // piles is focused again (wrap)
})

it('derived split updates live as digits are typed into either field', async () => {
  /* ... */
})

it('piles upper bound is floor((max-1)/4); remainder bound is 1..4', async () => {
  /* ... */
})

it('out-of-range derived split surfaces in the derived row and Enter is a no-op', async () => {
  /* ... */
})

it('valid commit calls onSubmit(4 × piles + remainder)', async () => {
  /* ... */
})

it('boundary commit: piles=0, remainder=1 calls onSubmit(1)', async () => {
  /* ... */
})

it('post-commit reveal swaps derived row to "Round resolved" for manualRevealMs', async () => {
  /* ... */
})

it('reveal next/suspended comes from the line-generator next-round unpartedStalks length', async () => {
  /* ... */
})

it('Ctrl+R is NOT intercepted by the prompt', async () => {
  /* ... */
})

it('Tab is NOT propagated outside the prompt', async () => {
  /* ... */
})
```

For each test, fill in the body using the same `render` + `stdin.write` + `waitFor`/`yieldMacrotask` idiom shown in `viewer.test.tsx`. **Do not write a `await tick(50)` constant** — use `waitForReady(onReady)` and `waitFor(() => expect(...))` (see `superpowers:ansi-color-piping` and the `ink-useinput-bind` skill for the rationale). The `onReady` prop is fired from the same `useEffect` that binds the manual branch's `useInput`, identical to the slider's existing pattern.

- [ ] **Step 2: Run — expect failures (component renders the number branch, no manual rows)**

```bash
pnpm --filter @hexagram/casting-ui test tests/casting-prompt-box.test.tsx
```

- [ ] **Step 3: Add new props to `CastingPromptBoxProps`**

At `:525-577`, append:

```ts
flowKind?: FlowKind                    // default 'interactive'
manualRevealMs?: number                // default MANUAL_REVEAL_MS
unpartedStalks?: number                // for the reveal row's `next`; viewer reads from FourOperationsResult.unpartedStalks.length and passes it in
onReady?: () => void                   // already present for slider; reuse
```

- [ ] **Step 4: Add the manual branch in `CastingPromptBox`**

At `:608` (component start), after destructuring props, branch:

```tsx
if (flowKind === 'manual') {
  return (
    <ManualCastingPrompt
      {...{
        lineNumber,
        castIndex,
        min,
        max,
        width,
        onSubmit,
        manualRevealMs,
        onReady /* etc */,
      }}
    />
  )
}
if (inputMode === 'slider') {
  /* existing */
}
return /* existing number-mode Box */
```

`<ManualCastingPrompt>` is defined inline above `CastingPromptBox` (no new file — spec says "no new input primitive file needed"). It contains:

- Local state: `pilesBuffer`, `remainderBuffer`, `focusedField: 'piles' | 'remainder'`, `committed: { pick, suspended, next } | null`.
- Two `<NumberInput>` components, each with `focused={focusedField === 'piles'}` / `focused={focusedField === 'remainder'}`, `min`, `max` (their own per-field bounds), `onChange` writing to the buffer.
- `useInput` capturing Tab (cycles focus) and Enter (validates → calls `onSubmit(derivedPick)` if in range).
- `useEffect` mirroring slider's pattern: bind `useInput`, then call `onReady?.()` in the same effect — this is the cure for the Ink `useInput` bind race (see `superpowers:ink-useinput-bind`).
- Derived row text: if `committed`, show `→ Round resolved: suspended X · next: Y unparted`; else compute live from the two buffers (cf. spec UI section).

`pilesMax = Math.floor((max - 1) / 4)`; `remainderMin = 1`; `remainderMax = 4`. Cross-field check: `derived = 4 * piles + remainder`; valid iff `1 <= derived <= max - 1`.

After Enter commits, schedule a `setTimeout(() => onCommit(), manualRevealMs)` to fire `onSubmit(derivedPick)` after the reveal. When `manualRevealMs === 0`, call `onSubmit` synchronously (test fast path).

- [ ] **Step 5: Run the manual-branch suite — iterate until green**

```bash
pnpm --filter @hexagram/casting-ui test tests/casting-prompt-box.test.tsx
```

- [ ] **Step 6: Run the whole package — expect green**

```bash
pnpm --filter @hexagram/casting-ui test
pnpm --filter @hexagram/casting-ui type:check
```

- [ ] **Step 7: Stress test (Ink components are flake-prone — AGENTS.md "CI simulation" section)**

```bash
pnpm test:stress:once
```

Expect 4 concurrent passes. Any flake here is a `useInput` bind-race or a stray `await tick(50)` — fix at the root before continuing (see `superpowers:ink-useinput-bind`, `superpowers:cross-platform-tests`).

- [ ] **Step 8: Commit**

```bash
git add packages/casting-ui/src/casting-prompt-box.tsx packages/casting-ui/tests/casting-prompt-box.test.tsx
git commit -m "feat(casting-prompt): add manual two-field input branch"
```

---

## Phase 4: Viewer integration — Ctrl+R, threading, exports

**Files:**

- Modify: `packages/casting-ui/src/viewer.tsx:65-118` (props), `:153` (initialFlowState), `:309` (isNumberRandomPlayback — audit), `:388` (handleQuerySubmit — audit), `:517-518` (commitRevealMs thread; add manualRevealMs), `:597` (keyHintsForCasting — add manual footer hint), `:622-636` (runConsultationViewer — accept 'manual' implicitly via FlowKind widening)
- Modify: `packages/casting-ui/src/index.ts` (add `runManualConsultationViewer` export)
- Modify: `packages/viewer-core/src/...` if `keyHintsForCasting` lives there (verify during implementation)
- Test: `packages/casting-ui/tests/viewer.test.tsx`

### Task 4.1: Thread `flowKind` and `manualRevealMs` through `<ConsultationViewer>`

- [ ] **Step 1: Add a viewer-level integration test for manual flow**

In `packages/casting-ui/tests/viewer.test.tsx`, add a new `describe('manual flow')` with these tests (use `manualRevealMs={0}` and `sliderCommitRevealMs={0}`):

```ts
describe('manual flow', () => {
  it('drives query → 18 casts → save, byte-equivalent to an interactive run', async () => {
    /* see Phase 7 */
  })
  it('Ctrl+R mid-line clears the current line and returns to cast 0', async () => {
    /* ... */
  })
  it('Ctrl+R after a line completes rewinds to the previous line', async () => {
    /* ... */
  })
  it('Ctrl+R at line 0 cast 0 is a no-op', async () => {
    /* ... */
  })
  it('after Ctrl+R, focus returns to the piles field', async () => {
    /* ... */
  })
})
```

(The byte-equivalence test ships in Phase 7; the rewind tests can be skeletons here that fail until Task 4.2 is done.)

- [ ] **Step 2: Run — expect failures (viewer rejects `flowKind: 'manual'` typecheck, or no rewind behaviour)**

```bash
pnpm --filter @hexagram/casting-ui test tests/viewer.test.tsx -- -t "manual flow"
```

- [ ] **Step 3: Add `manualRevealMs?: number` to `ConsultationViewerProps`**

At `:65-118`, append:

```ts
manualRevealMs?: number  // default MANUAL_REVEAL_MS
```

Destructure at the same spot `sliderCommitRevealMs` is destructured (`:141`-ish):

```ts
manualRevealMs = MANUAL_REVEAL_MS,
```

Import `MANUAL_REVEAL_MS` from `./casting-prompt-box.js`.

- [ ] **Step 4: Pass `flowKind` and `manualRevealMs` to `<CastingPromptBox>`**

At the casting-prompt mount site (`:515-525` ish, where `commitRevealMs={sliderCommitRevealMs}` is threaded), add:

```tsx
flowKind={state.flowKind}
manualRevealMs={manualRevealMs}
unpartedStalks={currentMax + 1}
```

- [ ] **Step 5: Audit `handleQuerySubmit` at `:388`**

Current shape branches on `state.flowKind === 'random'` to immediately transition to computing. Manual takes the interactive path (query → casting), so the `else` branch covers it. **Confirm** the existing condition is `=== 'random'` (not `!== 'interactive'`), so manual falls through correctly. If the implementation finds `!== 'interactive'`, change to `=== 'random'`.

- [ ] **Step 6: Audit `isNumberRandomPlayback` at `:309`**

Random-only autoland path. Should be gated on `flowKind === 'random' && inputMode === 'number'`. Confirm and adjust if needed so manual is never confused for playback.

- [ ] **Step 7: Run — manual flow test should at least progress to casting (rewind still missing)**

```bash
pnpm --filter @hexagram/casting-ui test tests/viewer.test.tsx -- -t "manual flow"
```

### Task 4.2: Add the Ctrl+R handler

- [ ] **Step 1: Locate the existing viewer-level `useInput` block**

Per the Explore agent: `viewer.tsx` does NOT call `useInput` directly — keyboard handling is delegated to `<ConsultationReadout>` for the readout phase, and to `<CastingPromptBox>` / sub-components for the casting phase. Ctrl+R must therefore live in the **casting-phase host** — either in a new `useInput` block scoped to `mode === 'casting' && flowKind === 'manual'`, or as a new prop forwarded to the casting subtree.

Recommended approach (matches existing patterns): add a `useInput` directly in `<ConsultationViewer>`'s function body, gated by `mode === 'casting' && state.flowKind === 'manual'`. This sits alongside the existing `useReducer` and `useLineGenerator` calls and runs at the same level as the casting subtree, so it dispatches into the same reducer naturally.

- [ ] **Step 2: Implement the handler**

```ts
useInput(
  (input, key) => {
    if (key.ctrl && input === 'r') {
      rewindCurrentLine()
      dispatch({ type: 'lineRewound' })
    }
  },
  {
    isActive: state.mode === 'casting' && state.flowKind === 'manual',
  },
)
```

The `rewindCurrentLine()` call (sync ref mutation) MUST precede the `dispatch` so the next render's `currentMax` already reflects the reset — spec section "Ctrl+R handler location".

- [ ] **Step 3: Run the rewind tests — expect green**

```bash
pnpm --filter @hexagram/casting-ui test tests/viewer.test.tsx -- -t "manual flow"
```

- [ ] **Step 4: Update `keyHintsForCasting` (or footer-hint builder, wherever the casting footer string is built — search casting-ui + viewer-core)**

Append `· Tab field` always, and `· Ctrl+R rewind line` when `flowKind === 'manual' && (castIndex > 0 || lineIndex > 0)`. Add a unit test asserting both hints appear at the right times.

- [ ] **Step 5: Run package tests + stress**

```bash
pnpm --filter @hexagram/casting-ui test
pnpm --filter @hexagram/casting-ui type:check
pnpm test:stress:once
```

- [ ] **Step 6: Commit**

```bash
git add packages/casting-ui/src/viewer.tsx packages/casting-ui/tests/viewer.test.tsx packages/viewer-core/...
git commit -m "feat(viewer): wire manual flow + Ctrl+R rewind handler"
```

### Task 4.3: Export `runManualConsultationViewer` from `@hexagram/casting-ui`

- [ ] **Step 1: Write a tiny export test**

In a new `packages/casting-ui/tests/exports.test.ts` (or extend an existing one):

```ts
import { runManualConsultationViewer } from '../src/index.js'
it('exports runManualConsultationViewer', () => {
  expect(typeof runManualConsultationViewer).toBe('function')
})
```

- [ ] **Step 2: Run — expect failure**

```bash
pnpm --filter @hexagram/casting-ui test -- -t "exports runManualConsultationViewer"
```

- [ ] **Step 3: Add the thin wrapper in `viewer.tsx`**

Below `runConsultationViewer`:

```ts
export async function runManualConsultationViewer(opts: {
  maxWrapWidth?: number
  manualRevealMs?: number
}): Promise<void> {
  return runConsultationViewer({
    flowKind: 'manual',
    inputMode: 'number',
    maxWrapWidth: opts.maxWrapWidth,
    manualRevealMs: opts.manualRevealMs,
  })
}
```

Re-export from `packages/casting-ui/src/index.ts` alongside `runConsultationViewer`.

- [ ] **Step 4: Run — expect pass**

```bash
pnpm --filter @hexagram/casting-ui test
```

- [ ] **Step 5: Commit**

```bash
git add packages/casting-ui/src/viewer.tsx packages/casting-ui/src/index.ts packages/casting-ui/tests/exports.test.ts
git commit -m "feat(casting-ui): export runManualConsultationViewer"
```

---

## Phase 5: Shell wiring — menu + nav

**Files:**

- Modify: `packages/shell/src/home-menu.tsx:26-31` (HomeMenuSelection), `:43-48` (MENU_ITEMS)
- Modify: `packages/shell/src/nav-machine.ts:17` (NavFlowKind), `:37-42` (NavEvent), `:67-84` (navReducer)
- Modify: `packages/shell/src/hexagram-app.tsx:96-109` (eventForSelection)
- Test: `packages/shell/tests/nav-machine.test.ts`, `packages/shell/tests/home-menu.test.tsx`

### Task 5.1: Nav machine

- [ ] **Step 1: Write failing tests in `nav-machine.test.ts`**

```ts
it('navReducer transitions Home → casting:manual on newManualConsultation', () => {
  expect(
    navReducer({ screen: 'home' }, { type: 'newManualConsultation' }),
  ).toEqual({ screen: 'casting', flowKind: 'manual' })
})
it('ignores newManualConsultation off Home', () => {
  const state = { screen: 'history' } as const
  expect(navReducer(state, { type: 'newManualConsultation' })).toBe(state)
})
it('backToHome from casting:manual returns to Home', () => {
  expect(
    navReducer(
      { screen: 'casting', flowKind: 'manual' },
      { type: 'backToHome' },
    ),
  ).toEqual({ screen: 'home' })
})
```

- [ ] **Step 2: Run — expect failures**

```bash
pnpm --filter @hexagram/shell test
```

- [ ] **Step 3: Extend types and reducer**

At `:17`:

```ts
export type NavFlowKind = 'interactive' | 'random' | 'manual'
```

At `:37-42`, add `| { type: 'newManualConsultation' }`.
In `navReducer`, add the case:

```ts
case 'newManualConsultation':
  return state.screen === 'home'
    ? { screen: 'casting', flowKind: 'manual' }
    : state
```

- [ ] **Step 4: Run — expect pass**

```bash
pnpm --filter @hexagram/shell test
pnpm --filter @hexagram/shell type:check
```

- [ ] **Step 5: Commit**

```bash
git add packages/shell/src/nav-machine.ts packages/shell/tests/nav-machine.test.ts
git commit -m "feat(shell): add newManualConsultation nav event"
```

### Task 5.2: Home menu

- [ ] **Step 1: Write failing tests in `home-menu.test.tsx`**

```ts
it('renders 5 items in order: interactive, random, manual, history, playground', async () => {
  const onSelect = vi.fn(); const onQuit = vi.fn(); const onReady = vi.fn()
  const { lastFrame } = render(<HomeMenu onSelect={onSelect} onQuit={onQuit} onReady={onReady} />)
  await waitForReady(onReady)
  const frame = lastFrame()!
  const order = ['interactive', 'random', 'manual', 'history', 'playground']
    .map(label => frame.indexOf(label))
  expect(order).toEqual([...order].sort((a, b) => a - b))
})
it('↓↓ Enter selects manual', async () => { /* press down twice with yieldMacrotask between */ })
it('↑ from top wraps to playground', async () => { /* press up once */ })
```

- [ ] **Step 2: Run — expect failures (no "manual" in MENU_ITEMS)**

```bash
pnpm --filter @hexagram/shell test tests/home-menu.test.tsx
```

- [ ] **Step 3: Extend `HomeMenuSelection` and `MENU_ITEMS`**

At `:26-31`:

```ts
export type HomeMenuSelection =
  | 'interactive'
  | 'random'
  | 'manual'
  | 'history'
  | 'playground'
```

At `:43-48`:

```ts
const MENU_ITEMS: readonly MenuItem[] = [
  { value: 'interactive', label: 'New interactive consultation' },
  { value: 'random', label: 'New random consultation' },
  { value: 'manual', label: 'New manual consultation' },
  { value: 'history', label: 'Browse history' },
  { value: 'playground', label: 'Playground' },
]
```

- [ ] **Step 4: Extend `eventForSelection` in `hexagram-app.tsx:96-109`**

```ts
case 'manual':
  return { type: 'newManualConsultation' }
```

- [ ] **Step 5: Run all shell tests + stress**

```bash
pnpm --filter @hexagram/shell test
pnpm --filter @hexagram/shell type:check
pnpm test:stress:once
```

- [ ] **Step 6: Commit**

```bash
git add packages/shell/src/home-menu.tsx packages/shell/src/hexagram-app.tsx packages/shell/tests/home-menu.test.tsx
git commit -m "feat(shell): add manual consultation entry to Home menu"
```

---

## Phase 6: Bin + tsdown + package.json

**Files:**

- Create: `apps/cli/src/manual.ts`
- Modify: `apps/cli/tsdown.config.ts`
- Modify: `apps/cli/package.json`
- Create: `apps/cli/tests/` (directory) + `apps/cli/tests/manual.test.ts`

### Task 6.1: Create `apps/cli/src/manual.ts`

- [ ] **Step 1: Create the bin file (mirrors `history.ts` pattern)**

```ts
#!/usr/bin/env node

import process from 'node:process'

import {
  resolveWrapWidth,
  runManualConsultationViewer,
} from '@hexagram/casting-ui'
import { isInteractiveEnv } from '@hexagram/viewer-core'

async function main(): Promise<void> {
  try {
    if (!isInteractiveEnv()) {
      process.stderr.write('hexagram-manual requires an interactive terminal\n')
      process.exit(1)
    }
    const maxWrapWidth = resolveWrapWidth()
    await runManualConsultationViewer({ maxWrapWidth })
    process.exit(0)
  } catch (error) {
    console.error(error)
    process.exit(1)
  }
}

await main()
```

(Note: spec's example uses `process.stdout.isTTY` / `NO_COLOR` / `CI` directly. The existing `history.ts` delegates to `isInteractiveEnv()` from `@hexagram/viewer-core`; reuse it for consistency. Verify it covers all three conditions.)

- [ ] **Step 2: Extend `tsdown.config.ts`**

Add `'./src/manual.ts'` to the `entry` array in alphabetic order.

- [ ] **Step 3: Extend `apps/cli/package.json#bin`**

```jsonc
"bin": {
  "hexagram": "./dist/hexagram.mjs",
  "hexagram-history": "./dist/history.mjs",
  "hexagram-interactive": "./dist/interactive.mjs",
  "hexagram-manual": "./dist/manual.mjs",
  "hexagram-playground": "./dist/playground.mjs",
  "hexagram-random": "./dist/random.mjs"
}
```

Update `description` to: `"Yijing hexagram oracle CLI bins (hexagram, hexagram-random, hexagram-interactive, hexagram-manual, hexagram-history, hexagram-playground)"`.

- [ ] **Step 4: Verify build emits the bin**

```bash
pnpm --filter @hexagram/bin build
ls apps/cli/dist/manual.mjs
```

Expected: file exists.

- [ ] **Step 5: Run the bin in a real terminal (manual sanity check)**

```bash
pnpm hexagram-manual
```

Expected: viewer mounts at Home → query → casting prompts. Type some values, complete a line, hit Ctrl+R to verify rewind. ESC exits.

- [ ] **Step 6: Run with `NO_COLOR=1` and confirm refusal**

```bash
NO_COLOR=1 pnpm hexagram-manual
```

Expected stderr: `hexagram-manual requires an interactive terminal`, exit 1.

- [ ] **Step 7: Commit**

```bash
git add apps/cli/src/manual.ts apps/cli/tsdown.config.ts apps/cli/package.json
git commit -m "feat(cli): add hexagram-manual bin"
```

### Task 6.2: Bin smoke test

**Note:** `apps/cli/tests/` does not yet exist; `apps/cli/vitest.config.ts` does. This is the first cli-level test — turbo's test pipeline already covers `apps/cli` (verify by reading `turbo.json` once).

- [ ] **Step 1: Create `apps/cli/tests/manual.test.ts`**

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest'

const mockRun = vi.fn()
vi.mock('@hexagram/casting-ui', () => ({
  runManualConsultationViewer: mockRun,
  resolveWrapWidth: () => 60,
}))
vi.mock('@hexagram/viewer-core', () => ({
  isInteractiveEnv: vi.fn(),
}))

describe('hexagram-manual bin', () => {
  beforeEach(() => {
    mockRun.mockReset()
    vi.spyOn(process, 'exit').mockImplementation(((code: number) => {
      throw new Error(`exit:${code}`)
    }) as never)
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
  })

  it('refuses non-interactive env with exit 1', async () => {
    const { isInteractiveEnv } = await import('@hexagram/viewer-core')
    ;(isInteractiveEnv as any).mockReturnValue(false)
    await expect(import('../src/manual.js')).rejects.toThrow('exit:1')
    expect(process.stderr.write).toHaveBeenCalledWith(
      expect.stringContaining(
        'hexagram-manual requires an interactive terminal',
      ),
    )
  })

  it('calls runManualConsultationViewer when interactive', async () => {
    const { isInteractiveEnv } = await import('@hexagram/viewer-core')
    ;(isInteractiveEnv as any).mockReturnValue(true)
    mockRun.mockResolvedValue(undefined)
    await expect(import('../src/manual.js')).rejects.toThrow('exit:0')
    expect(mockRun).toHaveBeenCalledWith({ maxWrapWidth: 60 })
  })
})
```

(Top-level await in `manual.ts` makes import-as-execution work; `process.exit` is mocked to throw so we can assert exit codes.)

- [ ] **Step 2: Run — should pass after the bin file is in place**

```bash
pnpm --filter @hexagram/bin test
```

If `vitest.config.ts` in `apps/cli/` doesn't pick up `tests/**`, extend its `test.include`.

- [ ] **Step 3: Commit**

```bash
git add apps/cli/tests/manual.test.ts apps/cli/vitest.config.ts
git commit -m "test(cli): smoke-test hexagram-manual TTY guard"
```

---

## Phase 7: Fixture parity — byte-identity invariant

**Why this matters:** Spec Q6 says manual writes the same frontmatter + body as interactive. The test guards against accidentally introducing a provenance field or a flow-conditional save path.

**Files:**

- Modify: `packages/casting-ui/tests/fixtures/cases.ts`
- Modify: `packages/consultation-file/tests/fixtures/cases.ts` (if both files have a flow indicator — they don't currently; the fixture data is pure `{name, query, hexagram, casting}`, so the "manual variant" is a new test pairing, not a new data row)
- Add: a `viewer.test.tsx` integration test that drives the same case through both flows and asserts equal saved bytes

### Task 7.1: Add the byte-identity integration test

- [ ] **Step 1: Add the test in `packages/casting-ui/tests/viewer.test.tsx`**

```ts
it('manual flow saves a file byte-identical to interactive flow for the same casting record', async () => {
  // Pick one fixture case (e.g., 'no-moving')
  const targetCase = cases.find((c) => c.name === 'no-moving')!

  // Drive an interactive viewer with the case's picks (per-cast via number-input mode)
  const interactivePath = await driveCase(targetCase, {
    flowKind: 'interactive',
    inputMode: 'number',
  })

  // Drive a manual viewer with the same picks (decompose each into piles+remainder)
  const manualPath = await driveCase(targetCase, { flowKind: 'manual' })

  // Read both saved .md files
  const interactiveContent = await fs.readFile(interactivePath, 'utf8')
  const manualContent = await fs.readFile(manualPath, 'utf8')
  // Strip the timestamp line (it differs by ms) and compare the rest
  const stripTimestamp = (s: string) => s.replace(/timestamp:.*\n/, '')
  expect(stripTimestamp(manualContent)).toBe(stripTimestamp(interactiveContent))
})
```

The `driveCase` helper uses the existing test-helper pattern (already present in `viewer.test.tsx`) to render the viewer, submit the query, advance through all 18 casts, and return the saved path. For manual mode it decomposes each `pick` into piles + remainder. Encode this as a helper:

```ts
function decomposePick(pick: number): { piles: number; remainder: number } {
  const remainder = ((pick - 1) % 4) + 1
  const piles = (pick - remainder) / 4
  return { piles, remainder }
}
```

This honours the I Ching convention where a left-heap divisible by 4 yields remainder=4 (never 0).

- [ ] **Step 2: Run — expect pass (since save path doesn't read flowKind)**

```bash
pnpm --filter @hexagram/casting-ui test -- -t "byte-identical"
```

If this fails, **stop and audit** — a provenance leak has been introduced somewhere in Phases 1–4. Find it before continuing.

- [ ] **Step 3: Commit**

```bash
git add packages/casting-ui/tests/viewer.test.tsx
git commit -m "test(viewer): assert manual flow saves byte-identical to interactive"
```

### Task 7.2: Regenerate the byte-locked .md fixtures

The existing `.md` fixtures in `packages/consultation-file/tests/fixtures/` lock the saved-output bytes. If any of the Phase 3/4 changes incidentally moved a byte (e.g., a stray whitespace), regen will be required.

- [ ] **Step 1: Try the test suite first**

```bash
pnpm test
```

- [ ] **Step 2: If fixtures drift, regenerate intentionally**

```bash
pnpm generate-fixtures
git diff packages/casting-ui/tests/fixtures packages/consultation-file/tests/fixtures
```

Inspect the diff. If the only change is one we expect (e.g., a footer hint string), commit it. If unexpected output drifted, find the cause first — do **not** rubber-stamp generate-fixtures runs.

- [ ] **Step 3: Commit (only if a diff exists)**

```bash
git add packages/casting-ui/tests/fixtures packages/consultation-file/tests/fixtures
git commit -m "chore(fixtures): regenerate after manual-flow integration"
```

---

## Phase 8: Docs + final verification

**Files:**

- Modify: `AGENTS.md` (Commands + Architecture sections)
- Modify: `packages/shell/package.json` description (if it enumerates flows — currently it does not enumerate, so probably a no-op)

### Task 8.1: Update AGENTS.md

- [ ] **Step 1: Extend the "Commands" section**

Add `pnpm hexagram-manual` to the bin listing alongside the others. Note that it is Ink-only (refuses non-TTY), and that no `--plain` flag is supported.

- [ ] **Step 2: Extend the "Architecture → Random vs. interactive" section**

Document the manual flow's UX (two-field per-cast input, Ctrl+R rewind line, `MANUAL_REVEAL_MS` dwell). Reference `runManualConsultationViewer`.

- [ ] **Step 3: Extend the apps/cli `bin` enumeration in the repo-layout tree at the top of AGENTS.md**

Add `+ hexagram-manual` to the inline comment in the repo-layout code block.

- [ ] **Step 4: Extend the `apps/cli/tsdown.config.ts` build-section bullet**

Currently reads "four entries (`hexagram`, `interactive`, `random`, `history`)". Update to **five** + `manual`.

- [ ] **Step 5: Commit**

```bash
git add AGENTS.md
git commit -m "docs(agents): document hexagram-manual flow + bin"
```

### Task 8.2: Final cross-cutting verification

- [ ] **Step 1: Full type-check across the workspace**

```bash
pnpm type:check
```

- [ ] **Step 2: Full test suite**

```bash
pnpm test
```

Expected: green, ~30s in the @hexagram/core distribution test.

- [ ] **Step 3: Lint + format**

```bash
pnpm lint:check
pnpm format:check
```

Fix anything either reports. Re-commit with `style: ...` if formatter touches files.

- [ ] **Step 4: Stress test the Ink-touched changes**

```bash
pnpm test:stress
```

This runs ~5–10 minutes; reach for it because Phase 3 + Phase 4 + Phase 5 are all in the May-2026 flake-prone Ink path. Any flake → root-cause via `superpowers:ink-useinput-bind` or `superpowers:ansi-color-piping`.

- [ ] **Step 5: Manual smoke run**

```bash
pnpm hexagram                 # confirm 'manual' appears 3rd in the Home menu, opens to casting:manual
pnpm hexagram-manual          # standalone bin happy-path
pnpm hexagram-manual -- --wrap-width 60      # narrow-width sanity check
NO_COLOR=1 pnpm hexagram-manual              # confirm refusal
```

- [ ] **Step 6: Final commit (if anything drifted in the verification)**

```bash
git status
# only commit if there's a real diff
```

---

## Verification summary

After Phase 8 completes:

- `pnpm test` green (incl. byte-identity invariant from Phase 7)
- `pnpm type:check` green
- `pnpm lint:check` + `pnpm format:check` clean
- `pnpm test:stress` green (Ink flake guard)
- `pnpm hexagram` renders the 5-item Home menu with 'manual' in third position
- `pnpm hexagram-manual` mounts the viewer, accepts piles+remainder per cast, Ctrl+R rewinds, ESC exits, saves a .md identical in shape to interactive output
- `NO_COLOR=1 pnpm hexagram-manual` refuses with the expected stderr + exit 1
- `AGENTS.md` documents the new bin

## Self-review against the spec

| Spec section                          | Plan task(s)                                               |
| ------------------------------------- | ---------------------------------------------------------- |
| Q1 Input model — two-field            | Task 3.2                                                   |
| Q2 UX shape — live scratchpad         | Tasks 3.2 + 4.1                                            |
| Q3 Undo — two-line window             | Tasks 1.2 + 2.2 + 4.2                                      |
| Q4 Query timing — query first         | inherited (no reducer change)                              |
| Q5 No plain mode                      | Task 6.1 TTY guard                                         |
| Q6 No provenance field                | Task 7.1 byte-identity test                                |
| Q7 Wiring (menu/bin/keybinding)       | Tasks 5.2 + 6.1 + 4.2                                      |
| `lineRewound` action + reducer        | Tasks 1.1 + 1.2                                            |
| `rewindCurrentLine()` hook op         | Task 2.2                                                   |
| Manual prompt branch                  | Task 3.2                                                   |
| `getCastingPromptHeight()` manual arm | Task 3.1                                                   |
| `MANUAL_REVEAL_MS` constant           | Task 3.1                                                   |
| Ctrl+R handler in viewer              | Task 4.2                                                   |
| `runManualConsultationViewer` export  | Task 4.3                                                   |
| `apps/cli/src/manual.ts` bin          | Task 6.1                                                   |
| Home menu + nav-machine wiring        | Tasks 5.1 + 5.2                                            |
| AGENTS.md docs                        | Task 8.1                                                   |
| Pure unit tests                       | Tasks 1.2 + 5.1                                            |
| Hook test                             | Task 2.1                                                   |
| Component tests (11 items)            | Task 3.2                                                   |
| Viewer integration (rewind scenarios) | Tasks 4.1 + 4.2                                            |
| Fixture parity invariant              | Task 7.1                                                   |
| Bin smoke test                        | Task 6.2                                                   |
| CI flake simulation                   | Tasks 3.2 + 5.2 + 8.2 (`test:stress:once` / `test:stress`) |

No spec section is missing a task.
