import {
  MANUAL_FIELD_ORDER,
  type ManualDiagramState,
  type ManualFocusedField,
} from './manual-diagram.js'

/**
 * The 7-col step-progress dots strip — `● ● ● ○` — shown in the right pane
 * beside the `Total` row. Positions ≤ the focused field's index are `●`, the
 * rest `○`. Cosmetic focus indicator; mirrors the title's `Step P/4` ordinal.
 */
export function stepDotsRow(focusedField: ManualFocusedField): string {
  const stepIndex = MANUAL_FIELD_ORDER.indexOf(focusedField)
  return MANUAL_FIELD_ORDER.map((_, i) => (i <= stepIndex ? '●' : '○')).join(
    ' ',
  )
}

interface QuestionPanelRowsArgs {
  focusedField: ManualFocusedField
  unpartedStalks: number
  state: ManualDiagramState
}

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

/**
 * Right-half question + dim parenthesised range hint (editing), or the calm
 * `Resolved.` / `Enter to advance` 2-line summary (resolved). Always returns
 * exactly 2 rows; the caller (`<ManualCastingPrompt>`) pads the right pane
 * to 6 rows with the 3-row input box + a trailing blank.
 *
 * Dim ANSI is `\u001B[2m...\u001B[22m` (matches Ink's `<Text dimColor>`).
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
  return [questionLineForField(focusedField), `\u001B[2m${hintText}\u001B[22m`]
}

interface FocusedInputBoxRowsArgs {
  value: string
  focused: boolean
}

/**
 * The manual prompt's current-value display — a 3-row drawn box. 13-col
 * interior with a 1-col left margin; the value sits left-of-centre with
 * the cursor (an inverse space) right after when `focused`. Pure text —
 * no `<NumberInput>` here; digit handling lives in the parent `useInput`.
 */
export function focusedInputBoxRows(args: FocusedInputBoxRowsArgs): string[] {
  const interior = 13
  const top = `┌${'─'.repeat(interior)}┐`
  const bottom = `└${'─'.repeat(interior)}┘`
  const cursor = args.focused ? '\u001B[7m \u001B[27m' : ' '
  // value + cursor sits inside `interior` cols; cursor is 1 display col.
  const valueCols = args.value.length
  const cursorCols = 1
  // 1-col left margin; trailing pad fills the remainder.
  const leading = 1
  const trailingPad = Math.max(0, interior - leading - valueCols - cursorCols)
  const middle = `│${' '.repeat(leading)}${args.value}${cursor}${' '.repeat(trailingPad)}│`
  return [top, middle, bottom]
}
