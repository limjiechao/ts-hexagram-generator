import { BOLD_GREEN, BOLD_WHITE, NORMAL } from '@hexagram/viewer-core'
import stringWidth from 'string-width'

import {
  HEAP_CARD_INTERIOR,
  HEAP_LABEL_COL_WIDTH,
  type ManualDiagramState,
  type ManualFocusedField,
} from './manual-diagram.js'

interface TwoHeapDiagramRowsArgs {
  pilesL: number | null
  remL: number | null
  pilesR: number | null
  remR: number | null
  focusedField: ManualFocusedField
  state: ManualDiagramState
}

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
