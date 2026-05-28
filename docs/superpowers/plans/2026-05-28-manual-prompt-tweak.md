# Manual Prompt Tweak Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the missing-focus-indicator bug on the manual casting prompt's heap-card preview when Shift+Tabbing back from all-fields-filled, and apply the visual tweak per the new mockup (wider 6-row heap cards, single-line question + parenthesised range hint, wider input box, simplified bottom strip).

**Architecture:** Pure-text row builders in `packages/casting-ui/src/casting-prompt-box.tsx` — `manualTitleRow`, `twoHeapDiagramRows`, `questionPanelRows`, `focusedInputBoxRows`, `bottomStripRow` — composed by `<ManualCastingPrompt>` with `sliceAnsi` pan. The redesign is re-render-only: validator, generator-advance, save-file format, `MANUAL_REVEAL_MS`, `manualRevealMs={0}` opt-out, parent-owned `useInput` digit/backspace handling, `onReady`/`onFocusedFieldChange` witnesses, `rewindCurrentLine` rewind, slider/number/non-TTY-guard branches, and the Phase 7 byte-identity contract (`packages/casting-ui/tests/viewer.test.tsx`: `manual flow saves byte-identical to interactive for the same casting record`) are all untouched.

**Tech Stack:** TypeScript + React 19 + Ink (terminal UI), `slice-ansi` for ANSI-aware pan, `string-width` for display-column measurement, vitest + ink-testing-library. Repo is a Turborepo + pnpm workspace; cross-package types require `pnpm build` first.

---

## Target mockup (re-rendered manual prompt)

```
 ╭──────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
 │ Line 1/6 · Cast 1/3   ● ● ● ○   Step 3 of 4                                                                  │
 │                                                                                                              │
 │ ┌── LEFT HEAP ────┐    ┌── RIGHT HEAP ───┐        How many piles of 4 stalks in the RIGHT heap?              │
 │ │  piles       4  │    │  piles          │        (valid 0 to 12)                                            │
 │ │  remainder   3  │    │  remainder   3  │        ┌─────────────┐                                            │
 │ │                 │    │  suspended   1  │        │             │                                            │
 │ │  = 19 stalks    │    │  = ? stalks     │        └─────────────┘                                            │
 │ └─────────────────┘    └─────────────────┘                                                                   │
 │                                                                                                              │
 │ 22 of 49 stalks accounted                                                      Enter: next · Shift+Tab: back │
 ╰──────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
```

Body row alignment (6 body rows = 9 content rows total, **height stays at 11**):

| Body row | Left half (diagram, 42 cols)                             | Right half (right pane)                         |
| -------- | -------------------------------------------------------- | ----------------------------------------------- |
| 1        | LEFT header `┌── LEFT HEAP ────┐` + 4-gap + RIGHT header | `How many piles of 4 stalks in the RIGHT heap?` |
| 2        | piles row                                                | `(valid 0 to N)` dim hint                       |
| 3        | remainder row                                            | `┌─────────────┐` (input top)                   |
| 4        | suspended row (RIGHT only; LEFT shows blank)             | `│ <value><cursor>           │` (input mid)     |
| 5        | `= N stalks` row                                         | `└─────────────┘` (input bottom)                |
| 6        | LEFT footer `└─────────────────┘` + 4-gap + RIGHT footer | blank                                           |

Key changes vs current:

- **Title dots:** `●●○○` → `● ● ● ○` (1-col spaces between dots), `step` → `Step`.
- **Heap card interior:** 13 → 17 cols; full word `remainder` not `rem.`; new 4th row `suspended   1` on RIGHT (blank slot on LEFT).
- **RIGHT total formula:** includes +1 suspended (`4·pilesR + remR + 1`); LEFT total unchanged (`4·pilesL + remL`).
- **Question panel:** drop the 2-line pre-wrap; questions render as a single line. Hint wrapped in parens: `(valid 0 to N)` not `valid 0 to N`. Pane returns 2 rows (down from 3).
- **Input box:** interior 8 → 13 cols.
- **Bottom strip editing:** `· 1 suspended · total X of M` → `X of M stalks accounted` (left), `Enter: next · Shift+Tab: back` (right) unchanged.
- **Bug fix:** focus indicator (inverse-video on the focused field's cell) must remain visible while validator is in `error` state (currently shown only in `editing`).

Out of scope: validator priority/outcomes, `computeManualRoundResult` maths, save-file format, byte-identity test, slider/number branches, non-TTY guard, `--manual-reveal-ms`, the consultation file format.

---

## File Structure

All edits land in two files:

- **Modify:** `packages/casting-ui/src/casting-prompt-box.tsx`
  - `manualTitleRow` — dots + step text format
  - `cellText` — bug fix (focus indicator in error)
  - `HEAP_CARD_INTERIOR`, `buildCardRows`, `twoHeapDiagramRows` — 6-row layout, wider interior, new labels, RIGHT-total formula
  - `questionPanelRows` — single-line question + parens hint, 2 rows
  - `focusedInputBoxRows` — wider interior (8 → 13)
  - `bottomStripRow` (editing branch) — `N of M stalks accounted`
  - `<ManualCastingPrompt>` — body composition: 6 diagram rows + 6-row right pane; `diagramWidth` 39 → 42; `naturalBodyWidth` 75 → 95

- **Modify:** `packages/casting-ui/tests/casting-prompt-box.test.tsx`
  - All affected unit tests for the builders listed above
  - One new test for the bug fix scenario

- **Modify:** `packages/casting-ui/tests/viewer.test.tsx`
  - Text-assertion tests that pattern-match on the prompt's rendered output (title text, heap cell labels, question text, bottom strip)
  - **The Phase 7 byte-identity test (`manual flow saves byte-identical to interactive for the same casting record`) is NOT touched**

---

## Constants (single source of truth)

```ts
// In packages/casting-ui/src/casting-prompt-box.tsx
const HEAP_CARD_INTERIOR = 17 // was 13 — fits "remainder" + value
const FOCUSED_INPUT_INTERIOR = 13 // was 8 — wider input box
const DIAGRAM_WIDTH = 42 // was 39 — 19 + 4-gap + 19
const NATURAL_BODY_WIDTH = 95 // was 75 — DIAGRAM_WIDTH + 8-gap + 45 (widest question)
const HEAP_LABEL_COL_WIDTH = 9 // longest label "remainder"/"suspended"
```

---

## Phase 1: Bug fix — focus indicator visible in error state

**Files:**

- Modify: `packages/casting-ui/src/casting-prompt-box.tsx` (function `cellText` around line 988)
- Modify: `packages/casting-ui/tests/casting-prompt-box.test.tsx`

The bug: when the user has filled all four fields and Shift+Tabs back to a prior field, if the inputs don't satisfy conservation/suspended-sum/zero-remainder, the diagram state is `error`. `cellText` currently only inverse-videos the focused cell when `state === 'editing'`, so the focus indicator vanishes when an error is showing.

The fix: show the inverse-video focus cell in both `editing` and `error` states; only `resolved` (committed) suppresses it.

- [ ] **Step 1: Add the failing regression test**

In `packages/casting-ui/tests/casting-prompt-box.test.tsx`, find the `describe('twoHeapDiagramRows', ...)` block and append a new test inside it:

```ts
it('shows the focus indicator on the focused cell when state is error (bug fix: Shift+Tab back into a conservation-failing form)', () => {
  // All 4 fields filled, but conservation fails (totals + 1 != 49).
  // User has Shift+Tabbed back to pilesL — focus indicator must remain
  // visible on the LEFT-piles cell even though state is 'error'.
  const rows = twoHeapDiagramRows({
    pilesL: 4,
    remL: 3,
    pilesR: 4,
    remR: 3,
    focusedField: 'pilesL',
    state: 'error',
  })
  // Inverse-video ANSI: ESC[7m...ESC[27m
  // oxlint-disable-next-line no-control-regex
  expect(rows[1]).toMatch(/\[7m4\[27m/)
})
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `pnpm --filter @hexagram/casting-ui test -- casting-prompt-box.test.tsx -t 'focus indicator on the focused cell when state is error'`
Expected: FAIL — `rows[1]` will contain a plain `4`, not the inverse-video sequence.

- [ ] **Step 3: Apply the one-function fix**

Edit `cellText` in `packages/casting-ui/src/casting-prompt-box.tsx`:

```ts
function cellText(
  value: number | null,
  field: ManualFocusedField,
  focusedField: ManualFocusedField,
  state: ManualDiagramState,
): string {
  // Focus indicator (inverse-video) stays visible while the user can still
  // edit — i.e. anything except the post-commit resolved state. Previously
  // it was restricted to `editing` only, which caused the indicator to
  // vanish when the user Shift+Tabbed back into a form whose validator was
  // surfacing a conservation/suspended-sum/zero-remainder error.
  if (focusedField === field && state !== 'resolved') return inverseCell(value)
  return plainCell(value)
}
```

- [ ] **Step 4: Run the new test plus the full builder unit-test file**

Run: `pnpm --filter @hexagram/casting-ui test -- casting-prompt-box.test.tsx`
Expected: ALL pass (including the new regression test).

- [ ] **Step 5: Run the full casting-ui suite to confirm no other breakage**

Run: `pnpm --filter @hexagram/casting-ui test`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add packages/casting-ui/src/casting-prompt-box.tsx packages/casting-ui/tests/casting-prompt-box.test.tsx
git commit -m "$(cat <<'EOF'
fix(casting-prompt): keep manual focus indicator visible in error state

When the user filled all four fields, then Shift+Tabbed back into a
form whose typed values failed conservation/suspended-sum/zero-remainder,
the diagram state was `error` and the focused cell rendered as plain
`?`/value with no inverse-video focus cue. Focus is meaningful as long
as the field is still editable, so show the indicator in editing AND
error — only `resolved` suppresses it.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase 2: Title row — dot spacing + capitalisation

**Files:**

- Modify: `packages/casting-ui/src/casting-prompt-box.tsx` (function `manualTitleRow` around line 945)
- Modify: `packages/casting-ui/tests/casting-prompt-box.test.tsx`

New title format: `Line 1/6 · Cast 1/3   ● ● ● ○   Step 3 of 4` (1-col spaces between dots; capitalised `Step`).

- [ ] **Step 1: Update existing tests for the new format**

In `packages/casting-ui/tests/casting-prompt-box.test.tsx`, find the `describe('manualTitleRow', ...)` block and update each test's expected string. Specifically:

```ts
it('formats the title with focused-field step progress', () => {
  expect(manualTitleRow(1, 0, 'pilesL')).toBe(
    'Line 1/6 · Cast 1/3   ● ○ ○ ○   Step 1 of 4',
  )
  expect(manualTitleRow(1, 0, 'remL')).toBe(
    'Line 1/6 · Cast 1/3   ● ● ○ ○   Step 2 of 4',
  )
  expect(manualTitleRow(1, 0, 'pilesR')).toBe(
    'Line 1/6 · Cast 1/3   ● ● ● ○   Step 3 of 4',
  )
  expect(manualTitleRow(1, 0, 'remR')).toBe(
    'Line 1/6 · Cast 1/3   ● ● ● ●   Step 4 of 4',
  )
})

it('reflects line number and 1-based cast index', () => {
  expect(manualTitleRow(6, 2, 'pilesL')).toBe(
    'Line 6/6 · Cast 3/3   ● ○ ○ ○   Step 1 of 4',
  )
})
```

If there are additional `manualTitleRow` tests in the file (e.g. snapshotting all four states), update those too — every assertion needs `● ` (with trailing space) between dots and the literal word `Step` (capital S).

- [ ] **Step 2: Run the updated tests, confirm they fail**

Run: `pnpm --filter @hexagram/casting-ui test -- casting-prompt-box.test.tsx -t 'manualTitleRow'`
Expected: FAIL — current output has `●●●○` (no spaces) and lowercase `step`.

- [ ] **Step 3: Update `manualTitleRow`**

```ts
export function manualTitleRow(
  lineNumber: number,
  castIndex: number,
  focusedField: ManualFocusedField,
): string {
  const stepIndex = MANUAL_FIELD_ORDER.indexOf(focusedField)
  const dots = MANUAL_FIELD_ORDER.map((_, i) =>
    i <= stepIndex ? '●' : '○',
  ).join(' ')
  return `Line ${lineNumber}/6 · Cast ${castIndex + 1}/3   ${dots}   Step ${stepIndex + 1} of 4`
}
```

The single change vs the current implementation: `join('')` → `join(' ')` and `step` → `Step`.

- [ ] **Step 4: Run the updated tests, confirm pass**

Run: `pnpm --filter @hexagram/casting-ui test -- casting-prompt-box.test.tsx -t 'manualTitleRow'`
Expected: PASS.

- [ ] **Step 5: Update `viewer.test.tsx` assertions that pattern-match the title**

Search `packages/casting-ui/tests/viewer.test.tsx` for assertions that include the old title pattern. Likely candidates: any `toContain('●')`, `toContain('step ')`, `toMatch(/step \d of 4/)`. Update them to use `● ` (with trailing space) and `Step` capitalisation. For each match, change to the new format.

Run: `pnpm --filter @hexagram/casting-ui test -- viewer.test.tsx 2>&1 | grep -E '(FAIL|✗|Error)' | head -20`

If failures surface, update the corresponding assertions to the new title format. Re-run until clean.

- [ ] **Step 6: Run the full casting-ui suite**

Run: `pnpm --filter @hexagram/casting-ui test`
Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add packages/casting-ui/src/casting-prompt-box.tsx packages/casting-ui/tests/casting-prompt-box.test.tsx packages/casting-ui/tests/viewer.test.tsx
git commit -m "$(cat <<'EOF'
refactor(casting-prompt): widen manual title dots, capitalise "Step"

Title row reads `Line N/6 · Cast C/3   ● ● ● ○   Step P of 4` — dots
spaced by 1 col for legibility, "Step" capitalised. Renderer-only; no
behaviour change.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase 3: Bottom strip — `N of M stalks accounted`

**Files:**

- Modify: `packages/casting-ui/src/casting-prompt-box.tsx` (function `bottomStripRow`, editing branch around line 1232)
- Modify: `packages/casting-ui/tests/casting-prompt-box.test.tsx`

New editing-branch left half: `<liveLeftTotal + liveRightTotal> of <unpartedStalks> stalks accounted` (e.g. `22 of 49 stalks accounted`). Right half (`Enter: next · Shift+Tab: back`) is unchanged. Error and resolved branches are unchanged.

Note on semantics: `liveLeftTotal + liveRightTotal` excludes the +1 suspended (`liveLeftTotal = 4·(pilesL ?? 0) + (remL ?? 0)`, ditto right). With `pilesL=4, remL=3, pilesR=null→0, remR=3, suspended=1`, accounted = `19 + 3 = 22`, matching the mockup.

- [ ] **Step 1: Update existing editing-branch tests**

In `packages/casting-ui/tests/casting-prompt-box.test.tsx`, find the `describe('bottomStripRow', ...)` block. Update each editing-branch assertion. Example:

```ts
it('builds the editing branch with live totals and commit/back hint', () => {
  const row = bottomStripRow({
    branch: 'editing',
    liveLeftTotal: 19,
    liveRightTotal: 3,
    unpartedStalks: 49,
    renderWidth: 80,
  })
  expect(row.startsWith('22 of 49 stalks accounted')).toBe(true)
  expect(row.endsWith('Enter: next · Shift+Tab: back')).toBe(true)
  // The row pads to exactly renderWidth display cols (no ANSI in editing).
  expect(stringWidth(row)).toBe(80)
})
```

If there are additional editing-branch tests (e.g. covering zero totals), update those too — the left half is always `<sum> of <unparted> stalks accounted`.

- [ ] **Step 2: Run the updated tests, confirm they fail**

Run: `pnpm --filter @hexagram/casting-ui test -- casting-prompt-box.test.tsx -t 'bottomStripRow'`
Expected: editing-branch tests FAIL — current output starts with `· 1 suspended · total`.

- [ ] **Step 3: Update `bottomStripRow` editing branch**

Find this block in `bottomStripRow`:

```ts
if (args.branch === 'editing') {
  const left = `· 1 suspended · total ${args.liveLeftTotal + args.liveRightTotal} of ${args.unpartedStalks}`
  const right = 'Enter: next · Shift+Tab: back'
  return leftRightRow(left, right, args.renderWidth)
}
```

Replace with:

```ts
if (args.branch === 'editing') {
  const accounted = args.liveLeftTotal + args.liveRightTotal
  const left = `${accounted} of ${args.unpartedStalks} stalks accounted`
  const right = 'Enter: next · Shift+Tab: back'
  return leftRightRow(left, right, args.renderWidth)
}
```

- [ ] **Step 4: Run the updated tests, confirm pass**

Run: `pnpm --filter @hexagram/casting-ui test -- casting-prompt-box.test.tsx -t 'bottomStripRow'`
Expected: PASS.

- [ ] **Step 5: Update `viewer.test.tsx` assertions that pattern-match the editing strip**

Search `packages/casting-ui/tests/viewer.test.tsx` for `· 1 suspended`, `· total `, `total \d+ of`, and similar patterns scoped to editing/in-flight states. For each, swap to `<N> of <M> stalks accounted` form.

Run: `pnpm --filter @hexagram/casting-ui test -- viewer.test.tsx 2>&1 | grep -E '(FAIL|✗|Error)' | head -20`

Iterate until clean.

- [ ] **Step 6: Run the full casting-ui suite**

Run: `pnpm --filter @hexagram/casting-ui test`
Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add packages/casting-ui/src/casting-prompt-box.tsx packages/casting-ui/tests/casting-prompt-box.test.tsx packages/casting-ui/tests/viewer.test.tsx
git commit -m "$(cat <<'EOF'
refactor(casting-prompt): simplify manual editing strip to "N of M stalks accounted"

Drops the "· 1 suspended · total …" preamble in the editing branch.
The suspended stalk is now surfaced inside the RIGHT heap card itself
(Phase 4); the strip just reports raw progress. Error and resolved
branches unchanged.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase 4: Heap card — 6 rows, interior 17, full-word labels, suspended row, RIGHT total includes +1

**Files:**

- Modify: `packages/casting-ui/src/casting-prompt-box.tsx` (`HEAP_CARD_INTERIOR`, `buildCardRows`, `twoHeapDiagramRows`, and the diagramWidth in `<ManualCastingPrompt>`)
- Modify: `packages/casting-ui/tests/casting-prompt-box.test.tsx`
- Modify: `packages/casting-ui/tests/viewer.test.tsx`

This is the biggest single shape change. The card grows to 6 rows (header / piles / remainder / suspended-or-blank / `= N stalks` / footer); interior widens to 17 cols; labels become full words; RIGHT total includes the +1 suspended.

- [ ] **Step 1: Update unit tests for `twoHeapDiagramRows`**

In `packages/casting-ui/tests/casting-prompt-box.test.tsx`, find the `describe('twoHeapDiagramRows', ...)` block.

For the "happy path / all four filled" test, update the expected rows. Example replacement:

```ts
it('builds 6 paired rows with full-word labels and an explicit suspended row on RIGHT', () => {
  const rows = twoHeapDiagramRows({
    pilesL: 4,
    remL: 3,
    pilesR: 5,
    remR: 1,
    focusedField: 'remR', // none of these cells render inverse-video in the substring assertions below
    state: 'editing',
  })
  expect(rows).toHaveLength(6)
  // Each row holds LEFT card | 4-space gap | RIGHT card. Card width = 19.
  expect(rows[0]).toContain('┌── LEFT HEAP ────┐')
  expect(rows[0]).toContain('┌── RIGHT HEAP ───┐')
  expect(rows[1]).toContain('piles')
  expect(rows[1]).toContain('  4  ') // right-aligned value padded
  expect(rows[2]).toContain('remainder')
  expect(rows[3]).toContain('suspended   1') // RIGHT only — LEFT slot is blank
  expect(rows[3]?.startsWith('│')).toBe(true) // LEFT blank row still rendered as a card row
  // LEFT total: 4·4 + 3 = 19. RIGHT total: 4·5 + 1 + 1 (suspended) = 22.
  expect(rows[4]).toContain('= 19 stalks')
  expect(rows[4]).toContain('= 22 stalks')
  expect(rows[5]).toContain('└─────────────────┘') // both footers
})

it('renders `?` totals when any source cell is null', () => {
  const rows = twoHeapDiagramRows({
    pilesL: null,
    remL: 3,
    pilesR: 4,
    remR: null,
    focusedField: 'pilesL',
    state: 'editing',
  })
  expect(rows[4]).toContain('= ? stalks') // LEFT can't compute without pilesL
  expect(rows[4]).toContain('= ? stalks') // RIGHT can't compute without remR
})

it('keeps the focus indicator visible on the suspended row only as a static `1` (never focused)', () => {
  // Suspended is always 1, never a user input — the row exists for visual
  // explanation. focusedField never points at it; only the four real fields
  // can be focused. Render it as plain text in every state except resolved.
  const rows = twoHeapDiagramRows({
    pilesL: 4,
    remL: 3,
    pilesR: 4,
    remR: 3,
    focusedField: 'pilesL',
    state: 'editing',
  })
  // No inverse-video around the suspended row's `1`.
  // oxlint-disable-next-line no-control-regex
  expect(rows[3]).not.toMatch(/\[7m1\[27m/)
})
```

If the previous file had a "5 rows / `rem.` label / 13-col interior" baseline test, replace it wholesale with the above. Keep the bug-fix test from Phase 1 (`'shows the focus indicator on the focused cell when state is error …'`) — just update its `rows[1]` index if needed (still index 1 since piles row stayed at position 1).

- [ ] **Step 2: Update unit tests for `buildCardRows`** (if there are direct tests on it)

If `buildCardRows` is tested directly (search for `describe('buildCardRows'` or similar), update the expected row count from 5 to 6 and the header dash count from `2 + ' HEADER '.length` against `interior=13` to the same formula against `interior=17`.

If `buildCardRows` is not directly exported/tested, skip this step — `twoHeapDiagramRows` tests cover it transitively.

- [ ] **Step 3: Run the unit tests, confirm they fail**

Run: `pnpm --filter @hexagram/casting-ui test -- casting-prompt-box.test.tsx -t 'twoHeapDiagramRows'`
Expected: FAIL — current output is 5 rows with `rem.` label and interior=13.

- [ ] **Step 4: Update constants and `buildCardRows`**

Replace these definitions in `packages/casting-ui/src/casting-prompt-box.tsx`:

```ts
// Card interior width (between the two vertical pipes). 17 cols accommodates
// `LEFT HEAP` / `RIGHT HEAP` headers, `= XX stalks` totals (up to 3 digits),
// and the full-word `remainder` / `suspended` labels.
const HEAP_CARD_INTERIOR = 17

// Reserved width of the leading label column inside a content row: 2-col
// pad + longest label `remainder` (9) = 11. Values are right-aligned within
// the remaining `interior - 11` cols.
const HEAP_LABEL_COL_WIDTH = 11
```

Replace `buildCardRows` with a 6-row builder:

```ts
// Build a single card's 6 rows (header / piles / remainder / suspended-or-blank
// / totals / footer). Each content row has a leading `│` + interior + trailing
// `│`. The fourth content row carries the `suspended   1` line on RIGHT, an
// all-spaces blank on LEFT — controlled by `suspendedCell` (null for LEFT,
// `'1'` for RIGHT).
function buildCardRows(
  header: string,
  pilesCell: string,
  remCell: string,
  suspendedCell: string | null,
  totalLabel: string,
): readonly string[] {
  // Header: `┌── HEADER ─...─┐` — fills interior with dashes around the header.
  const headerInner = ` ${header} `
  const leadingDashes = '─'.repeat(2)
  const trailingDashes = '─'.repeat(
    Math.max(0, HEAP_CARD_INTERIOR - headerInner.length - 2),
  )
  const headerRow = `┌${leadingDashes}${headerInner}${trailingDashes}┐`

  // Field row: `│  LABEL    {cell}  │`. The pre-cell column is
  // HEAP_LABEL_COL_WIDTH chars wide (2-col pad + label padded to 9). The
  // trailing pad fills the remaining interior, leaving a 2-col right margin.
  const buildField = (label: string, cell: string): string => {
    const labelPadded = `  ${label}`.padEnd(HEAP_LABEL_COL_WIDTH, ' ')
    const cellWidth = stringWidth(cell)
    const rightMargin = 2
    const trailing = Math.max(
      0,
      HEAP_CARD_INTERIOR - HEAP_LABEL_COL_WIDTH - cellWidth - rightMargin,
    )
    return `│${labelPadded}${cell}${' '.repeat(trailing)}${' '.repeat(rightMargin)}│`
  }

  const pilesRow = buildField('piles', pilesCell)
  const remRow = buildField('remainder', remCell)
  const suspendedRow =
    suspendedCell === null
      ? `│${' '.repeat(HEAP_CARD_INTERIOR)}│`
      : buildField('suspended', suspendedCell)

  // Totals row: `│  = X stalks  │` — pad to interior width.
  const totalContent = `  = ${totalLabel} stalks`
  const totalsTrail = Math.max(0, HEAP_CARD_INTERIOR - totalContent.length)
  const totalsRow = `│${totalContent}${' '.repeat(totalsTrail)}│`

  const footerRow = `└${'─'.repeat(HEAP_CARD_INTERIOR)}┘`

  return [headerRow, pilesRow, remRow, suspendedRow, totalsRow, footerRow]
}
```

Replace `twoHeapDiagramRows` to thread the suspended cell and the new RIGHT total formula:

```ts
export function twoHeapDiagramRows(args: TwoHeapDiagramRowsArgs): string[] {
  const { pilesL, remL, pilesR, remR, focusedField, state } = args
  const pilesLCell = cellText(pilesL, 'pilesL', focusedField, state)
  const remLCell = cellText(remL, 'remL', focusedField, state)
  const pilesRCell = cellText(pilesR, 'pilesR', focusedField, state)
  const remRCell = cellText(remR, 'remR', focusedField, state)
  const leftTotalLabel =
    pilesL === null || remL === null ? '?' : String(4 * pilesL + remL)
  // RIGHT total includes the +1 always-suspended stalk shown in the
  // `suspended   1` row, so the heap card's `= N stalks` row sums vertically
  // (piles·4 + remainder + suspended) like the LEFT card sums (piles·4 +
  // remainder + 0).
  const rightTotalLabel =
    pilesR === null || remR === null ? '?' : String(4 * pilesR + remR + 1)
  const leftRows = buildCardRows(
    'LEFT HEAP',
    pilesLCell,
    remLCell,
    null, // LEFT has no suspended stalk — blank slot for visual alignment
    leftTotalLabel,
  )
  const rightRows = buildCardRows(
    'RIGHT HEAP',
    pilesRCell,
    remRCell,
    '1', // RIGHT always has the +1 suspended stalk
    rightTotalLabel,
  )
  const gap = '    '
  const combined = leftRows.map((row, i) => `${row}${gap}${rightRows[i]!}`)
  if (state === 'resolved') {
    return combined.map((row) => `${BOLD_GREEN}${row}${NORMAL}`)
  }
  return combined
}
```

- [ ] **Step 5: Run the updated unit tests, confirm pass**

Run: `pnpm --filter @hexagram/casting-ui test -- casting-prompt-box.test.tsx -t 'twoHeapDiagramRows'`
Expected: PASS.

- [ ] **Step 6: Update `<ManualCastingPrompt>` for 6 diagram rows + wider cards**

In `<ManualCastingPrompt>`, find the diagram section (around line 1718). Replace:

```ts
// Natural diagram width: `17 (LEFT card) + 4 (gap) + 18 (RIGHT card)`.
// The RIGHT card is 18 cols because the `RIGHT HEAP` header is 1 col
// wider than `LEFT HEAP`. Pad with a 6th blank row so the diagram half
// is always 6 rows tall, matching the right pane.
const diagramWidth = 39
const diagramPaddedRows = [...diagramRows, ' '.repeat(diagramWidth)]
```

With:

```ts
// Natural diagram width: 19 (LEFT card outer) + 4 (gap) + 19 (RIGHT card
// outer) = 42. Both cards are 19 cols wide (HEAP_CARD_INTERIOR=17 + 2
// borders). `twoHeapDiagramRows` already returns 6 paired rows — no
// padding row needed.
const diagramWidth = HEAP_CARD_INTERIOR + 2 + 4 + HEAP_CARD_INTERIOR + 2
const diagramPaddedRows = diagramRows
```

Find this nearby block:

```ts
// Natural body width: LEFT card (17) + 4-col gap + RIGHT card (17) +
// 4-col gap + right-pane (33-ish). Use 75 — the prompt's body is sliced
// against innerContentWidth so the exact figure matters only as a floor.
const naturalBodyWidth = 17 + 4 + 17 + 4 + 33
```

Replace with:

```ts
// Natural body width: diagramWidth (42) + 8-col gap + right-pane (45 —
// widest question: "How many piles of 4 stalks in the RIGHT heap?" = 45
// cols). Sliced against innerContentWidth so the exact figure matters
// only as a floor on narrow terminals.
const naturalBodyWidth = diagramWidth + 8 + 45
```

Update the body composition to use the new 8-col middle gap. Find:

```ts
const middleGap = 4
```

Replace with:

```ts
const middleGap = 8
```

(All other references to `4` in `composeBodyRow` are unaffected — only the middle gap changes.)

- [ ] **Step 7: Update `viewer.test.tsx` assertions that pattern-match heap card contents**

Search `packages/casting-ui/tests/viewer.test.tsx` for:

- `'rem.'` (the old short label)
- `'rem\\.'` in regex form
- `'Left heap'` or `'Right heap'` — case variants
- Heap-card total assertions referencing the old RIGHT formula

For each occurrence, swap to the new full word `remainder` and (for RIGHT totals) the new formula `4·pilesR + remR + 1`.

Also search for `total 0 of 49`, `total \d+ of \d+`, and similar patterns; if any of these were pre-Phase-3 holdouts, update them to `<N> of <M> stalks accounted`.

For known visible artefacts in the prompt body (`How many `, `Unparted stalks: `, `SPLIT`, `Left heap`, etc.), grep them out and update to the new strings.

Run: `pnpm --filter @hexagram/casting-ui test -- viewer.test.tsx 2>&1 | grep -E '(FAIL|✗|Error)' | head -30`

Iterate until clean. **Do NOT touch the byte-identity test** (`manual flow saves byte-identical to interactive for the same casting record`) — its assertion compares the captured `saveConsultationFile` args, not the rendered output.

- [ ] **Step 8: Run the full casting-ui suite + type check**

Run: `pnpm --filter @hexagram/casting-ui test && pnpm --filter @hexagram/casting-ui type:check`
Expected: all pass.

- [ ] **Step 9: Commit**

```bash
git add packages/casting-ui/src/casting-prompt-box.tsx packages/casting-ui/tests/casting-prompt-box.test.tsx packages/casting-ui/tests/viewer.test.tsx
git commit -m "$(cat <<'EOF'
refactor(casting-prompt): widen manual heap cards to 6 rows with explicit suspended

Card interior 13→17 cols. Labels switch to the full words `piles`,
`remainder`, `suspended`. RIGHT card carries an always-`1` suspended
row (LEFT shows a blank slot for visual symmetry); its `= N stalks`
total now sums vertically through the suspended row, i.e.
`4·pilesR + remR + 1`. LEFT total formula unchanged.

Validator, generator-advance, save format, and the byte-identity
test are all untouched — this is a render-shape change.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase 5: Question panel — single-line question + parenthesised hint

**Files:**

- Modify: `packages/casting-ui/src/casting-prompt-box.tsx` (`questionLinesForField`, `questionPanelRows`, and the right-pane composition in `<ManualCastingPrompt>`)
- Modify: `packages/casting-ui/tests/casting-prompt-box.test.tsx`
- Modify: `packages/casting-ui/tests/viewer.test.tsx`

New right-pane layout (6 rows):

| Row | Content                                                       |
| --- | ------------------------------------------------------------- |
| 1   | `How many piles of 4 stalks in the RIGHT heap?` (single line) |
| 2   | `(valid 0 to 12)` — dim ANSI                                  |
| 3   | input box top                                                 |
| 4   | input box middle                                              |
| 5   | input box bottom                                              |
| 6   | blank                                                         |

`questionPanelRows` returns just rows 1–2 (2 rows). `focusedInputBoxRows` returns rows 3–5 (3 rows). The trailing blank (row 6) is added by `<ManualCastingPrompt>`. In resolved state, the panel returns 2 rows (`'Resolved.'`, `'Enter to advance (or wait 2.5 s)'`) and the input rows collapse to 3 blanks — total 5 rows of content + 1 blank padded to 6.

- [ ] **Step 1: Update unit tests for `questionPanelRows`**

In `packages/casting-ui/tests/casting-prompt-box.test.tsx`, find the `describe('questionPanelRows', ...)` block. Replace its tests:

```ts
describe('questionPanelRows', () => {
  it('returns a single-line question + parens range hint for each piles field', () => {
    const rows = questionPanelRows({
      focusedField: 'pilesL',
      unpartedStalks: 49,
      state: 'editing',
    })
    expect(rows).toHaveLength(2)
    expect(rows[0]).toBe('How many piles of 4 stalks in the LEFT heap?')
    // oxlint-disable-next-line no-control-regex
    expect(rows[1]).toMatch(/^\[2m\(valid 0 to 12\)\[22m$/)
  })

  it('returns single-line question for each remainder field', () => {
    const rows = questionPanelRows({
      focusedField: 'remL',
      unpartedStalks: 49,
      state: 'editing',
    })
    expect(rows[0]).toBe('How many leftover stalks in the LEFT heap?')
    // oxlint-disable-next-line no-control-regex
    expect(rows[1]).toMatch(/^\[2m\(valid 1 to 4\)\[22m$/)
  })

  it('returns RIGHT-heap variants', () => {
    expect(
      questionPanelRows({
        focusedField: 'pilesR',
        unpartedStalks: 49,
        state: 'editing',
      })[0],
    ).toBe('How many piles of 4 stalks in the RIGHT heap?')
    expect(
      questionPanelRows({
        focusedField: 'remR',
        unpartedStalks: 49,
        state: 'editing',
      })[0],
    ).toBe('How many leftover stalks in the RIGHT heap?')
  })

  it('computes piles range from unparted/4', () => {
    const rows = questionPanelRows({
      focusedField: 'pilesL',
      unpartedStalks: 40,
      state: 'editing',
    })
    // oxlint-disable-next-line no-control-regex
    expect(rows[1]).toMatch(/\(valid 0 to 10\)/)
  })

  it('returns the resolved 2-row panel after commit', () => {
    expect(
      questionPanelRows({
        focusedField: 'pilesL',
        unpartedStalks: 49,
        state: 'resolved',
      }),
    ).toEqual(['Resolved.', 'Enter to advance (or wait 2.5 s)'])
  })
})
```

(If the file had a "3-row panel" baseline, replace it wholesale with the above.)

- [ ] **Step 2: Run the tests, confirm they fail**

Run: `pnpm --filter @hexagram/casting-ui test -- casting-prompt-box.test.tsx -t 'questionPanelRows'`
Expected: FAIL — current panel returns 3 rows, no parens, pre-wrapped questions.

- [ ] **Step 3: Update `questionLinesForField` + `questionPanelRows`**

Replace:

```ts
function questionLinesForField(
  field: ManualFocusedField,
): readonly [string, string] {
  switch (field) {
    case 'pilesL':
      return ['How many piles of 4 stalks', 'in the LEFT heap?']
    case 'remL':
      return ['How many leftover stalks', 'in the LEFT heap?']
    case 'pilesR':
      return ['How many piles of 4 stalks', 'in the RIGHT heap?']
    case 'remR':
      return ['How many leftover stalks', 'in the RIGHT heap?']
  }
}
```

With:

```ts
function questionLineForField(field: ManualFocusedField): string {
  switch (field) {
    case 'pilesL':
      return 'How many piles of 4 stalks in the LEFT heap?'
    case 'remL':
      return 'How many leftover stalks in the LEFT heap?'
    case 'pilesR':
      return 'How many piles of 4 stalks in the RIGHT heap?'
    case 'remR':
      return 'How many leftover stalks in the RIGHT heap?'
  }
}
```

Then update `questionPanelRows`:

```ts
/**
 * Right-half question + dim parenthesised range hint (editing) or the
 * calm `Resolved.` / `Enter to advance` 2-line summary (resolved).
 * Always returns exactly 2 rows; the caller (`<ManualCastingPrompt>`)
 * pads the right pane to 6 rows with the input box + a trailing blank.
 *
 * Dim ANSI is `[2m...[22m` (matches Ink's `<Text dimColor>`).
 */
export function questionPanelRows(args: QuestionPanelRowsArgs): string[] {
  const { focusedField, unpartedStalks, state } = args
  if (state === 'resolved') {
    return ['Resolved.', 'Enter to advance (or wait 2.5 s)']
  }
  const pilesMax = Math.max(0, Math.floor(unpartedStalks / 4))
  const hintText =
    focusedField === 'pilesL' || focusedField === 'pilesR'
      ? `(valid 0 to ${pilesMax})`
      : '(valid 1 to 4)'
  return [questionLineForField(focusedField), `[2m${hintText}[22m`]
}
```

- [ ] **Step 4: Update `<ManualCastingPrompt>` right-pane composition**

The current code builds the right pane as `[...qRows, ...inputRows]` where qRows has 3 entries and inputRows has 3 entries — total 6. With qRows now 2 entries and inputRows still 3, total is 5. Pad with a trailing blank.

Find this block in `<ManualCastingPrompt>`:

```ts
const qRows = questionPanelRows({
  focusedField,
  unpartedStalks,
  state: diagramState === 'resolved' ? 'resolved' : 'editing',
})
const inputRows =
  committed === null
    ? focusedInputBoxRows({
        value: manualBufferForField(focusedField, {
          pilesLBuffer,
          remLBuffer,
          pilesRBuffer,
          remRBuffer,
        }),
        focused: true,
      })
    : ['', '', '']
const rightRows = [...qRows, ...inputRows]
```

Replace with:

```ts
const qRows = questionPanelRows({
  focusedField,
  unpartedStalks,
  state: diagramState === 'resolved' ? 'resolved' : 'editing',
})
const inputRows =
  committed === null
    ? focusedInputBoxRows({
        value: manualBufferForField(focusedField, {
          pilesLBuffer,
          remLBuffer,
          pilesRBuffer,
          remRBuffer,
        }),
        focused: true,
      })
    : ['', '', '']
// Right pane: 2 question rows + 3 input box rows + 1 trailing blank = 6
// rows, aligned with the 6 diagram rows on the left half.
const rightRows = [...qRows, ...inputRows, '']
```

- [ ] **Step 5: Run unit + integration tests**

Run: `pnpm --filter @hexagram/casting-ui test -- casting-prompt-box.test.tsx -t 'questionPanelRows'`
Expected: PASS.

Run: `pnpm --filter @hexagram/casting-ui test -- viewer.test.tsx 2>&1 | grep -E '(FAIL|✗|Error)' | head -30`

For each viewer-test failure, locate the broken assertion. Common patterns to update:

- `toContain('in the LEFT heap?')` → keep (still present)
- Tests that assert `How many leftover stalks` and `in the LEFT heap?` appear on **separate** rows must be changed to assert they appear together on one row.
- Tests asserting `valid 0 to 12` need parens added: `(valid 0 to 12)`.

Iterate until clean.

- [ ] **Step 6: Run the full casting-ui suite + type check**

Run: `pnpm --filter @hexagram/casting-ui test && pnpm --filter @hexagram/casting-ui type:check`
Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add packages/casting-ui/src/casting-prompt-box.tsx packages/casting-ui/tests/casting-prompt-box.test.tsx packages/casting-ui/tests/viewer.test.tsx
git commit -m "$(cat <<'EOF'
refactor(casting-prompt): flatten manual question panel to single-line + (valid …) hint

Each question now renders on one line ("How many piles of 4 stalks in
the RIGHT heap?") with the range hint in parens immediately below
("(valid 0 to 12)"). Resolved state collapses to 2 rows ("Resolved." /
"Enter to advance (or wait 2.5 s)"). Right pane pads to 6 rows in the
parent composition (2 question + 3 input box + 1 trailing blank).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase 6: Input box — wider interior (8 → 13)

**Files:**

- Modify: `packages/casting-ui/src/casting-prompt-box.tsx` (`focusedInputBoxRows`)
- Modify: `packages/casting-ui/tests/casting-prompt-box.test.tsx`

The drawn input box widens from 8 to 13 cols interior to match the mockup (`┌─────────────┐`).

- [ ] **Step 1: Update unit tests for `focusedInputBoxRows`**

In `packages/casting-ui/tests/casting-prompt-box.test.tsx`, find the `describe('focusedInputBoxRows', ...)` block. Update the box-width assertions:

```ts
it('renders a 3-row drawn box with a 13-col interior', () => {
  const rows = focusedInputBoxRows({ value: '', focused: true })
  expect(rows).toHaveLength(3)
  expect(rows[0]).toBe('┌─────────────┐') // 13 dashes between corners
  expect(rows[2]).toBe('└─────────────┘')
  // Middle row is 15 cols including borders.
  expect(stringWidth(rows[1]!)).toBe(15)
})

it('inverse-video cursor follows the value when focused', () => {
  const rows = focusedInputBoxRows({ value: '42', focused: true })
  // oxlint-disable-next-line no-control-regex
  expect(rows[1]).toMatch(/42\[7m \[27m/)
})

it('renders no cursor when not focused', () => {
  const rows = focusedInputBoxRows({ value: '42', focused: false })
  // oxlint-disable-next-line no-control-regex
  expect(rows[1]).not.toMatch(/\[7m/)
})
```

- [ ] **Step 2: Run the tests, confirm they fail**

Run: `pnpm --filter @hexagram/casting-ui test -- casting-prompt-box.test.tsx -t 'focusedInputBoxRows'`
Expected: FAIL — current box has 8-col interior.

- [ ] **Step 3: Update `focusedInputBoxRows`**

```ts
export function focusedInputBoxRows(args: FocusedInputBoxRowsArgs): string[] {
  const interior = 13
  const top = `┌${'─'.repeat(interior)}┐`
  const bottom = `└${'─'.repeat(interior)}┘`
  const cursor = args.focused ? '[7m [27m' : ' '
  // value + cursor sits inside `interior` cols; cursor is 1 display col.
  const valueCols = args.value.length
  const cursorCols = 1
  // 1-col left margin; trailing pad fills the remainder.
  const leading = 1
  const trailingPad = Math.max(0, interior - leading - valueCols - cursorCols)
  const middle = `│${' '.repeat(leading)}${args.value}${cursor}${' '.repeat(trailingPad)}│`
  return [top, middle, bottom]
}
```

(Margin shrinks from 3 → 1 because the box is now plenty wide; users get more room for multi-digit values.)

- [ ] **Step 4: Run the unit tests, confirm pass**

Run: `pnpm --filter @hexagram/casting-ui test -- casting-prompt-box.test.tsx -t 'focusedInputBoxRows'`
Expected: PASS.

- [ ] **Step 5: Run the full casting-ui suite + type check**

Run: `pnpm --filter @hexagram/casting-ui test && pnpm --filter @hexagram/casting-ui type:check`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add packages/casting-ui/src/casting-prompt-box.tsx packages/casting-ui/tests/casting-prompt-box.test.tsx
git commit -m "$(cat <<'EOF'
refactor(casting-prompt): widen manual input box interior 8→13 cols

Matches the redesigned right pane proportions. Cursor and margin
behaviour unchanged in shape (1-col leading pad, inverse-space cursor
when focused, plain space when not).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase 7: Verification — full suite + Phase 7 byte-identity proof + stress test

**Files:** (none modified — verification only)

- [ ] **Step 1: Run the casting-ui suite with byte-identity test explicitly**

Run: `pnpm --filter @hexagram/casting-ui test -- viewer.test.tsx -t 'byte-identical'`
Expected: PASS in ~7s, single test.

- [ ] **Step 2: Run the full workspace test suite**

Run: `pnpm test 2>&1 | tail -20`
Expected: all 10 packages pass; total ~348 tests (2 skipped is normal).

- [ ] **Step 3: Run lint + format check**

Run: `pnpm lint:check && pnpm format:check`
Expected: both clean. If oxfmt flags formatting issues, run `pnpm format:fix` and stage the result for the next commit.

- [ ] **Step 4: Run the type-check across the workspace**

Run: `pnpm type:check`
Expected: clean.

- [ ] **Step 5: Run the CI stress simulation (4× concurrent single-pass)**

Run: `pnpm test:stress:once 2>&1 | tail -20`
Expected: all green. This catches load-induced races that don't show on a quiet box.

- [ ] **Step 6: Manual smoke test in a real terminal**

Run: `pnpm hexagram-manual` (in a TTY shell, not piped) and walk through one full cast (18 splits). Specifically verify:

- Title reads `Line 1/6 · Cast 1/3   ● ○ ○ ○   Step 1 of 4` on entry.
- Heap cards have 6 rows including a visible `suspended   1` on RIGHT and an empty 4th row on LEFT.
- Single-line question with `(valid 0 to 12)` parens hint below it.
- Input box is wider (13-col interior).
- Bottom strip during editing reads `<N> of 49 stalks accounted` on the left and `Enter: next · Shift+Tab: back` on the right.
- **Bug-fix check:** Fill all four fields with conservation-failing values (e.g. `pL=5 rL=3 pR=4 rR=2`), Shift+Tab back to `pilesL` — the inverse-video focus cue must appear on the LEFT-piles cell.
- Press `Ctrl+C` to abort.

If anything diverges from the mockup or the byte-identity test trips, halt and re-open the implementer subagent for the affected phase.

- [ ] **Step 7: If `format:fix` produced changes, commit them**

```bash
git status --short
# If anything is unstaged from format:fix:
git add -u packages/casting-ui/
git commit -m "$(cat <<'EOF'
style: oxfmt formatting pass on manual prompt tweak

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

If `git status` is clean after Phase 6, skip this step.

---

## Phase 8: Land via cherry-pick + exit worktree

**Files:** (none modified — integration only)

Per the `[[project_integration_constraints]]` memory, this repo lands worktree branches by cherry-picking onto `main` (rebase and `branch -d` are permission-denied). User preference: linear history on `main`, no merge commits.

- [ ] **Step 1: Capture the worktree commit list for the cherry-pick**

Run: `git log --oneline main..HEAD`
Expected: a list of ~7 commits (Phase 1–6 + optional Phase 7 format pass), newest first.

- [ ] **Step 2: Note the commit SHAs**

Save the output of `git log --oneline main..HEAD` to the conversation so the controller can read SHAs back to the user after landing.

- [ ] **Step 3: Switch to the main repo root + check main is in sync with our base**

```bash
MAIN_ROOT="/Users/jiechao/Documents/ts-hexagram-generator"
cd "$MAIN_ROOT"
git log --oneline -3
```

Expected: HEAD at `3a5a721 style: oxfmt formatting pass on redesign files` (or whatever local-main was when the worktree branched).

- [ ] **Step 4: Cherry-pick the worktree's commits onto main**

Get the worktree's base commit (the merge-base with main at worktree creation):

```bash
cd "$MAIN_ROOT"
BASE=$(git merge-base main worktree-manual-prompt-tweak)
git cherry-pick "${BASE}..worktree-manual-prompt-tweak"
```

Expected: clean cherry-pick (no conflicts — the worktree branched from current main).

If conflicts arise (they shouldn't on a same-day single-feature branch), halt and ask the user how to proceed.

- [ ] **Step 5: Verify main's test suite still passes**

```bash
cd "$MAIN_ROOT"
pnpm test 2>&1 | tail -10
```

Expected: all 10 packages pass.

- [ ] **Step 6: Capture the new SHAs on main**

```bash
cd "$MAIN_ROOT"
git log --oneline -10
```

Save the output — these are the SHAs the user will be told are on main.

- [ ] **Step 7: Report back; do NOT push to origin**

Per CLAUDE.md ("DO NOT push to the remote repository unless the user explicitly asks"), leave the push to the user. Surface in the final report:

- new SHAs on main
- the Phase 7 byte-identity test passed
- the bug-fix manual verification result
- the worktree is preserved at `.claude/worktrees/manual-prompt-tweak` (per memory: `branch -d` is permission-denied; the user can clean up later via the `validating-stale-worktrees` skill)

- [ ] **Step 8: Exit the worktree (keep)**

The controller (not a subagent) will call `ExitWorktree({ action: "keep" })` once Phase 8 reports complete. Subagents should NOT call ExitWorktree.

---

## Self-Review checklist (pre-execution)

**Spec coverage:**

- [x] Bug fix: focus indicator in error state — Phase 1
- [x] Title dots `● ● ● ○` + capitalised `Step` — Phase 2
- [x] Heap card 6 rows, interior 17, `remainder` + `suspended` labels — Phase 4
- [x] RIGHT total includes +1 suspended — Phase 4
- [x] Single-line question + `(valid 0 to N)` parens hint — Phase 5
- [x] Input box interior 13 — Phase 6
- [x] Bottom strip editing-branch text — Phase 3
- [x] Byte-identity test untouched + verified — Phase 7
- [x] CI stress sim — Phase 7
- [x] Lint/format/type-check — Phase 7
- [x] Land via cherry-pick + linear history — Phase 8

**Type consistency:**

- `HEAP_CARD_INTERIOR` (17) used in `buildCardRows` AND `<ManualCastingPrompt>`'s `diagramWidth` formula.
- `buildCardRows` signature changes (adds `suspendedCell` parameter) — its single caller `twoHeapDiagramRows` updates in the same step.
- `questionLinesForField` → `questionLineForField` (rename + signature change from `[string, string]` → `string`); single caller is `questionPanelRows`, updated in the same step.

**No placeholders:** every step shows the exact code, exact command, and expected outcome.

---

## Execution path

Subagent-Driven (per the prior pattern in this session). The controller (this conversation) will:

1. Dispatch one implementer subagent per phase (Phases 1–6 are independent enough to subagent; Phase 7 + 8 are controller-driven verification + landing).
2. Spec-review then code-review each phase's output.
3. Mark each phase complete in TaskList as it lands.
4. After Phase 8, return to the user with the SHAs + the byte-identity proof + any spec ambiguities encountered.
