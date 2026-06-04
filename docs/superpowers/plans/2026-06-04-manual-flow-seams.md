# Manual-Flow Seam Resolution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the eight legibility seams found in a cold-read theory-reconstruction of the manual-consultation flow, by converting invariants currently carried in comments/conventions/tests-elsewhere into code the type system or a local test enforces.

**Architecture:** Seven of the eight seams are the same shape — a *correct* invariant enforced only by convention. None is a live bug; every fix is additive (a lock-in test, a pure helper, a compile-time assertion, or a clarifying comment) and changes **no runtime behavior**. Existing tests must stay green throughout. Each seam becomes one focused commit.

**Tech Stack:** TypeScript (ESM, NodeNext), pnpm workspaces + Turborepo, Vitest (`cross-env FORCE_COLOR=1 vitest run`), `tsc --noEmit` for `type:check`. All source files use explicit `.js` import specifiers; test files import from `../src/<module>` (no extension) and use `describe`/`it`/`expect` from `vitest`.

**Seam → Task map:**

| Seam | Title | Fix kind | Task |
|---|---|---|---|
| 1 | Dual arithmetic, no structural link | lock-in test + comments | Task 1 |
| 3 | Triple ownership of never-zero-remainder | property test + comment | Task 2 |
| 4 | One priority list, two render surfaces | pure helper + test + wire-in | Task 3 |
| 7 | `MANUAL_FIELD_ORDER` magic array | compile-time type guard | Task 4 |
| 8 | `castingPlan` nullability invariant | reducer test + comment | Task 5 |
| 2, 5, 6 | Right-heap role / hollow error field / dwell ownership | doc comments | Task 6 |

**Conventions for every task below:**
- Run a single Vitest file with: `pnpm --filter @hexagram/casting-ui test -- <filename-substring>`
- Run package type-check with: `pnpm --filter @hexagram/casting-ui type:check`
- Never edit a fixture or snapshot to make a test pass. If a pre-existing test fails after a change, STOP — the change altered behavior it should not have.

---

### Task 1: Lock the closed-form arithmetic to the authoritative algorithm (Seam 1)

`computeManualRoundResult` (closed-form, display-only) and `performCast` (the algorithm of record) compute the same next-round stalk count by two independent code paths, kept in agreement only by a downstream byte-identity test. This task adds a **direct** equivalence test and clarifying comments so the relationship is local and explicit.

**Files:**
- Test: `packages/casting-ui/tests/manual-validation.test.tsx` (append a `describe` block)
- Modify: `packages/casting-ui/src/manual-validation.ts:5-18` (doc comment on `computeManualRoundResult`)
- Modify: `packages/casting-ui/src/manual-prompt.tsx:315-323` (comment at the call site)

- [ ] **Step 1: Write the failing equivalence test**

Append to `packages/casting-ui/tests/manual-validation.test.tsx`:

```tsx
import { initialLineState, maxPickFor, performCast } from '@hexagram/core'
import { computeManualRoundResult } from '../src/manual-validation'

// Seam 1 lock-in: the display-only closed form MUST agree with the
// authoritative `performCast` pipeline for every selectable pick. `next` is
// the next round's unparted count, which equals `maxPickFor(after) + 1`.
describe('computeManualRoundResult ≡ performCast (next-round count)', () => {
  it('agrees for every selectable pick at cast 0 (49 unparted)', () => {
    const s0 = initialLineState
    const unparted = maxPickFor(s0) + 1
    for (let pick = 1; pick <= maxPickFor(s0) - 1; pick++) {
      expect(computeManualRoundResult(pick, 0, unparted).next).toBe(
        maxPickFor(performCast(s0, pick)) + 1,
      )
    }
  })

  it('agrees for every selectable pick at cast 1 (post-round-1 unparted)', () => {
    const s1 = performCast(initialLineState, 25) // any valid first pick
    const unparted = maxPickFor(s1) + 1
    for (let pick = 1; pick <= maxPickFor(s1) - 1; pick++) {
      expect(computeManualRoundResult(pick, 1, unparted).next).toBe(
        maxPickFor(performCast(s1, pick)) + 1,
      )
    }
  })
})
```

- [ ] **Step 2: Run the test to confirm it passes immediately**

Run: `pnpm --filter @hexagram/casting-ui test -- manual-validation`
Expected: PASS. (This is a *lock-in* test — it should pass against current code; it fails only if the two paths ever diverge.) If it FAILS now, STOP: the two implementations already disagree and that is a real bug to report, not to patch around.

- [ ] **Step 3: Replace the `computeManualRoundResult` doc comment**

In `packages/casting-ui/src/manual-validation.ts`, replace the existing block comment immediately above `export function computeManualRoundResult` (currently lines 5–18) with:

```ts
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
```

- [ ] **Step 4: Add the bridge comment at the call site**

In `packages/casting-ui/src/manual-prompt.tsx`, the `key.return` first-Enter branch computes `result` from `computeManualRoundResult` (around line 315). Insert this comment immediately above the `const result = computeManualRoundResult(` line:

```tsx
      // `validation.pick` is the LEFT-heap total (`4·pilesL + remL`); the core
      // pipeline consumes that same number as `partStalksAtIndex` (the cut
      // point) — they coincide because the left-heap size IS the partition
      // index. `result.next` here is DISPLAY ONLY (the reveal row); the
      // authoritative advance happens when `onSubmit(pick)` reaches
      // `performCast` in `use-line-generator.ts`.
```

- [ ] **Step 5: Re-run the test and type-check**

Run: `pnpm --filter @hexagram/casting-ui test -- manual-validation`
Expected: PASS
Run: `pnpm --filter @hexagram/casting-ui type:check`
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add packages/casting-ui/tests/manual-validation.test.tsx packages/casting-ui/src/manual-validation.ts packages/casting-ui/src/manual-prompt.tsx
git commit -m "test(casting-ui): lock manual closed-form to performCast; document display-only role

The manual prompt's computeManualRoundResult and core's performCast compute the
same next-round count by two paths, previously kept in sync only by a byte-identity
test elsewhere. Add a direct equivalence test and comments naming performCast as
authoritative, so the seam is local and self-guarding."
```

---

### Task 2: Prove every valid manual input yields a core-legal pick (Seam 3)

The never-zero-remainder rule is enforced in three places. `selectablePickMax` claims to be "the single source of truth," yet the manual validator derives the same `[1, M-1]` range *structurally* and never routes through it; `performCast`'s `assertSelectablePick` is the runtime backstop. This task encodes the cross-layer agreement as a property test and softens the over-broad ownership comment.

**Files:**
- Test: `packages/casting-ui/tests/manual-validation.test.tsx` (append a `describe` block)
- Modify: `packages/core/src/casting-derivation.ts:12-31` (the `selectablePickMax` doc comment)

- [ ] **Step 1: Write the cross-layer property test**

Append to `packages/casting-ui/tests/manual-validation.test.tsx`:

```tsx
import { assertSelectablePick } from '@hexagram/core/casting-derivation'
import { validateManualInput } from '../src/manual-validation'

// Seam 3 lock-in: the manual validator owns its own range check (remainders
// constrained to 1..4 by construction). Prove that any input it accepts
// produces a pick the core algorithm also accepts — i.e. the structurally
// derived range never escapes `assertSelectablePick`'s runtime guard.
describe('manual "ok" picks satisfy the core never-zero guard', () => {
  it('every accepted input has a pick the core accepts', () => {
    const unparted = 49 // cast-0 stalk count
    for (let pilesL = 0; pilesL <= Math.floor(unparted / 4); pilesL++) {
      for (let remL = 1; remL <= 4; remL++) {
        for (let pilesR = 0; pilesR <= Math.floor(unparted / 4); pilesR++) {
          for (let remR = 1; remR <= 4; remR++) {
            const result = validateManualInput({
              pilesL,
              remL,
              pilesR,
              remR,
              unparted,
              castIndex: 0,
            })
            if (result.kind !== 'ok') continue
            // `unparted - 1` is the recorded SplitRecord.max for this round.
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

- [ ] **Step 2: Run the test to confirm it passes**

Run: `pnpm --filter @hexagram/casting-ui test -- manual-validation`
Expected: PASS. If it FAILS, STOP and report — it means a manual-accepted input can produce a core-illegal pick (a real cross-layer inconsistency).

- [ ] **Step 3: Reconcile the over-broad ownership comment**

In `packages/core/src/casting-derivation.ts`, the `selectablePickMax` doc comment currently asserts "Capping the pick here is the single source of truth for that rule." Replace the paragraph beginning "Every input flow clamps to this" (currently lines ~26–30) with:

```ts
 * Two layers enforce this rule, by design — there is no single owner: the
 * slider, typed-prompt, plain Inquirer, and RNG flows CLAMP to this ceiling;
 * the manual validator instead DERIVES the same `[1, recordedMax − 1]` range
 * structurally (its remainders are constrained to 1..4 by construction, so it
 * never calls `selectablePickMax`). `performCast` — the algorithm of record —
 * is the runtime backstop for both via `assertSelectablePick`. The manual
 * derivation's agreement with this guard is locked by `manual-validation.test`
 * ("manual 'ok' picks satisfy the core never-zero guard").
```

- [ ] **Step 4: Type-check core and run the test**

Run: `pnpm --filter @hexagram/core type:check`
Expected: no errors
Run: `pnpm --filter @hexagram/casting-ui test -- manual-validation`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/casting-ui/tests/manual-validation.test.tsx packages/core/src/casting-derivation.ts
git commit -m "test(core): prove manual picks satisfy assertSelectablePick; correct ownership comment

The never-zero-remainder rule has two intentional enforcement layers (clamp for
slider/typed/RNG, structural derivation for manual) plus the performCast runtime
backstop. The selectablePickMax comment over-claimed sole ownership. Add a property
test locking the manual derivation to the core guard and correct the comment."
```

---

### Task 3: Make the validator→render-surface routing a single, tested fact (Seam 4)

The knowledge "conservation → MISSING gauge; zero-remainder/suspended-sum → strip text; incomplete/ok → no surface" currently lives implicitly across the bottom-strip type, the `missingColor` logic, and the strip-branch logic. This task lifts it into one pure, tested function and routes the gauge decision through it (no behavior change).

**Files:**
- Modify: `packages/casting-ui/src/manual-validation.ts` (add `manualFeedbackSurface` after the `ManualValidationResult` type, ends at line 76)
- Test: `packages/casting-ui/tests/manual-validation.test.tsx` (append a `describe` block)
- Modify: `packages/casting-ui/src/manual-prompt.tsx:30-34` (import) and `:479-484` (gauge logic)

- [ ] **Step 1: Write the failing test**

Append to `packages/casting-ui/tests/manual-validation.test.tsx`:

```tsx
import { manualFeedbackSurface } from '../src/manual-validation'

// Seam 4: the single statement of where each validator outcome surfaces.
describe('manualFeedbackSurface', () => {
  it('routes conservation to the gauge', () => {
    expect(manualFeedbackSurface('conservation')).toBe('gauge')
  })
  it('routes rule violations to the strip', () => {
    expect(manualFeedbackSurface('zero-remainder')).toBe('strip')
    expect(manualFeedbackSurface('suspended-sum')).toBe('strip')
  })
  it('routes mid-edit and commit-ready to no surface', () => {
    expect(manualFeedbackSurface('incomplete')).toBe('none')
    expect(manualFeedbackSurface('ok')).toBe('none')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @hexagram/casting-ui test -- manual-validation`
Expected: FAIL — `manualFeedbackSurface` is not exported (import resolves to `undefined`, call throws `TypeError`).

- [ ] **Step 3: Add the pure helper**

In `packages/casting-ui/src/manual-validation.ts`, immediately after the `ManualValidationResult` type definition (the union ending at line 76), insert:

```ts
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @hexagram/casting-ui test -- manual-validation`
Expected: PASS

- [ ] **Step 5: Route the gauge decision through the helper (no behavior change)**

In `packages/casting-ui/src/manual-prompt.tsx`, add `manualFeedbackSurface` to the import from `./manual-validation.js` (lines 30–34):

```tsx
import {
  computeManualRoundResult,
  manualFeedbackSurface,
  parseManualBuffer,
  validateManualInput,
} from './manual-validation.js'
```

Then replace the `missingColor` block (currently lines 479–484):

```tsx
  let missingColor: MissingColor = 'neutral'
  if (committed !== null || validation.kind === 'ok') {
    missingColor = 'green'
  } else if (validation.kind === 'conservation') {
    missingColor = 'red'
  }
```

with:

```tsx
  // The MISSING gauge is the ONLY surface for conservation (Seam 4): red iff
  // the validator routes the current outcome to the gauge. Routing is sourced
  // from `manualFeedbackSurface` so the strip and gauge can never disagree.
  let missingColor: MissingColor = 'neutral'
  if (committed !== null || validation.kind === 'ok') {
    missingColor = 'green'
  } else if (manualFeedbackSurface(validation.kind) === 'gauge') {
    missingColor = 'red'
  }
```

- [ ] **Step 6: Confirm no behavior change — run the full casting-ui suite**

Run: `pnpm --filter @hexagram/casting-ui test`
Expected: PASS (all pre-existing manual-prompt / diagram tests still green — `gauge` maps to exactly `conservation`, so rendering is byte-identical).
Run: `pnpm --filter @hexagram/casting-ui type:check`
Expected: no errors

- [ ] **Step 7: Commit**

```bash
git add packages/casting-ui/src/manual-validation.ts packages/casting-ui/tests/manual-validation.test.tsx packages/casting-ui/src/manual-prompt.tsx
git commit -m "refactor(casting-ui): single-source manual feedback-surface routing

Conservation surfaces only via the MISSING gauge while zero-remainder/suspended-sum
surface as strip text — knowledge previously spread across the render and the strip
type. Lift it into one exhaustive, tested manualFeedbackSurface() and route the gauge
decision through it. No behavior change."
```

---

### Task 4: Guard `MANUAL_FIELD_ORDER` against the field union at compile time (Seam 7)

The `ManualFocusedField` union and the `MANUAL_FIELD_ORDER` array must enumerate the same members, but nothing enforces it — adding a field to the union without the array silently breaks Tab-cycling and the step counter with no type error. This task adds a compile-time assertion.

**Files:**
- Modify: `packages/casting-ui/src/manual-diagram.ts` (insert after `MANUAL_FIELD_ORDER`, line 23)

- [ ] **Step 1: Add the compile-time guard**

In `packages/casting-ui/src/manual-diagram.ts`, immediately after the `MANUAL_FIELD_ORDER` declaration (closing `] as const` at line 23), insert:

```ts
// Compile-time guard (Seam 7): every `ManualFocusedField` MUST appear in
// `MANUAL_FIELD_ORDER`. If a member is added to the union but not the array,
// `(typeof MANUAL_FIELD_ORDER)[number]` no longer covers the union, the
// conditional resolves to `never`, and the assignment below fails `tsc`. The
// reverse (no stray members) is guaranteed by the array's element type.
type _AllManualFieldsOrdered =
  ManualFocusedField extends (typeof MANUAL_FIELD_ORDER)[number] ? true : never
const _assertAllManualFieldsOrdered: _AllManualFieldsOrdered = true
void _assertAllManualFieldsOrdered
```

- [ ] **Step 2: Verify the package type-checks (guard is satisfied)**

Run: `pnpm --filter @hexagram/casting-ui type:check`
Expected: no errors

- [ ] **Step 3: Prove the guard actually fires — temporary break**

Temporarily edit the `ManualFocusedField` union (line 13) to add a bogus member:

```ts
export type ManualFocusedField = 'pilesL' | 'remL' | 'pilesR' | 'remR' | 'bogus'
```

Run: `pnpm --filter @hexagram/casting-ui type:check`
Expected: FAIL — `Type 'true' is not assignable to type 'never'` on `_assertAllManualFieldsOrdered`.

- [ ] **Step 4: Revert the temporary break**

Restore line 13 to its original four-member union:

```ts
export type ManualFocusedField = 'pilesL' | 'remL' | 'pilesR' | 'remR'
```

Run: `pnpm --filter @hexagram/casting-ui type:check`
Expected: no errors

- [ ] **Step 5: Confirm lint is clean (the `_`-prefixed unused binding + `void`)**

Run: `pnpm lint:check`
Expected: no new errors for `manual-diagram.ts`. If the unused-variable rule flags `_assertAllManualFieldsOrdered` despite the `void` usage and `_` prefix, add `// eslint-disable-next-line @typescript-eslint/no-unused-vars` directly above the `const` line and re-run.

- [ ] **Step 6: Commit**

```bash
git add packages/casting-ui/src/manual-diagram.ts
git commit -m "types(casting-ui): assert MANUAL_FIELD_ORDER covers the field union

The Tab order array and the ManualFocusedField union must stay in lockstep, but
a drift was previously invisible to tsc. Add a conditional-type guard that fails
type-check if the union gains a member the array omits."
```

---

### Task 5: Make the "manual flow carries no casting plan" invariant explicit (Seam 8)

`lineRewound` never null-checks `castingPlan`; it relies on the unstated invariant that a manual flow never has a plan (established only at the `querySubmit` call site). This task pins the invariant with a reducer test and documents the reliance.

**Files:**
- Test: `packages/casting-ui/tests/viewer-flow.test.ts` (append)
- Modify: `packages/casting-ui/src/viewer-flow.ts:72-78` (the `lineRewound` action doc comment)

- [ ] **Step 1: Write the invariant test**

Append to `packages/casting-ui/tests/viewer-flow.test.ts`:

```ts
// Seam 8: `lineRewound` (manual-only) never null-checks `castingPlan` — it
// relies on the invariant that a manual flow never carries a plan. Pin that
// invariant at the entry point so the rewind path's safety is guarded.
describe('manual flow carries no casting plan', () => {
  it('manual querySubmit enters casting with a null plan', () => {
    const s = initialFlowState('manual', null, null)
    const withQuery = flowReducer(s, {
      type: 'queryChange',
      value: 'a question',
    })
    const after = flowReducer(withQuery, { type: 'querySubmit' })
    expect(after.mode).toBe('casting')
    expect(after.castingPlan).toBeNull()
  })
})
```

- [ ] **Step 2: Run the test to confirm it passes**

Run: `pnpm --filter @hexagram/casting-ui test -- viewer-flow`
Expected: PASS. If it FAILS, STOP — a manual `querySubmit` is setting a plan, which would make the rewind path's missing null-check unsafe.

- [ ] **Step 3: Document the reliance on `lineRewound`**

In `packages/casting-ui/src/viewer-flow.ts`, the `lineRewound` action variant carries a block comment (currently lines 72–78). Append one sentence to the end of that comment, before the closing `*/`:

```ts
  // This branch reads `castingPlan` nowhere and relies on the invariant that a
  // manual flow never carries one (a plan is set only by the random flow's
  // `querySubmit`; see "manual flow carries no casting plan" in the tests).
```

- [ ] **Step 4: Type-check and re-run**

Run: `pnpm --filter @hexagram/casting-ui type:check`
Expected: no errors
Run: `pnpm --filter @hexagram/casting-ui test -- viewer-flow`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/casting-ui/tests/viewer-flow.test.ts packages/casting-ui/src/viewer-flow.ts
git commit -m "test(casting-ui): pin manual-flow no-plan invariant the rewind path relies on

lineRewound never null-checks castingPlan, trusting that manual flows never have
one. Encode that invariant as a reducer test and document the reliance so the
rewind path's safety is no longer an unstated assumption."
```

---

### Task 6: Capture the remaining invariants as comments (Seams 2, 5, 6)

Three seams are pure legibility gaps with nothing to test — the code is correct, the WHY is just missing. One focused docs commit closes them.

**Files:**
- Modify: `packages/casting-ui/src/manual-validation.ts` (Seam 2 — near the `rightHeapTotal` computation, ~line 98)
- Modify: `packages/casting-ui/src/viewer-flow.ts:38-39` (Seam 5 — the `error` field)
- Modify: `packages/casting-ui/src/manual-prompt.tsx:380-383` (Seam 6 — the reveal-dwell effect comment)

- [ ] **Step 1: Seam 2 — name the right heap's role as a cross-check**

In `packages/casting-ui/src/manual-validation.ts`, immediately above the line `const rightHeapTotal = 4 * pilesR + remR` (around line 98), insert:

```ts
  // The pick is the LEFT-heap total alone (below). The right heap is NOT a
  // generator input — it is a transcription CROSS-CHECK: requiring all four
  // hand-counted numbers lets conservation + suspended-sum catch a miscount.
  // The two heap cards look symmetric, but only the left drives the cast.
```

- [ ] **Step 2: Seam 5 — mark the `error` field as input-mode scaffolding**

In `packages/casting-ui/src/viewer-flow.ts`, the `FlowState` interface has `castingBuffer: string` and `error: string | null` (lines 38–39). Replace the `error` line with a commented version:

```ts
  castingBuffer: string
  // Slider/number input-mode error channel (set via the `castingError` action
  // from `<CastingPromptBox onError>`). UNUSED by the manual flow, which owns
  // its own validation feedback inside `<ManualCastingPrompt>` (strip + gauge)
  // and never dispatches `castingError`. Do not wire this into manual rendering.
  error: string | null
```

- [ ] **Step 3: Seam 6 — clarify dwell-timer ownership**

In `packages/casting-ui/src/manual-prompt.tsx`, the reveal-dwell `useEffect` carries a comment block (currently lines 380–383). Replace it with:

```tsx
  // Reveal-dwell timer. The `committed` STATE — not this timer — owns the
  // reveal lifecycle: the skip-to-advance Enter path fires `onSubmit` directly
  // and lets this effect's cleanup clear the pending timer on unmount. The
  // parent only PARAMETERISES the duration via `manualRevealMs` (0 fires
  // synchronously for tests); it cannot cancel the dwell except by unmounting
  // the component. Do not add a `cancelled` flag keyed off the timer.
```

- [ ] **Step 4: Verify nothing broke (comments only)**

Run: `pnpm --filter @hexagram/casting-ui type:check`
Expected: no errors
Run: `pnpm --filter @hexagram/casting-ui test`
Expected: PASS (comment-only edits change no behavior)

- [ ] **Step 5: Commit**

```bash
git add packages/casting-ui/src/manual-validation.ts packages/casting-ui/src/viewer-flow.ts packages/casting-ui/src/manual-prompt.tsx
git commit -m "docs(casting-ui): capture manual-flow invariants at three seams

Externalize three correct-but-unstated decisions: the right heap is a
transcription cross-check (not a generator input); FlowState.error is slider/number
scaffolding the manual flow deliberately bypasses; the dwell lifecycle is owned by
committed state, not the timer."
```

---

### Final verification (after all six tasks)

- [ ] **Run the full workspace test suite**

Run: `pnpm test`
Expected: PASS across all packages (note: the core `rng distribution (slow)` block takes ~40 s by design).

- [ ] **Run the full type-check and lint**

Run: `pnpm type:check && pnpm lint:check && pnpm format:check`
Expected: all clean. If `format:check` flags any edited file, run `pnpm format:fix` and amend the relevant commit.

- [ ] **Push the branch**

```bash
git push -u origin claude/stoic-darwin-CYrKY
```
(Retry on network error with exponential backoff: 2s, 4s, 8s, 16s. Do NOT open a PR unless explicitly asked.)

---

## Self-Review

**1. Spec coverage:** All eight seams map to a task (1→T1, 3→T2, 4→T3, 7→T4, 8→T5, 2/5/6→T6). The cross-cutting recommendation (convert convention-borne invariants into code/tests) is realized: T1/T2/T5 add lock-in tests, T3 adds a tested single-source helper, T4 adds a compile-time guard, T6 externalizes the WHY. ✔

**2. Placeholder scan:** No TBD/TODO/"handle edge cases"/"similar to". Every code step shows complete code; every command shows expected output. ✔

**3. Type consistency:** `manualFeedbackSurface(kind: ManualValidationResult['kind']): 'strip' | 'gauge' | 'none'` — same name and signature in T3 Steps 1, 3, 5. `computeManualRoundResult(pick, _castIndex, unparted)`, `performCast(state, pick)`, `maxPickFor(state)`, `initialLineState`, `assertSelectablePick(recordedMax, pick)`, `validateManualInput({...})`, `flowReducer`, `initialFlowState`, `MANUAL_FIELD_ORDER`, `ManualFocusedField` — all match the source as read. Test imports use `../src/<module>` (no extension); source imports use `.js` — consistent with the existing test/src split. ✔

**Behavioral safety:** Tasks 1, 2, 5 are tests + comments (no runtime change). Task 3 is behavior-preserving (`gauge` ≡ `conservation`). Tasks 4, 6 are type/comment only. The "all pre-existing tests stay green" gate in every task is the regression guard.
