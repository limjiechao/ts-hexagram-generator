# Casting-table Auto-Follow Scroll — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** While casting, auto-scroll the Casting tab table so the line currently being cast stays visible — pinned near the bottom of the table viewport — across all casting flows.

**Architecture:** A pure geometry helper in `@hexagram/readout` maps the active line index to its content-row. The viewer passes that row to `ConsultationReadout` as a declarative `autoScrollTarget` prop. The readout applies it with a *render-phase ref guard* (mirroring its existing `lastResetTokenRef`), writing the active tab's scroll offset once per distinct row so the new position lands on the first paint and manual scrolls within a line are preserved. A pure `computeAutoScrollOffset` function owns the bottom-align + clamp math and is unit-tested in isolation.

**Tech Stack:** TypeScript, React + [Ink](https://github.com/vadimdemedes/ink) (terminal UI), Vitest + ink-testing-library, pnpm + Turborepo monorepo.

**Spec:** `docs/superpowers/specs/2026-06-03-casting-table-auto-follow-scroll-design.md`

---

## Orchestration Overview (read this first)

This plan is built for **parallel execution**. The dependency DAG:

```
Phase 1 (run A, B, D concurrently — disjoint files, no shared state):
   Task A — readout geometry helper + constants + tests   (@hexagram/readout)
   Task B — readout apply: offset helper + render guard    (@hexagram/readout)
   Task D — docs: AGENTS.md paragraph                       (root)
                              │
                              ▼
Phase 2 (after A AND B land):
   Task C — viewer wiring + wiring test                     (@hexagram/casting-ui)
                              │
                              ▼
Phase 3 (after C lands):
   Task E — full verification (build, test, type, lint, format)
```

**Parallelism notes for the orchestrator:**
- Tasks A, B, D touch **disjoint files** and share no state — dispatch them in a single batch of concurrent subagents.
  - A touches: `packages/readout/src/output-sections.ts`, `packages/readout/src/index.ts`, `packages/readout/tests/casting-section.test.ts`.
  - B touches: `packages/readout/src/auto-scroll-offset.ts` (new), `packages/readout/tests/auto-scroll-offset.test.ts` (new), `packages/readout/src/consultation-readout.tsx`, `packages/readout/tests/consultation-readout.test.tsx`.
  - D touches: `AGENTS.md`.
  - A and B are both in `@hexagram/readout` but never edit the same file. If your runner commits concurrently and hits `git index.lock` contention, serialize only the `git commit` calls (the edits themselves never conflict). Per-agent worktree isolation is also fine but unnecessary.
- **Task C depends on both A (imports `castingTableActiveRow`) and B (uses the `autoScrollTarget` prop).** Do not start C until A and B are committed.
- **Per-agent token budget is ~100k.** Each task below is self-contained: it lists the exact files, the exact code, and the exact commands. **Agents must NOT explore the wider codebase** — read only the files named in your task, apply the steps, run the listed commands. All cross-file facts you need are already inlined here.

**Conventions every agent must follow:**
- TDD: write the failing test, run it to watch it fail, implement, run it to watch it pass, commit.
- Run package tests via: `pnpm --filter <pkg> test -- <file>` (Vitest resolves workspace deps through the `source` export condition — **no build step needed to run tests**).
- Commit messages end with the trailer:
  `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`
- Do not reformat unrelated lines. Match surrounding style.

---

## File Structure

| File | Responsibility | Task |
| --- | --- | --- |
| `packages/readout/src/output-sections.ts` | **Single source** of casting-table row geometry: layout constants + `castingTableActiveRow`, co-located with `castingSection`. | A |
| `packages/readout/src/index.ts` | Public API surface — export `castingTableActiveRow` for the viewer. | A |
| `packages/readout/tests/casting-section.test.ts` | Geometry unit test + consistency/contract test vs `castingSection` output. | A |
| `packages/readout/src/auto-scroll-offset.ts` *(new)* | Pure `computeAutoScrollOffset` — bottom-align + clamp math, no React. | B |
| `packages/readout/tests/auto-scroll-offset.test.ts` *(new)* | Unit tests for the offset math, incl. tiny-viewport guard. | B |
| `packages/readout/src/consultation-readout.tsx` | New `autoScrollTarget` prop + render-phase ref guard that applies the offset. | B |
| `packages/readout/tests/consultation-readout.test.tsx` | Readout-level render test (PRIMARY behavioral check). | B |
| `packages/casting-ui/src/viewer.tsx` | Compute `autoScrollTarget` from `state.lineIndex` during `casting`; pass the prop. | C |
| `packages/casting-ui/tests/viewer.test.tsx` | Minimal end-to-end wiring check. | C |
| `AGENTS.md` | Document the auto-follow behavior in the casting-flow scroll paragraph. | D |

---

## Task A: Readout geometry helper + constants + tests

**Package:** `@hexagram/readout`

**Files:**
- Modify: `packages/readout/src/output-sections.ts` (add geometry constants + helper, immediately before `export function castingSection`)
- Modify: `packages/readout/src/index.ts` (export `castingTableActiveRow`)
- Test: `packages/readout/tests/casting-section.test.ts` (append a new `describe` block)

**Background you need (do not go read these files to confirm — it's all here):**
The string returned by `castingSection(...)` is the Casting tab's content verbatim (the viewer does **not** strip it). Its rows, 0-based, top-first, are:
```
 0  "CASTING:" title line        ┐
 1  (blank)                       │
 2  左Left / 右Right banner        ├ 5 header rows
 3  爻Line 變Cast … column header  │
 4  ═╪═ header rule               ┘
 5..8   line 6 block: cast3 (carries ⇒6 + label 上6), cast2, cast1, ─┼─ blockRule
 9..12  line 5 block (label 五5)
13..16  line 4 block (label 四4)
17..20  line 3 block (label 三3)
21..24  line 2 block (label 二2)
25..27  line 1 block: cast3 (⇒1 + label 初1), cast2, cast1   (NO trailing rule — last block)
```
Each line is a 4-row block (cast3, cast2, cast1, blockRule) except line 1 (no trailing rule). The line label prints only on the block's **cast-3** (top) row. The **cast-1** row is the block bottom — the row we pin near the viewport bottom. So `castingTableActiveRow(lineIndex)` returns `5 + (5 - lineIndex)*4 + 2` → line 1 (idx 0) = 27, line 6 (idx 5) = 7.

- [ ] **Step 1: Write the failing tests**

Append this block to the **end** of `packages/readout/tests/casting-section.test.ts` (the file already defines `stripAnsi` and `FULL` near its top — reuse them; add the new imports to the existing `import { castingSection } from '../src/output-sections.js'` line):

Change the existing import line:
```ts
import { castingSection } from '../src/output-sections.js'
```
to:
```ts
import {
  CAST1_OFFSET_IN_BLOCK,
  castingSection,
  castingTableActiveRow,
} from '../src/output-sections.js'
```

Then append:
```ts
describe('castingTableActiveRow', () => {
  it('maps each line index to its cast-1 (block-bottom) content row', () => {
    // line 1 (idx 0) is the bottom block (row 27); line 6 (idx 5) the top (row 7).
    expect([0, 1, 2, 3, 4, 5].map(castingTableActiveRow)).toEqual([
      27, 23, 19, 15, 11, 7,
    ])
  })

  it('stays consistent with castingSection output (contract)', () => {
    // Locate each line's labelled cast-3 row in the real render, then assert the
    // helper's cast-1 row is exactly CAST1_OFFSET_IN_BLOCK below it. This fails
    // loudly if castingSection's header height, block height, or ordering ever
    // changes — the guard against the geometry constants drifting.
    const rows = stripAnsi(castingSection(FULL)).split('\n')
    const LINE_LABELS = ['初1', '二2', '三3', '四4', '五5', '上6'] // line 1..6
    for (let lineIndex = 0; lineIndex < 6; lineIndex++) {
      const labelRow = rows.findIndex((row) =>
        row.includes(LINE_LABELS[lineIndex]),
      )
      expect(labelRow).toBeGreaterThanOrEqual(0)
      expect(castingTableActiveRow(lineIndex)).toBe(
        labelRow + CAST1_OFFSET_IN_BLOCK,
      )
    }
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter @hexagram/readout test -- tests/casting-section.test.ts`
Expected: FAIL — `castingTableActiveRow` / `CAST1_OFFSET_IN_BLOCK` are not exported (import or reference error).

- [ ] **Step 3: Implement the geometry helper + constants**

In `packages/readout/src/output-sections.ts`, find the line `export function castingSection(` and insert this block **immediately before it**:
```ts
// ── Casting-table row geometry ────────────────────────────────────────────
// Single source for the Casting tab's content-row layout (the string
// castingSection returns, before the readout prepends its scroll breather).
// Top-first: a 5-row header, then six 4-row line blocks (line 6 on top, line 1
// at the bottom); the last block omits its trailing rule. The readout's
// auto-follow scroll pins a line's cast-1 (block-bottom) row near the viewport
// bottom using these constants; a consistency test asserts they still describe
// castingSection's output. Keep them in lockstep with the bannerRow / headerRow
// / headerRule / body assembly below.
export const CASTING_HEADER_ROWS = 5 // "CASTING:", blank, banner, header, rule
export const CASTING_ROWS_PER_BLOCK = 4 // cast3, cast2, cast1, blockRule
export const CAST1_OFFSET_IN_BLOCK = 2 // cast-1 row, measured from the block top

/**
 * Content-row index (0-based, pre-breather) of the cast-1 / block-bottom row
 * for the given hexagram line. `lineIndex` 0 => line 1 (bottom, row 27); 5 =>
 * line 6 (top, row 7). Consumed by the viewer to drive auto-follow scroll.
 */
export function castingTableActiveRow(lineIndex: number): number {
  const blockTop =
    CASTING_HEADER_ROWS + (5 - lineIndex) * CASTING_ROWS_PER_BLOCK
  return blockTop + CAST1_OFFSET_IN_BLOCK
}
```

- [ ] **Step 4: Export `castingTableActiveRow` from the package**

In `packages/readout/src/index.ts`, find the existing export block that ends with `} from './output-sections.js'`. Add `castingTableActiveRow,` to it, keeping alphabetical-ish order (place it right after `castingSection,`):
```ts
export {
  castingSection,
  castingTableActiveRow,
  emergingHexagramSection,
  hexagramTextSection,
  linesBlock,
  MOVING_ARROW,
  POSITION_LABELS,
  querySection,
  standingHexagramSection,
  STATIC_GAP,
  transformationSection,
} from './output-sections.js'
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm --filter @hexagram/readout test -- tests/casting-section.test.ts`
Expected: PASS (all `castingTableActiveRow` cases green, plus the pre-existing casting-section tests still green).

- [ ] **Step 6: Commit**

```bash
git add packages/readout/src/output-sections.ts packages/readout/src/index.ts packages/readout/tests/casting-section.test.ts
git commit -m "feat(readout): add castingTableActiveRow geometry helper

Single source for the Casting tab row layout (5 header rows, 4-row blocks,
line 1 at bottom). Exported for the viewer's auto-follow scroll, with a
consistency test that pins the constants to castingSection's actual output.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task B: Readout apply — offset helper + render-phase guard

**Package:** `@hexagram/readout`

**Files:**
- Create: `packages/readout/src/auto-scroll-offset.ts`
- Create: `packages/readout/tests/auto-scroll-offset.test.ts`
- Modify: `packages/readout/src/consultation-readout.tsx`
- Modify: `packages/readout/tests/consultation-readout.test.tsx`

**Background you need (all inlined — do not go exploring):**
- `consultation-readout.tsx` already imports `clamp` from `@hexagram/viewer-core`, and `useRef`/`useEffect`/`useReducer` from `'react'`-style ink imports.
- The readout pads the active tab's content rows with one leading + one trailing blank "breather": `rowsWithBreathers = ['', ...contentRows, '']`. So a content-row index `R` maps to windowed-row `R + 1`. `totalRows = rowsWithBreathers.length`. For the 28-row casting table, `totalRows = 30`.
- The scroll offset for the active tab lives in `offsetsRef.current[activeIndex]` (a `number[]` ref). `maxOffset = Math.max(0, totalRows - viewportHeight)`. The component computes `const offset = clamp(offsetsRef.current[activeIndex] ?? 0, 0, maxOffset)` — **reading the ref during render**. Writing the ref *before* that line, during render, lands on the same paint.
- There is an existing render-phase ref-guard precedent in this file: `lastResetTokenRef` resets `castingHorizontalOffsetRef` when `castingPromptPan.resetToken` changes. You are adding an analogous guard for vertical auto-scroll.

### B.1 — Pure offset helper (TDD)

- [ ] **Step 1: Write the failing test**

Create `packages/readout/tests/auto-scroll-offset.test.ts`:
```ts
import { describe, expect, it } from 'vitest'

import { computeAutoScrollOffset } from '../src/auto-scroll-offset.js'

// The casting table is 28 content rows -> 30 with breathers (totalRows = 30).
describe('computeAutoScrollOffset', () => {
  it('pins line 1 (row 27) to the bottom on a short viewport', () => {
    // viewportHeight 5 -> maxOffset 30 - 5 = 25. windowedRow 28, margin keeps
    // one row below -> offset clamps to the bottom (maxOffset).
    expect(
      computeAutoScrollOffset({ row: 27, viewportHeight: 5, maxOffset: 25 }),
    ).toBe(25)
  })

  it('clamps line 6 (row 7) to the top on a tall viewport', () => {
    // viewportHeight 20 -> maxOffset 30 - 20 = 10. windowedRow 8 sits high; the
    // bottom-align target goes negative and clamps to 0 (top of table).
    expect(
      computeAutoScrollOffset({ row: 7, viewportHeight: 20, maxOffset: 10 }),
    ).toBe(0)
  })

  it('keeps the active row visible at viewportHeight 1 (no overshoot)', () => {
    // The margin must collapse: without the clamp, target = windowedRow + 1
    // would scroll PAST the active row. Here it must land on the row itself.
    expect(
      computeAutoScrollOffset({ row: 27, viewportHeight: 1, maxOffset: 29 }),
    ).toBe(28)
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --filter @hexagram/readout test -- tests/auto-scroll-offset.test.ts`
Expected: FAIL — cannot resolve `../src/auto-scroll-offset.js`.

- [ ] **Step 3: Implement the helper**

Create `packages/readout/src/auto-scroll-offset.ts`:
```ts
import { clamp } from '@hexagram/viewer-core'

/**
 * One-row gap kept below the pinned active row where the viewport has space.
 * Collapses on very short viewports (see the `fromBottom` clamp).
 */
export const AUTO_SCROLL_BOTTOM_MARGIN = 1

/**
 * Bottom-aligned auto-scroll offset for the casting table.
 *
 * `row` is in content-row space (the casting section's own rows, before the
 * readout prepends its leading breather). Returns the vertical scroll offset
 * that seats that row near the bottom of the viewport, leaving a one-row margin
 * where space allows. The margin collapses on tiny viewports so the active row
 * never overshoots off the bottom; the result is clamped to [0, maxOffset].
 */
export function computeAutoScrollOffset(params: {
  row: number
  viewportHeight: number
  maxOffset: number
}): number {
  const { row, viewportHeight, maxOffset } = params
  const windowedRow = row + 1 // one leading breather row in rowsWithBreathers
  const fromBottom = clamp(
    viewportHeight - 1 - AUTO_SCROLL_BOTTOM_MARGIN,
    0,
    viewportHeight - 1,
  )
  return clamp(windowedRow - fromBottom, 0, maxOffset)
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `pnpm --filter @hexagram/readout test -- tests/auto-scroll-offset.test.ts`
Expected: PASS (all 3 cases green).

- [ ] **Step 5: Commit**

```bash
git add packages/readout/src/auto-scroll-offset.ts packages/readout/tests/auto-scroll-offset.test.ts
git commit -m "feat(readout): add computeAutoScrollOffset bottom-align helper

Pure offset math for casting-table auto-follow: bottom-pins a content row
within the breather-padded window, with a margin that collapses on tiny
viewports so the active row never overshoots.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

### B.2 — Prop + render-phase guard (TDD via readout-level render test)

- [ ] **Step 6: Write the failing render test**

In `packages/readout/tests/consultation-readout.test.tsx`, append this `describe` block at the end of the file. It uses the file's existing `renderReadout(props)` helper, `windowSize` mock, `movingSections`, and `beforeEach` (which resets `windowSize` to 100×24). The active tab while `locked` is the Casting table.
```ts
describe('auto-follow scroll (autoScrollTarget)', () => {
  it('pins line 1 near the bottom on a short viewport', () => {
    // rows 16 -> table viewport ~8; the 28-row casting table overflows. Without
    // auto-follow the offset sits at 0 (top = line 6) and line 1 is off-screen.
    windowSize.current = { columns: 100, rows: 16 }
    const { lastFrame, unmount } = renderReadout({
      locked: true,
      autoScrollTarget: { row: 27, align: 'bottom' }, // line 1 cast-1
    })
    const frame = lastFrame() ?? ''
    expect(frame).toContain('初1') // line 1's labelled row pulled into view
    expect(frame).not.toContain('上6') // line 6 scrolled off the top
    unmount()
  })

  it('clamps line 6 to the top on the same short viewport', () => {
    windowSize.current = { columns: 100, rows: 16 }
    const { lastFrame, unmount } = renderReadout({
      locked: true,
      autoScrollTarget: { row: 7, align: 'bottom' }, // line 6 cast-1
    })
    const frame = lastFrame() ?? ''
    expect(frame).toContain('上6') // line 6 visible (clamped to top)
    expect(frame).not.toContain('初1') // line 1 below the fold
    unmount()
  })
})
```

- [ ] **Step 7: Run it to verify it fails**

Run: `pnpm --filter @hexagram/readout test -- tests/consultation-readout.test.tsx`
Expected: FAIL — `autoScrollTarget` is not a known prop, so no scrolling happens; `初1` is absent (offset stays at 0). A TypeScript error on the unknown prop is also acceptable as the failure.

- [ ] **Step 8: Add the prop to the interface**

In `packages/readout/src/consultation-readout.tsx`, inside `export interface ConsultationReadoutProps { ... }`, add this member (place it right after the `castingPromptPan` member for locality):
```ts
  /**
   * Auto-follow scroll target for the active (Casting) tab during a casting
   * flow. `row` is in content-row space (the casting section's own rows, before
   * the readout's leading breather). The readout seats it near the viewport
   * bottom once per distinct row (i.e. once per line), via a render-phase guard,
   * so a manual scroll within a line is not clobbered. `null` / omitted disables
   * auto-follow (every non-casting mode).
   */
  readonly autoScrollTarget?: {
    readonly row: number
    readonly align: 'bottom'
  } | null
```

- [ ] **Step 9: Import the helper and destructure the prop**

In the same file, add the import (next to the other local `./` imports, e.g. just after the `slice-ansi` / `string-width` imports):
```ts
import { computeAutoScrollOffset } from './auto-scroll-offset.js'
```
Then, in the `ConsultationReadout({ ... })` destructured parameter list, add `autoScrollTarget,` (place it right after `castingPromptPan,`).

- [ ] **Step 10: Add the render-phase guard**

In the same file: first declare the guard ref next to the existing offset ref. Find `const offsetsRef = useRef<number[]>([])` and add immediately below it:
```ts
  // Last row auto-follow scrolled to; guards the render-phase write below so it
  // fires once per distinct row (i.e. once per casting line), not every render.
  const lastAutoScrollRowRef = useRef<number>(-1)
```
Then find the two consecutive lines:
```ts
  const maxOffset = Math.max(0, totalRows - viewportHeight)
  const offset = clamp(offsetsRef.current[activeIndex] ?? 0, 0, maxOffset)
```
and insert the guard **between** them, so it reads:
```ts
  const maxOffset = Math.max(0, totalRows - viewportHeight)
  // ── Auto-follow scroll (render-phase, once per distinct row) ──────────────
  // Mirrors the lastResetTokenRef pattern: when the casting flow advances to a
  // new line, seat that line's active row near the viewport bottom by writing
  // the active tab's offset here, during render, so the new position lands on
  // the first paint (no post-commit effect, no extra render). Guarded by row
  // value so casts within a line — and manual scrolls — are not overridden;
  // reset when auto-follow is off so re-entry re-pins from scratch.
  if (autoScrollTarget != null) {
    if (autoScrollTarget.row !== lastAutoScrollRowRef.current) {
      offsetsRef.current[activeIndex] = computeAutoScrollOffset({
        row: autoScrollTarget.row,
        viewportHeight,
        maxOffset,
      })
      lastAutoScrollRowRef.current = autoScrollTarget.row
    }
  } else {
    lastAutoScrollRowRef.current = -1
  }
  const offset = clamp(offsetsRef.current[activeIndex] ?? 0, 0, maxOffset)
```

- [ ] **Step 11: Run the render test to verify it passes**

Run: `pnpm --filter @hexagram/readout test -- tests/consultation-readout.test.tsx`
Expected: PASS (both new cases green; all pre-existing readout tests still green).

- [ ] **Step 12: Run the whole readout package to confirm nothing regressed**

Run: `pnpm --filter @hexagram/readout test`
Expected: PASS (entire `@hexagram/readout` suite green).

- [ ] **Step 13: Commit**

```bash
git add packages/readout/src/consultation-readout.tsx packages/readout/tests/consultation-readout.test.tsx
git commit -m "feat(readout): auto-follow scroll via autoScrollTarget prop

Render-phase ref guard (mirrors lastResetTokenRef) seats the active casting
row near the viewport bottom once per line — first-paint correct, no effect,
no forceRender, manual scroll within a line preserved.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task C: Viewer wiring + wiring test

**Package:** `@hexagram/casting-ui`
**Depends on:** Task A (`castingTableActiveRow` export) and Task B (`autoScrollTarget` prop) — both must be committed first.

**Files:**
- Modify: `packages/casting-ui/src/viewer.tsx`
- Test: `packages/casting-ui/tests/viewer.test.tsx`

**Background (inlined):**
- `viewer.tsx` already imports from `@hexagram/readout` in a block ending `} from '@hexagram/readout'` (it imports `buildConsultationSections`, `buildPartialCastingSections`, `ConsultationReadout`, and types).
- The flow state machine exposes `state.mode` (`'awaitingQuery' | 'casting' | 'computing' | 'done'`) and `state.lineIndex` (`0..5`, where 0 = line 1). Both are already in the component's render scope (e.g. `const lineNumber = (state.lineIndex + 1) as ...` already exists near the bottom of the component).
- The component returns `<ConsultationReadout ... />` near the end of the file.
- To drive the viewer into `casting` in a test: render `<ConsultationViewer flowKind="interactive" inputMode="number" />`, type a non-empty query, then press Enter. After that the frame shows `Line 1/6 · Cast 1/3` (proven by the existing test "reveals the casting prompt box once the query is submitted"). The test file already imports `ENTER` and `yieldMacrotask`, mocks `windowSize`, and resets it to 100×24 in `beforeEach`.

- [ ] **Step 1: Write the failing wiring test**

In `packages/casting-ui/tests/viewer.test.tsx`, add this test inside the existing `describe('ConsultationViewer', () => { ... })` block (place it after the "reveals the casting prompt box once the query is submitted" test):
```ts
  it('auto-scrolls the Casting table to keep the active line visible while casting', async () => {
    // rows 18 with the number prompt box leaves a ~5-row table viewport; the
    // 28-row casting table overflows. Without auto-follow the table sits at the
    // top (line 6) and the line-1 row being cast is off-screen. With it, line 1
    // is pinned into view.
    windowSize.current = { columns: 100, rows: 18 }
    const { lastFrame, stdin, unmount } = render(
      <ConsultationViewer flowKind="interactive" inputMode="number" />,
    )
    stdin.write('Hi') // non-empty query
    await yieldMacrotask()
    stdin.write(ENTER) // submit -> casting, line 1 / cast 1
    await yieldMacrotask()
    const frame = lastFrame() ?? ''
    expect(frame).toContain('Line 1/6 · Cast 1/3') // sanity: in casting mode
    expect(frame).toContain('初1') // line 1 row pinned into view
    expect(frame).not.toContain('上6') // line 6 scrolled off the top
    unmount()
  })
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --filter @hexagram/casting-ui test -- tests/viewer.test.tsx -t "auto-scrolls the Casting table"`
Expected: FAIL — the viewer doesn't pass `autoScrollTarget` yet, so the table stays at offset 0 and `初1` is absent.

- [ ] **Step 3: Import the geometry helper**

In `packages/casting-ui/src/viewer.tsx`, add `castingTableActiveRow,` to the `from '@hexagram/readout'` import block:
```ts
import {
  buildConsultationSections,
  buildPartialCastingSections,
  castingTableActiveRow,
  ConsultationReadout,
  type CastingPromptPan,
  type ConsultationSections,
} from '@hexagram/readout'
```

- [ ] **Step 4: Compute `autoScrollTarget`**

In the same file, find the line `const lineNumber = (state.lineIndex + 1) as 1 | 2 | 3 | 4 | 5 | 6` (near the bottom of the component, above the `return`). Add immediately after it:
```ts
  // Auto-follow scroll: while casting, pin the active line's row near the bottom
  // of the Casting table so the row being cast stays visible even when the
  // prompt box (especially the tall manual one) shrinks the table viewport.
  const autoScrollTarget =
    state.mode === 'casting'
      ? { row: castingTableActiveRow(state.lineIndex), align: 'bottom' as const }
      : null
```

- [ ] **Step 5: Pass the prop to `ConsultationReadout`**

In the `<ConsultationReadout ... />` JSX, add the prop on its own line right after `inputMode={inputMode}`:
```tsx
      inputMode={inputMode}
      autoScrollTarget={autoScrollTarget}
```

- [ ] **Step 6: Run the wiring test to verify it passes**

Run: `pnpm --filter @hexagram/casting-ui test -- tests/viewer.test.tsx -t "auto-scrolls the Casting table"`
Expected: PASS.

- [ ] **Step 7: Run the whole casting-ui suite to confirm no regressions**

Run: `pnpm --filter @hexagram/casting-ui test`
Expected: PASS (entire `@hexagram/casting-ui` suite green).

- [ ] **Step 8: Commit**

```bash
git add packages/casting-ui/src/viewer.tsx packages/casting-ui/tests/viewer.test.tsx
git commit -m "feat(casting-ui): auto-follow the active casting line in the table

Pass autoScrollTarget=castingTableActiveRow(lineIndex) to the readout during
casting so the row being cast stays visible across all flows (the tall manual
prompt box made this acute).

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task D: Docs — AGENTS.md

**Files:**
- Modify: `AGENTS.md`

This is pure documentation and shares no files with A/B/C — safe to run in Phase 1.

- [ ] **Step 1: Update the casting-flow scroll paragraph**

In `AGENTS.md`, find the sentence describing the during-casting vertical scroll (it contains the substring `↑/↓/PgUp/PgDn/g/G scroll the Casting tab table vertically`). Append the following to the end of that sentence (before its closing period / next sentence), so the behavior is documented:
```
; additionally, during casting the table **auto-follows** the active line —
the viewer passes `autoScrollTarget` (the cast-1 content row from
`castingTableActiveRow(lineIndex)`, exported by `@hexagram/readout`) to the
readout, which pins that row near the bottom of the table viewport via a
render-phase guard. It re-pins once per line and yields to manual scrolling
within a line. The bottom-align math lives in
`packages/readout/src/auto-scroll-offset.ts` (`computeAutoScrollOffset`)
```

(Integrate it grammatically — if the existing sentence already ends with surrounding clauses about `CAN_SCROLL`, splice this in as a trailing clause/sentence rather than breaking the existing wording. Keep the existing text intact; only add.)

- [ ] **Step 2: Sanity-check the edit**

Run: `git diff AGENTS.md`
Expected: only an addition to the casting-flow scroll paragraph; no other lines changed.

- [ ] **Step 3: Commit**

```bash
git add AGENTS.md
git commit -m "docs(agents): document casting-table auto-follow scroll

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task E: Full verification (Phase 3)

**Run after A, B, C, D are all committed.** No code changes — this is the gate.

> Note: `pnpm check:all` is known to flake by racing build vs test (dist wiped mid-spawn). Run the steps below **sequentially** instead.

- [ ] **Step 1: Type-check the whole workspace**

Run: `pnpm type:check`
Expected: PASS — no type errors. (Catches the `autoScrollTarget` prop shape matching between readout and viewer.)

- [ ] **Step 2: Run the two touched packages' suites**

Run: `pnpm --filter @hexagram/readout test`
Then: `pnpm --filter @hexagram/casting-ui test`
Expected: PASS for both.

- [ ] **Step 3: Lint**

Run: `pnpm lint:check`
Expected: PASS. If it reports fixable issues, run `pnpm lint:fix` and re-run `pnpm lint:check`, then `git add -A && git commit -m "style: satisfy lint" --trailer "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"`.

- [ ] **Step 4: Format**

Run: `pnpm format:check`
Expected: PASS. If it fails, run `pnpm format:fix`, then `git add -A && git commit -m "style: satisfy formatter" --trailer "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"`.

- [ ] **Step 5: Confirm the build is green (topological)**

Run: `pnpm build`
Expected: PASS — all packages build in order (`@hexagram/readout` → `@hexagram/casting-ui` → …). This proves the new exports and types are consistent across the dist boundary.

- [ ] **Step 6: Manual smoke (optional, recommended)**

Run: `pnpm hexagram-manual` in a terminal **shorter than ~34 rows** (so the 22-row manual prompt box squeezes the table). Submit a query, cast line 1, and confirm the line-1 row stays visible at the bottom of the table; advance and confirm the table follows the active line upward. Press Ctrl+C to exit.

---

## Self-Review (already performed by plan author)

- **Spec coverage:** geometry helper + constants (§1 → Task A); viewer wiring (§2 → Task C); render-phase guard + prop, `align:'bottom'`-only, margin clamp (§3 → Task B); once-per-line override (§4 → guard keyed on row, Task B); mode transitions / reset (§5 → guard `else` branch, Task B); all-flows scope (Task C wires it for every `casting` mode, including number-random playback); tests — geometry, consistency, offset, readout render, viewer wiring (§Testing → Tasks A/B/C); docs (§Docs → Task D). No gaps.
- **Type consistency:** `autoScrollTarget: { row: number; align: 'bottom' } | null` is identical in the prop interface (Task B Step 8) and the viewer's computed value (Task C Step 4, `align: 'bottom' as const`). `computeAutoScrollOffset({ row, viewportHeight, maxOffset })` signature matches its sole call site. `castingTableActiveRow(lineIndex: number): number` matches its export (Task A) and import/use (Task C). `CAST1_OFFSET_IN_BLOCK` is exported (Task A Step 3) and imported by the consistency test (Task A Step 1).
- **No placeholders:** every code/step is concrete; commands carry expected output.
- **Deviation from spec, noted:** the spec's §Testing item 5 said "manual flow only" for the wiring check; this plan uses the interactive/number flow because the viewer's `autoScrollTarget` computation is flow-agnostic (same code path) and the interactive flow reaches `casting` with a single query submit — fewer moving parts, less flake — while proving the identical wiring. The deterministic readout-level render test (Task B) carries the behavioral load, as the spec intends.
