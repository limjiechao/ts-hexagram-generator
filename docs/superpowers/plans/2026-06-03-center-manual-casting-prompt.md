# Center the Manual Casting Prompt Box Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Horizontally center the manual casting prompt's body block (diagram + right pane) and title within the bordered box, while leaving narrow-terminal behaviour and the interactive/slider prompt untouched.

**Architecture:** A leading-pad post-pass confined to `packages/casting-ui/src/manual-prompt.tsx`. The geometry builders in `manual-diagram.ts` stay width-pure (they remain the natural-width source of truth). After the rows are built at natural width, we prepend a computed leading pad to the title (centered on the full box) and to each body row (centered as one rigid 95-col unit), and we shift the bottom strip's left element to the body's left edge by building the strip at a reduced width and prepending the same pad — keeping `Shift+Tab: go back` pinned to the box's right edge. Everything still flows through the existing `pad-to-renderWidth → sliceAnsi` step, so `<`/`>` horizontal panning is unchanged.

**Tech Stack:** TypeScript, React + Ink, `string-width`, `slice-ansi`, Vitest + `ink-testing-library`, pnpm + Turborepo.

---

## Prerequisite: branch base

Implement on top of `origin/main` at **`a64189c`** ("build(turbo): make test task depend on ^build") or later. That commit makes the `test` turbo task depend on `^build`, so `pnpm --filter @hexagram/casting-ui test` now builds upstream deps automatically. Two adjacent commits (`d21c94d`, `3036c8a`) renamed the readout casting-table line-6/top-line glyph `六 → 上` and regenerated the `consultation-file` / `casting-ui` fixtures; **none of the three touch the manual prompt** (`manual-prompt.tsx`, `manual-diagram.ts`, `manual-prompt.test.tsx`) or its docs — the manual prompt uses ASCII labels + arabic numerals only (no CJK glyphs), so the regenerated fixtures and the rename are inert to this plan. If your worktree predates `a64189c`, `git merge --ff-only origin/main` first.

---

## Background & invariants (read before starting)

The component under change is `ManualCastingPrompt` in `packages/casting-ui/src/manual-prompt.tsx`. Its render path (current, lines ~410–581):

1. `innerContentWidth = Math.max(1, width - 2)` (box width minus the two borders).
2. `naturalBodyWidth = MANUAL_NATURAL_BODY_WIDTH` (= 95: diagram 42 + gap 8 + right pane 45).
3. `renderWidth = Math.max(innerContentWidth, naturalBodyWidth)`.
4. Builds `titleRow`, `bodyRows` (flow header 2 rows + card band 10 rows + flow footer 4 rows, each composed via `composeBodyRow`), and `stripRow` (via `bottomStripRow`).
5. `allRows = [titleRow, '', ...bodyRows, '', stripRow]`, pads each to `renderWidth`, then `sliceAnsi(padded, horizontalOffset, horizontalOffset + innerContentWidth)`.
6. Renders `slicedRows[0]` as `<Text dimColor>` (title) and the rest as plain `<Text>`.

**Centering rules agreed in design:**

- **Body block** moves as one rigid unit:
  `leadingPadBody = max(0, floor((innerContentWidth − 95) / 2))`.
  Clamps to 0 when `innerContentWidth < 95` (narrow terminal) → identical to today.
- **Title** centers independently within the full box:
  `leadingPadTitle = max(0, floor((innerContentWidth − stringWidth(titleRow)) / 2))`.
  Clamps to 0 when the title is wider than the box.
- **Bottom strip**: left element (`Press Enter to commit` / red error / green resolved row) starts at the body's left edge (`leadingPadBody`); `Shift+Tab: go back` stays right-pinned to the box's right edge (`renderWidth`). Achieved by building the strip at `renderWidth − leadingPadBody` and prepending `leadingPadBody` spaces.
- **Scope:** manual prompt only; horizontal only. `manual-diagram.ts` is **not modified**. The interactive/slider/number prompt is **not modified**.

**Why `manual-diagram.ts` needs no change for the strip:** `bottomStripRow` (manual-diagram.ts:543–558) uses its `renderWidth` arg solely as the final total width (right-pin gap in `leftRightRow`, or green trailing pad). Passing `renderWidth − leadingPadBody` and prepending `leadingPadBody` spaces yields a total width of `renderWidth` with the left element at `leadingPadBody` and the right hint ending at `renderWidth`.

**Verified math (for the new tests):**

- At `width = 140` → `innerContentWidth = 138`, `renderWidth = 138`, `leadingPadBody = floor((138−95)/2) = 21`, `leadingPadTitle = floor((138−30)/2) = 54` (the title `Line 3/6 · Cast 2/3 · Step 1/4` is 30 display columns).
- At `width = 80` → `innerContentWidth = 78 < 95` → `leadingPadBody = 0` (body NOT centered); title still centers: `leadingPadTitle = floor((78−30)/2) = 24`.
- The existing slicing test renders at `width = 40` → `innerContentWidth = 38` → `leadingPadBody = 0`, `leadingPadTitle = floor((38−30)/2) = 4`. The title shifts only 4 columns, so `Line 3/6` (cols 4–11) still scrolls out of view at `horizontalOffset = 20`. **That test passes unchanged — do not edit it.**

**No fixtures or snapshots** capture the manual prompt (it is Ink-only, no `--plain` mode), and the Phase 7 byte-identity test in `viewer.test.tsx` compares only `saveConsultationFile` args. So the only test work is the **new** centering tests below.

---

## File Structure

- **Modify:** `packages/casting-ui/src/manual-prompt.tsx` — add `leadingPadBody` / `leadingPadTitle`, prepend pads to title + body rows, build the strip at the reduced width and prepend the pad.
- **Modify (tests):** `packages/casting-ui/tests/manual-prompt.test.tsx` — add three new `it(...)` cases inside the existing `describe('CastingPromptBox (manual flow)', ...)` block, plus one small local helper for reading a line's leading-space count.
- **Unchanged:** `packages/casting-ui/src/manual-diagram.ts` (width-pure geometry source of truth); the interactive/slider prompt; all other tests/fixtures.

---

## Task 1: Add horizontal centering to the manual prompt (TDD)

**Files:**
- Modify: `packages/casting-ui/src/manual-prompt.tsx` (render body, ~lines 412–566)
- Test: `packages/casting-ui/tests/manual-prompt.test.tsx` (new cases in the manual-flow describe block)

- [ ] **Step 1: Add a leading-space helper near the top of the manual-flow describe block**

Insert this helper immediately after the `typeFourFields` function definition (after line 104, before the first `it(...)` at line 106) in `packages/casting-ui/tests/manual-prompt.test.tsx`:

```tsx
  // Strip ANSI, split into lines, and return the count of leading spaces on
  // the first line containing `needle` (−1 if no such line). Used to assert
  // horizontal centering offsets without depending on exact trailing padding.
  function leadingSpacesOf(frame: string, needle: string): number {
    // oxlint-disable-next-line no-control-regex
    const stripped = frame.replaceAll(/\u001B\[[0-9;]*m/g, '')
    for (const rawLine of stripped.split('\n')) {
      // Drop the box's left border glyph (chrome) so the count reflects the
      // content's own leading pad, not the border.
      const line = rawLine.replace(/^[│╭╰╮╯]/, '')
      if (line.includes(needle)) {
        return line.length - line.trimStart().length
      }
    }
    return -1
  }
```

Note: the manual prompt content is rendered *inside* an Ink `<Box borderStyle="round">`, so each content line in `lastFrame()` is `│` + content + `│`. The helper removes the single left border glyph, then counts the content's own leading spaces.

- [ ] **Step 2: Write the failing test — body + title centered on a wide terminal**

Add this `it(...)` inside the manual-flow describe block (e.g. directly after the existing slicing test that ends at line 611):

```tsx
  it('centers the body block and title within a wide box', async () => {
    const onReady = vi.fn()
    const { lastFrame, unmount } = render(
      <CastingPromptBox
        {...baseProps}
        width={140}
        onSubmit={() => {}}
        onReady={onReady}
      />,
    )
    await waitForReady(onReady)
    const frame = lastFrame() ?? ''
    // width 140 → innerContentWidth 138; body natural width 95 →
    // leadingPadBody = floor((138-95)/2) = 21; title is 30 cols →
    // leadingPadTitle = floor((138-30)/2) = 54.
    expect(leadingSpacesOf(frame, 'UNPARTED STALKS:')).toBe(21)
    expect(leadingSpacesOf(frame, 'LEFT HEAP')).toBe(21)
    expect(leadingSpacesOf(frame, 'COUNTED STALKS:')).toBe(21)
    expect(leadingSpacesOf(frame, 'Line 3/6 · Cast 2/3 · Step 1/4')).toBe(54)
    unmount()
  })
```

- [ ] **Step 3: Write the failing test — narrow terminal does not center the body**

Add this `it(...)` after the previous one:

```tsx
  it('does not center the body below its natural width; title still centers', async () => {
    const onReady = vi.fn()
    const { lastFrame, unmount } = render(
      <CastingPromptBox
        {...baseProps}
        width={80}
        onSubmit={() => {}}
        onReady={onReady}
      />,
    )
    await waitForReady(onReady)
    const frame = lastFrame() ?? ''
    // width 80 → innerContentWidth 78 < 95 → leadingPadBody = 0 (body left-
    // aligned exactly as before). Title is 30 cols → leadingPadTitle =
    // floor((78-30)/2) = 24, so the title still centers independently.
    expect(leadingSpacesOf(frame, 'UNPARTED STALKS:')).toBe(0)
    expect(leadingSpacesOf(frame, 'Line 3/6 · Cast 2/3 · Step 1/4')).toBe(24)
    unmount()
  })
```

- [ ] **Step 4: Write the failing test — strip left element at body-left-edge, Shift+Tab pinned right**

Add this `it(...)` after the previous one. It types the known-valid input so the strip reaches its commit-ready editing branch (`Press Enter to commit`) without committing:

```tsx
  it('aligns the strip hint to the body-left-edge with Shift+Tab pinned right', async () => {
    const onReady = vi.fn()
    const onFocusedFieldChange = vi.fn()
    const { stdin, lastFrame, unmount } = render(
      <CastingPromptBox
        {...baseProps}
        width={140}
        onSubmit={() => {}}
        onReady={onReady}
        onFocusedFieldChange={onFocusedFieldChange}
      />,
    )
    await waitForReady(onReady)
    // Type a conservation- and suspended-sum-valid 4-field input (no Enter):
    // validation becomes `ok`, so the editing strip shows "Press Enter to
    // commit" on the left.
    await typeFourFields(stdin, onFocusedFieldChange, {
      pilesL: validBasePropsInput.pilesL,
      remL: validBasePropsInput.remL,
      pilesR: validBasePropsInput.pilesR,
      remR: validBasePropsInput.remR,
    })
    const frame = lastFrame() ?? ''
    // Left element starts at the body's left edge (leadingPadBody = 21).
    expect(leadingSpacesOf(frame, 'Press Enter to commit')).toBe(21)
    // The global nav hint is still present (right-pinned to the box edge).
    // oxlint-disable-next-line no-control-regex
    const stripped = frame.replaceAll(/\u001B\[[0-9;]*m/g, '')
    const stripLine =
      stripped
        .split('\n')
        .find((l) => l.includes('Press Enter to commit')) ?? ''
    expect(stripLine).toContain('Shift+Tab: go back')
    // Right-pinned: the hint sits at the end of the content, immediately
    // before the box's right border.
    expect(stripLine).toMatch(/Shift\+Tab: go back[│ ]*$/)
    unmount()
  })
```

- [ ] **Step 5: Run the new tests to verify they FAIL**

Run: `pnpm --filter @hexagram/casting-ui test -- tests/manual-prompt.test.tsx -t "centers the body block|does not center the body|aligns the strip hint"`

Expected: the three new tests FAIL. The wide-centering and strip tests fail because `leadingSpacesOf` returns `0` (body) / `0` (title is currently left-aligned at col 0) instead of `21` / `54` / `21`. The narrow test fails on the title assertion (currently `0`, expected `24`). This confirms the tests exercise the not-yet-implemented centering.

- [ ] **Step 6: Implement centering — compute the leading pads**

In `packages/casting-ui/src/manual-prompt.tsx`, find the `renderWidth` line (currently line 418):

```tsx
  const renderWidth = Math.max(innerContentWidth, naturalBodyWidth)
```

Insert immediately after it:

```tsx
  // ── Horizontal centering (manual prompt only) ─────────────────────────
  // Center the body block (natural width 95) as one rigid unit, and the
  // title text independently, both within innerContentWidth. Both clamp to 0
  // below their natural width, where the existing pad-to-renderWidth +
  // sliceAnsi pan takes over unchanged. The strip is built at
  // `renderWidth - leadingPadBody` and prepended with the same pad, so its
  // left element lands at the body-left-edge while `Shift+Tab` stays pinned
  // to the box's right edge.
  const leadingPadBody = Math.max(
    0,
    Math.floor((innerContentWidth - naturalBodyWidth) / 2),
  )
  const stripRenderWidth = renderWidth - leadingPadBody
```

- [ ] **Step 7: Implement centering — center the title row**

Find the title construction (currently line 435):

```tsx
  const titleRow = manualTitleRow(lineNumber, castIndex, focusedField)
```

Replace it with:

```tsx
  const titleRow = manualTitleRow(lineNumber, castIndex, focusedField)
  const leadingPadTitle = Math.max(
    0,
    Math.floor((innerContentWidth - stringWidth(titleRow)) / 2),
  )
  const centeredTitleRow = ' '.repeat(leadingPadTitle) + titleRow
```

- [ ] **Step 8: Implement centering — prepend the body pad to every body row**

Find the `bodyRows` construction (currently lines 509–513):

```tsx
  const bodyRows = [
    ...flowHeader.map((row) => composeBodyRow(row, '')),
    ...cardBand.map((row, i) => composeBodyRow(row, cardRightPane[i] ?? '')),
    ...flowFooter.map((row) => composeBodyRow(row, '')),
  ]
```

Replace it with:

```tsx
  const padBody = (row: string): string => ' '.repeat(leadingPadBody) + row
  const bodyRows = [
    ...flowHeader.map((row) => padBody(composeBodyRow(row, ''))),
    ...cardBand.map((row, i) =>
      padBody(composeBodyRow(row, cardRightPane[i] ?? '')),
    ),
    ...flowFooter.map((row) => padBody(composeBodyRow(row, ''))),
  ]
```

- [ ] **Step 9: Implement centering — build the strip at the reduced width and prepend the pad**

In the `bottomStripBranchArgs` IIFE (currently lines 517–552), replace each of the **four** `renderWidth,` occurrences with `renderWidth: stripRenderWidth,`. The four occurrences are in the `resolved`, `error` (suspended-sum), `error` (zero-remainder), and `editing` branches. After the change the IIFE reads:

```tsx
  const bottomStripBranchArgs = ((): BottomStripArgs => {
    if (committed !== null) {
      return {
        branch: 'resolved',
        next: committed.next,
        renderWidth: stripRenderWidth,
      }
    }
    if (validation.kind === 'suspended-sum') {
      return {
        branch: 'error',
        errorKind: 'suspended-sum',
        remL: validation.remL,
        remR: validation.remR,
        sum: validation.sum,
        expectedLabel: validation.expectedLabel,
        renderWidth: stripRenderWidth,
      }
    }
    if (validation.kind === 'zero-remainder') {
      return {
        branch: 'error',
        errorKind: 'zero-remainder',
        remL: validation.remL,
        remR: validation.remR,
        renderWidth: stripRenderWidth,
      }
    }
    // incomplete | conservation | ok — conservation is surfaced by the MISSING
    // gauge (red), not the strip, so it shares the blank editing branch.
    return {
      branch: 'editing',
      commitReady: validation.kind === 'ok',
      renderWidth: stripRenderWidth,
    }
  })()
```

Then find the `stripRow` construction (currently line 553):

```tsx
  const stripRow = bottomStripRow(bottomStripBranchArgs)
```

Replace it with:

```tsx
  const stripRow =
    ' '.repeat(leadingPadBody) + bottomStripRow(bottomStripBranchArgs)
```

- [ ] **Step 10: Implement centering — use the centered title in the row stack**

Find the `allRows` construction (currently line 558):

```tsx
  const allRows = [titleRow, '', ...bodyRows, '', stripRow]
```

Replace it with:

```tsx
  const allRows = [centeredTitleRow, '', ...bodyRows, '', stripRow]
```

- [ ] **Step 11: Run the new tests to verify they PASS**

Run: `pnpm --filter @hexagram/casting-ui test -- tests/manual-prompt.test.tsx -t "centers the body block|does not center the body|aligns the strip hint"`

Expected: all three new tests PASS.

- [ ] **Step 12: Run the full manual-prompt test file to confirm no regressions**

Run: `pnpm --filter @hexagram/casting-ui test -- tests/manual-prompt.test.tsx`

Expected: all tests PASS — including `honours horizontalOffset by slicing each row of the prompt` (width 40, unchanged) and the width-100 substring/regex tests (which survive the 1-col body shift and the title shift because they match contiguous substrings / `\s+` patterns).

- [ ] **Step 13: Commit**

```bash
git add packages/casting-ui/src/manual-prompt.tsx packages/casting-ui/tests/manual-prompt.test.tsx
git commit -m "feat(casting-ui): center manual casting prompt body and title

Center the manual prompt's body block (diagram + right pane) as one rigid
unit and the title independently, both within innerContentWidth. Clamps to
0 below the 95-col natural body width, so narrow-terminal panning is
unchanged. The bottom strip is built at renderWidth - leadingPadBody and
prepended with the pad, keeping its left element at the body-left-edge and
Shift+Tab pinned to the box-right-edge. manual-diagram.ts is untouched.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Regression sweep (type-check, full casting-ui suite, viewer)

**Files:** none modified (verification only; commit only if an incidental fixup is required).

- [ ] **Step 1: Type-check the package**

Run: `pnpm --filter @hexagram/casting-ui type:check`
Expected: PASS (no type errors). `stringWidth` is already imported in `manual-prompt.tsx`; the new locals are plain `number`/`string`.

- [ ] **Step 2: Run the full casting-ui test suite**

Run: `pnpm --filter @hexagram/casting-ui build && pnpm --filter @hexagram/casting-ui test`

Note: as of `a64189c` the `test` turbo task depends on `^build`, so the explicit `build &&` prefix is now belt-and-suspenders (it still guards against the `check:all` build/test race noted in project memory — harmless to keep). Expected: all tests PASS — including the `consultation-file` / `casting-ui` fixture tests carrying the `六 → 上` rename (already regenerated on current main, unrelated to the manual prompt) and `viewer.test.tsx` (the Phase 7 byte-identity test compares only `saveConsultationFile` args; the width-160 footer-hints test asserts on the viewer footer, not the prompt box).

- [ ] **Step 3: Lint + format the changed files**

Run: `pnpm lint:check && pnpm format:check`
Expected: PASS. If `format:check` flags the edited files, run `pnpm format:fix`, re-run `pnpm format:check`, and amend the Task 1 commit:

```bash
git add -u && git commit --amend --no-edit
```

- [ ] **Step 4: Manual visual confirmation (wide + narrow)**

Run (wide terminal, e.g. ≥140 cols): `pnpm hexagram-manual`
Confirm by eye: the UNPARTED/heap-card/COUNTED diagram and the title sit centered in the bordered box; `Shift+Tab: go back` is flush to the right border. Then resize the terminal narrow (≤97 cols) and confirm the body left-aligns and `<`/`>` panning still reaches the right edge. Press `Ctrl+C` (or `Esc`) to exit.

Expected: matches the agreed mockup at wide widths; unchanged behaviour when narrow.

---

## Task 3: Documentation (two commits)

The codebase's two authoritative manual-flow docs (`AGENTS.md`, always loaded into agent context; and `docs/adr/0011-manual-casting-flow-design.md`) both predate (a) the new centering behaviour and (b) a file split + strip redesign. This task records the centering decision and refreshes the verified-stale references. Keep the two concerns in **separate commits** so history reads cleanly.

**Files:**
- Modify: `AGENTS.md` (manual-flow paragraph, ~line 156)
- Modify: `docs/adr/0011-manual-casting-flow-design.md` ("Tiered validation" ~lines 19–30; "Pure row-builder layout" ~lines 51–53; "Where it's enforced" ~line 81)

### Commit A — document the centering behaviour

- [ ] **Step 1: Add a centering sentence to AGENTS.md**

In `AGENTS.md`, in the manual-flow paragraph (line ~156), find the sentence that begins `Tab cycles forward (` and insert this sentence immediately **before** it:

```
On terminals wider than the prompt's natural body width (diagram + gap + right pane, `MANUAL_NATURAL_BODY_WIDTH`), the body block and title centre horizontally within the box as one rigid unit; below that width they left-align and the existing `<` / `>` pan reaches the right edge — mirroring the interactive prompt, whose bar and readout are likewise centred.
```

- [ ] **Step 2: Add a centering clause to ADR 0011's layout bullet**

In `docs/adr/0011-manual-casting-flow-design.md`, find the "Pure row-builder layout" bullet (lines ~51–53):

```
**Pure row-builder layout.** The prompt is assembled from pure text row-builders
(diagram rows, question/hint rows, input box, bottom strip), which keeps it
testable and lets it pan horizontally on narrow terminals without reflow.
```

Append this sentence to the end of that paragraph (after `without reflow.`):

```
On terminals wider than the natural body width, the body block (diagram + right pane) and the title centre horizontally within the box as one rigid unit, clamping to left-aligned + horizontal pan below it; the centring is a leading-pad post-pass in `manual-prompt.tsx`, so the row-builders stay width-pure.
```

- [ ] **Step 3: Commit (centering docs)**

```bash
git add AGENTS.md docs/adr/0011-manual-casting-flow-design.md
git commit -m "docs(casting-ui): document manual prompt horizontal centering

Record the body-block + title centering in AGENTS.md (always-loaded) and as
a clause in ADR 0011's layout bullet, so a future reader sees the centered
prompt as intentional rather than a regression to revert.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

### Commit B — refresh verified-stale references

These corrections are pre-existing drift (not caused by the centering change), confirmed against the code during plan review and by a dedicated validation-tier review (which derived the ground truth from `validateManualInput`). Scope covers: (1) the validation-tier list/order, (2) the bottom-strip description, (3) `ManualCastingPrompt` / `MANUAL_REVEAL_MS` file locations, and (4) the "Where it's enforced" list.

**Ground truth (from `packages/casting-ui/src/manual-validation.ts`, first-failing-check wins = priority order):** five outcome kinds — `incomplete` (`:87`) → `zero-remainder` (`:94`, any `remL`/`remR` === 0) → `conservation` (`:97`) → `suspended-sum` (`:111`) → `ok` (`:121`). `zero-remainder` is checked **before** conservation on purpose: conservation is only a sum check, and a `0` remainder can hide inside a conservation-valid total when the missing 4 is shifted into the pile count on the same side (`pR=N+1, rR=0` sums identically to `pR=N, rR=4`). Surfacing differs by tier: **conservation is shown only as the red `MISSING STALKS` gauge** (never strip text); `zero-remainder` and `suspended-sum` are shown only as red strip text; `ok` turns the gauge green and the strip shows `Press Enter to commit`.

- [ ] **Step 4: Fix the stale file location of `ManualCastingPrompt` in AGENTS.md**

In `AGENTS.md` line ~156, replace:

```
(`ManualCastingPrompt` in `casting-prompt-box.tsx`)
```

with:

```
(`ManualCastingPrompt` in `manual-prompt.tsx`, dispatched from `casting-prompt-box.tsx`)
```

- [ ] **Step 5: Fix the stale validation-tier list + strip description in AGENTS.md**

In `AGENTS.md` line ~156, replace the sentence-block (the tier list **and** the `accounted` strip sentence together):

```
The validator runs three invariants in priority order: **incomplete** (any field empty → neutral SPLIT placeholder); **conservation** (`4·pilesL + remL + 4·pilesR + remR + 1 ≠ unpartedStalks` → RED with the never-zero hint, since a heap divisible by 4 yields remainder 4, not 0); **suspended sum** (`1 + remL + remR` must be in `{5, 9}` for cast 1 or `{4, 8}` for casts 2/3 → RED with hint about removing the last group of 4). The bottom row reads `X of M stalks accounted` while editing (where `X = 4·pilesL + remL + 4·pilesR + remR + 1` counts the typed heap totals plus the always-suspended stalk) and swaps to BOLD_GREEN `→ next cast: N unparted` on commit (the per-card totals are already visible in the diagram itself).
```

with:

```
The validator runs four invariants in priority order — the first failing check wins (`validateManualInput` in `manual-validation.ts`): **incomplete** (any field empty → neutral SPLIT placeholder); **zero-remainder** (any `remL`/`remR` is 0 → RED strip text with the never-zero hint, since a heap divisible by 4 yields remainder 4, not 0; checked before conservation because `pR=N+1, rR=0` is conservation-equivalent to `pR=N, rR=4` and would otherwise pass the sum check undetected); **conservation** (`4·pilesL + remL + 4·pilesR + remR + 1 ≠ unpartedStalks` → surfaced as the RED `MISSING STALKS` gauge in the flow diagram, never as strip text); **suspended sum** (`1 + remL + remR` must be in `{5, 9}` for cast 1 or `{4, 8}` for casts 2/3 → RED strip text with hint about removing the last group of 4). While editing, the bottom strip is blank (the live count lives in the `MISSING STALKS` gauge) and shows `Press Enter to commit` once fully valid; on commit it swaps to BOLD_GREEN `→ next cast: N unparted` (the per-card totals are already visible in the diagram itself).
```

- [ ] **Step 6: Fix the stale `MANUAL_REVEAL_MS` location in AGENTS.md**

In `AGENTS.md` line ~156, replace:

```
The resolved-row dwell is `MANUAL_REVEAL_MS` (=2500 ms, set in `casting-prompt-box.tsx`; tunable via `--manual-reveal-ms <n>` or `manualRevealMs={0}` in tests).
```

with:

```
The resolved-row dwell is `MANUAL_REVEAL_MS` (=2500 ms, set in `manual-prompt.tsx`; tunable via `--manual-reveal-ms <n>` or `manualRevealMs={0}` in tests).
```

- [ ] **Step 7: Fix the stale "Tiered validation" block in ADR 0011**

In `docs/adr/0011-manual-casting-flow-design.md`, replace the whole block (lines ~19–30):

```
**Tiered validation, in priority order** — the prompt always shows the
highest-priority failing rule:

1. **incomplete** — any field empty → neutral placeholder.
2. **conservation** — `4·pilesL + remL + 4·pilesR + remR + 1 ≠ unpartedStalks` →
   red, with the "a heap divisible by 4 yields remainder 4, not 0" hint.
3. **suspended sum** — `1 + remL + remR` must be in `{5, 9}` for cast 1 or `{4, 8}`
   for casts 2/3 → red, with the "remove the last group of 4" hint.

The bottom strip reads `X of M stalks accounted` while editing (X counts the typed
heap totals plus the always-suspended stalk) and turns bold-green
`→ next cast: N unparted` on commit.
```

with:

```
**Tiered validation, in priority order** — the prompt always shows the
highest-priority failing rule:

1. **incomplete** — any field empty → neutral placeholder.
2. **zero-remainder** — any remainder typed as `0` → red strip text, with the
   "a heap divisible by 4 yields remainder 4, not 0" hint. Checked **before**
   conservation: a `0` remainder can sneak past the conservation sum when the
   missing 4 is shifted into the pile count on the same side (`pR=N+1, rR=0`
   sums identically to `pR=N, rR=4`), so the never-zero form is rejected
   explicitly first.
3. **conservation** — `4·pilesL + remL + 4·pilesR + remR + 1 ≠ unpartedStalks` →
   surfaced as the red `MISSING STALKS` gauge in the flow diagram, not as strip
   text (the gauge owns the conservation signal; the strip never duplicates it).
4. **suspended sum** — `1 + remL + remR` must be in `{5, 9}` for cast 1 or `{4, 8}`
   for casts 2/3 → red strip text, with the "remove the last group of 4" hint.

(Conservation + suspended-sum passing together guarantees the derived pick lands
in `[1, unparted-1]`, so there is no separate `range` tier.) While editing, the
bottom strip is blank — the live count lives in the `MISSING STALKS` gauge — and
shows `Press Enter to commit` once valid; on commit it turns bold-green
`→ next cast: N unparted`.
```

- [ ] **Step 7b: Record the ordering decision in ADR 0011's Consequences**

In `docs/adr/0011-manual-casting-flow-design.md`, in the `## Consequences` section, append this bullet after the existing rewind-semantics bullet (line ~77):

```
- `zero-remainder` must stay ahead of `conservation` in `validateManualInput` —
  conservation is a sum check and cannot detect a `0` remainder hidden by a
  compensating pile-count shift. Reordering them silently re-admits malformed
  `0`-remainder casts.
```

- [ ] **Step 8: Fix the stale "Where it's enforced" entry in ADR 0011**

In `docs/adr/0011-manual-casting-flow-design.md`, replace the bullet (line ~81):

```
- `packages/casting-ui/src/casting-prompt-box.tsx` — `ManualCastingPrompt`, the
  row-builders, validation tiers, `MANUAL_REVEAL_MS`.
```

with:

```
- `packages/casting-ui/src/manual-prompt.tsx` — `ManualCastingPrompt`, `MANUAL_REVEAL_MS`.
- `packages/casting-ui/src/manual-diagram.ts` — the pure row-builders.
- `packages/casting-ui/src/manual-validation.ts` — the validation tiers.
- `packages/casting-ui/src/casting-prompt-box.tsx` — `CastingPromptBox` dispatch + `getCastingPromptHeight`.
```

- [ ] **Step 9: Verify docs still read coherently, then commit (drift refresh)**

Re-read the edited AGENTS.md paragraph and the ADR 0011 sections end-to-end to confirm no dangling references to `casting-prompt-box.tsx` row-builders, `accounted`, or "three invariants" remain, and that the centering sentence from Commit A still flows.

Run: `grep -n "accounted\|three invariants\|ManualCastingPrompt.*casting-prompt-box\|set in .casting-prompt-box" AGENTS.md docs/adr/0011-manual-casting-flow-design.md`
Expected: no matches (the only surviving `accounted` is in `manual-guide.ts`, which is the in-app guide text and already accurate — out of scope here).

```bash
git add AGENTS.md docs/adr/0011-manual-casting-flow-design.md
git commit -m "docs(casting-ui): refresh stale manual-flow references

Correct pre-existing drift found during plan review (verified against
validateManualInput):
- Validation tiers: document the four-tier order incomplete → zero-remainder
  → conservation → suspended-sum (docs listed only three and folded the
  never-zero rule into conservation). zero-remainder fires before
  conservation because a sum check cannot catch a 0 remainder masked by a
  compensating pile-count shift; recorded in ADR 0011 Consequences.
- Surfacing: conservation shows only as the red MISSING gauge; zero-remainder
  and suspended-sum as red strip text.
- Bottom strip: no longer shows an 'X of M stalks accounted' total — the
  MISSING gauge owns the live count; the strip shows 'Press Enter to commit'.
- File locations: ManualCastingPrompt + MANUAL_REVEAL_MS now in
  manual-prompt.tsx, row-builders in manual-diagram.ts, validation in
  manual-validation.ts.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Flagged ambiguities (resolved during review)

- **`zero-remainder` validation tier drift — RESOLVED, folded into Task 3 Commit B.** Initially deferred; a parallel review agent then derived the ground truth from `validateManualInput` (`incomplete → zero-remainder → conservation → suspended-sum → ok`; `zero-remainder` precedes conservation for a real correctness reason; conservation surfaces only via the red MISSING gauge). Because the verified corrections rewrite the *same* doc sentences as the already-agreed strip-text fix, leaving it deferred would have produced an incoherent half-edited paragraph ("blank strip…" next to "three invariants"). So the full tier correction is now in Commit B Steps 5, 7, 7b, with the ordering rationale recorded in ADR 0011's Consequences.
- **In-app guide (`manual-guide.ts`) is already accurate** — it teaches the never-zero rule, the balance rule, and the suspended-sum check as three distinct concepts. No change needed (one minor staleness at `:97` — "the bottom strip turns green the moment the figures balance," now the MISSING gauge — left as a future tidy, not in scope).

---

## Self-Review (completed by plan author)

**Spec coverage:**
- Body block centered as one rigid unit → Task 1, Steps 6 & 8 + test Step 2. ✓
- Title centered within full box, independent → Task 1, Step 7 + tests Steps 2 & 3. ✓
- Dynamic centering clamped at 0; narrow path untouched → Step 6 formula + test Step 3. ✓
- Strip left element at body-left-edge; `Shift+Tab` at box-right-edge → Step 9 + test Step 4. ✓
- Horizontal only; `manual-diagram.ts` untouched; interactive prompt untouched → no edits to those files (verified `bottomStripRow` needs no change). ✓
- Slicing test passes unchanged (width 40) → Background note + Task 1 Step 12. ✓
- No fixtures/snapshots; Phase 7 unaffected → Task 2 Step 2. ✓
- New centering behaviour documented (AGENTS.md + ADR 0011), no standalone ADR → Task 3 Commit A. ✓
- Pre-existing strip-text + file-location drift refreshed as a separate commit → Task 3 Commit B. ✓
- `zero-remainder` tier drift verified (parallel review) + corrected with cited prose in the same commit (avoids an incoherent half-edit) → Task 3 Commit B Steps 5/7/7b + "Flagged ambiguities". ✓
- Branch base / turbo `^build` / 六→上 fixture rename accounted for → Prerequisite section + Task 2 Step 2 note. ✓

**Placeholder scan:** No TBD/TODO/"handle edge cases"/"similar to". Every code step shows full code and exact run commands with expected output. ✓

**Type/name consistency:** `leadingPadBody`, `leadingPadTitle`, `stripRenderWidth`, `centeredTitleRow`, `padBody`, `leadingSpacesOf` are defined once and referenced consistently. `stringWidth` and `bottomStripRow` are already imported in `manual-prompt.tsx`. The strip args use the existing `BottomStripArgs.renderWidth` field (now fed `stripRenderWidth`). ✓
