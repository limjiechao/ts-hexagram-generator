# Manual Casting Prompt Visual Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to execute this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-render `<ManualCastingPrompt>` in `packages/casting-ui/src/casting-prompt-box.tsx` from a stacked 4-field bracket layout to a side-by-side two-heap diagram + focused-input panel, per the 2026-05-28 spec — without changing the validator, the generator-advance path, save format, or the Phase 7 byte-identity contract. **Narrow-terminal `horizontalOffset` pan is implemented in v1** (mirroring `<SliderCastingPrompt>`'s `sliceAnsi` pattern).

**Architecture:** The manual prompt's body is rebuilt as a stack of pre-rendered ANSI text rows; each row is pre-padded to `renderWidth` and sliced with `sliceAnsi(row, horizontalOffset, horizontalOffset + innerContentWidth)`, exactly like `<SliderCastingPrompt>`. Decompose into four pure-text row-builders — `twoHeapDiagramRows()`, `questionPanelRows()`, `focusedInputBoxRows()`, `bottomStripRow()` — plus `manualTitleRow()` (already plain text). Digit-input handling moves into the parent `useInput` so the FocusedInputBox can be plain text (no `<NumberInput>` child). The existing `ManualCastingPrompt` state machine (4 `useState` buffers, `focusedField`, `committed`, reveal-dwell timer, witnesses) is preserved verbatim.

**Tech Stack:** TypeScript + React 19 + Ink, vitest + ink-testing-library, `slice-ansi` for horizontal pan, `string-width` for display-column measurement, oxlint + eslint.

**Spec:** `docs/superpowers/specs/2026-05-28-manual-prompt-redesign.md` (commit 97cd8cd in this worktree, cherry-picked from f6a6e67).

---

## Concrete decisions locked from the spec

These appear in multiple tasks; transcribed here so the implementer never has to flip back to the spec.

### ANSI palette

- Inverse: `\x1b[7m` + value + `\x1b[27m` (Ink's `<Text inverse>` emits this). In source we use the literal string `'\x1b[7m'` and `'\x1b[27m'`; in test assertions we match the substring `[7m` (the leading ESC is one byte but the captured frame text shows `[7m` after Ink strips/preserves the ESC).
- BOLD_RED / NORMAL / BOLD_GREEN: import `BOLD_RED`, `NORMAL`, `BOLD_GREEN` from `@hexagram/viewer-core` (already imported in the file). They are `'\x1b[1;91m'`, `'\x1b[0m'`, `'\x1b[1;92m'`.
- Bold green (full-card): `\x1b[1;32m` (same as `BOLD_GREEN` works at the substring level — assertions use `[1;92m` for the matching SGR). For the diagram resolved-state wrap, use `BOLD_GREEN` for consistency with the bottom strip's resolved branch (test assertions look for `[1;92m`).
- Dim text: `\x1b[2m` + content + `\x1b[22m` (Ink's `<Text dimColor>`). Use the substring helper `DIM = '\x1b[2m'` and `DIM_OFF = '\x1b[22m'` (declared locally in `casting-prompt-box.tsx` since this is the only consumer in the redesign).

### Title row (one line)

```
Line N/6 · Cast C/3   ●●○○   step 2 of 4
```

Dots: positions 0..idx are `●`, idx+1..3 are `○`, where `idx = MANUAL_FIELD_ORDER.indexOf(focusedField)` (0..3). When `committed !== null`, focusedField is still its last value (`remR` if the user committed normally) so the title shows `●●●● · step 4 of 4`.

### Question copy (per focusedField; from spec decision 3)

| focusedField | Question                                              | Range hint                |
| ------------ | ----------------------------------------------------- | ------------------------- |
| `pilesL`     | `How many piles of 4 stalks in the LEFT heap?`        | `valid 0 to ${pilesMax}`  |
| `remL`       | `How many leftover stalks in the LEFT heap?`          | `valid 1 to 4`            |
| `pilesR`     | `How many piles of 4 stalks in the RIGHT heap?`       | `valid 0 to ${pilesMax}`  |
| `remR`       | `How many leftover stalks in the RIGHT heap?`         | `valid 1 to 4`            |

`pilesMax = Math.max(0, Math.floor(unpartedStalks / 4))`. The hint row uses inline dim ANSI.

When `committed !== null`, the right panel renders:

```
Resolved.

Enter to advance (or wait 2.5 s)
```

(three rows: text / blank / text). `2.5 s` is literal — see spec.

### Diagram cells (the two heap cards)

```
┌── LEFT HEAP ──┐    ┌── RIGHT HEAP ──┐
│  piles    5   │    │  piles    ?    │
│  rem.     1   │    │  rem.     ?    │
│  = 21 stalks  │    │  = ? stalks    │
└───────────────┘    └────────────────┘
```

- Box-drawn `┌` / `│` / `└` etc. The card interiors are 13 cols wide; LEFT and RIGHT headers fit by design. The total row width for one card is 17 display cols.
- `piles` / `rem.` cell values: `?` when null, else the integer right-aligned in a 1-col cell (single digit) or 2-col (two-digit; piles can reach 12).
- The active cell (whose buffer the user is typing into) wraps the value in inverse-video ANSI. An empty active cell renders as an inverse space (`\x1b[7m \x1b[27m`).
- The `= X stalks` row sums `4*piles + rem`. If either is null, the row reads `= ? stalks`. Right-pad each card's totals row to the card's interior width.
- When `state === 'resolved'`, every text node inside both cards renders bold-green by wrapping the card's complete text rows in `BOLD_GREEN ... NORMAL` (per row).

### FocusedInputBox

```
┌────────┐
│   1█   │
└────────┘
```

8-col interior. Pure text — no `<NumberInput>` inside; digit-handling lives in the parent `useInput` (see Phase 7.0). The `█` glyph is the cursor (an inverse space). When `focused`, the cursor renders right after the value text. The `value` is left-padded in a 3-col cell so single-digit values centre nicely. (Concrete cell content: `   {value}{cursor}   ` for empty value+cursor; `   1{cursor}   ` for `value="1"`.)

### Bottom strip (one row; three branches)

| Branch     | Left segment                                                                                                              | Right segment                   |
| ---------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| Editing    | `· 1 suspended · total ${liveLeftTotal + liveRightTotal} of ${unpartedStalks}`                                            | `Enter: next · Shift+Tab: back` |
| Error      | `BOLD_RED <validator-derived> NORMAL`                                                                                     | `Shift+Tab: back to fix`        |
| Resolved   | `BOLD_GREEN · 1 suspended · ${leftHeapTotal + rightHeapTotal} of ${unpartedStalks} · → next cast: ${next} unparted NORMAL` | (suppressed — empty)            |

**Error left-segment text by validator kind:**

- `conservation`: `${leftHeapTotal} + ${rightHeapTotal} + 1 = ${total}, expected ${unparted}`
- `suspended-sum`: `Suspended sum (1 + ${remL} + ${remR}) = ${sum}, expected ${expectedLabel}`
- `zero-remainder`: `${side} remainder = 0 — divisible heaps yield rem 4, not 0`
  Where `side` is `'Left'`, `'Right'`, or `'Left and right'`.

The strip is built as one string: `padEnd(left, leftWidth) + right`, where `leftWidth = renderWidth - stringWidth(right)`. Right segment is suppressed (empty string) on the resolved branch.

### Layout / row composition

The 9 content rows of the manual prompt:

| # | Source                          | Width (natural)                       |
|---|----------------------------------|---------------------------------------|
| 1 | `manualTitleRow(...)`           | ~42 cols                              |
| 2 | empty row                       | 0                                     |
| 3-7 | diagram (5 rows) `+` right pane (3 q-panel rows + 3 input-box rows = 6 rows) | combined via per-row horizontal concat (left + gap + right) |
| 8 | (filler — 6th body row, left half is blank, right half is input-box bottom border) | combined |
| 9 | `bottomStripRow(...)`           | ~70 cols                              |

The body is 6 rows tall. The diagram contributes rows 0-4 on the left; row 5 on the left is blank padding. The right pane contributes question (rows 0-1), hint (row 2), input box (rows 3-5).

`composeBodyRow(leftRow: string, rightRow: string, leftWidth: number, gap: number, renderWidth: number)` produces the full-width row by left-padding leftRow to `leftWidth`, inserting `' '.repeat(gap)`, then rightRow, then right-padding the whole thing to `renderWidth`.

### Inner content width

`innerContentWidth = Math.max(1, width - 2)` (same convention as `<SliderCastingPrompt>`).
`renderWidth = Math.max(innerContentWidth, naturalBodyWidth)` where `naturalBodyWidth` is `leftWidth + gap + rightPaneWidth` ≈ `17 + 17 + 4 + 35` = 73 cols.

Each row is `sliceAnsi(row, horizontalOffset, horizontalOffset + innerContentWidth)`. When `horizontalOffset === 0` and `renderWidth === innerContentWidth`, this is a no-op.

---

## File structure

- Modify: `packages/casting-ui/src/casting-prompt-box.tsx`
  - Rewrite JSDoc of `getCastingPromptHeight` (no value change).
  - Extend `ManualValidationResult` `conservation` variant with `leftHeapTotal` + `rightHeapTotal`.
  - Add module-scope `MANUAL_FIELD_ORDER` constant.
  - Add exports (helpers): `manualTitleRow`, `twoHeapDiagramRows`, `questionPanelRows`, `focusedInputBoxRows`, `bottomStripRow`, `composeManualBodyRow`.
  - Rewrite `<ManualCastingPrompt>`'s render tree to use the new row builders + `sliceAnsi` pan. Add digit/backspace handling to the parent `useInput`. Thread `horizontalOffset` through.
  - Delete `<ManualNumberField>` (its responsibility merges into the row builders + parent useInput).
  - Thread `horizontalOffset` through `<CastingPromptBox>`'s manual branch.

- Modify: `packages/casting-ui/tests/casting-prompt-box.test.tsx`
  - Unit tests for each new helper / row builder.
  - Update existing manual-flow tests that asserted the old SPLIT-row / `[_]`-bracket text.
  - Add a horizontal-pan integration test for `<ManualCastingPrompt>`.
  - Add a digit-input handling test (parent `useInput` accepts digits / backspace / enforces bounds).

- Modify: `packages/casting-ui/tests/viewer.test.tsx`
  - The 4 existing manual-flow `commitManualCast` tests stay — they assert behaviour, not text. They are the Phase 7 byte-identity gate.

- No other files change.

---

## Phase 1: validator extension (`conservation` carries heap totals)

### Task 1.1: extend `validateManualInput` `conservation` result with heap totals

**Files:**
- Modify: `packages/casting-ui/src/casting-prompt-box.tsx` (`ManualValidationResult` union and the `conservation` return statement).
- Test: `packages/casting-ui/tests/casting-prompt-box.test.tsx` (new unit test in the `validateManualInput` describe block).

- [ ] **Step 1: Add a failing test**

  Find the `validateManualInput` `describe` block and add:

  ```tsx
  it('conservation result carries heap totals for downstream rendering', () => {
    const result = validateManualInput({
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
  ```

- [ ] **Step 2: Run + confirm failure**

  `pnpm --filter @hexagram/casting-ui test -- -t 'conservation result carries heap totals'` → FAIL.

- [ ] **Step 3: Extend the `conservation` variant + return statement**

  ```ts
  | {
      kind: 'conservation'
      total: number
      unparted: number
      leftHeapTotal: number
      rightHeapTotal: number
    }
  ```

  ```ts
  return { kind: 'conservation', total, unparted, leftHeapTotal, rightHeapTotal }
  ```

- [ ] **Step 4: Run + confirm PASS**

  `pnpm --filter @hexagram/casting-ui test -- -t 'conservation result carries heap totals'` → PASS.

- [ ] **Step 5: Run full casting-ui suite**

  `pnpm --filter @hexagram/casting-ui test` → all PASS.

- [ ] **Step 6: Commit**

  ```bash
  git add packages/casting-ui/src/casting-prompt-box.tsx packages/casting-ui/tests/casting-prompt-box.test.tsx
  git commit -m "$(cat <<'EOF'
  refactor(casting-prompt): extend conservation result with heap totals

  The forthcoming bottom-strip error branch needs both heap totals to
  render `lhs + rhs + 1 = total, expected M`. Carry them on the validator
  result instead of recomputing in the render layer.

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

---

## Phase 2: groundwork — JSDoc + `manualTitleRow` + `MANUAL_FIELD_ORDER`

### Task 2.1: rewrite `getCastingPromptHeight` JSDoc

**Files:**
- Modify: `packages/casting-ui/src/casting-prompt-box.tsx` (JSDoc above `getCastingPromptHeight`).

- [ ] **Step 1: Replace the stale manual-layout bullet**

  Find the old `manual flow → always 11 — title / blank / unparted / ...` paragraph and replace with:

  ```
   *   manual flow → always 11 — title row (with inline ●●○○ progress dots) /
   *                 blank / 6-row side-by-side body (LEFT card + RIGHT card
   *                 on the left half; question + dim range hint + 3-row
   *                 drawn-box input on the right half) / bottom strip
   *                 → 9 content rows + 2 border. The bottom strip renders
   *                 one of three branches: editing (live totals + commit
   *                 hint), error (BOLD_RED validator message + back-to-fix
   *                 hint), or resolved (BOLD_GREEN totals + next-cast
   *                 unparted, no right hint). All rows are pre-built ANSI
   *                 text and sliced by `horizontalOffset` for the viewer's
   *                 narrow-terminal `<` / `>` pan, exactly like the slider
   *                 prompt.
  ```

- [ ] **Step 2: Confirm height still 11**

  `pnpm --filter @hexagram/casting-ui test -- -t 'returns 11 for manual flow'` → PASS.

- [ ] **Step 3: Commit**

  ```bash
  git add packages/casting-ui/src/casting-prompt-box.tsx
  git commit -m "$(cat <<'EOF'
  docs(casting-prompt): rewrite manual-flow height JSDoc for new layout

  The body breakdown listed in the JSDoc no longer matches the rendered
  output — replace it with the side-by-side heap-card description.

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

### Task 2.2: add `MANUAL_FIELD_ORDER` + `manualTitleRow`

**Files:**
- Modify: `packages/casting-ui/src/casting-prompt-box.tsx` (just below `export type ManualFocusedField = ...`).
- Test: `packages/casting-ui/tests/casting-prompt-box.test.tsx` (new top-level describe).

- [ ] **Step 1: Add failing test**

  Add a new top-level describe AFTER the `CastingPromptBox` describe (around line 968):

  ```tsx
  describe('manualTitleRow', () => {
    it('renders line / cast / dots / step for each focused field', () => {
      expect(manualTitleRow(3, 1, 'pilesL')).toBe(
        'Line 3/6 · Cast 2/3   ●○○○   step 1 of 4',
      )
      expect(manualTitleRow(3, 1, 'remL')).toBe(
        'Line 3/6 · Cast 2/3   ●●○○   step 2 of 4',
      )
      expect(manualTitleRow(3, 1, 'pilesR')).toBe(
        'Line 3/6 · Cast 2/3   ●●●○   step 3 of 4',
      )
      expect(manualTitleRow(3, 1, 'remR')).toBe(
        'Line 3/6 · Cast 2/3   ●●●●   step 4 of 4',
      )
    })
  })
  ```

  Update the import block at the top of the file to include `manualTitleRow`.

- [ ] **Step 2: Run + confirm failure**

  `pnpm --filter @hexagram/casting-ui test -- -t manualTitleRow` → FAIL.

- [ ] **Step 3: Implement `MANUAL_FIELD_ORDER` + `manualTitleRow`**

  In the `// ── Manual flow` section, below the `export type ManualFocusedField = ...` line:

  ```ts
  const MANUAL_FIELD_ORDER: readonly ManualFocusedField[] = [
    'pilesL',
    'remL',
    'pilesR',
    'remR',
  ] as const

  /**
   * One-line manual-flow title: `Line N/6 · Cast C/3   ●●○○   step P of 4`.
   * Dots: positions ≤ focusedField's index are `●`, the rest `○`.
   */
  export function manualTitleRow(
    lineNumber: number,
    castIndex: number,
    focusedField: ManualFocusedField,
  ): string {
    const stepIndex = MANUAL_FIELD_ORDER.indexOf(focusedField)
    const dots = MANUAL_FIELD_ORDER.map((_, i) => (i <= stepIndex ? '●' : '○')).join('')
    return `Line ${lineNumber}/6 · Cast ${castIndex + 1}/3   ${dots}   step ${stepIndex + 1} of 4`
  }
  ```

  Refactor the existing `useInput` Tab branch in `ManualCastingPrompt` to use the shared constant (deleting the local `const order: ManualFocusedField[] = [...]`):

  ```ts
  if (key.tab) {
    const current = MANUAL_FIELD_ORDER.indexOf(focusedField)
    const step = key.shift ? -1 : 1
    const next = MANUAL_FIELD_ORDER[(current + step + MANUAL_FIELD_ORDER.length) % MANUAL_FIELD_ORDER.length]!
    setFocusedField(next)
    return
  }
  ```

- [ ] **Step 4: Run + confirm PASS**

  `pnpm --filter @hexagram/casting-ui test -- -t manualTitleRow` → PASS.

- [ ] **Step 5: Full suite + commit**

  ```bash
  pnpm --filter @hexagram/casting-ui test
  git add packages/casting-ui/src/casting-prompt-box.tsx packages/casting-ui/tests/casting-prompt-box.test.tsx
  git commit -m "$(cat <<'EOF'
  feat(casting-prompt): add manualTitleRow + MANUAL_FIELD_ORDER

  Pure helper for the redesigned manual prompt's title row. Hoists the
  four-field cycle to a module-scope const so the title, the forthcoming
  diagram, and the useInput Tab handler share one source of truth.

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

---

## Phase 3: `twoHeapDiagramRows()` — pure-text row builder

### Task 3.1: implement + test `twoHeapDiagramRows`

**Files:**
- Modify: `packages/casting-ui/src/casting-prompt-box.tsx`.
- Test: `packages/casting-ui/tests/casting-prompt-box.test.tsx`.

- [ ] **Step 1: Write failing tests**

  Add a new top-level `describe` after the `manualTitleRow` describe:

  ```tsx
  describe('twoHeapDiagramRows', () => {
    it('returns 5 rows; cells render ? for null, value for typed, inverse for active', () => {
      const rows = twoHeapDiagramRows({
        pilesL: 5,
        remL: 1,
        pilesR: null,
        remR: null,
        focusedField: 'remL',
        state: 'editing',
      })
      expect(rows).toHaveLength(5)
      // Header row.
      expect(rows[0]).toContain('LEFT HEAP')
      expect(rows[0]).toContain('RIGHT HEAP')
      // Piles row: 5 (LEFT) and ? (RIGHT).
      expect(rows[1]).toMatch(/piles\s+5/)
      expect(rows[1]).toMatch(/piles\s+\?/)
      // Rem row: active LEFT cell wears inverse-video ANSI; RIGHT is ?.
      expect(rows[2]).toMatch(/rem\.\s+\x1b\[7m1\x1b\[27m/)
      expect(rows[2]).toMatch(/rem\.\s+\?/)
      // Totals row.
      expect(rows[3]).toContain('= 21 stalks')
      expect(rows[3]).toContain('= ? stalks')
      // Footer row.
      expect(rows[4]).toContain('└')
    })

    it('wraps both cards in BOLD_GREEN when state === resolved', () => {
      const rows = twoHeapDiagramRows({
        pilesL: 5,
        remL: 4,
        pilesR: 5,
        remR: 4,
        focusedField: 'remR',
        state: 'resolved',
      })
      // Every row contains the BOLD_GREEN open sequence and NORMAL close.
      for (const row of rows) {
        expect(row).toContain('\x1b[1;92m')
        expect(row).toContain('\x1b[0m')
      }
      // No inverse-video in resolved state.
      for (const row of rows) {
        expect(row).not.toMatch(/\x1b\[7m/)
      }
    })

    it('renders an inverse-space cursor when the active cell is empty', () => {
      const rows = twoHeapDiagramRows({
        pilesL: null,
        remL: null,
        pilesR: null,
        remR: null,
        focusedField: 'pilesL',
        state: 'editing',
      })
      // Active pilesL cell is empty → inverse space.
      expect(rows[1]).toMatch(/piles\s+\x1b\[7m \x1b\[27m/)
    })
  })
  ```

  Add `twoHeapDiagramRows` to the import.

- [ ] **Step 2: Run + confirm failure**

- [ ] **Step 3: Implement `twoHeapDiagramRows`**

  In `casting-prompt-box.tsx`, after `manualTitleRow`:

  ```ts
  type ManualDiagramState = 'editing' | 'error' | 'resolved'

  interface TwoHeapDiagramRowsArgs {
    pilesL: number | null
    remL: number | null
    pilesR: number | null
    remR: number | null
    focusedField: ManualFocusedField
    state: ManualDiagramState
  }

  // Card interior width (between the two vertical pipes) — 13 cols.
  // Header, piles row, rem row, totals row all pad to this interior width.
  const HEAP_CARD_INNER_WIDTH = 13

  function renderCellText(
    value: number | null,
    field: ManualFocusedField,
    focusedField: ManualFocusedField,
    state: ManualDiagramState,
  ): string {
    if (focusedField === field && state === 'editing') {
      const inner = value === null ? ' ' : String(value)
      return `\x1b[7m${inner}\x1b[27m`
    }
    return value === null ? '?' : String(value)
  }

  // pad/format a single card's 5 row contents into the card's exact glyph form
  // (5 rows: header, piles, rem, totals, footer). Each row is exactly
  // `HEAP_CARD_INNER_WIDTH + 2` display cols (1 col for each `│`).
  function buildCardRows(
    header: string,
    pilesCell: string,
    remCell: string,
    totalLabel: string,
  ): readonly string[] {
    const interior = HEAP_CARD_INNER_WIDTH
    // Headers like `LEFT HEAP` / `RIGHT HEAP` — pad with `─` to interior width.
    const headerFill = '─'.repeat(Math.max(0, interior - header.length - 2))
    const headerRow = `┌─ ${header} ${headerFill}┐`
    // Field rows: `│  piles    {cell}   │`. The pre-cell padding (`piles    `)
    // is 11 chars; the post-cell padding is `interior - 11 - displayWidth(cell)`
    // where displayWidth ignores ANSI. We compute via string-width's stripping.
    const cellDisplayWidth = (cell: string): number => stringWidth(cell)
    const buildFieldRow = (label: string, cell: string): string => {
      const leadingPad = `  ${label}`.padEnd(11, ' ')
      const trailing = interior - 11 - cellDisplayWidth(cell)
      return `│${leadingPad}${cell}${' '.repeat(Math.max(0, trailing))}│`
    }
    const totalsRow = `│  = ${totalLabel} stalks`.padEnd(interior + 1, ' ') + '│'
    const footerRow = `└${'─'.repeat(interior)}┘`
    return [
      headerRow.padEnd(interior + 2, ' '),
      buildFieldRow('piles', pilesCell),
      buildFieldRow('rem.', remCell),
      totalsRow,
      footerRow,
    ]
  }

  /**
   * Build the 5-row LEFT + RIGHT heap card pair as pre-rendered text rows.
   * Each returned row contains both cards joined by a 4-col gap (`'    '`).
   * Active cells render inverse-video; resolved state wraps each row in
   * BOLD_GREEN ... NORMAL. Pure function — no Ink involvement.
   */
  export function twoHeapDiagramRows(args: TwoHeapDiagramRowsArgs): string[] {
    const { pilesL, remL, pilesR, remR, focusedField, state } = args
    const pilesLCell = renderCellText(pilesL, 'pilesL', focusedField, state)
    const remLCell = renderCellText(remL, 'remL', focusedField, state)
    const pilesRCell = renderCellText(pilesR, 'pilesR', focusedField, state)
    const remRCell = renderCellText(remR, 'remR', focusedField, state)
    const leftTotal =
      pilesL === null || remL === null ? '?' : String(4 * pilesL + remL)
    const rightTotal =
      pilesR === null || remR === null ? '?' : String(4 * pilesR + remR)
    const leftRows = buildCardRows('LEFT HEAP', pilesLCell, remLCell, leftTotal)
    const rightRows = buildCardRows('RIGHT HEAP', pilesRCell, remRCell, rightTotal)
    const gap = '    '
    const combined = leftRows.map((row, i) => `${row}${gap}${rightRows[i]!}`)
    if (state === 'resolved') {
      return combined.map((row) => `${BOLD_GREEN}${row}${NORMAL}`)
    }
    return combined
  }
  ```

  Note: the exact column widths can be tuned in code; tests assert substrings, not exact column positions.

- [ ] **Step 4: Run + confirm PASS for all three tests**

- [ ] **Step 5: Commit**

  ```bash
  git add packages/casting-ui/src/casting-prompt-box.tsx packages/casting-ui/tests/casting-prompt-box.test.tsx
  git commit -m "$(cat <<'EOF'
  feat(casting-prompt): add twoHeapDiagramRows row-builder

  Pure text-row builder that emits the 5-row LEFT/RIGHT heap card pair
  for the manual prompt's redesigned body. Cells render ? for null, the
  integer for typed values, and inverse-video ANSI for the focused cell.
  Resolved state wraps every row in BOLD_GREEN ... NORMAL. This is one
  of four row-builders the new prompt composes + slices via sliceAnsi
  for the narrow-terminal pan.

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

---

## Phase 4: `questionPanelRows()` — pure-text row builder

### Task 4.1: implement + test `questionPanelRows`

**Files:**
- Modify: `packages/casting-ui/src/casting-prompt-box.tsx`.
- Test: `packages/casting-ui/tests/casting-prompt-box.test.tsx`.

- [ ] **Step 1: Write failing tests**

  ```tsx
  describe('questionPanelRows', () => {
    it('returns 3 rows: question / blank-ish / dim hint for each field', () => {
      const rows = questionPanelRows({
        focusedField: 'pilesL',
        unpartedStalks: 49,
        state: 'editing',
      })
      expect(rows).toHaveLength(3)
      expect(rows[0]).toContain('How many piles of 4 stalks in the LEFT heap?')
      // Dim ANSI on the range hint row.
      expect(rows[2]).toContain('\x1b[2m')
      expect(rows[2]).toContain('valid 0 to 12')
      expect(rows[2]).toContain('\x1b[22m')
    })

    it('emits valid 1 to 4 for remainder fields', () => {
      const rows = questionPanelRows({
        focusedField: 'remR',
        unpartedStalks: 49,
        state: 'editing',
      })
      expect(rows[2]).toContain('valid 1 to 4')
    })

    it('returns the Resolved. three-line block in resolved state', () => {
      const rows = questionPanelRows({
        focusedField: 'remR',
        unpartedStalks: 49,
        state: 'resolved',
      })
      expect(rows).toHaveLength(3)
      expect(rows[0]).toContain('Resolved.')
      expect(rows[1].trim()).toBe('')
      expect(rows[2]).toContain('Enter to advance (or wait 2.5 s)')
      // Dim hint must NOT appear.
      expect(rows.join('\n')).not.toMatch(/valid \d+ to \d+/)
    })
  })
  ```

  Add `questionPanelRows` to import.

- [ ] **Step 2: Run + confirm failure**

- [ ] **Step 3: Implement `questionPanelRows`**

  ```ts
  interface QuestionPanelRowsArgs {
    focusedField: ManualFocusedField
    unpartedStalks: number
    state: ManualDiagramState
  }

  function questionForField(field: ManualFocusedField): string {
    switch (field) {
      case 'pilesL': return 'How many piles of 4 stalks in the LEFT heap?'
      case 'remL':   return 'How many leftover stalks in the LEFT heap?'
      case 'pilesR': return 'How many piles of 4 stalks in the RIGHT heap?'
      case 'remR':   return 'How many leftover stalks in the RIGHT heap?'
    }
  }

  /**
   * Build the 3-row right-pane question + dim range hint (editing) or the
   * `Resolved.` / blank / `Enter to advance (or wait 2.5 s)` triple (resolved).
   */
  export function questionPanelRows(args: QuestionPanelRowsArgs): string[] {
    const { focusedField, unpartedStalks, state } = args
    if (state === 'resolved') {
      return ['Resolved.', '', 'Enter to advance (or wait 2.5 s)']
    }
    const pilesMax = Math.max(0, Math.floor(unpartedStalks / 4))
    const hint =
      focusedField === 'pilesL' || focusedField === 'pilesR'
        ? `valid 0 to ${pilesMax}`
        : 'valid 1 to 4'
    return [
      questionForField(focusedField),
      '',
      `\x1b[2m${hint}\x1b[22m`,
    ]
  }
  ```

- [ ] **Step 4: Run + confirm PASS**

- [ ] **Step 5: Commit**

  ```bash
  git add packages/casting-ui/src/casting-prompt-box.tsx packages/casting-ui/tests/casting-prompt-box.test.tsx
  git commit -m "$(cat <<'EOF'
  feat(casting-prompt): add questionPanelRows row-builder

  Pure text-row builder for the manual prompt's right-pane question +
  dim range hint (editing) and the Resolved. three-line block (resolved).

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

---

## Phase 5: `focusedInputBoxRows()` — pure-text row builder

### Task 5.1: implement + test `focusedInputBoxRows`

**Files:**
- Modify: `packages/casting-ui/src/casting-prompt-box.tsx`.
- Test: `packages/casting-ui/tests/casting-prompt-box.test.tsx`.

- [ ] **Step 1: Write failing tests**

  ```tsx
  describe('focusedInputBoxRows', () => {
    it('returns 3 rows: top border, value+cursor, bottom border', () => {
      const rows = focusedInputBoxRows({ value: '1', focused: true })
      expect(rows).toHaveLength(3)
      expect(rows[0]).toMatch(/┌─+┐/)
      expect(rows[2]).toMatch(/└─+┘/)
      // Middle row contains the value, vertical pipes, and an inverse-space cursor.
      expect(rows[1]).toContain('│')
      expect(rows[1]).toContain('1')
      expect(rows[1]).toMatch(/\x1b\[7m \x1b\[27m/)
    })

    it('renders an empty value (cursor-only middle) without crashing', () => {
      const rows = focusedInputBoxRows({ value: '', focused: true })
      expect(rows).toHaveLength(3)
      expect(rows[0]).toMatch(/┌─+┐/)
      expect(rows[1]).toContain('│')
      expect(rows[1]).toMatch(/\x1b\[7m \x1b\[27m/)
    })

    it('omits cursor when focused=false', () => {
      const rows = focusedInputBoxRows({ value: '3', focused: false })
      expect(rows[1]).toContain('3')
      expect(rows[1]).not.toMatch(/\x1b\[7m/)
    })
  })
  ```

  Add `focusedInputBoxRows` to import.

- [ ] **Step 2: Run + confirm failure**

- [ ] **Step 3: Implement `focusedInputBoxRows`**

  ```ts
  interface FocusedInputBoxRowsArgs {
    value: string
    focused: boolean
  }

  /**
   * Build the 3-row drawn box containing the manual prompt's current
   * value + cursor. 8-col interior; the value sits centred-ish, with the
   * cursor (an inverse space) right after the value when `focused`.
   *
   * No `<NumberInput>` inside — digit-handling lives in the parent
   * `useInput`, which keeps this builder pure.
   */
  export function focusedInputBoxRows(
    args: FocusedInputBoxRowsArgs,
  ): string[] {
    const interior = 8
    const top = `┌${'─'.repeat(interior)}┐`
    const bottom = `└${'─'.repeat(interior)}┘`
    const cursor = args.focused ? '\x1b[7m \x1b[27m' : ' '
    const content = `${args.value}${cursor}`
    // Display width of value + cursor (cursor is 1 col).
    const contentWidth = args.value.length + 1
    // Centre-ish: 3 leading spaces, value+cursor, padded with trailing spaces.
    const leading = 3
    const trailing = Math.max(0, interior - leading - contentWidth)
    const middle = `│${' '.repeat(leading)}${content}${' '.repeat(trailing)}│`
    return [top, middle, bottom]
  }
  ```

- [ ] **Step 4: Run + confirm PASS**

- [ ] **Step 5: Commit**

  ```bash
  git add packages/casting-ui/src/casting-prompt-box.tsx packages/casting-ui/tests/casting-prompt-box.test.tsx
  git commit -m "$(cat <<'EOF'
  feat(casting-prompt): add focusedInputBoxRows row-builder

  Pure text-row builder for the 3-row drawn input box. Digit-handling
  moves to the parent useInput in Phase 7, so this builder is plain
  text — no <NumberInput> child.

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

---

## Phase 6: `bottomStripRow()` — pure-text row builder

### Task 6.1: implement + test `bottomStripRow`

**Files:**
- Modify: `packages/casting-ui/src/casting-prompt-box.tsx`.
- Test: `packages/casting-ui/tests/casting-prompt-box.test.tsx`.

- [ ] **Step 1: Write failing tests**

  ```tsx
  describe('bottomStripRow', () => {
    it('editing branch — totals on the left, commit hint on the right', () => {
      const row = bottomStripRow({
        branch: 'editing',
        liveLeftTotal: 21,
        liveRightTotal: 0,
        unpartedStalks: 49,
        renderWidth: 78,
      })
      expect(row).toContain('· 1 suspended · total 21 of 49')
      expect(row).toContain('Enter: next · Shift+Tab: back')
      // The pad-between fills `renderWidth - leftWidth - rightWidth` spaces.
      expect(stringWidth(row)).toBe(78)
    })

    it('error branch — BOLD_RED conservation arithmetic + back-to-fix', () => {
      const row = bottomStripRow({
        branch: 'error',
        errorKind: 'conservation',
        leftHeapTotal: 21,
        rightHeapTotal: 26,
        total: 48,
        unpartedStalks: 49,
        renderWidth: 78,
      })
      expect(row).toContain('21 + 26 + 1 = 48, expected 49')
      expect(row).toContain('Shift+Tab: back to fix')
      expect(row).toContain('\x1b[1;91m')
    })

    it('error branch — suspended-sum message', () => {
      const row = bottomStripRow({
        branch: 'error',
        errorKind: 'suspended-sum',
        remL: 1,
        remR: 4,
        sum: 6,
        expectedLabel: '4 or 8',
        renderWidth: 78,
      })
      expect(row).toContain('Suspended sum (1 + 1 + 4) = 6, expected 4 or 8')
      expect(row).toContain('Shift+Tab: back to fix')
    })

    it('error branch — zero-remainder identifies side(s)', () => {
      const row = bottomStripRow({
        branch: 'error',
        errorKind: 'zero-remainder',
        remL: 2,
        remR: 0,
        renderWidth: 78,
      })
      expect(row).toContain('Right remainder = 0')
      expect(row).toContain('not 0')
    })

    it('resolved branch — BOLD_GREEN totals + next-cast; no right hint', () => {
      const row = bottomStripRow({
        branch: 'resolved',
        leftHeapTotal: 24,
        rightHeapTotal: 24,
        unpartedStalks: 49,
        next: 40,
        renderWidth: 78,
      })
      expect(row).toContain('· 1 suspended · 48 of 49 · → next cast: 40 unparted')
      expect(row).not.toContain('Enter: next')
      expect(row).not.toContain('Shift+Tab: back')
      expect(row).toContain('\x1b[1;92m')
    })
  })
  ```

  Add `bottomStripRow` to import.

- [ ] **Step 2: Run + confirm failure**

- [ ] **Step 3: Implement `bottomStripRow`**

  ```ts
  type BottomStripErrorArgs =
    | {
        errorKind: 'conservation'
        leftHeapTotal: number
        rightHeapTotal: number
        total: number
        unpartedStalks: number
      }
    | {
        errorKind: 'suspended-sum'
        remL: number
        remR: number
        sum: number
        expectedLabel: string
      }
    | {
        errorKind: 'zero-remainder'
        remL: number
        remR: number
      }

  type BottomStripArgs =
    | {
        branch: 'editing'
        liveLeftTotal: number
        liveRightTotal: number
        unpartedStalks: number
        renderWidth: number
      }
    | ({ branch: 'error'; renderWidth: number } & BottomStripErrorArgs)
    | {
        branch: 'resolved'
        leftHeapTotal: number
        rightHeapTotal: number
        unpartedStalks: number
        next: number
        renderWidth: number
      }

  function zeroRemainderSide(remL: number, remR: number): string {
    if (remL === 0 && remR === 0) return 'Left and right'
    if (remL === 0) return 'Left'
    return 'Right'
  }

  function errorMessageText(args: BottomStripErrorArgs): string {
    switch (args.errorKind) {
      case 'conservation':
        return `${args.leftHeapTotal} + ${args.rightHeapTotal} + 1 = ${args.total}, expected ${args.unpartedStalks}`
      case 'suspended-sum':
        return `Suspended sum (1 + ${args.remL} + ${args.remR}) = ${args.sum}, expected ${args.expectedLabel}`
      case 'zero-remainder':
        return `${zeroRemainderSide(args.remL, args.remR)} remainder = 0 — divisible heaps yield rem 4, not 0`
    }
  }

  // Build a row of `renderWidth` columns with `left` left-aligned and
  // `right` right-aligned. ANSI escape sequences in `left`/`right` don't
  // count toward display width.
  function leftRightRow(left: string, right: string, renderWidth: number): string {
    const leftW = stringWidth(left)
    const rightW = stringWidth(right)
    const gap = Math.max(1, renderWidth - leftW - rightW)
    return `${left}${' '.repeat(gap)}${right}`
  }

  /**
   * Build the one-row bottom strip of the manual prompt. Three branches:
   * editing (live totals + commit hint), error (BOLD_RED message + back-to-fix),
   * resolved (BOLD_GREEN totals + next-cast unparted, no right hint).
   *
   * The returned string is exactly `renderWidth` display cols wide.
   */
  export function bottomStripRow(args: BottomStripArgs): string {
    if (args.branch === 'editing') {
      const left = `· 1 suspended · total ${args.liveLeftTotal + args.liveRightTotal} of ${args.unpartedStalks}`
      const right = 'Enter: next · Shift+Tab: back'
      return leftRightRow(left, right, args.renderWidth)
    }
    if (args.branch === 'resolved') {
      const total = args.leftHeapTotal + args.rightHeapTotal
      const message = `· 1 suspended · ${total} of ${args.unpartedStalks} · → next cast: ${args.next} unparted`
      const colored = `${BOLD_GREEN}${message}${NORMAL}`
      const trailingPad = Math.max(0, args.renderWidth - stringWidth(colored))
      return `${colored}${' '.repeat(trailingPad)}`
    }
    const message = errorMessageText(args)
    const left = `${BOLD_RED}${message}${NORMAL}`
    const right = 'Shift+Tab: back to fix'
    return leftRightRow(left, right, args.renderWidth)
  }
  ```

- [ ] **Step 4: Run + confirm PASS**

- [ ] **Step 5: Commit**

  ```bash
  git add packages/casting-ui/src/casting-prompt-box.tsx packages/casting-ui/tests/casting-prompt-box.test.tsx
  git commit -m "$(cat <<'EOF'
  feat(casting-prompt): add bottomStripRow row-builder

  Discriminated-union row builder with editing / error / resolved
  branches. Returns a single string of exactly renderWidth display cols.
  Conservation drops the never-zero hint (kept in zero-remainder where
  it matters) so the message fits the strip's left segment.

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

---

## Phase 7: wire it all in `<ManualCastingPrompt>`

### Task 7.0: thread `horizontalOffset` to `<ManualCastingPrompt>`

**Files:**
- Modify: `packages/casting-ui/src/casting-prompt-box.tsx`.

- [ ] **Step 1: Add `horizontalOffset: number` to `ManualCastingPromptProps`**

  ```ts
  interface ManualCastingPromptProps {
    lineNumber: 1 | 2 | 3 | 4 | 5 | 6
    castIndex: 0 | 1 | 2
    width: number
    unpartedStalks: number
    manualRevealMs: number
    horizontalOffset: number
    onSubmit: (parsed: number) => void
    onReady?: () => void
    onFocusedFieldChange?: (field: ManualFocusedField) => void
  }
  ```

- [ ] **Step 2: Pass it from `<CastingPromptBox>`'s manual branch**

  ```tsx
  if (flowKind === 'manual') {
    const unparted = unpartedStalks ?? max + 1
    return (
      <ManualCastingPrompt
        lineNumber={lineNumber}
        castIndex={castIndex}
        width={width}
        unpartedStalks={unparted}
        manualRevealMs={manualRevealMs}
        horizontalOffset={horizontalOffset}
        onSubmit={onSubmit}
        onReady={onReady}
        onFocusedFieldChange={onFocusedFieldChange}
      />
    )
  }
  ```

- [ ] **Step 3: Type-check passes (no behaviour change yet)**

  `pnpm --filter @hexagram/casting-ui type:check` → PASS.

  No commit yet — Tasks 7.1+ land the actual use.

### Task 7.1: add digit + backspace input handling to the parent `useInput`

**Files:**
- Modify: `packages/casting-ui/src/casting-prompt-box.tsx` (`<ManualCastingPrompt>`'s `useInput` callback).
- Test: `packages/casting-ui/tests/casting-prompt-box.test.tsx` — add new tests for digit handling at the parent level.

The new useInput logic accepts a digit `0-9` if the resulting buffer parses to ≤ the field's max, and accepts backspace/delete to remove the last char of the buffer. Bounds:
- `pilesL`, `pilesR`: max = `Math.max(0, Math.floor(unpartedStalks / 4))`
- `remL`, `remR`: max = 4 (lenient: per-field bounds are the UX guard; the validator catches cross-field invariants).

- [ ] **Step 1: Add failing tests**

  Inside the existing `CastingPromptBox (manual flow)` describe block (alongside the Tab tests), add:

  ```tsx
  it('typing a digit appends to the focused buffer; resulting value > max is rejected', async () => {
    const onReady = vi.fn()
    const onFocusedFieldChange = vi.fn()
    const { stdin, lastFrame, unmount } = render(
      <CastingPromptBox
        {...baseProps}
        onSubmit={() => {}}
        onReady={onReady}
        onFocusedFieldChange={onFocusedFieldChange}
      />,
    )
    await waitForReady(onReady)
    // Initially focused on pilesL; max for cast 2 M=40 is floor(40/4) = 10.
    // Type "1" — accepted (1 ≤ 10).
    stdin.write('1')
    await yieldMacrotask()
    // Type "0" — accepted (10 ≤ 10).
    stdin.write('0')
    await yieldMacrotask()
    // Type "0" — would yield 100, rejected.
    stdin.write('0')
    await yieldMacrotask()
    // The diagram should show pilesL = 10 (not 100).
    expect(lastFrame() ?? '').toMatch(/piles\s+10/)
    unmount()
  })

  it('backspace removes the last digit of the focused buffer', async () => {
    const onReady = vi.fn()
    const onFocusedFieldChange = vi.fn()
    const { stdin, lastFrame, unmount } = render(
      <CastingPromptBox
        {...baseProps}
        onSubmit={() => {}}
        onReady={onReady}
        onFocusedFieldChange={onFocusedFieldChange}
      />,
    )
    await waitForReady(onReady)
    stdin.write('5')
    await yieldMacrotask()
    stdin.write('') // DEL/backspace
    await yieldMacrotask()
    // pilesL is now empty — diagram shows ? where the value was.
    const stripped = (lastFrame() ?? '').replaceAll(/\[[0-9;]*m/g, '')
    expect(stripped).toMatch(/piles\s+\?/)
    unmount()
  })
  ```

- [ ] **Step 2: Run + confirm failure**

  These tests fail because the current code relies on NumberInput for digit handling and the JSX still uses NumberInput. Step 3 + the JSX rewrite in Task 7.2 close the loop.

- [ ] **Step 3: Extend `useInput` in `ManualCastingPrompt`**

  Replace the existing `useInput` callback body with:

  ```ts
  useInput((input, key) => {
    if (key.tab) {
      const current = MANUAL_FIELD_ORDER.indexOf(focusedField)
      const step = key.shift ? -1 : 1
      const next = MANUAL_FIELD_ORDER[(current + step + MANUAL_FIELD_ORDER.length) % MANUAL_FIELD_ORDER.length]!
      setFocusedField(next)
      return
    }
    if (key.return) {
      if (committed !== null) {
        onSubmitRef.current(committed.pick)
        return
      }
      if (validation.kind !== 'ok') return
      const result = computeManualRoundResult(
        validation.pick,
        castIndex,
        unpartedStalks,
      )
      setCommitted({
        pick: validation.pick,
        suspended: result.suspended,
        next: result.next,
        leftHeapTotal: validation.leftHeapTotal,
        rightHeapTotal: validation.rightHeapTotal,
      })
      return
    }
    // While the reveal-dwell is showing the resolved view, freeze the buffers.
    if (committed !== null) return
    // Backspace / DEL — remove the last char from the focused buffer.
    if (key.backspace || key.delete || input === '' || input === '\b') {
      const setter = manualSetterForField(focusedField, {
        setPilesLBuffer,
        setRemLBuffer,
        setPilesRBuffer,
        setRemRBuffer,
      })
      const currentBuffer = manualBufferForField(focusedField, {
        pilesLBuffer,
        remLBuffer,
        pilesRBuffer,
        remRBuffer,
      })
      setter(currentBuffer.slice(0, -1))
      return
    }
    // Digit input — append if the resulting parse fits the field's per-field max.
    if (input.length === 1 && input >= '0' && input <= '9') {
      const setter = manualSetterForField(focusedField, {
        setPilesLBuffer,
        setRemLBuffer,
        setPilesRBuffer,
        setRemRBuffer,
      })
      const currentBuffer = manualBufferForField(focusedField, {
        pilesLBuffer,
        remLBuffer,
        pilesRBuffer,
        remRBuffer,
      })
      const nextBuffer = currentBuffer + input
      const parsed = Number.parseInt(nextBuffer, 10)
      const max =
        focusedField === 'pilesL' || focusedField === 'pilesR'
          ? pilesMax
          : remMax
      if (Number.isInteger(parsed) && parsed <= max) {
        setter(nextBuffer)
      }
      return
    }
  })
  ```

  Add the two field-router helpers (file-local, just above `<ManualCastingPrompt>`):

  ```ts
  function manualSetterForField(
    field: ManualFocusedField,
    setters: {
      setPilesLBuffer: (s: string) => void
      setRemLBuffer: (s: string) => void
      setPilesRBuffer: (s: string) => void
      setRemRBuffer: (s: string) => void
    },
  ): (s: string) => void {
    switch (field) {
      case 'pilesL': return setters.setPilesLBuffer
      case 'remL':   return setters.setRemLBuffer
      case 'pilesR': return setters.setPilesRBuffer
      case 'remR':   return setters.setRemRBuffer
    }
  }

  function manualBufferForField(
    field: ManualFocusedField,
    buffers: {
      pilesLBuffer: string
      remLBuffer: string
      pilesRBuffer: string
      remRBuffer: string
    },
  ): string {
    switch (field) {
      case 'pilesL': return buffers.pilesLBuffer
      case 'remL':   return buffers.remLBuffer
      case 'pilesR': return buffers.pilesRBuffer
      case 'remR':   return buffers.remRBuffer
    }
  }
  ```

  No commit yet — Task 7.2's JSX rewrite uses the same setters/buffers downstream and we want one atomic test-passing commit. (If the test from Step 1 still fails, that's because the JSX still renders `<NumberInput>` which intercepts the digits. The next task removes NumberInput.)

### Task 7.2: rewrite `<ManualCastingPrompt>`'s JSX to use the row builders + sliceAnsi

**Files:**
- Modify: `packages/casting-ui/src/casting-prompt-box.tsx`.

- [ ] **Step 1: Replace the render-return block**

  Replace the existing `return (<Box borderStyle="round" ...>...)` block at the end of `<ManualCastingPrompt>` with:

  ```tsx
  // Compute layout widths.
  const innerContentWidth = Math.max(1, width - 2)
  // Natural body width: 2 cards (17 cols each) + 4-col gap + 4-col gap + ~33-col right pane.
  const naturalBodyWidth = 17 + 4 + 17 + 4 + 33
  const renderWidth = Math.max(innerContentWidth, naturalBodyWidth)

  // Diagram state drives editing / error / resolved colouring.
  const diagramState: ManualDiagramState =
    committed !== null
      ? 'resolved'
      : validation.kind === 'incomplete' || validation.kind === 'ok'
        ? 'editing'
        : 'error'

  // Build the title row.
  const titleRow = manualTitleRow(lineNumber, castIndex, focusedField)

  // Build the 5-row diagram. Pad it to 6 rows with a trailing blank to
  // align with the right pane (which is 6 rows: 3 question + 3 input box).
  const diagramRows = twoHeapDiagramRows({
    pilesL,
    remL,
    pilesR,
    remR,
    focusedField,
    state: diagramState,
  })
  // The diagram's natural width is `17 (LEFT) + 4 (gap) + 18 (RIGHT) = 39`.
  const diagramWidth = 39
  const diagramPaddedRows = [
    ...diagramRows,
    ' '.repeat(diagramWidth),
  ]

  // Build the right pane: 3 question rows + 3 input box rows.
  const qRows = questionPanelRows({
    focusedField,
    unpartedStalks,
    state: diagramState === 'resolved' ? 'resolved' : 'editing',
  })
  const inputRows = committed === null
    ? focusedInputBoxRows({
        value: manualBufferForField(focusedField, {
          pilesLBuffer, remLBuffer, pilesRBuffer, remRBuffer,
        }),
        focused: true,
      })
    : ['', '', '']
  const rightRows = [...qRows, ...inputRows]
  const rightWidth = 35

  // Concat the diagram and right pane row-by-row, padded to renderWidth.
  const bodyRows = diagramPaddedRows.map((leftRow, i) => {
    const rightRow = rightRows[i] ?? ''
    const leftWidth = stringWidth(leftRow)
    const rightDisplayWidth = stringWidth(rightRow)
    const leftPadTrail = Math.max(0, diagramWidth - leftWidth)
    const middleGap = 4
    const totalSoFar = diagramWidth + leftPadTrail + middleGap + rightDisplayWidth
    const trailingPad = Math.max(0, renderWidth - totalSoFar)
    return `${leftRow}${' '.repeat(leftPadTrail)}${' '.repeat(middleGap)}${rightRow}${' '.repeat(trailingPad)}`
  })

  // Build the bottom strip.
  const bottomStripBranchArgs = ((): BottomStripArgs => {
    if (committed !== null) {
      return {
        branch: 'resolved',
        leftHeapTotal: committed.leftHeapTotal,
        rightHeapTotal: committed.rightHeapTotal,
        unpartedStalks,
        next: committed.next,
        renderWidth,
      }
    }
    if (validation.kind === 'conservation') {
      return {
        branch: 'error',
        errorKind: 'conservation',
        leftHeapTotal: validation.leftHeapTotal,
        rightHeapTotal: validation.rightHeapTotal,
        total: validation.total,
        unpartedStalks: validation.unparted,
        renderWidth,
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
        renderWidth,
      }
    }
    if (validation.kind === 'zero-remainder') {
      return {
        branch: 'error',
        errorKind: 'zero-remainder',
        remL: validation.remL,
        remR: validation.remR,
        renderWidth,
      }
    }
    return {
      branch: 'editing',
      liveLeftTotal,
      liveRightTotal,
      unpartedStalks,
      renderWidth,
    }
  })()
  const stripRow = bottomStripRow(bottomStripBranchArgs)

  // Assemble all 9 content rows + slice each by horizontalOffset.
  const allRows = [
    titleRow,
    '',
    ...bodyRows,
    stripRow,
  ]
  // Pad each row to renderWidth and slice.
  const slicedRows = allRows.map((row) => {
    const padded = row + ' '.repeat(Math.max(0, renderWidth - stringWidth(row)))
    return sliceAnsi(padded, horizontalOffset, horizontalOffset + innerContentWidth)
  })

  return (
    <Box
      borderStyle="round"
      borderColor="cyan"
      width={width}
      flexShrink={0}
      flexDirection="column"
    >
      <Text dimColor>{slicedRows[0]!}</Text>
      {slicedRows.slice(1).map((row, i) => (
        // eslint-disable-next-line react/no-array-index-key
        <Text key={i}>{row}</Text>
      ))}
    </Box>
  )
  ```

- [ ] **Step 2: Delete `<ManualNumberField>`**

  Remove the entire `function ManualNumberField(...)` block — it's no longer referenced.

- [ ] **Step 3: Type-check + run the full suite**

  ```bash
  pnpm --filter @hexagram/casting-ui type:check
  pnpm --filter @hexagram/casting-ui test
  ```

  Expected: type-check passes. Several existing manual-flow tests fail because their assertions reference the old SPLIT-row / `[_]`-bracket text. Tests asserting Tab cycle, Enter behaviour, reveal-dwell, Ctrl+R, byte-identity should still pass.

  **Do not commit yet.** Task 7.3 brings the tests to GREEN.

### Task 7.3: rewrite the obsolete manual-flow test assertions

**Files:**
- Modify: `packages/casting-ui/tests/casting-prompt-box.test.tsx` (the `CastingPromptBox (manual flow)` describe block).

Walk each manual-flow test that asserts old rendered text. Tests that assert behaviour (Tab cycle, Enter, reveal-dwell, Ctrl+R) need NO change. Tests that assert specific rendered substrings get their assertions updated.

- [ ] **Step 1: Rewrite `renders title, unparted, four-field input, and the live SPLIT row`**

  Replace its body with:

  ```tsx
  it('renders title with dots, both heap cards, question panel, and the live editing strip', async () => {
    const onReady = vi.fn()
    const { lastFrame, unmount } = render(
      <CastingPromptBox {...baseProps} onSubmit={() => {}} onReady={onReady} />,
    )
    await waitForReady(onReady)
    const frame = lastFrame() ?? ''
    expect(frame).toContain('Line 3/6 · Cast 2/3')
    expect(frame).toContain('step 1 of 4')
    expect(frame).toContain('LEFT HEAP')
    expect(frame).toContain('RIGHT HEAP')
    expect(frame).toContain('How many piles of 4 stalks in the LEFT heap?')
    expect(frame).toContain('valid 0 to 10')
    expect(frame).toContain('· 1 suspended · total 0 of 40')
    expect(frame).toContain('Enter: next · Shift+Tab: back')
    unmount()
  })
  ```

- [ ] **Step 2: Replace `renders three unfocused fields with _ placeholder; brackets never collapse`**

  Replace with:

  ```tsx
  it('renders ? in unfilled diagram cells (no [_] brackets)', async () => {
    const onReady = vi.fn()
    const { lastFrame, unmount } = render(
      <CastingPromptBox {...baseProps} onSubmit={() => {}} onReady={onReady} />,
    )
    await waitForReady(onReady)
    const stripped = (lastFrame() ?? '').replaceAll(/\[[0-9;]*m/g, '')
    expect(stripped).not.toMatch(/\[_\]/)
    const questionMarks = stripped.match(/\?/g) ?? []
    expect(questionMarks.length).toBeGreaterThanOrEqual(3)
    unmount()
  })
  ```

- [ ] **Step 3: Tab / Shift+Tab cycle tests stay unchanged**

- [ ] **Step 4: Rewrite `updates the SPLIT row live to the derived pick when conservation + suspended-sum pass`**

  Replace with:

  ```tsx
  it('updates the editing bottom strip live as the user types', async () => {
    const onReady = vi.fn()
    const onFocusedFieldChange = vi.fn()
    const { stdin, lastFrame, unmount } = render(
      <CastingPromptBox
        {...baseProps}
        onSubmit={() => {}}
        onReady={onReady}
        onFocusedFieldChange={onFocusedFieldChange}
      />,
    )
    await waitForReady(onReady)
    await typeFourFields(stdin, onFocusedFieldChange, validBasePropsInput)
    await waitFor(() => {
      expect(lastFrame() ?? '').toContain('· 1 suspended · total 39 of 40')
    })
    unmount()
  })
  ```

- [ ] **Step 5: Update `suspended-sum failure renders the actual remainders (no literal "null" leak)` assertions**

  Inside the existing `await waitFor` block, replace the body:

  ```tsx
  await waitFor(() => {
    const frame = lastFrame() ?? ''
    expect(frame).toMatch(/Suspended sum \(1 \+ 1 \+ 4\) = 6/)
    expect(frame).toContain('expected 4 or 8')
    const stripped = frame.replaceAll(/\[[0-9;]*m/g, '')
    expect(stripped).not.toMatch(/null/)
  })
  ```

- [ ] **Step 6: Update `zero-remainder failure shows a red message identifying which side is 0` assertions**

  ```tsx
  await waitFor(() => {
    const frame = lastFrame() ?? ''
    expect(frame).toContain('Right remainder = 0')
    expect(frame).toContain('not 0')
  })
  ```

- [ ] **Step 7: Rewrite `conservation failure shows the red message + never-zero hint in the SPLIT row`**

  ```tsx
  it('conservation failure shows the red arithmetic message in the bottom strip', async () => {
    const onReady = vi.fn()
    const onFocusedFieldChange = vi.fn()
    const { stdin, lastFrame, unmount } = render(
      <CastingPromptBox
        {...baseProps}
        onSubmit={() => {}}
        onReady={onReady}
        onFocusedFieldChange={onFocusedFieldChange}
      />,
    )
    await waitForReady(onReady)
    await typeFourFields(stdin, onFocusedFieldChange, {
      pilesL: '5',
      remL: '2',
      pilesR: '4',
      remR: '3',
    })
    await waitFor(() => {
      const frame = lastFrame() ?? ''
      expect(frame).toContain('22 + 19 + 1 = 42, expected 40')
      expect(frame).toContain('Shift+Tab: back to fix')
    })
    unmount()
  })
  ```

- [ ] **Step 8: Update `post-commit reveal swaps the bottom row to the green resolved string` assertions**

  Replace the `await waitFor` block body:

  ```tsx
  await waitFor(() => {
    const frame = lastFrame() ?? ''
    const total =
      validBasePropsInput.expectedLeftHeapTotal +
      validBasePropsInput.expectedRightHeapTotal
    expect(frame).toContain(
      `· 1 suspended · ${total} of ${baseProps.unpartedStalks} · → next cast: ${validBasePropsInput.expectedNext} unparted`,
    )
    expect(frame).toContain('Resolved.')
    expect(frame).toContain('Enter to advance')
  })
  ```

- [ ] **Step 9: Update `reveal uses byte-identity arithmetic` assertion**

  ```tsx
  await waitFor(() => {
    const frame = lastFrame() ?? ''
    expect(frame).toContain('48 of 49 · → next cast: 40 unparted')
  })
  ```

- [ ] **Step 10: Add a horizontal-pan test**

  Add inside the `CastingPromptBox (manual flow)` describe:

  ```tsx
  it('honours horizontalOffset by slicing each row of the prompt', async () => {
    const onReady = vi.fn()
    const { lastFrame: f0, unmount: u0 } = render(
      <CastingPromptBox
        {...baseProps}
        width={40}
        horizontalOffset={0}
        onSubmit={() => {}}
        onReady={onReady}
      />,
    )
    await waitForReady(onReady)
    const at0 = f0() ?? ''
    u0()
    // A pan of 20 cols should hide the leading `Line 3/6` chars and reveal
    // text from later in the title row.
    const onReady2 = vi.fn()
    const { lastFrame: f1, unmount: u1 } = render(
      <CastingPromptBox
        {...baseProps}
        width={40}
        horizontalOffset={20}
        onSubmit={() => {}}
        onReady={onReady2}
      />,
    )
    await waitForReady(onReady2)
    const at20 = f1() ?? ''
    u1()
    // The two frames must differ — the pan is observable.
    expect(at20).not.toBe(at0)
    // The 0-offset frame contains the title's leading prefix; the 20-offset frame
    // does not.
    expect(at0).toContain('Line 3/6')
    expect(at20).not.toContain('Line 3/6')
  })
  ```

- [ ] **Step 11: Run the full suite**

  `pnpm --filter @hexagram/casting-ui test` → all PASS, including the Phase 7 byte-identity test in `viewer.test.tsx`.

- [ ] **Step 12: Type-check + lint**

  ```bash
  pnpm --filter @hexagram/casting-ui type:check
  pnpm lint:check
  ```
  Expected: no errors.

- [ ] **Step 13: Commit**

  ```bash
  git add packages/casting-ui/src/casting-prompt-box.tsx packages/casting-ui/tests/casting-prompt-box.test.tsx
  git commit -m "$(cat <<'EOF'
  refactor(casting-prompt): swap manual prompt to row-builder layout

  Replaces ManualCastingPrompt's stacked four-field bracket JSX with a
  composition of pure-text row builders (twoHeapDiagramRows,
  questionPanelRows, focusedInputBoxRows, bottomStripRow) sliced through
  sliceAnsi for the viewer's horizontal pan. Digit/backspace input moves
  into the parent useInput (NumberInput is gone from the manual branch).
  State machine, validator, generator-advance path, save behaviour, and
  Phase 7 byte-identity contract unchanged.

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

---

## Phase 8: regression gate

### Task 8.1: full verification

- [ ] **Step 1: Phase 7 byte-identity test**

  `pnpm --filter @hexagram/casting-ui test -- viewer.test.tsx -t manual` → all PASS, byte-for-byte.

- [ ] **Step 2: Full casting-ui suite**

  `pnpm --filter @hexagram/casting-ui test` → all PASS.

- [ ] **Step 3: Type-check + lint**

  ```bash
  pnpm --filter @hexagram/casting-ui type:check
  pnpm lint:check
  ```
  → all green.

- [ ] **Step 4: Smoke test the bin in a TTY**

  `pnpm hexagram-manual` — visually verify the new layout. Type digits, Tab, Enter; press Ctrl+C to exit.

### Task 8.2: handoff for landing

- [ ] **Step 1: Confirm worktree commits**

  `git log --oneline main..HEAD` → ~9 commits (spec cherry-pick + 8 implementation commits).

- [ ] **Step 2: Use `superpowers:finishing-a-development-branch` to land**

  Per the integration-constraints memory: cherry-pick the commits onto main (rebase + branch -D are permission-denied). Linear history, no merge commits.

---

## Self-review

- **Spec coverage:** All 8 items of the spec's "Implementation contract" map to a task.
  - 1 (height JSDoc rewrite) → Task 2.1
  - 2 (state-machine preservation) → Task 7.2 (JSX rewrite leaves state machine intact)
  - 3 (`<TwoHeapDiagram>`) → Phase 3 (now as `twoHeapDiagramRows` row-builder)
  - 4 (`<FocusedInputBox>`) → Phase 5 (now as `focusedInputBoxRows` row-builder)
  - 5 (`<QuestionPanel>`) → Phase 4 (now as `questionPanelRows` row-builder)
  - 6 (`<BottomStrip>`) → Phase 6 (now as `bottomStripRow` row-builder)
  - 7 (horizontal pan plumbing) → Task 7.0 (thread) + Task 7.2 (apply sliceAnsi) + Task 7.3 Step 10 (pan integration test)
  - 8 (title row collapses to one line) → Task 2.2 (helper) + Task 7.2 (use)
- **Three rendered states** (steady / error / resolved) covered by row-builder unit tests in Phases 3-6 and the rewritten manual-flow tests in Task 7.3.
- **Phase 7 byte-identity contract** enforced in Phase 8 Task 8.1.
- **Non-goals respected:** plan does NOT touch validator priority/outcomes (only adds fields), `computeManualRoundResult`, `MANUAL_REVEAL_MS` / `--manual-reveal-ms` / `manualRevealMs={0}`, `onReady` / `onFocusedFieldChange`, slider/number branches, the non-TTY guard, the consultation file format.
- **No placeholders.** Every code-changing step shows the code; every verification step shows the command + expected output.
- **Type consistency:** `ManualFocusedField`, `ManualDiagramState`, validator return-type fields, and row-builder arg types align across tasks.

---

## Open questions surfaced during planning

- Implementer subagents may discover that the existing `NumberInput`'s built-in behaviours (e.g., leading-zero handling, multi-char paste, arrow-key cursor) are relied on by some test path. If so, the parent `useInput` digit handling needs to grow to match — flag and re-engage the design discussion.
- The 9-row content budget is tight when the question text exceeds ~32 cols. Spec decision 3 sentences are 41-45 chars; on a 70-col body the right pane wraps. Our row builder uses a fixed-width right pane of 33-35 cols, so the question wraps to 2 lines — the spec mockup shows it on 2 lines, so this is intended.
