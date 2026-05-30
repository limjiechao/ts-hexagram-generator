import { BOLD_GREEN, BOLD_RED, BOLD_WHITE, NORMAL } from '@hexagram/viewer-core'
import stringWidth from 'string-width'

// Pure ANSI row-builders + fixed-width geometry for the manual-flow casting
// prompt, lifted out of `<ManualCastingPrompt>`. Every function here returns
// pre-rendered text rows; no React, no Ink, no component state — the stateful
// component (`manual-casting-prompt.tsx`) composes these into its render.

// ── Manual flow ─────────────────────────────────────────────────────────────

/**
 * The four input fields owned by `<ManualCastingPrompt>`, in forward Tab
 * order. Production callers don't see this — it's exposed for the
 * `onFocusedFieldChange` test witness only.
 */
export type ManualFocusedField = 'pilesL' | 'remL' | 'pilesR' | 'remR'

// Forward Tab order for the four manual fields. Used by `manualTitleRow`,
// the row-builder helpers, and the `useInput` Tab handler in
// `<ManualCastingPrompt>`. Module-scope so all consumers stay in lockstep.
export const MANUAL_FIELD_ORDER: readonly ManualFocusedField[] = [
  'pilesL',
  'remL',
  'pilesR',
  'remR',
] as const

/**
 * Slim one-line manual-flow title: `Line N/6 · Cast C/3 · Step P/4`. The
 * step ordinal is the focused field's 1-based index in `MANUAL_FIELD_ORDER`
 * (cosmetic — navigation stays free Tab-cycling). The step-progress dots
 * relocated out of the title into the right pane; see `stepDotsRow`.
 */
export function manualTitleRow(
  lineNumber: number,
  castIndex: number,
  focusedField: ManualFocusedField,
): string {
  const stepIndex = MANUAL_FIELD_ORDER.indexOf(focusedField)
  return `Line ${lineNumber}/6 · Cast ${castIndex + 1}/3 · Step ${stepIndex + 1}/4`
}

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

// State discriminant shared between the diagram, question panel, and bottom
// strip row builders. Drives editing → error → resolved styling cues
// (inverse-video on active cells, BOLD_GREEN wraps, etc).
export type ManualDiagramState = 'editing' | 'error' | 'resolved'

interface TwoHeapDiagramRowsArgs {
  pilesL: number | null
  remL: number | null
  pilesR: number | null
  remR: number | null
  focusedField: ManualFocusedField
  state: ManualDiagramState
}

// Card interior width (between the two vertical pipes). 17 cols accommodates
// `LEFT HEAP` / `RIGHT HEAP` headers, `= XX stalks` totals (up to 3 digits),
// and the full-word `remainder` / `suspended` labels.
const HEAP_CARD_INTERIOR = 17

// Reserved width of the leading label column inside a content row: 2-col
// pad + longest label `remainder` (9 cols) = 11. Values are right-aligned
// within the remaining `interior - 11 - 2 (right margin)` cols.
const HEAP_LABEL_COL_WIDTH = 11

// ── Heap-card field palette (Scheme B "Cyan compute") ───────────────────
// The left-panel heap cards render three visual tiers in the editing/error
// states (per the casting-prompt colour spec):
//   • inert    — labels, the static `Fours × 4`, the `Suspended + 1` row →
//               dimmed (SGR 2 … 22), so structure recedes.
//   • computed — the derived `Subtotal` / `Total` values → cyan (SGR 36 …
//               39, a foreground-only reset so nothing else is disturbed).
//   • input    — the typed `Piles` / `Remainder` values → BOLD_WHITE, the
//               highest static prominence; the *focused* cell overrides this
//               with inverse-video (see `cellText`).
// All three are SUPPRESSED in the resolved state, where `twoHeapDiagramRows`
// wraps each whole row in BOLD_GREEN — an interior `[0m` / `[39m` / `[22m`
// reset would terminate that green run early. `colorize` (= state !==
// 'resolved') gates every wrap below.
const FIELD_DIM = '\u001B[2m'
const FIELD_DIM_OFF = '\u001B[22m'
const FIELD_CYAN = '\u001B[36m'
const FIELD_FG_RESET = '\u001B[39m'

// One ANSI inverse-video cell. Empty value renders a single inverse space
// so an active cell never collapses (the cursor is always visible).
function inverseCell(value: number | null): string {
  const inner = value === null ? ' ' : String(value)
  return `\u001B[7m${inner}\u001B[27m`
}

// One bold-white input cell — the unfocused-but-editable rendering of a typed
// `Piles` / `Remainder` value (the focused cell uses `inverseCell` instead).
// `null` renders the same `?` placeholder `plainCell` uses, kept bold so an
// untyped input field still reads as a live field awaiting entry.
function boldInputCell(value: number | null): string {
  return `${BOLD_WHITE}${plainCell(value)}${NORMAL}`
}

// Plain (no styling) representation: integer for non-null, `?` for null.
function plainCell(value: number | null): string {
  return value === null ? '?' : String(value)
}

function cellText(
  value: number | null,
  field: ManualFocusedField,
  focusedField: ManualFocusedField,
  state: ManualDiagramState,
): string {
  // Resolved: stay plain so the outer BOLD_GREEN wrap (applied per row in
  // `twoHeapDiagramRows`) covers the whole card uniformly — a bold-white or
  // inverse cell here would punch a hole in the green run.
  if (state === 'resolved') return plainCell(value)
  // Focus indicator (inverse-video) stays visible while the user can still
  // edit — i.e. anything except the post-commit resolved state. Previously
  // it was restricted to `editing` only, which caused the indicator to
  // vanish when the user Shift+Tabbed back into a form whose validator was
  // surfacing a conservation/suspended-sum/zero-remainder error.
  if (focusedField === field) return inverseCell(value)
  // Unfocused but still editable → Scheme B input tier: bold white, the
  // highest static prominence among the three field tiers.
  return boldInputCell(value)
}

// Pre-built cell strings for a single heap card. `pilesCell` / `remCell` are
// the styled (?/value/inverse) raw inputs; `subtotalLabel` / `totalLabel` are
// the live derived numerics (untyped → 0); `suspendedCell` is `'1'` on RIGHT,
// `null` on LEFT (renders a blank slot for vertical alignment).
interface CardCellArgs {
  header: string
  pilesCell: string
  subtotalLabel: string
  remCell: string
  suspendedCell: string | null
  totalLabel: string
  // Scheme B field colouring — `true` in editing/error (dim labels + inert
  // values, cyan computed values), `false` in resolved (the caller wraps each
  // row BOLD_GREEN, so interior colour resets must be withheld).
  colorize: boolean
}

// One full-width interior separator rule: `│  ─────────────  │`.
function cardSeparatorRow(): string {
  const margin = 2
  const rule = '─'.repeat(Math.max(0, HEAP_CARD_INTERIOR - margin * 2))
  return `│${' '.repeat(margin)}${rule}${' '.repeat(margin)}│`
}

// Build a single card's 10 rows: header / Piles / Fours ×4 / separator /
// Subtotal / Remainder / Suspended-or-blank / separator / Total / footer.
// `Remainder` and `Suspended` carry a `+ ` prefix; `Fours` is the static
// `× 4` multiplier. The footer carries a centred `┬` tee feeding the
// convergence connector below the card band.
function buildCardRows(args: CardCellArgs): readonly string[] {
  const {
    header,
    pilesCell,
    subtotalLabel,
    remCell,
    suspendedCell,
    totalLabel,
    colorize,
  } = args
  // Scheme B wraps: dim for the inert tier (labels, `× 4`, `+ 1`), cyan for
  // the computed tier (Subtotal / Total). Identity functions when `colorize`
  // is false so the resolved-state BOLD_GREEN wrap stays unbroken.
  const dim = (s: string): string =>
    colorize ? `${FIELD_DIM}${s}${FIELD_DIM_OFF}` : s
  const cyan = (s: string): string =>
    colorize ? `${FIELD_CYAN}${s}${FIELD_FG_RESET}` : s
  // Header: `┌── HEADER ─...─┐` — fills interior with dashes around the header.
  const headerInner = ` ${header} `
  const leadingDashes = '─'.repeat(2)
  const trailingDashes = '─'.repeat(
    Math.max(0, HEAP_CARD_INTERIOR - headerInner.length - 2),
  )
  const headerRow = `┌${leadingDashes}${headerInner}${trailingDashes}┐`

  // Field row: `│  LABEL    {cell}  │`. The pre-cell column is
  // HEAP_LABEL_COL_WIDTH chars wide (2-col pad + label padded to 9). The
  // remaining interior is `interior - labelCol - rightMargin` cols; the
  // cell value is right-aligned within that space (gap goes BEFORE the
  // value so it visually anchors to the right edge of the card). ANSI in
  // `cell` (inverse-video) is width-discounted via `stringWidth`.
  const buildField = (label: string, cell: string): string => {
    // Label sits in the inert tier — dim it AFTER padding so the column width
    // (HEAP_LABEL_COL_WIDTH) is computed from the bare text, not the codes.
    const labelPadded = dim(`  ${label}`.padEnd(HEAP_LABEL_COL_WIDTH, ' '))
    const cellWidth = stringWidth(cell)
    const rightMargin = 2
    const innerGap = Math.max(
      0,
      HEAP_CARD_INTERIOR - HEAP_LABEL_COL_WIDTH - cellWidth - rightMargin,
    )
    return `│${labelPadded}${' '.repeat(innerGap)}${cell}${' '.repeat(rightMargin)}│`
  }

  const pilesRow = buildField('Piles', pilesCell)
  // `Fours × 4` is a static multiplier — inert tier, fully dimmed.
  const foursRow = buildField('Fours', dim('× 4'))
  // Subtotal / Total are derived — computed tier, cyan.
  const subtotalRow = buildField('Subtotal', cyan(subtotalLabel))
  const remRow = buildField('Remainder', `+ ${remCell}`)
  const suspendedRow =
    suspendedCell === null
      ? `│${' '.repeat(HEAP_CARD_INTERIOR)}│`
      : // The `+ 1` suspended stalk is a constant — inert tier, dimmed whole.
        buildField('Suspended', dim(`+ ${suspendedCell}`))
  const totalRow = buildField('Total', cyan(totalLabel))
  const sepRow = cardSeparatorRow()
  // Footer: centred `┬` tee — `└────────┬────────┘`.
  const half = Math.max(0, Math.floor((HEAP_CARD_INTERIOR - 1) / 2))
  const footerRow = `└${'─'.repeat(half)}┬${'─'.repeat(HEAP_CARD_INTERIOR - 1 - half)}┘`

  return [
    headerRow,
    pilesRow,
    foursRow,
    sepRow,
    subtotalRow,
    remRow,
    suspendedRow,
    sepRow,
    totalRow,
    footerRow,
  ]
}

/**
 * Build the 10-row LEFT + RIGHT heap card pair as pre-rendered text rows.
 * Each returned row contains both cards joined by a 4-col gap. The derived
 * Subtotal / Total tick live with untyped fields treated as 0 (the RIGHT
 * Total folds in the +1 always-suspended stalk).
 *
 * Editing/error rows carry the Scheme B field colouring: dim labels and the
 * inert `Fours × 4` / `Suspended + 1` values, cyan Subtotal / Total, and
 * bold-white Piles / Remainder inputs — with the focused input cell shown
 * inverse-video instead (see `cellText`). Resolved rows skip all of that and
 * wrap each whole row in BOLD_GREEN ... NORMAL (so no interior colour reset
 * can break the green run). Pure function — no Ink involvement.
 */
export function twoHeapDiagramRows(args: TwoHeapDiagramRowsArgs): string[] {
  const { pilesL, remL, pilesR, remR, focusedField, state } = args
  const pilesLCell = cellText(pilesL, 'pilesL', focusedField, state)
  const remLCell = cellText(remL, 'remL', focusedField, state)
  const pilesRCell = cellText(pilesR, 'pilesR', focusedField, state)
  const remRCell = cellText(remR, 'remR', focusedField, state)
  const leftSubtotal = 4 * (pilesL ?? 0)
  const rightSubtotal = 4 * (pilesR ?? 0)
  const leftTotal = leftSubtotal + (remL ?? 0)
  // RIGHT total folds in the +1 always-suspended stalk (surfaced inline as the
  // `Suspended + 1` row), so the card sums vertically the same way LEFT does.
  const rightTotal = rightSubtotal + (remR ?? 0) + 1
  // Scheme B field colours apply in editing/error only; resolved rows are
  // wrapped BOLD_GREEN below and must stay free of interior colour resets.
  const colorize = state !== 'resolved'
  const leftRows = buildCardRows({
    header: 'LEFT HEAP',
    pilesCell: pilesLCell,
    subtotalLabel: String(leftSubtotal),
    remCell: remLCell,
    suspendedCell: null, // LEFT has no suspended stalk — blank slot
    totalLabel: String(leftTotal),
    colorize,
  })
  const rightRows = buildCardRows({
    header: 'RIGHT HEAP',
    pilesCell: pilesRCell,
    subtotalLabel: String(rightSubtotal),
    remCell: remRCell,
    suspendedCell: '1', // RIGHT always has the +1 suspended stalk
    totalLabel: String(rightTotal),
    colorize,
  })
  const gap = '    '
  const combined = leftRows.map((row, i) => `${row}${gap}${rightRows[i]!}`)
  if (state === 'resolved') {
    return combined.map((row) => `${BOLD_GREEN}${row}${NORMAL}`)
  }
  return combined
}

// ── Manual flow-diagram geometry ─────────────────────────────────────────
// Both heap cards are CARD_OUTER cols wide; the pair sits CARD_GAP apart,
// giving DIAGRAM_WIDTH. Each card footer carries a centred `┬` tee at
// CARD_TEE_OFFSET (cols from the card's left edge); the branch/join connectors
// span the two card tees (LEFT_TEE_COL..RIGHT_TEE_COL) and point their
// `┴` / `┬` stub at LEDGER_VALUE_END_COL — under the last digit of the
// right-aligned UNPARTED / COUNTED value above/below — so the vertical flow
// reads as one circuit anchored to the numbers it sums.
const CARD_OUTER = HEAP_CARD_INTERIOR + 2
const CARD_GAP = 4
export const DIAGRAM_WIDTH: number = CARD_OUTER * 2 + CARD_GAP
const CARD_TEE_OFFSET = 1 + Math.floor((HEAP_CARD_INTERIOR - 1) / 2)
const LEFT_TEE_COL = CARD_TEE_OFFSET
const RIGHT_TEE_COL = CARD_OUTER + CARD_GAP + CARD_TEE_OFFSET
// Ledger readout column: label left-aligned, value right-aligned. Also the
// length of the COUNTED/MISSING subtraction rule.
const READOUT_WIDTH = 22
// Column of the last digit of a right-aligned ledger value — the connector
// stub (`┴` / `┬`) points here so it lands under the UNPARTED / COUNTED
// number rather than the geometric midpoint of the card pair.
const LEDGER_VALUE_END_COL = READOUT_WIDTH - 1

// The natural body width of the manual prompt: the diagram (DIAGRAM_WIDTH) +
// an 8-col gap + the right pane (45 — widest question, "How many piles of 4
// stalks in the RIGHT heap?"). Exported so `<ManualCastingPrompt>` floors its
// render width to it; the heap-card geometry stays the single source of truth.
export const MANUAL_BODY_GAP = 8
export const MANUAL_RIGHT_PANE_WIDTH = 45
export const MANUAL_NATURAL_BODY_WIDTH: number =
  DIAGRAM_WIDTH + MANUAL_BODY_GAP + MANUAL_RIGHT_PANE_WIDTH

// A horizontal connector spanning the two card tees: corners at LEFT_TEE_COL /
// RIGHT_TEE_COL, a `─` bar between them, and a single `stub` at
// LEDGER_VALUE_END_COL — under the last digit of the UNPARTED / COUNTED value
// (`┴` points up to UNPARTED, `┬` points down to COUNTED).
function connectorRow(
  leftCorner: string,
  rightCorner: string,
  stub: string,
): string {
  const cells = Array.from({ length: DIAGRAM_WIDTH }, () => ' ')
  for (let c = LEFT_TEE_COL + 1; c < RIGHT_TEE_COL; c++) cells[c] = '─'
  cells[LEFT_TEE_COL] = leftCorner
  cells[RIGHT_TEE_COL] = rightCorner
  cells[LEDGER_VALUE_END_COL] = stub
  return cells.join('')
}

// A ledger readout: `LABEL    VALUE` — label left, value right-aligned within
// READOUT_WIDTH. ANSI in `value` (the coloured MISSING count) is width-
// discounted via `stringWidth`.
function ledgerRow(label: string, value: string): string {
  const gap = Math.max(1, READOUT_WIDTH - label.length - stringWidth(value))
  return `${label}${' '.repeat(gap)}${value}`
}

/**
 * The 2 rows above the heap-card band: the `UNPARTED STALKS: N` source
 * readout, and the downward-cornered branch directly below it whose `┴` stub
 * points up at the value's last digit. Pure text; aligned to the card
 * geometry above.
 */
export function flowHeaderRows(unparted: number): string[] {
  return [
    ledgerRow('UNPARTED STALKS:', String(unparted)),
    connectorRow('┌', '┐', '┴'),
  ]
}

// MISSING gauge colour: neutral while mid-countdown, green when commit-ready
// (count 0 + fully valid), red on a completed-but-wrong conservation total.
export type MissingColor = 'neutral' | 'green' | 'red'

interface FlowFooterArgs {
  counted: number
  missing: number
  missingColor: MissingColor
}

/**
 * The 4 rows below the heap-card band: the upward-cornered join (its `┬` stub
 * gathers the two card tees and points down at the COUNTED value's last
 * digit), the `COUNTED STALKS: - N` accumulator (subtraction-signed) directly
 * below it, a ledger rule, and the `MISSING STALKS N` conservation gauge —
 * coloured per `missingColor` (green = commit-ready, red = conservation
 * violation, neutral = mid-countdown). Pure text.
 */
const MISSING_WRAP: Record<MissingColor, string> = {
  green: BOLD_GREEN,
  red: BOLD_RED,
  neutral: '',
}

export function flowFooterRows(args: FlowFooterArgs): string[] {
  const { counted, missing, missingColor } = args
  const missingStr = String(missing)
  const wrap = MISSING_WRAP[missingColor]
  const coloredMissing = wrap ? `${wrap}${missingStr}${NORMAL}` : missingStr
  return [
    connectorRow('└', '┘', '┬'),
    ledgerRow('COUNTED STALKS:', `- ${counted}`),
    '─'.repeat(READOUT_WIDTH),
    ledgerRow('MISSING STALKS', coloredMissing),
  ]
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

// Bottom-strip error-branch discriminant. The strip's `error` branch wraps
// these args; they are flat-extended into BottomStripArgs below. Conservation
// is NOT here — the MISSING gauge owns conservation visually (red when the
// completed count ≠ unparted), so the strip never duplicates it as text.
type BottomStripErrorArgs =
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

export type BottomStripArgs =
  | {
      // Mid-edit (incomplete or conservation-failing) or commit-ready. The
      // live count lives in the MISSING gauge, so the strip only nudges:
      // blank while not ready, "Press Enter to commit" once fully valid.
      branch: 'editing'
      commitReady: boolean
      renderWidth: number
    }
  | ({ branch: 'error'; renderWidth: number } & BottomStripErrorArgs)
  | {
      branch: 'resolved'
      next: number
      renderWidth: number
    }

function zeroRemainderSide(remL: number, remR: number): string {
  if (remL === 0 && remR === 0) return 'Left and right heaps have no remainder'
  if (remL === 0) return 'Left heap has no remainder'
  return 'Right heap has no remainder'
}

function errorMessageText(args: BottomStripErrorArgs): string {
  switch (args.errorKind) {
    case 'suspended-sum':
      return `Suspended sum (1 + ${args.remL} + ${args.remR}) = ${args.sum}, expected ${args.expectedLabel}`
    case 'zero-remainder':
      return `${zeroRemainderSide(args.remL, args.remR)} — fully divisible heaps yield remainder 4, not 0`
  }
}

// Build a row of exactly `renderWidth` display cols with `left` left-aligned
// and `right` right-aligned. ANSI in the segments doesn't count toward width.
function leftRightRow(
  left: string,
  right: string,
  renderWidth: number,
): string {
  const leftW = stringWidth(left)
  const rightW = stringWidth(right)
  const gap = Math.max(1, renderWidth - leftW - rightW)
  return `${left}${' '.repeat(gap)}${right}`
}

/**
 * One-row feedback strip below the manual prompt's body. Three branches, each
 * with a uniform `Shift+Tab: go back` hint on the right:
 *
 *  - **editing** — blank left while mid-edit (the MISSING gauge carries the
 *    live count); "Press Enter to commit" once `commitReady`.
 *  - **error** — BOLD_RED suspended-sum / zero-remainder message on the left
 *    (conservation is owned by the MISSING gauge, never shown here as text).
 *  - **resolved** — BOLD_GREEN "→ next cast: N unparted", left-aligned.
 *
 * Output is exactly `renderWidth` display cols wide.
 */
export function bottomStripRow(args: BottomStripArgs): string {
  const backHint = 'Shift+Tab: go back'
  if (args.branch === 'editing') {
    const left = args.commitReady ? 'Press Enter to commit' : ''
    return leftRightRow(left, backHint, args.renderWidth)
  }
  if (args.branch === 'resolved') {
    const message = `→ next cast: ${args.next} unparted`
    const colored = `${BOLD_GREEN}${message}${NORMAL}`
    const trailing = Math.max(0, args.renderWidth - stringWidth(colored))
    return `${colored}${' '.repeat(trailing)}`
  }
  const message = errorMessageText(args)
  const left = `${BOLD_RED}${message}${NORMAL}`
  return leftRightRow(left, backHint, args.renderWidth)
}
